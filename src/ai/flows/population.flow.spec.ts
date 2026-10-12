import { describe, expect, it } from 'vitest';
import type { StructureView } from '../../structures/structure-view.js';
import type { StructureTag } from '../../tags/structure-tags.schema.js';
import type { WorldResource } from '../world-source.js';
import {
  describeRecords,
  populationTargets,
  replacements,
} from './population.flow.js';

const ACTORS = { systemId: null, slug: 'atores' } as StructureTag;
const PLACES = { systemId: null, slug: 'locais' } as StructureTag;

function structure(id: string, tags: StructureTag[]): StructureView {
  return { id, name: id, tags } as unknown as StructureView;
}

function record(
  id: string,
  structureId: string,
  aiNote: string | null = null,
): WorldResource {
  return { id, structureId, name: id, values: {}, aiNote };
}

describe('populationTargets', () => {
  const crew = structure('crew', [ACTORS]);
  const figures = structure('figures', [ACTORS]);
  const districts = structure('districts', [PLACES]);

  it('targets every structure, the player characters included', () => {
    expect(
      populationTargets([crew, figures, districts], []).map(({ id }) => id),
    ).toEqual(['crew', 'figures', 'districts']);
  });

  it('skips structures that already have records', () => {
    expect(
      populationTargets(
        [crew, figures, districts],
        [{ structureId: 'districts' }],
      ).map(({ id }) => id),
    ).toEqual(['crew', 'figures']);
  });

  it('groups the replaced records by structure, outside the players', () => {
    const resources = [
      record('kaya', 'crew'),
      record('ilse', 'figures'),
      record('orin', 'figures'),
      record('tower', 'districts'),
    ];

    expect(
      replacements([figures, districts], resources, ['kaya', 'ilse', 'orin']).map(
        ({ structure, count, ids }) => [structure.id, count, ids],
      ),
    ).toEqual([['figures', 2, ['ilse', 'orin']]]);
  });

  it('carries the oracle notes of the replaced records', () => {
    const resources = [
      record('ilse', 'figures', 'Trai o grupo no fim'),
      record('orin', 'figures'),
    ];

    expect(
      replacements([figures], resources, ['ilse', 'orin']).map(
        ({ notes }) => notes,
      ),
    ).toEqual([['ilse: Trai o grupo no fim']]);
  });

  it('lists the existing records with their notes', () => {
    expect(
      describeRecords(
        [figures, districts],
        [record('ilse', 'figures', 'Trai o grupo no fim'), record('tower', 'districts')],
      ),
    ).toBe(
      'Records that already exist:\n- ilse (figures): Trai o grupo no fim\n- tower (districts)',
    );
  });
});
