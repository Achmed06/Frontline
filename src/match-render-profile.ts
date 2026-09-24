export type MatchRenderProfile = {
  targetFps: number;
  limitFps: number;
  powerPreference: "default" | "high-performance" | "low-power";
};

export const MATCH_SIMULATION_HZ = 30;

export function matchRenderProfile(): MatchRenderProfile {
  return {
    targetFps: 60,
    limitFps: 60,
    powerPreference: "default",
  };
}
