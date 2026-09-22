import type { Effect } from "./engine";
import type { CommanderId } from "./commanders";

export type CommanderActivationKind = "shield" | "tempo" | "repair";

export type CommanderActivationVisual = {
  commander: CommanderId;
  kind: CommanderActivationKind;
  progress: number;
  alpha: number;
  radius: number;
  direction: -1 | 1;
  spokes: number;
};

type CommanderEffect = Pick<
  Effect,
  "type" | "team" | "life" | "maxLife" | "radius" | "sourceCardId"
>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function commanderActivationVisual(
  effect: CommanderEffect,
): CommanderActivationVisual | null {
  if (effect.type !== "commander") return null;
  const commander =
    effect.sourceCardId === "atlas" ||
    effect.sourceCardId === "nova" ||
    effect.sourceCardId === "lyra"
      ? effect.sourceCardId
      : null;
  if (!commander) return null;

  const maxLife =
    Number.isFinite(effect.maxLife) && effect.maxLife > 0
      ? effect.maxLife
      : 1;
  const life = Number.isFinite(effect.life)
    ? Math.max(0, Math.min(maxLife, effect.life))
    : maxLife;
  const progress = clamp01(1 - life / maxLife);
  const radius = Math.max(
    36,
    Math.min(
      140,
      Number.isFinite(effect.radius) ? effect.radius ?? 54 : 54,
    ),
  );

  return {
    commander,
    kind:
      commander === "atlas"
        ? "shield"
        : commander === "nova"
          ? "tempo"
          : "repair",
    progress,
    alpha: clamp01(life / maxLife),
    radius,
    direction: effect.team === "player" ? -1 : 1,
    spokes: commander === "nova" ? 8 : commander === "atlas" ? 6 : 4,
  };
}
