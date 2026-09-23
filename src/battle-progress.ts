import { CARDS, type CardId } from "./engine";
import { LESSONS, type LearningProgress } from "./headquarters";
import {
  MASTERY_PLAYS,
  MASTERY_RANKS,
  type Mastery,
} from "./mastery";

export type BattleProgressCue = {
  kind: "learning" | "mastery";
  kicker: string;
  title: string;
  detail: string;
  current: number;
  goal: number;
  progress: number;
  reward: string;
  cardId?: CardId;
};

export function nextBattleProgress(
  learning: LearningProgress,
  mastery: Mastery,
  deck: readonly CardId[],
): BattleProgressCue | null {
  const lesson = LESSONS.find(
    (item) => (learning.counts[item.id] ?? 0) < item.goal,
  );
  if (lesson) {
    const current = Math.min(
      lesson.goal,
      Math.max(0, Math.floor(learning.counts[lesson.id] ?? 0)),
    );
    return {
      kind: "learning",
      kicker: "NÄCHSTER FORTSCHRITT",
      title: lesson.name,
      detail: lesson.tip,
      current,
      goal: lesson.goal,
      progress: lesson.goal > 0 ? current / lesson.goal : 1,
      reward: "AURORA · FELDAUSBILDUNG",
    };
  }

  const candidates = deck
    .map((id, index) => {
      const card = CARDS.find((item) => item.id === id);
      if (!card || card.kind !== "unit") return null;
      const current = Math.max(0, Math.floor(mastery.units[id] ?? 0));
      const next = MASTERY_RANKS.find((rank) => rank.goal > current);
      if (!next) return null;
      return {
        id,
        index,
        name: card.name,
        current,
        next,
        remaining: next.goal - current,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort(
      (a, b) =>
        a.remaining - b.remaining ||
        b.current - a.current ||
        a.index - b.index,
    );

  const target = candidates[0];
  if (!target) return null;
  return {
    kind: "mastery",
    kicker: "NÄCHSTER KARTENRAHMEN",
    title: `${target.name} → ${target.next.name}`,
    detail: `Setze ${target.name} mindestens ${MASTERY_PLAYS}× in einem Gefecht ein, damit seine Mastery weiter steigt.`,
    current: target.current,
    goal: target.next.goal,
    progress:
      target.next.goal > 0
        ? Math.min(1, target.current / target.next.goal)
        : 1,
    reward: `${target.next.name.toUpperCase()}-RAHMEN`,
    cardId: target.id,
  };
}
