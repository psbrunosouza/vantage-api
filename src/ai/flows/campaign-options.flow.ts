import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LANGUAGES, type Locale } from '../../auth/locales.js';
import { CatalogService } from '../../catalog/catalog.service.js';
import { AgentRunner } from '../agent-runner.js';
import { type AiCredentials, AiService } from '../ai.service.js';
import type { CampaignOptionsDto } from '../dto/campaign-options.dto.js';

const PROMPT = [
  'Act as a senior RPG world designer. Create a region from a macro perspective, including the structures within that region. Provide: 1) names for the region, locations, and people, without epithets or auxiliary text. Avoid starting the text with a name whenever possible; names should appear naturally within the text for greater immersion. Include the regions geographical diversity and climate; 2) 3 cities (or any similar structures) with their economies, politics, and internal conflicts, integrating their geographical locations immersively into the text; 3) 2 factions or groups in conflict; 4) A ruler or multiple rulers under any system of government; 5) Write in a literary style; 6) Provide only the requested content; 7) Distribute the content into concise and objective paragraphs; 8) Avoid obvious or predictable associations with the chosen theme; 9) Include a diversity of peoples and creatures; 10) Blend information about the region, such as locations, factions, and government, naturally into the narrative without categorizing it. 11) Write everything in the output language, except proper names; 12) Build every proper name from an existing real-world language: the region, cities, places, people, rulers, gods, factions, peoples and anything else that has a name. Never translate these names into the output language and never invent names outside that language.',
].join('\n');

const SETS = 3;
const MIN_THEMES = 1;
const MAX_THEMES = 1;
const STRUCTURES = 5;

export const STRUCTURE_ICONS = [
  'scroll-text',
  'package',
  'sparkles',
  'skull',
  'search',
  'map',
  'users',
  'rocket',
  'layers',
  'shapes',
  'sword',
  'swords',
  'shield',
  'axe',
  'bow-arrow',
  'wand-sparkles',
  'flask-conical',
  'crown',
  'castle',
  'gem',
  'coins',
  'key',
  'scroll',
  'book-open',
  'dices',
  'ghost',
  'flame',
  'feather',
  'compass',
  'tent',
  'ship',
  'mountain',
  'trees',
  'moon',
  'drama',
  'bot',
  'biohazard',
  'user',
  'heart',
  'star',
  'flag',
  'target',
  'eye',
  'zap',
  'globe',
  'house',
  'clock',
  'file-text',
  'tag',
  'cat',
] as const;

const structureSchema = z.object({
  name: z.string().min(1),
  icon: z.enum(STRUCTURE_ICONS),
});

export const campaignOptionSchema = z.object({
  theme: z
    .string()
    .min(1)
    .describe('The full region description, in several paragraphs.'),
  themes: z.array(z.string().min(1)).describe('The translated themes.'),
  structures: z
    .array(structureSchema)
    .length(STRUCTURES)
    .describe('Structures that fit the world of the campaign.'),
});

export type CampaignOption = z.infer<typeof campaignOptionSchema>;

const OUTPUT = {
  name: 'submit_campaign',
  description: 'Submits the campaign.',
  input: campaignOptionSchema,
};

export function themeSets(chosen: string[], random: string[]): string[][] {
  if (chosen.length > 0) {
    return Array.from({ length: SETS }, () => chosen);
  }

  return Array.from({ length: SETS }, (_, index) =>
    random.slice(
      index * MAX_THEMES,
      index * MAX_THEMES +
        MIN_THEMES +
        Math.floor(Math.random() * (MAX_THEMES - MIN_THEMES + 1)),
    ),
  );
}

@Injectable()
export class CampaignOptionsFlow {
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
    const chosen = dto.themes ?? [];
    const [credentials, random] = await Promise.all([
      this.aiService.credentialsOf(userId, signal),
      chosen.length > 0
        ? []
        : this.catalogService.randomThemes(SETS * MAX_THEMES),
    ]);

    return themeSets(chosen, random).map((set) =>
      this.pitch(credentials, set, dto, locale),
    );
  }

  private pitch(
    credentials: AiCredentials,
    set: string[],
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
            `Theme set: ${set.join(', ') || 'any'}`,
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
