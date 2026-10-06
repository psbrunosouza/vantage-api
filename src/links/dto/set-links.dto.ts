import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { links } from '../links.schema.js';

export const setLinksSchema = createInsertSchema(links, {
  fieldId: (schema) => schema.min(1),
})
  .pick({ fieldId: true })
  .extend({
    rowId: z.string().min(1).nullable(),
    columnId: z.string().min(1).nullable(),
    targetIds: z.array(z.uuid()),
  })
  .refine((dto) => (dto.rowId === null) === (dto.columnId === null), {
    message: 'rowId and columnId go together.',
  });

export type SetLinksDto = z.infer<typeof setLinksSchema>;
