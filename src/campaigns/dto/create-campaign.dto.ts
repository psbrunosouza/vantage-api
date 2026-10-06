import { z } from 'zod';

export const campaignBriefSchema = z.object({
  setting: z.string().min(1),
  tone: z.string().min(1),
  hook: z.string().min(1),
  objective: z.string().min(1),
  npcs: z.array(z.object({ name: z.string().min(1), role: z.string().min(1) })),
});

export const createCampaignSchema = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  brief: campaignBriefSchema,
});

export type CampaignBrief = z.infer<typeof campaignBriefSchema>;

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
