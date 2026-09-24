import assert from "node:assert/strict";
import test from "node:test";
import { sampleUnitMotion, sampleUnitRenderPosition, unitTrailPoint } from "./unit-motion";

test("movement facing follows meaningful horizontal travel", () => {
  assert.deepEqual(sampleUnitMotion(undefined, 100, 100), {
    dx: 0,
    dy: 0,
    moved: 0,
    moving: false,
    facing: 1,
    stopped: false,
  });

  const right = sampleUnitMotion(
    { x: 100, y: 100, facing: -1, moving: false },
    104,
    101,
  );
  assert.equal(right.moving, true);
  assert.equal(right.facing, 1);

  const left = sampleUnitMotion(
    { x: 104, y: 101, facing: 1, moving: true },
    99,
    101,
  );
  assert.equal(left.facing, -1);
});

test("attack target overrides movement facing while vertical travel preserves it", () => {
  const attackingLeft = sampleUnitMotion(
    { x: 100, y: 100, facing: 1, moving: true },
    103,
    96,
    80,
  );
  assert.equal(attackingLeft.facing, -1);

  const vertical = sampleUnitMotion(
    { x: 100, y: 100, facing: -1, moving: true },
    100,
    94,
  );
  assert.equal(vertical.facing, -1);
});

test("stopping transition is explicit and trail points stay behind movement", () => {
  const stopped = sampleUnitMotion(
    { x: 100, y: 100, facing: 1, moving: true },
    100,
    100,
  );
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.moving, false);

  assert.deepEqual(unitTrailPoint(110, 100, 10, 0), { x: 102, y: 100 });
  assert.deepEqual(unitTrailPoint(100, 110, 0, 10, 6), { x: 100, y: 104 });
  assert.deepEqual(unitTrailPoint(100, 100, 0, 0), { x: 100, y: 100 });
});


test("unit render position fills the visual gap between 30 Hz simulation ticks", () => {
  const initial = sampleUnitRenderPosition(undefined, 100, 100, 1 / 60);
  assert.equal(initial.x, 100);
  assert.equal(initial.y, 100);

  const half = sampleUnitRenderPosition(initial.state, 104, 100, 1 / 60);
  assert.equal(half.x, 102);
  assert.equal(half.y, 100);
  assert.equal(half.state.progress, 0.5);

  const complete = sampleUnitRenderPosition(half.state, 104, 100, 1 / 60);
  assert.equal(complete.x, 104);
  assert.equal(complete.y, 100);
  assert.equal(complete.state.progress, 1);
});

test("30 FPS rendering keeps legacy unit positions exact", () => {
  const initial = sampleUnitRenderPosition(undefined, 100, 100, 1 / 30);
  const next = sampleUnitRenderPosition(initial.state, 104, 102, 1 / 30);
  assert.equal(next.x, 104);
  assert.equal(next.y, 102);
});

test("large displacements and reduced-motion rendering snap immediately", () => {
  const initial = sampleUnitRenderPosition(undefined, 100, 100, 1 / 60);
  const teleport = sampleUnitRenderPosition(initial.state, 130, 100, 1 / 60);
  assert.equal(teleport.x, 130);
  assert.equal(teleport.state.progress, 1);

  const reduced = sampleUnitRenderPosition(
    teleport.state,
    134,
    104,
    1 / 60,
    true,
  );
  assert.equal(reduced.x, 134);
  assert.equal(reduced.y, 104);
  assert.equal(reduced.state.progress, 1);
});
