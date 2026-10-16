import {
  POSSIBILITIES,
  REQUIRED,
} from '../session-zero/session-zero.prompt.js';

const MIN_STRUCTURES = 3;

export const MAX_STRUCTURES = 4;

const MIN_FIELDS = 2;

export const MAX_FIELDS = 4;

export const MAX_ACTOR_FIELDS = 8;

export const PROMPT = [
  'You design the data model of a solo tabletop RPG played in Vantage.',
  'Read the genre, era, technology and tone of the campaign first. Every structure, field and option must make sense inside that world.',
  `Propose between ${MIN_STRUCTURES} and ${MAX_STRUCTURES} structures built from the campaign and its themes: only the core ones the game needs to start, since the world grows during play. A structure groups sheets of one kind. Each name is a plural noun of one or two words.`,
  'The first structure holds the player characters and has the atores tag. Name it after who the players are in this world, such as crew, party or squad.',
  'Places, factions, items and documents are common kinds, but the world may need a kind no tag describes, such as rumors, spells, debts, mutations or rivals. Invent it when it gives the players something to chase, use or fear.',
  'Group places by scale, such as kingdoms, cities, districts, ships or dungeons, so that each sheet is one place the players can visit. Never group places by kind of building, such as churches or taverns. Use more than one place structure only when the campaign moves between scales.',
  'Items and equipment must exist in the era and technology of the world: no pistols in a medieval world. Items are utilities, such as consumables, tools, keys and supplies. Weapons, armor and clothing go in an equipment structure, only when combat or looks matter to the story.',
  'When the system lists suggested structures, prefer the most essential of them and skip the ones that break these rules.',
  'Give each structure the structure tags from the list that fit, using their slugs, or none when no tag fits. The description of a tag says what it means for the game master.',
  `Give each structure ${MIN_FIELDS} to ${MAX_FIELDS} fields, only the essential ones. The atores structure gets up to ${MAX_ACTOR_FIELDS}. A field has a label, a type and, when it fits, one or more field tags from the list, using their slugs. A choice field also lists its options.`,
  'Every sheet already has its own name: never propose a name field. Titles, nicknames and ranks go in a field with the titulo tag.',
  'Sheets relate to each other with friendship, alliance, neutrality, rivalry, hatred or prejudice. Give every structure whose sheets can relate, such as characters, groups, peoples or places, a long-text field with the descricao tag that describes the sheet and its relationships.',
  'Player characters have one to three meters as progress fields, chosen for this story: health, stamina, mana, ki, rage, sanity, battery, hunger, reputation or anything else that rises and falls. A meter can be what the player must keep high or lose, such as a relationship in a school story. The story may have no health at all.',
  'Player characters also have attributes as number fields. Classic ones such as strength, dexterity or constitution fit only classic fantasy. Invent attributes that match how this story is played, such as charm, grades and popularity at school, or reflexes, code and contacts for hackers. A choice field, such as an origin, class or approach, may replace numbers when it fits better.',
  'Besides meters and attributes, draw the fields of every atores structure from these character areas, choosing the ones this campaign makes interesting. Add a field outside them only when the story needs it:',
  ...[...REQUIRED, ...POSSIBILITIES].map((area) => `- ${area}`),
  'Other structures may use progress too, such as the alert of a district or the loyalty of a faction. Never propose relations to other structures.',
  'When the request lists kept structures, they already exist: never propose them again. When it lists structures to replace, propose exactly that many new ones, one for each in the same order, different from the kept and the replaced ones. Give the atores tag to a new structure only when no kept structure has it.',
  'When a structure to replace keeps fields, its replacement keeps them too: build the new structure around them and never propose them again.',
  'Write names, labels and options in the output language.',
].join('\n');
