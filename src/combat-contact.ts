import type { Effect } from "./engine";
import { impactProfile, type ImpactKind } from "./combat-feedback";

export const COMBAT_CONTACT_RESET_SECONDS = 3.4;

export type CombatContactCue = "contact" | "heavyContact";
export type CombatContactKind = "clash" | "ranged" | "heavy";

export type CombatContactVisual = {
  key: string;
  cue: CombatContactCue;
  kind: CombatContactKind;
  weaponKind: ImpactKind;
  strength: number;
  radius: number;
  rayCount: number;
  ringCount: number;
  cameraIntensity: number;
  alpha: number;
};

type ContactEffect = Pick<Effect, "type"> &
  Partial<
    Pick<
      Effect,
      | "sourceCardId"
      | "sourceUnitId"
      | "targetUnitId"
      | "radius"
      | "life"
      | "maxLife"
    >
  >;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function combatContactKey(
  effect: ContactEffect | undefined,
): string | null {
  if (
    !effect ||
    effect.type !== "impact" ||
    !Number.isSafeInteger(effect.sourceUnitId) ||
    !Number.isSafeInteger(effect.targetUnitId) ||
    (effect.sourceUnitId ?? 0) <= 0 ||
    (effect.targetUnitId ?? 0) <= 0 ||
    effect.sourceUnitId === effect.targetUnitId
  )
    return null;

  const low = Math.min(effect.sourceUnitId!, effect.targetUnitId!);
  const high = Math.max(effect.sourceUnitId!, effect.targetUnitId!);
  return `${low}:${high}`;
}

export function isFreshCombatContact(
  lastSeenAt: number | undefined,
  now: number,
): boolean {
  if (!Number.isFinite(now)) return false;
  return (
    !Number.isFinite(lastSeenAt) ||
    now - (lastSeenAt as number) >= COMBAT_CONTACT_RESET_SECONDS
  );
}

export function combatContactVisual(
  effect: ContactEffect | undefined,
): CombatContactVisual | null {
  const key = combatContactKey(effect);
  if (!key || !effect) return null;

  const profile = impactProfile(effect.sourceCardId);
  const rawMaxLife = effect.maxLife;
  const maxLife =
    typeof rawMaxLife === "number" &&
    Number.isFinite(rawMaxLife) &&
    rawMaxLife > 0
      ? rawMaxLife
      : 1;
  const rawLife = effect.life;
  const life =
    typeof rawLife === "number" && Number.isFinite(rawLife)
      ? Math.max(0, Math.min(maxLife, rawLife))
      : 0;
  const alpha = clamp01(life / maxLife);
  const radius =
    Number.isFinite(effect.radius) && (effect.radius ?? 0) > 0
      ? Math.max(7, Math.min(18, effect.radius ?? 9))
      : 9;
  const radiusWeight = clamp01((radius - 7) / 11);

  const heavyWeapon =
    profile.kind === "rail" ||
    profile.kind === "explosive" ||
    profile.kind === "heavy" ||
    profile.kind === "breach";
  const clash =
    profile.kind === "melee" ||
    profile.kind === "breach";

  const kind: CombatContactKind = heavyWeapon
    ? "heavy"
    : clash
      ? "clash"
      : "ranged";
  const strength = clamp01(
    (heavyWeapon ? 0.78 : clash ? 0.66 : 0.52) +
      radiusWeight * 0.18 +
      Math.max(0, profile.scale - 1) * 0.12,
  );

  return {
    key,
    cue: heavyWeapon ? "heavyContact" : "contact",
    kind,
    weaponKind: profile.kind,
    strength,
    radius:
      kind === "heavy"
        ? 17 + radius * 0.7
        : kind === "clash"
          ? 14 + radius * 0.58
          : 12 + radius * 0.5,
    rayCount:
      kind === "heavy"
        ? Math.max(8, profile.rays)
        : kind === "clash"
          ? Math.max(6, profile.rays)
          : Math.max(4, Math.min(7, profile.rays)),
    ringCount: kind === "heavy" ? 2 : 1,
    cameraIntensity:
      kind === "heavy"
        ? 0.00145 + radiusWeight * 0.00055
        : kind === "clash"
          ? 0.00105 + radiusWeight * 0.00032
          : 0.00072 + radiusWeight * 0.0002,
    alpha,
  };
}

export function strongestCombatContact(
  effects: readonly ContactEffect[],
): CombatContactVisual | null {
  let strongest: CombatContactVisual | null = null;
  for (const effect of effects) {
    const visual = combatContactVisual(effect);
    if (!visual) continue;
    if (!strongest || visual.strength > strongest.strength)
      strongest = visual;
  }
  return strongest;
}
