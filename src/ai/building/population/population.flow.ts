import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Resource } from '../../../model/resources/resources.schema.js';
import type { StructureField } from '../../../model/structures/structure-field.js';
import { isActorStructure } from '../../../model/tags/actors.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { type AiCredentials, AiService } from '../../settings/ai.service.js';
import type { PopulationDto } from './population.dto.js';
import {
  keysOf,
  valuesById,
  valuesSchemaOf,
} from '../../context/field-values.js';
import {
  describeCampaign,
  describeFields,
  describeSystem,
  describeValues,
  fillableFields,
} from '../../context/describe.js';
import type {
  NewResource,
  WorldFieldTag,
  WorldResource,
  WorldSource,
  WorldStructure,
} from '../../context/world-source.js';
import { PROMPT } from './population.prompt.js';
import { describeProfile } from '../../context/genre-kits.js';

const RECORDS = { min: 2, max: 3 };
const REQUESTED = 4;

export interface Population {
  resources: WorldResource[];
}

interface RecordDraft {
  structure: WorldStructure;
  name: string;
  values: Record<string, unknown>;
}

interface RecordRange {
  min: number;
  max: number;
}

interface Keyed {
  structure: WorldStructure;
  keyed: Map<string, StructureField>;
}

export function worldOf(
  structures: readonly WorldStructure[],
): WorldStructure[] {
  const players = structures.find(isActorStructure);
  return structures.filter((structure) => structure.id !== players?.id);
}

export function populationTargets(
  structures: readonly WorldStructure[],
  resources: readonly Pick<Resource, 'structureId'>[],
): WorldStructure[] {
  const filled = new Set(resources.map((resource) => resource.structureId));
  return structures.filter((structure) => !filled.has(structure.id));
}

export function replacements(
  world: readonly WorldStructure[],
  resources: readonly WorldResource[],
  ids: readonly string[],
): { structure: WorldStructure; count: number; ids: string[] }[] {
  return world.flatMap((structure) => {
    const replaced = resources.filter(
      (resource) =>
        resource.structureId === structure.id && ids.includes(resource.id),
    );

    return replaced.length > 0
      ? [
          {
            structure,
            count: replaced.length,
            ids: replaced.map((resource) => resource.id),
          },
        ]
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
    onRecords: (records: NewResource[]) => void,
    signal?: AbortSignal,
  ): Promise<Population> {
    const [
      credentials,
      system,
      profile,
      campaign,
      structures,
      resources,
      fieldTags,
    ] = await Promise.all([
      this.aiService.credentialsOf(userId, signal),
      source.system(),
      source.profile(),
      source.campaign(),
      source.structures(),
      source.resources(),
      source.fieldTags(),
    ]);

    const context = [
      describeSystem(system, structures, fieldTags),
      describeProfile(profile),
      campaign ? describeCampaign(campaign) : null,
      describeRecords(structures, resources),
    ]
      .filter((part) => part !== null)
      .join('\n\n');

    const replaced = dto.request
      ? []
      : replacements(structures, resources, dto.replace);
    const targets: {
      structure: WorldStructure;
      count: number | RecordRange;
    }[] =
      replaced.length > 0
        ? replaced
        : populationTargets(structures, resources).map((structure) => ({
            structure,
            count: RECORDS,
          }));
    const created: NewResource[] = [];
    const receive = (drafts: readonly RecordDraft[]) => {
      const records = drafts.map((draft) => ({
        id: randomUUID(),
        structureId: draft.structure.id,
        name: draft.name,
        values: draft.values,
      }));

      created.push(...records);
      onRecords(records);
    };

    if (dto.request) {
      receive(
        await this.request(
          credentials,
          context,
          structures,
          fieldTags,
          dto.request,
        ),
      );
    } else {
      await Promise.all(
        targets.map(async ({ structure, count }) =>
          receive(
            await this.draft(credentials, context, structure, fieldTags, count),
          ),
        ),
      );
    }

    const removed = replaced.flatMap(({ ids }) => ids);

    signal?.throwIfAborted();

    return {
      resources: await source.replaceResources(removed, created),
    };
  }

  private async draft(
    credentials: AiCredentials,
    context: string,
    structure: WorldStructure,
    fieldTags: readonly WorldFieldTag[],
    count: number | RecordRange,
  ): Promise<RecordDraft[]> {
    const { min, max } =
      typeof count === 'number' ? { min: count, max: count } : count;
    const amount = min === max ? `${min}` : `between ${min} and ${max}`;
    const keyed = keysOf(fillableFields(structure.fields));
    const { records } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: `${PROMPT}\nCreate ${amount} records.` },
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
            .max(max),
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
        description:
          'Submits the requested records with a value for every field.',
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
}

export function describeRecords(
  world: readonly WorldStructure[],
  resources: readonly Pick<WorldResource, 'name' | 'structureId' | 'values'>[],
): string {
  const lines = world.flatMap((structure) =>
    resources
      .filter((resource) => resource.structureId === structure.id)
      .map((resource) => {
        const header = `- ${resource.name} (${structure.name})`;
        const values = describeValues(structure.fields, resource.values);

        return values
          ? `${header}
${values.replace(/^/gm, '  ')}`
          : header;
      }),
  );

  return lines.length > 0
    ? ['Records that already exist:', ...lines].join('\n')
    : 'No records yet.';
}
