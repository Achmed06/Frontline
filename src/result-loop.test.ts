import assert from "node:assert/strict";
import test from "node:test";
import { resultMomentum } from "./result-loop";
import type { MatchRecord } from "./storage";

const record = (outcome: MatchRecord["outcome"], id: string): MatchRecord => ({
  id, recordedAt: 1, duration: 120, difficulty: "standard",
  deck: ["vanguard","bulwark","ranger","swarm","lancer","medic","pulse","rally"],
  outcome, core: { player: 80, enemy: 20 }, points: { player: 5, enemy: 3 }, feedback: "",
});

test("win streak only counts consecutive wins from latest match", () => {
  const momentum = resultMomentum([
    record("player","a"), record("player","b"), record("player","c"),
    record("enemy","d"), record("player","e"),
  ]);
  assert.equal(momentum.streak, 3);
  assert.equal(momentum.label, "3 SIEGE IN FOLGE");
  assert.equal(momentum.tone, "win");
});

test("loss resets visible streak and pushes immediate retry", () => {
  const momentum = resultMomentum([record("enemy","a"), record("player","b"), record("player","c")]);
  assert.equal(momentum.streak, 0);
  assert.equal(momentum.tone, "loss");
  assert.match(momentum.title, /zurückschlagen/i);
});

test("draw stays neutral and does not fake a streak", () => {
  const momentum = resultMomentum([record("draw","a"), record("player","b")]);
  assert.equal(momentum.streak, 0);
  assert.equal(momentum.tone, "draw");
});

test("empty history has a safe neutral fallback", () => {
  const momentum = resultMomentum([]);
  assert.equal(momentum.streak, 0);
  assert.equal(momentum.tone, "draw");
});
