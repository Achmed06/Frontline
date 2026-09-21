import { COMMANDERS, isCommanderId, type CommanderId } from "./commanders";
import {
  TEMPO_ATTACK_SPEED_MULTIPLIER,
  TEMPO_MOVE_SPEED_MULTIPLIER,
} from "./tempo";
/** Deterministic, renderer-independent simulation for Project Frontline. */
export type Team = "player" | "enemy";
export type Difficulty = "rookie" | "standard" | "veteran";
export type CardId =
  | "vanguard"
  | "bulwark"
  | "ranger"
  | "swarm"
  | "lancer"
  | "medic"
  | "pulse"
  | "rally"
  | "raider"
  | "sentinel"
  | "mortar"
  | "disruptor"
  | "stasis"
  | "repulsor"
  | "breaker"
  | "pioneer";

export interface CardDefinition {
  id: CardId;
  name: string;
  role: string;
  description: string;
  cost: number;
  kind: "unit" | "ability";
  hp?: number;
  damage?: number;
  heal?: number;
  supportRange?: number;
  supportInterval?: number;
  followDistance?: number;
  rallyDuration?: number;
  moveSpeedMultiplier?: number;
  attackSpeedMultiplier?: number;
  range?: number;
  speed?: number;
  count?: number;
  interval?: number;
  radius?: number;
  splashRadius?: number;
  splashDamage?: number;
  slowDuration?: number;
  slowFactor?: number;
  pushDistance?: number;
  coreDamage?: number;
  coreRange?: number;
  coreDamageMultiplier?: number;
  shieldBreak?: number;
  captureMultiplier?: number;
}

export const BOARD_WIDTH = 420;
export const BOARD_HEIGHT = 560;
export const MATCH_DURATION = 180;
export const OVERTIME_DURATION = 45;
export const ENERGY_CAP = 10;
export const ENERGY_RATE = 0.72;
export const CAPTURE_RADIUS = 48;
export const CAPTURE_SECONDS = 4.2;
export const COMMANDER_COOLDOWN = COMMANDERS.atlas.cooldown;
export const CORE_HP = 2300;
export const CORE_TURRET_DAMAGE = 24;
export const CORE_TURRET_RANGE = 160;
export const CORE_TURRET_INTERVAL = 1;
const STEP = 1 / 30;
const COLUMN_X = [85, 210, 335];
const ROW_Y = [150, 280, 410];
const other = (team: Team): Team => (team === "player" ? "enemy" : "player");
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const CARDS: CardDefinition[] = [
  {
    id: "pioneer",
    name: "Pionier",
    role: "Gebiet sichern",
    description:
      "Sichert ungestörte Punkte 50 % schneller. Der Bonus gilt einmal pro Punkt; Gegner im Kreis stoppen die Eroberung. Schwach im direkten Kampf.",
    cost: 2,
    kind: "unit",
    hp: 85,
    damage: 8,
    range: 24,
    speed: 39,
    count: 1,
    interval: 1.2,
    radius: 9,
    captureMultiplier: 1.5,
  },
  {
    id: "breaker",
    name: "Breaker",
    role: "Schildbrecher",
    description:
      "Entfernt vor jedem Treffer bis zu 45 Schildpunkte, dann 18 Schaden. Nahkämpfer gegen ATLAS; braucht Schutz vor Fernkampf.",
    cost: 3,
    kind: "unit",
    hp: 160,
    damage: 18,
    range: 22,
    speed: 36,
    count: 1,
    interval: 1.1,
    radius: 10,
    shieldBreak: 45,
  },
  {
    id: "vanguard",
    name: "Vanguard",
    role: "Frontkämpfer",
    description: "Günstiger Allrounder. Erobert und hält Kontrollpunkte.",
    cost: 2,
    kind: "unit",
    hp: 125,
    damage: 16,
    range: 20,
    speed: 35,
    count: 1,
    interval: 1,
    radius: 10,
  },
  {
    id: "bulwark",
    name: "Bulwark",
    role: "Schwerer Tank",
    description: "Viel Panzerung. Bindet Feuer für dein Team.",
    cost: 4,
    kind: "unit",
    hp: 440,
    damage: 35,
    range: 22,
    speed: 24,
    count: 1,
    interval: 1.3,
    radius: 14,
  },
  {
    id: "ranger",
    name: "Ranger",
    role: "Fernkampf",
    description: "Präzises Dauerfeuer. Hinter Tanks besonders stark.",
    cost: 3,
    kind: "unit",
    hp: 115,
    damage: 26,
    range: 110,
    speed: 31,
    count: 1,
    interval: 0.95,
    radius: 9,
  },
  {
    id: "swarm",
    name: "Swarm",
    role: "3 schnelle Drohnen",
    description:
      "Drei schnelle Einheiten. Stark beim Erobern, anfällig für Pulse.",
    cost: 2,
    kind: "unit",
    hp: 38,
    damage: 7,
    range: 16,
    speed: 46,
    count: 3,
    interval: 0.8,
    radius: 7,
  },
  {
    id: "lancer",
    name: "Lancer",
    role: "Belagerung",
    description: "Langsame, schwere Schüsse. Verursacht Extraschaden am Kern.",
    cost: 4,
    kind: "unit",
    hp: 135,
    damage: 48,
    range: 135,
    speed: 26,
    count: 1,
    interval: 2.2,
    radius: 10,
    coreDamageMultiplier: 1.6,
  },
  {
    id: "medic",
    name: "Medic",
    role: "Unterstützung",
    description: "Heilt nahe Verbündete und folgt deiner Front.",
    cost: 3,
    kind: "unit",
    hp: 115,
    damage: 8,
    range: 70,
    speed: 32,
    count: 1,
    interval: 1.15,
    radius: 9,
    heal: 19,
    supportRange: 100,
    supportInterval: 1.1,
    followDistance: 65,
  },
  {
    id: "pulse",
    name: "Pulse",
    role: "Flächenschaden",
    description: "85 Schaden im Zielgebiet. Am gegnerischen Kern 45 Schaden.",
    cost: 4,
    kind: "ability",
    range: 82,
    damage: 85,
    coreDamage: 45,
    coreRange: 100,
  },
  {
    id: "rally",
    name: "Rally",
    role: "Heilung + Tempo",
    description:
      "Heilt 65 HP. 6 Sekunden lang +25 % Bewegung und +30 % Angriffstempo.",
    cost: 3,
    kind: "ability",
    range: 96,
    heal: 65,
    rallyDuration: 6,
    moveSpeedMultiplier: TEMPO_MOVE_SPEED_MULTIPLIER,
    attackSpeedMultiplier: TEMPO_ATTACK_SPEED_MULTIPLIER,
  },
  {
    id: "raider",
    name: "Raider",
    role: "Schneller Nahkampf",
    description:
      "Schnell und hoher Nahkampfschaden. Wenig Panzerung: braucht Deckung.",
    cost: 3,
    kind: "unit",
    hp: 85,
    damage: 30,
    range: 19,
    speed: 56,
    count: 1,
    interval: 0.8,
    radius: 9,
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "Gepanzerter Fernkampf",
    description:
      "Langsamer Fernkämpfer mit robuster Panzerung. Sichert den Vorstoß.",
    cost: 4,
    kind: "unit",
    hp: 245,
    damage: 22,
    range: 95,
    speed: 20,
    count: 1,
    interval: 1.1,
    radius: 12,
  },
  {
    id: "mortar",
    name: "Mortar",
    role: "Flächenbeschuss",
    description:
      "40 Schaden am Ziel, 28 an Gegnern im Umkreis. Stark gegen Gruppen, verwundbar im Nahkampf.",
    cost: 4,
    kind: "unit",
    hp: 105,
    damage: 40,
    range: 115,
    speed: 25,
    count: 1,
    interval: 1.8,
    radius: 10,
    splashRadius: 42,
    splashDamage: 28,
  },
  {
    id: "disruptor",
    name: "Disruptor",
    role: "Bewegung stören",
    description:
      "Treffer bremsen Gegner 2 Sekunden um 40 %. Wenig Schaden; braucht Unterstützung. Bremsen stapeln sich nicht.",
    cost: 3,
    kind: "unit",
    hp: 100,
    damage: 12,
    range: 100,
    speed: 30,
    count: 1,
    interval: 1.3,
    radius: 9,
    slowDuration: 2,
    slowFactor: 0.6,
  },
  {
    id: "stasis",
    name: "Stasis",
    role: "Gruppen bremsen",
    description:
      "Bremst getroffene Gegner 4 Sekunden um 40 %. Kein Schaden, keine Angriffssperre. Bremsen stapeln sich nicht.",
    cost: 2,
    kind: "ability",
    range: 78,
    slowDuration: 4,
    slowFactor: 0.6,
  },
  {
    id: "repulsor",
    name: "Repulsor",
    role: "Gegner verdrängen",
    description:
      "Stößt Gegner vom Zielpunkt weg. Kein Schaden. Zielt genau: Auch seitliches Wegstoßen ist möglich.",
    cost: 3,
    kind: "ability",
    range: 72,
    pushDistance: 55,
  },
];

