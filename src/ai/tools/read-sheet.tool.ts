import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { type AiTool, aiTool } from '../ai-tool.js';
import { describeValues } from '../journey-context.js';
import type { CharactersSource } from './list-characters.tool.js';

export function readSheetTool(
  source: CharactersSource,
  userId: string,
  journeyId: string,
): AiTool {
  return aiTool({
    name: 'read_sheet',
    description:
      'Reads the sheet of a character: name and every filled field as "Label: value". Use it before mentioning any attribute.',
    input: z.object({
      characterId: z.string().describe('Id from list_characters.'),
    }),
    run: async ({ characterId }) => {
      const [structures, resources] = await Promise.all([
        source.structures.findAll(userId, journeyId),
        source.resources.findAll(userId, journeyId),
      ]);
      const resource = resources.find(
        (candidate) => candidate.id === characterId,
      );
      const structure = structures.find(
        (candidate) => candidate.id === resource?.structureId,
      );

      if (!resource || !structure) {
        throw new NotFoundException({
          code: 'CHARACTER_NOT_FOUND',
          message: 'Character not found.',
        });
      }

      return {
        name: resource.name,
        sheet: describeValues(structure.fields, resource.values),
      };
    },
  });
}
