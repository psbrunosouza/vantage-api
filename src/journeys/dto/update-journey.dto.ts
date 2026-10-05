import type { z } from 'zod';
import { createJourneySchema } from './create-journey.dto.js';

export const updateJourneySchema = createJourneySchema.partial();

export type UpdateJourneyDto = z.infer<typeof updateJourneySchema>;
