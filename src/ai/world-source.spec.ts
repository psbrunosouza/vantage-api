import { describe, expect, it } from 'vitest';
import type { DraftWorld } from '../system-drafts/dto/system-draft.dto.js';
import { draftStructures, replacedResources } from './world-source.js';

const field = (id: string, type = 'short-text') => ({
  id,
  type,
  label: id,
  column: 0,
  row: 0,
  span: 1,
  rows: 1,
  options: [],
});

const actors = {
  id: 'actors',
  journeyId: null,
  slug: 'atores',
  name: 'Atores',
  description: 'x',
};

const world: DraftWorld = {
  structures: [
    { id: 'crew', name: 'Tripulação', icon: 'users', tagIds: ['actors'] },
    {
      id: 'places',
      name: 'Lugares',
      icon: 'map',
      tagIds: [],
      fields: [field('mood')],
    },
  ],
  resources: [
    { id: 'old', structureId: 'places', name: 'Porto', values: {} },
    { id: 'kept', structureId: 'places', name: 'Farol', values: {} },
  ],
  hooks: [],
};

describe('draftStructures', () => {
  it('resolves tag ids and fills the defaults a stored structure has', () => {
    const [crew, places] = draftStructures(world.structures, [actors]);

    expect(crew).toMatchObject({
      color: null,
      aiNote: null,
      fields: [],
      tags: [actors],
    });
    expect(crew).not.toHaveProperty('tagIds');
    expect(places.tags).toEqual([]);
  });
});

describe('replacedResources', () => {
  it('drops replaced records and adds new ones with parsed values', () => {
    const resources = replacedResources(
      world,
      ['old'],
      [{ structureId: 'places', name: 'Mercado', values: { mood: 'tenso', x: 1 } }],
    );

    expect(resources.map((resource) => resource.name)).toEqual([
      'Farol',
      'Mercado',
    ]);
    expect(resources[1].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(resources[1].values).toEqual({ mood: 'tenso' });
  });
});
