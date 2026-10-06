import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/auth.schema.js';

export const aiSettings = pgTable('ai_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  model: text('model'),
  apiKey: text('api_key'),
  apiKeyHint: text('api_key_hint'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AiSettings = typeof aiSettings.$inferSelect;
