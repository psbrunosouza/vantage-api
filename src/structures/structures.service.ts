import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { links } from '../links/links.schema.js';
import { keyOf, relationTargets } from '../links/relation-columns.js';
import { resources } from '../resources/resources.schema.js';
import type { CreateStructureDto } from './dto/create-structure.dto.js';
import type { UpdateStructureDto } from './dto/update-structure.dto.js';
import {
  structureTagLinks,
  structureTags,
} from '../tags/structure-tags.schema.js';
import type { StructureView } from './structure-view.js';
import { type Structure, structures } from './structures.schema.js';

type Transaction = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

@Injectable()
export class StructuresService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async findAll(userId: string, journeyId: string): Promise<StructureView[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    const rows = await this.db
      .select()
      .from(structures)
      .where(eq(structures.journeyId, journeyId))
      .orderBy(asc(structures.createdAt));
    return this.withTags(this.db, rows);
  }

  async create(
    userId: string,
    journeyId: string,
    dto: CreateStructureDto,
  ): Promise<StructureView> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const { tagIds, ...values } = dto;

    return this.db.transaction(async (tx) => {
      const [structure] = await tx
        .insert(structures)
        .values({ ...values, journeyId })
        .returning();

      if (tagIds) await this.setTags(tx, journeyId, structure.id, tagIds);

      const [view] = await this.withTags(tx, [structure]);
      return view;
    });
  }

  async update(
    userId: string,
    journeyId: string,
    id: string,
    dto: UpdateStructureDto,
  ): Promise<StructureView> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const { tagIds, ...values } = dto;

    return this.db.transaction(async (tx) => {
      const [structure] = await tx
        .update(structures)
        .set({ ...values, updatedAt: new Date() })
        .where(this.inJourney(journeyId, id))
        .returning();

      if (!structure)
        throw new NotFoundException({
          code: 'STRUCTURE_NOT_FOUND',
          message: 'Structure not found.',
        });

      if (tagIds) await this.setTags(tx, journeyId, id, tagIds);

      const [view] = await this.withTags(tx, [structure]);
      return view;
    });
  }

  async prune(userId: string, journeyId: string, id: string): Promise<void> {
    await this.journeysService.ensureOwner(userId, journeyId);

    await this.db.transaction(async (tx) => {
      const [structure] = await tx
        .select({ fields: structures.fields })
        .from(structures)
        .where(this.inJourney(journeyId, id));

      if (!structure)
        throw new NotFoundException({
          code: 'STRUCTURE_NOT_FOUND',
          message: 'Structure not found.',
        });

      const fieldIds = new Set(structure.fields.map((field) => field.id));
      const owned = await tx
        .select({ id: resources.id, values: resources.values })
        .from(resources)
        .where(eq(resources.structureId, id));

      for (const resource of owned) {
        const entries = Object.entries(resource.values);
        const kept = entries.filter(([fieldId]) => fieldIds.has(fieldId));

        if (kept.length < entries.length) {
          await tx
            .update(resources)
            .set({ values: Object.fromEntries(kept) })
            .where(eq(resources.id, resource.id));
        }
      }

      const relations = relationTargets(structure.fields);
      const targets = alias(resources, 'targets');
      const current = await tx
        .select({
          id: links.id,
          fieldId: links.fieldId,
          columnId: links.columnId,
          structureId: targets.structureId,
        })
        .from(links)
        .innerJoin(targets, eq(targets.id, links.targetId))
        .where(
          inArray(
            links.sourceId,
            tx
              .select({ id: resources.id })
              .from(resources)
              .where(eq(resources.structureId, id)),
          ),
        );
      const stale = current
        .filter(
          (link) =>
            relations.get(keyOf(link.fieldId, link.columnId)) !==
            link.structureId,
        )
        .map((link) => link.id);

      if (stale.length > 0) {
        await tx.delete(links).where(inArray(links.id, stale));
      }
    });
  }

  async remove(userId: string, journeyId: string, id: string): Promise<void> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [structure] = await this.db
      .delete(structures)
      .where(this.inJourney(journeyId, id))
      .returning({ id: structures.id });

    if (!structure)
      throw new NotFoundException({
        code: 'STRUCTURE_NOT_FOUND',
        message: 'Structure not found.',
      });
  }

  private async withTags(
    db: Transaction | NodePgDatabase,
    rows: Structure[],
  ): Promise<StructureView[]> {
    if (rows.length === 0) return [];

    const linked = await db
      .select({
        structureId: structureTagLinks.structureId,
        tag: structureTags,
      })
      .from(structureTagLinks)
      .innerJoin(structureTags, eq(structureTags.id, structureTagLinks.tagId))
      .where(
        inArray(
          structureTagLinks.structureId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(structureTags.createdAt), asc(structureTags.name));

    return rows.map((row) => ({
      ...row,
      tags: linked
        .filter((link) => link.structureId === row.id)
        .map((link) => link.tag),
    }));
  }

  private async setTags(
    tx: Transaction,
    journeyId: string,
    structureId: string,
    tagIds: string[],
  ): Promise<void> {
    const unique = [...new Set(tagIds)];

    if (unique.length > 0) {
      const found = await tx
        .select({ id: structureTags.id })
        .from(structureTags)
        .where(
          and(
            inArray(structureTags.id, unique),
            or(
              isNull(structureTags.journeyId),
              eq(structureTags.journeyId, journeyId),
            ),
          ),
        );

      if (found.length !== unique.length) {
        throw new BadRequestException({
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found.',
        });
      }
    }

    await tx
      .delete(structureTagLinks)
      .where(eq(structureTagLinks.structureId, structureId));

    if (unique.length > 0) {
      await tx
        .insert(structureTagLinks)
        .values(unique.map((tagId) => ({ structureId, tagId })));
    }
  }

  private inJourney(journeyId: string, id: string) {
    return and(eq(structures.journeyId, journeyId), eq(structures.id, id));
  }
}
