import { CHAPTERS, MISSIONS, type CampaignProgress } from "./campaign";
import type { DailyRecord } from "./daily-front";
import type { Mastery } from "./mastery";

export type BaseHonor = {
  id: string;
  name: string;
  detail: string;
  current: number;
  goal: number;
  unlocked: boolean;
};

function chapterRanges(): Array<{ title: string; start: number; end: number }> {
  return CHAPTERS.map((chapter, index) => {
    const start = MISSIONS.findIndex(
      (mission) => mission.id === chapter.firstMission,
    );
    const end =
      index + 1 < CHAPTERS.length
        ? MISSIONS.findIndex(
            (mission) => mission.id === CHAPTERS[index + 1].firstMission,
          )
        : MISSIONS.length;
    return { title: chapter.title, start, end };
  });
}

export function baseHonors(
  campaign: CampaignProgress,
  daily: readonly DailyRecord[],
  mastery: Mastery,
): BaseHonor[] {
  const honors: BaseHonor[] = chapterRanges().map((chapter, index) => {
    const missions = MISSIONS.slice(chapter.start, chapter.end);
    const current = missions.filter((mission) => campaign[mission.id]).length;
    return {
      id: `chapter-${index + 1}`,
      name: chapter.title,
      detail: `Kapitel ${index + 1} vollständig sichern`,
      current,
      goal: missions.length,
      unlocked: current >= missions.length,
    };
  });

  const completedDaily = daily.filter((record) => record.completed).length;
  honors.push({
    id: "daily-7",
    name: "SIEBEN FRONTEN",
    detail: "Sieben verschiedene Tagesfronten sichern",
    current: Math.min(7, completedDaily),
    goal: 7,
    unlocked: completedDaily >= 7,
  });

  const goldUnits = Object.values(mastery.units).filter(
    (value) => (value ?? 0) >= 15,
  ).length;
  honors.push({
    id: "gold-cadre",
    name: "GOLDKADER",
    detail: "Drei Einheiten bis Gold meistern",
    current: Math.min(3, goldUnits),
    goal: 3,
    unlocked: goldUnits >= 3,
  });

  const stars = Object.values(campaign).reduce(
    (sum, result) => sum + result.stars,
    0,
  );
  honors.push({
    id: "stars-48",
    name: "STERNENKOMMANDO",
    detail: "48 Kampagnensterne erreichen",
    current: Math.min(48, stars),
    goal: 48,
    unlocked: stars >= 48,
  });

  return honors;
}