/** Six distinct units plus two distinct tactics. Shared by engine, saves and deck editor. */
export const DEFAULT_DECK: readonly CardId[] = Object.freeze([
  "vanguard",
  "bulwark",
  "ranger",
  "swarm",
  "lancer",
  "medic",
  "pulse",
  "rally",
]);
export function isValidDeck(value: unknown): value is CardId[] {
  if (!Array.isArray(value) || value.length !== 8 || new Set(value).size !== 8)
    return false;
  const definitions = value.map((id) => CARDS.find((card) => card.id === id));
  return (
    definitions.every(Boolean) &&
    definitions.filter((card) => card?.kind === "unit").length === 6 &&
    definitions.filter((card) => card?.kind === "ability").length === 2
  );
}

export interface ControlPoint {
  id: number;
  x: number;
  y: number;
  owner: Team | null;
  /** Progress towards captureTeam, normalized to 0..1. */
  capture: number;
  captureTeam: Team | null;
  contested: boolean;
  supplied: boolean;
}

export interface Unit {
  id: number;
  cardId: string;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  shield: number;
  damage: number;
  range: number;
  speed: number;
  interval: number;
  attackCooldown: number;
  healCooldown: number;
  shieldTime: number;
  rallyTime: number;
  slowTime: number;
  slowFactor: number;
}

export interface Effect {
  id: number;
  type:
    | "spawn"
    | "impact"
    | "shot"
    | "capture"
    | "heal"
    | "death"
    | "pulse"
    | "rally"
    | "shield"
    | "core-hit"
    | "blast"
    | "stasis"
    | "repulsor"
    | "breaker"
    | "pioneer";
  x: number;
  y: number;
  team: Team;
  life: number;
  maxLife: number;
  radius?: number;
  targetX?: number;
  targetY?: number;
}

export type ControlObjective = {
  readonly pointIds: readonly number[];
  readonly requiredPoints: number;
  readonly seconds: number;
};
export const TRAINING_CONTROL: ControlObjective = Object.freeze({
  pointIds: Object.freeze([3, 4, 5]),
  requiredPoints: 2,
  seconds: 45,
});
export interface MatchState {
  controlTime: Record<Team, number>;
  time: number;
  phase: "playing" | "overtime" | "ended";
  winner: Team | "draw" | null;
  reason: string;
  energy: Record<Team, number>;
  cores: Record<Team, { x: number; y: number; hp: number; maxHp: number }>;
  points: ControlPoint[];
  units: Unit[];
  effects: Effect[];
  commanderCooldown: number;
  enemyCommanderCooldown: number;
  stats: {
    deployed: number;
    unitPlays: Partial<Record<CardId, number>>;
    captured: number;
    kills: number;
    abilities: number;
  };
}

/** The next turret target, shared by combat and the arena targeting indicator. */
export function coreTurretTarget(state: MatchState, team: Team): Unit | undefined {
  const core = state.cores[team];
  if (core.hp <= 0 || state.phase === "ended") return undefined;
  let target: Unit | undefined;
  let nearest = Infinity;
  for (const unit of state.units) {
    if (unit.team === team || unit.hp <= 0) continue;
    const d = distance(core, unit);
    if (d > CORE_TURRET_RANGE) continue;
    if (d < nearest || (d === nearest && (!target || unit.id < target.id))) {
      target = unit;
      nearest = d;
    }
  }
  return target;
}

export interface PlayResult {
  ok: boolean;
  message: string;
}

export type DeploymentPoint = {
  x: number;
  y: number;
  idealX: number;
  idealY: number;
  adjusted: boolean;
};

export type AbilityTargetMovement = {
  unitId: number;
  x: number;
  y: number;
  distance: number;
  clamped: boolean;
  changed: boolean;
};

export type AbilityTargetHealing = {
  unitId: number;
  amount: number;
};

export type AbilityTargetSlow = {
  unitId: number;
  slowTime: number;
  slowFactor: number;
  changed: boolean;
};

export type AbilityTargetDamage = {
  unitId: number;
  shieldDamage: number;
  hpDamage: number;
  remainingShield: number;
  remainingHp: number;
};

export type AbilityTargetPreview = {
  unitIds: number[];
  core: boolean;
  lethalUnitIds: number[];
  coreLethal: boolean;
  damage: AbilityTargetDamage[];
  healing: AbilityTargetHealing[];
  tempoUnitIds: number[];
  slows: AbilityTargetSlow[];
  movements: AbilityTargetMovement[];
};

