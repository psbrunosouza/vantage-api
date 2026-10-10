import { BadRequestException } from '@nestjs/common';
import type {
  DraftCharacter,
  DraftResource,
  DraftStructure,
  DraftTag,
} from './dto/system-draft.dto.js';
import { slugify } from '../tags/tags.service.js';

export function unknownTagIds(
  structures: readonly DraftStructure[],
  knownTagIds: readonly string[],
): string[] {
  const known = new Set(knownTagIds);

  return structures
    .flatMap((structure) => structure.tagIds)
    .filter((id) => !known.has(id));
}

export function orphanResources(
  resources: readonly DraftResource[],
  structures: readonly DraftStructure[],
): DraftResource[] {
  const owned = new Set(structures.map((structure) => structure.id));

  return resources.filter((resource) => !owned.has(resource.structureId));
}

export function takenSlugs(
  tags: readonly DraftTag[],
  globalSlugs: readonly string[],
): string[] {
  const seen = new Set(globalSlugs);

  return tags
    .map((tag) => slugify(tag.name))
    .filter((slug) => {
      const taken = slug === '' || seen.has(slug);
      seen.add(slug);
      return taken;
    });
}

export function withCharacterFields(
  structures: readonly DraftStructure[],
  actorsTagId: string | undefined,
  character: DraftCharacter,
): { structures: DraftStructure[]; actors: DraftStructure } {
  const actors = structures.find(
    (structure) =>
      actorsTagId !== undefined && structure.tagIds.includes(actorsTagId),
  );

  if (!actors) {
    throw new BadRequestException({
      code: 'ACTORS_MISSING',
      message: 'Tag a structure as Actors first.',
    });
  }

  const current = actors.fields ?? [];
  const taken = new Set(current.map((field) => field.id));

  if (character.fields.some((field) => taken.has(field.id))) {
    throw new BadRequestException({
      code: 'FIELD_IDS_REUSED',
      message: 'New fields need new ids.',
    });
  }

  const merged = { ...actors, fields: [...current, ...character.fields] };

  return {
    structures: structures.map((structure) =>
      structure.id === actors.id ? merged : structure,
    ),
    actors: merged,
  };
}
