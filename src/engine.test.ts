import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CAPTURE_SECONDS,
  CARDS,
  DEFAULT_DECK,
  isValidDeck,
  type CardId,
  COMMANDER_COOLDOWN,
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
  assert.equal(match.play("player", "swarm", 150, 230).ok, true);
  assert.equal(match.state.units.length, 3);
  assert.ok(
    match.state.units.every((unit) =>
      match.canDeploy("player", unit.x, unit.y),
    ),
  );
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
test("combat damage emits scaled hit impacts and lethal hits keep the death burst", () => {
  const m = new Match({ playerDeck: controlDeck, botEnabled: false });
  const mortar = staticUnit(m, "player", 210, 350, "mortar");
  Object.assign(mortar, { damage: 80, range: 115, attackCooldown: 0 });
  const target = staticUnit(m, "enemy", 210, 270);
  target.hp = 50;
  m.update(1 / 30);
  const impact = m.state.effects.find((effect) => effect.type === "impact");
  assert.ok(impact);
  assert.ok((impact.radius ?? 0) >= 12);
  assert.equal(target.hp, 0);
  assert.ok(m.state.effects.some((effect) => effect.type === "death"));
  assert.equal(m.state.stats.kills, 1);
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
  m.update(1 / 30);
  assert.ok(Math.abs(target.y - y - 0.75) < 1e-8);
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
