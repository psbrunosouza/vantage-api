import { Inject, Injectable } from '@nestjs/common';
import { asc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { catalogThemes } from './catalog.schema.js';

@Injectable()
export class CatalogService {
  constructor(@Inject(DATABASE) private readonly db: NodePgDatabase) {}

  async themes(): Promise<string[]> {
    const rows = await this.db
      .select({ name: catalogThemes.name })
      .from(catalogThemes)
      .orderBy(asc(catalogThemes.name));
    return rows.map((row) => row.name);
  }

  async randomThemes(count: number): Promise<string[]> {
    const rows = await this.db
      .select({ name: catalogThemes.name })
      .from(catalogThemes)
      .orderBy(sql`random()`)
      .limit(count);
    return rows.map((row) => row.name);
  }
}
