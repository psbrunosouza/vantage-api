import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { isActorStructure } from '../../tags/actors.js';
import { AgentRunner } from '../agent-runner.js';
import { AiService } from '../ai.service.js';
import { describeSystem } from '../system-context.js';
import type { WorldSource } from '../world-source.js';

const PROMPT = [
  'You suggest player characters for a solo tabletop RPG played in Vantage.',
  'Create three distinct characters that fit the world of the system: different backgrounds, motives and ways to solve problems.',
  'Each role is two to four words. Each hook is one sentence about what drives or haunts the character.',
  'Give two or three short traits per character.',
  'Write in the language of the system.',
].join('\n');

export const characterOptionSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  hook: z.string().min(1),
  traits: z.array(z.string().min(1)).min(2).max(3),
});

export type CharacterOption = z.infer<typeof characterOptionSchema>;

const OUTPUT = {
  name: 'submit_characters',
  description: 'Submits the three character suggestions.',
  input: z.object({ characters: z.array(characterOptionSchema).length(3) }),
};

@Injectable()
export class CharacterOptionsFlow {
  constructor(
    private readonly aiService: AiService,
    private readonly runner: AgentRunner,
  ) {}

  async run(userId: string, source: WorldSource): Promise<CharacterOption[]> {
    const [credentials, system, structures, fieldTags] = await Promise.all([
      this.aiService.credentialsOf(userId),
      source.system(),
      source.structures(),
      source.fieldTags(),
    ]);

    if (!structures.some(isActorStructure)) {
      throw new BadRequestException({
        code: 'ACTORS_MISSING',
        message: 'Tag a structure as Actors first.',
      });
    }

    const { characters } = await this.runner.submit(
      credentials,
      [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: describeSystem(system, structures, fieldTags),
        },
      ],
      OUTPUT,
    );

    return characters;
  }
}
