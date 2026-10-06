import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { playSessions } from '../play-sessions.schema.js';

export const updatePlaySessionSchema = createInsertSchema(playSessions, {
  title: (schema) => schema.min(1),
}).pick({ title: true });

export type UpdatePlaySessionDto = z.infer<typeof updatePlaySessionSchema>;
