import { z } from 'zod';
import { structureFieldSchema } from '../../structures/structure-field.js';

export const createCharacterSchema = z.object({
  name: z.string().min(1),
  fields: z.array(structureFieldSchema),
  values: z.record(z.string(), z.unknown()),
});

export type CreateCharacterDto = z.infer<typeof createCharacterSchema>;
