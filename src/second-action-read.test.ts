import assert from "node:assert/strict";
import test from "node:test";
import { abilityTargetPreview, CARDS, DEFAULT_DECK, Match } from "./engine";
import { playerActionCount, secondActionHint } from "./second-action-read";

const card = (id: string) => CARDS.find((item) => item.id === id)!;

function firstDeploy(match: Match, id = "vanguard") {
  assert.equal(match.play("player", id, 210, 470).ok, true);
}

test("second action guidance appears only after exactly one player action", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(secondActionHint(match.state, card("ranger")), null);

  firstDeploy(match);
  assert.equal(
    secondActionHint(match.state, card("ranger")),
    "ZWEITER ZUG · DECKUNG · HINTER OPENER SETZEN",
  );

  assert.equal(match.play("player", "swarm", 85, 470).ok, true);
  assert.equal(secondActionHint(match.state, card("ranger")), null);
});

test("swarm deployment counts as one action instead of three units", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match, "swarm");
  assert.equal(
    secondActionHint(match.state, card("vanguard")),
    "ZWEITER ZUG · VERSTÄRKEN ODER SPLITTEN · LANE BEWUSST WÄHLEN",
  );
});

test("medic warns when support is premature and flips once healing has value", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(
    secondActionHint(match.state, card("medic")),
    "ZWEITER ZUG · SUPPORT ZU FRÜH · NOCH KEIN HEILWERT",
  );
  match.state.units[0].hp -= 30;
  assert.equal(
    secondActionHint(match.state, card("medic")),
    "ZWEITER ZUG · STABILISIEREN · VERLETZTE FRONT",
  );
});

test("pulse distinguishes a real spatial group from separate targets", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(match.play("enemy", "vanguard", 85, 90).ok, true);
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABWÄGEN · EINZELZIEL OHNE ABSCHLUSS",
  );
  assert.equal(match.play("enemy", "ranger", 335, 90).ok, true);
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABWÄGEN · EINZELZIEL OHNE ABSCHLUSS",
  );
  const ranger = match.state.units.find((unit) => unit.cardId === "ranger")!;
  ranger.x = 210;
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · KONTER · GRUPPE TREFFEN",
  );
  match.state.energy.player = 10;
  const enemies = match.state.units.filter((unit) => unit.team === "enemy");
  const before = enemies.map((unit) => unit.hp);
  assert.equal(match.play("player", "pulse", 147.5, 90).ok, true);
  assert.deepEqual(enemies.map((unit) => unit.hp), before.map((hp) => hp - card("pulse").damage!));
});

test("Pulse identifies a lethal single target using shield-aware damage", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(match.play("enemy", "vanguard", 210, 90).ok, true);
  const enemy = match.state.units.find((unit) => unit.team === "enemy")!;
  enemy.hp = 80;
  enemy.shield = 10;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABWÄGEN · EINZELZIEL OHNE ABSCHLUSS");
  enemy.shield = 5;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABSCHLUSS · GEGNER AUSSCHALTEN");
  match.state.energy.player = 10;
  assert.equal(match.play("player", "pulse", enemy.x, enemy.y).ok, true);
  assert.equal(enemy.hp, 0);
  assert.equal(secondActionHint(match.state, card("pulse")), null);
});

test("Pulse calls out a winning Core hit even without enemy units", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  const core = match.state.cores.enemy;
  core.hp = card("pulse").coreDamage! + 1;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · GEDULD · NOCH KEIN TRUPPENZIEL");
  core.hp -= 1;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABSCHLUSS · CORE ZERSTÖREN");
  match.state.energy.player = 10;
  assert.equal(match.play("player", "pulse", core.x, core.y).ok, true);
  assert.equal(match.state.winner, "player");
  assert.equal(match.state.phase, "ended");
});

test("Pulse pair reads include target radii and reject just-outside pairs", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(match.play("enemy", "vanguard", 85, 90).ok, true);
  assert.equal(match.play("enemy", "ranger", 335, 90).ok, true);
  const [first, second] = match.state.units.filter((unit) => unit.team === "enemy");
  first.radius = 20;
  second.radius = 5;
  const reach = card("pulse").range!;
  second.x = first.x + 2 * reach + first.radius + second.radius - 0.5;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · KONTER · GRUPPE TREFFEN");
  const x = first.x + (second.x - first.x) * (reach + first.radius) / (2 * reach + first.radius + second.radius);
  assert.equal(abilityTargetPreview(match.state, "player", "pulse", x, 90).unitIds.length, 2);
  second.x += 1;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · ABWÄGEN · EINZELZIEL OHNE ABSCHLUSS");
  second.hp = 0;
  first.hp = 0;
  assert.equal(secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · GEDULD · NOCH KEIN TRUPPENZIEL");
});

