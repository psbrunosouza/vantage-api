import { describe, expect, it } from 'vitest';
import { lockedLines } from './structure-proposals.flow.js';

const dto = (
  kept: { name: string; tags: string[] }[],
  replaced: string[],
) => ({ themes: [], structures: [], kept, replaced });

describe('lockedLines', () => {
  it('adds nothing when no structure is locked', () => {
    expect(lockedLines(dto([], []))).toEqual([]);
  });

  it('lists the kept structures with their tags and how many to replace', () => {
    expect(
      lockedLines(
        dto(
          [
            { name: 'Tripulação', tags: ['atores'] },
            { name: 'Contratos', tags: [] },
          ],
          ['Distritos', 'Facções'],
        ),
      ),
    ).toEqual([
      'Kept structures:\n- Tripulação (atores)\n- Contratos',
      'Structures to replace with 2 new ones: Distritos, Facções',
    ]);
  });
});
