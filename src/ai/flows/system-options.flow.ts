import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import type { SystemOptionsDto } from '../dto/system-options.dto.js';

const PROMPT = [
  'You name tabletop RPG systems for Vantage.',
  'Create five original and striking names for tabletop RPG systems, with the strength of book titles, then choose the three best.',
  'Guidelines:',
  '1. Format: one word, or two words connected by "&".',
  '2. Styles: explore serious, fun, mysterious and absurd tones.',
  '3. Themes: freely mix fantasy, science fiction, horror, mythology, surrealism, folklore, post-apocalypse and unexpected concepts.',
  '4. Originality: prioritize identity, creativity and meaning. Avoid clichés, generic names and repetitive ideas.',
  '5. Creative freedom: invent your own worlds, species, cultures and concepts, without being limited to the suggested themes.',
  '6. Presentation: list the five names, each with a very short description (theme) that explains its concept.',
  'Write everything in Brazilian Portuguese.',
].join('\n');

export const systemOptionSchema = z.object({
  name: z.string().min(1),
  theme: z.string().min(1),
});

export type SystemOption = z.infer<typeof systemOptionSchema>;

const OUTPUT = {
  name: 'submit_systems',
  description: 'Submits the five system names and the three best among them.',
  input: z.object({
    candidates: z.array(systemOptionSchema).length(5),
    best: z.array(systemOptionSchema).length(3),
  }),
};

@Injectable()
export class SystemOptionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, dto: SystemOptionsDto): Promise<SystemOption[]> {
    const credentials = await this.aiService.credentialsOf(userId);
    const { best } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: [
            'Create the systems.',
            dto.direction ? `Player direction: ${dto.direction}` : null,
            dto.moods?.length ? `Moods: ${dto.moods.join(', ')}` : null,
          ]
            .filter((part) => part !== null)
            .join('\n\n'),
        },
      ],
      OUTPUT,
    );

    return best;
  }
}