test("Rally distinguishes fresh tempo, active tempo and actual healing", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  const ally = match.state.units[0];
  assert.equal(secondActionHint(match.state, card("rally")),
    "ZWEITER ZUG · TEMPO · OPENER VERSTÄRKEN");
  ally.rallyTime = card("rally").rallyDuration!;
  assert.equal(secondActionHint(match.state, card("rally")),
    "ZWEITER ZUG · GEDULD · KEIN ZUSÄTZLICHER EFFEKT");
  ally.hp -= 30;
  assert.equal(secondActionHint(match.state, card("rally")),
    "ZWEITER ZUG · HEILUNG · VERLETZTE FRONT STÄRKEN");
  match.state.energy.player = 10;
  assert.equal(match.play("player", "rally", ally.x, ally.y).ok, true);
  assert.equal(ally.hp, ally.maxHp);
  assert.equal(ally.rallyTime, card("rally").rallyDuration);
});

test("Rally recognizes a real refresh and ignores dead allies", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  const ally = match.state.units[0];
  ally.rallyTime = card("rally").rallyDuration! - 1;
  assert.equal(secondActionHint(match.state, card("rally")),
    "ZWEITER ZUG · TEMPO · OPENER VERSTÄRKEN");
  ally.hp = 0;
  assert.equal(secondActionHint(match.state, card("rally")),
    "ZWEITER ZUG · GEDULD · BRAUCHT EIGENE TRUPPEN");
});

test("Stasis distinguishes no extra effect from an effective refresh", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: [...DEFAULT_DECK.slice(0, 6), "pulse", "stasis"],
  });
  firstDeploy(match);
  assert.equal(secondActionHint(match.state, card("stasis")),
    "ZWEITER ZUG · GEDULD · NOCH KEIN GEGNER");
  assert.equal(match.play("enemy", "vanguard", 210, 90).ok, true);
  const enemy = match.state.units.find((unit) => unit.team === "enemy")!;
  enemy.slowTime = card("stasis").slowDuration!;
  enemy.slowFactor = card("stasis").slowFactor!;
  assert.equal(secondActionHint(match.state, card("stasis")),
    "ZWEITER ZUG · GEDULD · KEIN ZUSÄTZLICHER EFFEKT");
  enemy.slowTime -= 1;
  assert.equal(secondActionHint(match.state, card("stasis")),
    "ZWEITER ZUG · KONTROLLE · GEGNERISCHEN PUSH BRECHEN");
  match.state.energy.player = 10;
  assert.equal(match.play("player", "stasis", enemy.x, enemy.y).ok, true);
  assert.equal(enemy.slowTime, card("stasis").slowDuration);
});

test("hint evaluation is read-only and stops when the match ends", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(match.play("enemy", "vanguard", 210, 90).ok, true);
  const before = structuredClone(match.state);
  for (const id of ["pulse", "rally", "stasis", "repulsor"])
    secondActionHint(match.state, card(id));
  assert.deepEqual(match.state, before);
  match.state.phase = "ended";
  assert.equal(secondActionHint(match.state, card("pulse")), null);
});

test("breaker reacts to real shield state instead of always advertising counter value", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  assert.equal(match.play("enemy", "vanguard", 210, 90).ok, true);
  assert.equal(
    secondActionHint(match.state, card("breaker")),
    "ZWEITER ZUG · FRONT · SCHILDBRUCH NOCH OHNE ZIEL",
  );
  match.state.units.find((unit) => unit.team === "enemy")!.shield = 45;
  assert.equal(
    secondActionHint(match.state, card("breaker")),
    "ZWEITER ZUG · KONTER · SCHILD BRECHEN",
  );
});

test("second action guidance expires with the opening", () => {
  const match = new Match({ botEnabled: false });
  firstDeploy(match);
  match.state.time = 28.01;
  assert.equal(secondActionHint(match.state, card("ranger")), null);
});

test("ability first plays also enter the second-action window", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "pulse", 210, 280).ok, true);
  assert.equal(playerActionCount(match.state), 1);
  assert.equal(
    secondActionHint(match.state, card("vanguard")),
    "ZWEITER ZUG · VERSTÄRKEN ODER SPLITTEN · LANE BEWUSST WÄHLEN",
  );
});
