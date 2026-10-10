import { z } from 'zod';

export const systemOptionsSchema = z.object({
  direction: z.string().trim().max(2000).optional(),
  themes: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  moods: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export type SystemOptionsDto = z.infer<typeof systemOptionsSchema>;
