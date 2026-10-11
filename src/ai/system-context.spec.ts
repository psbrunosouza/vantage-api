import { describe, expect, it } from 'vitest';
import type { StructureField } from '../structures/structure-field.js';
import { describeFields } from './system-context.js';
import type { WorldFieldTag } from './world-source.js';

function field(extra: Partial<StructureField>): StructureField {
  return {
    id: 'field',
    type: 'short-text',
    label: 'Vida',
    column: 1,
    row: 1,
    span: 4,
    rows: 1,
    options: [],
    ...extra,
  };
}

describe('describeFields', () => {
  it('describes a field by its kind', () => {
    expect(describeFields([field({})])).toBe('Vida (short text)');
  });

  it('adds the field tags and the note for the oracle', () => {
    expect(
      describeFields(
        [field({ type: 'progress', tagIds: ['hp'], aiNote: 'Zera quando o sobrevivente cai.' })],
        [{ id: 'hp', slug: 'vida', description: 'Saúde do personagem' } as WorldFieldTag],
      ),
    ).toBe(
      'Vida (current / max; @vida: Saúde do personagem; note: Zera quando o sobrevivente cai.)',
    );
  });
});
