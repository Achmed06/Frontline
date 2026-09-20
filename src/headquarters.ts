/** New permanent learning rewards; headquarters growth derives from campaign wins. */
import type { MatchState } from "./engine";
export const LESSONS = [
  {
    id: "deploy",
    name: "Eine Front aufstellen",
    goal: 3,
    tip: "Setze drei Truppen ein. Kombiniere Nah- und Fernkampf.",
    label: "TRUPPEN EINSETZEN",
  },
  {
    id: "capture",
    name: "Boden gewinnen",
    goal: 1,
    tip: "Halte einen neutralen oder gegnerischen Punkt, bis er dir gehört.",
    label: "PUNKT EROBERN",
  },
  {
    id: "ability",
    name: "Den Moment nutzen",
    goal: 1,
    tip: "Nutze eine taktische Karte oder deine Kommandantenfähigkeit.",
    label: "FÄHIGKEIT NUTZEN",
  },
  {
    id: "win",
    name: "Die Front sichern",
    goal: 1,
    tip: "Gewinne ein Gefecht. Schütze deinen Core und unterstütze den Vorstoß.",
    label: "GEFECHT GEWINNEN",
  },
] as const;
export type LessonId = (typeof LESSONS)[number]["id"];
export type BaseStyle = "field" | "aurora" | "ember" | "supporter";
export type LearningProgress = {
  counts: Record<LessonId, number>;
  style: BaseStyle;
  lastMatch: string;
};
export const BASE_STAGES = [
  {
    wins: 0,
    name: "Feldlager",
    description:
      "Deine erste Stellung. Sichere einen Einsatz, um das Hauptquartier aufzubauen.",
  },
  {
    wins: 1,
    name: "Brückenkopf",
    description:
      "Die Kommandozentrale steht. Dein erster Sieg bleibt sichtbar.",
  },
  {
    wins: 3,
    name: "Versorgungsbasis",
    description: "Neue Lager und Landeflächen versorgen deine wachsende Front.",
  },
  {
    wins: 6,
    name: "Bastion",
    description:
      "Schutztürme sichern die Basis. Die Gestaltung Glut ist verfügbar.",
  },
  {
    wins: 12,
    name: "Signalzentrum",
    description:
      "Relaismasten verbinden dein Hauptquartier mit den Außenposten.",
  },
  {
    wins: 18,
    name: "Frontkommando",
    description:
      "Dein Frontkommando steht. Gewinne den Kommandokrieg für den letzten Ausbau.",
  },
  {
    wins: 24,
    name: "Kommandozitadelle",
    description:
      "Vier Kapitel gesichert. Goldene Signalbögen verbinden deine vollständig ausgebaute Kommandozitadelle.",
  },
] as const;
export const BASE_STYLES: Record<
  BaseStyle,
  { name: string; color: string; requirement: string }
> = {
  supporter: { name: "Kommandogold", color: "#ffe17d", requirement: "Unterstützerpaket · Apple-Testkauf" },
  field: {
    name: "Feldgrün",
    color: "#a3efd0",
    requirement: "Von Beginn an verfügbar",
  },
  aurora: {
    name: "Aurora",
    color: "#99d9ff",
    requirement: "Alle vier Lernaufträge abschließen",
  },
  ember: {
    name: "Glut",
    color: "#ffc084",
    requirement: "Sechs verschiedene Kampagneneinsätze gewinnen",
  },
};
export function normalizeLearning(value: unknown): LearningProgress {
  const result: LearningProgress = {
    counts: { deploy: 0, capture: 0, ability: 0, win: 0 },
    style: "field",
    lastMatch: "",
  };
  if (!value || typeof value !== "object") return result;
  const source = value as Partial<LearningProgress>;
  for (const lesson of LESSONS) {
    const count = source.counts?.[lesson.id];
    if (typeof count === "number" && Number.isFinite(count) && count >= 0)
      result.counts[lesson.id] = Math.min(lesson.goal, Math.floor(count));
  }
  if (
    source.style === "field" ||
    source.style === "aurora" ||
    source.style === "ember" || source.style === "supporter"
  )
    result.style = source.style;
  if (typeof source.lastMatch === "string" && source.lastMatch.length < 160)
    result.lastMatch = source.lastMatch;
  return result;
}
export function completedLessons(progress: LearningProgress): number {
  return LESSONS.filter((lesson) => progress.counts[lesson.id] >= lesson.goal)
    .length;
}
export function styleUnlocked(
  style: BaseStyle,
  progress: LearningProgress,
  campaignWins: number,
  supporterOwned = false,
): boolean {
  if (style === "supporter") return supporterOwned;
  return (
    style === "field" ||
    (style === "aurora"
      ? completedLessons(progress) === LESSONS.length
      : campaignWins >= 6)
  );
}
export function baseStage(campaignWins: number): number {
  return BASE_STAGES.reduce(
    (stage, candidate, index) =>
      campaignWins >= candidate.wins ? index : stage,
    0,
  );
}
export function matchLearning(state: MatchState): Record<LessonId, number> {
  return {
    deploy: state.stats.deployed,
    capture: state.stats.captured,
    ability: state.stats.abilities,
    win: Number(state.phase === "ended" && state.winner === "player"),
  };
}
export function advanceLearning(
  progress: LearningProgress,
  state: MatchState,
  matchId: string,
): LearningProgress {
  if (state.phase !== "ended" || !matchId || progress.lastMatch === matchId)
    return progress;
  const next = normalizeLearning(progress);
  const gains = matchLearning(state);
  for (const lesson of LESSONS)
    next.counts[lesson.id] = Math.min(
      lesson.goal,
      next.counts[lesson.id] + gains[lesson.id],
    );
  next.lastMatch = matchId;
  return next;
}

