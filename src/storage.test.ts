import assert from "node:assert/strict";
import test from "node:test";
import { Match, DEFAULT_DECK, type CardId } from "./engine.ts";
import {
  readDeck,
  saveDeck,
  readStats,
  saveStats,
  createMatchRecord,
  readHistory,
  saveHistory,
  HISTORY_LIMIT,
  readCampaign,
  saveCampaign,
} from "./storage.ts";

test("deck persistence validates data, preserves old stats and recovers from bad saves", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
  try {
    const stats = { matches: 7, wins: 3, rematches: 2, lastFeedback: "again" };
    saveStats(stats);
    assert.deepEqual(readDeck(), DEFAULT_DECK);
    const deck: CardId[] = [
      "raider",
      "sentinel",
      "ranger",
      "swarm",
      "lancer",
      "medic",
      "pulse",
      "rally",
    ];
    assert.equal(saveDeck(deck), true);
    assert.deepEqual(readDeck(), deck);
    assert.deepEqual(readStats(), stats);
    const alternate: CardId[] = [...deck.slice(0, 6), "stasis", "repulsor"];
    assert.equal(saveDeck(alternate), true);
    assert.deepEqual(readDeck(), alternate);
    assert.equal(saveDeck(deck), true);
    assert.equal(saveDeck(["raider"]), false);
    assert.deepEqual(readDeck(), deck);
    for (const broken of [
      "{bad",
      "null",
      '["unknown"]',
      JSON.stringify([...DEFAULT_DECK.slice(0, 7), "vanguard"]),
    ]) {
      data.set("frontline-deck-v1", broken);
      assert.deepEqual(readDeck(), DEFAULT_DECK);
    }
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage blocked");
      },
    });
    assert.deepEqual(readDeck(), DEFAULT_DECK);
    assert.equal(saveDeck(deck), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("match reports snapshot finished games and reject unfinished games", () => {
  const match = new Match({ botEnabled: false, difficulty: "veteran" });
  assert.throws(() => createMatchRecord(match), /unfinished/);
  match.state.phase = "ended";
  match.state.winner = "draw";
  match.state.time = 225;
  const report = createMatchRecord(match);
  assert.equal(report.duration, 225);
  assert.equal(report.outcome, "draw");
  assert.equal(report.difficulty, "veteran");
  assert.deepEqual(report.core, { player: 100, enemy: 100 });
  assert.deepEqual(report.points, { player: 3, enemy: 3 });
  assert.deepEqual(report.deck, DEFAULT_DECK);
  assert.notEqual(report.deck, match.decks.player);
  match.state.cores.player.hp = 0;
  match.state.points[6].owner = "enemy";
  assert.equal(report.core.player, 100);
  assert.equal(report.points.player, 3);
});

test("history preserves feedback and existing saves, caps records and rejects corrupt data", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
  try {
    saveDeck(DEFAULT_DECK);
    const stats = { matches: 8, wins: 4, rematches: 3, lastFeedback: "again" };
    saveStats(stats);
    assert.deepEqual(readHistory(), []);
    assert.deepEqual(readCampaign(), {});
    assert.equal(
      saveCampaign({ bridgehead: { stars: 2, bestTime: 95 } }),
      true,
    );
    assert.deepEqual(readCampaign(), {
      bridgehead: { stars: 2, bestTime: 95 },
    });
    data.set("frontline-campaign-v1", "{broken");
    assert.deepEqual(readCampaign(), {});
    const match = new Match({ botEnabled: false });
    match.state.phase = "ended";
    match.state.winner = "player";
    const records = Array.from({ length: HISTORY_LIMIT + 5 }, () =>
      createMatchRecord(match),
    );
    records[0].feedback = "unclear";
    assert.equal(saveHistory(records), true);
    assert.equal(readHistory().length, HISTORY_LIMIT);
    assert.deepEqual(readHistory()[0], records[0]);
    assert.deepEqual(readHistory().at(-1), records[HISTORY_LIMIT - 1]);
    assert.deepEqual(readStats(), stats);
    assert.deepEqual(readDeck(), DEFAULT_DECK);
    const bad = [
      null,
      {},
      { ...records[0], duration: 226 },
      { ...records[0], core: { player: Infinity, enemy: 0 } },
      { ...records[0], points: { player: 9, enemy: 9 } },
      { ...records[0], deck: ["unknown"] },
      { ...records[0], feedback: "<script>" },
      { ...records[0], difficulty: "fake" },
      { ...records[0], recordedAt: -1 },
      { ...records[0], outcome: "fake" },
    ];
    data.set(
      "frontline-history-v1",
      JSON.stringify([...bad, records[0], records[0], records[1]]),
    );
    assert.deepEqual(readHistory(), records.slice(0, 2));
    assert.equal(saveHistory([records[0], records[0]]), false);
    assert.equal(readHistory().length, 2);
    for (const broken of ["null", "{}", "{broken"]) {
      data.set("frontline-history-v1", broken);
      assert.deepEqual(readHistory(), []);
    }
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    assert.deepEqual(readHistory(), []);
    assert.equal(saveHistory(records), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
