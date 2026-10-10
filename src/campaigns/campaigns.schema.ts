import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { systems } from '../systems/systems.schema.js';
import type { CampaignBrief } from './dto/create-campaign.dto.js';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  systemId: uuid('system_id')
    .notNull()
    .unique()
    .references(() => systems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  premise: text('premise').notNull(),
  brief: jsonb('brief').$type<CampaignBrief>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Campaign = typeof campaigns.$inferSelect;
