import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { StructureField } from '../../../model/structures/structure-field.js';
import { ACTORS_SLUG } from '../../../model/tags/actors.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { AiService } from '../../settings/ai.service.js';
import { AI_FIELD_SIZES, layoutFields } from '../../context/field-layout.js';
import { describeCampaign, describeMoods } from '../../context/describe.js';
import { LANGUAGES, type Locale } from '../../../core/auth/locales.js';
import type { StructureProposalsDto } from './structure-proposals.dto.js';
import type { WorldSource } from '../../context/world-source.js';
import { STRUCTURE_ICONS } from '../../context/structure-icons.js';
import {
  MAX_STRUCTURES,
  MAX_FIELDS,
  MAX_ACTOR_FIELDS,
  PROMPT,
} from './structures.prompt.js';
import { describeProfile } from '../../context/genre-kits.js';

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

function idsOf(
  tags: readonly ProposalTag[],
  slugs: readonly string[],
): string[] {
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
export class StructuresFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    source: WorldSource,
    dto: StructureProposalsDto,
    locale: Locale,
    onProposal: (proposal: StructureProposal) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const [credentials, system, profile, campaign, structureTags, fieldTags] =
      await Promise.all([
        this.aiService.credentialsOf(userId, signal),
        source.system(),
        source.profile(),
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
            describeMoods(system.moods),
            describeProfile(profile),
            `Themes: ${dto.themes.join(', ') || 'none'}`,
            campaign ? describeCampaign(campaign) : null,
            dto.structures.length > 0
              ? `Suggested structures: ${dto.structures.join(', ')}`
              : null,
            ...lockedLines(dto),
            `Structure tags:\n${listing(structureTags)}`,
            `Field tags:\n${listing(fieldTags)}`,
            `Output language: ${LANGUAGES[locale]}`,
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
