import assert from "node:assert/strict";
import test from "node:test";
import { matchStartVisual } from "./match-start-visual";

test("match start visual divides the existing three-second window into deterministic phases", () => {
  assert.deepEqual(
    matchStartVisual(3000, "ATLAS", "LYRA"),
    {
      phase: "cores",
      count: 3,
      kicker: "CORE-LINK",
      title: "BEIDE CORES ONLINE",
      detail: "GEGNER ERFASST · VERBINDUNG STABIL",
      progress: 0,
    },
  );

  assert.equal(matchStartVisual(2001, "ATLAS", "LYRA").phase, "cores");
  assert.equal(matchStartVisual(2000, "ATLAS", "LYRA").phase, "supply");
  assert.equal(matchStartVisual(1001, "ATLAS", "LYRA").phase, "supply");
  assert.equal(matchStartVisual(1000, "ATLAS", "LYRA").phase, "commanders");
  assert.equal(matchStartVisual(1, "ATLAS", "LYRA").phase, "commanders");
  assert.equal(matchStartVisual(0, "ATLAS", "LYRA").phase, "go");
});

test("commander and objective context appear only in their relevant opening phases", () => {
  const commanders = matchStartVisual(500, "NOVA", "ATLAS");
  assert.equal(commanders.title, "NOVA ↔ ATLAS");
  assert.equal(commanders.detail, "FÄHIGKEITEN BEREIT");

  const controlGo = matchStartVisual(0, "NOVA", "ATLAS", true);
  assert.equal(controlGo.kicker, "RELAIS SICHERN");
  assert.equal(controlGo.title, "LOS");

  const coreGo = matchStartVisual(0, "NOVA", "ATLAS", false);
  assert.equal(coreGo.kicker, "CORE BRECHEN");

  const daily = matchStartVisual(2500, "NOVA", "ATLAS", false, true);
  assert.equal(daily.kicker, "TAGESFRONT · CORE-LINK");
});

test("start progress is clamped and malformed time cannot skip the opening", () => {
  assert.ok(
    Math.abs(matchStartVisual(2500, "ATLAS", "LYRA").progress - 1 / 6) < 1e-12,
  );
  assert.equal(matchStartVisual(-100, "ATLAS", "LYRA").progress, 1);
  assert.deepEqual(
    matchStartVisual(Number.NaN, "ATLAS", "LYRA"),
    matchStartVisual(3000, "ATLAS", "LYRA"),
  );
});


test("compressed openings preserve all three phases across a shorter duration", () => {
  assert.equal(
    matchStartVisual(1800, "ATLAS", "LYRA", false, false, 1800).phase,
    "cores",
  );
  assert.equal(
    matchStartVisual(1200, "ATLAS", "LYRA", false, false, 1800).phase,
    "supply",
  );
  assert.equal(
    matchStartVisual(600, "ATLAS", "LYRA", false, false, 1800).phase,
    "commanders",
  );
  assert.equal(
    matchStartVisual(0, "ATLAS", "LYRA", false, false, 1800).phase,
    "go",
  );
});

test("compressed opening progress uses its configured duration", () => {
  assert.equal(
    matchStartVisual(900, "ATLAS", "LYRA", false, false, 1800).progress,
    0.5,
  );
});

test("first battle countdown teaches only the next useful actions", () => {
  const first = matchStartVisual(
    3000,
    "ATLAS",
    "LYRA",
    false,
    false,
    3000,
    true,
    "Vanguard",
  );
  assert.equal(first.kicker, "DEIN ERSTER ZUG");
  assert.equal(first.title, "VANGUARD IST BEREIT");
  assert.match(first.detail, /WECHSELN/);

  const deploy = matchStartVisual(
    2000,
    "ATLAS",
    "LYRA",
    false,
    false,
    3000,
    true,
    "Vanguard",
  );
  assert.equal(deploy.title, "IM GRÜNEN GEBIET EINSETZEN");
  assert.equal(deploy.detail, "HALTEN · ZIEHEN · LOSLASSEN");

  const capture = matchStartVisual(
    1000,
    "ATLAS",
    "LYRA",
    false,
    false,
    3000,
    true,
    "Vanguard",
  );
  assert.equal(capture.title, "PUNKTE EROBERN");
  assert.equal(capture.detail, "DEINE TRUPPEN KÄMPFEN VON SELBST");

  const go = matchStartVisual(
    0,
    "ATLAS",
    "LYRA",
    false,
    false,
    3000,
    true,
    "Vanguard",
  );
  assert.equal(go.kicker, "ZIEL · CORE BRECHEN");
  assert.equal(go.detail, "BODEN GEWINNEN · FRONT VORSCHIEBEN");
});

test("first battle guidance still explains control-objective wins", () => {
  const go = matchStartVisual(
    0,
    "ATLAS",
    "LYRA",
    true,
    false,
    3000,
    true,
    "Vanguard",
  );
  assert.equal(go.kicker, "ZIEL · RELAIS SICHERN");
  assert.equal(go.detail, "MARKIERTE RELAIS HALTEN");
});

test("direct rematch countdown skips technical relinking and keeps the opening card visible", () => {
  const first = matchStartVisual(
    1200,
    "ATLAS",
    "LYRA",
    false,
    false,
    1200,
    false,
    "Vanguard",
    true,
  );
  assert.equal(first.kicker, "NÄCHSTE FRONT");
  assert.equal(first.title, "VANGUARD BEREIT");
  assert.match(first.detail, /WECHSELN/);

  const position = matchStartVisual(
    800,
    "ATLAS",
    "LYRA",
    false,
    false,
    1200,
    false,
    "Vanguard",
    true,
  );
  assert.equal(position.kicker, "KEIN UMWEG");
  assert.equal(position.title, "POSITION FESTLEGEN");

  const commander = matchStartVisual(
    400,
    "NOVA",
    "LYRA",
    true,
    false,
    1200,
    false,
    "Ranger",
    true,
  );
  assert.equal(commander.kicker, "RELAIS IM BLICK");
  assert.equal(commander.title, "NOVA BEREIT");

  const go = matchStartVisual(
    0,
    "ATLAS",
    "LYRA",
    false,
    false,
    1200,
    false,
    "Vanguard",
    true,
  );
  assert.equal(go.kicker, "NÄCHSTE FRONT");
  assert.equal(go.title, "LOS");
  assert.equal(go.detail, "VANGUARD IM GRÜNEN FELD EINSETZEN");
});

test("daily rematches keep daily context without restoring the full opening", () => {
  const go = matchStartVisual(
    0,
    "ATLAS",
    "LYRA",
    false,
    true,
    1200,
    false,
    "Vanguard",
    true,
  );
  assert.equal(go.kicker, "TAGESFRONT · WEITER");
});
