import { describe, expect, it } from 'vitest';
import type { SessionZeroQuestionDto } from './dto/replace-questions.dto.js';
import { foreignStructureIds } from './session-zero.service.js';

const question = (
  structureId: string | null,
  sourceStructureId: string | null,
): SessionZeroQuestionDto => ({
  prompt: 'Pra quem você deve?',
  kind: 'record',
  structureId,
  fieldId: 'debt',
  sourceStructureId,
  details: {},
});

describe('foreignStructureIds', () => {
  it('accepts structures of the journey and empty links', () => {
    expect(
      foreignStructureIds(
        [question('crew', 'factions'), question(null, null)],
        ['crew', 'factions'],
      ),
    ).toEqual([]);
  });

  it('flags structures from another journey', () => {
    expect(
      foreignStructureIds([question('crew', 'elsewhere')], ['crew']),
    ).toEqual(['elsewhere']);
  });
});
