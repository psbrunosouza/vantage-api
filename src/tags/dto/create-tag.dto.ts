import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;
