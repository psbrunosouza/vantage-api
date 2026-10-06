import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { sessionFolders } from '../play-sessions.schema.js';

export const createSessionFolderSchema = createInsertSchema(sessionFolders, {
  name: (schema) => schema.min(1),
}).pick({ name: true });

export type CreateSessionFolderDto = z.infer<typeof createSessionFolderSchema>;
