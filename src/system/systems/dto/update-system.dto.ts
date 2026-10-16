import { z } from 'zod';
import { createSystemSchema } from './create-system.dto.js';

export const updateSystemSchema = createSystemSchema.partial().extend({
  narratorId: z.uuid().nullable().optional(),
  aiNarrator: z.boolean().optional(),
});

export type UpdateSystemDto = z.infer<typeof updateSystemSchema>;
