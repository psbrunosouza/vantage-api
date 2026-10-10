import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema.js';
import { systems } from '../systems/systems.schema.js';
import type {
  DraftCharacter,
  DraftHook,
  DraftOption,
  DraftQuestion,
  DraftResource,
  DraftStructure,
  DraftSystem,
  DraftTag,
} from './dto/system-draft.dto.js';

export const SYSTEM_DRAFT_STATUSES = ['incomplete', 'complete'] as const;
export type SystemDraftStatus = (typeof SYSTEM_DRAFT_STATUSES)[number];

export const systemDrafts = pgTable(
  'system_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: SYSTEM_DRAFT_STATUSES })
      .notNull()
      .default('incomplete'),
    systemId: uuid('system_id').references(() => systems.id, {
      onDelete: 'set null',
    }),
    progress: jsonb('progress')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    system: jsonb('system').$type<DraftSystem>().notNull().default({}),
    options: jsonb('options').$type<DraftOption[]>().notNull().default([]),
    structureTags: jsonb('structure_tags')
      .$type<DraftTag[]>()
      .notNull()
      .default([]),
    fieldTags: jsonb('field_tags').$type<DraftTag[]>().notNull().default([]),
    structures: jsonb('structures')
      .$type<DraftStructure[]>()
      .notNull()
      .default([]),
    resources: jsonb('resources')
      .$type<DraftResource[]>()
      .notNull()
      .default([]),
    hooks: jsonb('hooks').$type<DraftHook[]>().notNull().default([]),
    questions: jsonb('questions')
      .$type<DraftQuestion[]>()
      .notNull()
      .default([]),
    character: jsonb('character').$type<DraftCharacter>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.ownerId, table.status)],
);

export type SystemDraft = typeof systemDrafts.$inferSelect;
