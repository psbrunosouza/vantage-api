import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CatalogService } from '../../catalog/catalog.service.js';
import { AgentRunner } from '../agent-runner.js';
import { type AiCredentials, AiService } from '../ai.service.js';
import type { CampaignOptionsDto } from '../dto/campaign-options.dto.js';

const PROMPT = [
  'You are an experienced game master pitching new tabletop RPG campaigns to your friends. Your only goal is to make them say "I want to play this!"',
  'You receive a theme set and the goal of the adventurers. Create one campaign, using the most iconic and exciting elements of its themes.',
  'Each pitch has two or three short sentences, at most 50 words, and shows:',
  '- a threat with a face: a villain, monster or power doing something terrible right now, in a place worth visiting;',
  '- what is at stake: lives, a city, a kingdom, a fortune;',
  '- what the adventurers must do: a clear, active goal such as stop, hunt, steal, rescue, escape or explore.',
  'Set up the situation and never tell how it ends.',
  'Classic and clear beats weird. Familiar genre elements are welcome: dragons, ghosts, pirates, cults, robots, heists, ruins, treasure.',
  'Fun comes from action, danger, wonder and colorful villains. Humor is welcome when the theme fits.',
  'Avoid premises built on strange laws, customs, bureaucracy or economics: no councils, contracts, votes, crops or water rights unless a theme demands it.',
  'Use simple words. No title, no named protagonist, at most two proper names.',
  'Avoid AI slop: vague, poetic phrases that sound deep but give players nothing to do, such as stolen memories, whispering echoes or a lighthouse of lost souls. Any element is welcome when it is concrete: a lighthouse that pirates want to burn is a great place for a fight.',
  'Test every sentence: players must be able to picture it, go there, fight it, steal it or talk to it.',
  'Write like a person talking at the table: no em dashes, no "not X, but Y", no "each X is a Y".',
  'Examples of tone only. Never reuse their ideas:',
  '"Um dragão vermelho tomou a única passagem entre as montanhas e exige uma princesa por mês como tributo. O rei oferece metade do tesouro real a quem trouxer a cabeça da fera."',
  '"Fantasmas tomaram o transatlântico Rainha do Norte em pleno oceano, e toda noite um passageiro desaparece. Os aventureiros estão a bordo e precisam descobrir quem acordou os mortos antes de serem os próximos."',
  '"A maior corporação da cidade guarda num cofre orbital o único antídoto para a praga que ela mesma criou. Um velho hacker reúne os aventureiros para o assalto do século."',
  'Also return its themes translated to Brazilian Portuguese, in the same order, and eight structures that fit its world. A structure groups sheets of one kind, such as places, factions or creatures, never player characters. Each structure name is a plural noun of one or two words.',
  'When there is a player direction, it takes priority over the theme set.',
  'Write everything in Brazilian Portuguese.',
].join('\n');

const SETS = 3;
const MIN_THEMES = 1;
const MAX_THEMES = 1;
const STRUCTURES = 8;
const GOALS = ['stop', 'hunt', 'steal', 'rescue', 'escape', 'explore'];

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
  theme: z.string().min(1).describe('The campaign synopsis.'),
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

export function campaignGoals(random = Math.random): string[] {
  const goals = [...GOALS];

  for (let index = goals.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [goals[index], goals[other]] = [goals[other], goals[index]];
  }

  return goals.slice(0, SETS);
}

@Injectable()
export class CampaignOptionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly catalogService: CatalogService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, dto: CampaignOptionsDto): Promise<CampaignOption[]> {
    return Promise.all(await this.pitches(userId, dto));
  }

  async pitches(
    userId: string,
    dto: CampaignOptionsDto,
  ): Promise<Promise<CampaignOption>[]> {
    const chosen = dto.themes ?? [];
    const [credentials, random] = await Promise.all([
      this.aiService.credentialsOf(userId),
      chosen.length > 0
        ? []
        : this.catalogService.randomThemes(SETS * MAX_THEMES),
    ]);
    const goals = campaignGoals();

    return themeSets(chosen, random).map((set, index) =>
      this.pitch(credentials, set, goals[index], dto),
    );
  }

  private pitch(
    credentials: AiCredentials,
    set: string[],
    goal: string,
    dto: CampaignOptionsDto,
  ): Promise<CampaignOption> {
    return this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            `Theme set: ${set.join(', ') || 'any'}`,
            `Goal of the adventurers: ${goal}`,
            dto.direction ? `Player direction: ${dto.direction}` : null,
            dto.moods?.length ? `Moods: ${dto.moods.join(', ')}` : null,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );
  }
}
