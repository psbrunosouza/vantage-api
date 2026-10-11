import { describe, expect, it } from 'vitest';
import { eventsOf } from './openrouter.client.js';

function bodyOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<unknown[]> {
  const events: unknown[] = [];

  for await (const event of eventsOf(bodyOf(chunks))) {
    events.push(event);
  }

  return events;
}

describe('eventsOf', () => {
  it('joins events split across chunks', async () => {
    expect(await collect(['data: {"a":', '1}\n\ndata: {"b":2}\n\n'])).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('skips comments and stops at DONE', async () => {
    expect(
      await collect([
        ': OPENROUTER PROCESSING\n\n',
        'data: {"a":1}\n\n',
        'data: [DONE]\n\n',
        'data: {"b":2}\n\n',
      ]),
    ).toEqual([{ a: 1 }]);
  });

  it('reads the last event without a trailing newline', async () => {
    expect(await collect(['data: {"a":1}'])).toEqual([{ a: 1 }]);
  });
});
