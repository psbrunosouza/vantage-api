import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { StructureField } from '../../structures/structure-field.js';
import { isActorStructure } from '../../tags/actors.js';
import { AgentRunner } from '../agent-runner.js';
import { type AiCredentials, AiService } from '../ai.service.js';
import {
  keysOf,
  progressSchema,
  valuesById,
  valuesSchemaOf,
} from '../field-values.js';
import { layoutFields } from '../field-layout.js';
import {
  describeFields,
  describeSystem,
  fillableFields,
} from '../system-context.js';
import type { WorldSource } from '../world-source.js';

export interface CharacterDraft {
  name: string;
  fields: StructureField[];
  values: Record<string, unknown>;
}

const PROMPT = [
  'You create the player character for a solo tabletop RPG played in Vantage.',
  'The character must fit the world and the rule system of the system.',
  'Follow the player concept when there is one. Otherwise invent a compelling one.',
  'Numbers must be balanced for a starting character.',
  'Write in the language of the system.',
].join('\n');

const DESIGN_PROMPT =
  'The sheet has no fields yet. Create the basic ones: 3 to 6 numeric attributes that fit the system, hit points or an equivalent as progress, a short concept and a background as long text. Add a choice field (class, role, origin) only when it fits.';

const FILL_PROMPT = 'Fill every field of the sheet.';

const label = z.string().min(1);

const designedField = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), label, value: z.number() }),
  z.object({ type: z.literal('progress'), label, value: progressSchema }),
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
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    concept: string | undefined,
  ): Promise<CharacterDraft> {
    const [credentials, system, structures, fieldTags] = await Promise.all([
      this.aiService.credentialsOf(userId),
      source.system(),
      source.structures(),
      source.fieldTags(),
    ]);

    const actors = structures.find(isActorStructure);

    if (!actors) {
      throw new BadRequestException({
        code: 'ACTORS_MISSING',
        message: 'Tag a structure as Actors first.',
      });
    }

    const context = [
      describeSystem(system, structures, fieldTags),
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
          values: valuesSchemaOf(keyed),
        }),
      },
    );

    return {
      name: result.name,
      fields: [],
      values: valuesById(keyed, result.values),
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
