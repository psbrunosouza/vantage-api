import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { systems } from '../systems/systems.schema.js';

export const SESSION_ZERO_FORMATS = [
  'single',
  'multiple',
  'text',
  'number',
] as const;

export type SessionZeroFormat = (typeof SESSION_ZERO_FORMATS)[number];

export const sessionZeroQuestions = pgTable(
  'session_zero_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    systemId: uuid('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    prompt: text('prompt').notNull(),
    format: text('format', { enum: SESSION_ZERO_FORMATS })
      .notNull()
      .default('text'),
    options: jsonb('options').$type<string[]>().notNull().default([]),
    min: integer('min'),
    max: integer('max'),
    reword: boolean('reword').notNull().default(true),
    details: jsonb('details')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.systemId, table.position)],
);

export type SessionZeroQuestion = typeof sessionZeroQuestions.$inferSelect;
