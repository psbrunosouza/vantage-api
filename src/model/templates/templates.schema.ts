import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  icon: text('icon').notNull(),
  color: text('color'),
  position: integer('position').notNull(),
});

export const templateCategories = pgTable(
  'template_categories',
  {
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
  },
  (table) => [primaryKey({ columns: [table.templateId, table.position] })],
);

export type Template = typeof templates.$inferSelect;
export type TemplateCategory = typeof templateCategories.$inferSelect;
