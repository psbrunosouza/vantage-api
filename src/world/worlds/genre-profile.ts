import { z } from 'zod';

export const SCALES = [
  'realm',
  'city',
  'town',
  'institution',
  'house',
  'frontier',
] as const;

export const POWERS = [
  'crown',
  'money',
  'status',
  'crime',
  'faith',
  'family',
  'knowledge',
] as const;

export const THREATS = [
  'war',
  'monster',
  'dread',
  'conspiracy',
  'mystery',
  'drama',
  'survival',
  'everyday',
] as const;

export const STAKES = [
  'life',
  'sanity',
  'status',
  'freedom',
  'bonds',
  'livelihood',
] as const;

export const PACINGS = [
  'slow-burn',
  'episodic',
  'escalating',
  'sandbox',
] as const;

export const genreProfileSchema = z.object({
  scale: z.enum(SCALES),
  power: z.array(z.enum(POWERS)).min(1).max(2),
  threat: z.array(z.enum(THREATS)).min(1).max(2),
  stakes: z.array(z.enum(STAKES)).min(1).max(2),
  pacing: z.enum(PACINGS),
  era: z.string().trim().min(1).max(60),
  tone: z.array(z.string().trim().min(1).max(30)).min(1).max(3),
  avoid: z.array(z.string().trim().min(1).max(40)).max(6),
});

export type GenreProfile = z.infer<typeof genreProfileSchema>;
