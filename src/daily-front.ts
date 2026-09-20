import type { ArenaThemeId } from "./arena-themes";
import type { CommanderId } from "./commanders";
import {
  type CardId,
  type ControlObjective,
  type Difficulty,
  type MatchState,
  type Team,
} from "./engine";

export type DailyChallenge = {
  key: string;
  title: string;
  briefing: string;
  tip: string;
  theme: ArenaThemeId;
  seed: number;
  difficulty: Difficulty;
  playerDeck: readonly CardId[];
  enemyDeck: readonly CardId[];
  playerCommander: CommanderId;
  enemyCommander: CommanderId;
  owners: readonly (Team | null)[];
  controlObjective?: ControlObjective;
};

export type DailyRecord = {
  key: string;
  attempts: number;
  completed: boolean;
  bestTime: number;
  bestCore: number;
  bestPoints: number;
};

export const DAILY_HISTORY_LIMIT = 30;

const E: Team = "enemy";
const P: Team = "player";

const DECKS: readonly (readonly CardId[])[] = [
  ["vanguard", "bulwark", "ranger", "swarm", "lancer", "medic", "pulse", "rally"],
  ["vanguard", "ranger", "raider", "sentinel", "mortar", "pioneer", "pulse", "stasis"],
  ["bulwark", "medic", "lancer", "breaker", "disruptor", "pioneer", "rally", "repulsor"],
  ["swarm", "raider", "vanguard", "ranger", "mortar", "breaker", "pulse", "repulsor"],
  ["sentinel", "medic", "pioneer", "lancer", "raider", "disruptor", "stasis", "rally"],
];

const FRONTS: readonly (readonly (Team | null)[])[] = [
  [E, E, E, null, null, null, P, P, P],
  [E, E, E, E, null, null, P, P, P],
  [E, E, E, null, E, null, P, P, P],
  [E, E, E, P, null, E, P, P, P],
  [E, E, E, null, P, E, P, P, P],
];

const THEMES: readonly ArenaThemeId[] = ["coast", "frost", "ember", "nexus"];
const COMMANDER_IDS: readonly CommanderId[] = ["atlas", "lyra", "nova"];

function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function dailyKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dailyChallenge(date = new Date()): DailyChallenge {
  const key = dailyKey(date);
  const seed = hash(`frontline-daily:${key}`);
  const deckIndex = seed % DECKS.length;
  const enemyIndex = (deckIndex + 1 + ((seed >>> 5) % (DECKS.length - 1))) % DECKS.length;
  const frontIndex = (seed >>> 9) % FRONTS.length;
  const theme = THEMES[(seed >>> 13) % THEMES.length];
  const commanderIndex = (seed >>> 17) % COMMANDER_IDS.length;
  const enemyCommanderIndex = (commanderIndex + 1 + ((seed >>> 20) % 2)) % COMMANDER_IDS.length;
  const mode = (seed >>> 22) % 4;
  const controlObjective =
    mode === 1
      ? { pointIds: [4] as const, requiredPoints: 1, seconds: 35 }
      : mode === 2
        ? { pointIds: [3, 5] as const, requiredPoints: 1, seconds: 45 }
        : mode === 3
          ? { pointIds: [3, 4, 5] as const, requiredPoints: 2, seconds: 45 }
          : undefined;
  const difficulty: Difficulty = (seed >>> 25) % 3 === 0 ? "veteran" : "standard";
  const title = controlObjective
    ? mode === 1
      ? "MITTELSIGNAL"
      : mode === 2
        ? "FLANKENFUNK"
        : "DREIFACHRELAIS"
    : "TAGESDURCHBRUCH";
  const briefing = controlObjective
    ? `Heute zählt Kontrolle: ${controlObjective.requiredPoints} von ${controlObjective.pointIds.length} markierten Relais halten, bis ${controlObjective.seconds} Sekunden erreicht sind.`
    : "Heute zählt der Durchbruch. Verschiebe die Front und zerstöre den gegnerischen Core.";
  const tip =
    frontIndex === 0
      ? "Die Mitte startet offen. Entscheide früh, auf welcher Linie du Druck aufbaust."
      : frontIndex === 1
        ? "Der Gegner beginnt vorgeschoben. Sichere zuerst deine Verbindung, bevor du tief angreifst."
        : frontIndex === 2
          ? "Die gegnerische Mitte ist befestigt. Teile deinen Vorstoß auf, statt alles in einen Punkt zu stellen."
          : frontIndex === 3
            ? "Du besitzt links bereits Boden. Nutze den Brückenkopf, aber verliere die Verbindung zur Basis nicht."
            : "Dein mittlerer Brückenkopf ist vorgeschoben. Verstärke ihn oder nutze ihn als Ablenkung.";

  return {
    key,
    title,
    briefing,
    tip,
    theme,
    seed,
    difficulty,
    playerDeck: DECKS[deckIndex],
    enemyDeck: DECKS[enemyIndex],
    playerCommander: COMMANDER_IDS[commanderIndex],
    enemyCommander: COMMANDER_IDS[enemyCommanderIndex],
    owners: FRONTS[frontIndex],
    ...(controlObjective ? { controlObjective } : {}),
  };
}

