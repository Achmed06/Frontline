/** New portable local-save envelope. Apple entitlements and duel tokens are never included. */
import { isValidDeck } from './engine';
import { isCommanderId } from './commanders';
import { normalizeProgress } from './campaign';
import { normalizeSeries } from './series';
import { normalizeLearning } from './headquarters';
import { normalizeMastery } from './mastery';
import { normalizeDeckSlots } from './deck-slots';
import { normalizeStats, normalizeHistory, readStats, readHistory, readCampaign, readSeries, readLearning, readMastery, readDeckSlots, readDeck, readCommander } from './storage';
export const BACKUP_LIMIT = 256 * 1024;
const saveKeys = ['stats-v1', 'history-v1', 'campaign-v1', 'series-v1', 'learning-v1', 'mastery-v1', 'deck-slots-v1', 'deck-v1', 'commander-v1'] as const;
type SaveKey = typeof saveKeys[number];
export interface SaveBackup { format: 'frontline-local-save'; version: 1; createdAt: string; data: Record<SaveKey, unknown> }
// Compare normalized values independently of JSON property order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function parseBackup(text: string): SaveBackup {
  if (text.length > BACKUP_LIMIT || new TextEncoder().encode(text).byteLength > BACKUP_LIMIT) throw Error('Sicherung zu groß (maximal 256 KB).');
  let backup: SaveBackup;
  try { backup = JSON.parse(text); } catch { throw Error('Die Sicherung enthält kein gültiges JSON. Bitte den vollständigen Sicherungstext verwenden.'); }
  if (!backup || backup.format !== 'frontline-local-save' || backup.version !== 1 || typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt)) || !backup.data || Array.isArray(backup.data) || typeof backup.data !== 'object') throw Error('Unbekanntes Sicherungsformat oder nicht unterstützte Version.');
  const data = backup.data;
  if (Object.keys(data).length !== saveKeys.length || saveKeys.some(key => !Object.hasOwn(data, key))) throw Error('Die Sicherung ist unvollständig oder enthält unbekannte Speicherbereiche.');
  const normalized = {
    'stats-v1': normalizeStats(data['stats-v1']), 'history-v1': normalizeHistory(data['history-v1']),
    'campaign-v1': normalizeProgress(data['campaign-v1']), 'series-v1': normalizeSeries(data['series-v1']),
    'learning-v1': normalizeLearning(data['learning-v1']), 'mastery-v1': normalizeMastery(data['mastery-v1']),
    'deck-slots-v1': normalizeDeckSlots(data['deck-slots-v1']), 'deck-v1': data['deck-v1'], 'commander-v1': data['commander-v1'],
  };
  if (!isValidDeck(data['deck-v1']) || !isCommanderId(data['commander-v1']) || canonical(data) !== canonical(normalized)) throw Error('Die Sicherung enthält beschädigte oder inkompatible Spieldaten. Es wurde nichts geändert.');
  return { format: 'frontline-local-save', version: 1, createdAt: backup.createdAt, data: normalized };
}
export function createBackup(): string {
  // Readers intentionally tolerate blocked storage during play. Exports must report it.
  try { for (const key of saveKeys) localStorage.getItem('frontline-' + key); }
  catch { throw Error('Lokaler Speicher nicht lesbar. Es wurde keine Sicherung erstellt.'); }
  const backup: SaveBackup = { format: 'frontline-local-save', version: 1, createdAt: new Date().toISOString(), data: {
    'stats-v1': readStats(), 'history-v1': readHistory(), 'campaign-v1': readCampaign(), 'series-v1': readSeries(),
    'learning-v1': readLearning(), 'mastery-v1': readMastery(), 'deck-slots-v1': readDeckSlots(), 'deck-v1': readDeck(), 'commander-v1': readCommander(),
  } };
  const text = JSON.stringify(backup);
  parseBackup(text);
  return text;
}
export function restoreBackup(text: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): void {
  const backup = parseBackup(text); // Revalidate at commit, not only during preview.
  const before = saveKeys.map(key => storage.getItem('frontline-' + key));
  try {
    for (const key of saveKeys) storage.setItem('frontline-' + key, key === 'commander-v1' ? backup.data[key] as string : JSON.stringify(backup.data[key]));
  } catch {
    let rollbackFailed = false;
    saveKeys.forEach((key, i) => {
      try { if (before[i] === null) storage.removeItem('frontline-' + key); else storage.setItem('frontline-' + key, before[i]!); }
      catch { rollbackFailed = true; }
    });
    throw Error(rollbackFailed ? 'Speicherfehler: Der bisherige Stand konnte nicht vollständig wiederhergestellt werden. Sicherung behalten und vor dem Weiterspielen erneut importieren.' : 'Nicht genug Speicher oder Speicherung gesperrt. Der bisherige Stand wurde wiederhergestellt.');
  }
}
