import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { resources } from '../resources.schema.js';

export const createResourceSchema = createInsertSchema(resources, {
  name: (schema) => schema.min(1),
  values: z.record(z.string(), z.unknown()).optional(),
}).pick({
  name: true,
  values: true,
});

export type CreateResourceDto = z.infer<typeof createResourceSchema>;
