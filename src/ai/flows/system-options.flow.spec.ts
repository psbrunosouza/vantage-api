import { describe, expect, it } from 'vitest';
import { themeSets } from './system-options.flow.js';

describe('themeSets', () => {
  it('uses the chosen themes for every campaign', () => {
    expect(themeSets(['dark fantasy'], ['space opera'])).toEqual([
      ['dark fantasy'],
      ['dark fantasy'],
      ['dark fantasy'],
    ]);
  });

  it('falls back to one random theme per campaign', () => {
    expect(themeSets([], ['horror', 'wuxia', 'cyberpunk'])).toEqual([
      ['horror'],
      ['wuxia'],
      ['cyberpunk'],
    ]);
  });
});
