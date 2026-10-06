import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { journeys } from '../journeys/journeys.schema.js';
import type { CampaignBrief } from './dto/create-campaign.dto.js';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id')
    .notNull()
    .unique()
    .references(() => journeys.id, { onDelete: 'cascade' }),
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
