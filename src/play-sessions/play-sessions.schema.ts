import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema.js';
import { journeys } from '../journeys/journeys.schema.js';
import { resources } from '../resources/resources.schema.js';

export const sessionFolders = pgTable(
  'session_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
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

export const playSessions = pgTable(
  'play_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').references(() => sessionFolders.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.journeyId), index().on(table.folderId)],
);

export const ENTRY_KINDS = ['narrator', 'player'] as const;

export const ENTRY_SOURCES = ['user', 'ai'] as const;

export interface EntryData {
  text: string;
  name?: string;
}

export const sessionEntries = pgTable(
  'session_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => playSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    kind: text('kind', { enum: ENTRY_KINDS }).notNull(),
    source: text('source', { enum: ENTRY_SOURCES }).notNull().default('user'),
    resourceId: uuid('resource_id').references(() => resources.id, {
      onDelete: 'set null',
    }),
    data: jsonb('data').$type<EntryData>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index().on(table.sessionId, table.createdAt)],
);

export type SessionFolder = typeof sessionFolders.$inferSelect;
export type PlaySession = typeof playSessions.$inferSelect;
export type SessionEntry = typeof sessionEntries.$inferSelect;
