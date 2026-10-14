import { readFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { batches } from './batches.js';
import { catalogThemes } from './catalog.schema.js';

const SOURCE = new URL('../database/seeds/themes.json', import.meta.url);

const sourceSchema = z.object({
  themes: z.record(
    z.string().trim().min(1),
    z.object({
      subthemes: z.array(z.record(z.string(), z.string().trim().min(1))),
    }),
  ),
});

export async function seedThemes(db: NodePgDatabase): Promise<void> {
  const { themes } = sourceSchema.parse(
    JSON.parse(await readFile(SOURCE, 'utf8')),
  );
  const rows = Object.entries(themes).map(([name, theme]) => ({
    name: name.trim(),
    suggestions: theme.subthemes,
  }));

  await db.transaction(async (tx) => {
    for (const batch of batches(rows)) {
      await tx
        .insert(catalogThemes)
        .values(batch)
        .onConflictDoUpdate({
          target: catalogThemes.name,
          set: { suggestions: sql`excluded.suggestions` },
        });
    }
  });
}
