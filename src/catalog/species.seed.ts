import { readFile } from 'node:fs/promises';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { batches } from './batches.js';
import {
  type CatalogSpecies,
  catalogSpecies,
  catalogSpeciesThemes,
  catalogThemes,
} from './catalog.schema.js';

const SOURCE = new URL('../database/seeds/species.json', import.meta.url);

const sourceSchema = z.object({
  species: z.array(
    z.object({
      id: z.number().int(),
      name: z.string().trim().min(1),
      category: z.string().trim().min(1),
      themes: z.array(z.string().trim().min(1)),
    }),
  ),
});

type SpeciesTheme = typeof catalogSpeciesThemes.$inferSelect;

export async function seedSpecies(db: NodePgDatabase): Promise<void> {
  const { species: source } = sourceSchema.parse(
    JSON.parse(await readFile(SOURCE, 'utf8')),
  );

  await db.transaction(async (tx) => {
    const themeIdOf = new Map(
      (await tx.select().from(catalogThemes)).map((theme) => [
        theme.name,
        theme.id,
      ]),
    );
    const storedSpecies = new Set(
      (await tx.select({ id: catalogSpecies.id }).from(catalogSpecies)).map(
        (row) => row.id,
      ),
    );
    const storedLinks = new Set(
      (await tx.select().from(catalogSpeciesThemes)).map((link) =>
        linkKey(link.speciesId, link.themeId),
      ),
    );
    const newSpecies = new Map<number, CatalogSpecies>();
    const newLinks = new Map<string, SpeciesTheme>();

    for (const { id, name, category, themes } of source) {
      if (!storedSpecies.has(id)) {
        newSpecies.set(id, { id, name, category });
      }

      for (const theme of themes) {
        const themeId = themeIdOf.get(theme);

        if (themeId === undefined) {
          continue;
        }

        const key = linkKey(id, themeId);

        if (!storedLinks.has(key)) {
          newLinks.set(key, { speciesId: id, themeId });
        }
      }
    }

    for (const rows of batches([...newSpecies.values()])) {
      await tx.insert(catalogSpecies).values(rows).onConflictDoNothing();
    }

    for (const rows of batches([...newLinks.values()])) {
      await tx.insert(catalogSpeciesThemes).values(rows).onConflictDoNothing();
    }
  });
}

function linkKey(speciesId: number, themeId: number): string {
  return `${speciesId}:${themeId}`;
}
