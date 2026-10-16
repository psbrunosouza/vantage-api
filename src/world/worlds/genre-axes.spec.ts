import { GENRE_AXES, GENRE_CATALOG, genreLabel } from './genre-axes.js';

describe('GENRE_CATALOG', () => {
  it('has unique ids inside every axis', () => {
    for (const axis of GENRE_AXES) {
      const ids = GENRE_CATALOG[axis].map((option) => option.id);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('names every option in every language', () => {
    for (const axis of GENRE_AXES) {
      for (const option of GENRE_CATALOG[axis]) {
        expect(Object.keys(option.labels).sort()).toEqual(
          ['en', 'es', 'pt-BR', 'zh-CN'].sort(),
        );
      }
    }
  });
});

describe('genreLabel', () => {
  it('names an option in the requested language', () => {
    expect(genreLabel('scale', 'small-towns')).toBe('Small towns');
    expect(genreLabel('scale', 'small-towns', 'pt-BR')).toBe(
      'Cidades pequenas',
    );
  });

  it('falls back to the id of an unknown option', () => {
    expect(genreLabel('scale', 'galaxy')).toBe('galaxy');
  });
});
