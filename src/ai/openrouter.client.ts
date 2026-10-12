import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';
import { KeyedLimiter } from './keyed-limiter.js';

const BASE_URL = 'https://openrouter.ai/api/v1';
const CONCURRENT_CHATS = 8;
const UNREACHABLE = {
  code: 'AI_PROVIDER_UNREACHABLE',
  message: "Couldn't reach OpenRouter.",
};

const modelsSchema = z.object({
  data: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string().default(''),
        context_length: z.number().nullable().default(null),
        pricing: z.object({
          prompt: z.coerce.number(),
          completion: z.coerce.number(),
        }),
      })
      .transform(({ context_length, ...model }) => ({
        ...model,
        contextLength: context_length,
      })),
  ),
});

export type AiModel = z.infer<typeof modelsSchema>['data'][number];

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
});

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().default(null),
          tool_calls: z.array(toolCallSchema).optional(),
        }),
      }),
    )
    .min(1),
});

const deltaSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                index: z.number(),
                id: z.string().nullish(),
                function: z
                  .object({
                    name: z.string().nullish(),
                    arguments: z.string().nullish(),
                  })
                  .nullish(),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .default([]),
});

const failureSchema = z.object({
  error: z.object({
    message: z.string(),
    metadata: z.object({ raw: z.unknown() }).optional(),
  }),
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export type ChatReply = z.infer<
  typeof completionSchema
>['choices'][number]['message'];

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ToolChoice =
  'none' | { type: 'function'; function: { name: string } };

export interface ChatReasoning {
  effort: 'low' | 'medium' | 'high';
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  tool_choice?: ToolChoice;
  reasoning?: ChatReasoning;
}

@Injectable()
export class OpenRouterClient {
  private readonly limiter = new KeyedLimiter(CONCURRENT_CHATS);

  async listToolModels(): Promise<AiModel[]> {
    const response = await this.request('/models?supported_parameters=tools');

    if (!response.ok) {
      throw new BadGatewayException(UNREACHABLE);
    }

    return modelsSchema.parse(await response.json()).data;
  }

  async isValidKey(apiKey: string): Promise<boolean> {
    const response = await this.request('/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.status === 401 || response.status === 403) {
      return false;
    }

    if (!response.ok) {
      throw new BadGatewayException(UNREACHABLE);
    }

    return true;
  }

  chat(
    apiKey: string,
    request: ChatRequest,
    signal?: AbortSignal,
  ): Promise<ChatReply> {
    return this.limiter.run(apiKey, () =>
      this.complete(apiKey, request, signal),
    );
  }

  chatStream(
    apiKey: string,
    request: ChatRequest,
    onArguments: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatReply> {
    return this.limiter.run(apiKey, () =>
      this.stream(apiKey, request, onArguments, signal),
    );
  }

  private async complete(
    apiKey: string,
    request: ChatRequest,
    signal?: AbortSignal,
  ): Promise<ChatReply> {
    const response = await this.post(apiKey, request, signal);
    const body: unknown = await response.json().catch(() => null);
    const completion = completionSchema.safeParse(body);

    if (!response.ok || !completion.success) {
      throw rejectionOf(response.status, body);
    }

    return completion.data.choices[0].message;
  }

  private async stream(
    apiKey: string,
    request: ChatRequest,
    onArguments: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<ChatReply> {
    const response = await this.post(
      apiKey,
      { ...request, stream: true },
      signal,
    );

    if (!response.ok || response.body === null) {
      throw rejectionOf(
        response.status,
        await response.json().catch(() => null),
      );
    }

    let content = '';
    const calls: ToolCall[] = [];

    for await (const event of eventsOf(response.body)) {
      const failure = failureMessageOf(event);

      if (failure !== null) {
        throw new BadGatewayException({
          code: 'AI_PROVIDER_FAILED',
          message: failure,
        });
      }

      const delta = deltaSchema.safeParse(event);

      if (!delta.success) {
        continue;
      }

      for (const { delta: part } of delta.data.choices) {
        content += part.content ?? '';

        for (const piece of part.tool_calls ?? []) {
          const call = (calls[piece.index] ??= {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          });

          call.id ||= piece.id ?? '';
          call.function.name += piece.function?.name ?? '';
          call.function.arguments += piece.function?.arguments ?? '';

          if (piece.index === 0 && piece.function?.arguments) {
            onArguments(call.function.arguments);
          }
        }
      }
    }

    return {
      content: content || null,
      tool_calls: calls.length > 0 ? calls.filter(Boolean) : undefined,
    };
  }

  private post(
    apiKey: string,
    request: ChatRequest & { stream?: boolean },
    signal?: AbortSignal,
  ): Promise<Response> {
    return this.request('/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(`${BASE_URL}${path}`, init);
    } catch (error) {
      init?.signal?.throwIfAborted();
      throw new BadGatewayException(UNREACHABLE, { cause: error });
    }
  }
}

export async function* eventsOf(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = done ? '' : (lines.pop() ?? '');

    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : '';

      if (data === '[DONE]') {
        return;
      }

      if (data !== '') {
        try {
          yield JSON.parse(data) as unknown;
        } catch {
          continue;
        }
      }
    }

    if (done) {
      return;
    }
  }
}

function rejectionOf(status: number, body: unknown): HttpException {
  const failure = failureMessageOf(body);

  if (status === 401) {
    return new BadRequestException({
      code: 'AI_KEY_REJECTED',
      message: 'OpenRouter rejected your key.',
    });
  }

  if (status === 402) {
    return new BadRequestException({
      code: 'AI_NO_CREDITS',
      message: 'Your OpenRouter account is out of credits.',
    });
  }

  if (status === 429) {
    return new HttpException(
      {
        code: 'AI_RATE_LIMITED',
        message: failure ?? 'OpenRouter is rate limiting. Try again shortly.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  return new BadGatewayException(
    failure === null
      ? UNREACHABLE
      : { code: 'AI_PROVIDER_FAILED', message: failure },
  );
}

function failureMessageOf(body: unknown): string | null {
  const failure = failureSchema.safeParse(body);

  if (!failure.success) {
    return null;
  }

  const { message, metadata } = failure.data.error;

  return typeof metadata?.raw === 'string'
    ? `${message}: ${metadata.raw}`
    : message;
}
