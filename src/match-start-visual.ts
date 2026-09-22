export type MatchStartPhase =
  | "cores"
  | "supply"
  | "commanders"
  | "go";

export type MatchStartVisual = {
  phase: MatchStartPhase;
  count: 3 | 2 | 1 | null;
  kicker: string;
  title: string;
  detail: string;
  progress: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function matchStartVisual(
  remainingMs: number,
  playerCommander: string,
  enemyCommander: string,
  controlObjective = false,
  daily = false,
): MatchStartVisual {
  const remaining = Number.isFinite(remainingMs)
    ? Math.max(0, remainingMs)
    : 3000;
  const progress = clamp01(1 - remaining / 3000);

  if (remaining > 2000)
    return {
      phase: "cores",
      count: 3,
      kicker: daily ? "TAGESFRONT · CORE-LINK" : "CORE-LINK",
      title: "BEIDE CORES ONLINE",
      detail: "GEGNER ERFASST · VERBINDUNG STABIL",
      progress,
    };

  if (remaining > 1000)
    return {
      phase: "supply",
      count: 2,
      kicker: "SUPPLY-LINK",
      title: "3 EINSATZSPALTEN",
      detail: "FRONTGEOMETRIE SYNCHRONISIERT",
      progress,
    };

  if (remaining > 0)
    return {
      phase: "commanders",
      count: 1,
      kicker: "KOMMANDO-LINK",
      title: `${playerCommander} ↔ ${enemyCommander}`,
      detail: "FÄHIGKEITEN BEREIT",
      progress,
    };

  return {
    phase: "go",
    count: null,
    kicker: controlObjective ? "RELAIS SICHERN" : "CORE BRECHEN",
    title: "LOS",
    detail: "FRONT FREIGEGEBEN",
    progress: 1,
  };
}
