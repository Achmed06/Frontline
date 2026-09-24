import assert from "node:assert/strict";
import test from "node:test";
import {
  abilityTargetPreview,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CAPTURE_DECAY_RATE,
  CAPTURE_GROUP_SUPPORT,
  CAPTURE_RADIUS,
  CAPTURE_SECONDS,
  CARDS,
  DEFAULT_DECK,
  isValidDeck,
  type CardId,
  COMMANDER_COOLDOWN,
  CORE_TURRET_DAMAGE,
  CORE_TURRET_INTERVAL,
  CORE_TURRET_RANGE,
  controlPointPressure,
  coreTurretTarget,
  deploymentColumns,
  frontlineStatus,
  ENERGY_CAP,
  ENERGY_RATE,
  Match,
  type Team,
  type Unit,
} from "./engine.ts";

const quietMatch = () => new Match({ seed: 42, botEnabled: false });
function staticUnit(
  match: Match,
  team: Team,
  x: number,
  y: number,
  cardId = "vanguard",
): Unit {
  const result = match.play(team, cardId, x, team === "player" ? 450 : 110);
  assert.equal(result.ok, true);
  const unit = match.state.units.at(-1)!;
  Object.assign(unit, { x, y, speed: 0, damage: 0, range: 0 });
  return unit;
}

test("initial map has symmetric resources, six unit cards and two tactical abilities", () => {
  const match = quietMatch();
  assert.equal(
    match.decks.player.filter(
      (id) => CARDS.find((card) => card.id === id)?.kind === "unit",
    ).length,
    6,
  );
  assert.equal(CARDS.filter((card) => card.kind === "unit").length, 12);
  assert.equal(CARDS.filter((card) => card.kind === "ability").length, 4);
  assert.deepEqual(match.state.energy, { player: 6, enemy: 6 });
  assert.deepEqual(
    match.state.points.map((point) => point.owner),
    ["enemy", "enemy", "enemy", null, null, null, "player", "player", "player"],
  );
  assert.equal(match.frontline("player", 210), 350);
  assert.equal(match.frontline("enemy", 210), 210);
});

test("deployment follows connected supply in its own column and cuts off immediately", () => {
  const match = quietMatch();
  assert.equal(match.canDeploy("player", 210, 349), false);
  assert.equal(match.canDeploy("player", 210, 350), true);
  match.state.points[4].owner = "player";
  assert.equal(match.frontline("player", 210), 220);
  assert.equal(match.canDeploy("player", 210, 230), true);
  assert.equal(match.canDeploy("player", 85, 230), false);
  match.state.points[1].owner = "player";
  assert.equal(match.frontline("player", 210), 90);
  match.state.points[7].owner = "enemy";
  assert.equal(match.frontline("player", 210), 475);
  assert.equal(match.canDeploy("player", 210, 230), false);
  assert.equal(match.canDeploy("player", 210, 490), true);
  match.update(1 / 30);
  assert.equal(match.state.points[4].supplied, false);
  assert.equal(match.state.points[1].supplied, false);
});

test("swarm members cannot spawn beyond supply when crossing a column boundary", () => {
  const match = quietMatch();
  match.state.points[6].owner = null;
  match.state.points[4].owner = "player";
  const preview = match.deploymentPreview("player", "swarm", 150, 230);
  assert.equal(preview.length, 3);
  assert.equal(match.play("player", "swarm", 150, 230).ok, true);
  assert.equal(match.state.units.length, 3);
  assert.deepEqual(
    match.state.units.map((unit) => ({ x: unit.x, y: unit.y })),
    preview.map(({ x, y }) => ({ x, y })),
  );
  assert.ok(
    match.state.units.every((unit) =>
      match.canDeploy("player", unit.x, unit.y),
    ),
  );
});

test("deployment preview predicts exact swarm spawn points", () => {
  const match = quietMatch();
  match.state.points[6].owner = null;
  match.state.points[4].owner = "player";
  const preview = match.deploymentPreview("player", "swarm", 150, 230);
  assert.deepEqual(
    preview.map(({ x, idealX }) => ({ x, idealX })),
    [
      { x: 133, idealX: 133 },
      { x: 150, idealX: 150 },
      { x: 167, idealX: 167 },
    ],
  );
  assert.deepEqual(
    preview.map((point) => point.adjusted),
    [true, false, false],
  );
  assert.equal(preview[0].idealY, 230);
  assert.ok(preview[0].y > preview[0].idealY);
  assert.equal(preview[1].y, 230);
  assert.equal(preview[2].y, 230);

  const single = match.deploymentPreview("player", "vanguard", 210, 390);
  assert.deepEqual(
    single.map(({ x, y, idealX, idealY, adjusted }) => ({
      x,
      y,
      idealX,
      idealY,
      adjusted,
    })),
    [{ x: 210, y: 390, idealX: 210, idealY: 390, adjusted: false }],
  );
});

test("deployment preview reports board-edge formation correction", () => {
  const match = quietMatch();
  const preview = match.deploymentPreview("player", "swarm", 25, 490);
  assert.equal(preview.length, 3);
  assert.equal(preview[0].idealX, 8);
  assert.equal(preview[0].x, 18);
  assert.equal(preview[0].adjusted, true);
  assert.equal(preview[1].adjusted, false);
  assert.equal(preview[2].adjusted, false);
});

test("invalid actions are atomic and energy regenerates equally, independent of territory", () => {
  const match = quietMatch();
  assert.equal(match.play("player", "bulwark", 210, 280).ok, false);
  assert.equal(match.play("player", "vanguard", NaN, 440).ok, false);
  assert.equal(match.play("player", "unknown", 210, 440).ok, false);
  assert.equal(match.play("player", "rally", 210, 440).ok, false);
  assert.equal(match.state.energy.player, 6);
  assert.equal(match.state.units.length, 0);
  assert.equal(match.play("player", "bulwark", 85, 440).ok, true);
  assert.equal(match.play("player", "bulwark", 85, 440).ok, false);
  match.state.units = [];
  match.state.energy.enemy = 2;
  match.state.points.forEach((point) => {
    point.owner = "player";
  });
  match.update(5);
  assert.ok(Math.abs(match.state.energy.player - (2 + ENERGY_RATE * 5)) < 1e-8);
  assert.equal(match.state.energy.player, match.state.energy.enemy);
  match.update(20);
  assert.equal(match.state.energy.player, ENERGY_CAP);
});

test("capturing requires several seconds of unopposed presence and unlocks supply", () => {
  const match = quietMatch();
  staticUnit(match, "player", 210, 280);
  match.update(CAPTURE_SECONDS - 0.2);
  assert.equal(match.state.points[4].owner, null);
  assert.equal(match.state.points[4].captureTeam, "player");
  assert.ok(match.state.points[4].capture > 0.8);
  match.update(0.4);
  assert.equal(match.state.points[4].owner, "player");
  assert.equal(match.state.points[4].supplied, true);
  assert.equal(match.frontline("player", 210), 220);
  assert.equal(match.state.stats.captured, 1);
  assert.ok(match.state.effects.some((effect) => effect.type === "capture"));
});

test("both teams contest a point, preventing any capture progress", () => {
  const match = quietMatch();
  staticUnit(match, "player", 200, 280);
  match.update(1);
  const previousProgress = match.state.points[4].capture;
  staticUnit(match, "enemy", 225, 280);
  match.update(6);
  assert.equal(match.state.points[4].contested, true);
  assert.equal(match.state.points[4].capture, previousProgress);
  assert.equal(match.state.points[4].owner, null);
});

test("capture progress decays after units leave the point", () => {
  const match = quietMatch();
  const unit = staticUnit(match, "player", 210, 280);
  match.update(2);
  unit.y = 450;
  match.update(4);
  assert.equal(match.state.points[4].owner, null);
  assert.equal(match.state.points[4].capture, 0);
  assert.equal(match.state.points[4].captureTeam, null);
});

test("Atlas shields absorb damage, expire, and enforce their cooldown", () => {
  const match = quietMatch();
  assert.equal(match.activateCommander().ok, false);
  const unit = staticUnit(match, "player", 210, 350);
  assert.equal(match.activateCommander().ok, true);
  assert.equal(unit.shield, 70);
  assert.equal(match.state.commanderCooldown, COMMANDER_COOLDOWN);
  assert.equal(match.activateCommander().ok, false);
  assert.equal(match.play("enemy", "pulse", 210, 350).ok, true);
  assert.equal(unit.hp, unit.maxHp - 15);
  assert.equal(unit.shield, 0);
  match.update(6.1);
  assert.equal(unit.shieldTime, 0);
  match.update(24);
  assert.equal(match.state.commanderCooldown, 0);
  assert.equal(match.activateCommander().ok, true);
  match.update(6.1);
  assert.equal(unit.shield, 0);
});

