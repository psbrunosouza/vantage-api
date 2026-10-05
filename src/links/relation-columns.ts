import { z } from 'zod';
import type { ResourceValues } from '../resources/resources.schema.js';
import type { StructureField } from '../structures/structure-field.js';

const TABLE = 'table';

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

const tableValueSchema = z.object({
  rows: z.array(z.object({ id: z.string() })),
});

export type RelationColumn = z.infer<typeof relationColumnSchema>;

export interface RelationKey {
  fieldId: string;
  columnId: string;
}

export function relationColumns(field: StructureField): RelationColumn[] {
  if (field.type !== TABLE) return [];

  const config = tableConfigSchema.safeParse(field['table']);
  if (!config.success) return [];

  return config.data.columns.flatMap((column) => {
    const parsed = relationColumnSchema.safeParse(column);
    return parsed.success ? [parsed.data] : [];
  });
}

export function staleRelations(
  before: readonly StructureField[],
  after: readonly StructureField[],
): RelationKey[] {
  const kept = new Map(
    after.flatMap((field) =>
      relationColumns(field).map((column) => [
        keyOf(field.id, column.id),
        column.relation.structureId,
      ]),
    ),
  );

  return before.flatMap((field) =>
    relationColumns(field)
      .filter(
        (column) =>
          kept.get(keyOf(field.id, column.id)) !==
          column.relation.structureId,
      )
      .map((column) => ({ fieldId: field.id, columnId: column.id })),
  );
}

export function tableRowIds(values: ResourceValues, fieldId: string): string[] {
  const table = tableValueSchema.safeParse(values[fieldId]);
  return table.success ? table.data.rows.map((row) => row.id) : [];
}

export function keyOf(fieldId: string, id: string): string {
  return `${fieldId}/${id}`;
}
