import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { createJourneySchema } from '../journeys/dto/create-journey.dto.js';
import type { Journey } from '../journeys/journeys.schema.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { memberResources } from '../members/members.schema.js';
import { parseResourceValues } from '../resources/resource-values.js';
import { resources } from '../resources/resources.schema.js';
import { sessionZeroQuestions } from '../session-zero/session-zero.schema.js';
import { foreignStructureIds } from '../session-zero/session-zero.service.js';
import { structures } from '../structures/structures.schema.js';
import { ACTORS_SLUG } from '../tags/actors.js';
import { fieldTags } from '../tags/field-tags.schema.js';
import {
  structureTagLinks,
  structureTags,
} from '../tags/structure-tags.schema.js';
import { TAG_EXISTS, slugify } from '../tags/tags.service.js';
import type {
  DraftStructure,
  DraftWorld,
  SystemDraftDto,
} from './dto/system-draft.dto.js';
import {
  orphanResources,
  takenSlugs,
  unknownTagIds,
  withCharacterFields,
} from './system-draft-commit.js';
import { type SystemDraft, systemDrafts } from './system-drafts.schema.js';

const DRAFT_NOT_FOUND = {
  code: 'DRAFT_NOT_FOUND',
  message: 'Draft not found.',
};

const STRUCTURE_NOT_FOUND = {
  code: 'STRUCTURE_NOT_FOUND',
  message: 'Structure not found.',
};

