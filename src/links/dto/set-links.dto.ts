import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { links } from '../links.schema.js';

export const setLinksSchema = createInsertSchema(links, {
  fieldId: (schema) => schema.min(1),
  rowId: (schema) => schema.min(1),
  columnId: (schema) => schema.min(1),
})
  .pick({
    fieldId: true,
    rowId: true,
    columnId: true,
  })
  .extend({ targetIds: z.array(z.uuid()) });

export type SetLinksDto = z.infer<typeof setLinksSchema>;