export function abilityTargetPreview(
  state: MatchState,
  team: Team,
  cardId: CardId,
  x: number,
  y: number,
): AbilityTargetPreview {
  const card = CARDS.find((item) => item.id === cardId);
  if (
    !card ||
    card.kind !== "ability" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  )
    return {
      unitIds: [],
      core: false,
      lethalUnitIds: [],
      coreLethal: false,
      damage: [],
      healing: [],
      tempoUnitIds: [],
      slows: [],
      movements: [],
    };

  const targets =
    card.id === "rally"
      ? state.units.filter(
          (unit) =>
            unit.team === team &&
            unit.hp > 0 &&
            distance(unit, { x, y }) <= (card.range ?? 96),
        )
      : card.id === "pulse" ||
          card.id === "stasis" ||
          card.id === "repulsor"
        ? state.units.filter(
            (unit) =>
              unit.team !== team &&
              unit.hp > 0 &&
              distance(unit, { x, y }) <= (card.range ?? 0) + unit.radius,
          )
        : [];
  const movements =
    card.id === "repulsor"
      ? targets.map((unit) => {
          const d = distance(unit, { x, y });
          const dx = d > 0.001 ? (unit.x - x) / d : 0;
          const dy = d > 0.001 ? (unit.y - y) / d : team === "player" ? -1 : 1;
          const requestedX = unit.x + dx * (card.pushDistance ?? 0);
          const requestedY = unit.y + dy * (card.pushDistance ?? 0);
          const landingX = clamp(requestedX, 15, BOARD_WIDTH - 15);
          const landingY = clamp(requestedY, 62, BOARD_HEIGHT - 62);
          const moved = Math.hypot(landingX - unit.x, landingY - unit.y);
          return {
            unitId: unit.id,
            x: landingX,
            y: landingY,
            distance: moved,
            clamped:
              Math.abs(landingX - requestedX) > 1e-8 ||
              Math.abs(landingY - requestedY) > 1e-8,
            changed: moved > 1e-8,
          };
        })
      : [];

  const core =
    card.id === "pulse" &&
    distance(state.cores[other(team)], { x, y }) <= (card.coreRange ?? 0);
  const damage =
    card.id === "pulse"
      ? targets.map((unit) => {
          const amount = Math.max(0, card.damage ?? 0);
          const shieldDamage = Math.min(unit.shield, amount);
          const hpDamage = Math.min(
            unit.hp,
            Math.max(0, amount - shieldDamage),
          );
          return {
            unitId: unit.id,
            shieldDamage,
            hpDamage,
            remainingShield: unit.shield - shieldDamage,
            remainingHp: Math.max(0, unit.hp - hpDamage),
          };
        })
      : [];
  const lethalUnitIds = damage
    .filter((result) => result.remainingHp <= 0)
    .map((result) => result.unitId);
  const coreLethal =
    core &&
    state.cores[other(team)].hp <= (card.coreDamage ?? 0);
  const healing =
    card.id === "rally"
      ? targets
          .map((unit) => ({
            unitId: unit.id,
            amount: Math.max(
              0,
              Math.min(unit.maxHp - unit.hp, card.heal ?? 0),
            ),
          }))
          .filter((result) => result.amount > 0)
      : [];
  const tempoUnitIds =
    card.id === "rally"
      ? targets
          .filter((unit) => unit.rallyTime < (card.rallyDuration ?? 0))
          .map((unit) => unit.id)
      : [];
  const slows =
    card.id === "stasis"
      ? targets.map((unit) => {
          const slowTime = Math.max(
            unit.slowTime,
            card.slowDuration ?? unit.slowTime,
          );
          const slowFactor = Math.min(
            unit.slowFactor,
            card.slowFactor ?? unit.slowFactor,
          );
          return {
            unitId: unit.id,
            slowTime,
            slowFactor,
            changed:
              slowTime > unit.slowTime + 1e-8 ||
              slowFactor < unit.slowFactor - 1e-8,
          };
        })
      : [];

  return {
    unitIds: targets.map((unit) => unit.id),
    core,
    lethalUnitIds,
    coreLethal,
    damage,
    healing,
    tempoUnitIds,
    slows,
    movements,
  };
}

export class Match {
  readonly state: MatchState;
  readonly difficulty: Difficulty;
  readonly botEnabled: boolean;
  readonly commanders: Readonly<Record<Team, CommanderId>>;
  readonly controlObjective: ControlObjective | null;
  readonly decks: Readonly<Record<Team, readonly CardId[]>>;
  private rngState: number;
  private nextId = 1;
  private ticks = 0;
  private accumulator = 0;
  private nextBotAction = 4;
  private nextBotCommander = 17;
  private coreCooldown: Record<Team, number> = { player: 0, enemy: 0 };

  constructor(
    options: {
      playerCommander?: CommanderId;
      enemyCommander?: CommanderId;
      controlObjective?: ControlObjective;
      seed?: number;
      difficulty?: Difficulty;
      botEnabled?: boolean;
      playerDeck?: readonly CardId[];
      enemyDeck?: readonly CardId[];
      startingOwners?: readonly (Team | null)[];
    } = {},
  ) {
    const playerCommander = options.playerCommander ?? "atlas";
    const enemyCommander = options.enemyCommander ?? playerCommander;
    if (!isCommanderId(playerCommander) || !isCommanderId(enemyCommander))
      throw new Error("Ungültiger Kommandant.");
    this.commanders = Object.freeze({
      player: playerCommander,
      enemy: enemyCommander,
    });
    const objective = options.controlObjective;
    if (
      objective &&
      (!Array.isArray(objective.pointIds) ||
        !objective.pointIds.length ||
        new Set(objective.pointIds).size !== objective.pointIds.length ||
        !Array.from(objective.pointIds).every(
          (id) => Number.isInteger(id) && id >= 0 && id < 9,
        ) ||
        !Number.isInteger(objective.requiredPoints) ||
        objective.requiredPoints < 1 ||
        objective.requiredPoints > objective.pointIds.length ||
        !Number.isFinite(objective.seconds) ||
        objective.seconds <= 0 ||
        objective.seconds > MATCH_DURATION)
    )
      throw new Error("Ungültiges Kontrollziel.");
    this.controlObjective = objective
      ? Object.freeze({
          ...objective,
          pointIds: Object.freeze([...objective.pointIds]),
        })
      : null;
    const owners = options.startingOwners;
    if (
      owners &&
      (owners.length !== 9 ||
        !Array.from(owners).every(
          (owner) => owner === null || owner === "player" || owner === "enemy",
        ))
    )
      throw new Error("Eine Startfront braucht neun gültige Punktbesitzer.");
    const playerDeck = options.playerDeck ?? DEFAULT_DECK;
    const enemyDeck = options.enemyDeck ?? playerDeck;
    if (!isValidDeck(playerDeck) || !isValidDeck(enemyDeck)) {
      throw new Error(
        "Ein Deck braucht sechs verschiedene Einheiten und zwei Fähigkeiten.",
      );
    }
    this.decks = Object.freeze({
      player: Object.freeze([...playerDeck]),
      enemy: Object.freeze([...enemyDeck]),
    });
    this.rngState = (options.seed ?? 2026) >>> 0;
    this.difficulty = options.difficulty ?? "standard";
    this.botEnabled = options.botEnabled ?? true;
    this.state = {
      controlTime: { player: 0, enemy: 0 },
      time: 0,
      phase: "playing",
      winner: null,
      reason: "",
      energy: { player: 6, enemy: 6 },
      cores: {
        player: { x: 210, y: 525, hp: CORE_HP, maxHp: CORE_HP },
        enemy: { x: 210, y: 35, hp: CORE_HP, maxHp: CORE_HP },
      },
      points: ROW_Y.flatMap((y, row) =>
        COLUMN_X.map((x, column) => ({
          id: row * 3 + column,
          x,
          y,
          owner: owners
            ? owners[row * 3 + column]
            : row === 0
              ? ("enemy" as const)
              : row === 2
                ? ("player" as const)
                : null,
          capture: 0,
          captureTeam: null,
          contested: false,
          supplied: row !== 1,
        })),
      ),
      units: [],
      effects: [],
      commanderCooldown: 0,
      enemyCommanderCooldown: 0,
      stats: {
        unitPlays: {},
        deployed: 0,
        captured: 0,
        kills: 0,
        abilities: 0,
      },
    };
    for (const point of this.state.points)
      point.supplied =
        point.owner !== null &&
        (point.owner === "player"
          ? point.y >= this.frontline("player", point.x)
          : point.y <= this.frontline("enemy", point.x));
  }

