import assert from "node:assert/strict";
import test from "node:test";
import { matchViewportProfile } from "./mobile-match-layout";

test("modern tall iPhone keeps standard combat layout", () => {
  const profile = matchViewportProfile(393, 852);
  assert.equal(profile.density, "standard");
  assert.equal(profile.narrow, false);
});

test("short mobile viewport uses compact combat layout", () => {
  const profile = matchViewportProfile(390, 760);
  assert.equal(profile.density, "compact");
  assert.equal(profile.narrow, true);
});

test("iPhone SE-class viewport uses tight combat layout", () => {
  const profile = matchViewportProfile(375, 667);
  assert.equal(profile.density, "tight");
  assert.equal(profile.narrow, true);
});

test("very narrow but tall viewport preserves vertical arena height", () => {
  const profile = matchViewportProfile(360, 820);
  assert.equal(profile.density, "standard");
  assert.equal(profile.narrow, true);
});

test("malformed viewport values fall back safely", () => {
  const profile = matchViewportProfile(Number.NaN, 0);
  assert.equal(profile.width, 390);
  assert.equal(profile.height, 844);
  assert.equal(profile.density, "standard");
  assert.equal(profile.narrow, true);
});
