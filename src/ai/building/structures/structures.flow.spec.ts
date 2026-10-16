import { describe, expect, it } from 'vitest';
import type { StructureField } from '../../../model/structures/structure-field.js';
import { lockedLines, proposalOf } from './structures.flow.js';

const dto = (
  kept: { name: string; tags: string[] }[],
  replaced: { name: string; fields: StructureField[] }[],
) => ({ themes: [], structures: [], kept, replaced });

const debt: StructureField = {
  id: 'debt',
  type: 'progress',
  label: 'Dívida',
  options: [],
  column: 1,
  row: 1,
  span: 2,
  rows: 1,
};

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
          [
            { name: 'Distritos', fields: [] },
            { name: 'Facções', fields: [debt] },
          ],
        ),
      ),
    ).toEqual([
      'Kept structures:\n- Tripulação (atores)\n- Contratos',
      'Structures to replace with 2 new ones, in this order:\n- Distritos\n- Facções (keeps the fields Dívida)',
    ]);
  });
});

describe('proposalOf', () => {
  const structureTags = [{ id: 'tag-atores', slug: 'atores' }];
  const fieldTags = [{ id: 'tag-vida', slug: 'vida' }];

  it('resolves the tags of the structure and of each field', () => {
    const proposal = proposalOf(
      {
        name: 'Sobreviventes',
        icon: 'users',
        tags: ['atores', 'desconhecida'],
        fields: [
          { type: 'progress', label: 'Vida', tags: ['vida'], options: [] },
          { type: 'short-text', label: 'Nome', tags: [], options: [] },
        ],
      },
      structureTags,
      fieldTags,
    );

    expect(proposal.tagIds).toEqual(['tag-atores']);
    expect(proposal.fields[0]).toMatchObject({
      label: 'Vida',
      tagIds: ['tag-vida'],
    });
    expect(proposal).not.toHaveProperty('aiNote');
  });

  it('keeps the locked fields of the replaced structure first, without repeating them', () => {
    const proposal = proposalOf(
      {
        name: 'Bando',
        icon: 'users',
        tags: [],
        fields: [
          { type: 'progress', label: 'dívida', tags: [], options: [] },
          { type: 'short-text', label: 'Lema', tags: [], options: [] },
        ],
      },
      structureTags,
      fieldTags,
      [debt],
    );

    expect(proposal.fields.map((field) => field.label)).toEqual([
      'Dívida',
      'Lema',
    ]);
    expect(proposal.fields[0]).toBe(debt);
    expect(proposal.fields[1].row).toBe(2);
  });

  it('keeps at most four fields', () => {
    const proposal = proposalOf(
      {
        name: 'Facções',
        icon: 'users',
        tags: [],
        fields: ['Nome', 'Líder', 'Poder', 'Território', 'Segredo'].map(
          (label) => ({
            type: 'short-text' as const,
            label,
            tags: [],
            options: [],
          }),
        ),
      },
      structureTags,
      fieldTags,
    );

    expect(proposal.fields.map((field) => field.label)).toEqual([
      'Nome',
      'Líder',
      'Poder',
      'Território',
    ]);
  });

  it('keeps at most eight fields on the atores structure', () => {
    const labels = [
      'Vida',
      'Mana',
      'Fúria',
      'Força',
      'Agilidade',
      'Astúcia',
      'Vontade',
      'Sorte',
      'Fama',
    ];
    const proposal = proposalOf(
      {
        name: 'Heróis',
        icon: 'users',
        tags: ['atores'],
        fields: labels.map((label) => ({
          type: 'number' as const,
          label,
          tags: [],
          options: [],
        })),
      },
      structureTags,
      fieldTags,
    );

    expect(proposal.fields.map((field) => field.label)).toEqual(
      labels.slice(0, 8),
    );
  });
});
