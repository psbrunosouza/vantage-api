import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { LOCALES, type Locale } from '../../core/auth/locales.js';

export const GENRE_AXES = [
  'scale',
  'power',
  'threat',
  'stakes',
  'pacing',
] as const;

export type GenreAxis = (typeof GENRE_AXES)[number];

const optionSchema = z.object({
  id: z.string().min(1),
  labels: z.record(z.enum(LOCALES), z.string().min(1)),
});

export type GenreOption = z.infer<typeof optionSchema>;

export const GENRE_CATALOG: Record<GenreAxis, GenreOption[]> = z
  .object({
    scale: z.array(optionSchema).min(1),
    power: z.array(optionSchema).min(1),
    threat: z.array(optionSchema).min(1),
    stakes: z.array(optionSchema).min(1),
    pacing: z.array(optionSchema).min(1),
  })
  .parse(
    JSON.parse(
      readFileSync(new URL('./genre-axes.json', import.meta.url), 'utf8'),
    ),
  );

export function genreIds(axis: GenreAxis): [string, ...string[]] {
  const [first, ...rest] = GENRE_CATALOG[axis].map((option) => option.id);
  return [first, ...rest];
}

export function genreLabel(
  axis: GenreAxis,
  id: string,
  locale: Locale = 'en',
): string {
  return (
    GENRE_CATALOG[axis].find((option) => option.id === id)?.labels[locale] ?? id
  );
}
