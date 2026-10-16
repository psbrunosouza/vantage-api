import { z } from 'zod';
import type { MembersService } from '../../../system/members/members.service.js';
import type { ResourcesService } from '../../../model/resources/resources.service.js';
import { isActorStructure } from '../../../model/tags/actors.js';
import type { StructuresService } from '../../../model/structures/structures.service.js';
import { type AiTool, aiTool } from '../../runtime/ai-tool.js';

export interface CharactersSource {
  structures: StructuresService;
  resources: ResourcesService;
  members: MembersService;
}

export function listCharactersTool(
  source: CharactersSource,
  userId: string,
  systemId: string,
): AiTool {
  return aiTool({
    name: 'list_characters',
    description:
      'Lists the player characters of the system with their ids and the player who controls each one.',
    input: z.object({}),
    run: async () => {
      const [structures, resources, members] = await Promise.all([
        source.structures.findAll(userId, systemId),
        source.resources.findAll(userId, systemId),
        source.members.findAll(userId, systemId),
      ]);
      const actorIds = new Set(
        structures.filter(isActorStructure).map((structure) => structure.id),
      );

      return resources
        .filter((resource) => actorIds.has(resource.structureId))
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
