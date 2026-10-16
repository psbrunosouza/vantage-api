import type { GenreProfile } from '../../world/worlds/genre-profile.js';

type Kit<K extends string> = Record<K, string>;

const SCALE: Kit<GenreProfile['scale']> = {
  realm:
    'Kingdoms, nations or planets. Places are regions and capitals, and travel takes days.',
  city: 'One big city or megacity. Places are districts, landmarks and underworlds.',
  town: 'A small town or village and its surroundings, where everybody knows everybody. Places are homes, shops, roads and woods.',
  institution:
    'One closed institution, such as a school, company, hospital, prison or ship. Places are its rooms, wings and routines.',
  house:
    'One house, mansion or building with a closed cast. Places are rooms, floors and hidden spaces.',
  frontier:
    'Wild or unknown lands, an expedition or a voyage. Places are camps, ruins, routes and hazards.',
};

const POWER: Kit<GenreProfile['power'][number]> = {
  crown: 'Rulers, nobles, laws and armies hold power.',
  money: 'Companies, owners, debts and contracts hold power.',
  status: 'Popularity, reputation, cliques and gossip hold power.',
  crime: 'Gangs, favors, fear and the black market hold power.',
  faith: 'Churches, cults, prophecy and belief hold power.',
  family: 'Clans, inheritance, old grudges and family secrets hold power.',
  knowledge: 'Secrets, records and who knows what hold power.',
};

const THREAT: Kit<GenreProfile['threat'][number]> = {
  war: 'Open conflict between groups: battles, sieges and shifting alliances.',
  monster: 'A creature or enemy that can be faced and fought.',
  dread:
    'Something wrong that reveals itself slowly: unknown, unseen or unstoppable. Fear matters more than fights.',
  conspiracy:
    'A hidden plan of powerful people that must be uncovered before it is too late.',
  mystery: 'A crime or secret solved through clues, suspects and motives.',
  drama:
    'Conflicts between people: rivalry, love, betrayal, envy and belonging.',
  survival: 'Nature, hunger, cold, disease or a hostile place.',
  everyday:
    'Small personal problems: bills, a broken oven, a misunderstanding, a deadline.',
};

const STAKES: Kit<GenreProfile['stakes'][number]> = {
  life: 'Death is possible and permanent.',
  sanity: 'The mind can break, and fear and trauma leave marks.',
  status:
    'Reputation, rank and belonging can be lost: expulsion, exile or shame.',
  freedom: 'Prison, control, debt or a curse can take freedom away.',
  bonds: 'Friendships, love and family can break.',
  livelihood: 'Home, job, business or savings can be lost.',
};

const PACING: Kit<GenreProfile['pacing']> = {
  'slow-burn':
    'Tension builds slowly: quiet scenes, clues and growing unease before the peak.',
  episodic:
    'Short problems, each with its own ending, around a thread that runs through them.',
  escalating:
    'Every scene raises the stakes and the pressure never drops for long.',
  sandbox:
    'The world moves on its own and the players choose where to go and what matters.',
};

function listing(kit: Record<string, string>): string {
  return Object.entries(kit)
    .map(([slug, guidance]) => `  - ${slug}: ${guidance}`)
    .join('\n');
}

export function describeAxes(): string {
  return [
    'Genre profile axes, by slug:',
    `- scale, pick one:\n${listing(SCALE)}`,
    `- power, pick one or two:\n${listing(POWER)}`,
    `- threat, pick one or two:\n${listing(THREAT)}`,
    `- stakes, pick one or two:\n${listing(STAKES)}`,
    `- pacing, pick one:\n${listing(PACING)}`,
  ].join('\n');
}

export function describeProfile(profile: GenreProfile | null): string | null {
  if (profile === null) {
    return null;
  }

  const lines = [
    'Genre profile. Every place, person, conflict and detail must fit it:',
    `- Scale: ${SCALE[profile.scale]}`,
    `- Power: ${profile.power.map((slug) => POWER[slug]).join(' ')}`,
    `- Threat: ${profile.threat.map((slug) => THREAT[slug]).join(' ')}`,
    `- Stakes: ${profile.stakes.map((slug) => STAKES[slug]).join(' ')}`,
    `- Pacing: ${PACING[profile.pacing]}`,
    `- Era and technology: ${profile.era}`,
    `- Tone: ${profile.tone.join(', ')}`,
  ];

  return profile.avoid.length > 0
    ? [...lines, `- Keep out: ${profile.avoid.join(', ')}`].join('\n')
    : lines.join('\n');
}
