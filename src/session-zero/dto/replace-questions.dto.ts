import { z } from 'zod';
import { SESSION_ZERO_FORMATS } from '../session-zero.schema.js';

export const SESSION_ZERO_OPTIONS = 6;

const CHOICE_FORMATS: readonly string[] = ['single', 'multiple'];

export const sessionZeroQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(200),
    format: z.enum(SESSION_ZERO_FORMATS).default('text'),
    options: z
      .array(z.string().trim().min(1).max(120))
      .max(SESSION_ZERO_OPTIONS)
      .default([]),
    min: z.number().int().nullable().default(null),
    max: z.number().int().nullable().default(null),
    reword: z.boolean().default(true),
    details: z.record(z.string(), z.string().trim().max(120)).default({}),
  })
  .refine(
    (question) =>
      !CHOICE_FORMATS.includes(question.format) || question.options.length >= 2,
    { message: 'Choices need at least two options.', path: ['options'] },
  )
  .refine(
    (question) =>
      question.min === null || question.max === null || question.min < question.max,
    { message: 'The minimum must be below the maximum.', path: ['min'] },
  );

export const replaceQuestionsSchema = z.object({
  questions: z.array(sessionZeroQuestionSchema),
});

export type SessionZeroQuestionDto = z.infer<typeof sessionZeroQuestionSchema>;
export type ReplaceQuestionsDto = z.infer<typeof replaceQuestionsSchema>;