test("Rally heals up to max HP and gives a temporary buff only to nearby allies", () => {
  const match = quietMatch();
  const ally = staticUnit(match, "player", 210, 390);
  const distant = staticUnit(match, "player", 30, 490);
  const foe = staticUnit(match, "enemy", 230, 390);
  ally.hp -= 90;
  distant.hp -= 80;
  foe.hp -= 80;
  match.state.energy.player = 3;
  assert.equal(match.play("player", "rally", 210, 390).ok, true);
  assert.equal(ally.hp, ally.maxHp - 25);
  assert.equal(distant.hp, distant.maxHp - 80);
  assert.equal(foe.hp, foe.maxHp - 80);
  assert.equal(ally.rallyTime, 6);
  match.update(6.1);
  assert.equal(ally.rallyTime, 0);
});

test("Medic heals allies and core turret provides light defense", () => {
  const match = quietMatch();
  const ally = staticUnit(match, "player", 190, 390);
  const medic = staticUnit(match, "player", 230, 390, "medic");
  ally.hp = 50;
  match.update(1);
  assert.ok(ally.hp > 50);
  assert.ok(ally.hp <= ally.maxHp);
  assert.equal(medic.hp, medic.maxHp);
  const intruder = staticUnit(match, "enemy", 210, 465);
  const previousHp = intruder.hp;
  match.update(0.1);
  assert.ok(intruder.hp < previousHp);
});

test("Pulse deals area damage, removes deaths once, and can finish a core", () => {
  const match = quietMatch();
  const enemy = staticUnit(match, "enemy", 210, 220);
  enemy.hp = 50;
  assert.equal(match.play("player", "pulse", 210, 220).ok, true);
  assert.equal(match.state.units.length, 0);
  assert.equal(match.state.stats.kills, 1);
  assert.ok(match.state.effects.some((effect) => effect.type === "death"));
  match.state.energy.player = 4;
  match.state.cores.enemy.hp = 40;
  assert.equal(match.play("player", "pulse", 210, 35).ok, true);
  assert.equal(match.state.winner, "player");
  assert.equal(match.state.phase, "ended");
  assert.equal(match.play("player", "vanguard", 210, 440).ok, false);
});

test("attacking units move freely in both axes and attack the opposing core", () => {
  const match = quietMatch();
  assert.equal(match.play("player", "lancer", 170, 400).ok, true);
  const unit = match.state.units[0];
  match.update(1);
  assert.notEqual(unit.x, 170);
  assert.ok(unit.y < 400);
  unit.x = 210;
  unit.y = 145;
  let sawShot = false;
  for (let i = 0; i < 90; i++) {
    match.update(1 / 30);
    sawShot ||= match.state.effects.some(
      (effect) => effect.type === "shot" || effect.type === "core-hit",
    );
  }
  assert.ok(match.state.cores.enemy.hp < match.state.cores.enemy.maxHp);
  assert.ok(sawShot, "attack feedback appears during the attack, then expires");
});

test("180-second regulation has at most 45 seconds overtime with HP then points then draw", () => {
  const draw = quietMatch();
  draw.update(179.9);
  assert.equal(draw.state.phase, "playing");
  draw.update(0.1);
  assert.equal(draw.state.phase, "overtime");
  draw.update(44.9);
  assert.equal(draw.state.phase, "overtime");
  draw.update(0.1);
  assert.equal(draw.state.phase, "ended");
  assert.equal(draw.state.time, 225);
  assert.equal(draw.state.winner, "draw");
  const healthWinner = quietMatch();
  healthWinner.state.cores.enemy.hp -= 1;
  healthWinner.state.points.forEach((point) => {
    point.owner = "enemy";
  });
  healthWinner.update(1000);
  assert.equal(healthWinner.state.winner, "player");
  assert.equal(healthWinner.state.time, 180);
  const pointWinner = quietMatch();
  pointWinner.state.points[4].owner = "enemy";
  pointWinner.update(225);
  assert.equal(pointWinner.state.winner, "enemy");
  assert.equal(pointWinner.state.time, 180);
});

test("simultaneous core destruction produces a draw and ended games are frozen", () => {
  const match = quietMatch();
  match.state.cores.player.hp = 0;
  match.state.cores.enemy.hp = 0;
  match.update(1 / 30);
  assert.equal(match.state.winner, "draw");
  const state = JSON.stringify(match.state);
  match.update(100);
  assert.equal(JSON.stringify(match.state), state);
});

test("only update advances time; invalid deltas are harmless; frame chunking is deterministic", () => {
  const a = new Match({ seed: 739 });
  const b = new Match({ seed: 739 });
  a.update(0);
  a.update(-2);
  a.update(NaN);
  a.update(Infinity);
  assert.equal(a.state.time, 0);
  assert.equal(a.state.units.length, 0);
  a.update(20);
  for (let i = 0; i < 200; i++) b.update(0.1);
  assert.deepEqual(a.state, b.state);
  const differentSeed = new Match({ seed: 999 });
  differentSeed.update(20);
  assert.notDeepEqual(a.state.units, differentSeed.state.units);
});

for (const difficulty of ["rookie", "standard", "veteran"] as const) {
  test(`${difficulty} bot respects grace period, deployment bounds and its energy budget`, () => {
    const match = new Match({ seed: 190, difficulty });
    let spent = 0;
    const originalPlay = match.play.bind(match);
    match.play = (team, cardId, x, y) => {
      if (
        team === "enemy" &&
        CARDS.find((card) => card.id === cardId)?.kind === "unit"
      )
        assert.equal(match.canDeploy(team, x, y), true);
      const result = originalPlay(team, cardId, x, y);
      if (team === "enemy" && result.ok)
        spent += CARDS.find((card) => card.id === cardId)!.cost;
      return result;
    };
    match.update(3.9);
    assert.equal(match.state.units.length, 0);
    for (let i = 0; i < 100 && match.state.phase !== "ended"; i++) {
      match.update(1);
      assert.ok(
        match.state.energy.enemy >= 0 && match.state.energy.enemy <= ENERGY_CAP,
      );
      assert.ok(spent <= 6 + ENERGY_RATE * match.state.time + 1e-6);
      assert.ok(
        match.state.units.every(
          (unit) =>
            unit.x >= 0 &&
            unit.x <= BOARD_WIDTH &&
            unit.y >= 0 &&
            unit.y <= BOARD_HEIGHT,
        ),
      );
    }
    assert.ok(spent > 10);
    assert.ok(match.state.stats.captured === 0);
  });
}

test("tactical bot saves enough energy for Pulse against a dense enemy group", () => {
  const match = new Match({ seed: 41, difficulty: "veteran" });
  for (const x of [195, 210, 225]) staticUnit(match, "player", x, 280);
  match.update(3.9);
  match.state.energy.enemy = 2;
  const actions: string[] = [];
  const originalPlay = match.play.bind(match);
  match.play = (team, cardId, x, y) => {
    const result = originalPlay(team, cardId, x, y);
    if (team === "enemy" && result.ok) actions.push(cardId);
    return result;
  };
  match.update(0.2);
  assert.equal(actions.length, 0, "does not waste the reserve on a cheap unit");
  match.update(8);
  assert.ok(
    actions.includes("pulse"),
    "eventually uses the saved energy for the counter",
  );
  assert.ok(match.state.energy.enemy >= 0);
});

test("deck validation rejects unknown, duplicate and incomplete selections", () => {
  assert.equal(isValidDeck(DEFAULT_DECK), true);
  for (const invalid of [
    null,
    {},
    [],
    DEFAULT_DECK.slice(1),
    [...DEFAULT_DECK.slice(0, 7), "vanguard"],
    [...DEFAULT_DECK.slice(0, 7), "unknown"],
  ]) {
    assert.equal(isValidDeck(invalid), false);
    if (Array.isArray(invalid))
      assert.throws(() => new Match({ playerDeck: invalid as CardId[] }));
  }
});

