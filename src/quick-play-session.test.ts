import assert from "node:assert/strict";
import test from "node:test";
import { quickPlaySessionCue } from "./quick-play-session";
import type { MatchRecord } from "./storage";

const record = (
  outcome: MatchRecord["outcome"],
  id: string,
): MatchRecord => ({
  id,
  recordedAt: 1,
  duration: 120,
  difficulty: "standard",
  deck: [
    "vanguard",
    "bulwark",
    "ranger",
    "swarm",
    "lancer",
    "medic",
    "pulse",
    "rally",
  ],
  outcome,
  core: { player: 80, enemy: 20 },
  points: { player: 5, enemy: 3 },
  feedback: "",
});

test("two or more consecutive wins create a hot session cue", () => {
  const cue = quickPlaySessionCue(
    [record("player", "a"), record("player", "b"), record("enemy", "c")],
    "Frostrelais",
    7,
  );
  assert.equal(cue.tone, "hot");
  assert.equal(cue.streak, 2);
  assert.equal(cue.heroTitleTop, "2 SIEGE.");
  assert.match(cue.startKicker, /SERIE ×2/);
  assert.match(cue.startDetail, /FRONT 7/);
});

test("one win does not overstate a streak", () => {
  const cue = quickPlaySessionCue(
    [record("player", "a"), record("enemy", "b")],
    "Glutbruch",
    4,
  );
  assert.equal(cue.tone, "neutral");
  assert.equal(cue.streak, 0);
  assert.equal(cue.heroCta, "JETZT SPIELEN");
});

test("latest loss creates a retry cue without gameplay penalty", () => {
  const cue = quickPlaySessionCue(
    [record("enemy", "a"), record("player", "b")],
    "Nexuskern",
    10,
  );
  assert.equal(cue.tone, "rebound");
  assert.equal(cue.streak, 0);
  assert.equal(cue.heroCta, "ZURÜCKSCHLAGEN");
  assert.match(cue.startKicker, /REVANCHE/);
});

test("draw stays neutral and asks for a clean decision", () => {
  const cue = quickPlaySessionCue(
    [record("draw", "a"), record("player", "b")],
    "Smaragdküste",
    3,
  );
  assert.equal(cue.tone, "neutral");
  assert.equal(cue.heroCta, "NOCHMAL");
  assert.match(cue.startKicker, /ENTSCHEIDUNG/);
});

test("empty history and malformed match number fall back safely", () => {
  const cue = quickPlaySessionCue([], "", Number.NaN);
  assert.equal(cue.tone, "neutral");
  assert.equal(cue.streak, 0);
  assert.match(cue.startDetail, /FRONT 1/);
});
