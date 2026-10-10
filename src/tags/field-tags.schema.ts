import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { systems } from '../systems/systems.schema.js';

export const fieldTags = pgTable(
  'field_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    systemId: uuid('system_id').references(() => systems.id, {
      onDelete: 'cascade',
    }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index().on(table.systemId),
    uniqueIndex('field_tags_system_slug_unique').on(
      table.systemId,
      table.slug,
    ),
    uniqueIndex('field_tags_global_slug_unique')
      .on(table.slug)
      .where(sql`${table.systemId} is null`),
  ],
);

export type FieldTag = typeof fieldTags.$inferSelect;
