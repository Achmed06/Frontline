import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCH_SIMULATION_HZ,
  matchRenderProfile,
} from "./match-render-profile";

test("match rendering targets 60 FPS without changing the 30 Hz simulation", () => {
  assert.deepEqual(matchRenderProfile(), {
    targetFps: 60,
    limitFps: 60,
    powerPreference: "default",
  });
  assert.equal(MATCH_SIMULATION_HZ, 30);
  assert.equal(matchRenderProfile().targetFps / MATCH_SIMULATION_HZ, 2);
});
