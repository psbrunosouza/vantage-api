import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiCredentials } from './ai.service.js';
import { type AiFunction, type AiTool, chatToolOf } from './ai-tool.js';
import {
  type ChatMessage,
  OpenRouterClient,
  type ToolCall,
} from './openrouter.client.js';

const MAX_STEPS = 6;
const MAX_ATTEMPTS = 3;

@Injectable()
export class AgentRunner {
  constructor(private readonly openRouter: OpenRouterClient) {}

  async reply(
    credentials: AiCredentials,
    messages: ChatMessage[],
    tools: AiTool[],
  ): Promise<string> {
    const transcript = [...messages];

    for (let step = 1; step <= MAX_STEPS; step++) {
      const reply = await this.openRouter.chat(credentials.apiKey, {
        model: credentials.model,
        messages: transcript,
        tools: tools.map(chatToolOf),
        tool_choice: step === MAX_STEPS ? 'none' : undefined,
      });

      if (!reply.tool_calls?.length) {
        const text = reply.content?.trim();

        if (!text) {
          throw new BadGatewayException('The AI sent an empty reply.');
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

    throw new BadGatewayException('The AI took too many steps.');
  }

  async submit<T>(
    credentials: AiCredentials,
    messages: ChatMessage[],
    output: AiFunction<T>,
  ): Promise<T> {
    const transcript = [...messages];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const reply = await this.openRouter.chat(credentials.apiKey, {
        model: credentials.model,
        messages: transcript,
        tools: [chatToolOf(output)],
        tool_choice: { type: 'function', function: { name: output.name } },
      });
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

      if (parsed.success) {
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

    throw new BadGatewayException(
      "The AI couldn't produce a valid result. Try again.",
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

  try {
    return raw === '' ? {} : JSON.parse(raw);
  } catch {
    return raw;
  }
}
