import { describe, expect, it } from 'vitest';
import type { StructureField } from '../../structures/structure-field.js';
import type { StructureView } from '../../structures/structure-view.js';
import type { StructureTag } from '../../tags/structure-tags.schema.js';
import type { AgentRunner } from '../agent-runner.js';
import type { AiService } from '../ai.service.js';
import type {
  NewResource,
  WorldResource,
  WorldSource,
  WorldStructure,
} from '../world-source.js';
import {
  PopulationFlow,
  describeRecords,
  populationTargets,
  replacements,
} from './population.flow.js';

const ACTORS = { systemId: null, slug: 'atores' } as StructureTag;
const PLACES = { systemId: null, slug: 'locais' } as StructureTag;

function structure(
  id: string,
  tags: StructureTag[],
  fields: StructureField[] = [],
): StructureView {
  return { id, name: id, tags, fields } as unknown as StructureView;
}

function record(
  id: string,
  structureId: string,
  aiNote: string | null = null,
  values: WorldResource['values'] = {},
): WorldResource {
  return { id, structureId, name: id, values, aiNote };
}

describe('populationTargets', () => {
  const crew = structure('crew', [ACTORS]);
  const figures = structure('figures', [ACTORS]);
  const districts = structure('districts', [PLACES]);

  it('targets every structure, the player characters included', () => {
    expect(
      populationTargets([crew, figures, districts], []).map(({ id }) => id),
    ).toEqual(['crew', 'figures', 'districts']);
  });

  it('skips structures that already have records', () => {
    expect(
      populationTargets(
        [crew, figures, districts],
        [{ structureId: 'districts' }],
      ).map(({ id }) => id),
    ).toEqual(['crew', 'figures']);
  });

  it('groups the replaced records by structure, outside the players', () => {
    const resources = [
      record('kaya', 'crew'),
      record('ilse', 'figures'),
      record('orin', 'figures'),
      record('tower', 'districts'),
    ];

    expect(
      replacements([figures, districts], resources, ['kaya', 'ilse', 'orin']).map(
        ({ structure, count, ids }) => [structure.id, count, ids],
      ),
    ).toEqual([['figures', 2, ['ilse', 'orin']]]);
  });

  it('carries the oracle notes of the replaced records', () => {
    const resources = [
      record('ilse', 'figures', 'Trai o grupo no fim'),
      record('orin', 'figures'),
    ];

    expect(
      replacements([figures], resources, ['ilse', 'orin']).map(
        ({ notes }) => notes,
      ),
    ).toEqual([['ilse: Trai o grupo no fim']]);
  });

  it('lists the existing records with their notes', () => {
    expect(
      describeRecords(
        [figures, districts],
        [record('ilse', 'figures', 'Trai o grupo no fim'), record('tower', 'districts')],
      ),
    ).toBe(
      'Records that already exist:\n- ilse (figures): Trai o grupo no fim\n- tower (districts)',
    );
  });

  it('lists the values of the existing records, such as their relationships', () => {
    const description: StructureField = {
      id: 'description',
      type: 'long-text',
      label: 'Descrição',
      options: [],
      column: 1,
      row: 1,
      span: 3,
      rows: 2,
    };
    const kings = structure('kings', [], [description]);

    expect(
      describeRecords(
        [kings],
        [
          record('ivan', 'kings', null, {
            description: 'Odeia Boris e quer a coroa dele',
          }),
        ],
      ),
    ).toBe(
      'Records that already exist:\n- ivan (kings)\n  Descrição: Odeia Boris e quer a coroa dele',
    );
  });
});

describe('PopulationFlow.run', () => {
  const places = {
    id: 'places',
    name: 'Places',
    icon: 'map',
    color: null,
    fields: [],
    aiNote: null,
    tags: [],
  } as unknown as WorldStructure;

  function populate(onHooks: () => void) {
    const saved: {
      removed: readonly string[];
      created: readonly NewResource[];
    }[] = [];
    const hooked: string[] = [];
    const aiService = {
      credentialsOf: async (_userId: string, signal?: AbortSignal) => ({
        apiKey: 'key',
        model: 'model',
        signal,
      }),
    } as unknown as AiService;
    const runner = {
      submit: async (
        _credentials: unknown,
        messages: { content: string }[],
        output: { name: string },
      ) => {
        if (output.name === 'submit_hooks') {
          hooked.push(messages[1].content);
          onHooks();
          return {
            hooks: [{ text: 'A storm hides the port', names: ['Porto'] }],
          };
        }

        return {
          records: [
            { name: 'Porto', values: {} },
            { name: 'Ilha', values: {} },
          ],
        };
      },
    } as unknown as AgentRunner;
    const source = {
      system: async () => ({ name: 'Mar', description: null, mainDie: null }),
      campaign: async () => null,
      structures: async () => [places],
      resources: async () => [],
      fieldTags: async () => [],
      replaceResources: async (
        removed: readonly string[],
        created: readonly NewResource[],
      ) => {
        saved.push({ removed, created });
        return created.map((resource, index) => ({
          id: `record-${index}`,
          ...resource,
        }));
      },
    } as unknown as WorldSource;

    return {
      flow: new PopulationFlow(aiService, runner),
      source,
      saved,
      hooked,
    };
  }

  it('saves the new records with hooks about them', async () => {
    const { flow, source, saved, hooked } = populate(() => undefined);

    const population = await flow.run('user', source, { replace: [] });

    expect(saved).toHaveLength(1);
    expect(saved[0].created.map((resource) => resource.name)).toEqual([
      'Porto',
      'Ilha',
    ]);
    expect(hooked[0]).toContain('- Porto (Places)');
    expect(population.resources.map((resource) => resource.id)).toEqual([
      'record-0',
      'record-1',
    ]);
    expect(population.hooks).toEqual([
      { text: 'A storm hides the port', names: ['Porto'] },
    ]);
  });

  it('keeps the world untouched when the client leaves before saving', async () => {
    const controller = new AbortController();
    const { flow, source, saved } = populate(() => controller.abort());

    await expect(
      flow.run('user', source, { replace: [] }, controller.signal),
    ).rejects.toThrow();
    expect(saved).toEqual([]);
  });
});
