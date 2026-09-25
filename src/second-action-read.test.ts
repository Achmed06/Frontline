import assert from "node:assert/strict";
import test from "node:test";
import { CARDS, Match } from "./engine";
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
  assert.equal(match.play("enemy", "vanguard", 210, 90).ok, true);
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · GEDULD · EINZELZIEL IST WENIG WERT",
  );
  assert.equal(match.play("enemy", "ranger", 335, 90).ok, true);
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · GEDULD · EINZELZIEL IST WENIG WERT",
  );
  const ranger = match.state.units.find((unit) => unit.cardId === "ranger")!;
  ranger.x = 220;
  assert.equal(
    secondActionHint(match.state, card("pulse")),
    "ZWEITER ZUG · KONTER · GRUPPE TREFFEN",
  );
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
