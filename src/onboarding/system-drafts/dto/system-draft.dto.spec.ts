import { draftOptionSchema, draftSystemSchema } from './system-draft.dto.js';

const option = {
  theme: 'Uma escola onde todo segredo vira moeda.',
  structures: [
    { name: 'Alunos', icon: 'users' },
    { name: 'Salas', icon: 'house' },
    { name: 'Panelinhas', icon: 'crown' },
    { name: 'Segredos', icon: 'key' },
    { name: 'Boatos', icon: 'scroll' },
  ],
};

const profile = {
  scale: 'institution',
  power: ['status'],
  threat: ['drama'],
  stakes: ['status'],
  pacing: 'episodic',
  era: 'Brasil, anos 2020',
  tone: ['leve'],
  avoid: [],
};

describe('draftOptionSchema', () => {
  it('keeps options saved before the genre profile', () => {
    expect(draftOptionSchema.safeParse({ option }).success).toBe(true);
  });

  it('keeps the genre profile of an option', () => {
    const parsed = draftOptionSchema.parse({ option: { ...option, profile } });

    expect(parsed.option.profile).toEqual(profile);
  });
});

describe('draftSystemSchema', () => {
  it('accepts a chosen profile or none', () => {
    expect(draftSystemSchema.safeParse({ profile }).success).toBe(true);
    expect(draftSystemSchema.safeParse({ profile: null }).success).toBe(true);
    expect(draftSystemSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a slug outside the axes', () => {
    expect(
      draftSystemSchema.safeParse({ profile: { ...profile, scale: 'galaxy' } })
        .success,
    ).toBe(false);
  });
});
