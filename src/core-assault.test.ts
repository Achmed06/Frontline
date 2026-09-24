import assert from "node:assert/strict";
import test from "node:test";
import { coreAssault } from "./core-assault";
import type { MatchState, Unit } from "./engine";

const unit = (
  id: number,
  team: "player" | "enemy",
  x: number,
  y: number,
): Unit => ({
  id,
  cardId: "vanguard",
  team,
  x,
  y,
  hp: 100,
  maxHp: 100,
  radius: 10,
  shield: 0,
  damage: 16,
  range: 24,
  speed: 35,
  interval: 1,
  attackCooldown: 0,
  healCooldown: 0,
  shieldTime: 0,
  rallyTime: 0,
  slowTime: 0,
  slowFactor: 1,
});

const state = (units: Unit[]): MatchState => ({
  controlTime: { player: 0, enemy: 0 },
  time: 90,
  phase: "playing",
  winner: null,
  reason: "",
  energy: { player: 5, enemy: 5 },
  cores: {
    player: { x: 210, y: 520, hp: 1000, maxHp: 1000 },
    enemy: { x: 210, y: 40, hp: 1000, maxHp: 1000 },
  },
  points: [],
  units,
  effects: [],
  commanderCooldown: 0,
  enemyCommanderCooldown: 0,
  stats: {
    deployed: 0,
    unitPlays: {},
    captured: 0,
    kills: 0,
    abilities: 0,
  },
});

test("counts only living units currently targeting the enemy core", () => {
  const assault = coreAssault(
    state([
      unit(3, "player", 210, 70),
      unit(1, "player", 220, 70),
      unit(9, "player", 210, 220),
    ]),
    "enemy",
  );
  assert.equal(assault.count, 2);
  assert.deepEqual(assault.unitIds, [1, 3]);
  assert.equal(assault.label, "DURCHBRUCH ×2");
});

test("enemy assault mirrors the same exact combat-target rule", () => {
  const assault = coreAssault(
    state([unit(7, "enemy", 210, 490)]),
    "player",
  );
  assert.equal(assault.count, 1);
  assert.equal(assault.label, "CORE UNTER FEUER ×1");
});

test("nearby enemy units block a unit from being counted as core pressure", () => {
  const attacking = unit(1, "player", 210, 70);
  const blocker = unit(2, "enemy", 210, 82);
  const assault = coreAssault(state([attacking, blocker]), "enemy");
  assert.equal(assault.count, 0);
  assert.equal(assault.active, false);
});

test("dead units never create a fake core assault", () => {
  const dead = unit(1, "player", 210, 70);
  dead.hp = 0;
  assert.equal(coreAssault(state([dead]), "enemy").count, 0);
});
