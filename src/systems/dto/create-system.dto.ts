import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { systems } from '../systems.schema.js';

export const createSystemSchema = createInsertSchema(systems, {
  name: (schema) => schema.min(1),
  initials: (schema) => schema.min(1),
}).pick({
  name: true,
  initials: true,
  icon: true,
  description: true,
  color: true,
  mainDie: true,
  aiNarrator: true,
});

export type CreateSystemDto = z.infer<typeof createSystemSchema>;
