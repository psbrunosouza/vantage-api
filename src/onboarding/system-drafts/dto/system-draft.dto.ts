import { z } from 'zod';
import { campaignOptionSchema } from '../../../ai/building/pitches/pitches.flow.js';
import { createSystemSchema } from '../../../system/systems/dto/create-system.dto.js';
import { sessionZeroQuestionSchema } from '../../../story/session-zero/dto/replace-questions.dto.js';
import { createStructureSchema } from '../../../model/structures/dto/create-structure.dto.js';
import { createTagSchema } from '../../../model/tags/dto/create-tag.dto.js';
import { genreProfileSchema } from '../../../world/worlds/genre-profile.js';

export const draftSystemSchema = createSystemSchema
  .partial()
  .extend({ profile: genreProfileSchema.nullable().optional() });

export const draftTagSchema = createTagSchema.extend({ id: z.uuid() });

export const draftStructureSchema = createStructureSchema.extend({
  id: z.uuid(),
  tagIds: z.array(z.uuid()).default([]),
});

export const draftResourceSchema = z.object({
  id: z.uuid(),
  structureId: z.uuid(),
  name: z.string().min(1),
  values: z.record(z.string(), z.unknown()).default({}),
});

export const draftWorldSchema = z.object({
  structures: z.array(draftStructureSchema),
  resources: z.array(draftResourceSchema),
});

export const draftOptionSchema = z.object({
  option: campaignOptionSchema.extend({
    profile: genreProfileSchema.optional(),
  }),
  world: draftWorldSchema.nullable().default(null),
});

export const systemDraftSchema = z
  .object({
    progress: z.record(z.string(), z.unknown()),
    system: draftSystemSchema,
    options: z.array(draftOptionSchema),
    structureTags: z.array(draftTagSchema),
    fieldTags: z.array(draftTagSchema),
    structures: z.array(draftStructureSchema),
    resources: z.array(draftResourceSchema),
    questions: z.array(sessionZeroQuestionSchema),
  })
  .partial();

export type DraftTag = z.infer<typeof draftTagSchema>;
export type DraftStructure = z.infer<typeof draftStructureSchema>;
export type DraftResource = z.infer<typeof draftResourceSchema>;
export type DraftWorld = z.infer<typeof draftWorldSchema>;
export type DraftOption = z.infer<typeof draftOptionSchema>;
export type DraftSystem = z.infer<typeof draftSystemSchema>;
export type DraftQuestion = z.infer<typeof sessionZeroQuestionSchema>;
export type SystemDraftDto = z.infer<typeof systemDraftSchema>;
