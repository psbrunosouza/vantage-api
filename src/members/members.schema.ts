import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { systemMembers } from '../systems/systems.schema.js';
import { resources } from '../resources/resources.schema.js';

export const memberResources = pgTable(
  'member_resources',
  {
    resourceId: uuid('resource_id')
      .primaryKey()
      .references(() => resources.id, { onDelete: 'cascade' }),
    systemId: uuid('system_id').notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'member_resources_member_fk',
      columns: [table.systemId, table.userId],
      foreignColumns: [systemMembers.systemId, systemMembers.userId],
    }).onDelete('cascade'),
    index().on(table.systemId, table.userId),
  ],
);
