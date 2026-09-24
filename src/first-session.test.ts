import assert from "node:assert/strict";
import test from "node:test";
import { firstMatchUnlock, firstSessionFocus } from "./first-session";

test("brand-new players see only the core battle action", () => {
  const focus = firstSessionFocus(0);
  assert.equal(focus.phase, "first-battle");
  assert.equal(focus.showMainNavigation, false);
  assert.equal(focus.showSecondaryPlay, false);
  assert.equal(focus.showAdvancedBattle, false);
  assert.equal(focus.cta, "ERSTES GEFECHT STARTEN");
  assert.match(focus.copy, /^Truppe einsetzen\./);
});

test("after one match the three-part lobby appears but advanced setup stays hidden", () => {
  const focus = firstSessionFocus(1);
  assert.equal(focus.phase, "learning");
  assert.equal(focus.showMainNavigation, true);
  assert.equal(focus.showSecondaryPlay, true);
  assert.equal(focus.showAdvancedBattle, false);
});

test("after three matches the full lightweight lobby is available", () => {
  const focus = firstSessionFocus(3);
  assert.equal(focus.phase, "full");
  assert.equal(focus.showMainNavigation, true);
  assert.equal(focus.showSecondaryPlay, true);
  assert.equal(focus.showAdvancedBattle, true);
});

test("invalid match counts fail safely to the first-battle experience", () => {
  assert.equal(firstSessionFocus(Number.NaN).phase, "first-battle");
  assert.equal(firstSessionFocus(-5).phase, "first-battle");
});

test("only the actual first completed match emits the unlock moment", () => {
  assert.equal(firstMatchUnlock(0, 1), true);
  assert.equal(firstMatchUnlock(1, 2), false);
  assert.equal(firstMatchUnlock(0, 2), false);
});
