import { z } from 'zod';
import { RESOURCE_CAPABILITIES } from '../resources.schema.js';
import { createResourceSchema } from './create-resource.dto.js';

export const updateResourceSchema = createResourceSchema.partial().extend({
  capability: z.enum(RESOURCE_CAPABILITIES).nullable().optional(),
});

export type UpdateResourceDto = z.infer<typeof updateResourceSchema>;
