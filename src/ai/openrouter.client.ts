import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';

const BASE_URL = 'https://openrouter.ai/api/v1';
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

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  tool_choice?: ToolChoice;
}

@Injectable()
export class OpenRouterClient {
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

  async chat(apiKey: string, request: ChatRequest): Promise<ChatReply> {
    const response = await this.request('/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const body: unknown = await response.json().catch(() => null);
    const failure = failureMessageOf(body);

    if (response.status === 401) {
      throw new BadRequestException({
        code: 'AI_KEY_REJECTED',
        message: 'OpenRouter rejected your key.',
      });
    }

    if (response.status === 402) {
      throw new BadRequestException({
        code: 'AI_NO_CREDITS',
        message: 'Your OpenRouter account is out of credits.',
      });
    }

    if (response.status === 429) {
      throw new HttpException(
        {
          code: 'AI_RATE_LIMITED',
          message: failure ?? 'OpenRouter is rate limiting. Try again shortly.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const completion = completionSchema.safeParse(body);

    if (!response.ok || !completion.success) {
      throw new BadGatewayException(
        failure === null
          ? UNREACHABLE
          : { code: 'AI_PROVIDER_FAILED', message: failure },
      );
    }

    return completion.data.choices[0].message;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(`${BASE_URL}${path}`, init);
    } catch (error) {
      throw new BadGatewayException(UNREACHABLE, { cause: error });
    }
  }
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
