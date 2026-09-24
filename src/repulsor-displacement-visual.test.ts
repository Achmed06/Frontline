import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { repulsorDisplacementPoint, repulsorDisplacementVisual } from "./repulsor-displacement-visual";

test("repulsor displacement follows the real start to landing vector", () => {
  const visual = repulsorDisplacementVisual({
    type: "repulsor-move",
    x: 100,
    y: 100,
    targetX: 140,
    targetY: 100,
    life: 0.52,
    maxLife: 0.52,
    radius: 10,
    value: 40,
  });

  assert.ok(visual);
  assert.equal(visual?.active, true);
  assert.ok((visual?.nx ?? 0) > 0.99);
  assert.ok(Math.abs(visual?.ny ?? 1) < 1e-12);
  assert.equal(visual?.distance, 40);
  assert.ok((visual?.landingRadius ?? 0) > 10);
});

test("larger real displacement creates stronger trail geometry", () => {
  const short = repulsorDisplacementVisual({
    type: "repulsor-move",
    x: 0,
    y: 0,
    targetX: 20,
    targetY: 0,
    life: 0.4,
    maxLife: 0.52,
    radius: 9,
    value: 20,
  });
  const long = repulsorDisplacementVisual({
    type: "repulsor-move",
    x: 0,
    y: 0,
    targetX: 55,
    targetY: 0,
    life: 0.4,
    maxLife: 0.52,
    radius: 9,
    value: 55,
  });

  assert.ok((long?.streakCount ?? 0) > (short?.streakCount ?? 0));
  assert.ok((long?.trailWidth ?? 0) > (short?.trailWidth ?? 0));
  assert.ok((long?.shockLength ?? 0) > (short?.shockLength ?? 0));
});

test("real Repulsor play emits an exact per-unit displacement effect", () => {
  const match = new Match({
    botEnabled: false,
    playerDeck: [
      "vanguard",
      "bulwark",
      "ranger",
      "swarm",
      "lancer",
      "medic",
      "pulse",
      "repulsor",
    ],
  });
  match.state.energy.enemy = 10;
  assert.equal(match.play("enemy", "vanguard", 210, 150).ok, true);
  const target = match.state.units.find((unit) => unit.team === "enemy")!;
  const startX = target.x;
  const startY = target.y;

  match.state.energy.player = 10;
  assert.equal(match.play("player", "repulsor", startX, startY).ok, true);

  const move = match.state.effects.find(
    (effect) => effect.type === "repulsor-move",
  );
  assert.ok(move);
  assert.equal(move?.x, startX);
  assert.equal(move?.y, startY);
  assert.equal(move?.targetX, target.x);
  assert.equal(move?.targetY, target.y);
  assert.ok((move?.value ?? 0) > 0);
  assert.equal(move?.sourceCardId, "repulsor");
  assert.equal(move?.targetUnitId, target.id);
});

test("missing, coincident and malformed displacement stays suppressed", () => {
  assert.equal(
    repulsorDisplacementVisual({
      type: "repulsor-move",
      x: 0,
      y: 0,
      life: 0.3,
      maxLife: 0.52,
    }),
    null,
  );
  assert.equal(
    repulsorDisplacementVisual({
      type: "repulsor-move",
      x: 10,
      y: 10,
      targetX: 10,
      targetY: 10,
      life: 0.3,
      maxLife: 0.52,
    }),
    null,
  );
});


test("Repulsor unit presentation follows the same accelerated travel as its trail", () => {
  const effect = {
    type: "repulsor-move" as const,
    x: 100,
    y: 100,
    targetX: 155,
    targetY: 100,
    life: 0.26,
    maxLife: 0.52,
    radius: 10,
    value: 55,
  };
  const visual = repulsorDisplacementVisual(effect);
  const point = repulsorDisplacementPoint(effect);
  assert.ok(visual);
  assert.ok(point);
  assert.equal(point?.progress, visual?.travelProgress);
  assert.ok((point?.x ?? 100) > 140);
  assert.equal(point?.y, 100);

  const snapped = repulsorDisplacementPoint(effect, true);
  assert.deepEqual(snapped, { x: 155, y: 100, progress: 1 });
});
