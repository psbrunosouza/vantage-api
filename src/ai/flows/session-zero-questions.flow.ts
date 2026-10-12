import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  SESSION_ZERO_OPTIONS,
  type SessionZeroQuestionDto,
} from '../../session-zero/dto/replace-questions.dto.js';
import { isActorStructure } from '../../tags/actors.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import {
  describeCampaign,
  describeFields,
  describeSystem,
} from '../system-context.js';
import type { WorldSource } from '../world-source.js';
import { worldOf } from './population.flow.js';

const QUESTIONS = { min: 3, max: 6 };

const PROMPT = [
  'You prepare the session zero of a tabletop RPG played in Vantage.',
  `Write ${QUESTIONS.min} to ${QUESTIONS.max} questions that every new player answers while discovering their character, before the sheet exists.`,
  'Ask indirectly, through a short situation of the campaign, never as a form. Never presume who the character is.',
  'Between them, the questions uncover the name, the background, the personality and the appearance of the character.',
  `A single question has 2 to ${SESSION_ZERO_OPTIONS} options and the player picks one. A multiple question has 2 to ${SESSION_ZERO_OPTIONS} options and the player picks any. Give each option a short meaning of at most six words.`,
  'A text question is answered in the player own words. A number question has a minimum and a maximum.',
  'Players can always answer in their own words, so options are suggestions, not limits.',
  'Questions are short and in the second person.',
  'Write in the language of the system.',
].join('\n');

const option = z.object({
  option: z.string().min(1).max(120),
  meaning: z.string().max(120),
});

const draftSchema = z.union([
  z.object({
    format: z.enum(['single', 'multiple']),
    prompt: z.string().min(1).max(200),
    options: z.array(option).min(2).max(SESSION_ZERO_OPTIONS),
  }),
  z.object({
    format: z.literal('text'),
    prompt: z.string().min(1).max(200),
  }),
  z.object({
    format: z.literal('number'),
    prompt: z.string().min(1).max(200),
    min: z.number().int(),
    max: z.number().int(),
  }),
]);

export type QuestionDraft = z.infer<typeof draftSchema>;

export function questionOf(draft: QuestionDraft): SessionZeroQuestionDto {
  const options = 'options' in draft ? draft.options : [];
  const limits =
    'min' in draft && draft.min < draft.max
      ? { min: draft.min, max: draft.max }
      : { min: null, max: null };

  return {
    prompt: draft.prompt,
    format: draft.format,
    options: options.map(({ option: name }) => name),
    ...limits,
    reword: true,
    details: Object.fromEntries(
      options.map(({ option: name, meaning }) => [name, meaning]),
    ),
  };
}

@Injectable()
export class SessionZeroQuestionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    signal?: AbortSignal,
  ): Promise<SessionZeroQuestionDto[]> {
    const [credentials, system, campaign, structures, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId, signal),
        source.system(),
        source.campaign(),
        source.structures(),
        source.fieldTags(),
      ]);

    const actors = structures.find(isActorStructure);
    const world = worldOf(structures).map((structure) => structure.name);

    const { questions } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            describeSystem(system, structures, fieldTags),
            campaign ? describeCampaign(campaign) : null,
            actors
              ? `Player characters become sheets of ${actors.name} with these fields: ${describeFields(actors.fields, fieldTags)}`
              : null,
            world.length > 0
              ? `World structures the questions can touch: ${world.join(', ')}`
              : null,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      {
        name: 'submit_questions',
        description: 'Submits the session zero questions.',
        input: z.object({
          questions: z
            .array(draftSchema)
            .min(QUESTIONS.min)
            .max(QUESTIONS.max),
        }),
      },
    );

    return questions.map(questionOf);
  }
}
