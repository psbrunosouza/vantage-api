import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { systems } from '../systems.schema.js';

export const createSystemSchema = createInsertSchema(systems, {
  name: (schema) => schema.min(1),
  initials: (schema) => schema.min(1),
  pattern: (schema) => schema.min(0),
}).pick({
  name: true,
  initials: true,
  icon: true,
  description: true,
  color: true,
  pattern: true,
  mainDie: true,
  aiNarrator: true,
});

export type CreateSystemDto = z.infer<typeof createSystemSchema>;