test("match snapshots the selected deck and rejects excluded cards atomically", () => {
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
  const match = new Match({ playerDeck: deck, botEnabled: false });
  deck[0] = "vanguard";
  assert.equal(match.decks.player[0], "raider");
  assert.deepEqual(match.decks.player, match.decks.enemy);
  const previous = JSON.stringify(match.state);
  assert.equal(match.play("player", "vanguard", 210, 400).ok, false);
  assert.equal(match.play("enemy", "bulwark", 210, 110).ok, false);
  assert.equal(JSON.stringify(match.state), previous);
  assert.equal(match.play("player", "raider", 210, 400).ok, true);
  assert.equal(match.state.units[0].cardId, "raider");
  assert.equal(match.state.units[0].speed, 56);
});

test("every six-unit combination is legal and bot fallback never escapes its deck", () => {
  const units = CARDS.filter((card) => card.kind === "unit").map(
    (card) => card.id,
  );
  function* combinations(
    start = 0,
    chosen: CardId[] = [],
  ): Generator<CardId[]> {
    if (chosen.length === 6) {
      yield [...chosen, "pulse", "rally"];
      return;
    }
    for (let i = start; i < units.length; i++)
      yield* combinations(i + 1, [...chosen, units[i]]);
  }
  let count = 0;
  for (const deck of combinations()) {
    assert.equal(isValidDeck(deck), true);
    const match = new Match({
      seed: ++count,
      playerDeck: deck,
      difficulty: "veteran",
    });
    let successfulPlays = 0;
    const play = match.play.bind(match);
    match.play = (team, id, x, y) => {
      assert.ok(match.decks[team].includes(id as CardId));
      const result = play(team, id, x, y);
      if (result.ok) successfulPlays++;
      return result;
    };
    match.update(45);
    assert.ok(successfulPlays > 3);
    assert.ok(
      match.state.units.every((unit) => deck.includes(unit.cardId as CardId)),
    );
  }
  assert.equal(count, 924);
});

test("Sentinel uses existing ranged combat and cannot deploy past the front", () => {
  const deck: CardId[] = [
    "vanguard",
    "bulwark",
    "ranger",
    "swarm",
    "lancer",
    "sentinel",
    "pulse",
    "rally",
  ];
  const match = new Match({ playerDeck: deck, botEnabled: false });
  assert.equal(match.play("player", "sentinel", 210, 280).ok, false);
  assert.equal(match.play("player", "sentinel", 210, 400).ok, true);
  const sentinel = match.state.units[0];
  const target = staticUnit(match, "enemy", 210, 310);
  match.update(0.5);
  assert.ok(target.hp < target.maxHp);
  assert.equal(sentinel.hp, 245);
});

test("aim validation is read-only and agrees with committed actions", () => {
  for (const [card, x, y] of [
    ["vanguard", 210, 450],
    ["vanguard", 210, 110],
    ["pulse", 210, 110],
    ["rally", 210, 450],
    ["raider", 210, 450],
    ["unknown", 210, 450],
    ["vanguard", NaN, 450],
    ["pulse", -1, 100],
  ] as const) {
    const match = quietMatch();
    const before = JSON.stringify(match.state);
    const preview = match.validatePlay("player", card, x, y);
    assert.equal(JSON.stringify(match.state), before);
    assert.equal(match.play("player", card, x, y).ok, preview.ok);
    if (!preview.ok) assert.equal(JSON.stringify(match.state), before);
  }
});

test("release rechecks energy, territory, targets and match end after a valid preview", () => {
  for (const change of ["energy", "territory", "end"] as const) {
    const match = quietMatch();
    assert.equal(match.validatePlay("player", "vanguard", 210, 400).ok, true);
    if (change === "energy") match.state.energy.player = 0;
    if (change === "territory") match.state.points[7].owner = "enemy";
    if (change === "end") match.state.phase = "ended";
    const before = JSON.stringify(match.state);
    assert.equal(match.play("player", "vanguard", 210, 400).ok, false);
    assert.equal(JSON.stringify(match.state), before);
  }
  const match = quietMatch();
  assert.equal(match.play("player", "vanguard", 210, 450).ok, true);
  assert.equal(match.validatePlay("player", "rally", 210, 450).ok, true);
  match.state.units[0].y = 200;
  const before = JSON.stringify(match.state);
  assert.equal(match.play("player", "rally", 210, 450).ok, false);
  assert.equal(JSON.stringify(match.state), before);
});

test("control objectives validate and snapshot configuration", () => {
  const goal = { pointIds: [3, 4, 5], requiredPoints: 2, seconds: 45 };
  const match = new Match({ controlObjective: goal });
  goal.pointIds[0] = 0;
  assert.deepEqual(match.controlObjective?.pointIds, [3, 4, 5]);
  for (const bad of [
    { pointIds: [], requiredPoints: 1, seconds: 45 },
    { pointIds: [4, 4], requiredPoints: 1, seconds: 45 },
    { pointIds: [9], requiredPoints: 1, seconds: 45 },
    { pointIds: [4], requiredPoints: 2, seconds: 45 },
    { pointIds: [4], requiredPoints: 1, seconds: NaN },
  ])
    assert.throws(() => new Match({ controlObjective: bad }));
});

test("control time pauses for contested or disconnected relays and retains progress", () => {
  const match = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 30 },
  });
  match.state.points[4].owner = "player";
  match.update(1);
  assert.ok(Math.abs(match.state.controlTime.player - 1) < 1e-8);
  match.state.points[7].owner = "enemy";
  match.update(1);
  assert.ok(Math.abs(match.state.controlTime.player - 1) < 1e-8);
  match.state.points[7].owner = "player";
  staticUnit(match, "player", 210, 280);
  staticUnit(match, "enemy", 210, 280);
  match.update(1);
  assert.equal(match.state.points[4].contested, true);
  assert.ok(Math.abs(match.state.controlTime.player - 1) < 1e-8);
  match.state.units.length = 0;
  match.update(1);
  assert.ok(Math.abs(match.state.controlTime.player - 2) < 1e-8);
});

test("control victory, simultaneous completion and core destruction resolve once", () => {
  const match = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 1 },
  });
  match.state.points[4].owner = "player";
  match.update(1);
  assert.equal(match.state.winner, "player");
  assert.equal(match.state.reason, "Kontrollziel erreicht.");
  const before = JSON.stringify(match.state);
  match.update(10);
  assert.equal(JSON.stringify(match.state), before);
  const draw = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [3, 5], requiredPoints: 1, seconds: 1 },
  });
  draw.state.points[3].owner = "player";
  draw.state.points[5].owner = "enemy";
  draw.update(1);
  assert.equal(draw.state.winner, "draw");
  const core = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 1 },
  });
  core.state.points[4].owner = "enemy";
  core.state.cores.enemy.hp = 0;
  core.update(1);
  assert.equal(core.state.winner, "player");
  assert.equal(core.state.reason, "Kern zerstört.");
});

test("control time takes priority at the time limit, with no overtime", () => {
  const match = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 180 },
  });
  match.state.controlTime.player = 5;
  match.state.cores.player.hp = 100;
  match.update(180);
  assert.equal(match.state.winner, "player");
  assert.equal(match.state.reason, "Zeitlimit: mehr Kontrollzeit.");
  const tie = new Match({
    botEnabled: false,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 180 },
  });
  tie.update(180);
  assert.equal(tie.state.winner, "draw");
});

const controlDeck: CardId[] = [
  "vanguard",
  "bulwark",
  "ranger",
  "medic",
  "mortar",
  "disruptor",
  "pulse",
  "rally",
];
test("Mortar hits its primary once, splashes only nearby enemies and respects shields", () => {
  const m = new Match({ playerDeck: controlDeck, botEnabled: false });
  const mortar = staticUnit(m, "player", 210, 350, "mortar");
  Object.assign(mortar, { damage: 40, range: 115, attackCooldown: 0 });
  const primary = staticUnit(m, "enemy", 210, 270);
  const nearby = staticUnit(m, "enemy", 240, 250);
  const far = staticUnit(m, "enemy", 290, 250);
  const friend = staticUnit(m, "player", 180, 250);
  nearby.shield = 10;
  nearby.shieldTime = 6;
  m.update(1 / 30);
  assert.equal(primary.hp, 85);
  assert.equal(nearby.hp, 107);
  assert.equal(nearby.shield, 0);
  assert.equal(far.hp, 125);
  assert.equal(friend.hp, 125);
  assert.equal(m.state.effects.find((e) => e.type === "blast")?.radius, 42);
});
test("combat damage emits scaled hit impacts and lethal hits keep size-aware death bursts", () => {
  const m = new Match({ playerDeck: controlDeck, botEnabled: false });
  const mortar = staticUnit(m, "player", 210, 350, "mortar");
  Object.assign(mortar, { damage: 80, range: 115, attackCooldown: 0 });
  const target = staticUnit(m, "enemy", 210, 270);
  target.hp = 50;
  m.update(1 / 30);
  const impact = m.state.effects.find((effect) => effect.type === "impact");
  const death = m.state.effects.find((effect) => effect.type === "death");
  assert.ok(impact);
  assert.ok((impact.radius ?? 0) >= 12);
  assert.equal(impact.value, 50);
  assert.equal(target.hp, 0);
  assert.ok(death);
  assert.equal(death.radius, 22);
  assert.equal(death.maxLife, 0.62);
  assert.equal(m.state.stats.kills, 1);

  const heavy = new Match({ playerDeck: controlDeck, botEnabled: false });
  const pulseTarget = staticUnit(heavy, "enemy", 210, 220, "bulwark");
  pulseTarget.hp = 20;
  heavy.state.energy.player = 10;
  assert.equal(heavy.play("player", "pulse", 210, 220).ok, true);
  const heavyDeath = heavy.state.effects.find((effect) => effect.type === "death");
  assert.ok(heavyDeath);
  assert.ok((heavyDeath.radius ?? 0) > (death.radius ?? 0));
  assert.equal(heavyDeath.radius, 30.800000000000004);
});

