import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Campaign } from '../campaigns/campaigns.schema.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import type { System } from '../systems/systems.schema.js';
import { SystemsService } from '../systems/systems.service.js';
import { parseResourceValues } from '../resources/resource-values.js';
import type {
  Resource,
  ResourceValues,
} from '../resources/resources.schema.js';
import { ResourcesService } from '../resources/resources.service.js';
import type { Structure } from '../structures/structures.schema.js';
import { StructuresService } from '../structures/structures.service.js';
import type {
  DraftResource,
  DraftStructure,
  DraftSystem,
  DraftTag,
  DraftWorld,
} from '../system-drafts/dto/system-draft.dto.js';
import type { SystemDraft } from '../system-drafts/system-drafts.schema.js';
import { SystemDraftsService } from '../system-drafts/system-drafts.service.js';
import type { FieldTag } from '../tags/field-tags.schema.js';
import type { StructureTag } from '../tags/structure-tags.schema.js';
import { TagsService, slugify } from '../tags/tags.service.js';

export type WorldSystem = Pick<System, 'name' | 'description' | 'mainDie'>;
export type WorldStructureTag = Pick<
  StructureTag,
  'id' | 'systemId' | 'slug' | 'name' | 'description'
>;
export type WorldFieldTag = Pick<FieldTag, 'id' | 'slug' | 'name' | 'description'>;
export type WorldStructure = Pick<
  Structure,
  'id' | 'name' | 'icon' | 'color' | 'fields' | 'aiNote'
> & { tags: WorldStructureTag[] };
export type WorldResource = Pick<
  Resource,
  'id' | 'structureId' | 'name' | 'values'
>;

export interface NewResource {
  structureId: string;
  name: string;
  values: ResourceValues;
}

export interface WorldSource {
  system(): Promise<WorldSystem>;
  campaign(): Promise<Campaign | null>;
  structures(): Promise<WorldStructure[]>;
  resources(): Promise<WorldResource[]>;
  structureTags(): Promise<WorldStructureTag[]>;
  fieldTags(): Promise<WorldFieldTag[]>;
  replaceResources(
    removed: readonly string[],
    created: readonly NewResource[],
  ): Promise<WorldResource[]>;
}

export interface DraftSlot {
  system: DraftSystem;
  world: DraftWorld;
  save(world: DraftWorld): Promise<void>;
}

@Injectable()
export class WorldSources {
  constructor(
    private readonly systemsService: SystemsService,
    private readonly campaignsService: CampaignsService,
    private readonly structuresService: StructuresService,
    private readonly resourcesService: ResourcesService,
    private readonly tagsService: TagsService,
    private readonly systemDraftsService: SystemDraftsService,
  ) {}

  async ofSystem(userId: string, systemId: string): Promise<WorldSource> {
    await this.systemsService.ensureOwner(userId, systemId);

    return {
      system: () => this.systemsService.findOne(userId, systemId),
      campaign: () => this.campaignsService.find(userId, systemId),
      structures: () => this.structuresService.findAll(userId, systemId),
      resources: () => this.resourcesService.findAll(userId, systemId),
      structureTags: () =>
        this.tagsService.findStructureTags(userId, systemId),
      fieldTags: () => this.tagsService.findFieldTags(userId, systemId),
      replaceResources: async (removed, created) => {
        await this.resourcesService.removeMany(userId, systemId, removed);

        for (const resource of created) {
          await this.resourcesService.create(
            userId,
            systemId,
            resource.structureId,
            { name: resource.name, values: resource.values },
          );
        }

        return this.resourcesService.findAll(userId, systemId);
      },
    };
  }

  async ofDraft(userId: string, draftId: string): Promise<WorldSource> {
    const draft = await this.systemDraftsService.findOpen(userId, draftId);

    return this.ofSlot(draft, {
      system: draft.system,
      world: {
        structures: draft.structures,
        resources: draft.resources,
        hooks: draft.hooks,
      },
      save: async (world) => {
        await this.systemDraftsService.update(userId, draftId, {
          resources: world.resources,
        });
      },
    });
  }

  async ofSlot(draft: SystemDraft, slot: DraftSlot): Promise<WorldSource> {
    const [globalStructureTags, globalFieldTags] = await Promise.all([
      this.tagsService.findGlobalStructureTags(),
      this.tagsService.findGlobalFieldTags(),
    ]);
    const structureTags = [
      ...globalStructureTags,
      ...draft.structureTags.map((tag) => draftTag(draft.id, tag)),
    ];
    const fieldTags = [
      ...globalFieldTags,
      ...draft.fieldTags.map((tag) => draftTag(draft.id, tag)),
    ];
    return {
      system: async () => ({
        name: slot.system.name ?? '',
        description: slot.system.description ?? null,
        mainDie: slot.system.mainDie ?? null,
      }),
      campaign: async () => null,
      structures: async () =>
        draftStructures(slot.world.structures, structureTags),
      resources: async () => slot.world.resources,
      structureTags: async () => structureTags,
      fieldTags: async () => fieldTags,
      replaceResources: async (removed, created) => {
        const resources = replacedResources(slot.world, removed, created);

        slot.world = { ...slot.world, resources };
        await slot.save(slot.world);
        return resources;
      },
    };
  }
}

export function draftStructures(
  structures: readonly DraftStructure[],
  tags: readonly WorldStructureTag[],
): WorldStructure[] {
  return structures.map(({ tagIds, ...structure }) => ({
    ...structure,
    color: structure.color ?? null,
    aiNote: structure.aiNote ?? null,
    fields: structure.fields ?? [],
    tags: tags.filter((tag) => tagIds.includes(tag.id)),
  }));
}

export function replacedResources(
  world: DraftWorld,
  removed: readonly string[],
  created: readonly NewResource[],
): DraftResource[] {
  const fieldsOf = new Map(
    world.structures.map((structure) => [structure.id, structure.fields ?? []]),
  );

  return [
    ...world.resources.filter((resource) => !removed.includes(resource.id)),
    ...created.map((resource) => ({
      id: randomUUID(),
      structureId: resource.structureId,
      name: resource.name,
      values: parseResourceValues(
        fieldsOf.get(resource.structureId) ?? [],
        resource.values,
      ),
    })),
  ];
}

function draftTag(draftId: string, tag: DraftTag) {
  return {
    ...tag,
    slug: slugify(tag.name),
    systemId: draftId,
  };
}
