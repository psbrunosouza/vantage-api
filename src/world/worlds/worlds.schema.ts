import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { systems } from '../../system/systems/systems.schema.js';
import type { GenreProfile } from './genre-profile.js';

export const worlds = pgTable('worlds', {
  systemId: uuid('system_id')
    .primaryKey()
    .references(() => systems.id, { onDelete: 'cascade' }),
  profile: jsonb('profile').$type<GenreProfile>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type World = typeof worlds.$inferSelect;
