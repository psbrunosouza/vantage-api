import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';
import type { AiCredentials } from '../settings/ai.service.js';
import { type AiFunction, type AiTool, chatToolOf } from './ai-tool.js';
import { closedItemsOf } from './closed-items.js';
import {
  type ChatMessage,
  type ChatReasoning,
  OpenRouterClient,
  type ToolCall,
} from './openrouter.client.js';
import { tolerantParse } from './tolerant-parse.js';

const MAX_STEPS = 6;
const MAX_ATTEMPTS = 3;
const STRUCTURED_REASONING: ChatReasoning = { effort: 'low' };

@Injectable()
export class AgentRunner {
  private readonly logger = new Logger(AgentRunner.name);

  constructor(private readonly openRouter: OpenRouterClient) {}

  async reply(
    credentials: AiCredentials,
    messages: ChatMessage[],
    tools: AiTool[],
  ): Promise<string> {
    const transcript = [...messages];

    for (let step = 1; step <= MAX_STEPS; step++) {
      const reply = await this.openRouter.chat(
        credentials.apiKey,
        {
          model: credentials.model,
          messages: transcript,
          tools: tools.map(chatToolOf),
          tool_choice: step === MAX_STEPS ? 'none' : undefined,
        },
        credentials.signal,
      );

      if (!reply.tool_calls?.length) {
        const text = reply.content?.trim();

        if (!text) {
          throw new BadGatewayException({
            code: 'AI_EMPTY_REPLY',
            message: 'The AI sent an empty reply.',
          });
        }

        return text;
      }

      transcript.push({
        role: 'assistant',
        content: reply.content,
        tool_calls: reply.tool_calls,
      });

      for (const call of reply.tool_calls) {
        transcript.push({
          role: 'tool',
          tool_call_id: call.id,
          content: await this.execute(tools, call),
        });
      }
    }

    throw new BadGatewayException({
      code: 'AI_TOO_MANY_STEPS',
      message: 'The AI took too many steps.',
    });
  }

  async submit<T>(
    credentials: AiCredentials,
    messages: ChatMessage[],
    output: AiFunction<T>,
  ): Promise<T> {
    const transcript = [...messages];
    const started = Date.now();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const reply = await this.openRouter.chat(
        credentials.apiKey,
        {
          model: credentials.model,
          messages: transcript,
          tools: [chatToolOf(output)],
          tool_choice: { type: 'function', function: { name: output.name } },
          reasoning: STRUCTURED_REASONING,
        },
        credentials.signal,
      );
      const call = reply.tool_calls?.find(
        (candidate) => candidate.function.name === output.name,
      );

      if (!call) {
        transcript.push(
          { role: 'assistant', content: reply.content },
          { role: 'user', content: `Call ${output.name} with the result.` },
        );
        continue;
      }

      const parsed = tolerantParse(output.input, argumentsOf(call));

      if (parsed.success) {
        this.timed(output.name, attempt, started);
        return parsed.data;
      }

      transcript.push(
        { role: 'assistant', content: reply.content, tool_calls: [call] },
        {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: z.prettifyError(parsed.error) }),
        },
      );
    }

    this.logger.warn(
      `${output.name} failed after ${MAX_ATTEMPTS} attempts in ${Date.now() - started}ms`,
    );
    throw new BadGatewayException({
      code: 'AI_INVALID_RESULT',
      message: "The AI couldn't produce a valid result. Try again.",
    });
  }

  async submitEach<T>(
    credentials: AiCredentials,
    messages: ChatMessage[],
    output: AiFunction,
    item: z.ZodType<T>,
    onItem: (item: T) => void,
  ): Promise<void> {
    const transcript = [...messages];
    const started = Date.now();

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let read = 0;
      let sent = 0;

      const reply = await this.openRouter.chatStream(
        credentials.apiKey,
        {
          model: credentials.model,
          messages: transcript,
          tools: [chatToolOf(output)],
          tool_choice: { type: 'function', function: { name: output.name } },
          reasoning: STRUCTURED_REASONING,
        },
        (text) => {
          const items = closedItemsOf(text);

          for (const raw of items.slice(read)) {
            const parsed = tolerantParse(item, jsonOf(raw));

            if (parsed.success) {
              onItem(parsed.data);
              sent++;
            }
          }

          read = items.length;
        },
        credentials.signal,
      );

      if (sent > 0) {
        this.timed(output.name, attempt, started);
        return;
      }

      const call = reply.tool_calls?.find(
        (candidate) => candidate.function.name === output.name,
      );

      if (!call) {
        transcript.push(
          { role: 'assistant', content: reply.content },
          { role: 'user', content: `Call ${output.name} with the result.` },
        );
        continue;
      }

      const parsed = output.input.safeParse(argumentsOf(call));

      transcript.push(
        { role: 'assistant', content: reply.content, tool_calls: [call] },
        {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({
            error: parsed.success
              ? 'No valid item was found.'
              : z.prettifyError(parsed.error),
          }),
        },
      );
    }

    this.logger.warn(
      `${output.name} failed after ${MAX_ATTEMPTS} attempts in ${Date.now() - started}ms`,
    );
    throw new BadGatewayException({
      code: 'AI_INVALID_RESULT',
      message: "The AI couldn't produce a valid result. Try again.",
    });
  }

  private timed(name: string, attempts: number, started: number): void {
    this.logger.log(
      `${name} took ${Date.now() - started}ms in ${attempts} attempt(s)`,
    );
  }

  private async execute(tools: AiTool[], call: ToolCall): Promise<string> {
    const tool = tools.find(
      (candidate) => candidate.name === call.function.name,
    );

    if (!tool) {
      return JSON.stringify({ error: `Unknown tool ${call.function.name}.` });
    }

    try {
      return JSON.stringify(await tool.call(argumentsOf(call)));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return JSON.stringify({ error: z.prettifyError(error) });
      }

      if (error instanceof HttpException) {
        return JSON.stringify({ error: error.message });
      }

      throw error;
    }
  }
}

function argumentsOf(call: ToolCall): unknown {
  const raw = call.function.arguments.trim();

  return raw === '' ? {} : jsonOf(raw);
}

function jsonOf(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
