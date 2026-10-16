import { describe, expect, it } from 'vitest';
import { KeyedLimiter } from './keyed-limiter.js';

function gate() {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

describe('KeyedLimiter', () => {
  it('runs at most the limit per key and queues the rest in order', async () => {
    const limiter = new KeyedLimiter(2);
    const gates = [gate(), gate(), gate()];
    const started: number[] = [];
    const runs = gates.map((current, index) =>
      limiter.run('key', async () => {
        started.push(index);
        await current.opened;
        return index;
      }),
    );

    await Promise.resolve();
    expect(started).toEqual([0, 1]);

    gates[1].open();
    await runs[1];
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);

    gates[0].open();
    gates[2].open();
    expect(await Promise.all(runs)).toEqual([0, 1, 2]);
  });

  it('keeps keys independent', async () => {
    const limiter = new KeyedLimiter(1);
    const blocked = gate();
    const started: string[] = [];

    void limiter.run('a', async () => {
      started.push('a');
      await blocked.opened;
    });
    await limiter.run('b', async () => {
      started.push('b');
    });

    expect(started).toEqual(['a', 'b']);
    blocked.open();
  });

  it('frees the slot when a task fails', async () => {
    const limiter = new KeyedLimiter(1);

    await expect(
      limiter.run('key', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(await limiter.run('key', async () => 'next')).toBe('next');
  });
});
