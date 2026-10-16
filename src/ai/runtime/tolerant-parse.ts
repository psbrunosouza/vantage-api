import type { z } from 'zod';

type Issue = z.core.$ZodIssue;
type Container = Record<PropertyKey, unknown>;

export function tolerantParse<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed;
  }

  const repaired = structuredClone(value);
  const fixed = [...parsed.error.issues]
    .sort((first, second) => second.path.length - first.path.length)
    .filter((issue) => repair(repaired, issue));

  return fixed.length > 0 ? schema.safeParse(repaired) : parsed;
}

function repair(root: unknown, issue: Issue): boolean {
  const key = issue.path.at(-1);
  const parent = issue.path
    .slice(0, -1)
    .reduce<unknown>(
      (node, step) => (isContainer(node) ? node[step] : undefined),
      root,
    );

  if (key === undefined || !isContainer(parent)) {
    return false;
  }

  const fitted = fittedValue(parent[key], issue);

  if (fitted === undefined) {
    return false;
  }

  parent[key] = fitted;
  return true;
}

function fittedValue(value: unknown, issue: Issue): unknown {
  if (issue.code === 'too_big' && issue.inclusive !== false) {
    const limit = Number(issue.maximum);

    if (typeof value === 'string') {
      return shortened(value, limit);
    }

    if (Array.isArray(value)) {
      return value.slice(0, limit);
    }

    if (typeof value === 'number') {
      return limit;
    }
  }

  if (
    issue.code === 'too_small' &&
    issue.inclusive !== false &&
    typeof value === 'number'
  ) {
    return Number(issue.minimum);
  }

  return undefined;
}

export function shortened(text: string, limit: number): string {
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  const words = text.length > limit && space > limit * 0.6;

  return (words ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/u, '');
}

function isContainer(node: unknown): node is Container {
  return typeof node === 'object' && node !== null;
}
