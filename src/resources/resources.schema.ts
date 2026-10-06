import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { structures } from '../structures/structures.schema.js';

export type ResourceValues = Record<string, unknown>;

export const RESOURCE_CAPABILITIES = ['actor'] as const;

export const ACTOR = 'actor';

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    structureId: uuid('structure_id')
      .notNull()
      .references(() => structures.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    values: jsonb('values').$type<ResourceValues>().notNull().default({}),
    capability: text('capability', { enum: RESOURCE_CAPABILITIES }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.structureId)],
);

export type Resource = typeof resources.$inferSelect;
