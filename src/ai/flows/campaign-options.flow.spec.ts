import { describe, expect, it } from 'vitest';
import { campaignGoals, themeSets } from './campaign-options.flow.js';

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

describe('campaignGoals', () => {
  it('gives each campaign a different goal', () => {
    const goals = campaignGoals();

    expect(goals).toHaveLength(3);
    expect(new Set(goals).size).toBe(3);
  });

  it('shuffles with the given random source', () => {
    expect(campaignGoals(() => 0)).toEqual(['hunt', 'steal', 'rescue']);
  });
});
