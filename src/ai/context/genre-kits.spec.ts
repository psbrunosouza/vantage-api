import type { GenreProfile } from '../../world/worlds/genre-profile.js';
import {
  PACINGS,
  POWERS,
  SCALES,
  STAKES,
  THREATS,
} from '../../world/worlds/genre-profile.js';
import { describeAxes, describeProfile } from './genre-kits.js';

const profile: GenreProfile = {
  scale: 'institution',
  power: ['status'],
  threat: ['drama', 'mystery'],
  stakes: ['status'],
  pacing: 'episodic',
  era: 'Brasil, anos 2020',
  tone: ['leve', 'intrigante'],
  avoid: ['reinos', 'magia'],
};

describe('describeAxes', () => {
  it('lists every slug of every axis', () => {
    const text = describeAxes();

    for (const slug of [
      ...SCALES,
      ...POWERS,
      ...THREATS,
      ...STAKES,
      ...PACINGS,
    ]) {
      expect(text).toContain(`- ${slug}: `);
    }
  });
});

describe('describeProfile', () => {
  it('skips a missing profile', () => {
    expect(describeProfile(null)).toBeNull();
  });

  it('turns the slugs into guidance', () => {
    const text = describeProfile(profile);

    expect(text).toContain('- Scale: One closed institution');
    expect(text).toContain(
      '- Threat: Conflicts between people: rivalry, love, betrayal, envy and belonging. A crime or secret',
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
