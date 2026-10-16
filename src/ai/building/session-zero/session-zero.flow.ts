import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  SESSION_ZERO_OPTIONS,
  SESSION_ZERO_PROMPT,
  type SessionZeroQuestionDto,
} from '../../../story/session-zero/dto/replace-questions.dto.js';
import { isActorStructure } from '../../../model/tags/actors.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { AiService } from '../../settings/ai.service.js';
import {
  describeCampaign,
  describeFields,
  describeSystem,
} from '../../context/describe.js';
import type { WorldSource } from '../../context/world-source.js';
import { worldOf } from '../population/population.flow.js';
import { QUESTIONS, PROMPT } from './session-zero.prompt.js';
import { describeProfile } from '../../context/genre-kits.js';

const title = z
  .string()
  .min(1)
  .max(SESSION_ZERO_PROMPT)
  .describe(`Question title, at most ${SESSION_ZERO_PROMPT} characters.`);

const option = z.object({
  option: z.string().min(1).max(120),
  meaning: z.string().max(120),
});

const draftSchema = z.union([
  z.object({
    format: z.enum(['single', 'multiple']),
    prompt: title,
    options: z.array(option).min(2).max(SESSION_ZERO_OPTIONS),
  }),
  z.object({
    format: z.literal('text'),
    prompt: title,
  }),
  z.object({
    format: z.literal('number'),
    prompt: title,
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
export class SessionZeroFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    onQuestion: (question: SessionZeroQuestionDto) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const [credentials, system, profile, campaign, structures, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId, signal),
        source.system(),
        source.profile(),
        source.campaign(),
        source.structures(),
        source.fieldTags(),
      ]);

    const actors = structures.find(isActorStructure);
    const world = worldOf(structures).map((structure) => structure.name);

    let sent = 0;

    await this.runner.submitEach(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            describeSystem(system, structures, fieldTags),
            describeProfile(profile),
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
          questions: z.array(draftSchema).min(QUESTIONS.min).max(QUESTIONS.max),
        }),
      },
      draftSchema,
      (draft) => {
        if (sent < QUESTIONS.max) {
          sent++;
          onQuestion(questionOf(draft));
        }
      },
    );
  }
}
