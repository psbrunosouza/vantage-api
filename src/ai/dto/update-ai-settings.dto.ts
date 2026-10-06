import { z } from 'zod';

export const updateAiSettingsSchema = z
  .object({
    model: z.string().min(1).optional(),
    apiKey: z.string().trim().min(1).optional(),
  })
  .refine((dto) => dto.model !== undefined || dto.apiKey !== undefined, {
    message: 'Send a model or an API key.',
  });

export type UpdateAiSettingsDto = z.infer<typeof updateAiSettingsSchema>;
