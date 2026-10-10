import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { StructureTag } from './structure-tags.schema.js';

export const ACTORS_SLUG = 'atores';

export function isActorStructure(structure: {
  tags: readonly Pick<StructureTag, 'journeyId' | 'slug'>[];
}): boolean {
  return structure.tags.some(
    (tag) => tag.journeyId === null && tag.slug === ACTORS_SLUG,
  );
}

export function hasActorsTag(structureId: AnyPgColumn) {
  return sql<boolean>`exists (
    select 1 from structure_tag_links l
    inner join structure_tags t on t.id = l.tag_id
    where l.structure_id = ${structureId}
      and t.journey_id is null
      and t.slug = ${ACTORS_SLUG}
  )`;
}
