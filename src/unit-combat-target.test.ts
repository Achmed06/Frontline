import assert from "node:assert/strict";
import test from "node:test";
import { Match, unitCombatTarget } from "./engine";

test("unit combat targeting exposes the same nearest acquired enemy used by combat", () => {
  const match = new Match({ seed: 41, botEnabled: false });
  match.state.energy.player = 10;
  match.state.energy.enemy = 10;
  assert.equal(match.play("player", "lancer", 210, 430).ok, true);
  assert.equal(match.play("enemy", "vanguard", 210, 110).ok, true);
  assert.equal(match.play("enemy", "vanguard", 210, 110).ok, true);

  const lancer = match.state.units.find((unit) => unit.cardId === "lancer")!;
  const enemies = match.state.units.filter((unit) => unit.team === "enemy");
  Object.assign(lancer, { x: 210, y: 300 });
  Object.assign(enemies[0], { x: 210, y: 220 });
  Object.assign(enemies[1], { x: 260, y: 220 });

  const target = unitCombatTarget(match.state, lancer);
  assert.ok(target && !target.core);
  assert.equal(target.target.id, enemies[0].id);
  assert.equal(target.distance, 80);
  assert.equal(target.inRange, true);
});

test("acquired enemies remain the target while out of firing range", () => {
  const match = new Match({ seed: 42, botEnabled: false });
  match.state.energy.player = 10;
  match.state.energy.enemy = 10;
  assert.equal(match.play("player", "sentinel", 210, 430).ok, true);
  assert.equal(match.play("enemy", "vanguard", 210, 110).ok, true);

  const sentinel = match.state.units.find((unit) => unit.cardId === "sentinel")!;
  const enemy = match.state.units.find((unit) => unit.team === "enemy")!;
  Object.assign(sentinel, { x: 210, y: 300 });
  Object.assign(enemy, { x: 210, y: 160 });

  const target = unitCombatTarget(match.state, sentinel);
  assert.ok(target && !target.core);
  assert.equal(target.target.id, enemy.id);
  assert.equal(target.inRange, false);
});

test("enemy Core is exposed only when no unit is acquired and the Core is in attack range", () => {
  const match = new Match({ seed: 43, botEnabled: false });
  match.state.energy.player = 10;
  assert.equal(match.play("player", "lancer", 210, 430).ok, true);
  const lancer = match.state.units[0];
  const enemyCore = match.state.cores.enemy;
  Object.assign(lancer, {
    x: enemyCore.x,
    y: enemyCore.y + lancer.range + lancer.radius + 20,
  });

  const target = unitCombatTarget(match.state, lancer);
  assert.ok(target?.core);
  assert.equal(target.target, enemyCore);
  assert.equal(target.inRange, true);
});

test("ended matches and dead units expose no combat target", () => {
  const match = new Match({ seed: 44, botEnabled: false });
  match.state.energy.player = 10;
  assert.equal(match.play("player", "lancer", 210, 430).ok, true);
  const lancer = match.state.units[0];

  lancer.hp = 0;
  assert.equal(unitCombatTarget(match.state, lancer), undefined);
  lancer.hp = lancer.maxHp;
  match.state.phase = "ended";
  assert.equal(unitCombatTarget(match.state, lancer), undefined);
});
