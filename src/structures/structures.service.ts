import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { links } from '../links/links.schema.js';
import { keyOf, relationTargets } from '../links/relation-columns.js';
import { resources } from '../resources/resources.schema.js';
import type { CreateStructureDto } from './dto/create-structure.dto.js';
import type { UpdateStructureDto } from './dto/update-structure.dto.js';
import { type Structure, structures } from './structures.schema.js';

@Injectable()
export class StructuresService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async findAll(userId: string, journeyId: string): Promise<Structure[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select()
      .from(structures)
      .where(eq(structures.journeyId, journeyId))
      .orderBy(asc(structures.createdAt));
  }

  async create(
    userId: string,
    journeyId: string,
    dto: CreateStructureDto,
  ): Promise<Structure> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [structure] = await this.db
      .insert(structures)
      .values({ ...dto, journeyId })
      .returning();
    return structure;
  }

  async update(
    userId: string,
    journeyId: string,
    id: string,
    dto: UpdateStructureDto,
  ): Promise<Structure> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const [structure] = await this.db
      .update(structures)
      .set(dto)
      .where(this.inJourney(journeyId, id))
      .returning();

    if (!structure) throw new NotFoundException('Structure not found.');
    return structure;
  }

  async prune(userId: string, journeyId: string, id: string): Promise<void> {
    await this.journeysService.ensureOwner(userId, journeyId);

    await this.db.transaction(async (tx) => {
      const [structure] = await tx
        .select({ fields: structures.fields })
        .from(structures)
        .where(this.inJourney(journeyId, id));

      if (!structure) throw new NotFoundException('Structure not found.');

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

    if (!structure) throw new NotFoundException('Structure not found.');
  }

  private inJourney(journeyId: string, id: string) {
    return and(eq(structures.journeyId, journeyId), eq(structures.id, id));
  }
}
