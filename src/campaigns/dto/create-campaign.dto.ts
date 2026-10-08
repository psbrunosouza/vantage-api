import { z } from 'zod';

export const campaignBriefSchema = z.object({
  opening: z.string().min(1),
  setting: z.string().min(1),
  culture: z.string().min(1),
  politics: z.string().min(1),
  tone: z.string().min(1),
  localTheme: z.string().min(1),
  hook: z.string().min(1),
  problem: z.string().min(1),
  escalation: z.string().min(1),
  complications: z.array(z.string().min(1)),
  npcs: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
});

export const createCampaignSchema = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  brief: campaignBriefSchema,
});

export type CampaignBrief = z.infer<typeof campaignBriefSchema>;

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
