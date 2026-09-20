import { normalizeDeckSlots, type DeckSlot } from "./deck-slots";
import { normalizeMastery, type Mastery } from "./mastery";
import { normalizeLearning, type LearningProgress } from "./headquarters";
import { isCommanderId, type CommanderId } from "./commanders";
import { normalizeSeries, type SeriesRun } from "./series";
import { MISSIONS, normalizeProgress, type CampaignProgress } from "./campaign";
import {
  DEFAULT_DECK,
  isValidDeck,
  type CardId,
  type Difficulty,
  type Match,
  MATCH_DURATION,
  OVERTIME_DURATION,
} from "./engine";
export type LocalStats = {
  matches: number;
  wins: number;
  rematches: number;
  lastFeedback: string;
};
const fallback: LocalStats = {
  matches: 0,
  wins: 0,
  rematches: 0,
  lastFeedback: "",
};
export function normalizeStats(value: unknown): LocalStats {
  const source = value && typeof value === "object" ? value as Partial<LocalStats> : {};
  const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const matches = count(source.matches);
  return { matches, wins: Math.min(matches, count(source.wins)), rematches: count(source.rematches), lastFeedback: typeof source.lastFeedback === "string" ? source.lastFeedback.slice(0, 1000) : "" };
}
export function readStats(): LocalStats {
  try { return normalizeStats(JSON.parse(localStorage.getItem("frontline-stats-v1") || "{}")); }
  catch { return { ...fallback }; }
}
export function saveStats(stats: LocalStats) {
  try {
    localStorage.setItem("frontline-stats-v1", JSON.stringify(stats));
  } catch {
    /* A match remains playable without browser storage. */
  }
}
export function setting(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem("frontline-" + key, value);
    return localStorage.getItem("frontline-" + key);
  } catch {
    return null;
  }
}

export function readDeck(): CardId[] {
  try {
    const value: unknown = JSON.parse(setting("deck-v1") ?? "null");
    return isValidDeck(value) ? [...value] : [...DEFAULT_DECK];
  } catch {
    return [...DEFAULT_DECK];
  }
}
export function saveDeck(deck: readonly CardId[]): boolean {
  if (!isValidDeck(deck)) return false;
  return setting("deck-v1", JSON.stringify(deck)) !== null;
}

export const HISTORY_LIMIT = 20;
export type MatchFeedback = "again" | "unclear" | "boring" | "";
export type MatchRecord = {
  id: string;
  recordedAt: number;
  duration: number;
  difficulty: Difficulty;
  deck: CardId[];
  outcome: "player" | "enemy" | "draw";
  core: { player: number; enemy: number };
  points: { player: number; enemy: number };
  feedback: MatchFeedback;
  missionId?: string;
  commander?: CommanderId;
  control?: { player: number; enemy: number; target: number };
};

