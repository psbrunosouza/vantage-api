import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Resource } from '../../resources/resources.schema.js';
import type { StructureField } from '../../structures/structure-field.js';
import { isActorStructure } from '../../tags/actors.js';
import { AgentRunner } from '../agent-runner.js';
import { type AiCredentials, AiService } from '../ai.service.js';
import type { PopulationDto } from '../dto/population.dto.js';
import { keysOf, valuesById, valuesSchemaOf } from '../field-values.js';
import {
  describeCampaign,
  describeFields,
  describeJourney,
  fillableFields,
} from '../journey-context.js';
import type {
  WorldFieldTag,
  WorldResource,
  WorldSource,
  WorldStructure,
} from '../world-source.js';

const RECORDS = 4;
const REQUESTED = 8;
const HOOKS = 3;

const PROMPT = [
  'You populate the world of a solo tabletop RPG played in Vantage.',
  'A record is one sheet of a structure: a named character, group, place, item or document of the world.',
  'Records must come from the campaign and fit the other records of the journey. Mention names that the campaign already gives.',
  'Make them concrete: players must be able to visit, fight, steal, talk to or use each one.',
  'Never repeat a record that already exists. Never create player characters.',
  'Fill every field. Numbers must be balanced for the start of the campaign.',
  'Write in the language of the journey.',
].join('\n');

const HOOKS_PROMPT = [
  'You write loose story hooks for a tabletop RPG played in Vantage.',
  `Write ${HOOKS} hooks. Each one is a short question or rumor, at most 20 words, that ties two or more records together and gives the players something to chase.`,
  'List the exact names of the records each hook mentions.',
  'Write in the language of the journey.',
].join('\n');

export interface Hook {
  text: string;
  names: string[];
}

export interface Population {
  resources: WorldResource[];
  hooks: Hook[];
}

interface RecordDraft {
  structure: WorldStructure;
  name: string;
  values: Record<string, unknown>;
}

interface Keyed {
  structure: WorldStructure;
  keyed: Map<string, StructureField>;
}

export function worldOf(structures: readonly WorldStructure[]): WorldStructure[] {
  const players = structures.find(isActorStructure);
  return structures.filter((structure) => structure.id !== players?.id);
}

export function populationTargets(
  structures: readonly WorldStructure[],
  resources: readonly Pick<Resource, 'structureId'>[],
): WorldStructure[] {
  const filled = new Set(resources.map((resource) => resource.structureId));
  return worldOf(structures).filter((structure) => !filled.has(structure.id));
}

export function replacements(
  world: readonly WorldStructure[],
  resources: readonly Pick<Resource, 'id' | 'structureId'>[],
  ids: readonly string[],
): { structure: WorldStructure; count: number; ids: string[] }[] {
  return world.flatMap((structure) => {
    const replaced = resources
      .filter(
        (resource) =>
          resource.structureId === structure.id && ids.includes(resource.id),
      )
      .map((resource) => resource.id);

    return replaced.length > 0
      ? [{ structure, count: replaced.length, ids: replaced }]
      : [];
  });
}

