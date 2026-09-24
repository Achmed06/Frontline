export type FrontSurgeTeam = "player" | "enemy";

export type FrontSurgeCapture = {
  team: FrontSurgeTeam;
  time: number;
};

export type FrontSurgeMemory = {
  recent: readonly FrontSurgeCapture[];
  lastPlayerAt: number;
  lastEnemyAt: number;
};

export type FrontSurgeInput = {
  time: number;
  previousOwners: readonly (FrontSurgeTeam | null)[];
  currentOwners: readonly (FrontSurgeTeam | null)[];
};

export type FrontSurgeEvent = {
  team: FrontSurgeTeam;
  captures: number;
  label: string;
  title: string;
  tone: "opportunity" | "danger";
};

export type FrontSurgeResult = {
  memory: FrontSurgeMemory;
  event: FrontSurgeEvent | null;
};

export const FRONT_SURGE_WINDOW_SECONDS = 9;
export const FRONT_SURGE_COOLDOWN_SECONDS = 8;

export const INITIAL_FRONT_SURGE: FrontSurgeMemory = {
  recent: [],
  lastPlayerAt: -FRONT_SURGE_COOLDOWN_SECONDS,
  lastEnemyAt: -FRONT_SURGE_COOLDOWN_SECONDS,
};

function safeTime(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function frontSurge(
  memory: FrontSurgeMemory,
  input: FrontSurgeInput,
): FrontSurgeResult {
  const time = safeTime(input.time);
  const captures: FrontSurgeCapture[] = [];
  const length = Math.max(input.previousOwners.length, input.currentOwners.length);

  for (let index = 0; index < length; index++) {
    const previous = input.previousOwners[index] ?? null;
    const current = input.currentOwners[index] ?? null;
    if (current && current !== previous) captures.push({ team: current, time });
  }

  const recent = [
    ...memory.recent.filter(
      (capture) =>
        capture.time <= time &&
        time - capture.time <= FRONT_SURGE_WINDOW_SECONDS,
    ),
    ...captures,
  ];

  const latest = captures.at(-1);
  if (!latest) {
    return {
      memory: {
        ...memory,
        recent,
      },
      event: null,
    };
  }

  const count = recent.filter((capture) => capture.team === latest.team).length;
  const lastTriggeredAt =
    latest.team === "player" ? memory.lastPlayerAt : memory.lastEnemyAt;
  const cooledDown = time - lastTriggeredAt >= FRONT_SURGE_COOLDOWN_SECONDS;

  if (count < 2 || !cooledDown) {
    return {
      memory: {
        ...memory,
        recent,
      },
      event: null,
    };
  }

  const event: FrontSurgeEvent =
    latest.team === "player"
      ? {
          team: "player",
          captures: count,
          label: count >= 3 ? "DRUCKWELLE" : "VORSTOSS",
          title: count >= 3 ? "FRONT BRICHT AUF" : "DRUCK AUFGEBAUT",
          tone: "opportunity",
        }
      : {
          team: "enemy",
          captures: count,
          label: count >= 3 ? "FRONTBRUCH" : "GEGENSTOSS",
          title: count >= 3 ? "LINIE STABILISIEREN" : "FRONT UNTER DRUCK",
          tone: "danger",
        };

  return {
    memory: {
      recent,
      lastPlayerAt: latest.team === "player" ? time : memory.lastPlayerAt,
      lastEnemyAt: latest.team === "enemy" ? time : memory.lastEnemyAt,
    },
    event,
  };
}
