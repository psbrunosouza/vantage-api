import {
  GENRE_AXES,
  type GenreAxis,
  genreLabel,
} from '../../world/worlds/genre-axes.js';
import {
  GENRE_PICKS,
  type GenreProfile,
} from '../../world/worlds/genre-profile.js';

const AXES: Record<GenreAxis, { title: string; meaning: string }> = {
  scale: {
    title: 'Scale',
    meaning: 'where the story happens and how far it reaches',
  },
  power: { title: 'Power', meaning: 'what gives power and who holds it' },
  threat: {
    title: 'Threat',
    meaning: 'what endangers the people of the world',
  },
  stakes: { title: 'Stakes', meaning: 'what the characters can win or lose' },
  pacing: { title: 'Pacing', meaning: 'how the story moves and ends' },
};

export function describeAxes(): string {
  return [
    `Genre profile axes. For each axis, pick one to ${GENRE_PICKS} ids from the options of its field, the ones that best define this world:`,
    ...GENRE_AXES.map((axis) => `- ${axis}: ${AXES[axis].meaning}.`),
  ].join('\n');
}

export function describeProfile(profile: GenreProfile | null): string | null {
  if (profile === null) {
    return null;
  }

  const lines = [
    'Genre profile. Every place, person, conflict and detail must fit it:',
    ...GENRE_AXES.map(
      (axis) =>
        `- ${AXES[axis].title} (${AXES[axis].meaning}): ${profile[axis]
          .map((id) => genreLabel(axis, id))
          .join(', ')}`,
    ),
    `- Era and technology: ${profile.era}`,
    `- Tone: ${profile.tone.join(', ')}`,
  ];

  return profile.avoid.length > 0
    ? [...lines, `- Keep out: ${profile.avoid.join(', ')}`].join('\n')
    : lines.join('\n');
}
