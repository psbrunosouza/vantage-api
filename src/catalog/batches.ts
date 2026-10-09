const SIZE = 5000;

export function batches<T>(items: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / SIZE) }, (_, index) =>
    items.slice(index * SIZE, (index + 1) * SIZE),
  );
}
