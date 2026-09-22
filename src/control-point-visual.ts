import type {
  ControlPoint,
  ControlPointPressure,
  Team,
} from "./engine";

export type ControlPointVisual = {
  stage: "idle" | "held" | "capture" | "reverse" | "contested" | "decay";
  team: Team | null;
  progress: number;
  remaining: number;
  intensity: number;
  critical: boolean;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function controlPointVisual(
  point: Pick<ControlPoint, "owner" | "capture" | "captureTeam" | "supplied">,
  pressure: ControlPointPressure,
  objective: boolean,
): ControlPointVisual | null {
  if (!objective) return null;

  const progress = clamp01(
    Number.isFinite(point.capture) ? point.capture : 0,
  );
  const remaining =
    Number.isFinite(pressure.secondsRemaining) && pressure.secondsRemaining > 0
      ? pressure.secondsRemaining
      : 0;

  if (pressure.mode === "contested")
    return {
      stage: "contested",
      team: null,
      progress,
      remaining,
      intensity: 0.9,
      critical: false,
    };

  if (pressure.mode === "capture") {
    const critical = progress >= 0.75;
    return {
      stage: "capture",
      team: pressure.capturer ?? point.captureTeam,
      progress,
      remaining,
      intensity: Math.min(0.98, 0.58 + progress * 0.38),
      critical,
    };
  }

  if (pressure.mode === "reverse")
    return {
      stage: "reverse",
      team: pressure.capturer,
      progress,
      remaining,
      intensity: 0.72,
      critical: false,
    };

  if (pressure.mode === "decay")
    return {
      stage: "decay",
      team: point.captureTeam ?? point.owner,
      progress,
      remaining,
      intensity: 0.42 + progress * 0.18,
      critical: false,
    };

  if (point.owner && point.supplied)
    return {
      stage: "held",
      team: point.owner,
      progress,
      remaining,
      intensity: 0.34,
      critical: false,
    };

  return {
    stage: "idle",
    team: point.owner,
    progress,
    remaining,
    intensity: 0.28,
    critical: false,
  };
}
