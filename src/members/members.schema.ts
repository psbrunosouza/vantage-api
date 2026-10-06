import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { journeyMembers } from '../journeys/journeys.schema.js';
import { resources } from '../resources/resources.schema.js';

export const memberResources = pgTable(
  'member_resources',
  {
    resourceId: uuid('resource_id')
      .primaryKey()
      .references(() => resources.id, { onDelete: 'cascade' }),
    journeyId: uuid('journey_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'member_resources_member_fk',
      columns: [table.journeyId, table.userId],
      foreignColumns: [journeyMembers.journeyId, journeyMembers.userId],
    }).onDelete('cascade'),
    index().on(table.journeyId, table.userId),
  ],
);
