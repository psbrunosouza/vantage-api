import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { resources } from '../resources.schema.js';

export const AI_NOTE_LENGTH = 500;

export const createResourceSchema = createInsertSchema(resources, {
  name: (schema) => schema.min(1),
  values: z.record(z.string(), z.unknown()).optional(),
  aiNote: (schema) => schema.trim().max(AI_NOTE_LENGTH),
}).pick({
  name: true,
  values: true,
  aiNote: true,
});

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
