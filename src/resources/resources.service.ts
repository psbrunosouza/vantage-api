import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { SystemsService } from '../systems/systems.service.js';
import { memberResources } from '../members/members.schema.js';
import { MembersService } from '../members/members.service.js';
import { links } from '../links/links.schema.js';
import { keyOf, tableRowIds } from '../links/relation-columns.js';
import {
  type ImageFile,
  ImageStorageService,
} from '../storage/image-storage.service.js';
import type { StructureField } from '../structures/structure-field.js';
import { structures } from '../structures/structures.schema.js';
import { hasActorsTag } from '../tags/actors.js';
import type { CreateCharacterDto } from './dto/create-character.dto.js';
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
    private readonly systemsService: SystemsService,
    private readonly membersService: MembersService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async findAll(userId: string, systemId: string): Promise<Resource[]> {
    await this.systemsService.ensureVisible(userId, systemId);
    return this.db
      .select(getTableColumns(resources))
      .from(resources)
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(eq(structures.systemId, systemId))
      .orderBy(asc(resources.createdAt));
  }

  async create(
    userId: string,
    systemId: string,
    structureId: string,
    dto: CreateResourceDto,
  ): Promise<Resource> {
    await this.systemsService.ensureOwner(userId, systemId);

    const [structure] = await this.db
      .select({ fields: structures.fields })
      .from(structures)
      .where(
        and(
          eq(structures.id, structureId),
          eq(structures.systemId, systemId),
        ),
      );
    if (!structure)
      throw new NotFoundException({
        code: 'STRUCTURE_NOT_FOUND',
        message: 'Structure not found.',
      });

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

  async removeMany(
    userId: string,
    systemId: string,
    ids: readonly string[],
  ): Promise<void> {
    await this.systemsService.ensureOwner(userId, systemId);

    if (ids.length === 0) return;

    await this.db
      .delete(resources)
      .where(
        and(
          inArray(resources.id, [...ids]),
          inArray(
            resources.structureId,
            this.db
              .select({ id: structures.id })
              .from(structures)
              .where(eq(structures.systemId, systemId)),
          ),
        ),
      );
  }

  async createCharacter(
    userId: string,
    systemId: string,
    dto: CreateCharacterDto,
  ): Promise<Resource> {
    await this.systemsService.ensureOwner(userId, systemId);

    return this.db.transaction(async (tx) => {
      const [actors] = await tx
        .select({ id: structures.id, fields: structures.fields })
        .from(structures)
        .where(
          and(eq(structures.systemId, systemId), hasActorsTag(structures.id)),
        )
        .orderBy(asc(structures.createdAt))
        .limit(1);

      if (!actors) {
        throw new BadRequestException({
          code: 'ACTORS_MISSING',
          message: 'Tag a structure as Actors first.',
        });
      }

      const taken = new Set(actors.fields.map((field) => field.id));

      if (dto.fields.some((field) => taken.has(field.id))) {
        throw new BadRequestException({
          code: 'FIELD_IDS_REUSED',
          message: 'New fields need new ids.',
        });
      }

      const fields = [...actors.fields, ...dto.fields];

      if (dto.fields.length > 0) {
        await tx
          .update(structures)
          .set({ fields })
          .where(eq(structures.id, actors.id));
      }

      const [resource] = await tx
        .insert(resources)
        .values({
          structureId: actors.id,
          name: dto.name,
          values: parseResourceValues(fields, dto.values),
        })
        .returning();

      await tx
        .insert(memberResources)
        .values({ resourceId: resource.id, systemId, userId });

      return resource;
    });
  }

  async update(
    userId: string,
    systemId: string,
    id: string,
    dto: UpdateResourceDto,
  ): Promise<Resource> {
    await this.membersService.ensureEditor(userId, systemId, id);
    const fields = await this.fieldsOf(systemId, id);
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
        const fieldIds = new Set(fields.map((field) => field.id));
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
          .filter(
            (link) =>
              link.rowId !== null &&
              fieldIds.has(link.fieldId) &&
              !kept.has(keyOf(link.fieldId, link.rowId)),
          )
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
    systemId: string,
    id: string,
    fieldId: string,
    file: ImageFile | undefined,
  ): Promise<{ url: string }> {
    await this.membersService.ensureEditor(userId, systemId, id);
    const fields = await this.fieldsOf(systemId, id);

    if (!fields.some((field) => field.id === fieldId && field.type === IMAGE)) {
      throw new NotFoundException({
        code: 'IMAGE_FIELD_NOT_FOUND',
        message: 'Image field not found.',
      });
    }

    const url = await this.imageStorage.replace(
      BUCKET,
      `${systemId}/${id}/${fieldId}`,
      file,
    );
    return { url };
  }

  private async fieldsOf(
    systemId: string,
    id: string,
  ): Promise<StructureField[]> {
    const [resource] = await this.db
      .select({ fields: structures.fields })
      .from(resources)
      .innerJoin(structures, eq(structures.id, resources.structureId))
      .where(and(eq(resources.id, id), eq(structures.systemId, systemId)));

    if (!resource)
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found.',
      });
    return resource.fields;
  }
}
