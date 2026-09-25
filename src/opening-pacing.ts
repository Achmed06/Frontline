export type OpeningDifficulty = "rookie" | "standard" | "veteran";

export function openingBotActionDelay(
  difficulty: OpeningDifficulty,
): number {
  switch (difficulty) {
    case "rookie":
      return 3.2;
    case "veteran":
      return 2;
    default:
      return 2.6;
  }
}
