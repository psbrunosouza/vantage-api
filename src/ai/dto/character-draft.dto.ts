import { z } from 'zod';

export const characterDraftSchema = z.object({
  concept: z.string().trim().max(2000).optional(),
});

export type CharacterDraftDto = z.infer<typeof characterDraftSchema>;
