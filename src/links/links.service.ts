import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  ne,
  or,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { MembersService } from '../members/members.service.js';
import { resources } from '../resources/resources.schema.js';
import { structures } from '../structures/structures.schema.js';
import type { SetLinksDto } from './dto/set-links.dto.js';
import { type Link, links } from './links.schema.js';
import {
  fieldRelation,
  relationColumns,
  tableRowIds,
} from './relation-columns.js';

@Injectable()
export class LinksService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
    private readonly membersService: MembersService,
  ) {}

  async findAll(userId: string, journeyId: string): Promise<Link[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select(getTableColumns(links))
      .from(links)
      .innerJoin(resources, eq(resources.id, links.sourceId))
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(eq(structures.journeyId, journeyId))
      .orderBy(asc(links.createdAt));
  }

  async set(
    userId: string,
    journeyId: string,
    sourceId: string,
    dto: SetLinksDto,
  ): Promise<Link[]> {
    await this.membersService.ensureEditor(userId, journeyId, sourceId);

    return this.db.transaction(async (tx) => {
      const [source] = await tx
        .select({ fields: structures.fields, values: resources.values })
        .from(resources)
        .innerJoin(structures, eq(structures.id, resources.structureId))
        .where(
          and(eq(resources.id, sourceId), eq(structures.journeyId, journeyId)),
        );

      if (!source)
        throw new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found.',
        });

      const field = source.fields.find((entry) => entry.id === dto.fieldId);
      const relation =
        field === undefined
          ? undefined
          : dto.columnId === null
            ? fieldRelation(field)
            : relationColumns(field).find((entry) => entry.id === dto.columnId)
                ?.relation;

      if (!relation)
        throw new NotFoundException({
          code: 'RELATION_NOT_FOUND',
          message: 'Relation not found.',
        });

      if (
        dto.rowId !== null &&
        !tableRowIds(source.values, dto.fieldId).includes(dto.rowId)
      ) {
        throw new NotFoundException({
          code: 'ROW_NOT_FOUND',
          message: 'Row not found.',
        });
      }

      const targetIds = [...new Set(dto.targetIds)];

      if (relation.targets === 'one' && targetIds.length > 1) {
        throw new BadRequestException({
          code: 'RELATION_SINGLE_TARGET',
          message: 'This relation takes one target.',
        });
      }

      if (targetIds.length > 0) {
        const found = await tx
          .select({ id: resources.id })
          .from(resources)
          .innerJoin(structures, eq(structures.id, resources.structureId))
          .where(
            and(
              inArray(resources.id, targetIds),
              eq(resources.structureId, relation.structureId),
              eq(structures.journeyId, journeyId),
            ),
          );

        if (found.length !== targetIds.length) {
          throw new BadRequestException({
            code: 'RELATION_TARGET_INVALID',
            message: 'Target outside the relation.',
          });
        }
      }

      if (
        relation.sources === 'one' &&
        dto.rowId !== null &&
        dto.columnId !== null &&
        targetIds.length > 0
      ) {
        const [taken] = await tx
          .select({ id: links.id })
          .from(links)
          .where(
            and(
              eq(links.fieldId, dto.fieldId),
              eq(links.columnId, dto.columnId),
              inArray(links.targetId, targetIds),
              or(ne(links.sourceId, sourceId), ne(links.rowId, dto.rowId)),
            ),
          )
          .limit(1);

        if (taken)
          throw new ConflictException({
            code: 'RELATION_TARGET_TAKEN',
            message: 'Target already linked.',
          });
      }

      const cell = and(
        eq(links.sourceId, sourceId),
        eq(links.fieldId, dto.fieldId),
        dto.rowId === null ? isNull(links.rowId) : eq(links.rowId, dto.rowId),
        dto.columnId === null
          ? isNull(links.columnId)
          : eq(links.columnId, dto.columnId),
      );

      const current = await tx.select().from(links).where(cell);
      const kept = new Set(current.map((link) => link.targetId));
      const dropped = current
        .filter((link) => !targetIds.includes(link.targetId))
        .map((link) => link.id);
      const added = targetIds.filter((targetId) => !kept.has(targetId));

      if (dropped.length > 0) {
        await tx.delete(links).where(inArray(links.id, dropped));
      }

      if (added.length > 0) {
        await tx.insert(links).values(
          added.map((targetId) => ({
            sourceId,
            fieldId: dto.fieldId,
            rowId: dto.rowId,
            columnId: dto.columnId,
            targetId,
          })),
        );
      }

      return tx.select().from(links).where(cell).orderBy(asc(links.createdAt));
    });
  }
}
