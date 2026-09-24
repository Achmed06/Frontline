import assert from "node:assert/strict";
import test from "node:test";
import { matchStartTiming } from "./match-start-timing";

test("first battle keeps the full three-second onboarding window", () => {
  assert.deepEqual(matchStartTiming(0), {
    countdownMs: 3000,
    goMs: 650,
    allowPreselect: false,
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

test("malformed match counts fail safely to the first-battle timing", () => {
  assert.deepEqual(matchStartTiming(Number.NaN), matchStartTiming(0));
  assert.deepEqual(matchStartTiming(-4), matchStartTiming(0));
});
