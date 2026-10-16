import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { playSessions } from '../play-sessions.schema.js';

export const createPlaySessionSchema = createInsertSchema(playSessions).pick({
  folderId: true,
});

export type CreatePlaySessionDto = z.infer<typeof createPlaySessionSchema>;
