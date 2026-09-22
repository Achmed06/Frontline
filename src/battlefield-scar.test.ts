import assert from "node:assert/strict";
import test from "node:test";
import { battlefieldScarVisual } from "./battlefield-scar";

test("battlefield scar settles in, holds, then expires", () => {
  const scar = {
    id: 1,
    x: 100,
    y: 100,
    createdAt: 10,
    duration: 8,
    radius: 20,
    sourceCardId: "mortar",
  };

  const early = battlefieldScarVisual(scar, 10.4)!;
  const held = battlefieldScarVisual(scar, 13)!;
  const late = battlefieldScarVisual(scar, 17.5)!;

  assert.equal(early.kind, "explosive");
  assert.ok(early.alpha > 0);
  assert.ok(held.alpha >= early.alpha);
  assert.ok(late.alpha < held.alpha);
  assert.ok(held.radius > 20);
  assert.equal(battlefieldScarVisual(scar, 18), null);
});

test("scar style follows the actual finishing weapon profile", () => {
  assert.equal(
    battlefieldScarVisual(
      {
        id: 2,
        x: 0,
        y: 0,
        createdAt: 0,
        duration: 6,
        radius: 18,
        sourceCardId: "disruptor",
      },
      1,
    )?.kind,
    "electric",
  );
  assert.equal(
    battlefieldScarVisual(
      {
        id: 3,
        x: 0,
        y: 0,
        createdAt: 0,
        duration: 6,
        radius: 18,
        sourceCardId: "breaker",
      },
      1,
    )?.kind,
    "breach",
  );
});

test("scar visual clamps malformed radius and duration safely", () => {
  const visual = battlefieldScarVisual(
    {
      id: 4,
      x: 0,
      y: 0,
      createdAt: 0,
      duration: Number.NaN,
      radius: Number.NaN,
    },
    0.5,
  )!;
  assert.ok(visual.radius >= 8 && visual.radius <= 34);
  assert.ok(visual.alpha >= 0);
});
