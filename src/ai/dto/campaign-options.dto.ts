import { z } from 'zod';

export const campaignOptionsSchema = z.object({
  direction: z.string().trim().max(2000).optional(),
  moods: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export type CampaignOptionsDto = z.infer<typeof campaignOptionsSchema>;
