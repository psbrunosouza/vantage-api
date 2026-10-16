import { z } from 'zod';
import { genreProfileSchema } from '../genre-profile.js';

export const replaceWorldSchema = z.object({ profile: genreProfileSchema });

export type ReplaceWorldDto = z.infer<typeof replaceWorldSchema>;