/** Original vector base: later stages add structures, not combat bonuses. */
export function headquartersSvg(stage: number, color: string): string {
  const building = (x: number, y: number, width: number, height: number) =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 ${width} -12 ${width + 28} 4 28 17Z" fill="#c2e7ff"/><path d="M0 0 28 17 28 ${height + 17} 0 ${height}Z" fill="#2865a4"/><path d="M28 17 ${width + 28} 4 ${width + 28} ${height + 4} 28 ${height + 17}Z" fill="#438bd0"/><path d="M33 23 ${width + 23} 12" stroke="${color}" stroke-width="3"/><path d="M${width} 30v${Math.max(6, height - 8)}" stroke="#172f3b" stroke-width="9"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 205" role="img" aria-label="Hauptquartier Ausbaustufe ${stage + 1}">
    <ellipse cx="180" cy="161" rx="168" ry="37" fill="#08254c" opacity=".4"/>
    <path d="m14 137 167 63 165-65v15l-165 55-167-52z" fill="#1e4768"/>
    <path d="m14 137 167-91 165 89-167 65z" fill="#286379" stroke="#9ee6df"/>
    <path d="m37 134 143-76 143 76-143 53z" fill="#55ad7c"/>
    <path d="m70 121 108 45 108-47M130 84l-3 69m104-70 3 68" fill="none" stroke="#ffdc93" stroke-opacity=".7" stroke-width="3"/>
    <path d="m245 154 25-13 27 13-27 12z" fill="#327495" stroke="#c3f6ff"/>
    <path d="m260 148 16 7m-9-11-1 16" stroke="#ffe692" stroke-width="3"/>
    <g fill="#268367" stroke="#85deb0" stroke-width="2"><path d="m44 116 8-21 9 21-9 5z"/><path d="m302 115 8-24 10 24-10 5z"/><path d="m94 151 7-18 8 18-8 4z"/></g>
    <path d="M52 121v9m258-10v10m-209 25v8" stroke="#754e37" stroke-width="4"/>
    ${stage === 0 ? '<path d="m125 112 35-49 61 55-47 23z" fill="#ffcf69"/><path d="m160 63 14 78 47-23z" fill="#c9793d"/><path d="m158 99-7 29 23 13z" fill="#1d3741"/>' : building(129, 72, 60, 45)}
    ${stage >= 2 ? building(62, 111, 37, 20) + building(234, 112, 28, 17) : ""}
    ${stage >= 3 ? building(65, 77, 17, 42) + building(246, 81, 17, 42) : ""}
    ${stage >= 4 ? `<path d="M174 65V18m-15 20 15-20 15 20" stroke="${color}" stroke-width="4"/><ellipse cx="174" cy="28" rx="22" ry="8" fill="none" stroke="${color}" stroke-width="2"/>` : ""}
    ${stage >= 5 ? building(128, 146, 55, 19) + `<path d="M35 125v-19m289 19v-19M179 183v-15" stroke="${color}" stroke-width="4"/>` : ""}
    ${stage >= 6 ? '<path d="M104 103V48l70-35 72 35v55M104 48l70 37 72-37" fill="none" stroke="#f5d279" stroke-width="3"/><circle cx="174" cy="13" r="5" fill="#f5d279"/>' : ""}
    <path d="m286 137 11-5 10 5-11 5z" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="51" cy="140" r="3" fill="${color}"/><circle cx="313" cy="139" r="3" fill="${color}"/>
  </svg>`;
}
