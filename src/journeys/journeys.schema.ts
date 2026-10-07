import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema.js';

export const journeys = pgTable(
  'journeys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    initials: text('initials').notNull(),
    icon: text('icon'),
    description: text('description'),
    color: text('color'),
    mainDie: text('main_die'),
    avatarUrl: text('avatar_url'),
    narratorId: uuid('narrator_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    aiNarrator: boolean('ai_narrator').notNull().default(false),
    inviteCode: text('invite_code').unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.ownerId)],
);

export const journeyMembers = pgTable(
  'journey_members',
  {
    journeyId: uuid('journey_id')
      .notNull()
      .references(() => journeys.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    color: text('color').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.journeyId, table.userId] }),
    index().on(table.userId),
  ],
);

export type Journey = typeof journeys.$inferSelect;
