import { describe, expect, it } from 'vitest';
import type { StructureView } from '../../structures/structure-view.js';
import type { StructureTag } from '../../tags/structure-tags.schema.js';
import { populationTargets, replacements } from './population.flow.js';

const ACTORS = { journeyId: null, slug: 'atores' } as StructureTag;
const PLACES = { journeyId: null, slug: 'locais' } as StructureTag;

function structure(id: string, tags: StructureTag[]): StructureView {
  return { id, tags } as unknown as StructureView;
}

describe('populationTargets', () => {
  const crew = structure('crew', [ACTORS]);
  const figures = structure('figures', [ACTORS]);
  const districts = structure('districts', [PLACES]);

  it('skips the structure of the player characters', () => {
    expect(
      populationTargets([crew, figures, districts], []).map(({ id }) => id),
    ).toEqual(['figures', 'districts']);
  });

  it('skips structures that already have records', () => {
    expect(
      populationTargets(
        [crew, figures, districts],
        [{ structureId: 'districts' }],
      ).map(({ id }) => id),
    ).toEqual(['figures']);
  });

  it('groups the replaced records by structure, outside the players', () => {
    const resources = [
      { id: 'kaya', structureId: 'crew' },
      { id: 'ilse', structureId: 'figures' },
      { id: 'orin', structureId: 'figures' },
      { id: 'tower', structureId: 'districts' },
    ];

    expect(
      replacements([figures, districts], resources, ['kaya', 'ilse', 'orin']).map(
        ({ structure, count, ids }) => [structure.id, count, ids],
      ),
    ).toEqual([['figures', 2, ['ilse', 'orin']]]);
  });
});
