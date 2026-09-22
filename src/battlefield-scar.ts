import { impactProfile, type ImpactKind } from "./combat-feedback";

export type BattlefieldScar = {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  duration: number;
  radius: number;
  sourceCardId?: string;
};

export type BattlefieldScarVisual = {
  kind: ImpactKind;
  alpha: number;
  radius: number;
  ringAlpha: number;
  debrisAlpha: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function battlefieldScarVisual(
  scar: BattlefieldScar,
  now: number,
): BattlefieldScarVisual | null {
  const duration =
    Number.isFinite(scar.duration) && scar.duration > 0 ? scar.duration : 1;
  const age = Number.isFinite(now)
    ? Math.max(0, now - scar.createdAt)
    : duration;
  if (age >= duration) return null;

  const progress = clamp01(age / duration);
  const profile = impactProfile(scar.sourceCardId);
  const baseRadius =
    Number.isFinite(scar.radius) && scar.radius > 0 ? scar.radius : 18;
  const radius = Math.max(
    8,
    Math.min(34, baseRadius * (0.72 + profile.scale * 0.36)),
  );
  const settle = clamp01(progress / 0.12);
  const fade =
    progress <= 0.72 ? 1 : clamp01((1 - progress) / 0.28);
  const alpha = settle * fade * (0.18 + profile.scale * 0.045);

  return {
    kind: profile.kind,
    alpha,
    radius,
    ringAlpha: alpha * (0.72 + profile.scale * 0.08),
    debrisAlpha: alpha * 0.72,
  };
}
