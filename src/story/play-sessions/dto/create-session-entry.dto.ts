import { z } from 'zod';

const text = z.string().min(1);

export const createSessionEntrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('narrator'), text }),
  z.object({ kind: z.literal('player'), resourceId: z.uuid(), text }),
]);

export type CreateSessionEntryDto = z.infer<typeof createSessionEntrySchema>;
