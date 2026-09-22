import type { Effect } from "./engine";

export type ShieldImpactVisual = {
  mode: "absorb" | "break";
  alpha: number;
  progress: number;
  radius: number;
  nx: number;
  ny: number;
  directional: boolean;
  crackReach: number;
  fragmentReach: number;
};

type ShieldEffect = Pick<
  Effect,
  | "type"
  | "x"
  | "y"
  | "life"
  | "maxLife"
  | "radius"
  | "value"
  | "sourceX"
  | "sourceY"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function shieldImpactVisual(
  effect: ShieldEffect | undefined,
): ShieldImpactVisual | null {
  if (
    !effect ||
    (effect.type !== "shield-hit" && effect.type !== "shield-break")
  )
    return null;

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
      ? Math.max(12, Math.min(42, effect.radius ?? 22))
      : 22;
  const damage =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? Math.max(1, Math.min(100, effect.value ?? 1))
      : 1;

  let nx = 0;
  let ny = 0;
  let directional = false;
  if (
    Number.isFinite(effect.sourceX) &&
    Number.isFinite(effect.sourceY) &&
    Number.isFinite(effect.x) &&
    Number.isFinite(effect.y)
  ) {
    const dx = (effect.sourceX as number) - effect.x;
    const dy = (effect.sourceY as number) - effect.y;
    const distance = Math.hypot(dx, dy);
    if (Number.isFinite(distance) && distance > 0.001) {
      nx = dx / distance;
      ny = dy / distance;
      directional = true;
    }
  }

  const damageFactor = clamp01(damage / 70);
  const mode = effect.type === "shield-break" ? "break" : "absorb";

  return {
    mode,
    alpha,
    progress,
    radius,
    nx,
    ny,
    directional,
    crackReach:
      radius * (mode === "break" ? 0.72 + damageFactor * 0.18 : 0.38),
    fragmentReach:
      radius * (mode === "break" ? 0.5 + progress * 0.55 : 0.18),
  };
}
