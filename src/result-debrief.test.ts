import test from "node:test";
import assert from "node:assert/strict";
import { Match, TRAINING_CONTROL } from "./engine";
import { resultDecision } from "./result-debrief";

test("result decision identifies immediate Core destruction", () => {
  const match = new Match({ botEnabled: false });
  match.state.cores.enemy.hp = 0;
  match.state.winner = "player";
  match.state.reason = "Kern zerstört.";

  const decision = resultDecision(match.state);
  assert.equal(decision.metric, "core");
  assert.equal(decision.title, "CORE DURCHBRUCH");
  assert.equal(
    decision.rows.find((row) => row.key === "core")?.decisive,
    true,
  );
  assert.equal(
    decision.rows.find((row) => row.key === "core")?.enemy,
    "0%",
  );
});

test("result decision identifies completed control objective", () => {
  const match = new Match({
    botEnabled: false,
    controlObjective: TRAINING_CONTROL,
  });
  match.state.controlTime.player = TRAINING_CONTROL.seconds;
  match.state.controlTime.enemy = 17.4;
  match.state.winner = "player";
  match.state.reason = "Kontrollziel erreicht.";

  const decision = resultDecision(match.state, TRAINING_CONTROL);
  assert.equal(decision.metric, "control");
  assert.equal(decision.title, "KONTROLLZIEL");
  assert.equal(decision.rows[0].key, "control");
  assert.equal(decision.rows[0].player, "45,0s / 45s");
  assert.equal(decision.rows[0].enemy, "17,4s / 45s");
  assert.equal(decision.rows[0].decisive, true);
});

test("result decision identifies time-limit control, Core and territory tiebreaks", () => {
  const control = new Match({
    botEnabled: false,
    controlObjective: TRAINING_CONTROL,
  });
  control.state.controlTime.player = 31.2;
  control.state.controlTime.enemy = 27.7;
  control.state.winner = "player";
  control.state.reason = "Zeitlimit: mehr Kontrollzeit.";
  assert.equal(
    resultDecision(control.state, TRAINING_CONTROL).title,
    "KONTROLLZEIT",
  );

  const core = new Match({ botEnabled: false });
  core.state.cores.player.hp = 1800;
  core.state.cores.enemy.hp = 1500;
  core.state.winner = "player";
  core.state.reason = "Zeitlimit: höhere Kern-HP.";
  const coreDecision = resultDecision(core.state);
  assert.equal(coreDecision.metric, "core");
  assert.equal(coreDecision.title, "CORE-VORTEIL");
  assert.equal(
    coreDecision.rows.find((row) => row.key === "core")?.player,
    "78%",
  );
  assert.equal(
    coreDecision.rows.find((row) => row.key === "core")?.enemy,
    "65%",
  );

  const territory = new Match({ botEnabled: false });
  territory.state.points[3].owner = "player";
  territory.state.points[4].owner = "player";
  territory.state.winner = "player";
  territory.state.reason = "Zeitlimit: mehr Kontrollpunkte.";
  const territoryDecision = resultDecision(territory.state);
  assert.equal(territoryDecision.metric, "territory");
  assert.equal(territoryDecision.title, "GEBIETSVORTEIL");
  assert.equal(
    territoryDecision.rows.find((row) => row.key === "territory")?.player,
    "5/9",
  );
  assert.equal(
    territoryDecision.rows.find((row) => row.key === "territory")?.enemy,
    "3/9",
  );
});

test("result decision keeps simultaneous endings neutral", () => {
  const cores = new Match({ botEnabled: false });
  cores.state.cores.player.hp = 0;
  cores.state.cores.enemy.hp = 0;
  cores.state.winner = "draw";
  cores.state.reason = "Beide Kerne zerstört.";
  const coreDraw = resultDecision(cores.state);
  assert.equal(coreDraw.metric, "draw");
  assert.equal(coreDraw.title, "GLEICHSTAND");
  assert.equal(coreDraw.rows.some((row) => row.decisive), false);

  const control = new Match({
    botEnabled: false,
    controlObjective: TRAINING_CONTROL,
  });
  control.state.controlTime.player = TRAINING_CONTROL.seconds;
  control.state.controlTime.enemy = TRAINING_CONTROL.seconds;
  control.state.winner = "draw";
  control.state.reason = "Beide Kontrollziele gleichzeitig erreicht.";
  const controlDraw = resultDecision(control.state, TRAINING_CONTROL);
  assert.equal(controlDraw.metric, "draw");
  assert.equal(controlDraw.rows.some((row) => row.decisive), false);
});

test("result decision identifies full score draw", () => {
  const match = new Match({ botEnabled: false });
  match.state.winner = "draw";
  match.state.reason = "Gleiche Kern-HP und Kontrollpunkte.";
  const decision = resultDecision(match.state);
  assert.equal(decision.metric, "draw");
  assert.equal(decision.title, "GLEICHSTAND");
  assert.match(decision.detail, /Schlusswertung/);
});
