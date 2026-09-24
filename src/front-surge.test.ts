import assert from "node:assert/strict";
import test from "node:test";
import {
  frontSurge,
  FRONT_SURGE_COOLDOWN_SECONDS,
  FRONT_SURGE_WINDOW_SECONDS,
  INITIAL_FRONT_SURGE,
} from "./front-surge";

test("ignores an isolated point capture", () => {
  const result = frontSurge(INITIAL_FRONT_SURGE, {
    time: 15,
    previousOwners: [null, null, null],
    currentOwners: ["player", null, null],
  });
  assert.equal(result.event, null);
  assert.equal(result.memory.recent.length, 1);
});

test("announces two player captures inside the surge window", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 20,
    previousOwners: [null, null, null],
    currentOwners: ["player", null, null],
  });
  const second = frontSurge(first.memory, {
    time: 25,
    previousOwners: ["player", null, null],
    currentOwners: ["player", "player", null],
  });

  assert.equal(second.event?.team, "player");
  assert.equal(second.event?.captures, 2);
  assert.equal(second.event?.label, "VORSTOSS");
  assert.equal(second.event?.tone, "opportunity");
});

test("upgrades a three-capture player surge to the stronger callout", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 20,
    previousOwners: [null, null, null],
    currentOwners: ["player", "player", null],
  });
  assert.equal(first.event?.captures, 2);

  const cooled = {
    ...first.memory,
    lastPlayerAt: 20 - FRONT_SURGE_COOLDOWN_SECONDS,
  };
  const third = frontSurge(cooled, {
    time: 24,
    previousOwners: ["player", "player", null],
    currentOwners: ["player", "player", "player"],
  });
  assert.equal(third.event?.captures, 3);
  assert.equal(third.event?.label, "DRUCKWELLE");
});

test("announces an enemy counter-surge independently", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 30,
    previousOwners: ["player", "player", null],
    currentOwners: ["enemy", "player", null],
  });
  const second = frontSurge(first.memory, {
    time: 35,
    previousOwners: ["enemy", "player", null],
    currentOwners: ["enemy", "enemy", null],
  });

  assert.equal(second.event?.team, "enemy");
  assert.equal(second.event?.label, "GEGENSTOSS");
  assert.equal(second.event?.tone, "danger");
});

test("an opposing capture breaks the previous surge chain", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 10,
    previousOwners: [null, null],
    currentOwners: ["player", null],
  });
  const counter = frontSurge(first.memory, {
    time: 13,
    previousOwners: ["player", null],
    currentOwners: ["enemy", null],
  });
  const recapture = frontSurge(counter.memory, {
    time: 16,
    previousOwners: ["enemy", null],
    currentOwners: ["player", null],
  });

  assert.equal(recapture.event, null);
});

test("mixed ownership flips in one update never create a surge", () => {
  const seeded = frontSurge(INITIAL_FRONT_SURGE, {
    time: 10,
    previousOwners: [null, null, null],
    currentOwners: ["player", null, null],
  });
  const mixed = frontSurge(seeded.memory, {
    time: 14,
    previousOwners: ["player", null, null],
    currentOwners: ["player", "player", "enemy"],
  });

  assert.equal(mixed.event, null);
});

test("does not retrigger the same side during cooldown", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 10,
    previousOwners: [null, null, null],
    currentOwners: ["player", "player", null],
  });
  assert.ok(first.event);

  const next = frontSurge(first.memory, {
    time: 12,
    previousOwners: ["player", "player", null],
    currentOwners: ["player", "player", "player"],
  });
  assert.equal(next.event, null);
});

test("drops stale captures outside the surge window", () => {
  const first = frontSurge(INITIAL_FRONT_SURGE, {
    time: 5,
    previousOwners: [null, null],
    currentOwners: ["player", null],
  });
  const late = frontSurge(first.memory, {
    time: 5 + FRONT_SURGE_WINDOW_SECONDS + 0.1,
    previousOwners: ["player", null],
    currentOwners: ["player", "player"],
  });

  assert.equal(late.event, null);
  assert.equal(late.memory.recent.length, 1);
});

test("malformed time safely behaves like match start", () => {
  const result = frontSurge(INITIAL_FRONT_SURGE, {
    time: Number.NaN,
    previousOwners: [null, null],
    currentOwners: ["enemy", "enemy"],
  });

  assert.equal(result.event?.team, "enemy");
  assert.equal(result.memory.recent.every((capture) => capture.time === 0), true);
});
