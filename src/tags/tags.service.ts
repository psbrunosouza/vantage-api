import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { asc, eq, isNull, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { SystemsService } from '../systems/systems.service.js';
import type { CreateTagDto } from './dto/create-tag.dto.js';
import { type FieldTag, fieldTags } from './field-tags.schema.js';
import { type StructureTag, structureTags } from './structure-tags.schema.js';

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const TAG_EXISTS = {
  code: 'TAG_EXISTS',
  message: 'A tag with this name already exists.',
};

@Injectable()
export class TagsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async findStructureTags(
    userId: string,
    systemId: string,
  ): Promise<StructureTag[]> {
    await this.systemsService.ensureVisible(userId, systemId);
    return this.db
      .select()
      .from(structureTags)
      .where(
        or(
          isNull(structureTags.systemId),
          eq(structureTags.systemId, systemId),
        ),
      )
      .orderBy(asc(structureTags.createdAt), asc(structureTags.name));
  }

  findGlobalStructureTags(): Promise<StructureTag[]> {
    return this.db
      .select()
      .from(structureTags)
      .where(isNull(structureTags.systemId))
      .orderBy(asc(structureTags.createdAt), asc(structureTags.name));
  }

  findGlobalFieldTags(): Promise<FieldTag[]> {
    return this.db
      .select()
      .from(fieldTags)
      .where(isNull(fieldTags.systemId))
      .orderBy(asc(fieldTags.createdAt), asc(fieldTags.name));
  }

  async createStructureTag(
    userId: string,
    systemId: string,
    dto: CreateTagDto,
  ): Promise<StructureTag> {
    await this.systemsService.ensureOwner(userId, systemId);
    const slug = slugify(dto.name);
    const taken = (await this.findStructureTags(userId, systemId)).some(
      (tag) => tag.slug === slug,
    );

    if (slug === '' || taken) throw new ConflictException(TAG_EXISTS);

    const [tag] = await this.db
      .insert(structureTags)
      .values({ ...dto, slug, systemId })
      .returning();
    return tag;
  }

  async findFieldTags(userId: string, systemId: string): Promise<FieldTag[]> {
    await this.systemsService.ensureVisible(userId, systemId);
    return this.db
      .select()
      .from(fieldTags)
      .where(
        or(isNull(fieldTags.systemId), eq(fieldTags.systemId, systemId)),
      )
      .orderBy(asc(fieldTags.createdAt), asc(fieldTags.name));
  }

  async createFieldTag(
    userId: string,
    systemId: string,
    dto: CreateTagDto,
  ): Promise<FieldTag> {
    await this.systemsService.ensureOwner(userId, systemId);
    const slug = slugify(dto.name);
    const taken = (await this.findFieldTags(userId, systemId)).some(
      (tag) => tag.slug === slug,
    );

    if (slug === '' || taken) throw new ConflictException(TAG_EXISTS);

    const [tag] = await this.db
      .insert(fieldTags)
      .values({ ...dto, slug, systemId })
      .returning();
    return tag;
  }
}
