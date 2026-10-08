import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { JourneysService } from '../../journeys/journeys.service.js';
import type { StructureField } from '../../structures/structure-field.js';
import { ACTOR } from '../../structures/structures.schema.js';
import { StructuresService } from '../../structures/structures.service.js';
import { AgentRunner } from '../agent-runner.js';
import { type AiCredentials, AiService } from '../ai.service.js';
import { layoutFields } from '../field-layout.js';
import {
  describeFields,
  describeJourney,
  fillableFields,
} from '../journey-context.js';

export interface CharacterDraft {
  name: string;
  fields: StructureField[];
  values: Record<string, unknown>;
}

const PROMPT = [
  'You create the player character for a solo tabletop RPG played in Vantage.',
  'The character must fit the world and the rule system of the journey.',
  'Follow the player concept when there is one. Otherwise invent a compelling one.',
  'Numbers must be balanced for a starting character.',
  'Write in the language of the journey.',
].join('\n');

const DESIGN_PROMPT =
  'The sheet has no fields yet. Create the basic ones: 3 to 6 numeric attributes that fit the system, hit points or an equivalent as progress, a short concept and a background as long text. Add a choice field (class, role, origin) only when it fits.';

const FILL_PROMPT = 'Fill every field of the sheet.';

const label = z.string().min(1);
const progress = z.object({ current: z.number(), max: z.number() });

const designedField = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), label, value: z.number() }),
  z.object({ type: z.literal('progress'), label, value: progress }),
  z.object({ type: z.literal('short-text'), label, value: z.string() }),
  z.object({ type: z.literal('long-text'), label, value: z.string() }),
  z
    .object({
      type: z.literal('choice'),
      label,
      options: z.array(z.string().min(1)).min(2),
      value: z.string(),
    })
    .refine((field) => field.options.includes(field.value), {
      message: 'The value must be one of the options.',
      path: ['value'],
    }),
]);

const DESIGN_OUTPUT = {
  name: 'submit_character',
  description: 'Submits the character with the fields of its sheet.',
  input: z.object({
    name: label,
    fields: z.array(designedField).min(3).max(12),
  }),
};

@Injectable()
export class CharacterDraftFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly journeysService: JourneysService,
    private readonly structuresService: StructuresService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    journeyId: string,
    concept: string | undefined,
  ): Promise<CharacterDraft> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const [credentials, journey, structures] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.journeysService.findOne(userId, journeyId),
      this.structuresService.findAll(userId, journeyId),
    ]);

    const actors = structures.find(
      (structure) => structure.capability === ACTOR,
    );

    if (!actors) {
      throw new BadRequestException({
        code: 'ACTORS_MISSING',
        message: 'Mark a structure as Actors first.',
      });
    }

    const context = [
      describeJourney(journey, structures),
      `Player concept: ${concept || 'none, invent one'}`,
    ].join('\n\n');
    const fillable = fillableFields(actors.fields);

    return fillable.length > 0
      ? this.fill(credentials, context, fillable)
      : this.design(credentials, context, actors.fields);
  }

  private async fill(
    credentials: AiCredentials,
    context: string,
    fields: StructureField[],
  ): Promise<CharacterDraft> {
    const keyed = keysOf(fields);
    const result = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: `${PROMPT}\n${FILL_PROMPT}` },
        {
          role: 'user',
          content: `${context}\n\nSheet fields: ${describeFields(fields)}`,
        },
      ],
      {
        name: 'submit_character',
        description: 'Submits the character with a value for every field.',
        input: z.object({
          name: label,
          values: z.object(
            Object.fromEntries(
              [...keyed].map(([key, field]) => [
                key,
                valueSchemaOf(field).describe(field.label),
              ]),
            ),
          ),
        }),
      },
    );

    return {
      name: result.name,
      fields: [],
      values: Object.fromEntries(
        [...keyed].map(([key, field]) => [field.id, result.values[key]]),
      ),
    };
  }

  private async design(
    credentials: AiCredentials,
    context: string,
    existing: StructureField[],
  ): Promise<CharacterDraft> {
    const result = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: `${PROMPT}\n${DESIGN_PROMPT}` },
        { role: 'user', content: context },
      ],
      DESIGN_OUTPUT,
    );
    const fields = layoutFields(
      existing,
      result.fields.map((field) => ({
        type: field.type,
        label: field.label,
        options: field.type === 'choice' ? field.options : [],
      })),
    );

    return {
      name: result.name,
      fields,
      values: Object.fromEntries(
        fields.map((field, index) => [field.id, result.fields[index].value]),
      ),
    };
  }
}

function valueSchemaOf(field: StructureField): z.ZodType {
  const option =
    field.options.length > 0 ? z.enum(field.options) : z.string();

  switch (field.type) {
    case 'number':
      return z.number();
    case 'progress':
      return progress;
    case 'toggle':
      return z.boolean();
    case 'choice':
      return option;
    case 'boxes':
      return z.array(option);
    default:
      return z.string();
  }
}

function keysOf(fields: StructureField[]): Map<string, StructureField> {
  const keyed = new Map<string, StructureField>();

  for (const field of fields) {
    const base = slugOf(field.label) || 'field';
    let key = base;

    for (let suffix = 2; keyed.has(key); suffix++) {
      key = `${base}_${suffix}`;
    }

    keyed.set(key, field);
  }

  return keyed;
}

function slugOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
