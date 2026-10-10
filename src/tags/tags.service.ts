import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { asc, eq, isNull, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import type { CreateTagDto } from './dto/create-tag.dto.js';
import { type FieldTag, fieldTags } from './field-tags.schema.js';
import { type StructureTag, structureTags } from './structure-tags.schema.js';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TAG_EXISTS = {
  code: 'TAG_EXISTS',
  message: 'A tag with this name already exists.',
};

@Injectable()
export class TagsService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async findStructureTags(
    userId: string,
    journeyId: string,
  ): Promise<StructureTag[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select()
      .from(structureTags)
      .where(
        or(
          isNull(structureTags.journeyId),
          eq(structureTags.journeyId, journeyId),
        ),
      )
      .orderBy(asc(structureTags.createdAt), asc(structureTags.name));
  }

  async createStructureTag(
    userId: string,
    journeyId: string,
    dto: CreateTagDto,
  ): Promise<StructureTag> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const slug = slugify(dto.name);
    const taken = (await this.findStructureTags(userId, journeyId)).some(
      (tag) => tag.slug === slug,
    );

    if (slug === '' || taken) throw new ConflictException(TAG_EXISTS);

    const [tag] = await this.db
      .insert(structureTags)
      .values({ ...dto, slug, journeyId })
      .returning();
    return tag;
  }

  async findFieldTags(userId: string, journeyId: string): Promise<FieldTag[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select()
      .from(fieldTags)
      .where(
        or(isNull(fieldTags.journeyId), eq(fieldTags.journeyId, journeyId)),
      )
      .orderBy(asc(fieldTags.createdAt), asc(fieldTags.name));
  }

  async createFieldTag(
    userId: string,
    journeyId: string,
    dto: CreateTagDto,
  ): Promise<FieldTag> {
    await this.journeysService.ensureOwner(userId, journeyId);
    const slug = slugify(dto.name);
    const taken = (await this.findFieldTags(userId, journeyId)).some(
      (tag) => tag.slug === slug,
    );

    if (slug === '' || taken) throw new ConflictException(TAG_EXISTS);

    const [tag] = await this.db
      .insert(fieldTags)
      .values({ ...dto, slug, journeyId })
      .returning();
    return tag;
  }
}
