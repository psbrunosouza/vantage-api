import { readFile } from 'node:fs/promises';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { batches } from './batches.js';
import { catalogThemes } from './catalog.schema.js';

const SOURCE = new URL('../database/seeds/themes.txt', import.meta.url);

export async function seedThemes(db: NodePgDatabase): Promise<void> {
  const names = new Set(
    (await readFile(SOURCE, 'utf8'))
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );

  await db.transaction(async (tx) => {
    for (const theme of await tx.select().from(catalogThemes)) {
      names.delete(theme.name);
    }

    for (const rows of batches([...names].map((name) => ({ name })))) {
      await tx.insert(catalogThemes).values(rows).onConflictDoNothing();
    }
  });
}
