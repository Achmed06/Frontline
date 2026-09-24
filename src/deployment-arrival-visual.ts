import type { Effect } from "./engine";

export type DeploymentArrivalKind =
  | "heavy"
  | "siege"
  | "swarm"
  | "support"
  | "standard";

export type DeploymentArrivalVisual = {
  kind: DeploymentArrivalKind;
  progress: number;
  alpha: number;
  beamHeight: number;
  beamWidth: number;
  ringRadius: number;
  shockRadius: number;
  rayCount: number;
  spriteScale: number;
  yOffset: number;
  releaseBlend: number;
  launchStretch: number;
  landingPunch: number;
};

type SpawnEffect = Pick<
  Effect,
  "type" | "life" | "maxLife" | "radius" | "sourceCardId" | "x" | "y"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function kindFor(cardId?: string): DeploymentArrivalKind {
  switch (cardId) {
    case "bulwark":
    case "sentinel":
      return "heavy";
    case "lancer":
    case "mortar":
      return "siege";
    case "swarm":
      return "swarm";
    case "medic":
      return "support";
    default:
      return "standard";
  }
}

export function deploymentArrivalVisual(
  effect: SpawnEffect | undefined,
): DeploymentArrivalVisual | null {
  if (!effect || effect.type !== "spawn") return null;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const alpha = clamp01(life / maxLife);
  const progress = clamp01(1 - alpha);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(7, Math.min(16, effect.radius ?? 10))
      : 10;
  const kind = kindFor(effect.sourceCardId);
  const releaseRaw = clamp01((progress - 0.28) / 0.56);
  const releaseBlend =
    releaseRaw * releaseRaw * (3 - 2 * releaseRaw);
  const launchWave = Math.sin(releaseBlend * Math.PI);
  const landingPunch =
    kind === "heavy"
      ? Math.sin(Math.min(1, progress * 1.5) * Math.PI) * 0.95
      : kind === "siege"
        ? Math.sin(Math.min(1, progress * 1.65) * Math.PI) * 0.72
        : kind === "swarm"
          ? Math.sin(Math.min(1, progress * 2.1) * Math.PI) * 0.34
          : Math.sin(Math.min(1, progress * 1.8) * Math.PI) * 0.48;
  const launchStretch =
    kind === "heavy"
      ? 1 + launchWave * 0.025
      : kind === "siege"
        ? 1 + launchWave * 0.04
        : kind === "swarm"
          ? 1 + launchWave * 0.085
          : 1 + launchWave * 0.055;

  let beamHeight = 54;
  let beamWidth = 14;
  let ringRadius = 7 + 19 * progress;
  let shockRadius = 12 + 16 * progress;
  let rayCount = 4;
  let spriteScale = 0.72 + Math.min(1, progress * 1.5) * 0.28;
  let yOffset = -(1 - progress) * 8;

  if (kind === "heavy") {
    beamHeight = 42;
    beamWidth = 22 + radius * 0.2;
    ringRadius = 10 + 24 * progress;
    shockRadius = 18 + (14 + radius * 0.7) * progress;
    rayCount = 6;
    const settle = Math.sin(Math.min(1, progress * 1.15) * Math.PI);
    spriteScale =
      0.82 + Math.min(1, progress * 1.3) * 0.18 + settle * 0.045;
    yOffset = -(1 - progress) * 5 + settle * 1.8;
  } else if (kind === "siege") {
    beamHeight = 62;
    beamWidth = 10;
    ringRadius = 8 + 20 * progress;
    shockRadius = 14 + 18 * progress;
    rayCount = 4;
    spriteScale = 0.76 + Math.min(1, progress * 1.45) * 0.24;
    yOffset = -(1 - progress) * 10;
  } else if (kind === "swarm") {
    beamHeight = 38;
    beamWidth = 9;
    ringRadius = 6 + 14 * progress;
    shockRadius = 9 + 12 * progress;
    rayCount = 3;
    spriteScale = 0.66 + Math.min(1, progress * 1.9) * 0.34;
    yOffset = -(1 - progress) * 6;
  } else if (kind === "support") {
    beamHeight = 48;
    beamWidth = 16;
    ringRadius = 8 + 17 * progress;
    shockRadius = 12 + 13 * progress;
    rayCount = 4;
    spriteScale = 0.78 + Math.min(1, progress * 1.35) * 0.22;
    yOffset = -(1 - progress) * 7;
  }

  return {
    kind,
    progress,
    alpha,
    beamHeight,
    beamWidth,
    ringRadius,
    shockRadius,
    rayCount,
    spriteScale,
    yOffset,
    releaseBlend,
    launchStretch,
    landingPunch,
  };
}

export function deploymentPresentationPoint(
  effect: SpawnEffect | undefined,
  targetX: number,
  targetY: number,
  reducedMotion = false,
): { x: number; y: number } | null {
  const visual = deploymentArrivalVisual(effect);
  if (!visual || !effect) return null;
  const blend = reducedMotion ? 1 : visual.releaseBlend;
  return {
    x: effect.x + (targetX - effect.x) * blend,
    y: effect.y + (targetY - effect.y) * blend,
  };
}
