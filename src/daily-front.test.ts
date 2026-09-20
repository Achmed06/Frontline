import test from "node:test";
import assert from "node:assert/strict";
import { Match, isValidDeck } from "./engine";
import {
  completeDaily,
  dailyChallenge,
  dailyKey,
  dailyRecord,
  normalizeDailyHistory,
} from "./daily-front";

test("daily front is deterministic for the local calendar day and changes across days", () => {
  const firstDate = new Date(2026, 8, 20, 8, 0, 0);
  const sameDate = new Date(2026, 8, 20, 23, 59, 59);
  const nextDate = new Date(2026, 8, 21, 0, 0, 1);
  assert.equal(dailyKey(firstDate), "2026-09-20");
  assert.deepEqual(dailyChallenge(firstDate), dailyChallenge(sameDate));
  assert.notDeepEqual(dailyChallenge(firstDate), dailyChallenge(nextDate));
});

test("daily front always creates legal decks and a legal nine-point start", () => {
  for (let day = 1; day <= 31; day++) {
    const challenge = dailyChallenge(new Date(2026, 9, day));
    assert.equal(isValidDeck([...challenge.playerDeck]), true);
    assert.equal(isValidDeck([...challenge.enemyDeck]), true);
    assert.equal(challenge.owners.length, 9);
    assert.ok(challenge.owners.slice(0, 3).every((owner) => owner === "enemy"));
    assert.ok(challenge.owners.slice(6).every((owner) => owner === "player"));
  }
});

test("daily history records attempts and preserves the best winning result", () => {
  const challenge = dailyChallenge(new Date(2026, 8, 20));
  const match = new Match({
    botEnabled: false,
    seed: challenge.seed,
    playerDeck: challenge.playerDeck,
    enemyDeck: challenge.enemyDeck,
    playerCommander: challenge.playerCommander,
    enemyCommander: challenge.enemyCommander,
    startingOwners: challenge.owners,
    controlObjective: challenge.controlObjective,
  });
  match.state.phase = "ended";
  match.state.winner = "enemy";
  let history = completeDaily([], challenge.key, match.state);
  assert.equal(history[0].attempts, 1);
  assert.equal(history[0].completed, false);

  match.state.phase = "ended";
  match.state.winner = "player";
  match.state.time = 123;
  match.state.cores.player.hp = match.state.cores.player.maxHp * 0.61;
  history = completeDaily(history, challenge.key, match.state);
  assert.equal(dailyRecord(history, challenge.key)?.completed, true);
  assert.equal(history[0].attempts, 2);
  assert.equal(history[0].bestTime, 123);
  assert.equal(history[0].bestCore, 61);

  match.state.time = 130;
  match.state.cores.player.hp = match.state.cores.player.maxHp * 0.8;
  history = completeDaily(history, challenge.key, match.state);
  assert.equal(history[0].bestTime, 123);
  assert.equal(history[0].bestCore, 80);
});

test("daily history normalization rejects malformed and duplicate records", () => {
  const good = {
    key: "2026-09-20",
    attempts: 2,
    completed: true,
    bestTime: 120,
    bestCore: 75,
    bestPoints: 6,
  };
  assert.deepEqual(
    normalizeDailyHistory([good, good, { ...good, key: "bad" }]),
    [good],
  );
});
