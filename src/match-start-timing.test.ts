import assert from "node:assert/strict";
import test from "node:test";
import { matchStartTiming } from "./match-start-timing";

test("first battle keeps the full onboarding window and already allows card choice", () => {
  assert.deepEqual(matchStartTiming(0), {
    countdownMs: 3000,
    goMs: 650,
    allowPreselect: true,
  });
});

test("returning players get the compressed opening and card preselection", () => {
  assert.deepEqual(matchStartTiming(1), {
    countdownMs: 1800,
    goMs: 420,
    allowPreselect: true,
  });
  assert.deepEqual(matchStartTiming(25), matchStartTiming(1));
});

test("direct rematches re-enter faster without skipping card choice", () => {
  assert.deepEqual(matchStartTiming(1, true), {
    countdownMs: 1200,
    goMs: 300,
    allowPreselect: true,
  });
  assert.deepEqual(matchStartTiming(25, true), matchStartTiming(1, true));
  assert.deepEqual(matchStartTiming(0, true), matchStartTiming(0));
});

test("malformed match counts fail safely to the first-battle timing", () => {
  assert.deepEqual(matchStartTiming(Number.NaN), matchStartTiming(0));
  assert.deepEqual(matchStartTiming(-4), matchStartTiming(0));
});
