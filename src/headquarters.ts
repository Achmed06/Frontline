import { normalizeBaseLayout, type BaseLayout } from "./base-layout";
/** New permanent learning rewards; headquarters growth derives from campaign wins. */
import type { CardId, MatchState } from "./engine";
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
export const BASE_PROJECTS = [
  {
    id: "depot",
    name: "Versorgungsdepot",
    description: "Kisten, Treibstoff und Nachschub machen aus dem Lager eine echte Einsatzbasis.",
    metric: "wins",
    goal: 3,
    requires: null,
  },
  {
    id: "training",
    name: "Trainingsplatz",
    description: "Deine gemeisterten Einheiten trainieren sichtbar in der Basis.",
    metric: "mastery",
    goal: 3,
    requires: null,
  },
  {
    id: "relay",
    name: "Signalrelais",
    description: "Ein eigener Funkmast verbindet Ausbildung, Feldzug und Kommando.",
    metric: "lessons",
    goal: 4,
    requires: null,
  },
  {
    id: "workshop",
    name: "Feldwerkstatt",
    description: "Eine Werkstatt für Ausrüstung, Fahrzeuge und spätere kosmetische Projekte.",
    metric: "stars",
    goal: 24,
    requires: null,
  },
  {
    id: "honor",
    name: "Ehrenhof",
    description: "Banner und Trophäen halten deinen Feldzug dauerhaft in der Basis fest.",
    metric: "wins",
    goal: 18,
    requires: null,
  },
  {
    id: "supplyhub",
    name: "Nachschubterminal",
    description: "Das Depot wächst um Kran, Containerfläche und einen festen Versorgungsknoten.",
    metric: "wins",
    goal: 10,
    requires: "depot",
  },
  {
    id: "barracks",
    name: "Garnisonsflügel",
    description: "Der Trainingsplatz erhält eigene Quartiere für deine erfahrensten Einheiten.",
    metric: "mastery",
    goal: 12,
    requires: "training",
  },
  {
    id: "watchtower",
    name: "Aufklärungsturm",
    description: "Das Signalrelais wird um eine erhöhte Beobachtungs- und Sensorplattform erweitert.",
    metric: "wins",
    goal: 12,
    requires: "relay",
  },
  {
    id: "dronepad",
    name: "Drohnenrampe",
    description: "Die Feldwerkstatt erhält eine kleine Startplattform für Aufklärungsdrohnen.",
    metric: "stars",
    goal: 42,
    requires: "workshop",
  },
  {
    id: "monument",
    name: "Siegesmonument",
    description: "Der Ehrenhof erhält ein dauerhaftes Monument für den vollständig gesicherten Feldzug.",
    metric: "wins",
    goal: 24,
    requires: "honor",
  },
] as const;
export type BaseProjectId = (typeof BASE_PROJECTS)[number]["id"];
export type BaseProjectMetric = (typeof BASE_PROJECTS)[number]["metric"];
export type BaseProjectMetrics = Record<BaseProjectMetric, number>;
export type LearningProgress = {
  counts: Record<LessonId, number>;
  style: BaseStyle;
  lastMatch: string;
  projects?: BaseProjectId[];
  layout?: BaseLayout;
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
  if (Array.isArray(source.projects)) {
    const valid = new Set<BaseProjectId>();
    for (const id of source.projects)
      if (BASE_PROJECTS.some((project) => project.id === id))
        valid.add(id as BaseProjectId);
    if (valid.size)
      result.projects = BASE_PROJECTS.map((project) => project.id).filter((id) =>
        valid.has(id),
      );
  }
  const layout = normalizeBaseLayout(source.layout, result.projects ?? []);
  if (Object.keys(layout).length) result.layout = layout;
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
export function baseProjectProgress(
  projectId: BaseProjectId,
  metrics: BaseProjectMetrics,
): { current: number; goal: number; ready: boolean } {
  const project = BASE_PROJECTS.find((item) => item.id === projectId)!;
  const current = Math.max(0, Math.floor(metrics[project.metric] ?? 0));
  return { current, goal: project.goal, ready: current >= project.goal };
}
export function baseProjectBuilt(
  progress: LearningProgress,
  projectId: BaseProjectId,
): boolean {
  return progress.projects?.includes(projectId) ?? false;
}
export function buildBaseProject(
  progress: LearningProgress,
  projectId: BaseProjectId,
  metrics: BaseProjectMetrics,
): LearningProgress {
  const project = BASE_PROJECTS.find((item) => item.id === projectId)!;
  const prerequisite = project.requires as BaseProjectId | null;
  if (
    baseProjectBuilt(progress, projectId) ||
    (prerequisite !== null && !baseProjectBuilt(progress, prerequisite)) ||
    !baseProjectProgress(projectId, metrics).ready
  )
    return progress;
  const built = new Set(progress.projects ?? []);
  built.add(projectId);
  return {
    ...progress,
    projects: BASE_PROJECTS.map((project) => project.id).filter((id) =>
      built.has(id),
    ),
  };
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
export function headquartersSvg(
  stage: number,
  color: string,
  projects: readonly BaseProjectId[] = [],
  garrison: readonly CardId[] = [],
): string {
  const building = (x: number, y: number, width: number, height: number) =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 ${width} -12 ${width + 28} 4 28 17Z" fill="#c2e7ff"/><path d="M0 0 28 17 28 ${height + 17} 0 ${height}Z" fill="#2865a4"/><path d="M28 17 ${width + 28} 4 ${width + 28} ${height + 4} 28 ${height + 17}Z" fill="#438bd0"/><path d="M33 23 ${width + 23} 12" stroke="${color}" stroke-width="3"/><path d="M${width} 30v${Math.max(6, height - 8)}" stroke="#172f3b" stroke-width="9"/></g>`;
  const patrol = (id: CardId, index: number) => {
    const positions = [
      [116, 159],
      [218, 156],
      [146, 181],
      [248, 178],
    ] as const;
    const [x, y] = positions[index % positions.length];
    const heavy = id === "bulwark" || id === "sentinel";
    const ranged =
      id === "ranger" ||
      id === "lancer" ||
      id === "mortar" ||
      id === "disruptor";
    const support = id === "medic" || id === "pioneer";
    if (id === "swarm")
      return `<g class="hq-patrol hq-patrol-${index + 1}" transform="translate(${x} ${y})"><ellipse cx="0" cy="6" rx="12" ry="4" fill="#071a25" opacity=".45"/><g fill="${color}" stroke="#dffcff" stroke-width=".8"><circle cx="-6" cy="0" r="3"/><circle cx="0" cy="-4" r="3"/><circle cx="6" cy="1" r="3"/></g><path d="M-9 4 9-3M-2-7l5 11" stroke="#dffcff" stroke-width=".8" opacity=".65"/></g>`;
    if (heavy)
      return `<g class="hq-patrol hq-patrol-${index + 1}" transform="translate(${x} ${y})"><ellipse cx="0" cy="7" rx="12" ry="4" fill="#071a25" opacity=".45"/><path d="M-7-3 0-8 8-3 7 7 0 11-7 7Z" fill="#39566f" stroke="${color}" stroke-width="1.4"/><path d="M-4 0h8M0-5v11" stroke="#e5f7ff" stroke-width="1.2"/><circle cx="0" cy="-3" r="2.5" fill="${color}"/></g>`;
    if (ranged)
      return `<g class="hq-patrol hq-patrol-${index + 1}" transform="translate(${x} ${y})"><ellipse cx="0" cy="7" rx="10" ry="3.5" fill="#071a25" opacity=".45"/><circle cx="-1" cy="-5" r="3" fill="#d9f4ff" stroke="#18354b"/><path d="M-1-2v9m-5 6 5-6 6 6M-4 1l7 2 8-5" fill="none" stroke="#d9f4ff" stroke-width="2"/><path d="M3 3 13-2" stroke="${color}" stroke-width="2"/></g>`;
    if (support)
      return `<g class="hq-patrol hq-patrol-${index + 1}" transform="translate(${x} ${y})"><ellipse cx="0" cy="7" rx="10" ry="3.5" fill="#071a25" opacity=".45"/><circle cx="0" cy="-5" r="3" fill="#d9f4ff" stroke="#18354b"/><path d="M0-2v9m-5 6 5-6 5 6M-5 1 0 4 6 1" fill="none" stroke="#d9f4ff" stroke-width="2"/><rect x="4" y="-1" width="6" height="7" rx="1" fill="#24495c" stroke="${color}"/><path d="M7 0v5M5 2.5h4" stroke="${color}" stroke-width="1"/></g>`;
    return `<g class="hq-patrol hq-patrol-${index + 1}" transform="translate(${x} ${y})"><ellipse cx="0" cy="7" rx="10" ry="3.5" fill="#071a25" opacity=".45"/><circle cx="0" cy="-5" r="3" fill="#d9f4ff" stroke="#18354b"/><path d="M0-2v9m-5 6 5-6 5 6M-5 1 0 4 6 0" fill="none" stroke="#d9f4ff" stroke-width="2"/><path d="M6 0 10-5" stroke="${color}" stroke-width="2"/></g>`;
  };
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
    ${projects.includes("depot") ? `<g transform="translate(43 145)"><path d="m0 10 17-9 18 8-18 9z" fill="#9b6f47" stroke="#f0c789"/><path d="m17 18 18-9v13l-18 9z" fill="#6d4d39"/><path d="m0 10 17 8v13L0 23z" fill="#80593f"/><path d="M8 7v16m18-18v15" stroke="#f0c789" stroke-width="2"/></g>` : ""}
    ${projects.includes("training") ? `<g transform="translate(282 142)"><ellipse cx="18" cy="12" rx="24" ry="11" fill="#244e59" stroke="${color}" stroke-width="2"/><circle cx="18" cy="11" r="7" fill="none" stroke="#ffd475" stroke-width="2"/><circle cx="18" cy="11" r="2" fill="#ffd475"/><g fill="#d9f6ff" stroke="#17384b"><circle cx="4" cy="5" r="3"/><path d="M4 8v8m-4 5 4-5 4 5"/><circle cx="33" cy="6" r="3"/><path d="M33 9v8m-4 5 4-5 4 5"/></g></g>` : ""}
    ${projects.includes("relay") ? `<g transform="translate(315 78)" fill="none" stroke="${color}"><path d="M0 52 12 0l12 52M5 31h14M3 42h18" stroke-width="3"/><path d="M12 8c8 1 13 5 17 10M12 8C4 9-1 13-5 18" stroke-width="2" opacity=".8"/><circle cx="12" cy="3" r="3" fill="${color}"/></g>` : ""}
    ${projects.includes("workshop") ? `<g transform="translate(82 157)"><path d="m0 8 23-12 29 11-26 13z" fill="#7a90a3" stroke="#c8e9ff"/><path d="M26 20 52 7v16L26 36z" fill="#38556f"/><path d="M0 8 26 20v16L0 24z" fill="#46657b"/><path d="M9 18h9m13-2h11" stroke="#ffd475" stroke-width="3"/><path d="M42 -1v-12m0 0 10 5" stroke="${color}" stroke-width="3"/></g>` : ""}
    ${projects.includes("honor") ? `<g transform="translate(158 169)"><path d="M0 13 22 2l23 11-23 10z" fill="#213f58" stroke="#f5d279"/><path d="M10 8V-7m24 15V-7" stroke="#f5d279" stroke-width="2"/><path d="M10-7h10l-5 7-5-3zm24 0h10l-5 7-5-3z" fill="${color}"/><circle cx="22" cy="12" r="4" fill="#f5d279"/></g>` : ""}
    ${projects.includes("supplyhub") ? `<g transform="translate(28 166)"><path d="M0 18h43" stroke="#e1c18a" stroke-width="3"/><path d="M9 18V-3h20M29-3v22" fill="none" stroke="${color}" stroke-width="3"/><path d="M29-3 40 4M36 4v9" stroke="#f4d28f" stroke-width="2"/><rect x="2" y="8" width="13" height="9" fill="#74513c" stroke="#d9ad72"/><rect x="17" y="10" width="12" height="7" fill="#526f78" stroke="#b9e3e8"/></g>` : ""}
    ${projects.includes("barracks") ? `<g transform="translate(276 166)"><path d="m0 7 24-12 34 12-28 14z" fill="#86a8b8" stroke="#d8f4ff"/><path d="M30 21 58 7v16L30 38z" fill="#31526b"/><path d="M0 7 30 21v17L0 24z" fill="#41657a"/><path d="M8 17h8m5 4h7" stroke="${color}" stroke-width="2"/><path d="M43 5v19" stroke="#f2d588" stroke-width="3"/></g>` : ""}
    ${projects.includes("watchtower") ? `<g transform="translate(327 47)" fill="none"><path d="M0 78 12 16l13 62M5 55h15M3 68h20" stroke="#8fb6c7" stroke-width="3"/><path d="M3 16h19l-3-9H6z" fill="#294b63" stroke="${color}" stroke-width="2"/><ellipse cx="12" cy="9" rx="14" ry="5" stroke="${color}" stroke-width="2"/><path d="M12 8V-7m0 0 9 5M12-7 3-2" stroke="#f4dc8a" stroke-width="2"/></g>` : ""}
    ${projects.includes("dronepad") ? `<g transform="translate(106 185)"><ellipse cx="18" cy="5" rx="26" ry="9" fill="#1d4558" stroke="${color}" stroke-width="2"/><path d="M6 5h24M18-4v18" stroke="#d2f1f5" stroke-width="1.5"/><g transform="translate(18 -9)" stroke="#f5db8d" fill="#243f52"><rect x="-5" y="-3" width="10" height="6" rx="2"/><path d="M-5 0h-10m20 0h10M-12-3v6m24-6v6"/></g></g>` : ""}
    ${projects.includes("monument") ? `<g transform="translate(212 168)"><path d="M0 20 17 12l18 8-18 8z" fill="#253d51" stroke="#f0d374"/><path d="M11 13 15-12h5l4 25" fill="#3e6072" stroke="#f0d374" stroke-width="2"/><path d="M17-17 22-9 17-4 12-9z" fill="${color}" stroke="#fff2b3"/><path d="M7 20h20" stroke="#f0d374" stroke-width="2"/></g>` : ""}
    ${projects.includes("training") ? garrison.slice(0, 4).map(patrol).join("") : ""}
  </svg>`;
}
