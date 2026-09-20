/** New local unit mastery: rewarded participation, never combat power. */
import { CARDS, type CardId, type MatchState } from "./engine";
export const MASTERY_PLAYS = 3;
export const MASTERY_RANKS = [
  { goal: 0, name: "Rekrut", frame: "none" },
  { goal: 1, name: "Bronze", frame: "bronze" },
  { goal: 5, name: "Silber", frame: "silver" },
  { goal: 15, name: "Gold", frame: "gold" },
] as const;
export type Mastery = {
  units: Partial<Record<CardId, number>>;
  lastMatch: string;
};
export function normalizeMastery(value: unknown): Mastery {
  const result: Mastery = { units: {}, lastMatch: "" };
  if (!value || typeof value !== "object") return result;
  const source = value as Partial<Mastery>;
  for (const card of CARDS) {
    const count = source.units?.[card.id];
    if (
      card.kind === "unit" &&
      typeof count === "number" &&
      Number.isFinite(count) &&
      count > 0
    )
      result.units[card.id] = Math.min(15, Math.floor(count));
  }
  if (typeof source.lastMatch === "string" && source.lastMatch.length < 160)
    result.lastMatch = source.lastMatch;
  return result;
}
export function masteryRank(count: number) {
  return MASTERY_RANKS.reduce(
    (rank, candidate) => (count >= candidate.goal ? candidate : rank),
    MASTERY_RANKS[0] as (typeof MASTERY_RANKS)[number],
  );
}
export function masteryLabel(progress: Mastery, id: CardId): string {
  const count = progress.units[id] ?? 0;
  const rank = masteryRank(count);
  const next = MASTERY_RANKS.find((item) => item.goal > count);
  return next
    ? `${rank.name} · ${count}/${next.goal} bis ${next.name}`
    : "Gold · Gemeistert";
}
export function advanceMastery(
  progress: Mastery,
  state: MatchState,
  matchId: string,
): Mastery {
  if (state.phase !== "ended" || !matchId || progress.lastMatch === matchId)
    return progress;
  const next = normalizeMastery(progress);
  for (const card of CARDS) {
    if (
      card.kind === "unit" &&
      (state.stats.unitPlays[card.id] ?? 0) >= MASTERY_PLAYS
    )
      next.units[card.id] = Math.min(15, (next.units[card.id] ?? 0) + 1);
  }
  next.lastMatch = matchId;
  return next;
}
