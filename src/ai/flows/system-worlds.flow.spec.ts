import { describe, expect, it } from 'vitest';
import type { StructureProposal } from './structure-proposals.flow.js';
import { draftStructuresOf } from './system-worlds.flow.js';

const proposal = (name: string, tagIds: string[] = []): StructureProposal => ({
  name,
  icon: 'users',
  tagIds,
  fields: [],
});

describe('draftStructuresOf', () => {
  it('gives every structure its own id', () => {
    const structures = draftStructuresOf(
      [proposal('Tripulação', ['actors']), proposal('Portos')],
      'actors',
    );

    expect(new Set(structures.map((structure) => structure.id)).size).toBe(2);
    expect(structures.map((structure) => structure.tagIds)).toEqual([
      ['actors'],
      [],
    ]);
  });

  it('tags the first structure as actors when the oracle forgot', () => {
    const structures = draftStructuresOf(
      [proposal('Tripulação', ['crew']), proposal('Portos')],
      'actors',
    );

    expect(structures.map((structure) => structure.tagIds)).toEqual([
      ['crew', 'actors'],
      [],
    ]);
  });
});
