import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { resources } from '../resources/resources.schema.js';

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    fieldId: text('field_id').notNull(),
    rowId: text('row_id').notNull(),
    columnId: text('column_id').notNull(),
    targetId: uuid('target_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique().on(
      table.sourceId,
      table.fieldId,
      table.rowId,
      table.columnId,
      table.targetId,
    ),
    index().on(table.targetId),
  ],
);

export type Link = typeof links.$inferSelect;
