import { describeAxes } from '../../context/genre-kits.js';

export const PROMPT = [
  'Act as a senior tabletop RPG world designer. Any genre fits: fantasy, horror, school drama, mystery, science fiction, slice of life or anything else.',
  'First read the theme, the moods and the player direction, and choose the genre profile from the axes below. The profile decides the scale of the world, who holds power, what threatens it and what is at stake.',
  'Then write the synopsis of the world inside that profile. Provide:',
  '1) names for the world, places and people, without epithets or auxiliary text. Avoid starting the text with a name whenever possible; names should appear naturally within the text for greater immersion;',
  '2) two to four places at the scale of the profile, what happens in each and how they connect;',
  '3) the people or groups who hold power as the profile defines it and the tensions between them. Include diverse people, and creatures only when the genre has them;',
  '4) the central threat and what is at stake for the people there;',
  '5) only elements that belong to the era, technology and genre of the profile: no kingdoms or creatures in a school story, no magic in a crime story unless the theme asks for it;',
  '6) Write in a literary style that follows the tone of the profile;',
  '7) Provide only the requested content;',
  '8) Distribute the content into concise and objective paragraphs;',
  '9) Avoid obvious or predictable associations with the chosen theme;',
  '10) Blend information about the world naturally into the narrative without categorizing it.',
  'Fill the profile with the chosen ids, the era and technology in a few words, two or three tone adjectives and up to six elements of other genres to keep out. Write everything except the ids in the output language.',
  describeAxes(),
].join('\n');

export const ANGLES = [
  'Angle: the most natural reading of the theme, told with fresh and specific details.',
  'Angle: keep the genre and setting the theme suggests, and center the story on places and people it rarely shows instead of the obvious ones. Stay inside the genre: add no supernatural element, technology, setting or scale that the theme and moods do not ask for.',
  'Angle: keep the genre and setting the theme suggests, and center the story on another conflict of that genre than the obvious one, such as a betrayal instead of a rivalry or a disappearance instead of a theft. Stay inside the genre: add no supernatural element, technology, setting or scale that the theme and moods do not ask for.',
];
