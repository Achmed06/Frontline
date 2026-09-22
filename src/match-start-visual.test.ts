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
  assert.equal(matchStartVisual(2500, "ATLAS", "LYRA").progress, 1 / 6);
  assert.equal(matchStartVisual(-100, "ATLAS", "LYRA").progress, 1);
  assert.deepEqual(
    matchStartVisual(Number.NaN, "ATLAS", "LYRA"),
    matchStartVisual(3000, "ATLAS", "LYRA"),
  );
});
