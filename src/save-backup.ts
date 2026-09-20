/** Portable local-save envelope. Apple entitlements and duel tokens are never included. */
import { isValidDeck } from "./engine";
import { isCommanderId } from "./commanders";
import { normalizeProgress } from "./campaign";
import { normalizeSeries } from "./series";
import { normalizeLearning } from "./headquarters";
import { normalizeMastery } from "./mastery";
import { normalizeDeckSlots } from "./deck-slots";
import { normalizeDailyHistory } from "./daily-front";
import {
  normalizeStats,
  normalizeHistory,
  readStats,
  readHistory,
  readCampaign,
  readSeries,
  readLearning,
  readMastery,
  readDeckSlots,
  readDeck,
  readCommander,
  readDailyHistory,
} from "./storage";

export const BACKUP_LIMIT = 256 * 1024;
const legacySaveKeys = [
  "stats-v1",
  "history-v1",
  "campaign-v1",
  "series-v1",
  "learning-v1",
  "mastery-v1",
  "deck-slots-v1",
  "deck-v1",
  "commander-v1",
] as const;
const saveKeys = [...legacySaveKeys, "daily-v1"] as const;
type SaveKey = (typeof saveKeys)[number];
export interface SaveBackup {
  format: "frontline-local-save";
  version: 2;
  createdAt: string;
  data: Record<SaveKey, unknown>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonical((value as Record<string, unknown>)[key]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

function exactKeys(data: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(data).length === keys.length &&
    keys.every((key) => Object.hasOwn(data, key))
  );
}

export function parseBackup(text: string): SaveBackup {
  if (
    text.length > BACKUP_LIMIT ||
    new TextEncoder().encode(text).byteLength > BACKUP_LIMIT
  )
    throw Error("Sicherung zu groß (maximal 256 KB).");

  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw Error(
      "Die Sicherung enthält kein gültiges JSON. Bitte den vollständigen Sicherungstext verwenden.",
    );
  }

  if (
    !raw ||
    raw.format !== "frontline-local-save" ||
    (raw.version !== 1 && raw.version !== 2) ||
    typeof raw.createdAt !== "string" ||
    !Number.isFinite(Date.parse(raw.createdAt)) ||
    !raw.data ||
    Array.isArray(raw.data) ||
    typeof raw.data !== "object"
  )
    throw Error("Unbekanntes Sicherungsformat oder nicht unterstützte Version.");

  const incoming = raw.data as Record<string, unknown>;
  const incomingKeys = raw.version === 1 ? legacySaveKeys : saveKeys;
  if (!exactKeys(incoming, incomingKeys))
    throw Error(
      "Die Sicherung ist unvollständig oder enthält unbekannte Speicherbereiche.",
    );

  const normalized: Record<SaveKey, unknown> = {
    "stats-v1": normalizeStats(incoming["stats-v1"]),
    "history-v1": normalizeHistory(incoming["history-v1"]),
    "campaign-v1": normalizeProgress(incoming["campaign-v1"]),
    "series-v1": normalizeSeries(incoming["series-v1"]),
    "learning-v1": normalizeLearning(incoming["learning-v1"]),
    "mastery-v1": normalizeMastery(incoming["mastery-v1"]),
    "deck-slots-v1": normalizeDeckSlots(incoming["deck-slots-v1"]),
    "deck-v1": incoming["deck-v1"],
    "commander-v1": incoming["commander-v1"],
    "daily-v1":
      raw.version === 2 ? normalizeDailyHistory(incoming["daily-v1"]) : [],
  };

  const comparable =
    raw.version === 1
      ? Object.fromEntries(
          legacySaveKeys.map((key) => [key, normalized[key]]),
        )
      : normalized;

  if (
    !isValidDeck(incoming["deck-v1"]) ||
    !isCommanderId(incoming["commander-v1"]) ||
    canonical(incoming) !== canonical(comparable)
  )
    throw Error(
      "Die Sicherung enthält beschädigte oder inkompatible Spieldaten. Es wurde nichts geändert.",
    );

  return {
    format: "frontline-local-save",
    version: 2,
    createdAt: raw.createdAt,
    data: normalized,
  };
}

export function createBackup(): string {
  try {
    for (const key of saveKeys) localStorage.getItem("frontline-" + key);
  } catch {
    throw Error(
      "Lokaler Speicher nicht lesbar. Es wurde keine Sicherung erstellt.",
    );
  }

  const backup: SaveBackup = {
    format: "frontline-local-save",
    version: 2,
    createdAt: new Date().toISOString(),
    data: {
      "stats-v1": readStats(),
      "history-v1": readHistory(),
      "campaign-v1": readCampaign(),
      "series-v1": readSeries(),
      "learning-v1": readLearning(),
      "mastery-v1": readMastery(),
      "deck-slots-v1": readDeckSlots(),
      "deck-v1": readDeck(),
      "commander-v1": readCommander(),
      "daily-v1": readDailyHistory(),
    },
  };
  const text = JSON.stringify(backup);
  parseBackup(text);
  return text;
}

export function restoreBackup(
  text: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
): void {
  const backup = parseBackup(text);
  const before = saveKeys.map((key) => storage.getItem("frontline-" + key));
  try {
    for (const key of saveKeys)
      storage.setItem(
        "frontline-" + key,
        key === "commander-v1"
          ? (backup.data[key] as string)
          : JSON.stringify(backup.data[key]),
      );
  } catch {
    let rollbackFailed = false;
    saveKeys.forEach((key, i) => {
      try {
        if (before[i] === null) storage.removeItem("frontline-" + key);
        else storage.setItem("frontline-" + key, before[i]!);
      } catch {
        rollbackFailed = true;
      }
    });
    throw Error(
      rollbackFailed
        ? "Speicherfehler: Der bisherige Stand konnte nicht vollständig wiederhergestellt werden. Sicherung behalten und vor dem Weiterspielen erneut importieren."
        : "Nicht genug Speicher oder Speicherung gesperrt. Der bisherige Stand wurde wiederhergestellt.",
    );
  }
}
