import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { systems } from '../systems/systems.schema.js';
import { structures } from '../structures/structures.schema.js';

export const SESSION_ZERO_KINDS = ['field', 'record', 'bond'] as const;

export type SessionZeroKind = (typeof SESSION_ZERO_KINDS)[number];

export const sessionZeroQuestions = pgTable(
  'session_zero_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    systemId: uuid('system_id')
      .notNull()
      .references(() => systems.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    prompt: text('prompt').notNull(),
    kind: text('kind', { enum: SESSION_ZERO_KINDS }).notNull(),
    structureId: uuid('structure_id').references(() => structures.id, {
      onDelete: 'cascade',
    }),
    fieldId: text('field_id'),
    sourceStructureId: uuid('source_structure_id').references(
      () => structures.id,
      { onDelete: 'set null' },
    ),
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
