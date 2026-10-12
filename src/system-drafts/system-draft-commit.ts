import type {
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