test("Disruptor refreshes a non-stacking slow that expires and combines with Rally movement", () => {
  const m = new Match({ playerDeck: controlDeck, botEnabled: false });
  const first = staticUnit(m, "player", 180, 350, "disruptor");
  const second = staticUnit(m, "player", 240, 350, "disruptor");
  for (const u of [first, second])
    Object.assign(u, { damage: 12, range: 100, attackCooldown: 0 });
  const target = staticUnit(m, "enemy", 210, 280);
  m.update(1 / 30);
  assert.equal(target.hp, 101);
  assert.equal(target.slowFactor, 0.6);
  assert.equal(target.slowTime, 2);
  m.state.units = [target];
  Object.assign(target, { x: 85, y: 220, speed: 30, rallyTime: 6 });
  const y = target.y;
  const rally = CARDS.find((card) => card.id === "rally")!;
  m.update(1 / 30);
  const expectedTravel =
    30 * (1 / 30) * rally.moveSpeedMultiplier! * target.slowFactor;
  assert.ok(Math.abs(target.y - y - expectedTravel) < 1e-8);
  target.speed = 0;
  m.update(2.1);
  assert.equal(target.slowTime, 0);
  assert.equal(target.slowFactor, 1);
});

const tacticalDeck: CardId[] = [
  ...DEFAULT_DECK.slice(0, 6),
  "stasis",
  "repulsor",
];
test("all tactical pairs validate while three abilities and duplicate tactics do not", () => {
  const tactics = CARDS.filter((c) => c.kind === "ability");
  for (let i = 0; i < tactics.length; i++)
    for (let j = i + 1; j < tactics.length; j++) {
      const deck = [...DEFAULT_DECK.slice(0, 6), tactics[i].id, tactics[j].id];
      assert.ok(isValidDeck(deck));
      assert.deepEqual(new Match({ playerDeck: deck }).decks.enemy, deck);
    }
  assert.equal(
    isValidDeck([...DEFAULT_DECK.slice(0, 5), "pulse", "stasis", "repulsor"]),
    false,
  );
  assert.equal(
    isValidDeck([...DEFAULT_DECK.slice(0, 6), "stasis", "stasis"]),
    false,
  );
});
test("Stasis needs live enemies, costs energy once and slows only enemies without damage", () => {
  const m = new Match({ playerDeck: tacticalDeck, botEnabled: false });
  const before = JSON.stringify(m.state);
  assert.equal(m.play("player", "stasis", 210, 280).ok, false);
  assert.equal(JSON.stringify(m.state), before);
  const enemy = staticUnit(m, "enemy", 210, 280);
  const ally = staticUnit(m, "player", 230, 280);
  const outside = staticUnit(m, "enemy", 330, 280);
  assert.ok(m.play("player", "stasis", 210, 280).ok);
  assert.equal(m.state.energy.player, 2);
  assert.equal(enemy.slowTime, 4);
  assert.equal(enemy.slowFactor, 0.6);
  assert.equal(enemy.hp, 125);
  assert.equal(ally.slowTime, 0);
  assert.equal(outside.slowTime, 0);
  assert.ok(m.play("player", "stasis", 210, 280).ok);
  assert.equal(enemy.slowFactor, 0.6);
  assert.equal(m.state.stats.abilities, 2);
  m.state.units = [enemy];
  m.update(4.1);
  assert.equal(enemy.slowTime, 0);
  assert.equal(enemy.slowFactor, 1);
});
test("Repulsor pushes away from its center, leaves allies and cores intact and frees a contested point", () => {
  const m = new Match({ playerDeck: tacticalDeck, botEnabled: false });
  const enemy = staticUnit(m, "enemy", 210, 280);
  const ally = staticUnit(m, "player", 240, 280);
  m.update(1 / 30);
  assert.ok(m.state.points[4].contested);
  const energy = m.state.energy.player;
  assert.ok(m.play("player", "repulsor", 210, 280).ok);
  assert.equal(enemy.x, 210);
  assert.equal(enemy.y, 225);
  assert.equal(ally.y, 280);
  assert.equal(enemy.hp, 125);
  assert.equal(m.state.energy.player, energy - 3);
  m.update(1 / 30);
  assert.equal(m.state.points[4].contested, false);
  assert.equal(m.state.points[4].captureTeam, "player");
  assert.equal(m.state.cores.enemy.hp, m.state.cores.enemy.maxHp);
  m.state.energy.player = 10;
  Object.assign(enemy, { x: 18, y: 70 });
  assert.ok(m.play("player", "repulsor", 40, 90).ok);
  assert.ok(enemy.x >= 15 && enemy.y >= 62);
  Object.assign(ally, { x: 210, y: 280 });
  m.state.energy.enemy = 10;
  assert.ok(m.play("enemy", "repulsor", 210, 280).ok);
  assert.equal(ally.y, 335);
});
test("bot without Pulse or Rally never attempts an excluded tactic or stalls on a cluster", () => {
  const m = new Match({
    playerDeck: tacticalDeck,
    difficulty: "veteran",
    seed: 5,
  });
  const actions: string[] = [];
  m.state.energy.player = 10;
  for (const x of [185, 210, 235]) staticUnit(m, "player", x, 170);
  const original = m.play.bind(m);
  m.play = (team, id, x, y) => {
    assert.ok(m.decks[team].includes(id as CardId));
    const result = original(team, id, x, y);
    if (result.ok && team === "enemy") actions.push(id);
    return result;
  };
  m.update(35);
  assert.ok(actions.length >= 3);
  assert.ok(actions.includes("repulsor"));
});


test("bot commander activation exposes the real enemy cooldown state", () => {
  const match = new Match({
    seed: 190,
    difficulty: "standard",
    enemyCommander: "atlas",
  });
  staticUnit(match, "enemy", 165, 150);
  staticUnit(match, "enemy", 210, 150);
  staticUnit(match, "enemy", 255, 150);
  assert.equal(match.state.enemyCommanderCooldown, 0);
  for (
    let elapsed = 0;
    elapsed < 30 && match.state.enemyCommanderCooldown <= 0;
    elapsed += 0.5
  )
    match.update(0.5);
  assert.ok(match.state.enemyCommanderCooldown > 0);
  assert.ok(match.state.enemyCommanderCooldown <= 30);
  assert.ok(
    match.state.units
      .filter((unit) => unit.team === "enemy" && unit.hp > 0)
      .some((unit) => unit.shield > 0),
  );
});


test("ability target preview matches tactical validation targets and Pulse Core reach", () => {
  const match = new Match({
    seed: 42,
    botEnabled: false,
    playerDeck: [...DEFAULT_DECK.slice(0, 6), "rally", "stasis"],
  });
  const ally = staticUnit(match, "player", 210, 390);
  const enemy = staticUnit(match, "enemy", 230, 390);
  const distantEnemy = staticUnit(match, "enemy", 40, 110);

  let preview = abilityTargetPreview(
    match.state,
    "player",
    "rally",
    210,
    390,
  );
  assert.deepEqual(preview.unitIds, [ally.id]);
  assert.equal(preview.core, false);
  assert.equal(match.validatePlay("player", "rally", 210, 390).ok, true);

  preview = abilityTargetPreview(
    match.state,
    "player",
    "stasis",
    210,
    390,
  );
  assert.deepEqual(preview.unitIds, [enemy.id]);
  match.state.energy.player = 1;
  assert.equal(match.validatePlay("player", "stasis", 210, 390).ok, false);
  match.state.energy.player = 10;
  assert.equal(match.validatePlay("player", "stasis", 210, 390).ok, true);

  preview = abilityTargetPreview(
    match.state,
    "player",
    "repulsor",
    40,
    110,
  );
  assert.deepEqual(preview.unitIds, [distantEnemy.id]);

  preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    match.state.cores.enemy.x,
    match.state.cores.enemy.y,
  );
  assert.equal(preview.core, true);

  preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    210,
    150,
  );
  assert.equal(preview.core, false);
});

