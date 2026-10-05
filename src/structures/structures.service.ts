import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { links } from '../links/links.schema.js';
import { staleRelations } from '../links/relation-columns.js';
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

    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ fields: structures.fields })
        .from(structures)
        .where(this.inJourney(journeyId, id));

      if (!current) throw new NotFoundException('Structure not found.');

      const [structure] = await tx
        .update(structures)
        .set(dto)
        .where(eq(structures.id, id))
        .returning();

      const kept = new Set(dto.fields?.map((field) => field.id));
      const removed = dto.fields
        ? current.fields.filter((field) => !kept.has(field.id))
        : [];

      if (removed.length > 0) {
        const ids = sql.join(
          removed.map((field) => sql`${field.id}`),
          sql`, `,
        );
        await tx
          .update(resources)
          .set({ values: sql`${resources.values} - array[${ids}]::text[]` })
          .where(eq(resources.structureId, id));
      }

      const stale = dto.fields
        ? staleRelations(current.fields, dto.fields)
        : [];

      if (stale.length > 0) {
        await tx.delete(links).where(
          and(
            inArray(
              links.sourceId,
              tx
                .select({ id: resources.id })
                .from(resources)
                .where(eq(resources.structureId, id)),
            ),
            or(
              ...stale.map((key) =>
                and(
                  eq(links.fieldId, key.fieldId),
                  eq(links.columnId, key.columnId),
                ),
              ),
            ),
          ),
        );
      }

      return structure;
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
