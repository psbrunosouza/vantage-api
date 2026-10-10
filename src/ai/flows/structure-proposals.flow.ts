import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { StructureField } from '../../structures/structure-field.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { AI_FIELD_SIZES, layoutFields } from '../field-layout.js';
import { describeCampaign } from '../journey-context.js';
import type { StructureProposalsDto } from '../dto/structure-proposals.dto.js';
import type { WorldSource } from '../world-source.js';
import { STRUCTURE_ICONS } from './system-options.flow.js';

const STRUCTURES = 6;

const PROMPT = [
  'You design the data model of a solo tabletop RPG played in Vantage.',
  `Propose ${STRUCTURES} structures built from the campaign and its themes. A structure groups sheets of one kind, such as crew, places, factions, items or documents. Each name is a plural noun of one or two words.`,
  'The first structure holds the player characters and has the atores tag. Name it after who the players are in this world, such as crew, party or squad.',
  'When the journey lists suggested structures, prefer them and complete the set.',
  'Give each structure one or more structure tags from the list, using their slugs. The description of a tag says what it means for the game master.',
  'Give each structure four to eight fields. A field has a label, a type and, when it fits, one or more field tags from the list, using their slugs. A choice field also lists its options.',
  'Use progress for meters such as health or pressure. Never propose relations to other structures.',
  'Write names, labels and options in Brazilian Portuguese.',
].join('\n');

const FIELD_TYPES = Object.keys(AI_FIELD_SIZES) as [
  keyof typeof AI_FIELD_SIZES,
  ...(keyof typeof AI_FIELD_SIZES)[],
];

const proposalSchema = z.object({
  name: z.string().min(1),
  icon: z.enum(STRUCTURE_ICONS),
  tags: z.array(z.string()),
  fields: z
    .array(
      z.object({
        type: z.enum(FIELD_TYPES),
        label: z.string().min(1),
        tags: z.array(z.string()),
        options: z.array(z.string()),
      }),
    )
    .min(1),
});

const OUTPUT = {
  name: 'submit_structures',
  description: 'Submits the proposed structures.',
  input: z.object({ structures: z.array(proposalSchema).min(1) }),
};

export interface StructureProposal {
  name: string;
  icon: string;
  tagIds: string[];
  fields: StructureField[];
}

@Injectable()
export class StructureProposalsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    dto: StructureProposalsDto,
  ): Promise<StructureProposal[]> {
    const [credentials, journey, campaign, structureTags, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId),
        source.journey(),
        source.campaign(),
        source.structureTags(),
        source.fieldTags(),
      ]);

    const listing = (tags: readonly { slug: string; description: string }[]) =>
      tags.map((tag) => `- ${tag.slug}: ${tag.description}`).join('\n');

    const { structures } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            `Journey: ${journey.name}`,
            `Campaign pitch: ${journey.description ?? 'none'}`,
            `Themes: ${dto.themes.join(', ') || 'none'}`,
            campaign ? describeCampaign(campaign) : null,
            dto.structures.length > 0
              ? `Suggested structures: ${dto.structures.join(', ')}`
              : null,
            `Structure tags:\n${listing(structureTags)}`,
            `Field tags:\n${listing(fieldTags)}`,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );

    const idsOf = (
      tags: readonly { id: string; slug: string }[],
      slugs: readonly string[],
    ) => tags.filter((tag) => slugs.includes(tag.slug)).map((tag) => tag.id);

    return structures.map((structure) => ({
      name: structure.name,
      icon: structure.icon,
      tagIds: idsOf(structureTags, structure.tags),
      fields: layoutFields([], structure.fields).map((field, index) => ({
        ...field,
        tagIds: idsOf(fieldTags, structure.fields[index].tags),
      })),
    }));
  }
}