test("Repulsor target preview reports exact effective displacement and clamping", () => {
  const match = new Match({
    playerDeck: tacticalDeck,
    botEnabled: false,
  });
  const enemy = staticUnit(match, "enemy", 210, 280);
  match.state.energy.player = 10;

  let preview = abilityTargetPreview(
    match.state,
    "player",
    "repulsor",
    210,
    280,
  );
  assert.deepEqual(preview.unitIds, [enemy.id]);
  assert.equal(preview.movements.length, 1);
  const firstLanding = preview.movements[0];
  assert.equal(firstLanding.distance, 55);
  assert.equal(firstLanding.clamped, false);
  assert.equal(firstLanding.changed, true);
  assert.ok(match.play("player", "repulsor", 210, 280).ok);
  assert.deepEqual(
    { x: enemy.x, y: enemy.y },
    { x: firstLanding.x, y: firstLanding.y },
  );

  Object.assign(enemy, { x: 18, y: 70 });
  match.state.energy.player = 10;
  preview = abilityTargetPreview(match.state, "player", "repulsor", 40, 90);
  assert.deepEqual(preview.unitIds, [enemy.id]);
  assert.equal(preview.movements.length, 1);
  const clampedLanding = preview.movements[0];
  assert.equal(clampedLanding.clamped, true);
  assert.equal(clampedLanding.changed, true);
  assert.ok(clampedLanding.distance > 0);
  assert.ok(clampedLanding.distance < 55);
  assert.ok(clampedLanding.x >= 15);
  assert.ok(clampedLanding.y >= 62);
  assert.ok(match.play("player", "repulsor", 40, 90).ok);
  assert.deepEqual(
    { x: enemy.x, y: enemy.y },
    { x: clampedLanding.x, y: clampedLanding.y },
  );

  Object.assign(enemy, { x: 15, y: 100 });
  match.state.energy.player = 10;
  preview = abilityTargetPreview(match.state, "player", "repulsor", 40, 100);
  const blocked = preview.movements[0];
  assert.equal(blocked.x, 15);
  assert.equal(blocked.y, 100);
  assert.equal(blocked.distance, 0);
  assert.equal(blocked.clamped, true);
  assert.equal(blocked.changed, false);
  assert.ok(match.play("player", "repulsor", 40, 100).ok);
  assert.deepEqual({ x: enemy.x, y: enemy.y }, { x: 15, y: 100 });
});

test("Pulse preview marks only targets the cast will actually finish", () => {
  const match = quietMatch();
  const lethal = staticUnit(match, "enemy", 200, 280);
  const shielded = staticUnit(match, "enemy", 225, 280);
  lethal.hp = 50;
  shielded.hp = 50;
  shielded.shield = 40;
  match.state.energy.player = 10;

  let preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    210,
    280,
  );
  assert.deepEqual(preview.unitIds, [lethal.id, shielded.id]);
  assert.deepEqual(preview.lethalUnitIds, [lethal.id]);
  assert.equal(preview.core, false);
  assert.equal(preview.coreLethal, false);

  match.state.cores.enemy.hp = 45;
  preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    match.state.cores.enemy.x,
    match.state.cores.enemy.y,
  );
  assert.equal(preview.core, true);
  assert.equal(preview.coreLethal, true);

  match.state.cores.enemy.hp = 46;
  preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    match.state.cores.enemy.x,
    match.state.cores.enemy.y,
  );
  assert.equal(preview.coreLethal, false);
});

test("Rally preview reports exact healing and tempo changes", () => {
  const match = quietMatch();
  const hurt = staticUnit(match, "player", 195, 390);
  const full = staticUnit(match, "player", 225, 390);
  hurt.hp = hurt.maxHp - 40;
  full.rallyTime = 6;
  match.state.energy.player = 10;

  let preview = abilityTargetPreview(
    match.state,
    "player",
    "rally",
    210,
    390,
  );
  assert.deepEqual(preview.unitIds, [hurt.id, full.id]);
  assert.deepEqual(preview.healing, [{ unitId: hurt.id, amount: 40 }]);
  assert.deepEqual(preview.tempoUnitIds, [hurt.id]);

  assert.ok(match.play("player", "rally", 210, 390).ok);
  assert.ok(
    match.state.effects.some(
      (effect) => effect.type === "heal" && effect.value === 40,
    ),
  );
  assert.equal(hurt.hp, hurt.maxHp);
  assert.equal(hurt.rallyTime, 6);
  assert.equal(full.hp, full.maxHp);
  assert.equal(full.rallyTime, 6);

  hurt.hp = hurt.maxHp - 100;
  hurt.rallyTime = 0;
  match.state.energy.player = 10;
  preview = abilityTargetPreview(match.state, "player", "rally", 195, 390);
  assert.deepEqual(preview.healing, [{ unitId: hurt.id, amount: 65 }]);
  assert.ok(match.play("player", "rally", 195, 390).ok);
  assert.equal(hurt.hp, hurt.maxHp - 35);
});

test("Stasis preview distinguishes effective refreshes from fully applied slow", () => {
  const match = new Match({
    playerDeck: tacticalDeck,
    botEnabled: false,
  });
  const fresh = staticUnit(match, "enemy", 185, 280);
  const refresh = staticUnit(match, "enemy", 210, 280);
  const full = staticUnit(match, "enemy", 235, 280);
  refresh.slowTime = 2;
  refresh.slowFactor = 0.6;
  full.slowTime = 4;
  full.slowFactor = 0.6;
  match.state.energy.player = 10;

  const preview = abilityTargetPreview(
    match.state,
    "player",
    "stasis",
    210,
    280,
  );
  assert.deepEqual(preview.unitIds, [fresh.id, refresh.id, full.id]);
  assert.deepEqual(
    preview.slows.map((slow) => ({
      unitId: slow.unitId,
      slowTime: slow.slowTime,
      slowFactor: slow.slowFactor,
      changed: slow.changed,
    })),
    [
      { unitId: fresh.id, slowTime: 4, slowFactor: 0.6, changed: true },
      { unitId: refresh.id, slowTime: 4, slowFactor: 0.6, changed: true },
      { unitId: full.id, slowTime: 4, slowFactor: 0.6, changed: false },
    ],
  );

  assert.ok(match.play("player", "stasis", 210, 280).ok);
  for (const unit of [fresh, refresh, full]) {
    assert.equal(unit.slowTime, 4);
    assert.equal(unit.slowFactor, 0.6);
  }
});

test("Pulse damage preview matches shield and health resolution", () => {
  const match = quietMatch();
  const enemy = staticUnit(match, "enemy", 210, 280);
  enemy.hp = 100;
  enemy.shield = 30;
  match.state.energy.player = 10;

  const preview = abilityTargetPreview(
    match.state,
    "player",
    "pulse",
    210,
    280,
  );
  assert.deepEqual(preview.unitIds, [enemy.id]);
  assert.deepEqual(preview.damage, [
    {
      unitId: enemy.id,
      shieldDamage: 30,
      hpDamage: 55,
      remainingShield: 0,
      remainingHp: 45,
    },
  ]);
  assert.deepEqual(preview.lethalUnitIds, []);

  assert.ok(match.play("player", "pulse", 210, 280).ok);
  assert.equal(enemy.shield, 0);
  assert.equal(enemy.hp, 45);
});

test("Lancer core bonus comes from its card definition", () => {
  const match = quietMatch();
  const lancer = staticUnit(match, "player", 210, 145, "lancer");
  const card = CARDS.find((item) => item.id === "lancer")!;
  Object.assign(lancer, {
    damage: card.damage!,
    range: card.range!,
    attackCooldown: 0,
  });
  const expectedDamage = card.damage! * (card.coreDamageMultiplier ?? 1);
  const before = match.state.cores.enemy.hp;

  match.update(1 / 30);

  assert.ok(Math.abs(expectedDamage - 76.8) < 1e-8);
  assert.ok(
    Math.abs(before - match.state.cores.enemy.hp - expectedDamage) < 1e-8,
  );
  assert.equal(card.coreDamageMultiplier, 1.6);
});

