import assert from "node:assert/strict";
import test from "node:test";
import { MISSIONS } from "./campaign";
import { missionBriefingSnapshot } from "./mission-briefing";

test("core mission briefing exposes exact start and star targets", () => {
  const mission = MISSIONS[0];
  const briefing = missionBriefingSnapshot(mission);
  assert.equal(briefing.mode, "core");
  assert.equal(briefing.modeLabel, "CORE-ANGRIFF");
  assert.equal(briefing.playerTerritory, 3);
  assert.equal(briefing.enemyTerritory, 3);
  assert.equal(briefing.neutralTerritory, 3);
  assert.deepEqual(briefing.starTargets, [
    "GEFECHT GEWINNEN",
    "≥ 65% CORE",
    "≤ 150s",
  ]);
});

test("control mission briefing derives exact relay requirement", () => {
  const mission = MISSIONS.find((item) => item.id === "relay")!;
  const briefing = missionBriefingSnapshot(mission);
  assert.equal(briefing.mode, "control");
  assert.equal(briefing.modeLabel, "SIGNALKRIEG");
  assert.equal(briefing.objectiveMeta, "1/1 RELAIS · 30s");
});

test("enemy commander label uses canonical commander metadata", () => {
  const mission = MISSIONS.find((item) => item.id === "recovery-line")!;
  const briefing = missionBriefingSnapshot(mission);
  assert.equal(briefing.enemyCommander, "LYRA · REPARATURIMPULS");
});

test("enemy deck composition and average cost come from canonical cards", () => {
  const mission = MISSIONS[0];
  const briefing = missionBriefingSnapshot(mission);
  assert.equal(briefing.enemyUnits, 6);
  assert.equal(briefing.enemyAbilities, 2);
  assert.equal(Number.isFinite(briefing.enemyAverageCost), true);
  assert.equal(briefing.enemyAverageCost > 0, true);
});

test("mission territory snapshot always covers the 3x3 board", () => {
  for (const mission of MISSIONS) {
    const briefing = missionBriefingSnapshot(mission);
    assert.equal(
      briefing.playerTerritory +
        briefing.enemyTerritory +
        briefing.neutralTerritory,
      9,
    );
  }
});
