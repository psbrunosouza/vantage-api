import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { journeys } from '../journeys/journeys.schema.js';
import type { StructureField } from './structure-field.js';

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
    aiNote: text('ai_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.journeyId)],
);

export type Structure = typeof structures.$inferSelect;
