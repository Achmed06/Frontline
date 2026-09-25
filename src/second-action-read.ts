import type { CardDefinition, MatchState } from "./engine";

const lane = (x: number) => (x < 147.5 ? 0 : x < 272.5 ? 1 : 2);

const playerActionCount = (state: MatchState): number =>
  Object.values(state.stats.unitPlays).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  ) + state.stats.abilities;

export function secondActionHint(
  state: MatchState,
  card: CardDefinition | undefined,
): string | null {
  if (
    !card ||
    !Number.isFinite(state.time) ||
    state.time < 0 ||
    state.time > 28 ||
    playerActionCount(state) !== 1
  )
    return null;

  const allies = state.units.filter(
    (unit) => unit.team === "player" && unit.hp > 0,
  );
  const enemies = state.units.filter(
    (unit) => unit.team === "enemy" && unit.hp > 0,
  );
  const damagedAlly = allies.some((unit) => unit.hp < unit.maxHp - 1);
  const shieldedEnemy = enemies.some((unit) => unit.shield > 0);
  const enemyLaneCounts = [0, 0, 0];
  for (const unit of enemies) enemyLaneCounts[lane(unit.x)]++;
  const groupedEnemies = Math.max(...enemyLaneCounts) >= 2;

  if (card.kind === "ability") {
    if (card.id === "pulse")
      return enemies.length
        ? groupedEnemies
          ? "ZWEITER ZUG · KONTER · GRUPPE TREFFEN"
          : "ZWEITER ZUG · GEDULD · EINZELZIEL IST WENIG WERT"
        : "ZWEITER ZUG · GEDULD · NOCH KEIN ZIEL";
    if (card.id === "rally")
      return allies.length
        ? "ZWEITER ZUG · TEMPO · OPENER BESCHLEUNIGEN"
        : "ZWEITER ZUG · GEDULD · BRAUCHT EIGENE TRUPPEN";
    if (card.id === "stasis" || card.id === "repulsor")
      return enemies.length
        ? "ZWEITER ZUG · KONTROLLE · GEGNERISCHEN PUSH BRECHEN"
        : "ZWEITER ZUG · GEDULD · NOCH KEIN GEGNER";
    return null;
  }

  switch (card.id) {
    case "medic":
      return damagedAlly
        ? "ZWEITER ZUG · STABILISIEREN · VERLETZTE FRONT"
        : "ZWEITER ZUG · SUPPORT ZU FRÜH · NOCH KEIN HEILWERT";
    case "breaker":
      return shieldedEnemy
        ? "ZWEITER ZUG · KONTER · SCHILD BRECHEN"
        : "ZWEITER ZUG · FRONT · SCHILDBRUCH NOCH OHNE ZIEL";
    case "ranger":
      return allies.length
        ? "ZWEITER ZUG · DECKUNG · HINTER OPENER SETZEN"
        : "ZWEITER ZUG · DISTANZ · FRONT ZUERST AUFBAUEN";
    case "mortar":
      return groupedEnemies
        ? "ZWEITER ZUG · KONTER · GRUPPE UNTER FEUER"
        : "ZWEITER ZUG · FLÄCHENDRUCK · HINTER FRONT";
    case "bulwark":
    case "sentinel":
      return "ZWEITER ZUG · ABSICHERN · FEUER BINDEN";
    case "lancer":
      return "ZWEITER ZUG · CORE-DRUCK · NUR MIT FRONT";
    case "swarm":
    case "raider":
    case "pioneer":
    case "vanguard":
      return "ZWEITER ZUG · VERSTÄRKEN ODER SPLITTEN · LANE BEWUSST WÄHLEN";
    default:
      return null;
  }
}
