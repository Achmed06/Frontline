import assert from "node:assert/strict";
import test from "node:test";
import { quickPlayBaseline, quickPlaySessionCue } from "./quick-play-session";

test("two or more Quick Play wins create a hot session cue", () => {
  const cue = quickPlaySessionCue(
    { completedMatches: 6, winStreak: 2, lastOutcome: "player" },
    "Frostrelais",
    7,
  );
  assert.equal(cue.tone, "hot");
  assert.equal(cue.streak, 2);
  assert.equal(cue.heroTitleTop, "2 SIEGE.");
  assert.match(cue.startKicker, /SERIE ×2/);
  assert.match(cue.startDetail, /FRONT 7/);
});

test("one Quick Play win does not overstate a streak", () => {
  const cue = quickPlaySessionCue(
    { completedMatches: 3, winStreak: 1, lastOutcome: "player" },
    "Glutbruch",
    4,
  );
  assert.equal(cue.tone, "neutral");
  assert.equal(cue.streak, 0);
  assert.equal(cue.heroCta, "JETZT SPIELEN");
});

test("latest Quick Play loss creates a retry cue without gameplay penalty", () => {
  const cue = quickPlaySessionCue(
    { completedMatches: 9, winStreak: 0, lastOutcome: "enemy" },
    "Nexuskern",
    10,
  );
  assert.equal(cue.tone, "rebound");
  assert.equal(cue.streak, 0);
  assert.equal(cue.heroCta, "ZURÜCKSCHLAGEN");
  assert.match(cue.startKicker, /REVANCHE/);
});

test("Quick Play draw stays neutral and asks for a clean decision", () => {
  const cue = quickPlaySessionCue(
    { completedMatches: 2, winStreak: 0, lastOutcome: "draw" },
    "Smaragdküste",
    3,
  );
  assert.equal(cue.tone, "neutral");
  assert.equal(cue.heroCta, "NOCHMAL");
  assert.match(cue.startKicker, /ENTSCHEIDUNG/);
});

test("empty or malformed Quick Play state falls back safely", () => {
  const empty = quickPlaySessionCue({}, "", Number.NaN);
  assert.equal(empty.tone, "neutral");
  assert.equal(empty.streak, 0);
  assert.match(empty.startDetail, /FRONT 1/);

  const malformed = quickPlaySessionCue(
    {
      completedMatches: Number.NaN,
      winStreak: 99,
      lastOutcome: "player",
    },
    "Frostrelais",
    2,
  );
  assert.equal(malformed.tone, "neutral");
  assert.equal(malformed.streak, 0);
});

test("win streak is capped by completed Quick Play matches", () => {
  const cue = quickPlaySessionCue(
    { completedMatches: 2, winStreak: 99, lastOutcome: "player" },
    "Frostrelais",
    3,
  );
  assert.equal(cue.streak, 2);
});


test("legacy saves preserve their previous Quick Play rotation baseline exactly once", () => {
  assert.deepEqual(quickPlayBaseline(7), {
    completedMatches: 7,
    migrated: true,
  });
  assert.deepEqual(quickPlayBaseline(0), {
    completedMatches: 0,
    migrated: true,
  });
  assert.deepEqual(quickPlayBaseline(Number.NaN), {
    completedMatches: 0,
    migrated: true,
  });
});

test("dedicated Quick Play progress always wins over the legacy global count", () => {
  assert.deepEqual(quickPlayBaseline(99, 3), {
    completedMatches: 3,
    migrated: false,
  });
  assert.deepEqual(quickPlayBaseline(99, 0), {
    completedMatches: 0,
    migrated: false,
  });
});
