import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import {
  type Template,
  type TemplateCategory,
  templateCategories,
  templates,
} from './templates.schema.js';

@Injectable()
export class TemplatesService {
  constructor(@Inject(DATABASE) private readonly db: NodePgDatabase) {}

  async findAll(): Promise<
    (Template & { categories: Pick<TemplateCategory, 'name' | 'icon'>[] })[]
  > {
    const [rows, categories] = await Promise.all([
      this.db.select().from(templates).orderBy(asc(templates.position)),
      this.db
        .select()
        .from(templateCategories)
        .orderBy(asc(templateCategories.position)),
    ]);

    return rows.map((template) => ({
      ...template,
      categories: categories
        .filter((category) => category.templateId === template.id)
        .map(({ name, icon }) => ({ name, icon })),
    }));
  }
}
