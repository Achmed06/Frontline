/** New visual environments only: territory, paths and combat stay identical. */
export const ARENA_THEMES = {
  coast: { name: "Smaragdküste", water: 0x12556d, ground: 0x536955, edge: 0xb9c887, neutral: 0x8b8158, accent: 0x66e1ed },
  frost: { name: "Frostrelais", water: 0x214778, ground: 0x648d9e, edge: 0xc8f5ff, neutral: 0x728faf, accent: 0xa5ebff },
  ember: { name: "Glutbruch", water: 0x612c40, ground: 0x936345, edge: 0xffc17c, neutral: 0xa47e50, accent: 0xffa04f },
  nexus: { name: "Nexuskern", water: 0x302855, ground: 0x605180, edge: 0xc7a4ff, neutral: 0x786093, accent: 0xb9a0ff },
} as const;
export type ArenaThemeId = keyof typeof ARENA_THEMES;
export function isArenaTheme(value: unknown): value is ArenaThemeId {
  return typeof value === "string" && Object.hasOwn(ARENA_THEMES, value);
}
