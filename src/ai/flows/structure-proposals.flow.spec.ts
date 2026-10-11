import { describe, expect, it } from 'vitest';
import { lockedLines, proposalOf } from './structure-proposals.flow.js';

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

describe('proposalOf', () => {
  const structureTags = [{ id: 'tag-atores', slug: 'atores' }];
  const fieldTags = [{ id: 'tag-vida', slug: 'vida' }];

  it('keeps the oracle notes of the structure and of each field', () => {
    const proposal = proposalOf(
      {
        name: 'Sobreviventes',
        icon: 'users',
        tags: ['atores', 'desconhecida'],
        note: '  Quem os jogadores controlam · sobrevivência, grupo  ',
        fields: [
          {
            type: 'progress',
            label: 'Vida',
            tags: ['vida'],
            options: [],
            note: 'Zera quando cai · dano, cura',
          },
          { type: 'short-text', label: 'Nome', tags: [], options: [], note: ' ' },
        ],
      },
      structureTags,
      fieldTags,
    );

    expect(proposal.tagIds).toEqual(['tag-atores']);
    expect(proposal.aiNote).toBe('Quem os jogadores controlam · sobrevivência, grupo');
    expect(proposal.fields[0]).toMatchObject({
      label: 'Vida',
      tagIds: ['tag-vida'],
      aiNote: 'Zera quando cai · dano, cura',
    });
    expect(proposal.fields[1]).not.toHaveProperty('aiNote');
  });
});
