import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { systems } from '../systems.schema.js';

export const createSystemSchema = createInsertSchema(systems, {
  name: (schema) => schema.min(1),
  initials: (schema) => schema.min(1),
  pattern: (schema) => schema.min(0),
  moods: z.array(z.string().trim().min(1).max(60)).max(8),
}).pick({
  name: true,
  initials: true,
  icon: true,
  description: true,
  color: true,
  pattern: true,
  mainDie: true,
  moods: true,
  aiNarrator: true,
});

export type CreateSystemDto = z.infer<typeof createSystemSchema>;
