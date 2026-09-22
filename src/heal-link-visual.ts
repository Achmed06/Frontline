import type { Effect } from "./engine";

export type HealLinkPacket = {
  progress: number;
  offset: number;
  alpha: number;
};

export type HealLinkVisual = {
  progress: number;
  alpha: number;
  intensity: number;
  sourceRadius: number;
  targetRadius: number;
  packets: HealLinkPacket[];
};

type HealEffect = Pick<
  Effect,
  | "type"
  | "life"
  | "maxLife"
  | "value"
  | "targetX"
  | "targetY"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function healLinkVisual(effect: HealEffect): HealLinkVisual | null {
  if (
    effect.type !== "heal" ||
    !Number.isFinite(effect.targetX) ||
    !Number.isFinite(effect.targetY)
  )
    return null;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : 0;
  const progress = clamp01(1 - life / maxLife);
  const alpha = clamp01(life / maxLife);
  const value =
    Number.isFinite(effect.value) && (effect.value ?? 0) > 0
      ? effect.value ?? 0
      : 19;
  const intensity = clamp01(0.35 + Math.min(65, value) / 100);

  const packets = [0, 0.22, 0.44]
    .map((delay, index) => {
      const packetProgress = progress * 1.42 - delay;
      return {
        progress: clamp01(packetProgress),
        offset: index === 1 ? -1 : index === 2 ? 1 : 0,
        alpha:
          packetProgress > 0 && packetProgress < 1
            ? alpha * (0.72 + intensity * 0.28)
            : 0,
      };
    })
    .filter((packet) => packet.alpha > 0);

  return {
    progress,
    alpha,
    intensity,
    sourceRadius: 6 + intensity * 4,
    targetRadius: 9 + intensity * 5,
    packets,
  };
}
