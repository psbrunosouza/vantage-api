import { describe, expect, it } from 'vitest';
import { createSystemSchema } from './create-system.dto.js';

describe('createSystemSchema', () => {
  const system = { name: 'Véspera', initials: 'V' };

  it('keeps the theme pattern of the system', () => {
    expect(createSystemSchema.parse({ ...system, pattern: 4 }).pattern).toBe(
      4,
    );
  });

  it('rejects a negative pattern', () => {
    expect(
      createSystemSchema.safeParse({ ...system, pattern: -1 }).success,
    ).toBe(false);
  });
});
