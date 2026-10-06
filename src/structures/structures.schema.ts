import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { journeys } from '../journeys/journeys.schema.js';
import type { StructureField } from './structure-field.js';

export const STRUCTURE_CAPABILITIES = ['actor'] as const;

export const ACTOR = 'actor';

export const structures = pgTable(
  'structures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color'),
    fields: jsonb('fields').$type<StructureField[]>().notNull().default([]),
    capability: text('capability', { enum: STRUCTURE_CAPABILITIES }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index().on(table.journeyId),
    uniqueIndex('structures_actor_unique')
      .on(table.journeyId)
      .where(sql`${table.capability} = 'actor'`),
  ],
);

export type Structure = typeof structures.$inferSelect;
