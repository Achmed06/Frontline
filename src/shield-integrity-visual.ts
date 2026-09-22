import { COMMANDERS } from "./commanders";

export type ShieldIntegrityVisual = {
  active: boolean;
  integrity: number;
  timeRatio: number;
  release: number;
  alpha: number;
  shellRadius: number;
  innerRadius: number;
  plateCount: number;
  intactPlates: number;
  crackCount: number;
  gapScale: number;
  releaseRadius: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function shieldIntegrityVisual(
  shield: number,
  shieldTime: number,
): ShieldIntegrityVisual {
  const maxShield = COMMANDERS.atlas.shield;
  const maxTime = COMMANDERS.atlas.duration;
  const safeShield = Number.isFinite(shield)
    ? Math.max(0, Math.min(maxShield, shield))
    : 0;
  const safeTime = Number.isFinite(shieldTime)
    ? Math.max(0, Math.min(maxTime, shieldTime))
    : 0;

  const active = safeShield > 0.001 && safeTime > 0.001;
  if (!active)
    return {
      active: false,
      integrity: 0,
      timeRatio: 0,
      release: 1,
      alpha: 0,
      shellRadius: 0,
      innerRadius: 0,
      plateCount: 0,
      intactPlates: 0,
      crackCount: 0,
      gapScale: 0,
      releaseRadius: 0,
    };

  const integrity = clamp01(safeShield / maxShield);
  const timeRatio = clamp01(safeTime / maxTime);
  const release = clamp01(1 - Math.min(1, safeTime / 0.8));
  const plateCount = 12;
  const intactPlates = Math.max(1, Math.ceil(integrity * plateCount));
  const missingRatio = 1 - integrity;

  return {
    active: true,
    integrity,
    timeRatio,
    release,
    alpha:
      (0.46 + integrity * 0.34) *
      (1 - release * 0.5),
    shellRadius: 20 + integrity * 3,
    innerRadius: 15 + integrity * 2,
    plateCount,
    intactPlates,
    crackCount:
      missingRatio < 0.08
        ? 0
        : Math.min(5, 1 + Math.floor(missingRatio * 6)),
    gapScale: 0.08 + missingRatio * 0.24,
    releaseRadius: 24 + release * 7,
  };
}
