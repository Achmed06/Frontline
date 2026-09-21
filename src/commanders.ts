import {
  TEMPO_ATTACK_SPEED_MULTIPLIER,
  TEMPO_MOVE_SPEED_MULTIPLIER,
} from "./tempo";

/** New commander choices. Combat and bot use the same values. */
export const COMMANDERS = {
  nova: {
    name: "NOVA",
    ability: "STURMSIGNAL",
    icon: "ϟ",
    cooldown: 32,
    description:
      "Alle aktuell lebenden eigenen Truppen greifen 6 Sekunden lang 30 % schneller an und bewegen sich 25 % schneller. Keine Heilung; stapelt sich nicht mit Rally.",
    role: "TEMPO & ANGRIFF",
    duration: 6,
    moveSpeedMultiplier: TEMPO_MOVE_SPEED_MULTIPLIER,
    attackSpeedMultiplier: TEMPO_ATTACK_SPEED_MULTIPLIER,
  },
  atlas: {
    name: "ATLAS",
    ability: "AEGIS-SCHILD",
    icon: "◇",
    cooldown: 30,
    description:
      "70 Schild für alle eigenen Truppen, 6 Sekunden lang. Schütze deinen Vorstoß, bevor der Schaden eintrifft.",
    role: "SCHUTZ & VORSTOSS",
    shield: 70,
    duration: 6,
  },
  lyra: {
    name: "LYRA",
    ability: "REPARATURIMPULS",
    icon: "+",
    cooldown: 35,
    description:
      "Heilt alle eigenen Truppen um bis zu 80 HP und entfernt Verlangsamung. Rettet angeschlagene Verbände, repariert aber keinen Core.",
    role: "HEILUNG & BEFREIUNG",
    healing: 80,
  },
} as const;
export type CommanderId = keyof typeof COMMANDERS;
export type CommanderUnitState = {
  team: "player" | "enemy";
  hp: number;
  maxHp: number;
  shieldTime: number;
  rallyTime: number;
  slowTime: number;
};
export function isCommanderId(value: unknown): value is CommanderId {
  return value === "atlas" || value === "lyra" || value === "nova";
}
export function commanderActiveSeconds(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): number {
  if (commander === "lyra") return 0;
  let active = 0;
  for (const unit of units) {
    if (unit.team !== team || unit.hp <= 0) continue;
    active = Math.max(
      active,
      commander === "atlas" ? unit.shieldTime : unit.rallyTime,
    );
  }
  return active;
}

export function commanderHasValidTarget(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): boolean {
  return units.some((unit) => {
    if (unit.team !== team || unit.hp <= 0) return false;
    if (commander === "atlas") return true;
    if (commander === "nova")
      return unit.rallyTime < COMMANDERS.nova.duration;
    return unit.hp < unit.maxHp || unit.slowTime > 0;
  });
}

export function commanderUnavailableText(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): string {
  const living = units.filter((unit) => unit.team === team && unit.hp > 0);
  if (living.length === 0) return "TRUPP FEHLT";
  if (commander === "lyra") return "ALLE INTAKT";
  return "KEIN ZIEL";
}

export function commanderCooldownProgress(
  cooldown: number,
  totalCooldown: number,
): number {
  if (!Number.isFinite(cooldown) || !Number.isFinite(totalCooldown) || totalCooldown <= 0)
    return cooldown <= 0 ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - cooldown / totalCooldown));
}

export function commanderStatusText(
  commander: CommanderId,
  cooldown: number,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): string {
  const active = commanderActiveSeconds(commander, units, team);
  if (active > 0) return `AKTIV ${Math.ceil(active)}s`;
  if (cooldown > 0) return `${Math.ceil(cooldown)}s`;
  return commanderHasValidTarget(commander, units, team)
    ? "BEREIT"
    : commanderUnavailableText(commander, units, team);
}
