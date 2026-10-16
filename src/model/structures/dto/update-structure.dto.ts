import type { z } from 'zod';
import { createStructureSchema } from './create-structure.dto.js';

export const updateStructureSchema = createStructureSchema.partial();

export type UpdateStructureDto = z.infer<typeof updateStructureSchema>;
