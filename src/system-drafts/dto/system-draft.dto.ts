import { z } from 'zod';
import { systemOptionSchema } from '../../ai/flows/system-options.flow.js';
import { createJourneySchema } from '../../journeys/dto/create-journey.dto.js';
import { createCharacterSchema } from '../../resources/dto/create-character.dto.js';
import { sessionZeroQuestionSchema } from '../../session-zero/dto/replace-questions.dto.js';
import { createStructureSchema } from '../../structures/dto/create-structure.dto.js';
import { createTagSchema } from '../../tags/dto/create-tag.dto.js';

export const draftSystemSchema = createJourneySchema.partial();

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

export const draftHookSchema = z.object({
  text: z.string().min(1),
  names: z.array(z.string()),
});

export const draftWorldSchema = z.object({
  structures: z.array(draftStructureSchema),
  resources: z.array(draftResourceSchema),
  hooks: z.array(draftHookSchema),
});

export const draftOptionSchema = z.object({
  option: systemOptionSchema,
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
    hooks: z.array(draftHookSchema),
    questions: z.array(sessionZeroQuestionSchema).max(20),
    character: createCharacterSchema.nullable(),
  })
  .partial();

export type DraftTag = z.infer<typeof draftTagSchema>;
export type DraftStructure = z.infer<typeof draftStructureSchema>;
export type DraftResource = z.infer<typeof draftResourceSchema>;
export type DraftHook = z.infer<typeof draftHookSchema>;
export type DraftWorld = z.infer<typeof draftWorldSchema>;
export type DraftOption = z.infer<typeof draftOptionSchema>;
export type DraftSystem = z.infer<typeof draftSystemSchema>;
export type DraftQuestion = z.infer<typeof sessionZeroQuestionSchema>;
export type DraftCharacter = z.infer<typeof createCharacterSchema>;
export type SystemDraftDto = z.infer<typeof systemDraftSchema>;
