import { z } from 'zod';
import type { MembersService } from '../../members/members.service.js';
import type { ResourcesService } from '../../resources/resources.service.js';
import { ACTOR } from '../../structures/structures.schema.js';
import type { StructuresService } from '../../structures/structures.service.js';
import { type AiTool, aiTool } from '../ai-tool.js';

export interface CharactersSource {
  structures: StructuresService;
  resources: ResourcesService;
  members: MembersService;
}

export function listCharactersTool(
  source: CharactersSource,
  userId: string,
  journeyId: string,
): AiTool {
  return aiTool({
    name: 'list_characters',
    description:
      'Lists the player characters of the journey with their ids and the player who controls each one.',
    input: z.object({}),
    run: async () => {
      const [structures, resources, members] = await Promise.all([
        source.structures.findAll(userId, journeyId),
        source.resources.findAll(userId, journeyId),
        source.members.findAll(userId, journeyId),
      ]);
      const actors = structures.find(
        (structure) => structure.capability === ACTOR,
      );

      return resources
        .filter((resource) => resource.structureId === actors?.id)
        .map((resource) => ({
          id: resource.id,
          name: resource.name,
          player:
            members.find((member) => member.resourceIds.includes(resource.id))
              ?.name ?? null,
        }));
    },
  });
}
