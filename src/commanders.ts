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
  shieldTime: number;
  rallyTime: number;
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
