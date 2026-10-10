import { describe, expect, it } from 'vitest';
import { isActorStructure } from './actors.js';
import type { StructureTag } from './structure-tags.schema.js';

const tag = (slug: string, systemId: string | null): StructureTag => ({
  id: slug,
  systemId,
  slug,
  name: slug,
  description: slug,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('isActorStructure', () => {
  it('accepts the system actors tag', () => {
    expect(isActorStructure({ tags: [tag('atores', null)] })).toBe(true);
  });

  it('rejects a system tag with the same slug', () => {
    expect(isActorStructure({ tags: [tag('atores', 'system')] })).toBe(false);
  });

  it('rejects structures without the actors tag', () => {
    expect(isActorStructure({ tags: [tag('locais', null)] })).toBe(false);
  });
});