test("Medic support timing and healing come from card data", () => {
  const match = quietMatch();
  const patient = staticUnit(match, "player", 200, 390);
  const medic = staticUnit(match, "player", 230, 390, "medic");
  const card = CARDS.find((item) => item.id === "medic")!;
  patient.hp = 50;
  medic.healCooldown = 0;

  match.update(1 / 30);

  assert.equal(card.heal, 19);
  assert.equal(card.supportRange, 100);
  assert.equal(card.supportInterval, 1.1);
  assert.equal(card.followDistance, 65);
  assert.equal(patient.hp, 50 + card.heal!);
  const healEffect = match.state.effects.find(
    (effect) => effect.type === "heal",
  );
  assert.equal(healEffect?.value, card.heal);
  assert.equal(healEffect?.sourceUnitId, medic.id);
  assert.equal(healEffect?.targetUnitId, patient.id);
  assert.equal(medic.healCooldown, card.supportInterval);
});

test("Rally tempo multipliers are card data used by simulation", () => {
  const match = quietMatch();
  const unit = staticUnit(match, "player", 85, 220);
  const rally = CARDS.find((card) => card.id === "rally")!;
  Object.assign(unit, {
    attackCooldown: 1,
    rallyTime: rally.rallyDuration!,
    speed: 0,
  });
  match.state.units = [unit];

  match.update(1 / 30);

  assert.equal(rally.moveSpeedMultiplier, 1.25);
  assert.equal(rally.attackSpeedMultiplier, 1.3);
  assert.ok(
    Math.abs(
      unit.attackCooldown -
        (1 - (1 / 30) * rally.attackSpeedMultiplier!),
    ) < 1e-8,
  );
});

test("Breaker emits its specialist effect only when it actually strips shield", () => {
  const specialistDeck: CardId[] = [
    "pioneer",
    "breaker",
    "ranger",
    "medic",
    "mortar",
    "disruptor",
    "pulse",
    "rally",
  ];
  const match = new Match({
    playerDeck: specialistDeck,
    botEnabled: false,
  });
  const breaker = staticUnit(match, "player", 210, 300, "breaker");
  const target = staticUnit(match, "enemy", 210, 270, "ranger");
  const card = CARDS.find((item) => item.id === "breaker")!;
  Object.assign(breaker, {
    damage: card.damage!,
    range: card.range!,
    attackCooldown: 0,
  });
  target.shield = 70;
  target.shieldTime = 6;

  match.update(1 / 30);

  assert.equal(target.shield, 7);
  assert.equal(target.hp, target.maxHp);
  const breakerEffect = match.state.effects.find(
    (effect) => effect.type === "breaker",
  );
  assert.ok(breakerEffect);
  assert.equal(breakerEffect.x, target.x);
  assert.equal(breakerEffect.y, target.y);
  assert.equal(breakerEffect.targetUnitId, target.id);

  const shieldHit = match.state.effects.find(
    (effect) => effect.type === "shield-hit",
  );
  assert.ok(shieldHit);
  assert.equal(shieldHit.targetUnitId, target.id);

  match.state.effects = [];
  target.shield = 10;
  target.shieldTime = 6;
  target.hp = target.maxHp;
  breaker.attackCooldown = 0;
  match.update(1 / 30);
  const shieldBreak = match.state.effects.find(
    (effect) => effect.type === "shield-break",
  );
  assert.ok(shieldBreak);
  assert.equal(shieldBreak.targetUnitId, target.id);

  match.state.effects = [];
  target.shield = 0;
  target.hp = target.maxHp;
  breaker.attackCooldown = 0;
  match.update(1 / 30);
  assert.equal(
    match.state.effects.some((effect) => effect.type === "breaker"),
    false,
  );
});

test("Pioneer accelerated capture emits its specialist completion effect", () => {
  const specialistDeck: CardId[] = [
    "pioneer",
    "breaker",
    "ranger",
    "medic",
    "mortar",
    "disruptor",
    "pulse",
    "rally",
  ];
  const pioneerMatch = new Match({
    playerDeck: specialistDeck,
    botEnabled: false,
  });
  staticUnit(pioneerMatch, "player", 210, 280, "pioneer");
  pioneerMatch.update(CAPTURE_SECONDS / 1.5 + 0.1);
  assert.equal(pioneerMatch.state.points[4].owner, "player");
  assert.ok(
    pioneerMatch.state.effects.some(
      (effect) => effect.type === "pioneer" && effect.radius === CAPTURE_RADIUS,
    ),
  );

  const ordinaryMatch = quietMatch();
  staticUnit(ordinaryMatch, "player", 210, 280);
  ordinaryMatch.update(CAPTURE_SECONDS / 1.5 + 0.1);
  assert.equal(ordinaryMatch.state.points[4].owner, null);
  assert.equal(
    ordinaryMatch.state.effects.some((effect) => effect.type === "pioneer"),
    false,
  );
});

test("core turret range, damage and fire interval come from shared constants", () => {
  const match = quietMatch();
  const core = match.state.cores.player;
  const intruder = staticUnit(
    match,
    "enemy",
    core.x,
    core.y - CORE_TURRET_RANGE,
  );
  const outside = staticUnit(
    match,
    "enemy",
    core.x + CORE_TURRET_RANGE + 1,
    core.y,
  );
  const intruderStart = intruder.hp;
  const outsideStart = outside.hp;

  match.update(1 / 30);

  assert.equal(intruderStart - intruder.hp, CORE_TURRET_DAMAGE);
  assert.equal(outside.hp, outsideStart);

  const afterFirstShot = intruder.hp;
  match.update(CORE_TURRET_INTERVAL - 0.1);
  assert.equal(intruder.hp, afterFirstShot);

  match.update(0.2);
  assert.equal(afterFirstShot - intruder.hp, CORE_TURRET_DAMAGE);
  assert.equal(CORE_TURRET_RANGE, 160);
  assert.equal(CORE_TURRET_INTERVAL, 1);
});



test("turret preview and fire select the nearest live enemy with stable ties", () => {
  const match = quietMatch();
  const core = match.state.cores.player;
  const first = staticUnit(match, "enemy", core.x - 40, core.y - 80);
  match.state.energy.enemy = ENERGY_CAP;
  const second = staticUnit(match, "enemy", core.x + 40, core.y - 80);
  const ally = staticUnit(match, "player", core.x, core.y - 50);
  const dead = { ...first, id: 999, x: core.x, y: core.y - 60, hp: 0 };
  match.state.units = [second, dead, ally, first];
  assert.equal(coreTurretTarget(match.state, "player"), first);
  const before = first.hp;
  match.update(1 / 30);
  assert.equal(first.hp, before - CORE_TURRET_DAMAGE);
  assert.equal(second.hp, second.maxHp);

  first.hp = 0;
  assert.equal(coreTurretTarget(match.state, "player"), second);
  second.y = core.y - CORE_TURRET_RANGE - 1;
  assert.equal(coreTurretTarget(match.state, "player"), undefined);
  second.x = core.x;
  second.y = core.y - CORE_TURRET_RANGE;
  assert.equal(coreTurretTarget(match.state, "player"), second);
  match.state.phase = "ended";
  assert.equal(coreTurretTarget(match.state, "player"), undefined);
});

test("a Core destroyed by a unit cannot fire back later in the same tick", () => {
  for (const team of ["player", "enemy"] as const) {
    const match = quietMatch();
    const defender = team === "player" ? "enemy" : "player";
    const core = match.state.cores[defender];
    const unit = staticUnit(match, team, core.x, defender === "enemy" ? 90 : 470);
    Object.assign(unit, { damage: 50, range: 100, attackCooldown: 0 });
    core.hp = 1;
    const before = unit.hp;
    match.update(1 / 30);
    assert.equal(core.hp, 0);
    assert.equal(match.state.winner, team);
    assert.equal(unit.hp, before);
    assert.equal(coreTurretTarget(match.state, defender), undefined);
    assert.equal(match.state.effects.some(effect =>
      effect.type === "shot" && effect.x === core.x && effect.y === core.y), false);
  }
});

