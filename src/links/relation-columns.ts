import { z } from 'zod';
import type { ResourceValues } from '../resources/resources.schema.js';
import type { StructureField } from '../structures/structure-field.js';

const TABLE = 'table';
const CHOICE = 'choice';
const PICKERS = [CHOICE, 'boxes'];

const cardinality = z.enum(['one', 'many']);

const relationColumnSchema = z.object({
  id: z.string(),
  type: z.literal('relation'),
  relation: z.object({
    structureId: z.string(),
    targets: cardinality,
    sources: cardinality,
  }),
});

const tableConfigSchema = z.object({ columns: z.array(z.unknown()) });

const pickerConfigSchema = z.object({
  relation: z.object({ structureId: z.string().min(1) }),
});

const tableValueSchema = z.object({
  rows: z.array(z.object({ id: z.string() })),
});

export type RelationColumn = z.infer<typeof relationColumnSchema>;

export type Relation = RelationColumn['relation'];

export function relationColumns(field: StructureField): RelationColumn[] {
  if (field.type !== TABLE) return [];

  const config = tableConfigSchema.safeParse(field['table']);
  if (!config.success) return [];

  return config.data.columns.flatMap((column) => {
    const parsed = relationColumnSchema.safeParse(column);
    return parsed.success ? [parsed.data] : [];
  });
}

export function fieldRelation(field: StructureField): Relation | undefined {
  if (!PICKERS.includes(field.type)) return undefined;

  const config = pickerConfigSchema.safeParse(field['chips']);
  if (!config.success) return undefined;

  return {
    structureId: config.data.relation.structureId,
    targets: field.type === CHOICE ? 'one' : 'many',
    sources: 'many',
  };
}

function relationsOf(field: StructureField): [string, string][] {
  const relation = fieldRelation(field);
  const columns = relationColumns(field).map((column): [string, string] => [
    keyOf(field.id, column.id),
    column.relation.structureId,
  ]);

  return relation === undefined
    ? columns
    : [...columns, [keyOf(field.id, null), relation.structureId]];
}

export function relationTargets(
  fields: readonly StructureField[],
): Map<string, string> {
  return new Map(fields.flatMap(relationsOf));
}

export function tableRowIds(values: ResourceValues, fieldId: string): string[] {
  const table = tableValueSchema.safeParse(values[fieldId]);
  return table.success ? table.data.rows.map((row) => row.id) : [];
}

export function keyOf(fieldId: string, id: string | null): string {
  return `${fieldId}/${id ?? ''}`;
}
