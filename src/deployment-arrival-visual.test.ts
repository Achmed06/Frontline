import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { deploymentArrivalVisual } from "./deployment-arrival-visual";

test("deployment styles differentiate heavy, siege, swarm and support units", () => {
  const heavy = deploymentArrivalVisual({
    type: "spawn",
    life: 0.45,
    maxLife: 0.65,
    radius: 14,
    sourceCardId: "bulwark",
  });
  const siege = deploymentArrivalVisual({
    type: "spawn",
    life: 0.45,
    maxLife: 0.65,
    radius: 10,
    sourceCardId: "lancer",
  });
  const swarm = deploymentArrivalVisual({
    type: "spawn",
    life: 0.45,
    maxLife: 0.65,
    radius: 7,
    sourceCardId: "swarm",
  });
  const support = deploymentArrivalVisual({
    type: "spawn",
    life: 0.45,
    maxLife: 0.65,
    radius: 9,
    sourceCardId: "medic",
  });

  assert.equal(heavy?.kind, "heavy");
  assert.equal(siege?.kind, "siege");
  assert.equal(swarm?.kind, "swarm");
  assert.equal(support?.kind, "support");
  assert.ok((heavy?.beamWidth ?? 0) > (siege?.beamWidth ?? 0));
  assert.ok((siege?.beamHeight ?? 0) > (heavy?.beamHeight ?? 0));
  assert.ok((swarm?.ringRadius ?? 99) < (heavy?.ringRadius ?? 0));
});

test("real spawn events carry card identity and unit radius", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("player", "bulwark", 210, 440).ok, true);
  const unit = match.state.units[0];
  const spawn = match.state.effects.find((effect) => effect.type === "spawn");

  assert.ok(spawn);
  assert.equal(spawn?.sourceCardId, "bulwark");
  assert.equal(spawn?.radius, unit.radius);
  assert.equal(spawn?.targetUnitId, unit.id);
  assert.equal(deploymentArrivalVisual(spawn)?.kind, "heavy");
});

test("standard units keep a restrained fallback arrival", () => {
  const visual = deploymentArrivalVisual({
    type: "spawn",
    life: 0.325,
    maxLife: 0.65,
    radius: 10,
    sourceCardId: "vanguard",
  });
  assert.equal(visual?.kind, "standard");
  assert.ok((visual?.spriteScale ?? 0) > 0.7);
  assert.ok((visual?.spriteScale ?? 2) <= 1);
});

test("malformed timing stays bounded", () => {
  const visual = deploymentArrivalVisual({
    type: "spawn",
    life: Number.NaN,
    maxLife: Number.NaN,
    radius: Number.POSITIVE_INFINITY,
    sourceCardId: "mortar",
  });
  assert.ok(visual);
  assert.equal(visual?.progress, 1);
  assert.equal(visual?.alpha, 0);
  assert.ok((visual?.ringRadius ?? 0) > 0);
  assert.ok((visual?.spriteScale ?? 0) > 0);
});
