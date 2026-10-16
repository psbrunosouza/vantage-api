import { describe, expect, it } from 'vitest';
import { closedItemsOf } from './closed-items.js';

describe('closedItemsOf', () => {
  it('returns only the items already closed in a partial result', () => {
    expect(
      closedItemsOf(
        '{"structures": [{"name":"Portos","tags":[]}, {"name":"Tri',
      ),
    ).toEqual(['{"name":"Portos","tags":[]}']);
  });

  it('keeps nested arrays and objects inside the item', () => {
    const item =
      '{"name":"Navios","fields":[{"label":"Casco","options":["a"]}]}';

    expect(closedItemsOf(`{"structures":[${item}]}`)).toEqual([item]);
  });

  it('ignores braces and quotes inside strings', () => {
    const item = '{"name":"Ordem {secreta} \\"x\\"","tags":["]"]}';

    expect(closedItemsOf(`{"structures":[${item},{"name":"`)).toEqual([item]);
  });

  it('returns nothing before the first item closes', () => {
    expect(closedItemsOf('')).toEqual([]);
    expect(closedItemsOf('{"structures":[{"name":"Por')).toEqual([]);
  });
});
