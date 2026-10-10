import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { systems } from '../systems/systems.schema.js';
import { structures } from '../structures/structures.schema.js';

export const structureTags = pgTable(
  'structure_tags',
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
    uniqueIndex('structure_tags_system_slug_unique').on(
      table.systemId,
      table.slug,
    ),
    uniqueIndex('structure_tags_global_slug_unique')
      .on(table.slug)
      .where(sql`${table.systemId} is null`),
  ],
);

export const structureTagLinks = pgTable(
  'structure_tag_links',
  {
    structureId: uuid('structure_id')
      .notNull()
      .references(() => structures.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => structureTags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.structureId, table.tagId] }),
    index().on(table.tagId),
  ],
);

export type StructureTag = typeof structureTags.$inferSelect;
