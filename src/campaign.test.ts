import assert from "node:assert/strict";
import test from "node:test";
import { Match, isValidDeck, CORE_HP } from "./engine.ts";
import {
  MISSIONS,
  CHAPTERS,
  completeMission,
  missionStars,
  missionUnlocked,
  normalizeProgress,
} from "./campaign.ts";

test("all campaign fronts and decks are playable without changing combat values", () => {
  for (const mission of MISSIONS) {
    assert.ok(isValidDeck(mission.enemyDeck));
    const match = new Match({
      seed: mission.seed,
      difficulty: mission.difficulty,
      enemyDeck: mission.enemyDeck,
      enemyCommander: mission.enemyCommander,
      startingOwners: mission.owners,
      controlObjective: mission.controlObjective,
    });
    assert.deepEqual(
      match.state.points.map((point) => point.owner),
      mission.owners,
    );
    if (mission.enemyCommander)
      assert.equal(match.commanders.enemy, mission.enemyCommander);
    assert.equal(match.state.cores.player.maxHp, CORE_HP);
    assert.equal(match.state.cores.enemy.maxHp, CORE_HP);
    assert.ok(match.canDeploy("player", 210, 490));
    assert.ok(match.canDeploy("enemy", 210, 70));
    for (let tick = 0; tick < 30 * 10; tick++) match.update(1 / 30);
    assert.ok(match.state.units.length > 0);
    assert.deepEqual(
      mission.owners,
      MISSIONS.find((item) => item.id === mission.id)!.owners,
    );
  }
  const cut = new Match({ startingOwners: MISSIONS[3].owners });
  assert.equal(cut.state.points[0].owner, "player");
  assert.equal(cut.state.points[0].supplied, false);
  assert.equal(cut.canDeploy("player", 85, 160), false);
  assert.throws(() => new Match({ startingOwners: [null] }));
  assert.throws(() => new Match({ startingOwners: Array(9) }));
});

test("campaign unlocks in order and preserves best stars and victory time", () => {
  const match = new Match({ botEnabled: false });
  const mission = MISSIONS[0];
  assert.ok(missionUnlocked(0, {}));
  assert.equal(missionUnlocked(1, {}), false);
  assert.equal(missionUnlocked(-1, {}), false);
  assert.equal(missionUnlocked(MISSIONS.length, {}), false);
  assert.equal(missionStars(mission, match.state), 0);
  match.state.phase = "ended";
  match.state.winner = "enemy";
  assert.deepEqual(completeMission({}, mission, match.state), {});
  match.state.winner = "draw";
  assert.equal(missionStars(mission, match.state), 0);
  match.state.winner = "player";
  match.state.time = mission.speedTarget;
  match.state.cores.player.hp = CORE_HP * mission.healthTarget;
  assert.equal(missionStars(mission, match.state), 3);
  assert.deepEqual(completeMission({}, MISSIONS[1], match.state), {});
  const progress = completeMission({}, mission, match.state);
  assert.ok(missionUnlocked(1, progress));
  assert.equal(missionUnlocked(2, progress), false);
  match.state.time = 170;
  match.state.cores.player.hp = 1;
  assert.equal(missionStars(mission, match.state), 1);
  assert.deepEqual(completeMission(progress, mission, match.state), progress);
  match.state.time = 80;
  const improved = completeMission(progress, mission, match.state);
  assert.deepEqual(improved[mission.id], { stars: 3, bestTime: 80 });
  assert.equal(progress[mission.id].bestTime, mission.speedTarget);
});

test("campaign progress rejects corrupt values and unknown missions", () => {
  for (const value of [
    null,
    [],
    "invalid",
    { bridgehead: { stars: 9, bestTime: 50 } },
    { bridgehead: { stars: 2, bestTime: Infinity } },
  ])
    assert.deepEqual(normalizeProgress(value), {});
  assert.deepEqual(
    normalizeProgress({
      bridgehead: { stars: 2, bestTime: 90 },
      unknown: { stars: 3, bestTime: 10 },
    }),
    { bridgehead: { stars: 2, bestTime: 90 } },
  );
});

test("chapter four extends old saves and keeps every mission reachable in order", () => {
  assert.equal(MISSIONS.length, 24);
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length);
  assert.equal(new Set(MISSIONS.map((m) => m.seed)).size, MISSIONS.length);
  assert.deepEqual(
    CHAPTERS.map((c) => MISSIONS.findIndex((m) => m.id === c.firstMission)),
    [0, 6, 12, 18],
  );
  let progress = normalizeProgress(
    Object.fromEntries(
      MISSIONS.slice(0, 18).map((m) => [m.id, { stars: 2, bestTime: 100 }]),
    ),
  );
  const oldProgress = JSON.stringify(progress);
  assert.ok(missionUnlocked(18, progress));
  assert.equal(missionUnlocked(19, progress), false);
  const match = new Match({ botEnabled: false });
  match.state.phase = "ended";
  match.state.winner = "player";
  match.state.time = 90;
  for (let i = 18; i < MISSIONS.length; i++) {
    assert.ok(missionUnlocked(i, progress));
    progress = completeMission(progress, MISSIONS[i], match.state);
    assert.equal(progress[MISSIONS[i].id].stars, 3);
  }
  assert.equal(
    JSON.stringify(Object.fromEntries(Object.entries(progress).slice(0, 18))),
    oldProgress,
  );
  assert.deepEqual(normalizeProgress(progress), progress);
});
test("broken circuit starts with an isolated relay and permits restoring its supply", () => {
  const mission = MISSIONS.find((m) => m.id === "broken-circuit")!;
  const match = new Match({
    startingOwners: mission.owners,
    controlObjective: mission.controlObjective,
    botEnabled: false,
  });
  assert.equal(match.state.points[3].owner, "player");
  assert.equal(match.state.points[3].supplied, false);
  assert.equal(match.canDeploy("player", 85, 280), false);
  match.update(1);
  assert.equal(match.state.controlTime.player, 0);
  match.state.points[6].owner = "player";
  match.update(1);
  assert.equal(match.state.points[3].supplied, true);
  assert.ok(match.state.controlTime.player > 0);
  assert.equal(match.canDeploy("player", 85, 280), true);
});