@Injectable()
export class PopulationFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    dto: PopulationDto,
  ): Promise<Population> {
    const [credentials, journey, campaign, structures, resources, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId),
        source.journey(),
        source.campaign(),
        source.structures(),
        source.resources(),
        source.fieldTags(),
      ]);

    const world = worldOf(structures);
    const context = [
      describeJourney(journey, structures, fieldTags),
      campaign ? describeCampaign(campaign) : null,
      describeRecords(world, resources),
    ]
      .filter((part) => part !== null)
      .join('\n\n');

    const replaced = dto.request
      ? []
      : replacements(world, resources, dto.replace);
    const drafts = dto.request
      ? await this.request(credentials, context, world, fieldTags, dto.request)
      : (
          await Promise.all(
            (replaced.length > 0
              ? replaced
              : populationTargets(structures, resources).map((structure) => ({
                  structure,
                  count: RECORDS,
                }))
            ).map(({ structure, count }) =>
              this.draft(credentials, context, structure, fieldTags, count),
            ),
          )
        ).flat();

    const saved = await source.replaceResources(
      replaced.flatMap(({ ids }) => ids),
      drafts.map((draft) => ({
        structureId: draft.structure.id,
        name: draft.name,
        values: draft.values,
      })),
    );

    const worldIds = new Set(world.map((structure) => structure.id));
    const current = saved.filter((resource) =>
      worldIds.has(resource.structureId),
    );

    return {
      resources: current,
      hooks: await this.hooks(credentials, context, world, current),
    };
  }

  private async draft(
    credentials: AiCredentials,
    context: string,
    structure: WorldStructure,
    fieldTags: readonly WorldFieldTag[],
    count: number,
  ): Promise<RecordDraft[]> {
    const keyed = keysOf(fillableFields(structure.fields));
    const { records } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: `${PROMPT}\nCreate ${count} records.` },
        {
          role: 'user',
          content: [
            context,
            `Structure: ${structure.name}`,
            `Fields: ${describeFields(structure.fields, fieldTags)}`,
          ].join('\n\n'),
        },
      ],
      {
        name: 'submit_records',
        description: `Submits the records of ${structure.name} with a value for every field.`,
        input: z.object({
          records: z
            .array(
              z.object({
                name: z.string().min(1),
                values: valuesSchemaOf(keyed),
              }),
            )
            .min(1)
            .max(count),
        }),
      },
    );

    return records.map((record) => ({
      structure,
      name: record.name,
      values: valuesById(keyed, record.values),
    }));
  }

  private async request(
    credentials: AiCredentials,
    context: string,
    world: readonly WorldStructure[],
    fieldTags: readonly WorldFieldTag[],
    request: string,
  ): Promise<RecordDraft[]> {
    const labeled = new Map<string, Keyed>();

    for (const structure of world) {
      let label = structure.name;

      for (let suffix = 2; labeled.has(label); suffix++) {
        label = `${structure.name} ${suffix}`;
      }

      labeled.set(label, {
        structure,
        keyed: keysOf(fillableFields(structure.fields)),
      });
    }

    const options = [...labeled].map(([label, { keyed }]) =>
      z.object({
        structure: z.literal(label),
        name: z.string().min(1),
        values: valuesSchemaOf(keyed),
      }),
    );

    if (options.length === 0) {
      return [];
    }

    const { records } = await this.runner.submit(
      credentials,
      [
        {
          role: 'system',
          content: `${PROMPT}\nCreate what the game master asks, at most ${REQUESTED} records, and choose the structure of each one.`,
        },
        {
          role: 'user',
          content: [
            context,
            'Structures you can use:',
            ...[...labeled].map(
              ([label, { structure }]) =>
                `- ${label}: ${describeFields(structure.fields, fieldTags)}`,
            ),
            `Game master request: ${request}`,
          ].join('\n'),
        },
      ],
      {
        name: 'submit_records',
        description: 'Submits the requested records with a value for every field.',
        input: z.object({
          records: z
            .array(
              options.length === 1
                ? options[0]
                : z.discriminatedUnion('structure', [
                    options[0],
                    ...options.slice(1),
                  ]),
            )
            .min(1)
            .max(REQUESTED),
        }),
      },
    );

    return records.flatMap((record) => {
      const target = labeled.get(record.structure);

      return target
        ? [
            {
              structure: target.structure,
              name: record.name,
              values: valuesById(
                target.keyed,
                record.values as Record<string, unknown>,
              ),
            },
          ]
        : [];
    });
  }

  private async hooks(
    credentials: AiCredentials,
    context: string,
    world: readonly WorldStructure[],
    resources: readonly WorldResource[],
  ): Promise<Hook[]> {
    if (resources.length < 2) {
      return [];
    }

    const { hooks } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: HOOKS_PROMPT },
        {
          role: 'user',
          content: [context, describeRecords(world, resources)].join('\n\n'),
        },
      ],
      {
        name: 'submit_hooks',
        description: 'Submits the loose story hooks.',
        input: z.object({
          hooks: z
            .array(
              z.object({
                text: z.string().min(1),
                names: z.array(z.string().min(1)),
              }),
            )
            .min(1)
            .max(HOOKS),
        }),
      },
    );
    const names = new Set(resources.map((resource) => resource.name));

    return hooks.map((hook) => ({
      text: hook.text,
      names: hook.names.filter((name) => names.has(name)),
    }));
  }
}

function describeRecords(
  world: readonly WorldStructure[],
  resources: readonly Pick<Resource, 'name' | 'structureId'>[],
): string {
  const lines = world.flatMap((structure) =>
    resources
      .filter((resource) => resource.structureId === structure.id)
      .map((resource) => `- ${resource.name} (${structure.name})`),
  );

  return lines.length > 0
    ? ['Records that already exist:', ...lines].join('\n')
    : 'No records yet.';
}
