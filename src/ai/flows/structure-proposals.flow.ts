import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { StructureField } from '../../structures/structure-field.js';
import { ACTORS_SLUG } from '../../tags/actors.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { AI_FIELD_SIZES, layoutFields } from '../field-layout.js';
import { describeCampaign } from '../system-context.js';
import type { StructureProposalsDto } from '../dto/structure-proposals.dto.js';
import type { WorldSource } from '../world-source.js';
import { STRUCTURE_ICONS } from './campaign-options.flow.js';
import { POSSIBILITIES, REQUIRED } from './session-zero-questions.flow.js';

const MIN_STRUCTURES = 3;
const MAX_STRUCTURES = 4;
const MIN_FIELDS = 2;
const MAX_FIELDS = 4;
const MAX_ACTOR_FIELDS = 8;

const PROMPT = [
  'You design the data model of a solo tabletop RPG played in Vantage.',
  'Read the genre, era, technology and tone of the campaign first. Every structure, field and option must make sense inside that world.',
  `Propose between ${MIN_STRUCTURES} and ${MAX_STRUCTURES} structures built from the campaign and its themes: only the core ones the game needs to start, since the world grows during play. A structure groups sheets of one kind. Each name is a plural noun of one or two words.`,
  'The first structure holds the player characters and has the atores tag. Name it after who the players are in this world, such as crew, party or squad.',
  'Places, factions, items and documents are common kinds, but the world may need a kind no tag describes, such as rumors, spells, debts, mutations or rivals. Invent it when it gives the players something to chase, use or fear.',
  'Group places by scale, such as kingdoms, cities, districts, ships or dungeons, so that each sheet is one place the players can visit. Never group places by kind of building, such as churches or taverns. Use more than one place structure only when the campaign moves between scales.',
  'Items and equipment must exist in the era and technology of the world: no pistols in a medieval world. Items are utilities, such as consumables, tools, keys and supplies. Weapons, armor and clothing go in an equipment structure, only when combat or looks matter to the story.',
  'When the system lists suggested structures, prefer the most essential of them and skip the ones that break these rules.',
  'Give each structure the structure tags from the list that fit, using their slugs, or none when no tag fits. The description of a tag says what it means for the game master.',
  `Give each structure ${MIN_FIELDS} to ${MAX_FIELDS} fields, only the essential ones. The atores structure gets up to ${MAX_ACTOR_FIELDS}. A field has a label, a type and, when it fits, one or more field tags from the list, using their slugs. A choice field also lists its options.`,
  'Every sheet already has its own name: never propose a name field. Titles, nicknames and ranks go in a field with the titulo tag.',
  'Sheets relate to each other with friendship, alliance, neutrality, rivalry, hatred or prejudice. Give every structure whose sheets can relate, such as characters, groups, peoples or places, a long-text field with the descricao tag that describes the sheet and its relationships.',
  'Player characters have one to three meters as progress fields, chosen for this story: health, stamina, mana, ki, rage, sanity, battery, hunger, reputation or anything else that rises and falls. A meter can be what the player must keep high or lose, such as a relationship in a school story. The story may have no health at all.',
  'Player characters also have attributes as number fields. Classic ones such as strength, dexterity or constitution fit only classic fantasy. Invent attributes that match how this story is played, such as charm, grades and popularity at school, or reflexes, code and contacts for hackers. A choice field, such as an origin, class or approach, may replace numbers when it fits better.',
  'Besides meters and attributes, draw the fields of every atores structure from these character areas, choosing the ones this campaign makes interesting. Add a field outside them only when the story needs it:',
  ...[...REQUIRED, ...POSSIBILITIES].map((area) => `- ${area}`),
  'Other structures may use progress too, such as the alert of a district or the loyalty of a faction. Never propose relations to other structures.',
  'When the request lists kept structures, they already exist: never propose them again. When it lists structures to replace, propose exactly that many new ones, one for each in the same order, different from the kept and the replaced ones. Give the atores tag to a new structure only when no kept structure has it.',
  'When a structure to replace keeps fields, its replacement keeps them too: build the new structure around them and never propose them again.',
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

type ProposalDraft = z.infer<typeof proposalSchema>;

const OUTPUT = {
  name: 'submit_structures',
  description: 'Submits the proposed structures.',
  input: z.object({
    structures: z.array(proposalSchema).min(1).max(MAX_STRUCTURES),
  }),
};

export function lockedLines(dto: StructureProposalsDto): string[] {
  return [
    dto.kept.length > 0
      ? `Kept structures:\n${dto.kept
          .map(({ name, tags }) =>
            tags.length > 0 ? `- ${name} (${tags.join(', ')})` : `- ${name}`,
          )
          .join('\n')}`
      : null,
    dto.replaced.length > 0
      ? `Structures to replace with ${dto.replaced.length} new ones, in this order:\n${dto.replaced
          .map(({ name, fields }) =>
            fields.length > 0
              ? `- ${name} (keeps the fields ${fields.map((field) => field.label).join(', ')})`
              : `- ${name}`,
          )
          .join('\n')}`
      : null,
  ].filter((line) => line !== null);
}

export interface StructureProposal {
  name: string;
  icon: string;
  tagIds: string[];
  fields: StructureField[];
}

interface ProposalTag {
  id: string;
  slug: string;
}

function idsOf(tags: readonly ProposalTag[], slugs: readonly string[]): string[] {
  return tags.filter((tag) => slugs.includes(tag.slug)).map((tag) => tag.id);
}

export function proposalOf(
  structure: ProposalDraft,
  structureTags: readonly ProposalTag[],
  fieldTags: readonly ProposalTag[],
  kept: readonly StructureField[] = [],
): StructureProposal {
  const max = structure.tags.includes(ACTORS_SLUG)
    ? MAX_ACTOR_FIELDS
    : MAX_FIELDS;
  const taken = new Set(kept.map((field) => field.label.trim().toLowerCase()));
  const fields = structure.fields
    .filter((field) => !taken.has(field.label.trim().toLowerCase()))
    .slice(0, max);

  return {
    name: structure.name,
    icon: structure.icon,
    tagIds: idsOf(structureTags, structure.tags),
    fields: [
      ...kept,
      ...layoutFields(kept, fields).map((field, index) => ({
        ...field,
        tagIds: idsOf(fieldTags, fields[index].tags),
      })),
    ],
  };
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
    onProposal: (proposal: StructureProposal) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const [credentials, system, campaign, structureTags, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId, signal),
        source.system(),
        source.campaign(),
        source.structureTags(),
        source.fieldTags(),
      ]);

    const listing = (tags: readonly { slug: string; description: string }[]) =>
      tags.map((tag) => `- ${tag.slug}: ${tag.description}`).join('\n');

    const limit =
      dto.replaced.length > 0 ? dto.replaced.length : MAX_STRUCTURES;
    let count = 0;

    await this.runner.submitEach(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            `System: ${system.name}`,
            `Campaign pitch: ${system.description ?? 'none'}`,
            `Themes: ${dto.themes.join(', ') || 'none'}`,
            campaign ? describeCampaign(campaign) : null,
            dto.structures.length > 0
              ? `Suggested structures: ${dto.structures.join(', ')}`
              : null,
            ...lockedLines(dto),
            `Structure tags:\n${listing(structureTags)}`,
            `Field tags:\n${listing(fieldTags)}`,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
      proposalSchema,
      (structure) => {
        if (count >= limit) {
          return;
        }

        const kept = dto.replaced[count]?.fields ?? [];

        count++;
        onProposal(proposalOf(structure, structureTags, fieldTags, kept));
      },
    );
  }
}
