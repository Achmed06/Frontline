export type ImpactKind =
  | "precision"
  | "rail"
  | "explosive"
  | "electric"
  | "heavy"
  | "beam"
  | "breach"
  | "melee"
  | "pulse"
  | "generic";

export type ImpactProfile = {
  kind: ImpactKind;
  scale: number;
  rays: number;
  shards: number;
};

const MELEE = new Set([
  "vanguard",
  "bulwark",
  "swarm",
  "raider",
  "pioneer",
]);

export function impactProfile(sourceCardId?: string): ImpactProfile {
  if (MELEE.has(sourceCardId ?? ""))
    return { kind: "melee", scale: 0.88, rays: 5, shards: 7 };
  switch (sourceCardId) {
    case "ranger":
      return { kind: "precision", scale: 0.82, rays: 4, shards: 6 };
    case "lancer":
      return { kind: "rail", scale: 1.28, rays: 12, shards: 9 };
    case "mortar":
      return { kind: "explosive", scale: 1.48, rays: 10, shards: 14 };
    case "disruptor":
      return { kind: "electric", scale: 1.08, rays: 6, shards: 8 };
    case "sentinel":
      return { kind: "heavy", scale: 1.32, rays: 8, shards: 12 };
    case "core-turret":
      return { kind: "beam", scale: 1.16, rays: 8, shards: 6 };
    case "breaker":
      return { kind: "breach", scale: 1.18, rays: 8, shards: 10 };
    case "pulse":
      return { kind: "pulse", scale: 1.24, rays: 10, shards: 10 };
    default:
      return { kind: "generic", scale: 1, rays: 5, shards: 10 };
  }
}
