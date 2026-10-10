import { z } from 'zod';

export const structureProposalsSchema = z.object({
  themes: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  structures: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export type StructureProposalsDto = z.infer<typeof structureProposalsSchema>;
