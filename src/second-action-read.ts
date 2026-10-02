import { abilityTargetPreview, type CardDefinition, type MatchState } from "./engine";

const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);

export const playerActionCount = (state: MatchState): number =>
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
    state.phase === "ended" ||
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
  const enemyClusterWithin = (radius: number) =>
    enemies.some((unit, index) =>
      enemies.some(
        (other, otherIndex) =>
          otherIndex !== index && distance(unit, other) <= radius,
      ),
    );

  if (card.kind === "ability") {
    if (card.id === "pulse") {
      const core = state.cores.enemy;
      if (abilityTargetPreview(state, "player", "pulse", core.x, core.y).coreLethal)
        return "ZWEITER ZUG · ABSCHLUSS · CORE ZERSTÖREN";

      if (enemies.some((unit) =>
        abilityTargetPreview(state, "player", "pulse", unit.x, unit.y)
          .lethalUnitIds.length > 0,
      ))
        return "ZWEITER ZUG · ABSCHLUSS · GEGNER AUSSCHALTEN";

      // An aimed blast can cover a pair from between them. Unit radius counts
      // toward Pulse reach, just as in the authoritative target preview.
      const group = enemies.some((unit, index) => enemies.slice(index + 1).some((other) => {
        const reach = (card.range ?? 0) + unit.radius;
        const otherReach = (card.range ?? 0) + other.radius;
        if (distance(unit, other) > reach + otherReach) return false;
        const share = reach / (reach + otherReach);
        const x = unit.x + (other.x - unit.x) * share;
        const y = unit.y + (other.y - unit.y) * share;
        return abilityTargetPreview(state, "player", "pulse", x, y).unitIds.length >= 2;
      }));
      return enemies.length
        ? group
          ? "ZWEITER ZUG · KONTER · GRUPPE TREFFEN"
          : "ZWEITER ZUG · ABWÄGEN · EINZELZIEL OHNE ABSCHLUSS"
        : "ZWEITER ZUG · GEDULD · NOCH KEIN TRUPPENZIEL";
    }
    if (card.id === "rally") {
      if (!allies.length)
        return "ZWEITER ZUG · GEDULD · BRAUCHT EIGENE TRUPPEN";
      const previews = allies.map((unit) =>
        abilityTargetPreview(state, "player", "rally", unit.x, unit.y),
      );
      if (previews.some((preview) => preview.healing.length > 0))
        return "ZWEITER ZUG · HEILUNG · VERLETZTE FRONT STÄRKEN";
      return previews.some((preview) => preview.tempoUnitIds.length > 0)
        ? "ZWEITER ZUG · TEMPO · OPENER VERSTÄRKEN"
        : "ZWEITER ZUG · GEDULD · KEIN ZUSÄTZLICHER EFFEKT";
    }
    if (card.id === "stasis") {
      if (!enemies.length)
        return "ZWEITER ZUG · GEDULD · NOCH KEIN GEGNER";
      return enemies.some((unit) =>
        abilityTargetPreview(state, "player", "stasis", unit.x, unit.y)
          .slows.some((slow) => slow.changed),
      )
        ? "ZWEITER ZUG · KONTROLLE · GEGNERISCHEN PUSH BRECHEN"
        : "ZWEITER ZUG · GEDULD · KEIN ZUSÄTZLICHER EFFEKT";
    }
    if (card.id === "repulsor")
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
      return enemyClusterWithin(card.splashRadius ?? 0)
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
