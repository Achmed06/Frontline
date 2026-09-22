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
  shield?: number;
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

export type CommanderUnitOutcome = {
  eligible: boolean;
  shieldGain: number;
  healing: number;
  cleanse: boolean;
  tempo: boolean;
};

export type CommanderOutcome = {
  affected: number;
  shieldGain: number;
  healing: number;
  cleanses: number;
  tempoUnits: number;
};

export function commanderUnitOutcome(
  commander: CommanderId,
  unit: CommanderUnitState,
  team: "player" | "enemy" = "player",
): CommanderUnitOutcome {
  if (unit.team !== team || unit.hp <= 0)
    return {
      eligible: false,
      shieldGain: 0,
      healing: 0,
      cleanse: false,
      tempo: false,
    };

  if (commander === "atlas")
    return {
      eligible: true,
      shieldGain: Math.max(
        0,
        COMMANDERS.atlas.shield - (unit.shield ?? 0),
      ),
      healing: 0,
      cleanse: false,
      tempo: false,
    };

  if (commander === "nova") {
    const tempo = unit.rallyTime < COMMANDERS.nova.duration;
    return {
      eligible: tempo,
      shieldGain: 0,
      healing: 0,
      cleanse: false,
      tempo,
    };
  }

  const healing = Math.max(
    0,
    Math.min(COMMANDERS.lyra.healing, unit.maxHp - unit.hp),
  );
  const cleanse = unit.slowTime > 0;
  return {
    eligible: healing > 0 || cleanse,
    shieldGain: 0,
    healing,
    cleanse,
    tempo: false,
  };
}

export function commanderOutcome(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): CommanderOutcome {
  const result: CommanderOutcome = {
    affected: 0,
    shieldGain: 0,
    healing: 0,
    cleanses: 0,
    tempoUnits: 0,
  };
  for (const unit of units) {
    const outcome = commanderUnitOutcome(commander, unit, team);
    if (!outcome.eligible) continue;
    result.affected++;
    result.shieldGain += outcome.shieldGain;
    result.healing += outcome.healing;
    if (outcome.cleanse) result.cleanses++;
    if (outcome.tempo) result.tempoUnits++;
  }
  return result;
}

export function commanderOutcomeText(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): string {
  const outcome = commanderOutcome(commander, units, team);
  if (outcome.affected === 0)
    return commanderUnavailableText(commander, units, team);
  if (commander === "atlas")
    return [
      `SCHILD ${outcome.affected}`,
      outcome.shieldGain ? `+${outcome.shieldGain}` : "REFRESH",
    ].join(" · ");
  if (commander === "nova")
    return `TEMPO ${outcome.tempoUnits} · ${COMMANDERS.nova.duration}s`;
  return [
    outcome.healing ? `+${outcome.healing} HP` : "",
    outcome.cleanses ? `CLEANSE ${outcome.cleanses}` : "",
  ].filter(Boolean).join(" · ");
}

export function commanderHasValidTarget(
  commander: CommanderId,
  units: readonly CommanderUnitState[],
  team: "player" | "enemy" = "player",
): boolean {
  return commanderOutcome(commander, units, team).affected > 0;
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
