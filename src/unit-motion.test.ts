import assert from "node:assert/strict";
import test from "node:test";
import { sampleUnitMotion, unitTrailPoint } from "./unit-motion";

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
