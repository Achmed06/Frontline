import { MATCH_DURATION, OVERTIME_DURATION, type MatchState } from "./engine";

export type MatchOvertimeVisual = {
  stage: "entry" | "pressure" | "final";
  elapsed: number;
  remaining: number;
  progress: number;
  title: string;
  detail: string;
  intensity: number;
};

type OvertimeState = Pick<MatchState, "phase" | "time">;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function matchOvertimeVisual(
  state: OvertimeState,
): MatchOvertimeVisual | null {
  if (state.phase !== "overtime") return null;
  const time = Number.isFinite(state.time) ? state.time : MATCH_DURATION;
  const elapsed = Math.max(0, time - MATCH_DURATION);
  const remaining = Math.max(0, OVERTIME_DURATION - elapsed);
  const progress = clamp01(elapsed / OVERTIME_DURATION);
  const stage =
    elapsed < 2.5 ? "entry" : remaining <= 10 ? "final" : "pressure";

  if (stage === "entry")
    return {
      stage,
      elapsed,
      remaining,
      progress,
      title: "VERLÄNGERUNG",
      detail: "45 SEKUNDEN · CORE ODER SCHLUSSWERTUNG",
      intensity: 0.45,
    };

  if (stage === "final")
    return {
      stage,
      elapsed,
      remaining,
      progress,
      title: "LETZTER DRUCK",
      detail: `NOCH ${Math.ceil(remaining)} SEKUNDEN`,
      intensity: 0.9 + (1 - remaining / 10) * 0.1,
    };

  return {
    stage,
    elapsed,
    remaining,
    progress,
    title: "SUDDEN DEATH",
    detail: `NOCH ${Math.ceil(remaining)} SEKUNDEN · CORE ODER SCHLUSSWERTUNG`,
    intensity: 0.55 + progress * 0.3,
  };
}
