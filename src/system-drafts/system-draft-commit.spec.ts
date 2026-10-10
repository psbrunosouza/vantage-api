import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { DraftStructure } from './dto/system-draft.dto.js';
import {
  orphanResources,
  takenSlugs,
  unknownTagIds,
  withCharacterFields,
} from './system-draft-commit.js';

const field = (id: string) => ({
  id,
  type: 'text',
  label: id,
  column: 0,
  row: 0,
  span: 1,
  rows: 1,
  options: [],
});

const structure = (
  id: string,
  tagIds: string[] = [],
  fields = [field(`${id}-name`)],
): DraftStructure => ({ id, name: id, icon: 'users', tagIds, fields });

describe('unknownTagIds', () => {
  it('accepts system tags and tags of the draft', () => {
    expect(
      unknownTagIds([structure('crew', ['actors', 'mine'])], ['actors', 'mine']),
    ).toEqual([]);
  });

  it('flags tags from elsewhere', () => {
    expect(unknownTagIds([structure('crew', ['other'])], ['actors'])).toEqual([
      'other',
    ]);
  });
});

describe('orphanResources', () => {
  it('flags records of a structure outside the draft', () => {
    const records = [
      { id: 'a', structureId: 'crew', name: 'Ana', values: {} },
      { id: 'b', structureId: 'gone', name: 'Bia', values: {} },
    ];

    expect(orphanResources(records, [structure('crew')])).toEqual([records[1]]);
  });
});

describe('takenSlugs', () => {
  it('flags names clashing with system tags or each other', () => {
    expect(
      takenSlugs(
        [
          { id: '1', name: 'Atores', description: 'x' },
          { id: '2', name: 'Rivais', description: 'x' },
          { id: '3', name: 'rivais', description: 'x' },
        ],
        ['atores'],
      ),
    ).toEqual(['atores', 'rivais']);
  });
});

describe('withCharacterFields', () => {
  const character = { name: 'Ana', fields: [field('oath')], values: {} };

  it('appends the character fields to the first actors structure', () => {
    const { structures, actors } = withCharacterFields(
      [structure('places'), structure('crew', ['actors'])],
      'actors',
      character,
    );

    expect(actors.id).toBe('crew');
    expect(actors.fields?.map((current) => current.id)).toEqual([
      'crew-name',
      'oath',
    ]);
    expect(structures[1]).toBe(actors);
  });

  it('needs a structure tagged as actors', () => {
    expect(() =>
      withCharacterFields([structure('places')], 'actors', character),
    ).toThrow(BadRequestException);
  });

  it('rejects field ids the structure already has', () => {
    expect(() =>
      withCharacterFields(
        [structure('crew', ['actors'], [field('oath')])],
        'actors',
        character,
      ),
    ).toThrow(BadRequestException);
  });
});
