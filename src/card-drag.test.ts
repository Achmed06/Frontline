import assert from "node:assert/strict";
import test from "node:test";
import {
  boardPointFromClient,
  dragThresholdReached,
} from "./card-drag";

test("drag threshold ignores normal tap jitter", () => {
  assert.equal(dragThresholdReached(10, 10, 15, 16, 10), false);
  assert.equal(dragThresholdReached(10, 10, 20, 10, 10), true);
});

test("drag threshold safely rejects malformed coordinates", () => {
  assert.equal(dragThresholdReached(0, 0, Number.NaN, 10), false);
});

test("client coordinates map linearly into the arena board", () => {
  const point = boardPointFromClient(
    260,
    350,
    { left: 50, top: 75, width: 420, height: 550 },
    420,
    550,
  );
  assert.deepEqual(point, { x: 210, y: 275 });
});

test("client coordinates outside the rendered canvas do not deploy", () => {
  const rect = { left: 50, top: 75, width: 420, height: 550 };
  assert.equal(boardPointFromClient(49, 100, rect, 420, 550), null);
  assert.equal(boardPointFromClient(471, 100, rect, 420, 550), null);
  assert.equal(boardPointFromClient(100, 626, rect, 420, 550), null);
});

test("invalid canvas geometry fails closed", () => {
  assert.equal(
    boardPointFromClient(
      100,
      100,
      { left: 0, top: 0, width: 0, height: 550 },
      420,
      550,
    ),
    null,
  );
});
