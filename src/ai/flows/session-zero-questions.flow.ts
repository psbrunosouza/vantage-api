import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CampaignsService } from '../../campaigns/campaigns.service.js';
import { JourneysService } from '../../journeys/journeys.service.js';
import type { SessionZeroQuestionDto } from '../../session-zero/dto/replace-questions.dto.js';
import type { StructureField } from '../../structures/structure-field.js';
import { StructuresService } from '../../structures/structures.service.js';
import { isActorStructure } from '../../tags/actors.js';
import { TagsService } from '../../tags/tags.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { keysOf } from '../field-values.js';
import {
  describeCampaign,
  describeFields,
  describeJourney,
} from '../journey-context.js';
import { worldOf } from './population.flow.js';

const QUESTIONS = { min: 3, max: 6 };
const ASKED_TYPES = ['choice', 'short-text', 'long-text', 'number'];
const TEXT_TYPES = ['short-text', 'long-text'];

const PROMPT = [
  'You prepare the session zero of a tabletop RPG played in Vantage.',
  `Write ${QUESTIONS.min} to ${QUESTIONS.max} questions that every invited player answers before joining. Each answer fills one field of the player character sheet.`,
  'A field question asks for the value of a field. For a choice field, give each option a short description of at most six words.',
  'A record question asks the player to pick a record of a world structure, such as the faction they owe. Its answer is written in a text field.',
  'A bond question asks which other player the character already knows. Its answer is written in a text field.',
  'Questions are short, in the second person, and make the player imagine a scene of the campaign.',
  'Never ask twice for the same field.',
  'Write in the language of the journey.',
].join('\n');

export function askableFields(fields: readonly StructureField[]): StructureField[] {
  return fields.filter((field) => ASKED_TYPES.includes(field.type));
}

@Injectable()
export class SessionZeroQuestionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly journeysService: JourneysService,
    private readonly campaignsService: CampaignsService,
    private readonly structuresService: StructuresService,
    private readonly tagsService: TagsService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    journeyId: string,
  ): Promise<SessionZeroQuestionDto[]> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [credentials, journey, campaign, structures, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId),
        this.journeysService.findOne(userId, journeyId),
        this.campaignsService.find(userId, journeyId),
        this.structuresService.findAll(userId, journeyId),
        this.tagsService.findFieldTags(userId, journeyId),
      ]);

    const actors = structures.find(isActorStructure);
    const asked = keysOf(askableFields(actors?.fields ?? []));

    if (!actors || asked.size === 0) {
      throw new BadRequestException({
        code: 'ACTOR_FIELDS_MISSING',
        message: 'The actors structure needs fields first.',
      });
    }

    const fieldKeys = [...asked.keys()] as [string, ...string[]];
    const textKeys = [...asked]
      .filter(([, field]) => TEXT_TYPES.includes(field.type))
      .map(([key]) => key);
    const sources = new Map(
      worldOf(structures).map((structure) => [structure.name, structure]),
    );
    const sourceNames = [...sources.keys()];

    const fieldQuestion = z.object({
      kind: z.literal('field'),
      prompt: z.string().min(1),
      field: z.enum(fieldKeys),
      options: z
        .array(z.object({ option: z.string(), description: z.string() }))
        .describe('Only for choice fields: one short description per option.'),
    });
    const textQuestions =
      textKeys.length > 0
        ? [
            z.object({
              kind: z.literal('bond'),
              prompt: z.string().min(1),
              field: z.enum(textKeys as [string, ...string[]]),
            }),
            ...(sourceNames.length > 0
              ? [
                  z.object({
                    kind: z.literal('record'),
                    prompt: z.string().min(1),
                    field: z.enum(textKeys as [string, ...string[]]),
                    source: z.enum(sourceNames as [string, ...string[]]),
                  }),
                ]
              : []),
          ]
        : [];
    const question =
      textQuestions.length > 0
        ? z.discriminatedUnion('kind', [fieldQuestion, ...textQuestions])
        : fieldQuestion;

    const { questions } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            describeJourney(journey, structures, fieldTags),
            campaign ? describeCampaign(campaign) : null,
            `Player sheet (${actors.name}) fields you can fill:\n${[...asked]
              .map(([key, field]) => `- ${key}: ${describeFields([field], fieldTags)}`)
              .join('\n')}`,
            sourceNames.length > 0
              ? `World structures for record questions: ${sourceNames.join(', ')}`
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
          questions: z.array(question).min(QUESTIONS.min).max(QUESTIONS.max),
        }),
      },
    );

    return questions.map((draft) => {
      const field = asked.get(draft.field);
      const options = 'options' in draft ? draft.options : [];
      const source =
        'source' in draft && typeof draft.source === 'string'
          ? sources.get(draft.source)
          : undefined;

      return {
        prompt: draft.prompt,
        kind: draft.kind,
        structureId: actors.id,
        fieldId: field?.id ?? null,
        sourceStructureId: source?.id ?? null,
        details: Object.fromEntries(
          options
            .filter(({ option }) => field?.options.includes(option))
            .map(({ option, description }) => [option, description]),
        ),
      };
    });
  }
}
