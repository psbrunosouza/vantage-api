export const MEMBER_COLORS = [
  'royal',
  'violet',
  'orchid',
  'rose',
  'ember',
  'amber',
  'emerald',
  'cyan',
] as const;

export function pickMemberColor(taken: readonly string[]): string {
  const free = MEMBER_COLORS.filter((color) => !taken.includes(color));
  const pool = free.length > 0 ? free : MEMBER_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}
