import type { GenreProfile } from '../../world/worlds/genre-profile.js';
import { describeAxes, describeProfile } from './genre-kits.js';

const profile: GenreProfile = {
  scale: ['schools', 'small-towns'],
  power: ['popularity'],
  threat: ['school-rivalry', 'mystery'],
  stakes: ['reputation'],
  pacing: ['episodic'],
  era: 'Brasil, anos 2020',
  tone: ['leve', 'intrigante'],
  avoid: ['reinos', 'magia'],
};

describe('describeAxes', () => {
  it('explains every axis', () => {
    const text = describeAxes();

    for (const axis of ['scale', 'power', 'threat', 'stakes', 'pacing']) {
      expect(text).toContain(`- ${axis}: `);
    }
  });
});

describe('describeProfile', () => {
  it('skips a missing profile', () => {
    expect(describeProfile(null)).toBeNull();
  });

  it('turns the ids into their names', () => {
    const text = describeProfile(profile);

    expect(text).toContain(
      '- Scale (where the story happens and how far it reaches): Schools, Small towns',
    );
    expect(text).toContain(
      '- Threat (what endangers the people of the world): School rivalry, Mystery',
    );
    expect(text).toContain('- Era and technology: Brasil, anos 2020');
    expect(text).toContain('- Tone: leve, intrigante');
    expect(text).toContain('- Keep out: reinos, magia');
  });

  it('skips the keep out line when nothing is avoided', () => {
    expect(describeProfile({ ...profile, avoid: [] })).not.toContain(
      'Keep out',
    );
  });
});
