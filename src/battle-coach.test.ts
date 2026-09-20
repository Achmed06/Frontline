import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "./engine";
import { normalizeLearning } from "./headquarters";
import { battleCoachHint } from "./battle-coach";

test("battle coach guides the existing learning path without changing combat", () => {
  const progress = normalizeLearning(null);
  const match = new Match({ botEnabled: false });

  let hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "TRUPPE WÄHLEN");
  assert.equal(hint?.focus, "cards");

  hint = battleCoachHint(progress, match.state, "vanguard");
  assert.equal(hint?.title, "TRUPPE EINSETZEN");
  assert.equal(hint?.focus, "arena");

  match.state.stats.deployed = 3;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "BODEN EROBERN");
  assert.equal(hint?.focus, "arena");

  match.state.stats.captured = 1;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "KOMMANDANTENFÄHIGKEIT NUTZEN");
  assert.equal(hint?.focus, "commander");

  match.state.commanderCooldown = 5;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "TAKTIK EINSETZEN");
  assert.equal(hint?.focus, "cards");

  match.state.stats.abilities = 1;
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "FRONT WEITER SCHIEBEN");

  for (const point of match.state.points.slice(0, 6)) point.owner = "player";
  hint = battleCoachHint(progress, match.state, null);
  assert.equal(hint?.title, "CORE DURCHBRECHEN");
});

test("battle coach disappears once the permanent learning path is complete", () => {
  const progress = normalizeLearning({
    counts: { deploy: 3, capture: 1, ability: 1, win: 1 },
    style: "field",
    lastMatch: "done",
  });
  const match = new Match({ botEnabled: false });
  assert.equal(battleCoachHint(progress, match.state, null), null);
});
