import { z } from 'zod';
import { type GenreAxis, genreIds } from './genre-axes.js';

export const GENRE_PICKS = 3;

function picks(axis: GenreAxis) {
  return z
    .array(z.enum(genreIds(axis)))
    .min(1)
    .max(GENRE_PICKS);
}

export const genreProfileSchema = z.object({
  scale: picks('scale'),
  power: picks('power'),
  threat: picks('threat'),
  stakes: picks('stakes'),
  pacing: picks('pacing'),
  era: z.string().trim().min(1).max(60),
  tone: z.array(z.string().trim().min(1).max(30)).min(1).max(3),
  avoid: z.array(z.string().trim().min(1).max(40)).max(6),
});

export type GenreProfile = z.infer<typeof genreProfileSchema>;
