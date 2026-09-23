import assert from "node:assert/strict";
import test from "node:test";
import { featuredEvent, lobbySectionLabel } from "./focused-lobby";

test("featured event is deterministic for the same local calendar date", () => {
  const morning = featuredEvent(new Date(2026, 8, 24, 8, 0));
  const night = featuredEvent(new Date(2026, 8, 24, 23, 59));
  assert.deepEqual(morning, night);
});

test("featured event rotates across daily, draft and series", () => {
  const ids = new Set([
    featuredEvent(new Date(2026, 8, 24)).id,
    featuredEvent(new Date(2026, 8, 25)).id,
    featuredEvent(new Date(2026, 8, 26)).id,
  ]);
  assert.deepEqual(ids, new Set(["daily", "draft", "series"]));
});

test("featured event always exposes one clear call to action", () => {
  for (let day = 1; day <= 9; day++) {
    const event = featuredEvent(new Date(2026, 8, day));
    assert.ok(event.title.length > 0);
    assert.ok(event.hook.length > 0);
    assert.ok(event.cta.length > 0);
  }
});

test("main lobby labels stay intentionally limited to three choices", () => {
  assert.deepEqual(
    ["play", "event", "base"].map((section) =>
      lobbySectionLabel(section as "play" | "event" | "base"),
    ),
    ["SPIELEN", "EVENT", "BASIS"],
  );
});
