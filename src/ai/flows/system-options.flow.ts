import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CatalogService } from '../../catalog/catalog.service.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import type { SystemOptionsDto } from '../dto/system-options.dto.js';

const PROMPT = [
  'You are an experienced game master pitching new tabletop RPG campaigns to your friends. Your only goal is to make them say "I want to play this!"',
  'You receive three theme sets. Create one campaign for each set, using the most iconic and exciting elements of its themes.',
  'Each pitch has two or three short sentences, at most 50 words, and shows:',
  '- a threat with a face: a villain, monster or power doing something terrible right now, in a place worth visiting;',
  '- what is at stake: lives, a city, a kingdom, a fortune;',
  '- what the adventurers must do: a clear, active goal such as stop, hunt, steal, rescue, escape or explore.',
  'Set up the situation and never tell how it ends.',
  'Classic and clear beats weird. Familiar genre elements are welcome: dragons, ghosts, pirates, cults, robots, heists, ruins, treasure.',
  'Fun comes from action, danger, wonder and colorful villains. Humor is welcome when the theme fits.',
  'Avoid premises built on strange laws, customs, bureaucracy or economics: no councils, contracts, votes, crops or water rights unless a theme demands it.',
  'Make the three campaigns different in tone and in what the adventurers do.',
  'Use simple words. No title, no named protagonist, at most two proper names.',
  'Avoid AI slop: vague, poetic phrases that sound deep but give players nothing to do, such as stolen memories, whispering echoes or a lighthouse of lost souls. Any element is welcome when it is concrete: a lighthouse that pirates want to burn is a great place for a fight.',
  'Test every sentence: players must be able to picture it, go there, fight it, steal it or talk to it.',
  'Write like a person talking at the table: no em dashes, no "not X, but Y", no "each X is a Y".',
  'Examples of tone only. Never reuse their ideas:',
  '"Um dragão vermelho tomou a única passagem entre as montanhas e exige uma princesa por mês como tributo. O rei oferece metade do tesouro real a quem trouxer a cabeça da fera."',
  '"Fantasmas tomaram o transatlântico Rainha do Norte em pleno oceano, e toda noite um passageiro desaparece. Os aventureiros estão a bordo e precisam descobrir quem acordou os mortos antes de serem os próximos."',
  '"A maior corporação da cidade guarda num cofre orbital o único antídoto para a praga que ela mesma criou. Um velho hacker reúne os aventureiros para o assalto do século."',
  'For each campaign, also return its themes translated to Brazilian Portuguese, in the same order, and eight structures that fit its world. A structure groups sheets of one kind, such as places, factions or creatures, never player characters. Each structure name is a plural noun of one or two words.',
  'When there is a player direction, it takes priority over the theme sets.',
  'Write everything in Brazilian Portuguese.',
].join('\n');

const SETS = 3;
const MIN_THEMES = 1;
const MAX_THEMES = 1;
const STRUCTURES = 8;

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

export const systemOptionSchema = z.object({
  theme: z.string().min(1).describe('The campaign synopsis.'),
  themes: z.array(z.string().min(1)).describe('The translated themes.'),
  structures: z
    .array(structureSchema)
    .length(STRUCTURES)
    .describe('Structures that fit the world of the campaign.'),
});

export type SystemOption = z.infer<typeof systemOptionSchema>;

const OUTPUT = {
  name: 'submit_campaigns',
  description: 'Submits one campaign for each theme set, in the same order.',
  input: z.object({
    campaigns: z.array(systemOptionSchema).length(SETS),
  }),
};

@Injectable()
export class SystemOptionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly catalogService: CatalogService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, dto: SystemOptionsDto): Promise<SystemOption[]> {
    const [credentials, themes] = await Promise.all([
      this.aiService.credentialsOf(userId),
      this.catalogService.randomThemes(SETS * MAX_THEMES),
    ]);
    const sets = Array.from({ length: SETS }, (_, index) =>
      themes.slice(
        index * MAX_THEMES,
        index * MAX_THEMES +
          MIN_THEMES +
          Math.floor(Math.random() * (MAX_THEMES - MIN_THEMES + 1)),
      ),
    );

    const { campaigns } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            'Create one campaign for each theme set.',
            [
              'Theme sets:',
              ...sets.map(
                (set, index) => `${index + 1}. ${set.join(', ') || 'any'}`,
              ),
            ].join('\n'),
            dto.direction ? `Player direction: ${dto.direction}` : null,
            dto.moods?.length ? `Moods: ${dto.moods.join(', ')}` : null,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );

    return campaigns;
  }
}
