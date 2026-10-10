import { z } from 'zod';

export const populationSchema = z.object({
  replace: z.array(z.uuid()).max(100).default([]),
  request: z.string().trim().min(1).max(500).optional(),
});

export type PopulationDto = z.infer<typeof populationSchema>;
