/** Палитра акцентов команд — спокойные, хорошо различимые на тёмном и светлом фоне */
export const TEAM_ACCENTS = [
  '#2dd4bf',
  '#60a5fa',
  '#a78bfa',
  '#fb923c',
  '#f472b6',
  '#a3e635',
  '#fbbf24',
  '#94a3b8',
] as const;

export function accentForIndex(index: number): string {
  return TEAM_ACCENTS[index % TEAM_ACCENTS.length]!;
}

export function teamAccent(team: { accent?: string }, index: number): string {
  const a = team.accent?.trim();
  if (a && /^#[0-9A-Fa-f]{6}$/.test(a)) return a;
  return accentForIndex(index);
}

/** Цвет игрока на экране (свой HEX или палитра по индексу) */
export function playerColor(player: { accent?: string }, index: number): string {
  const a = player.accent?.trim();
  if (a && /^#[0-9A-Fa-f]{6}$/.test(a)) return a;
  return accentForIndex(index);
}
