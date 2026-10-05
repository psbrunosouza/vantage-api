import { z } from 'zod';

export const structureFieldSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string(),
  column: z.int(),
  row: z.int(),
  span: z.int(),
  rows: z.int(),
  options: z.array(z.string()),
});

export type StructureField = z.infer<typeof structureFieldSchema>;
