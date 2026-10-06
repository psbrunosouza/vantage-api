import type { z } from 'zod';
import { createResourceSchema } from './create-resource.dto.js';

export const updateResourceSchema = createResourceSchema.partial();

export type UpdateResourceDto = z.infer<typeof updateResourceSchema>;
