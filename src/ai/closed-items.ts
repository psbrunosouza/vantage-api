const ITEM_DEPTH = 3;

export function closedItemsOf(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === '{' || char === '[') {
      depth++;

      if (depth === ITEM_DEPTH && char === '{') {
        start = index;
      }
    } else if (char === '}' || char === ']') {
      if (depth === ITEM_DEPTH && start !== -1) {
        items.push(text.slice(start, index + 1));
        start = -1;
      }

      depth--;
    }
  }

  return items;
}
