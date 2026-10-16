import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LANGUAGES, type Locale } from '../../../core/auth/locales.js';
import { CatalogService } from '../../../onboarding/catalog/catalog.service.js';
import { AgentRunner } from '../../runtime/agent-runner.js';
import { type AiCredentials, AiService } from '../../settings/ai.service.js';
import type { CampaignOptionsDto } from './campaign-options.dto.js';
import { genreProfileSchema } from '../../../world/worlds/genre-profile.js';
import { STRUCTURE_ICONS } from '../../context/structure-icons.js';
import { PROMPT } from './pitches.prompt.js';

const SETS = 3;
const STRUCTURES = 5;

const structureSchema = z.object({
  name: z.string().min(1),
  icon: z.enum(STRUCTURE_ICONS),
});

export const campaignOptionSchema = z.object({
  theme: z.string().min(1).describe('Describe a sinopse'),
  structures: z
    .array(structureSchema)
    .length(STRUCTURES)
    .describe('Structures that fit the world of the campaign.'),
  profile: genreProfileSchema,
});

export type CampaignOption = z.infer<typeof campaignOptionSchema>;

const OUTPUT = {
  name: 'submit_campaign',
  description: 'Submits the campaign.',
  input: campaignOptionSchema,
};

export function campaignThemes(
  chosen: string | undefined,
  random: string[],
): (string | undefined)[] {
  return Array.from({ length: SETS }, (_, index) => chosen ?? random[index]);
}

@Injectable()
export class PitchesFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly catalogService: CatalogService,
    private readonly runner: AgentRunner,
  ) {}

  async run(
    userId: string,
    dto: CampaignOptionsDto,
    locale: Locale,
  ): Promise<CampaignOption[]> {
    return Promise.all(await this.pitches(userId, dto, locale));
  }

  async pitches(
    userId: string,
    dto: CampaignOptionsDto,
    locale: Locale,
    signal?: AbortSignal,
  ): Promise<Promise<CampaignOption>[]> {
    const [credentials, random] = await Promise.all([
      this.aiService.credentialsOf(userId, signal),
      dto.theme ? [] : this.catalogService.randomThemes(SETS),
    ]);

    return campaignThemes(dto.theme, random).map((theme) =>
      this.pitch(credentials, theme, dto, locale),
    );
  }

  private pitch(
    credentials: AiCredentials,
    theme: string | undefined,
    dto: CampaignOptionsDto,
    locale: Locale,
  ): Promise<CampaignOption> {
    return this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            `Theme: ${theme ?? 'any'}`,
            dto.direction ? `Player direction: ${dto.direction}` : null,
            dto.moods?.length ? `Moods: ${dto.moods.join(', ')}` : null,
            `Output language: ${LANGUAGES[locale]}`,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );
  }
}
