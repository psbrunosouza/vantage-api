import { z } from 'zod';
import type { StructureField } from '../structures/structure-field.js';

export const progressSchema = z.object({
  current: z.number(),
  max: z.number(),
});

export function valueSchemaOf(field: StructureField): z.ZodType {
  const option = field.options.length > 0 ? z.enum(field.options) : z.string();

  switch (field.type) {
    case 'number':
      return z.number();
    case 'progress':
      return progressSchema;
    case 'toggle':
      return z.boolean();
    case 'choice':
      return option;
    case 'boxes':
      return z.array(option);
    default:
      return z.string();
  }
}

export function keysOf(fields: StructureField[]): Map<string, StructureField> {
  const keyed = new Map<string, StructureField>();

  for (const field of fields) {
    const base = slugOf(field.label) || 'field';
    let key = base;

    for (let suffix = 2; keyed.has(key); suffix++) {
      key = `${base}_${suffix}`;
    }

    keyed.set(key, field);
  }

  return keyed;
}

function slugOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function valuesSchemaOf(keyed: Map<string, StructureField>) {
  return z.object(
    Object.fromEntries(
      [...keyed].map(([key, field]) => [
        key,
        valueSchemaOf(field).describe(field.label),
      ]),
    ),
  );
}

export function valuesById(
  keyed: Map<string, StructureField>,
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    [...keyed].map(([key, field]) => [field.id, values[key]]),
  );
}
