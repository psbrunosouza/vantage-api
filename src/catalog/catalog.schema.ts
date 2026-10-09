import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';

export const catalogThemes = pgTable('catalog_themes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
});

export const catalogSpecies = pgTable('catalog_species', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
});

export const catalogSpeciesThemes = pgTable(
  'catalog_species_themes',
  {
    speciesId: integer('species_id')
      .notNull()
      .references(() => catalogSpecies.id, { onDelete: 'cascade' }),
    themeId: integer('theme_id')
      .notNull()
      .references(() => catalogThemes.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.speciesId, table.themeId] }),
    index().on(table.themeId),
  ],
);

export type CatalogTheme = typeof catalogThemes.$inferSelect;
export type CatalogSpecies = typeof catalogSpecies.$inferSelect;
