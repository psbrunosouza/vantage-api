import {
  SESSION_ZERO_OPTIONS,
  SESSION_ZERO_PROMPT,
} from '../../../story/session-zero/dto/replace-questions.dto.js';

export const QUESTIONS = { min: 3, max: 6 };

export const REQUIRED = [
  'Name: identity, nicknames and epithets.',
  'Background: origin, past, history and path.',
  'Personality: temperament, thoughts and behavior.',
  'Appearance: physical traits, style and presentation.',
];

export const POSSIBILITIES = [
  'Identity and origin: culture, species, ancestry, gender, languages and traditions; education, training and apprenticeships; defining events, losses, achievements and experiences; alternate identities, aliases and disguises.',
  'Psychology and behavior: motivations, goals, desires and ambitions; beliefs, values, principles and worldview; fears, traumas, weaknesses and vulnerabilities; inner conflicts, dilemmas and contradictions; secrets and hidden information; habits, quirks, likes and dislikes; sociability, communication and leadership; emotional expression, self-esteem and self-image; limits, taboos, dependencies and inner needs.',
  'Capabilities and conditions: skills, talents, knowledge and powers; limitations, difficulties and restrictions; health, physical conditions and disabilities; extraordinary traits, magic, mutations and implants; strategies, methods and decision making; specific knowledge and privileged information.',
  'Role and society: profession, function, rank and duties; status, authority, influence and reputation; affiliations, organizations, communities and factions; loyalties, promises, oaths, debts and obligations; relationship with society, institutions and surroundings; narrative role: protagonist, antagonist, mentor, ally or rival.',
  'Relationships: family, friendships, romances, rivalries and enmities; bonds with people, groups and places; trust, protection, dependence and mutual influence.',
  'Resources and circumstances: possessions, equipment, wealth and property; physical, emotional, financial and social situation; routine, home, customs and lifestyle; external constraints, laws, contracts, pursuits and curses.',
  'Narrative development: possible transformations and personal growth; future expectations, destiny and legacy; contradictions between desires, beliefs and actions.',
];

export const PROMPT = [
  'You prepare the session zero of a tabletop RPG played in Vantage.',
  `Write ${QUESTIONS.min} to ${QUESTIONS.max} questions that every new player answers while discovering their character, before the sheet exists.`,
  'Ask indirectly, through a short situation of the campaign, never as a form. Never presume who the character is.',
  'Between them, the questions always uncover these required fields of the character:',
  ...REQUIRED.map((field) => `- ${field}`),
  'Optional possibilities, by group. Use as many as the campaign makes interesting. They are ideas, not a checklist: go beyond them with any other kind of question that helps build the character.',
  ...POSSIBILITIES.map((group) => `- ${group}`),
  'Every answer feeds the fields of the character sheet built later.',
  `A single question has 2 to ${SESSION_ZERO_OPTIONS} options and the player picks one. A multiple question has 2 to ${SESSION_ZERO_OPTIONS} options and the player picks any. Give each option a short meaning of at most six words.`,
  'A text question is answered in the player own words. A number question has a minimum and a maximum.',
  'Players can always answer in their own words, so options are suggestions, not limits.',
  `The prompt is the title the player sees: one short sentence in the second person, at most ${SESSION_ZERO_PROMPT} characters. Never longer: cut the situation, keep the question.`,
  'Write in the language of the system.',
].join('\n');