  /** Front edge of the connected deployment territory at this x coordinate. */
  frontline(team: Team, x: number): number {
    const column = x < 147.5 ? 0 : x < 272.5 ? 1 : 2;
    const rows = team === "player" ? [2, 1, 0] : [0, 1, 2];
    let edge = team === "player" ? 475 : 85;
    for (const row of rows) {
      const point = this.state.points[row * 3 + column];
      if (point.owner !== team) break;
      edge = point.y + (team === "player" ? -60 : 60);
    }
    return edge;
  }

  canDeploy(team: Team, x: number, y: number): boolean {
    if (
      this.state.phase === "ended" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return false;
    if (x < 18 || x > BOARD_WIDTH - 18 || y < 65 || y > BOARD_HEIGHT - 65)
      return false;
    return team === "player"
      ? y >= this.frontline(team, x)
      : y <= this.frontline(team, x);
  }

  /** Exact unit insertion points shared by renderer guidance and committed deployment. */
  deploymentPreview(
    team: Team,
    cardId: CardId,
    x: number,
    y: number,
  ): DeploymentPoint[] {
    const card = CARDS.find((item) => item.id === cardId);
    if (
      !card ||
      card.kind !== "unit" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return [];
    const count = card.count ?? 1;
    return Array.from({ length: count }, (_, i) => {
      const idealX = x + (count > 1 ? (i - (count - 1) / 2) * 17 : 0);
      const idealY = y;
      const spawnX = clamp(idealX, 18, BOARD_WIDTH - 18);
      const front = this.frontline(team, spawnX);
      const spawnY =
        team === "player" ? Math.max(idealY, front) : Math.min(idealY, front);
      return {
        x: spawnX,
        y: spawnY,
        idealX,
        idealY,
        adjusted:
          Math.abs(spawnX - idealX) > 1e-8 ||
          Math.abs(spawnY - idealY) > 1e-8,
      };
    });
  }

  /** Read-only check shared by aiming feedback and the committed action. */
  validatePlay(team: Team, cardId: string, x: number, y: number): PlayResult {
    if (this.state.phase === "ended")
      return { ok: false, message: "Das Match ist beendet." };
    const card = CARDS.find((item) => item.id === cardId);
    if (!card) return { ok: false, message: "Unbekannte Karte." };
    if (!this.decks[team].includes(card.id))
      return {
        ok: false,
        message: "Diese Karte ist nicht in deinem Einsatzdeck.",
      };
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > BOARD_WIDTH ||
      y < 0 ||
      y > BOARD_HEIGHT
    ) {
      return { ok: false, message: "Wähle ein Ziel auf dem Spielfeld." };
    }
    if (this.state.energy[team] + 1e-8 < card.cost)
      return { ok: false, message: "Zu wenig Energie." };
    if (card.kind === "unit" && !this.canDeploy(team, x, y)) {
      return {
        ok: false,
        message: "Setze Einheiten in deinem versorgten Gebiet ein.",
      };
    }
    const targetPreview =
      card.kind === "ability"
        ? abilityTargetPreview(this.state, team, card.id, x, y)
        : null;
    if (card.id === "rally" && !targetPreview?.unitIds.length) {
      return {
        ok: false,
        message: "Rally braucht eigene Einheiten im Zielgebiet.",
      };
    }
    if (
      (card.id === "stasis" || card.id === "repulsor") &&
      !targetPreview?.unitIds.length
    ) {
      return {
        ok: false,
        message: `${card.name} braucht Gegner im Zielgebiet.`,
      };
    }
    return { ok: true, message: "" };
  }

  play(team: Team, cardId: string, x: number, y: number): PlayResult {
    const validation = this.validatePlay(team, cardId, x, y);
    if (!validation.ok) return validation;
    const card = CARDS.find((item) => item.id === cardId)!;
    const targetPreview =
      card.kind === "ability"
        ? abilityTargetPreview(this.state, team, card.id, x, y)
        : null;
    const deployment =
      card.kind === "unit"
        ? this.deploymentPreview(team, card.id, x, y)
        : [];
    const targetIds = new Set(targetPreview?.unitIds ?? []);
    const targetHealing = new Map(
      (targetPreview?.healing ?? []).map(
        (healing) => [healing.unitId, healing.amount] as const,
      ),
    );
    const tempoUnitIds = new Set(targetPreview?.tempoUnitIds ?? []);
    const targetSlows = new Map(
      (targetPreview?.slows ?? []).map(
        (slow) => [slow.unitId, slow] as const,
      ),
    );
    const targetMovements = new Map(
      (targetPreview?.movements ?? []).map(
        (movement) => [movement.unitId, movement] as const,
      ),
    );
    this.state.energy[team] = Math.max(0, this.state.energy[team] - card.cost);
    if (card.kind === "unit") {
      for (const point of deployment) {
        const unit: Unit = {
          id: this.nextId++,
          cardId: card.id,
          team,
          x: point.x,
          y: point.y,
          hp: card.hp!,
          maxHp: card.hp!,
          damage: card.damage!,
          range: card.range!,
          speed: card.speed!,
          radius: card.radius!,
          interval: card.interval!,
          shield: 0,
          attackCooldown: 0.25,
          healCooldown: 0.5,
          shieldTime: 0,
          rallyTime: 0,
          slowTime: 0,
          slowFactor: 1,
        };
        this.state.units.push(unit);
        this.effect("spawn", unit.x, unit.y, team, 0.65);
      }
      if (team === "player") {
        this.state.stats.deployed += deployment.length;
        this.state.stats.unitPlays[card.id] =
          (this.state.stats.unitPlays[card.id] ?? 0) + 1;
      }
    } else if (card.id === "pulse") {
      this.effect("pulse", x, y, team, 0.75);
      for (const unit of this.state.units) {
        if (targetIds.has(unit.id))
          this.damageUnit(unit, card.damage ?? 0, team);
      }
      const core = this.state.cores[other(team)];
      if (targetPreview?.core) {
        core.hp = Math.max(0, core.hp - (card.coreDamage ?? 0));
        this.effect("core-hit", core.x, core.y, team, 0.5);
      }
      if (team === "player") this.state.stats.abilities++;
      this.removeDead();
      this.checkCoreEnd();
    } else if (card.id === "rally") {
      this.effect("rally", x, y, team, 0.8);
      for (const unit of this.state.units) {
        if (!targetIds.has(unit.id)) continue;
        const healing = targetHealing.get(unit.id) ?? 0;
        if (healing > 0) {
          unit.hp = Math.min(unit.maxHp, unit.hp + healing);
          this.effect("heal", unit.x, unit.y, team, 0.65);
        }
        if (tempoUnitIds.has(unit.id))
          unit.rallyTime = Math.max(
            unit.rallyTime,
            card.rallyDuration ?? unit.rallyTime,
          );
      }
      if (team === "player") this.state.stats.abilities++;
    }
    if (card.id === "stasis" || card.id === "repulsor") {
      this.effect(card.id, x, y, team, 0.7, undefined, card.range);
      for (const unit of this.state.units) {
        if (!targetIds.has(unit.id)) continue;
        if (card.id === "stasis") {
          const slow = targetSlows.get(unit.id);
          if (!slow) continue;
          unit.slowTime = slow.slowTime;
          unit.slowFactor = slow.slowFactor;
        } else {
          const movement = targetMovements.get(unit.id);
          if (!movement) continue;
          unit.x = movement.x;
          unit.y = movement.y;
        }
      }
      if (team === "player") this.state.stats.abilities++;
    }
    return { ok: true, message: `${card.name} eingesetzt.` };
  }

  activateCommander(team: Team = "player"): PlayResult {
    const commander = COMMANDERS[this.commanders[team]];
    const cooldownKey =
      team === "player" ? "commanderCooldown" : "enemyCommanderCooldown";
    if (this.state.phase === "ended")
      return { ok: false, message: "Das Match ist beendet." };
    if (this.state[cooldownKey] > 0)
      return {
        ok: false,
        message: `${commander.name} lädt: ${Math.ceil(this.state[cooldownKey])} s.`,
      };
    if (!this.applyCommander(team))
      return {
        ok: false,
        message:
          this.commanders[team] === "lyra"
            ? "LYRA braucht verletzte oder verlangsamte eigene Truppen."
            : this.commanders[team] === "nova"
              ? "NOVA braucht eigene Truppen ohne vollen Angriffsschub."
              : "Setze zuerst Einheiten ein.",
      };
    this.state[cooldownKey] = commander.cooldown;
    if (team === "player") this.state.stats.abilities++;
    return {
      ok: true,
      message: `${commander.name}: ${commander.ability} aktiviert.`,
    };
  }

  private applyCommander(team: Team): boolean {
    if (this.commanders[team] === "nova") {
      let affected = false;
      for (const unit of this.state.units) {
        if (
          unit.team !== team ||
          unit.hp <= 0 ||
          unit.rallyTime >= COMMANDERS.nova.duration
        )
          continue;
        unit.rallyTime = COMMANDERS.nova.duration;
        this.effect("rally", unit.x, unit.y, team, 0.7, undefined, 30);
        affected = true;
      }
      return affected;
    }
    if (this.commanders[team] === "atlas") {
      if (!this.state.units.some((unit) => unit.team === team && unit.hp > 0))
        return false;
      this.shieldTeam(team);
      return true;
    }
    let affected = false;
    for (const unit of this.state.units) {
      if (
        unit.team !== team ||
        unit.hp <= 0 ||
        (unit.hp >= unit.maxHp && unit.slowTime <= 0)
      )
        continue;
      unit.hp = Math.min(unit.maxHp, unit.hp + COMMANDERS.lyra.healing);
      unit.slowTime = 0;
      unit.slowFactor = 1;
      this.effect("heal", unit.x, unit.y, team, 0.9, undefined, 30);
      affected = true;
    }
    return affected;
  }

  /** Only this method advances time. UI pause and hidden-tab pause require no timers. */
  update(dtSeconds: number): void {
    if (
      !Number.isFinite(dtSeconds) ||
      dtSeconds <= 0 ||
      this.state.phase === "ended"
    )
      return;
    this.accumulator += dtSeconds;
    while (this.accumulator + 1e-9 >= STEP && !this.hasEnded()) {
      this.accumulator -= STEP;
      this.step();
    }
  }

  private step(): void {
    this.ticks++;
    this.state.time = this.ticks / 30;
    for (const team of ["player", "enemy"] as const)
      this.state.energy[team] = Math.min(
        ENERGY_CAP,
        this.state.energy[team] + ENERGY_RATE * STEP,
      );
    this.state.commanderCooldown = Math.max(
      0,
      this.state.commanderCooldown - STEP,
    );
    this.state.enemyCommanderCooldown = Math.max(
      0,
      this.state.enemyCommanderCooldown - STEP,
    );
    this.state.effects = this.state.effects.filter(
      (effect) => (effect.life -= STEP) > 0,
    );
    if (this.botEnabled && this.state.time >= this.nextBotAction) this.runBot();
    if (this.hasEnded()) return;
    this.updateUnits();
    this.updateTurrets();
    this.removeDead();
    this.updatePoints();
    this.checkCoreEnd();
    if (this.hasEnded()) return;
    this.updateControl();
    if (this.hasEnded()) return;
    if (this.controlObjective && this.state.time >= MATCH_DURATION) {
      this.finishByScore();
      return;
    }
    if (this.state.time >= MATCH_DURATION + OVERTIME_DURATION)
      this.finishByScore();
    else if (
      this.state.time >= MATCH_DURATION &&
      this.state.phase === "playing"
    ) {
      const equalHealth =
        this.state.cores.player.hp === this.state.cores.enemy.hp;
      const pointBalance = this.state.points.reduce(
        (sum, point) =>
          sum +
          (point.owner === "player" ? 1 : point.owner === "enemy" ? -1 : 0),
        0,
      );
      if (equalHealth && pointBalance === 0) this.state.phase = "overtime";
      else this.finishByScore();
    }
  }

  private updateControl(): void {
    const objective = this.controlObjective;
    if (!objective) return;
    for (const team of ["player", "enemy"] as const) {
      let held = 0;
      for (const id of objective.pointIds) {
        const point = this.state.points[id];
        if (point.owner === team && point.supplied && !point.contested) held++;
      }
      if (held >= objective.requiredPoints)
        this.state.controlTime[team] = Math.min(
          objective.seconds,
          this.state.controlTime[team] + STEP,
        );
    }
    const player = this.state.controlTime.player + 1e-8 >= objective.seconds;
    const enemy = this.state.controlTime.enemy + 1e-8 >= objective.seconds;
    if (player || enemy) {
      this.state.phase = "ended";
      this.state.winner =
        player && enemy ? "draw" : player ? "player" : "enemy";
      this.state.reason =
        player && enemy
          ? "Beide Kontrollziele gleichzeitig erreicht."
          : "Kontrollziel erreicht.";
    }
  }

  private hasEnded(): boolean {
    return this.state.phase === "ended";
  }

  private random(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let value = this.rngState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private effect(
    type: Effect["type"],
    x: number,
    y: number,
    team: Team,
    duration: number,
    target?: { x: number; y: number },
    radius?: number,
  ): void {
    this.state.effects.push({
      id: this.nextId++,
      type,
      x,
      y,
      team,
      life: duration,
      maxLife: duration,
      radius,
      ...(target ? { targetX: target.x, targetY: target.y } : {}),
    });
  }

  private damageUnit(unit: Unit, amount: number, source: Team): void {
    if (unit.hp <= 0) return;
    const shieldDamage = Math.min(unit.shield, amount);
    const hpDamage = Math.min(unit.hp, Math.max(0, amount - shieldDamage));
    unit.shield -= shieldDamage;
    unit.hp = Math.max(0, unit.hp - hpDamage);
    const applied = shieldDamage + hpDamage;
    if (applied > 0)
      this.effect(
        "impact",
        unit.x,
        unit.y,
        source,
        0.24,
        undefined,
        clamp(6 + applied * 0.15, 7, 18),
      );
    if (unit.hp <= 0) {
      this.effect("death", unit.x, unit.y, unit.team, 0.55);
      if (source === "player") this.state.stats.kills++;
    }
  }

  private removeDead(): void {
    this.state.units = this.state.units.filter((unit) => unit.hp > 0);
  }

  private shieldTeam(team: Team): void {
    for (const unit of this.state.units) {
      if (unit.team !== team || unit.hp <= 0) continue;
      unit.shield = Math.max(unit.shield, COMMANDERS.atlas.shield);
      unit.shieldTime = COMMANDERS.atlas.duration;
      this.effect("shield", unit.x, unit.y, team, 0.7);
    }
  }

  private updateUnits(): void {
    // All attacks are collected before resolution, so team/order does not grant the first shot.
    const attacks: Array<{
      unit: Unit;
      target: Unit | MatchState["cores"][Team];
      amount: number;
      core: boolean;
    }> = [];
    for (const unit of this.state.units) {
      if (unit.hp <= 0) continue;
      unit.attackCooldown = Math.max(
        0,
        unit.attackCooldown -
          STEP * (unit.rallyTime > 0 ? TEMPO_ATTACK_SPEED_MULTIPLIER : 1),
      );
      unit.slowTime = Math.max(0, unit.slowTime - STEP);
      if (unit.slowTime === 0) unit.slowFactor = 1;
      unit.healCooldown -= STEP;
      unit.rallyTime = Math.max(0, unit.rallyTime - STEP);
      unit.shieldTime = Math.max(0, unit.shieldTime - STEP);
      if (unit.shieldTime === 0) unit.shield = 0;
      if (unit.cardId === "medic" && unit.healCooldown <= 0) {
        const card = CARDS.find((item) => item.id === unit.cardId)!;
        const patient = this.state.units
          .filter(
            (ally) =>
              ally.team === unit.team &&
              ally.id !== unit.id &&
              ally.hp > 0 &&
              ally.hp < ally.maxHp &&
              distance(unit, ally) < (card.supportRange ?? 0),
          )
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)[0];
        if (patient) {
          patient.hp = Math.min(
            patient.maxHp,
            patient.hp + (card.heal ?? 0),
          );
          this.effect("heal", unit.x, unit.y, unit.team, 0.45, patient);
          unit.healCooldown = card.supportInterval ?? unit.interval;
        }
      }
      let target: Unit | undefined;
      let targetDistance = Infinity;
      for (const candidate of this.state.units) {
        if (candidate.team === unit.team || candidate.hp <= 0) continue;
        const d = distance(unit, candidate);
        if (d < targetDistance && d <= Math.max(155, unit.range + 36)) {
          target = candidate;
          targetDistance = d;
        }
      }
      const enemyCore = this.state.cores[other(unit.team)];
      if (target) {
        if (targetDistance <= unit.range + unit.radius + target.radius) {
          if (unit.attackCooldown <= 0) {
            attacks.push({ unit, target, amount: unit.damage, core: false });
            unit.attackCooldown = unit.interval;
          }
        } else
          this.move(unit, target, unit.range + unit.radius + target.radius - 3);
      } else if (distance(unit, enemyCore) <= unit.range + unit.radius + 21) {
        if (unit.attackCooldown <= 0) {
          attacks.push({
            unit,
            target: enemyCore,
            amount:
              unit.damage *
              (CARDS.find((card) => card.id === unit.cardId)
                ?.coreDamageMultiplier ?? 1),
            core: true,
          });
          unit.attackCooldown = unit.interval;
        }
      } else {
        const objective = this.objective(unit);
        this.move(
          unit,
          objective,
          objective === enemyCore ? unit.range + 18 : 15,
        );
      }
    }
    for (const attack of attacks) {
      const card = CARDS.find((card) => card.id === attack.unit.cardId)!;
      this.effect(
        "shot",
        attack.unit.x,
        attack.unit.y,
        attack.unit.team,
        0.22,
        attack.target,
      );
      if (attack.core) {
        attack.target.hp = Math.max(0, attack.target.hp - attack.amount);
        this.effect(
          "core-hit",
          attack.target.x,
          attack.target.y,
          attack.unit.team,
          0.35,
        );
      } else {
        const target = attack.target as Unit;
        if (card.shieldBreak && target.hp > 0 && target.shield > 0) {
          const shieldBefore = target.shield;
          target.shield = Math.max(0, target.shield - card.shieldBreak);
          if (target.shield < shieldBefore)
            this.effect(
              "breaker",
              target.x,
              target.y,
              attack.unit.team,
              0.42,
              undefined,
              target.radius + 18,
            );
        }
        this.damageUnit(target, attack.amount, attack.unit.team);
        if (card.slowDuration && target.hp > 0) {
          target.slowTime = Math.max(target.slowTime, card.slowDuration);
          target.slowFactor = Math.min(target.slowFactor, card.slowFactor ?? 1);
        }
      }
      if (card.splashRadius && card.splashDamage) {
        this.effect(
          "blast",
          attack.target.x,
          attack.target.y,
          attack.unit.team,
          0.4,
          undefined,
          card.splashRadius,
        );
        for (const nearby of this.state.units) {
          if (
            nearby !== attack.target &&
            nearby.team !== attack.unit.team &&
            nearby.hp > 0 &&
            distance(nearby, attack.target) <= card.splashRadius
          ) {
            this.damageUnit(nearby, card.splashDamage, attack.unit.team);
          }
        }
      }
    }
    // Soft separation lets units move freely rather than following fixed lanes.
    for (let i = 0; i < this.state.units.length; i++) {
      const a = this.state.units[i];
      for (let j = i + 1; j < this.state.units.length; j++) {
        const b = this.state.units[j];
        const d = distance(a, b);
        const minimum = (a.radius + b.radius) * 0.84;
        if (d >= minimum) continue;
        const dx = d < 0.01 ? (a.id < b.id ? -1 : 1) : (a.x - b.x) / d;
        const dy = d < 0.01 ? 0 : (a.y - b.y) / d;
        const push = Math.min(1.6, (minimum - d) * 0.22);
        a.x = clamp(a.x + dx * push, 15, BOARD_WIDTH - 15);
        a.y = clamp(a.y + dy * push, 62, BOARD_HEIGHT - 62);
        b.x = clamp(b.x - dx * push, 15, BOARD_WIDTH - 15);
        b.y = clamp(b.y - dy * push, 62, BOARD_HEIGHT - 62);
      }
    }
  }

  private objective(unit: Unit): { x: number; y: number } {
    const enemyCore = this.state.cores[other(unit.team)];
    let target: { x: number; y: number } = enemyCore;
    let best = distance(unit, enemyCore) + 50;
    for (const point of this.state.points) {
      if (point.owner === unit.team) continue;
      const backwards =
        unit.team === "player" ? point.y - unit.y : unit.y - point.y;
      const score =
        distance(unit, point) +
        Math.max(0, backwards - 40) * 0.9 -
        (this.controlObjective?.pointIds.includes(point.id) ? 90 : 0);
      if (score < best) {
        best = score;
        target = point;
      }
    }
    if (unit.cardId === "medic") {
      const card = CARDS.find((item) => item.id === unit.cardId)!;
      const allies = this.state.units.filter(
        (ally) =>
          ally.team === unit.team &&
          ally.id !== unit.id &&
          ally.hp > 0 &&
          ally.cardId !== "medic",
      );
      const ally = allies.sort(
        (a, b) => distance(a, unit) - distance(b, unit) || a.id - b.id,
      )[0];
      if (
        ally &&
        distance(unit, ally) > (card.followDistance ?? card.supportRange ?? 0)
      )
        return ally;
    }
    return target;
  }

  private move(
    unit: Unit,
    target: { x: number; y: number },
    stopDistance: number,
  ): void {
    const d = distance(unit, target);
    if (d <= stopDistance || d < 0.01) return;
    const travel = Math.min(
      d - stopDistance,
      unit.speed *
        STEP *
        (unit.rallyTime > 0 ? TEMPO_MOVE_SPEED_MULTIPLIER : 1) *
        unit.slowFactor,
    );
    unit.x = clamp(
      unit.x + ((target.x - unit.x) / d) * travel,
      15,
      BOARD_WIDTH - 15,
    );
    unit.y = clamp(
      unit.y + ((target.y - unit.y) / d) * travel,
      62,
      BOARD_HEIGHT - 62,
    );
  }

  private updateTurrets(): void {
    for (const team of ["player", "enemy"] as const) {
      this.coreCooldown[team] = Math.max(0, this.coreCooldown[team] - STEP);
      if (this.coreCooldown[team] > 0) continue;
      const core = this.state.cores[team];
      const target = coreTurretTarget(this.state, team);
      if (target) {
        this.damageUnit(target, CORE_TURRET_DAMAGE, team);
        this.effect("shot", core.x, core.y, team, 0.25, target);
        this.coreCooldown[team] = CORE_TURRET_INTERVAL;
      }
    }
  }

  private updatePoints(): void {
    for (const point of this.state.points) {
      const nearby = this.state.units.filter(
        (unit) => unit.hp > 0 && distance(unit, point) <= CAPTURE_RADIUS,
      );
      const playerCount = nearby.filter(
        (unit) => unit.team === "player",
      ).length;
      const enemyCount = nearby.length - playerCount;
      point.contested = playerCount > 0 && enemyCount > 0;
      if (point.contested) continue;
      const capturer: Team | null =
        playerCount > 0 ? "player" : enemyCount > 0 ? "enemy" : null;
      if (!capturer || point.owner === capturer) {
        point.capture = Math.max(0, point.capture - STEP * 0.18);
        if (point.capture === 0) point.captureTeam = null;
        continue;
      }
      if (point.captureTeam !== capturer) {
        if (point.capture > 0) {
          point.capture = Math.max(0, point.capture - STEP / CAPTURE_SECONDS);
          if (point.capture === 0) point.captureTeam = capturer;
          continue;
        }
        point.captureTeam = capturer;
      }
      const count = capturer === "player" ? playerCount : enemyCount;
      // Only the strongest specialist bonus applies; ordinary group support remains.
      let captureMultiplier = 1;
      for (const unit of nearby) {
        const definition = CARDS.find((card) => card.id === unit.cardId);
        captureMultiplier = Math.max(
          captureMultiplier,
          definition?.captureMultiplier ?? 1,
        );
      }
      point.capture +=
        (STEP / CAPTURE_SECONDS) *
        (1 + Math.min(2, count - 1) * 0.15) *
        captureMultiplier;
      if (point.capture >= 1) {
        point.owner = capturer;
        point.capture = 0;
        point.captureTeam = null;
        if (captureMultiplier > 1)
          this.effect(
            "pioneer",
            point.x,
            point.y,
            capturer,
            0.75,
            undefined,
            CAPTURE_RADIUS,
          );
        this.effect("capture", point.x, point.y, capturer, 1.1);
        if (capturer === "player") this.state.stats.captured++;
      }
    }
    for (const point of this.state.points) {
      point.supplied =
        point.owner !== null &&
        (point.owner === "player"
          ? point.y >= this.frontline("player", point.x)
          : point.y <= this.frontline("enemy", point.x));
    }
  }

  private runBot(): void {
    const reaction =
      this.difficulty === "rookie"
        ? 2.5
        : this.difficulty === "veteran"
          ? 1.1
          : 1.65;
    this.nextBotAction = this.state.time + reaction + this.random() * 0.8;
    const enemyUnits = this.state.units.filter((unit) => unit.team === "enemy");
    const readyForCommander =
      this.commanders.enemy === "atlas"
        ? enemyUnits.length >= 3
        : this.commanders.enemy === "nova"
          ? enemyUnits.filter((unit) => unit.hp > 0 && unit.rallyTime < 1)
              .length >= 3
          : enemyUnits.some(
              (unit) => unit.maxHp - unit.hp >= 40 || unit.slowTime > 0,
            );
    if (
      this.state.time >= this.nextBotCommander &&
      readyForCommander &&
      this.activateCommander("enemy").ok
    ) {
      this.nextBotCommander =
        this.state.time + COMMANDERS[this.commanders.enemy].cooldown;
    }
    const energy = this.state.energy.enemy;
    const playerUnits = this.state.units.filter(
      (unit) => unit.team === "player",
    );
    if (this.difficulty !== "rookie") {
      const cluster = playerUnits
        .map((unit) => ({
          unit,
          nearby: playerUnits.filter(
            (otherUnit) => distance(unit, otherUnit) <= 75,
          ),
        }))
        .sort(
          (a, b) => b.nearby.length - a.nearby.length || a.unit.id - b.unit.id,
        )[0];
      if (
        this.decks.enemy.includes("pulse") &&
        cluster &&
        cluster.nearby.length >= 3 &&
        cluster.unit.y < 340
      ) {
        // Save for a counter instead of spending every 2 energy on cheap units.
        // The same cost and damage rules apply to both teams.
        if (energy < 4) return;
        this.play("enemy", "pulse", cluster.unit.x, cluster.unit.y);
        return;
      }
    }
    if (
      this.difficulty === "veteran" &&
      this.decks.enemy.includes("rally") &&
      energy >= 3
    ) {
      const hurt = enemyUnits.find(
        (unit) =>
          unit.hp < unit.maxHp * 0.5 &&
          enemyUnits.filter(
            (ally) => distance(unit, ally) <= 96 && ally.hp < ally.maxHp - 25,
          ).length >= 2,
      );
      if (hurt) {
        this.play("enemy", "rally", hurt.x, hurt.y);
        return;
      }
    }
    if (this.difficulty !== "rookie") {
      const repulsor = CARDS.find((card) => card.id === "repulsor")!;
      if (this.decks.enemy.includes(repulsor.id) && energy >= repulsor.cost) {
        const threat = playerUnits.find(
          (unit) =>
            unit.y < 180 &&
            (distance(unit, this.state.cores.enemy) < 145 ||
              this.state.points.some(
                (point) =>
                  point.owner === "enemy" &&
                  distance(point, unit) < CAPTURE_RADIUS,
              )),
        );
        // Aim toward our base from the threat so the blast drives it back downfield.
        if (
          threat &&
          this.play("enemy", repulsor.id, threat.x, Math.max(0, threat.y - 24))
            .ok
        )
          return;
      }
      const stasis = CARDS.find((card) => card.id === "stasis")!;
      if (this.decks.enemy.includes(stasis.id) && energy >= stasis.cost) {
        const target = playerUnits.find(
          (unit) =>
            unit.slowTime < 1 &&
            playerUnits.filter(
              (other) =>
                distance(unit, other) <= stasis.range! && other.slowTime < 1,
            ).length >= 2 &&
            enemyUnits.some((ally) => distance(unit, ally) < 150),
        );
        if (target && this.play("enemy", stasis.id, target.x, target.y).ok)
          return;
      }
    }
    const cards = CARDS.filter(
      (card) =>
        card.kind === "unit" &&
        card.cost <= energy &&
        this.decks.enemy.includes(card.id),
    );
    if (!cards.length) return;
    let card = cards[Math.floor(this.random() * cards.length)];
    const threatened = playerUnits
      .filter((unit) => unit.y < 220)
      .sort((a, b) => a.y - b.y || a.id - b.id)[0];
    if (
      this.difficulty !== "rookie" &&
      threatened &&
      energy >= 4 &&
      threatened.cardId === "swarm"
    )
      card = cards.find((candidate) => candidate.id === "vanguard") ?? card;
    if (this.difficulty !== "rookie" && threatened && threatened.shield > 0)
      card = cards.find((candidate) => candidate.id === "breaker") ?? card;
    if (
      card.id === "medic" &&
      !enemyUnits.some((unit) => unit.cardId !== "medic")
    ) {
      const fighter = cards.find((candidate) => candidate.id !== "medic");
      if (!fighter) return;
      card = fighter;
    }
    let column = Math.floor(this.random() * 3);
    if (this.difficulty !== "rookie") {
      if (threatened)
        column = threatened.x < 147.5 ? 0 : threatened.x < 272.5 ? 1 : 2;
      else {
        const scores = COLUMN_X.map((x, i) => ({
          i,
          value:
            (this.controlObjective?.pointIds.some(
              (id) => id % 3 === i && this.state.points[id].owner !== "enemy",
            )
              ? 180
              : 0) +
            this.frontline("enemy", x) +
            this.random() * 80 -
            enemyUnits.filter((unit) => Math.abs(unit.x - x) < 62).length * 30,
        }));
        scores.sort((a, b) => b.value - a.value || a.i - b.i);
        column = scores[0].i;
      }
    }
    const x = clamp(
      COLUMN_X[column] + (this.random() - 0.5) * 45,
      22,
      BOARD_WIDTH - 22,
    );
    const front = this.frontline("enemy", x);
    const y = clamp(front - ((card.range ?? 0) >= 70 ? 32 : 9), 66, 494);
    this.play("enemy", card.id, x, y);
  }

  private checkCoreEnd(): void {
    const playerDead = this.state.cores.player.hp <= 0;
    const enemyDead = this.state.cores.enemy.hp <= 0;
    if (!playerDead && !enemyDead) return;
    this.state.phase = "ended";
    this.state.winner =
      playerDead && enemyDead ? "draw" : playerDead ? "enemy" : "player";
    this.state.reason =
      playerDead && enemyDead ? "Beide Kerne zerstört." : "Kern zerstört.";
  }

  private finishByScore(): void {
    this.state.phase = "ended";
    if (this.controlObjective) {
      const difference =
        this.state.controlTime.player - this.state.controlTime.enemy;
      if (Math.abs(difference) > 1e-8) {
        this.state.winner = difference > 0 ? "player" : "enemy";
        this.state.reason = "Zeitlimit: mehr Kontrollzeit.";
        return;
      }
    }
    const healthDifference =
      this.state.cores.player.hp / this.state.cores.player.maxHp -
      this.state.cores.enemy.hp / this.state.cores.enemy.maxHp;
    if (Math.abs(healthDifference) > 1e-9) {
      this.state.winner = healthDifference > 0 ? "player" : "enemy";
      this.state.reason = "Zeitlimit: höhere Kern-HP.";
      return;
    }
    const ownedDifference =
      this.state.points.filter((point) => point.owner === "player").length -
      this.state.points.filter((point) => point.owner === "enemy").length;
    this.state.winner =
      ownedDifference > 0 ? "player" : ownedDifference < 0 ? "enemy" : "draw";
    this.state.reason = ownedDifference
      ? "Zeitlimit: mehr Kontrollpunkte."
      : "Gleiche Kern-HP und Kontrollpunkte.";
  }
}
