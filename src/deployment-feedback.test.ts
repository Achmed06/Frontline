import assert from "node:assert/strict";
import test from "node:test";
import { deploymentFeedback } from "./deployment-feedback";

test("heavy and siege units receive the weightiest deploy feedback", () => {
  assert.deepEqual(deploymentFeedback("bulwark"), {
    cue: "deployHeavy",
    haptic: "heavy",
    impactScale: 1.18,
  });
  assert.equal(deploymentFeedback("mortar").cue, "deployHeavy");
});

test("fast units use the lighter deploy signature", () => {
  assert.equal(deploymentFeedback("raider").cue, "deployFast");
  assert.equal(deploymentFeedback("swarm").haptic, "light");
});

test("standard and specialist units preserve restrained default feedback", () => {
  assert.equal(deploymentFeedback("vanguard").cue, "deploy");
  assert.equal(deploymentFeedback("medic").cue, "deploy");
  assert.ok(deploymentFeedback("medic").impactScale < 1);
});

test("future units safely fall back to standard deploy feedback", () => {
  assert.equal(deploymentFeedback("future-unit").cue, "deploy");
  assert.equal(deploymentFeedback("future-unit").haptic, "medium");
});
