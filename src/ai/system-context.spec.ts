import { describe, expect, it } from 'vitest';
import type { StructureField } from '../structures/structure-field.js';
import { describeFields, describeSystem } from './system-context.js';
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

  it('adds the field tags', () => {
    expect(
      describeFields(
        [field({ type: 'progress', tagIds: ['hp'] })],
        [{ id: 'hp', slug: 'vida', description: 'Saúde do personagem' } as WorldFieldTag],
      ),
    ).toBe(
      'Vida (current / max; @vida: Saúde do personagem)',
    );
  });
});

describe('describeSystem', () => {
  const system = { name: 'Mar', description: 'Piratas', mainDie: 'd20' };

  it('lists the moods as optional ideas', () => {
    expect(
      describeSystem({ ...system, moods: ['tesouro amaldiçoado', 'motins'] }, []),
    ).toContain(
      'Moods (optional ideas the player liked, use the ones that fit and ignore the rest): tesouro amaldiçoado, motins',
    );
  });

  it('skips the moods line when there are none', () => {
    expect(describeSystem({ ...system, moods: [] }, [])).not.toContain('Moods');
  });
});
