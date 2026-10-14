import { Inject, Injectable } from '@nestjs/common';
import { asc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { type CatalogTheme, catalogThemes } from './catalog.schema.js';

@Injectable()
export class CatalogService {
  constructor(@Inject(DATABASE) private readonly db: NodePgDatabase) {}

  themes(): Promise<Pick<CatalogTheme, 'name' | 'labels' | 'suggestions'>[]> {
    return this.db
      .select({
        name: catalogThemes.name,
        labels: catalogThemes.labels,
        suggestions: catalogThemes.suggestions,
      })
      .from(catalogThemes)
      .orderBy(asc(catalogThemes.name));
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
