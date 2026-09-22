import { impactProfile, type ImpactKind } from "./combat-feedback";

export type WeaponFireFeedback = {
  kind: ImpactKind;
  strength: number;
  displacement: number;
  scale: number;
  widthScale: number;
  heightScale: number;
  muzzleLength: number;
  muzzleRadius: number;
  muzzleRays: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function weaponFireFeedback(
  sourceCardId: string | undefined,
  life: number,
  maxLife: number,
): WeaponFireFeedback {
  const profile = impactProfile(sourceCardId);
  const safeMaxLife =
    Number.isFinite(maxLife) && maxLife > 0 ? maxLife : 1;
  const safeLife = Number.isFinite(life)
    ? Math.max(0, Math.min(safeMaxLife, life))
    : 0;
  const strength = clamp01(safeLife / safeMaxLife);

  let displacement = -3.2;
  let scale = 1.03;
  let widthScale = 1.025;
  let heightScale = 0.988;
  let muzzleLength = 9;
  let muzzleRadius = 3.2;
  let muzzleRays = 4;

  switch (profile.kind) {
    case "precision":
      displacement = -2.1;
      scale = 1.018;
      widthScale = 1.014;
      heightScale = 0.994;
      muzzleLength = 10;
      muzzleRadius = 2.5;
      muzzleRays = 2;
      break;
    case "rail":
      displacement = -5.2;
      scale = 1.052;
      widthScale = 1.04;
      heightScale = 0.976;
      muzzleLength = 17;
      muzzleRadius = 4.5;
      muzzleRays = 6;
      break;
    case "explosive":
      displacement = -5.8;
      scale = 1.064;
      widthScale = 1.05;
      heightScale = 0.968;
      muzzleLength = 12;
      muzzleRadius = 5.4;
      muzzleRays = 8;
      break;
    case "electric":
      displacement = -2.8;
      scale = 1.034;
      widthScale = 1.026;
      heightScale = 0.986;
      muzzleLength = 12;
      muzzleRadius = 4;
      muzzleRays = 5;
      break;
    case "heavy":
      displacement = -5.4;
      scale = 1.058;
      widthScale = 1.046;
      heightScale = 0.972;
      muzzleLength = 11;
      muzzleRadius = 4.8;
      muzzleRays = 7;
      break;
    case "beam":
      displacement = -3.6;
      scale = 1.04;
      widthScale = 1.03;
      heightScale = 0.982;
      muzzleLength = 14;
      muzzleRadius = 3.6;
      muzzleRays = 4;
      break;
    case "melee":
      displacement = 2.8;
      scale = 1.026;
      widthScale = 1.038;
      heightScale = 0.982;
      muzzleLength = 0;
      muzzleRadius = 0;
      muzzleRays = 0;
      break;
    case "breach":
      displacement = 3.5;
      scale = 1.04;
      widthScale = 1.052;
      heightScale = 0.974;
      muzzleLength = 0;
      muzzleRadius = 0;
      muzzleRays = 0;
      break;
    case "pulse":
      displacement = -3.8;
      scale = 1.044;
      widthScale = 1.034;
      heightScale = 0.98;
      muzzleLength = 13;
      muzzleRadius = 4.2;
      muzzleRays = 6;
      break;
    default:
      break;
  }

  return {
    kind: profile.kind,
    strength,
    displacement: strength === 0 ? 0 : displacement * strength,
    scale: 1 + (scale - 1) * strength,
    widthScale: 1 + (widthScale - 1) * strength,
    heightScale: 1 + (heightScale - 1) * strength,
    muzzleLength: strength === 0 ? 0 : muzzleLength * strength,
    muzzleRadius: strength === 0 ? 0 : muzzleRadius * strength,
    muzzleRays,
  };
}
