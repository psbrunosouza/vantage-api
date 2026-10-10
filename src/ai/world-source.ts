import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Campaign } from '../campaigns/campaigns.schema.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import type { Journey } from '../journeys/journeys.schema.js';
import { JourneysService } from '../journeys/journeys.service.js';
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

export type WorldJourney = Pick<Journey, 'name' | 'description' | 'mainDie'>;
export type WorldStructureTag = Pick<
  StructureTag,
  'id' | 'journeyId' | 'slug' | 'name' | 'description'
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
  journey(): Promise<WorldJourney>;
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

interface DraftSlot {
  system: DraftSystem;
  world: DraftWorld;
  save(world: DraftWorld): Promise<void>;
}

@Injectable()
export class WorldSources {
  constructor(
    private readonly journeysService: JourneysService,
    private readonly campaignsService: CampaignsService,
    private readonly structuresService: StructuresService,
    private readonly resourcesService: ResourcesService,
    private readonly tagsService: TagsService,
    private readonly systemDraftsService: SystemDraftsService,
  ) {}

  async ofJourney(userId: string, journeyId: string): Promise<WorldSource> {
    await this.journeysService.ensureOwner(userId, journeyId);

    return {
      journey: () => this.journeysService.findOne(userId, journeyId),
      campaign: () => this.campaignsService.find(userId, journeyId),
      structures: () => this.structuresService.findAll(userId, journeyId),
      resources: () => this.resourcesService.findAll(userId, journeyId),
      structureTags: () =>
        this.tagsService.findStructureTags(userId, journeyId),
      fieldTags: () => this.tagsService.findFieldTags(userId, journeyId),
      replaceResources: async (removed, created) => {
        await this.resourcesService.removeMany(userId, journeyId, removed);

        for (const resource of created) {
          await this.resourcesService.create(
            userId,
            journeyId,
            resource.structureId,
            { name: resource.name, values: resource.values },
          );
        }

        return this.resourcesService.findAll(userId, journeyId);
      },
    };
  }

  async ofDraft(
    userId: string,
    draftId: string,
    option?: number,
  ): Promise<WorldSource> {
    const [draft, systemStructureTags, systemFieldTags] = await Promise.all([
      this.systemDraftsService.findOpen(userId, draftId),
      this.tagsService.findSystemStructureTags(),
      this.tagsService.findSystemFieldTags(),
    ]);
    const slot = this.slotOf(userId, draft, option);
    const structureTags = [
      ...systemStructureTags,
      ...draft.structureTags.map((tag) => draftTag(draft.id, tag)),
    ];
    const fieldTags = [
      ...systemFieldTags,
      ...draft.fieldTags.map((tag) => draftTag(draft.id, tag)),
    ];
    let world = slot.world;

    return {
      journey: async () => ({
        name: slot.system.name ?? '',
        description: slot.system.description ?? null,
        mainDie: slot.system.mainDie ?? null,
      }),
      campaign: async () => null,
      structures: async () => draftStructures(world.structures, structureTags),
      resources: async () => world.resources,
      structureTags: async () => structureTags,
      fieldTags: async () => fieldTags,
      replaceResources: async (removed, created) => {
        const resources = replacedResources(world, removed, created);

        world = { ...world, resources };
        await slot.save(world);
        return resources;
      },
    };
  }

  private slotOf(
    userId: string,
    draft: SystemDraft,
    option: number | undefined,
  ): DraftSlot {
    if (option === undefined) {
      return {
        system: draft.system,
        world: {
          structures: draft.structures,
          resources: draft.resources,
          hooks: draft.hooks,
        },
        save: async (world) => {
          await this.systemDraftsService.update(userId, draft.id, {
            resources: world.resources,
          });
        },
      };
    }

    const chosen = draft.options.at(option);

    if (option < 0 || !chosen) {
      throw new NotFoundException({
        code: 'DRAFT_OPTION_NOT_FOUND',
        message: 'Campaign option not found.',
      });
    }

    return {
      system: { ...draft.system, description: chosen.option.theme },
      world: chosen.world ?? { structures: [], resources: [], hooks: [] },
      save: (world) =>
        this.systemDraftsService.saveOptionWorld(
          userId,
          draft.id,
          option,
          world,
        ),
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
    journeyId: draftId,
  };
}
