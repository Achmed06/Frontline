import assert from "node:assert/strict";
import test from "node:test";
import { openingBotActionDelay } from "./opening-pacing";

test("opening bot pressure scales by difficulty without becoming instant", () => {
  assert.equal(openingBotActionDelay("rookie"), 3.2);
  assert.equal(openingBotActionDelay("standard"), 2.6);
  assert.equal(openingBotActionDelay("veteran"), 2);
  assert.ok(openingBotActionDelay("veteran") > 1.5);
});

test("rookie keeps the longest reaction window", () => {
  assert.ok(
    openingBotActionDelay("rookie") >
      openingBotActionDelay("standard"),
  );
  assert.ok(
    openingBotActionDelay("standard") >
      openingBotActionDelay("veteran"),
  );
});
