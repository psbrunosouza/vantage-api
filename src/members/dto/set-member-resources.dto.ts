import { z } from 'zod';

export const setMemberResourcesSchema = z.object({
  resourceIds: z.array(z.uuid()),
});

export type SetMemberResourcesDto = z.infer<typeof setMemberResourcesSchema>;
