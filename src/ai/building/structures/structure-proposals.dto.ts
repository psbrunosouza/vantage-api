import { z } from 'zod';
import { structureFieldSchema } from '../../../model/structures/structure-field.js';

export const structureProposalsSchema = z.object({
  themes: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  structures: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  kept: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
      }),
    )
    .max(14)
    .default([]),
  replaced: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        fields: z.array(structureFieldSchema).max(20).default([]),
      }),
    )
    .max(14)
    .default([]),
});

export type StructureProposalsDto = z.infer<typeof structureProposalsSchema>;
