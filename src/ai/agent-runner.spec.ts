import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AgentRunner } from './agent-runner.js';
import type {
  ChatMessage,
  ChatReply,
  OpenRouterClient,
} from './openrouter.client.js';

const item = z.object({ name: z.string().min(1) });
const output = {
  name: 'submit_items',
  description: 'Submits the items.',
  input: z.object({ items: z.array(item).min(1) }),
};
const credentials = { apiKey: 'key', model: 'model' };

function streamingRunner(attempts: string[][], log: string[]) {
  const transcripts: ChatMessage[][] = [];
  const client = {
    chatStream: async (
      _apiKey: string,
      request: { messages: ChatMessage[] },
      onArguments: (text: string) => void,
    ): Promise<ChatReply> => {
      const chunks = attempts[transcripts.length];
      let text = '';

      transcripts.push([...request.messages]);

      for (const chunk of chunks) {
        text += chunk;
        log.push('chunk');
        onArguments(text);
      }

      return {
        content: null,
        tool_calls: [
          {
            id: 'call',
            type: 'function',
            function: { name: output.name, arguments: text },
          },
        ],
      };
    },
  } as unknown as OpenRouterClient;

  return { runner: new AgentRunner(client), transcripts };
}

describe('AgentRunner.submitEach', () => {
  it('sends each item as soon as it closes', async () => {
    const log: string[] = [];
    const { runner } = streamingRunner(
      [['{"items":[{"name":"Por', 'tos"},{"na', 'me":"Navios"}]}']],
      log,
    );

    await runner.submitEach(credentials, [], output, item, ({ name }) =>
      log.push(name),
    );

    expect(log).toEqual(['chunk', 'chunk', 'Portos', 'chunk', 'Navios']);
  });

  it('skips invalid items and keeps the valid ones', async () => {
    const names: string[] = [];
    const { runner, transcripts } = streamingRunner(
      [['{"items":[{"name":""},{"name":"Navios"}]}']],
      [],
    );

    await runner.submitEach(credentials, [], output, item, ({ name }) =>
      names.push(name),
    );

    expect(names).toEqual(['Navios']);
    expect(transcripts).toHaveLength(1);
  });

  it('asks again with the error when no item is valid', async () => {
    const names: string[] = [];
    const { runner, transcripts } = streamingRunner(
      [['{"items":[{"name":""}]}'], ['{"items":[{"name":"Portos"}]}']],
      [],
    );

    await runner.submitEach(credentials, [], output, item, ({ name }) =>
      names.push(name),
    );

    expect(names).toEqual(['Portos']);
    expect(transcripts[1].at(-1)).toMatchObject({
      role: 'tool',
      tool_call_id: 'call',
    });
  });

  it('fails after every attempt comes back without a valid item', async () => {
    const empty = ['{"items":[]}'];
    const { runner } = streamingRunner([empty, empty, empty], []);

    await expect(
      runner.submitEach(credentials, [], output, item, () => undefined),
    ).rejects.toMatchObject({
      response: { code: 'AI_INVALID_RESULT' },
    });
  });
});

describe('AgentRunner.submit', () => {
  it('sends the caller signal to the model so a closed request stops it', async () => {
    const signal = new AbortController().signal;
    const received: (AbortSignal | undefined)[] = [];
    const client = {
      chat: async (
        _apiKey: string,
        _request: unknown,
        given?: AbortSignal,
      ): Promise<ChatReply> => {
        received.push(given);
        return {
          content: null,
          tool_calls: [
            {
              id: 'call',
              type: 'function',
              function: {
                name: output.name,
                arguments: '{"items":[{"name":"Portos"}]}',
              },
            },
          ],
        };
      },
    } as unknown as OpenRouterClient;

    const result = await new AgentRunner(client).submit(
      { ...credentials, signal },
      [],
      output,
    );

    expect(result).toEqual({ items: [{ name: 'Portos' }] });
    expect(received).toEqual([signal]);
  });
});
