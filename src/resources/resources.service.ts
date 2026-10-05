import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { links } from '../links/links.schema.js';
import { keyOf, tableRowIds } from '../links/relation-columns.js';
import {
  type ImageFile,
  ImageStorageService,
} from '../storage/image-storage.service.js';
import type { StructureField } from '../structures/structure-field.js';
import { structures } from '../structures/structures.schema.js';
import type { CreateResourceDto } from './dto/create-resource.dto.js';
import type { UpdateResourceDto } from './dto/update-resource.dto.js';
import { parseResourceValues } from './resource-values.js';
import { type Resource, resources } from './resources.schema.js';

const BUCKET = 'images';
const IMAGE = 'image';

@Injectable()
export class ResourcesService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async findAll(userId: string, journeyId: string): Promise<Resource[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select(getTableColumns(resources))
      .from(resources)
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(eq(structures.journeyId, journeyId))
      .orderBy(asc(resources.createdAt));
  }

  async create(
    userId: string,
    journeyId: string,
    structureId: string,
    dto: CreateResourceDto,
  ): Promise<Resource> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [structure] = await this.db
      .select({ fields: structures.fields })
      .from(structures)
      .where(
        and(eq(structures.id, structureId), eq(structures.journeyId, journeyId)),
      );
    if (!structure) throw new NotFoundException('Structure not found.');

    const [resource] = await this.db
      .insert(resources)
      .values({
        structureId,
        name: dto.name,
        values: parseResourceValues(structure.fields, dto.values ?? {}),
      })
      .returning();
    return resource;
  }

  async update(
    userId: string,
    journeyId: string,
    id: string,
    dto: UpdateResourceDto,
  ): Promise<Resource> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const fields = await this.fieldsOf(journeyId, id);
    const values =
      dto.values === undefined
        ? undefined
        : parseResourceValues(fields, dto.values);

    return this.db.transaction(async (tx) => {
      const [resource] = await tx
        .update(resources)
        .set(values === undefined ? dto : { ...dto, values })
        .where(eq(resources.id, id))
        .returning();

      if (values !== undefined) {
        const kept = new Set(
          fields.flatMap((field) =>
            tableRowIds(values, field.id).map((rowId) =>
              keyOf(field.id, rowId),
            ),
          ),
        );
        const current = await tx
          .select({ id: links.id, fieldId: links.fieldId, rowId: links.rowId })
          .from(links)
          .where(eq(links.sourceId, id));
        const stale = current
          .filter((link) => !kept.has(keyOf(link.fieldId, link.rowId)))
          .map((link) => link.id);

        if (stale.length > 0) {
          await tx.delete(links).where(inArray(links.id, stale));
        }
      }

      return resource;
    });
  }

  async uploadImage(
    userId: string,
    journeyId: string,
    id: string,
    fieldId: string,
    file: ImageFile | undefined,
  ): Promise<{ url: string }> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const fields = await this.fieldsOf(journeyId, id);

    if (!fields.some((field) => field.id === fieldId && field.type === IMAGE)) {
      throw new NotFoundException('Image field not found.');
    }

    const url = await this.imageStorage.replace(
      BUCKET,
      `${journeyId}/${id}/${fieldId}`,
      file,
    );
    return { url };
  }

  private async fieldsOf(
    journeyId: string,
    id: string,
  ): Promise<StructureField[]> {
    const [resource] = await this.db
      .select({ fields: structures.fields })
      .from(resources)
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(and(eq(resources.id, id), eq(structures.journeyId, journeyId)));

    if (!resource) throw new NotFoundException('Resource not found.');
    return resource.fields;
  }
}
