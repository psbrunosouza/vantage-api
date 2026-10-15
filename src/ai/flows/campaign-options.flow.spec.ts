import { describe, expect, it } from 'vitest';
import { campaignThemes } from './campaign-options.flow.js';

describe('campaignThemes', () => {
  it('uses the chosen theme for every campaign', () => {
    expect(campaignThemes('dark fantasy', ['space opera'])).toEqual([
      'dark fantasy',
      'dark fantasy',
      'dark fantasy',
    ]);
  });

  it('falls back to one random theme per campaign', () => {
    expect(campaignThemes(undefined, ['horror', 'wuxia', 'cyberpunk'])).toEqual(
      ['horror', 'wuxia', 'cyberpunk'],
    );
  });
});
