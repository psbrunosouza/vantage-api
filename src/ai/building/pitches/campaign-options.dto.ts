import { z } from 'zod';

export const campaignOptionsSchema = z.object({
  direction: z.string().trim().max(2000).optional(),
  theme: z.string().trim().min(1).max(80).optional(),
  moods: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
});

export type CampaignOptionsDto = z.infer<typeof campaignOptionsSchema>;
