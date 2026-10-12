import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { StructureField } from '../../structures/structure-field.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { AI_FIELD_SIZES, layoutFields } from '../field-layout.js';
import { describeCampaign } from '../system-context.js';
import type { StructureProposalsDto } from '../dto/structure-proposals.dto.js';
import type { WorldSource } from '../world-source.js';
import { STRUCTURE_ICONS } from './campaign-options.flow.js';

const MIN_STRUCTURES = 3;
const MAX_STRUCTURES = 4;
const MIN_FIELDS = 2;
const MAX_FIELDS = 4;
const NOTE_WORDS = 12;
const NOTE_LENGTH = 500;

const PROMPT = [
  'You design the data model of a solo tabletop RPG played in Vantage.',
  `Propose between ${MIN_STRUCTURES} and ${MAX_STRUCTURES} structures built from the campaign and its themes: only the core ones the game needs to start, since the world grows during play. A structure groups sheets of one kind, such as crew, places, factions, items or documents. Each name is a plural noun of one or two words.`,
  'The first structure holds the player characters and has the atores tag. Name it after who the players are in this world, such as crew, party or squad.',
  'When the system lists suggested structures, prefer the most essential of them.',
  'Give each structure one or more structure tags from the list, using their slugs. The description of a tag says what it means for the game master.',
  `Give each structure ${MIN_FIELDS} to ${MAX_FIELDS} fields, only the essential ones. A field has a label, a type and, when it fits, one or more field tags from the list, using their slugs. A choice field also lists its options.`,
  'Use progress for meters such as health or pressure. Never propose relations to other structures.',
  `Give each structure and each field a note for the oracle that explains what it means in this world: one short sentence of at most ${NOTE_WORDS} words, then two or three keywords, as in "Quem os jogadores controlam · sobrevivência, grupo, confiança".`,
  'When the request lists kept structures, they already exist: never propose them again. When it lists structures to replace, propose exactly that many new ones, different from the kept and the replaced ones. Give the atores tag to a new structure only when no kept structure has it.',
  'Write names, labels, options and notes in Brazilian Portuguese.',
].join('\n');

const FIELD_TYPES = Object.keys(AI_FIELD_SIZES) as [
  keyof typeof AI_FIELD_SIZES,
  ...(keyof typeof AI_FIELD_SIZES)[],
];

const proposalSchema = z.object({
  name: z.string().min(1),
  icon: z.enum(STRUCTURE_ICONS),
  tags: z.array(z.string()),
  note: z.string(),
  fields: z
    .array(
      z.object({
        type: z.enum(FIELD_TYPES),
        label: z.string().min(1),
        tags: z.array(z.string()),
        options: z.array(z.string()),
        note: z.string(),
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
      ? `Structures to replace with ${dto.replaced.length} new ones: ${dto.replaced.join(', ')}`
      : null,
  ].filter((line) => line !== null);
}

export interface StructureProposal {
  name: string;
  icon: string;
  tagIds: string[];
  aiNote: string;
  fields: StructureField[];
}

interface ProposalTag {
  id: string;
  slug: string;
}

function idsOf(tags: readonly ProposalTag[], slugs: readonly string[]): string[] {
  return tags.filter((tag) => slugs.includes(tag.slug)).map((tag) => tag.id);
}

function noteOf(note: string): string {
  return note.trim().slice(0, NOTE_LENGTH);
}

export function proposalOf(
  structure: ProposalDraft,
  structureTags: readonly ProposalTag[],
  fieldTags: readonly ProposalTag[],
): StructureProposal {
  const fields = structure.fields.slice(0, MAX_FIELDS);

  return {
    name: structure.name,
    icon: structure.icon,
    tagIds: idsOf(structureTags, structure.tags),
    aiNote: noteOf(structure.note),
    fields: layoutFields([], fields).map((field, index) => {
      const draft = fields[index];
      const aiNote = noteOf(draft.note);

      return {
        ...field,
        tagIds: idsOf(fieldTags, draft.tags),
        ...(aiNote ? { aiNote } : {}),
      };
    }),
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
  ): Promise<void> {
    const [credentials, system, campaign, structureTags, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId),
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

        count++;
        onProposal(proposalOf(structure, structureTags, fieldTags));
      },
    );
  }
}
