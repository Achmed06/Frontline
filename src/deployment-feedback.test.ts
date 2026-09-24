import assert from "node:assert/strict";
import test from "node:test";
import { deploymentFeedback } from "./deployment-feedback";

test("heavy and siege units receive the weightiest deploy cue", () => {
  assert.equal(deploymentFeedback("bulwark"), "deployHeavy");
  assert.equal(deploymentFeedback("mortar"), "deployHeavy");
});

test("fast units use the lighter deploy signature", () => {
  assert.equal(deploymentFeedback("raider"), "deployFast");
  assert.equal(deploymentFeedback("swarm"), "deployFast");
});

test("standard and specialist units preserve restrained default feedback", () => {
  assert.equal(deploymentFeedback("vanguard"), "deploy");
  assert.equal(deploymentFeedback("medic"), "deploy");
  assert.equal(deploymentFeedback("disruptor"), "deploy");
});

test("future units safely fall back to standard deploy feedback", () => {
  assert.equal(deploymentFeedback("future-unit"), "deploy");
});
