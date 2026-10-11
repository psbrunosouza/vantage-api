import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { resources } from '../resources.schema.js';

export const AI_NOTE_LENGTH = 500;

export const createResourceSchema = createInsertSchema(resources, {
  name: (schema) => schema.min(1),
  values: z.record(z.string(), z.unknown()).optional(),
})
  .pick({
    name: true,
    values: true,
  })
  .extend({
    aiNote: z.string().trim().max(AI_NOTE_LENGTH).nullable().optional(),
  });

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
