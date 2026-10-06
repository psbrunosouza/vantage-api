import { z } from 'zod';
import type { Campaign } from '../campaigns/campaigns.schema.js';
import type { Journey } from '../journeys/journeys.schema.js';
import type { StructureField } from '../structures/structure-field.js';
import { ACTOR, type Structure } from '../structures/structures.schema.js';

const relationSource = z.looseObject({
  chips: z.looseObject({
    relation: z.looseObject({ structureId: z.string() }),
  }),
});

const progressValue = z.object({ current: z.number(), max: z.number() });

const TYPE_LABELS: Record<string, string> = {
  number: 'number',
  'short-text': 'short text',
  'long-text': 'long text',
  progress: 'current / max',
  toggle: 'yes or no',
  choice: 'one of',
  boxes: 'any of',
};

export function fillableFields(
  fields: readonly StructureField[],
): StructureField[] {
  return fields.filter(
    (field) =>
      TYPE_LABELS[field.type] !== undefined &&
      !relationSource.safeParse(field).success,
  );
}

export function describeFields(fields: readonly StructureField[]): string {
  const fillable = fillableFields(fields);

  if (fillable.length === 0) {
    return 'no fields yet';
  }

  return fillable
    .map((field) =>
      field.options.length > 0
        ? `${field.label} (${TYPE_LABELS[field.type]}: ${field.options.join(', ')})`
        : `${field.label} (${TYPE_LABELS[field.type]})`,
    )
    .join('; ');
}

export function describeValues(
  fields: readonly StructureField[],
  values: Record<string, unknown>,
): string {
  return fillableFields(fields)
    .flatMap((field) => {
      const value = formatValue(field.type, values[field.id]);
      return value === null ? [] : [`${field.label}: ${value}`];
    })
    .join('\n');
}

export function describeJourney(
  journey: Journey,
  structures: readonly Structure[],
): string {
  return [
    `Journey: ${journey.name}`,
    `Description: ${journey.description ?? 'none'}`,
    `Main die: ${journey.mainDie ?? 'none'}`,
    'Structures:',
    ...structures.map(
      (structure) =>
        `- ${structure.name}${structure.capability === ACTOR ? ' (player characters)' : ''}: ${describeFields(structure.fields)}`,
    ),
  ].join('\n');
}

export function describeCampaign(campaign: Campaign): string {
  const { setting, tone, hook, objective, npcs } = campaign.brief;

  return [
    `Campaign: ${campaign.title}`,
    `Premise: ${campaign.premise}`,
    `Setting: ${setting}`,
    `Tone: ${tone}`,
    `Hook: ${hook}`,
    `Objective: ${objective}`,
    'NPCs:',
    ...npcs.map((npc) => `- ${npc.name}: ${npc.role}`),
  ].join('\n');
}

function formatValue(type: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (type === 'progress') {
    const progress = progressValue.safeParse(value);
    return progress.success
      ? `${progress.data.current} / ${progress.data.max}`
      : null;
  }

  if (type === 'toggle') {
    return value === true ? 'yes' : 'no';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : null;
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null;
}