export function normalizeDailyHistory(value: unknown): DailyRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const records: DailyRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as Partial<DailyRecord>;
    if (
      typeof source.key !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.key) ||
      seen.has(source.key) ||
      !Number.isSafeInteger(source.attempts) ||
      (source.attempts ?? -1) < 0 ||
      typeof source.completed !== "boolean" ||
      typeof source.bestTime !== "number" ||
      !Number.isFinite(source.bestTime) ||
      source.bestTime < 0 ||
      typeof source.bestCore !== "number" ||
      !Number.isFinite(source.bestCore) ||
      source.bestCore < 0 ||
      source.bestCore > 100 ||
      typeof source.bestPoints !== "number" ||
      !Number.isSafeInteger(source.bestPoints) ||
      source.bestPoints < 0 ||
      source.bestPoints > 9
    )
      continue;
    seen.add(source.key);
    records.push({
      key: source.key,
      attempts: source.attempts,
      completed: source.completed,
      bestTime: source.bestTime,
      bestCore: source.bestCore,
      bestPoints: source.bestPoints,
    });
    if (records.length >= DAILY_HISTORY_LIMIT) break;
  }
  return records;
}

export function dailyRecord(
  history: readonly DailyRecord[],
  key: string,
): DailyRecord | null {
  return history.find((record) => record.key === key) ?? null;
}

export function completeDaily(
  history: readonly DailyRecord[],
  key: string,
  state: MatchState,
): DailyRecord[] {
  if (state.phase !== "ended" || !state.winner) return [...history];
  const previous = dailyRecord(history, key);
  const won = state.winner === "player";
  const core = Math.ceil(
    Math.max(0, state.cores.player.hp / state.cores.player.maxHp) * 100,
  );
  const points = state.points.filter((point) => point.owner === "player").length;
  const time = won ? Math.round(state.time) : 0;
  const next: DailyRecord = {
    key,
    attempts: (previous?.attempts ?? 0) + 1,
    completed: (previous?.completed ?? false) || won,
    bestTime:
      won && time > 0
        ? previous?.bestTime && previous.bestTime > 0
          ? Math.min(previous.bestTime, time)
          : time
        : previous?.bestTime ?? 0,
    bestCore: won
      ? Math.max(previous?.bestCore ?? 0, core)
      : previous?.bestCore ?? 0,
    bestPoints: won
      ? Math.max(previous?.bestPoints ?? 0, points)
      : previous?.bestPoints ?? 0,
  };
  return [next, ...history.filter((record) => record.key !== key)].slice(
    0,
    DAILY_HISTORY_LIMIT,
  );
}
