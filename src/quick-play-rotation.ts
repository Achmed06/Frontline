import {
  ARENA_THEMES,
  type ArenaThemeId,
} from "./arena-themes";

const QUICK_PLAY_THEMES: readonly ArenaThemeId[] = [
  "coast",
  "frost",
  "ember",
  "nexus",
] as const;

export type QuickPlayRotation = {
  theme: ArenaThemeId;
  arenaName: string;
  matchNumber: number;
  difficulty: "rookie" | "standard";
  difficultyLabel: "REKRUT" | "TAKTIKER";
};

export function quickPlayRotation(
  completedMatches: number,
): QuickPlayRotation {
  const safeMatches =
    Number.isFinite(completedMatches) && completedMatches > 0
      ? Math.floor(completedMatches)
      : 0;
  const theme = QUICK_PLAY_THEMES[safeMatches % QUICK_PLAY_THEMES.length];
  const difficulty = safeMatches === 0 ? "rookie" : "standard";
  return {
    theme,
    arenaName: ARENA_THEMES[theme].name,
    matchNumber: safeMatches + 1,
    difficulty,
    difficultyLabel: difficulty === "rookie" ? "REKRUT" : "TAKTIKER",
  };
}