/** Snapshot only finished games; future deck edits must not change old reports. */
export function createMatchRecord(
  match: Match,
  missionId?: string,
): MatchRecord {
  const state = match.state;
  if (state.phase !== "ended" || !state.winner)
    throw new Error("Cannot record an unfinished match");
  return {
    id: `${Date.now()}-${Array.from(crypto.getRandomValues(new Uint32Array(2)), (value) => value.toString(16)).join("-")}`,
    recordedAt: Date.now(),
    duration: Math.round(state.time),
    difficulty: match.difficulty,
    commander: match.commanders.player,
    deck: [...match.decks.player],
    outcome: state.winner,
    core: {
      player: Math.ceil(
        Math.max(0, state.cores.player.hp / state.cores.player.maxHp) * 100,
      ),
      enemy: Math.ceil(
        Math.max(0, state.cores.enemy.hp / state.cores.enemy.maxHp) * 100,
      ),
    },
    points: {
      player: state.points.filter((point) => point.owner === "player").length,
      enemy: state.points.filter((point) => point.owner === "enemy").length,
    },
    ...(match.controlObjective
      ? {
          control: {
            player: Math.floor(state.controlTime.player + 1e-8),
            enemy: Math.floor(state.controlTime.enemy + 1e-8),
            target: match.controlObjective.seconds,
          },
        }
      : {}),
    feedback: "",
    ...(missionId && MISSIONS.some((mission) => mission.id === missionId)
      ? { missionId }
      : {}),
  };
}
function isMatchRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as MatchRecord;
  const integer = (value: unknown, max: number) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= max;
  return (
    (record.commander === undefined || isCommanderId(record.commander)) &&
    (record.control === undefined ||
      (!!record.control &&
        Number.isFinite(record.control.target) &&
        record.control.target > 0 &&
        record.control.target <= MATCH_DURATION &&
        integer(record.control.player, record.control.target) &&
        integer(record.control.enemy, record.control.target))) &&
    (record.missionId === undefined ||
      MISSIONS.some((mission) => mission.id === record.missionId)) &&
    typeof record.id === "string" &&
    /^[a-zA-Z0-9-]{1,80}$/.test(record.id) &&
    integer(record.recordedAt, 8640000000000000) &&
    integer(record.duration, MATCH_DURATION + OVERTIME_DURATION) &&
    ["rookie", "standard", "veteran"].includes(record.difficulty) &&
    ["player", "enemy", "draw"].includes(record.outcome) &&
    ["", "again", "unclear", "boring"].includes(record.feedback) &&
    isValidDeck(record.deck) &&
    !!record.core &&
    integer(record.core.player, 100) &&
    integer(record.core.enemy, 100) &&
    !!record.points &&
    integer(record.points.player, 9) &&
    integer(record.points.enemy, 9) &&
    record.points.player + record.points.enemy <= 9
  );
}
export function normalizeHistory(data: unknown): MatchRecord[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.filter((record): record is MatchRecord => {
    if (!isMatchRecord(record) || seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  }).slice(0, HISTORY_LIMIT);
}
export function readHistory(): MatchRecord[] {
  try { return normalizeHistory(JSON.parse(setting("history-v1") ?? "[]")); }
  catch { return []; }
}
export function saveHistory(history: readonly MatchRecord[]): boolean {
  const recent = history.slice(0, HISTORY_LIMIT);
  if (
    !recent.every(isMatchRecord) ||
    new Set(recent.map((record) => record.id)).size !== recent.length
  )
    return false;
  return setting("history-v1", JSON.stringify(recent)) !== null;
}

export function readCampaign(): CampaignProgress {
  try {
    return normalizeProgress(JSON.parse(setting("campaign-v1") ?? "{}"));
  } catch {
    return {};
  }
}
export function saveCampaign(progress: CampaignProgress): boolean {
  return (
    setting("campaign-v1", JSON.stringify(normalizeProgress(progress))) !== null
  );
}

export function readSeries(): SeriesRun | null {
  try {
    return normalizeSeries(JSON.parse(setting("series-v1") ?? "null"));
  } catch {
    return null;
  }
}
export function saveSeries(run: SeriesRun): boolean {
  const valid = normalizeSeries(run);
  return !!valid && setting("series-v1", JSON.stringify(valid)) !== null;
}

export function readCommander(): CommanderId {
  const value = setting("commander-v1");
  return isCommanderId(value) ? value : "atlas";
}
export function saveCommander(id: CommanderId): boolean {
  return isCommanderId(id) && setting("commander-v1", id) !== null;
}

export function readLearning(): LearningProgress {
  try {
    return normalizeLearning(JSON.parse(setting("learning-v1") ?? "null"));
  } catch {
    return normalizeLearning(null);
  }
}
export function saveLearning(progress: LearningProgress): boolean {
  return (
    setting("learning-v1", JSON.stringify(normalizeLearning(progress))) !== null
  );
}

export function readMastery(): Mastery {
  try {
    return normalizeMastery(JSON.parse(setting("mastery-v1") ?? "null"));
  } catch {
    return normalizeMastery(null);
  }
}
export function saveMastery(progress: Mastery): boolean {
  return (
    setting("mastery-v1", JSON.stringify(normalizeMastery(progress))) !== null
  );
}

export function readDeckSlots(): DeckSlot[] {
  const saved = setting("deck-slots-v1");
  if (saved === null)
    return normalizeDeckSlots([
      { name: "Mein erstes Deck", cards: readDeck() },
    ]);
  try {
    return normalizeDeckSlots(JSON.parse(saved));
  } catch {
    return normalizeDeckSlots(null);
  }
}
export function saveDeckSlots(slots: readonly DeckSlot[]): boolean {
  return (
    setting("deck-slots-v1", JSON.stringify(normalizeDeckSlots(slots))) !== null
  );
}
