import { CARDS, type CardId } from "./engine";
import {
  BASE_STAGES,
  LESSONS,
  completedLessons,
  type LearningProgress,
} from "./headquarters";
import { masteryRank, type Mastery } from "./mastery";

export type RewardReveal = {
  kind: "style" | "base" | "mastery" | "lesson";
  kicker: string;
  title: string;
  detail: string;
  badge: string;
  extraCount: number;
  cardId?: CardId;
};

export function rewardReveal(
  beforeLearning: LearningProgress,
  afterLearning: LearningProgress,
  beforeMastery: Mastery,
  afterMastery: Mastery,
  beforeBaseStage: number,
  afterBaseStage: number,
): RewardReveal | null {
  const lessonUnlocks = LESSONS.filter(
    (lesson) =>
      (beforeLearning.counts[lesson.id] ?? 0) < lesson.goal &&
      (afterLearning.counts[lesson.id] ?? 0) >= lesson.goal,
  );
  const masteryUnlocks = CARDS.filter((card) => {
    if (card.kind !== "unit") return false;
    return (
      masteryRank(beforeMastery.units[card.id] ?? 0).frame !==
      masteryRank(afterMastery.units[card.id] ?? 0).frame
    );
  });
  const auroraUnlocked =
    completedLessons(beforeLearning) < LESSONS.length &&
    completedLessons(afterLearning) === LESSONS.length;
  const baseUnlocked = afterBaseStage > beforeBaseStage;
  const milestoneCount =
    lessonUnlocks.length +
    masteryUnlocks.length +
    Number(auroraUnlocked) +
    Number(baseUnlocked);
  if (!milestoneCount) return null;

  const extra = (used: number) => Math.max(0, milestoneCount - used);

  if (auroraUnlocked)
    return {
      kind: "style",
      kicker: "GESTALTUNG FREIGESCHALTET",
      title: "AURORA",
      detail: "Alle vier Lernaufträge geschafft. Aurora kann jetzt in deiner Basis ausgerüstet werden.",
      badge: "✦",
      extraCount: extra(1),
    };

  if (baseUnlocked) {
    const stage = BASE_STAGES[Math.min(afterBaseStage, BASE_STAGES.length - 1)];
    return {
      kind: "base",
      kicker: "HAUPTQUARTIER AUSGEBAUT",
      title: stage.name.toUpperCase(),
      detail: stage.description,
      badge: `HQ ${Math.min(afterBaseStage + 1, BASE_STAGES.length)}`,
      extraCount: extra(1),
    };
  }

  const masteryCard = masteryUnlocks[0];
  if (masteryCard) {
    const rank = masteryRank(afterMastery.units[masteryCard.id] ?? 0);
    return {
      kind: "mastery",
      kicker: "NEUER KARTENRAHMEN",
      title: `${masteryCard.name} · ${rank.name}`,
      detail: `${masteryCard.name} hat den ${rank.name}-Rang erreicht. Der neue Rahmen ist sofort aktiv.`,
      badge: rank.name.toUpperCase(),
      extraCount: extra(1),
      cardId: masteryCard.id,
    };
  }

  const lesson = lessonUnlocks[0];
  if (!lesson) return null;
  return {
    kind: "lesson",
    kicker: "LERNAUFTRAG ERFÜLLT",
    title: lesson.name,
    detail: lesson.tip,
    badge: `${completedLessons(afterLearning)}/${LESSONS.length}`,
    extraCount: extra(1),
  };
}
