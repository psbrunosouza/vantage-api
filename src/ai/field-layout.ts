import { randomUUID } from 'node:crypto';
import type { StructureField } from '../structures/structure-field.js';

const COLUMNS = 12;

export const AI_FIELD_SIZES = {
  number: { span: 2, rows: 1 },
  'short-text': { span: 2, rows: 1 },
  'long-text': { span: 3, rows: 2 },
  progress: { span: 3, rows: 1 },
  choice: { span: 2, rows: 1 },
} as const;

export type AiFieldType = keyof typeof AI_FIELD_SIZES;

export interface AiFieldDraft {
  type: AiFieldType;
  label: string;
  options: string[];
}

export function layoutFields(
  existing: readonly StructureField[],
  drafts: readonly AiFieldDraft[],
): StructureField[] {
  let row = existing.reduce(
    (bottom, field) => Math.max(bottom, field.row + field.rows),
    1,
  );
  let column = 1;
  let height = 0;

  return drafts.map((draft) => {
    const { span, rows } = AI_FIELD_SIZES[draft.type];

    if (column + span - 1 > COLUMNS) {
      row += height;
      column = 1;
      height = 0;
    }

    const field: StructureField = {
      id: randomUUID(),
      type: draft.type,
      label: draft.label,
      options: draft.options,
      column,
      row,
      span,
      rows,
    };

    column += span;
    height = Math.max(height, rows);

    return field;
  });
}
