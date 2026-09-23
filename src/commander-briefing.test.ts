import assert from "node:assert/strict";
import test from "node:test";
import { commanderBriefing } from "./commander-briefing";

test("ATLAS briefing stays tied to canonical shield values", () => {
  const briefing = commanderBriefing("atlas");
  assert.equal(briefing.emphasis, "defense");
  assert.equal(briefing.cooldown, "30s CD");
  assert.deepEqual(briefing.stats, [
    "+70 SCHILD",
    "6s DAUER",
    "ALLE TRUPPEN",
  ]);
});

test("LYRA briefing exposes healing and cleanse without inventing duration", () => {
  const briefing = commanderBriefing("lyra");
  assert.equal(briefing.emphasis, "recovery");
  assert.equal(briefing.cooldown, "35s CD");
  assert.deepEqual(briefing.stats, [
    "+80 HP",
    "SLOW CLEANSE",
    "ALLE TRUPPEN",
  ]);
});

test("NOVA briefing derives canonical movement and attack multipliers", () => {
  const briefing = commanderBriefing("nova");
  assert.equal(briefing.emphasis, "tempo");
  assert.equal(briefing.cooldown, "32s CD");
  assert.deepEqual(briefing.stats, [
    "+25% TEMPO",
    "+30% ANGRIFF",
    "6s DAUER",
  ]);
});
