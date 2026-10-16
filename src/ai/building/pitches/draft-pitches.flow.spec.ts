import { describe, expect, it } from 'vitest';
import type { CampaignOption } from './pitches.flow.js';
import { draftOptionsOf } from './draft-pitches.flow.js';

const option = (theme: string): CampaignOption => ({
  theme,
  structures: [],
});

describe('draftOptionsOf', () => {
  it('keeps only the campaigns, without a world', () => {
    expect(
      draftOptionsOf([
        { status: 'fulfilled', value: option('Dragão') },
        { status: 'fulfilled', value: option('Fantasmas') },
      ]),
    ).toEqual([
      { option: option('Dragão'), world: null },
      { option: option('Fantasmas'), world: null },
    ]);
  });

  it('skips the campaigns that failed', () => {
    expect(
      draftOptionsOf([
        { status: 'rejected', reason: new Error('timeout') },
        { status: 'fulfilled', value: option('Assalto') },
      ]),
    ).toEqual([{ option: option('Assalto'), world: null }]);
  });

  it('fails with the first reason when every campaign failed', () => {
    const reason = new Error('no key');

    expect(() =>
      draftOptionsOf([
        { status: 'rejected', reason },
        { status: 'rejected', reason: new Error('timeout') },
      ]),
    ).toThrow(reason);
  });
});
