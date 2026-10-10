import { z } from 'zod';
import { SESSION_ZERO_KINDS } from '../session-zero.schema.js';

export const sessionZeroQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(200),
  kind: z.enum(SESSION_ZERO_KINDS),
  structureId: z.uuid().nullable().default(null),
  fieldId: z.string().min(1).nullable().default(null),
  sourceStructureId: z.uuid().nullable().default(null),
  details: z.record(z.string(), z.string().trim().max(120)).default({}),
});

export const replaceQuestionsSchema = z.object({
  questions: z.array(sessionZeroQuestionSchema).max(20),
});

export type SessionZeroQuestionDto = z.infer<typeof sessionZeroQuestionSchema>;
export type ReplaceQuestionsDto = z.infer<typeof replaceQuestionsSchema>;
