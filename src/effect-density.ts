import type { Effect } from "./engine";

export type EffectPriority = "critical" | "high" | "routine";

export type EffectPresentationBudget = {
  priority: EffectPriority;
  visible: boolean;
  alphaScale: number;
  cameraScale: number;
  density: "clear" | "busy" | "dense" | "saturated";
};

const CRITICAL = new Set<Effect["type"]>([
  "capture",
  "frontline",
  "commander",
  "core-hit",
  "pulse",
  "rally",
  "stasis",
  "stasis-hit",
  "repulsor",
  "repulsor-move",
  "breaker",
  "pioneer",
  "shield-break",
  "blast",
]);

const HIGH = new Set<Effect["type"]>([
  "death",
  "shield",
  "shield-hit",
  "heal",
  "spawn",
]);

export function effectPriority(
  effect: Pick<Effect, "type" | "radius">,
): EffectPriority {
  if (CRITICAL.has(effect.type)) return "critical";
  if (HIGH.has(effect.type)) return "high";
  if (effect.type === "impact" && (effect.radius ?? 0) >= 12) return "high";
  return "routine";
}

export function effectPresentationBudget(
  effect: Pick<Effect, "id" | "type" | "radius">,
  activeEffectCount: number,
): EffectPresentationBudget {
  const count = Number.isFinite(activeEffectCount)
    ? Math.max(0, Math.floor(activeEffectCount))
    : 0;
  const priority = effectPriority(effect);
  const density =
    count <= 18
      ? "clear"
      : count <= 32
        ? "busy"
        : count <= 48
          ? "dense"
          : "saturated";

  const cameraScale =
    density === "clear"
      ? 1
      : density === "busy"
        ? 0.84
        : density === "dense"
          ? 0.68
          : 0.54;

  if (priority === "critical")
    return {
      priority,
      visible: true,
      alphaScale: 1,
      cameraScale,
      density,
    };

  if (priority === "high")
    return {
      priority,
      visible: true,
      alphaScale:
        density === "clear"
          ? 1
          : density === "busy"
            ? 0.94
            : density === "dense"
              ? 0.88
              : 0.8,
      cameraScale,
      density,
    };

  if (density === "clear")
    return {
      priority,
      visible: true,
      alphaScale: 1,
      cameraScale,
      density,
    };

  if (density === "busy")
    return {
      priority,
      visible: true,
      alphaScale: 0.8,
      cameraScale,
      density,
    };

  const cadence = density === "dense" ? 2 : 3;
  const stableId = Number.isFinite(effect.id) ? Math.abs(Math.floor(effect.id)) : 0;
  return {
    priority,
    visible: stableId % cadence === 0,
    alphaScale: density === "dense" ? 0.68 : 0.56,
    cameraScale,
    density,
  };
}