test("core hit feedback scales with actual damage without changing balance", () => {
  const lancerMatch = quietMatch();
  assert.equal(lancerMatch.play("player", "lancer", 210, 400).ok, true);
  const lancer = lancerMatch.state.units[0];
  Object.assign(lancer, { x: 210, y: 145, speed: 0, attackCooldown: 0 });
  const lancerCard = CARDS.find((card) => card.id === "lancer")!;
  const expectedDamage =
    lancerCard.damage! * (lancerCard.coreDamageMultiplier ?? 1);
  const before = lancerMatch.state.cores.enemy.hp;
  lancerMatch.update(1 / 30);
  const lancerHit = lancerMatch.state.effects.find(
    (effect) => effect.type === "core-hit",
  );
  assert.ok(lancerHit);
  assert.ok(
    Math.abs(before - lancerMatch.state.cores.enemy.hp - expectedDamage) < 1e-9,
  );
  assert.equal(lancerHit.maxLife, 0.42);
  assert.ok(Math.abs((lancerHit.value ?? 0) - expectedDamage) < 1e-9);
  assert.ok(
    Math.abs(
      (lancerHit.radius ?? 0) -
        Math.min(32, Math.max(12, 10 + expectedDamage * 0.22)),
    ) < 1e-9,
  );

  const pulseMatch = quietMatch();
  pulseMatch.state.energy.player = 10;
  const pulseCard = CARDS.find((card) => card.id === "pulse")!;
  assert.equal(pulseMatch.play("player", "pulse", 210, 35).ok, true);
  const pulseHit = pulseMatch.state.effects.find(
    (effect) => effect.type === "core-hit",
  );
  assert.ok(pulseHit);
  assert.equal(pulseHit.value, pulseCard.coreDamage);
  assert.ok(
    Math.abs(
      (pulseHit.radius ?? 0) -
        Math.min(32, Math.max(12, 10 + pulseCard.coreDamage! * 0.22)),
    ) < 1e-9,
  );
  assert.ok((lancerHit.radius ?? 0) > (pulseHit.radius ?? 0));

  const lethal = quietMatch();
  lethal.state.energy.player = 10;
  lethal.state.cores.enemy.hp = 10;
  assert.equal(lethal.play("player", "pulse", 210, 35).ok, true);
  const lethalHit = lethal.state.effects.find(
    (effect) => effect.type === "core-hit",
  );
  assert.ok(lethalHit);
  assert.equal(lethalHit.value, 10);
  assert.ok(Math.abs((lethalHit.radius ?? 0) - 12.2) < 1e-9);
});

test("control point pressure exposes exact capture speed, contest, reverse and decay", () => {
  const match = quietMatch();
  const point = match.state.points[4];
  const pioneer = staticUnit(match, "player", point.x, point.y);
  pioneer.cardId = "pioneer";
  const support = staticUnit(match, "player", point.x + 8, point.y);
  let pressure = controlPointPressure(match.state, point);

  assert.equal(CAPTURE_GROUP_SUPPORT, 0.15);
  assert.equal(CAPTURE_DECAY_RATE, 0.18);
  assert.equal(pressure.mode, "capture");
  assert.equal(pressure.playerCount, 2);
  assert.equal(pressure.enemyCount, 0);
  assert.equal(pressure.captureMultiplier, 1.5);
  assert.equal(pressure.groupMultiplier, 1.15);
  assert.ok(
    Math.abs(
      pressure.rate -
        (1 / CAPTURE_SECONDS) * 1.15 * 1.5,
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      pressure.secondsRemaining -
        CAPTURE_SECONDS / (1.15 * 1.5),
    ) < 1e-12,
  );

  const before = point.capture;
  match.update(1 / 30);
  assert.ok(
    Math.abs(
      point.capture - before - pressure.rate / 30,
    ) < 1e-10,
  );

  const enemy = staticUnit(match, "enemy", point.x - 8, point.y);
  pressure = controlPointPressure(match.state, point);
  assert.equal(pressure.mode, "contested");
  assert.equal(pressure.playerCount, 2);
  assert.equal(pressure.enemyCount, 1);
  assert.equal(pressure.rate, 0);
  const contestedProgress = point.capture;
  match.update(1 / 30);
  assert.equal(point.capture, contestedProgress);

  pioneer.hp = 0;
  support.hp = 0;
  point.capture = 0.5;
  point.captureTeam = "player";
  pressure = controlPointPressure(match.state, point);
  assert.equal(pressure.mode, "reverse");
  assert.equal(pressure.capturer, "enemy");
  assert.ok(Math.abs(pressure.rate + 1 / CAPTURE_SECONDS) < 1e-12);
  assert.ok(
    Math.abs(pressure.secondsRemaining - CAPTURE_SECONDS * 0.5) < 1e-12,
  );

  enemy.hp = 0;
  pressure = controlPointPressure(match.state, point);
  assert.equal(pressure.mode, "decay");
  assert.equal(pressure.rate, -CAPTURE_DECAY_RATE);
  assert.ok(
    Math.abs(
      pressure.secondsRemaining - 0.5 / CAPTURE_DECAY_RATE,
    ) < 1e-12,
  );
});

test("capture pressure reaches ownership using the same shared rate", () => {
  const match = quietMatch();
  const point = match.state.points[4];
  const pioneer = staticUnit(match, "player", point.x, point.y);
  pioneer.cardId = "pioneer";
  staticUnit(match, "player", point.x + 8, point.y);
  const pressure = controlPointPressure(match.state, point);
  assert.equal(pressure.mode, "capture");

  match.update(pressure.secondsRemaining + 0.1);

  assert.equal(point.owner, "player");
  assert.equal(point.capture, 0);
  assert.equal(point.captureTeam, null);
  assert.ok(
    match.state.effects.some(
      (effect) =>
        effect.type === "pioneer" &&
        effect.x === point.x &&
        effect.y === point.y,
    ),
  );
});

test("frontline status and capture events report exact connected territory shifts", () => {
  const advance = quietMatch();
  assert.deepEqual(frontlineStatus(advance.state.points, "player", 1), {
    column: 1,
    depth: 1,
    edge: 350,
  });

  const middle = advance.state.points[4];
  middle.capture = 0.999;
  middle.captureTeam = "player";
  staticUnit(advance, "player", middle.x, middle.y);
  advance.update(1 / 30);

  assert.equal(middle.owner, "player");
  assert.deepEqual(frontlineStatus(advance.state.points, "player", 1), {
    column: 1,
    depth: 2,
    edge: 220,
  });
  const advanceEvent = advance.state.effects.find(
    (effect) => effect.type === "frontline" && effect.team === "player",
  );
  assert.ok(advanceEvent);
  assert.equal(advanceEvent.x, 210);
  assert.equal(advanceEvent.y, 350);
  assert.equal(advanceEvent.targetY, 220);
  assert.equal(advanceEvent.value, 1);

  const collapse = quietMatch();
  const bottom = collapse.state.points[7];
  const attacker = staticUnit(collapse, "enemy", bottom.x, bottom.y);
  collapse.state.points[1].owner = "player";
  collapse.state.points[4].owner = "player";
  collapse.state.points[7].owner = "player";
  assert.deepEqual(frontlineStatus(collapse.state.points, "player", 1), {
    column: 1,
    depth: 3,
    edge: 90,
  });

  Object.assign(attacker, { x: bottom.x, y: bottom.y });
  bottom.capture = 0.999;
  bottom.captureTeam = "enemy";
  collapse.update(1 / 30);

  assert.equal(bottom.owner, "enemy");
  assert.deepEqual(frontlineStatus(collapse.state.points, "player", 1), {
    column: 1,
    depth: 0,
    edge: 475,
  });
  const retreatEvent = collapse.state.effects.find(
    (effect) => effect.type === "frontline" && effect.team === "player",
  );
  assert.ok(retreatEvent);
  assert.equal(retreatEvent.y, 90);
  assert.equal(retreatEvent.targetY, 475);
  assert.equal(retreatEvent.value, -3);
});

test("frontline status clamps columns and stays symmetric for both teams", () => {
  const match = quietMatch();
  assert.deepEqual(frontlineStatus(match.state.points, "enemy", 1), {
    column: 1,
    depth: 1,
    edge: 210,
  });
  assert.equal(frontlineStatus(match.state.points, "player", -5).column, 0);
  assert.equal(frontlineStatus(match.state.points, "enemy", 99).column, 2);

  match.state.points[4].owner = "player";
  match.state.points[1].owner = "player";
  assert.equal(frontlineStatus(match.state.points, "player", 1).depth, 3);
  assert.equal(frontlineStatus(match.state.points, "player", 1).edge, 90);

  match.state.points[1].owner = "enemy";
  match.state.points[4].owner = "enemy";
  match.state.points[7].owner = "enemy";
  assert.equal(frontlineStatus(match.state.points, "enemy", 1).depth, 3);
  assert.equal(frontlineStatus(match.state.points, "enemy", 1).edge, 470);
});

