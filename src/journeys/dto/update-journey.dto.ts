import { z } from 'zod';
import { createJourneySchema } from './create-journey.dto.js';

export const updateJourneySchema = createJourneySchema.partial().extend({
  narratorId: z.uuid().nullable().optional(),
});

export type UpdateJourneyDto = z.infer<typeof updateJourneySchema>;