@Injectable()
export class SystemDraftsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  findIncomplete(ownerId: string): Promise<SystemDraft[]> {
    return this.db
      .select()
      .from(systemDrafts)
      .where(
        and(
          eq(systemDrafts.ownerId, ownerId),
          eq(systemDrafts.status, 'incomplete'),
        ),
      )
      .orderBy(desc(systemDrafts.updatedAt));
  }

  async findOne(ownerId: string, id: string): Promise<SystemDraft> {
    const [draft] = await this.db
      .select()
      .from(systemDrafts)
      .where(this.ownedBy(ownerId, id));

    if (!draft) throw new NotFoundException(DRAFT_NOT_FOUND);

    return draft;
  }

  async create(ownerId: string, dto: SystemDraftDto): Promise<SystemDraft> {
    const [draft] = await this.db
      .insert(systemDrafts)
      .values({ ...dto, ownerId })
      .returning();
    return draft;
  }

  async update(
    ownerId: string,
    id: string,
    dto: SystemDraftDto,
  ): Promise<SystemDraft> {
    await this.findOpen(ownerId, id);

    const [draft] = await this.db
      .update(systemDrafts)
      .set({ ...dto, updatedAt: new Date() })
      .where(this.ownedBy(ownerId, id))
      .returning();
    return draft;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.findOne(ownerId, id);
    await this.db.delete(systemDrafts).where(this.ownedBy(ownerId, id));
  }

  async commit(ownerId: string, id: string): Promise<Journey> {
    const draft = await this.findOpen(ownerId, id);
    const system = createJourneySchema.safeParse(draft.system);

    if (!system.success) {
      throw new BadRequestException({
        code: 'DRAFT_SYSTEM_INVALID',
        message: 'The system needs a name and initials.',
      });
    }

    const [systemStructureTags, systemFieldTags] = await Promise.all([
      this.db
        .select({ id: structureTags.id, slug: structureTags.slug })
        .from(structureTags)
        .where(isNull(structureTags.journeyId)),
      this.db
        .select({ slug: fieldTags.slug })
        .from(fieldTags)
        .where(isNull(fieldTags.journeyId)),
    ]);

    if (
      takenSlugs(
        draft.structureTags,
        systemStructureTags.map((tag) => tag.slug),
      ).length > 0 ||
      takenSlugs(
        draft.fieldTags,
        systemFieldTags.map((tag) => tag.slug),
      ).length > 0
    ) {
      throw new ConflictException(TAG_EXISTS);
    }

    if (
      unknownTagIds(draft.structures, [
        ...systemStructureTags.map((tag) => tag.id),
        ...draft.structureTags.map((tag) => tag.id),
      ]).length > 0
    ) {
      throw new BadRequestException({
        code: 'TAG_NOT_FOUND',
        message: 'Tag not found.',
      });
    }

    const structureIds = draft.structures.map((structure) => structure.id);

    if (
      orphanResources(draft.resources, draft.structures).length > 0 ||
      foreignStructureIds(draft.questions, structureIds).length > 0
    ) {
      throw new BadRequestException(STRUCTURE_NOT_FOUND);
    }

    const actorsTagId = systemStructureTags.find(
      (tag) => tag.slug === ACTORS_SLUG,
    )?.id;
    const world = draft.character
      ? withCharacterFields(draft.structures, actorsTagId, draft.character)
      : { structures: draft.structures, actors: null };
    const fieldsOf = new Map(
      world.structures.map((structure) => [
        structure.id,
        structure.fields ?? [],
      ]),
    );

    return this.db.transaction(async (tx) => {
      const journey = await this.journeysService.insert(
        tx,
        ownerId,
        system.data,
      );
      const journeyId = journey.id;

      if (draft.structureTags.length > 0) {
        await tx.insert(structureTags).values(
          draft.structureTags.map((tag) => ({
            ...tag,
            slug: slugify(tag.name),
            journeyId,
          })),
        );
      }

      if (draft.fieldTags.length > 0) {
        await tx.insert(fieldTags).values(
          draft.fieldTags.map((tag) => ({
            ...tag,
            slug: slugify(tag.name),
            journeyId,
          })),
        );
      }

      if (world.structures.length > 0) {
        await tx.insert(structures).values(
          world.structures.map((structure) => ({
            id: structure.id,
            name: structure.name,
            icon: structure.icon,
            color: structure.color,
            aiNote: structure.aiNote,
            fields: structure.fields ?? [],
            journeyId,
          })),
        );

        const links = world.structures.flatMap(linksOf);

        if (links.length > 0) {
          await tx.insert(structureTagLinks).values(links);
        }
      }

      if (draft.resources.length > 0) {
        await tx.insert(resources).values(
          draft.resources.map((resource) => ({
            ...resource,
            values: parseResourceValues(
              fieldsOf.get(resource.structureId) ?? [],
              resource.values,
            ),
          })),
        );
      }

      if (draft.character && world.actors) {
        const [character] = await tx
          .insert(resources)
          .values({
            structureId: world.actors.id,
            name: draft.character.name,
            values: parseResourceValues(
              world.actors.fields ?? [],
              draft.character.values,
            ),
          })
          .returning();

        await tx
          .insert(memberResources)
          .values({ resourceId: character.id, journeyId, userId: ownerId });
      }

      if (draft.questions.length > 0) {
        await tx.insert(sessionZeroQuestions).values(
          draft.questions.map((question, position) => ({
            ...question,
            journeyId,
            position,
          })),
        );
      }

      await tx
        .update(systemDrafts)
        .set({ status: 'complete', systemId: journeyId })
        .where(eq(systemDrafts.id, id));

      return journey;
    });
  }

  async saveOptionWorld(
    ownerId: string,
    id: string,
    index: number,
    world: DraftWorld,
  ): Promise<void> {
    await this.findOpen(ownerId, id);
    await this.db
      .update(systemDrafts)
      .set({
        options: sql`jsonb_set(${systemDrafts.options}, ${`{${index},world}`}::text[], ${JSON.stringify(world)}::jsonb)`,
        updatedAt: new Date(),
      })
      .where(this.ownedBy(ownerId, id));
  }

  async findOpen(
    ownerId: string,
    id: string,
  ): Promise<SystemDraft> {
    const draft = await this.findOne(ownerId, id);

    if (draft.status === 'complete') {
      throw new ConflictException({
        code: 'DRAFT_COMPLETE',
        message: 'This draft was already saved.',
      });
    }

    return draft;
  }

  private ownedBy(ownerId: string, id: string) {
    return and(eq(systemDrafts.id, id), eq(systemDrafts.ownerId, ownerId));
  }
}

function linksOf(structure: DraftStructure) {
  return [...new Set(structure.tagIds)].map((tagId) => ({
    structureId: structure.id,
    tagId,
  }));
}