test("deployment columns expose exact legal front geometry", () => {
  const match = quietMatch();
  assert.deepEqual(deploymentColumns(match.state.points, "player"), [
    { column: 0, depth: 1, edge: 350, xMin: 18, xMax: 147.5, centerX: 82.75 },
    { column: 1, depth: 1, edge: 350, xMin: 147.5, xMax: 272.5, centerX: 210 },
    { column: 2, depth: 1, edge: 350, xMin: 272.5, xMax: 402, centerX: 337.25 },
  ]);

  match.state.points[3].owner = "player";
  match.state.points[4].owner = "player";
  match.state.points[1].owner = "player";
  const zones = deploymentColumns(match.state.points, "player");
  assert.equal(zones[0].depth, 2);
  assert.equal(zones[0].edge, 220);
  assert.equal(zones[1].depth, 3);
  assert.equal(zones[1].edge, 90);
  assert.equal(zones[2].depth, 1);
  assert.equal(zones[2].edge, 350);

  for (const zone of zones) {
    const x = zone.centerX;
    assert.equal(match.canDeploy("player", x, zone.edge), true);
    if (zone.edge > 65)
      assert.equal(match.canDeploy("player", x, zone.edge - 0.01), false);
  }
  assert.equal(match.canDeploy("player", 17.99, 490), false);
  assert.equal(match.canDeploy("player", 402.01, 490), false);
});

test("enemy deployment columns mirror the same three-column geometry", () => {
  const match = quietMatch();
  const zones = deploymentColumns(match.state.points, "enemy");
  assert.deepEqual(
    zones.map(({ column, depth, edge }) => ({ column, depth, edge })),
    [
      { column: 0, depth: 1, edge: 210 },
      { column: 1, depth: 1, edge: 210 },
      { column: 2, depth: 1, edge: 210 },
    ],
  );
  for (const zone of zones) {
    assert.equal(match.canDeploy("enemy", zone.centerX, zone.edge), true);
    assert.equal(match.canDeploy("enemy", zone.centerX, zone.edge + 0.01), false);
  }
});

test("shot effects preserve weapon identity for renderer-specific combat feedback", () => {
  const ranged = quietMatch();
  const ranger = staticUnit(ranged, "player", 210, 350);
  ranger.cardId = "ranger";
  Object.assign(ranger, {
    damage: 26,
    range: 110,
    radius: 9,
    attackCooldown: 0,
  });
  const rangedTarget = staticUnit(ranged, "enemy", 210, 270);
  Object.assign(rangedTarget, { hp: 200, maxHp: 200, radius: 10 });
  ranged.update(1 / 30);
  const rangerShot = ranged.state.effects.find(
    (effect) => effect.type === "shot" && effect.team === "player",
  );
  assert.ok(rangerShot);
  assert.equal(rangerShot.sourceCardId, "ranger");
  assert.equal(rangerShot.maxLife, 0.26);
  assert.equal(rangerShot.targetX, rangedTarget.x);
  assert.equal(rangerShot.targetY, rangedTarget.y);
  assert.equal(rangerShot.sourceUnitId, ranger.id);
  assert.equal(rangerShot.targetUnitId, rangedTarget.id);

  const melee = quietMatch();
  const vanguard = staticUnit(melee, "player", 210, 310);
  Object.assign(vanguard, {
    damage: 16,
    range: 20,
    radius: 10,
    attackCooldown: 0,
  });
  const meleeTarget = staticUnit(melee, "enemy", 210, 275);
  Object.assign(meleeTarget, { hp: 200, maxHp: 200, radius: 10 });
  melee.update(1 / 30);
  const meleeShot = melee.state.effects.find(
    (effect) => effect.type === "shot" && effect.team === "player",
  );
  assert.ok(meleeShot);
  assert.equal(meleeShot.sourceCardId, "vanguard");
  assert.equal(meleeShot.sourceUnitId, vanguard.id);
  assert.equal(meleeShot.targetUnitId, meleeTarget.id);

  const turret = quietMatch();
  const intruder = staticUnit(turret, "enemy", 210, 470);
  Object.assign(intruder, { hp: 200, maxHp: 200 });
  turret.update(1 / 30);
  const turretShot = turret.state.effects.find(
    (effect) =>
      effect.type === "shot" &&
      effect.team === "player" &&
      effect.sourceCardId === "core-turret",
  );
  assert.ok(turretShot);
  assert.equal(turretShot.maxLife, 0.25);
  assert.equal(turretShot.targetX, intruder.x);
  assert.equal(turretShot.targetY, intruder.y);
  assert.equal(turretShot.sourceUnitId, undefined);
  assert.equal(turretShot.targetUnitId, intruder.id);

  const coreAttack = quietMatch();
  const coreRanger = staticUnit(coreAttack, "player", 210, 145, "ranger");
  Object.assign(coreRanger, {
    range: 110,
    speed: 0,
    attackCooldown: 0,
  });
  coreAttack.update(1 / 30);
  const coreShot = coreAttack.state.effects.find(
    (effect) =>
      effect.type === "shot" &&
      effect.team === "player" &&
      effect.sourceCardId === "ranger",
  );
  assert.ok(coreShot);
  assert.equal(coreShot.sourceUnitId, coreRanger.id);
  assert.equal(coreShot.targetUnitId, undefined);
});

test("impact, death and Core-hit effects preserve their weapon source", () => {
  const mortarMatch = new Match({ playerDeck: controlDeck, botEnabled: false });
  const mortar = staticUnit(mortarMatch, "player", 210, 350, "mortar");
  Object.assign(mortar, { damage: 80, range: 115, attackCooldown: 0 });
  const mortarTarget = staticUnit(mortarMatch, "enemy", 210, 270);
  mortarTarget.hp = 30;
  mortarMatch.update(1 / 30);

  const mortarImpact = mortarMatch.state.effects.find(
    (effect) => effect.type === "impact",
  );
  const mortarDeath = mortarMatch.state.effects.find(
    (effect) => effect.type === "death",
  );
  assert.ok(mortarImpact);
  assert.ok(mortarDeath);
  assert.equal(mortarImpact.sourceCardId, "mortar");
  assert.equal(mortarDeath.sourceCardId, "mortar");

  const pulseMatch = quietMatch();
  const pulseTarget = staticUnit(pulseMatch, "enemy", 210, 220);
  pulseTarget.hp = 20;
  pulseMatch.state.energy.player = 10;
  assert.equal(pulseMatch.play("player", "pulse", 210, 220).ok, true);
  assert.equal(
    pulseMatch.state.effects.find((effect) => effect.type === "impact")
      ?.sourceCardId,
    "pulse",
  );
  assert.equal(
    pulseMatch.state.effects.find((effect) => effect.type === "death")
      ?.sourceCardId,
    "pulse",
  );

  const coreMatch = quietMatch();
  const lancer = staticUnit(coreMatch, "player", 210, 145);
  Object.assign(lancer, {
    cardId: "lancer",
    damage: 48,
    range: 135,
    radius: 10,
    attackCooldown: 0,
  });
  coreMatch.update(1 / 30);
  const coreHit = coreMatch.state.effects.find(
    (effect) =>
      effect.type === "core-hit" && effect.team === "player",
  );
  assert.ok(coreHit);
  assert.equal(coreHit.sourceCardId, "lancer");

  const pulseCore = quietMatch();
  pulseCore.state.energy.player = 10;
  assert.equal(pulseCore.play("player", "pulse", 210, 35).ok, true);
  assert.equal(
    pulseCore.state.effects.find((effect) => effect.type === "core-hit")
      ?.sourceCardId,
    "pulse",
  );

  const turretMatch = quietMatch();
  const intruder = staticUnit(turretMatch, "enemy", 210, 470);
  Object.assign(intruder, { hp: 200, maxHp: 200 });
  turretMatch.update(1 / 30);
  assert.equal(
    turretMatch.state.effects.find(
      (effect) =>
        effect.type === "impact" &&
        effect.team === "player" &&
        effect.sourceCardId === "core-turret",
    )?.sourceCardId,
    "core-turret",
  );
});

