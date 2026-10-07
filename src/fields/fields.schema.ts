import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const fieldTypes = pgTable('field_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  description: text('description').notNull(),
  position: integer('position').notNull(),
});

export type FieldType = typeof fieldTypes.$inferSelect;
