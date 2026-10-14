import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { describe, expect, it, vi } from 'vitest';
import { catalogThemes } from './catalog.schema.js';
import { seedThemes } from './themes.seed.js';

function database() {
  const rows: { name: string; suggestions: Record<string, string>[] }[] = [];
  const onConflictDoUpdate = vi.fn();
  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn((batch: typeof rows) => {
        rows.push(...batch);
        return { onConflictDoUpdate };
      }),
    })),
  };
  const db = {
    transaction: vi.fn((run: (client: typeof tx) => Promise<void>) => run(tx)),
  } as unknown as NodePgDatabase;

  return { db, rows, onConflictDoUpdate };
}

describe('seedThemes', () => {
  it('upserts every theme with its translated suggestions', async () => {
    const { db, rows, onConflictDoUpdate } = database();

    await seedThemes(db);

    expect(rows).toHaveLength(127);
    expect(rows.find((row) => row.name === 'cyberpunk')?.suggestions[0]).toEqual(
      {
        en: 'neon megacities',
        'pt-BR': 'megacidades de néon',
        es: 'megaciudades de neón',
      },
    );
    expect(rows.every((row) => row.suggestions.length === 10)).toBe(true);
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: catalogThemes.name }),
    );
  });
});
