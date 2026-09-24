import assert from "node:assert/strict";
import test from "node:test";
import {
  battleMomentum,
  INITIAL_BATTLE_MOMENTUM,
} from "./battle-momentum";

test("does not announce ordinary early territory movement", () => {
  const result = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: 12,
    playerPoints: 5,
    enemyPoints: 2,
  });
  assert.equal(result.event, null);
});

test("announces a clear player advance only once", () => {
  const first = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: 35,
    playerPoints: 5,
    enemyPoints: 2,
  });
  assert.equal(first.event?.id, "playerAdvance");
  assert.equal(first.event?.tone, "opportunity");

  const second = battleMomentum(first.memory, {
    time: 36,
    playerPoints: 6,
    enemyPoints: 2,
  });
  assert.equal(second.event, null);
});

test("announces a clear enemy advance as danger", () => {
  const result = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: 28,
    playerPoints: 2,
    enemyPoints: 5,
  });
  assert.equal(result.event?.id, "enemyAdvance");
  assert.equal(result.event?.tone, "danger");
});

test("comeback requires a real earlier two-point deficit", () => {
  const behind = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: 26,
    playerPoints: 2,
    enemyPoints: 4,
  });
  assert.equal(behind.event, null);
  assert.equal(behind.memory.maxEnemyLead, 2);

  const tied = battleMomentum(behind.memory, {
    time: 42,
    playerPoints: 4,
    enemyPoints: 4,
  });
  assert.equal(tied.event, null);

  const ahead = battleMomentum(tied.memory, {
    time: 49,
    playerPoints: 5,
    enemyPoints: 4,
  });
  assert.equal(ahead.event?.id, "comeback");
  assert.equal(ahead.event?.title, "FRONT GEDREHT");
});

test("comeback suppresses an immediate duplicate player-advance banner", () => {
  const behind = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: 25,
    playerPoints: 1,
    enemyPoints: 4,
  });
  const comeback = battleMomentum(behind.memory, {
    time: 50,
    playerPoints: 5,
    enemyPoints: 2,
  });
  assert.equal(comeback.event?.id, "comeback");

  const next = battleMomentum(comeback.memory, {
    time: 51,
    playerPoints: 6,
    enemyPoints: 2,
  });
  assert.equal(next.event, null);
});

test("malformed time safely behaves like match start", () => {
  const result = battleMomentum(INITIAL_BATTLE_MOMENTUM, {
    time: Number.NaN,
    playerPoints: 6,
    enemyPoints: 1,
  });
  assert.equal(result.event, null);
});
