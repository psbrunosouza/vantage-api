import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { StructureField } from '../structures/structure-field.js';
import type { ResourceValues } from './resources.schema.js';

const tableCell = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

const VALUE_SCHEMAS: Partial<Record<string, z.ZodType>> = {
  number: z.number(),
  'short-text': z.string(),
  'long-text': z.string(),
  progress: z.object({ current: z.number(), max: z.number() }),
  toggle: z.boolean(),
  choice: z.string(),
  boxes: z.array(z.string()),
  table: z.object({
    rows: z.array(
      z.object({ id: z.string(), cells: z.record(z.string(), tableCell) }),
    ),
  }),
  image: z.string(),
};

export function parseResourceValues(
  fields: readonly StructureField[],
  values: ResourceValues,
): ResourceValues {
  const shape = Object.fromEntries(
    fields.flatMap((field) => {
      const schema = VALUE_SCHEMAS[field.type];
      return schema ? [[field.id, schema.optional()]] : [];
    }),
  );

  return new ZodValidationPipe(z.object(shape)).transform(values);
}
