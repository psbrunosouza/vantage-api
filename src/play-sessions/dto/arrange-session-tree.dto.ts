import { z } from 'zod';

const folderItemSchema = z.object({
  kind: z.literal('folder'),
  id: z.uuid(),
  sessionIds: z.array(z.uuid()),
});

const sessionItemSchema = z.object({
  kind: z.literal('session'),
  id: z.uuid(),
});

export const arrangeSessionTreeSchema = z.object({
  items: z.array(
    z.discriminatedUnion('kind', [folderItemSchema, sessionItemSchema]),
  ),
});

export type ArrangeSessionTreeDto = z.infer<typeof arrangeSessionTreeSchema>;
