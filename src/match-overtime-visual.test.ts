import assert from "node:assert/strict";
import test from "node:test";
import { MATCH_DURATION, OVERTIME_DURATION } from "./engine";
import { matchOvertimeVisual } from "./match-overtime-visual";

const state = (
  phase: "playing" | "overtime" | "ended",
  time: number,
) => ({ phase, time });

test("overtime visual is hidden outside overtime", () => {
  assert.equal(matchOvertimeVisual(state("playing", MATCH_DURATION)), null);
  assert.equal(matchOvertimeVisual(state("ended", MATCH_DURATION + 10)), null);
});

test("overtime opens with an exact 45-second transition", () => {
  const visual = matchOvertimeVisual(state("overtime", MATCH_DURATION));
  assert.deepEqual(visual, {
    stage: "entry",
    elapsed: 0,
    remaining: OVERTIME_DURATION,
    progress: 0,
    title: "VERLÄNGERUNG",
    detail: "45 SEKUNDEN · CORE ODER SCHLUSSWERTUNG",
    intensity: 0.45,
  });
  assert.equal(
    matchOvertimeVisual(state("overtime", MATCH_DURATION + 2.49))?.stage,
    "entry",
  );
  assert.equal(
    matchOvertimeVisual(state("overtime", MATCH_DURATION + 2.5))?.stage,
    "pressure",
  );
});

test("overtime pressure and final ten seconds expose exact remaining time", () => {
  const pressure = matchOvertimeVisual(
    state("overtime", MATCH_DURATION + 20.2),
  )!;
  assert.equal(pressure.stage, "pressure");
  assert.equal(pressure.title, "SUDDEN DEATH");
  assert.equal(pressure.detail, "NOCH 25 SEKUNDEN · CORE ODER SCHLUSSWERTUNG");

  const final = matchOvertimeVisual(
    state("overtime", MATCH_DURATION + OVERTIME_DURATION - 9.2),
  )!;
  assert.equal(final.stage, "final");
  assert.equal(final.title, "LETZTER DRUCK");
  assert.equal(final.detail, "NOCH 10 SEKUNDEN");
});

test("overtime visual clamps malformed and overrun times safely", () => {
  const malformed = matchOvertimeVisual(state("overtime", Number.NaN))!;
  assert.equal(malformed.elapsed, 0);
  assert.equal(malformed.remaining, OVERTIME_DURATION);
  const overrun = matchOvertimeVisual(
    state("overtime", MATCH_DURATION + OVERTIME_DURATION + 5),
  )!;
  assert.equal(overrun.remaining, 0);
  assert.equal(overrun.progress, 1);
  assert.equal(overrun.stage, "final");
});
