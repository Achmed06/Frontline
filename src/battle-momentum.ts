export type BattleMomentumId =
  | "comeback"
  | "playerAdvance"
  | "enemyAdvance";

export type BattleMomentumMemory = {
  maxEnemyLead: number;
  shown: readonly BattleMomentumId[];
};

export type BattleMomentumInput = {
  time: number;
  playerPoints: number;
  enemyPoints: number;
};

export type BattleMomentumEvent = {
  id: BattleMomentumId;
  label: string;
  title: string;
  tone: "opportunity" | "danger";
};

export type BattleMomentumResult = {
  memory: BattleMomentumMemory;
  event: BattleMomentumEvent | null;
};

export const INITIAL_BATTLE_MOMENTUM: BattleMomentumMemory = {
  maxEnemyLead: 0,
  shown: [],
};

export function battleMomentum(
  memory: BattleMomentumMemory,
  input: BattleMomentumInput,
): BattleMomentumResult {
  const playerPoints = Math.max(0, Math.floor(input.playerPoints));
  const enemyPoints = Math.max(0, Math.floor(input.enemyPoints));
  const time = Number.isFinite(input.time) ? Math.max(0, input.time) : 0;
  const maxEnemyLead = Math.max(
    Math.max(0, memory.maxEnemyLead),
    enemyPoints - playerPoints,
  );
  const shown = new Set(memory.shown);
  const playerLead = playerPoints - enemyPoints;

  let event: BattleMomentumEvent | null = null;

  if (
    time >= 25 &&
    maxEnemyLead >= 2 &&
    playerLead >= 1 &&
    !shown.has("comeback")
  ) {
    event = {
      id: "comeback",
      label: "COMEBACK",
      title: "FRONT GEDREHT",
      tone: "opportunity",
    };
    shown.add("comeback");
    if (playerPoints >= 5 && enemyPoints <= 2) shown.add("playerAdvance");
  } else if (
    time >= 20 &&
    playerPoints >= 5 &&
    enemyPoints <= 2 &&
    !shown.has("playerAdvance")
  ) {
    event = {
      id: "playerAdvance",
      label: "DEIN VORSTOSS",
      title: "FRONT UNTER DRUCK",
      tone: "opportunity",
    };
    shown.add("playerAdvance");
  } else if (
    time >= 20 &&
    enemyPoints >= 5 &&
    playerPoints <= 2 &&
    !shown.has("enemyAdvance")
  ) {
    event = {
      id: "enemyAdvance",
      label: "GEGNER-VORSTOSS",
      title: "FRONT ZURÜCKHOLEN",
      tone: "danger",
    };
    shown.add("enemyAdvance");
  }

  return {
    memory: {
      maxEnemyLead,
      shown: [...shown],
    },
    event,
  };
}
