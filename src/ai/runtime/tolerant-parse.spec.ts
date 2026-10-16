import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { shortened, tolerantParse } from './tolerant-parse.js';

const schema = z.object({
  title: z.string().min(1).max(20),
  options: z.array(z.string()).max(2),
  level: z.number().int().min(1).max(5),
});

describe('tolerantParse', () => {
  it('fits overlong text, extra items and numbers out of range instead of failing', () => {
    const parsed = tolerantParse(schema, {
      title: 'The harbor that never sleeps at night',
      options: ['a', 'b', 'c'],
      level: 9,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      title: 'The harbor that',
      options: ['a', 'b'],
      level: 5,
    });
  });

  it('keeps failing when the value cannot be fitted', () => {
    expect(
      tolerantParse(schema, { title: '', options: [], level: 1 }).success,
    ).toBe(false);
  });
});

describe('shortened', () => {
  it('cuts at the last whole word and drops trailing punctuation', () => {
    expect(shortened('Who guards the gate, and why?', 22)).toBe(
      'Who guards the gate',
    );
  });

  it('keeps text that already fits', () => {
    expect(shortened('Short', 10)).toBe('Short');
  });
});
