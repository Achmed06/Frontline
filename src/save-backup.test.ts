import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_LIMIT, createBackup, parseBackup, restoreBackup } from './save-backup';
import { saveCampaign, saveCommander, saveLearning, saveStats, readCampaign, readCommander, readLearning } from './storage';
import { MISSIONS } from './campaign';
import { normalizeLearning, styleUnlocked } from './headquarters';

class MemoryStorage {
  data = new Map<string, string>();
  writes = 0;
  failAt = -1;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { if (++this.writes === this.failAt) throw Error('Quota exceeded'); this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
function withStorage(work: (store: MemoryStorage) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true });
  try { work(store); }
  finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
}
test('portable save roundtrip keeps progress but never grants Apple purchases or copies sessions', () => withStorage(store => {
  const progress = { [MISSIONS[0].id]: { stars: 2, bestTime: 90 } };
  saveCampaign(progress); saveCommander('nova');
  const learning = normalizeLearning(null); learning.style = 'supporter'; saveLearning(learning);
  store.setItem('frontline-duel-session', 'private-token'); store.setItem('frontline-purchase', 'fake');
  const text = createBackup();
  assert.ok(!text.includes('private-token')); assert.ok(!text.includes('fake'));
  saveCampaign({}); saveCommander('atlas');
  restoreBackup(text, store);
  assert.deepEqual(readCampaign(), progress); assert.equal(readCommander(), 'nova');
  assert.equal(readLearning().style, 'supporter');
  assert.equal(styleUnlocked('supporter', readLearning(), 24), false);
  assert.equal(store.getItem('frontline-duel-session'), 'private-token');
}));
test('invalid, incomplete, oversized and future saves never write; quota errors roll back', () => withStorage(store => {
  saveStats({ matches: 5, wins: 2, rematches: 0, lastFeedback: '' });
  const text = createBackup();
  const initial = new Map(store.data);
  const change = (modify: (backup: any) => void) => { const backup = JSON.parse(text); modify(backup); return JSON.stringify(backup); };
  for (const invalid of ['{', 'x'.repeat(BACKUP_LIMIT + 1), change(b => b.version = 2), change(b => delete b.data['deck-v1']), change(b => b.data['deck-v1'] = ['fake']), change(b => b.data['campaign-v1'] = { bad: { stars: 99 } }), change(b => b.data['entitlement'] = true)]) {
    assert.throws(() => restoreBackup(invalid, store));
    assert.deepEqual(store.data, initial);
  }
  const beforeWrites = store.writes;
  parseBackup(text); assert.equal(store.writes, beforeWrites);
  store.failAt = store.writes + 4;
  assert.throws(() => restoreBackup(text, store), /wiederhergestellt/);
  assert.deepEqual(store.data, initial);
}));
