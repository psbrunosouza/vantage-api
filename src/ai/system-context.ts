import { z } from 'zod';
import type { Campaign } from '../campaigns/campaigns.schema.js';
import type { StructureField } from '../structures/structure-field.js';
import type {
  WorldFieldTag,
  WorldSystem,
  WorldStructure,
} from './world-source.js';

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

export function describeFields(
  fields: readonly StructureField[],
  fieldTags: readonly WorldFieldTag[] = [],
): string {
  const fillable = fillableFields(fields);

  if (fillable.length === 0) {
    return 'no fields yet';
  }

  return fillable
    .map((field) => {
      const kind =
        field.options.length > 0
          ? `${TYPE_LABELS[field.type]}: ${field.options.join(', ')}`
          : TYPE_LABELS[field.type];
      const meanings = (field.tagIds ?? []).flatMap((id) => {
        const tag = fieldTags.find((candidate) => candidate.id === id);
        return tag ? [`@${tag.slug}: ${tag.description}`] : [];
      });
      return meanings.length > 0
        ? `${field.label} (${kind}; ${meanings.join('; ')})`
        : `${field.label} (${kind})`;
    })
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

export function describeSystem(
  system: WorldSystem,
  structures: readonly WorldStructure[],
  fieldTags: readonly WorldFieldTag[] = [],
): string {
  return [
    `System: ${system.name}`,
    `Description: ${system.description ?? 'none'}`,
    `Main die: ${system.mainDie ?? 'none'}`,
    'Structures:',
    ...structures.map((structure) => {
      const tags = structure.tags.map(
        (tag) => `@${tag.slug}: ${tag.description}`,
      );
      const header = [
        structure.name,
        ...(tags.length > 0 ? [`(${tags.join('; ')})`] : []),
      ].join(' ');
      const note = structure.aiNote ? ` Note: ${structure.aiNote}` : '';
      return `- ${header}: ${describeFields(structure.fields, fieldTags)}.${note}`;
    }),
  ].join('\n');
}

export function describeCampaign(campaign: Campaign): string {
  const {
    opening,
    setting,
    culture,
    politics,
    tone,
    localTheme,
    hook,
    problem,
    escalation,
    complications,
    npcs,
  } = campaign.brief;

  return [
    `Campaign: ${campaign.title}`,
    `Premise: ${campaign.premise}`,
    `Opening: ${opening}`,
    `Setting: ${setting}`,
    `Culture and people: ${culture}`,
    `Politics: ${politics}`,
    `Tone: ${tone}`,
    `Local theme: ${localTheme}`,
    `Hook: ${hook}`,
    `Central problem: ${problem}`,
    `Escalation: ${escalation}`,
    'Related problems:',
    ...complications.map((complication) => `- ${complication}`),
    'NPCs:',
    ...npcs.map((npc) => `- ${npc.name} (${npc.role}): ${npc.description}`),
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
