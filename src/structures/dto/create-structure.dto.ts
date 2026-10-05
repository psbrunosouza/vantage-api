import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { structureFieldSchema } from '../structure-field.js';
import { structures } from '../structures.schema.js';

export const createStructureSchema = createInsertSchema(structures, {
  name: (schema) => schema.min(1),
  icon: (schema) => schema.min(1),
  fields: z.array(structureFieldSchema).optional(),
}).pick({
  name: true,
  icon: true,
  color: true,
  fields: true,
});

export type CreateStructureDto = z.infer<typeof createStructureSchema>;
