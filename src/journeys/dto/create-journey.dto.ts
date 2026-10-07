import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { journeys } from '../journeys.schema.js';

export const createJourneySchema = createInsertSchema(journeys, {
  name: (schema) => schema.min(1),
  initials: (schema) => schema.min(1),
}).pick({
  name: true,
  initials: true,
  icon: true,
  description: true,
  color: true,
  mainDie: true,
  aiNarrator: true,
});

export type CreateJourneyDto = z.infer<typeof createJourneySchema>;
