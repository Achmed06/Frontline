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
  totalMs = 3000,
  firstBattle = false,
  selectedCardName = "",
): MatchStartVisual {
  const duration =
    Number.isFinite(totalMs) && totalMs > 0 ? Math.max(300, totalMs) : 3000;
  const remaining = Number.isFinite(remainingMs)
    ? Math.max(0, remainingMs)
    : duration;
  const progress = clamp01(1 - remaining / duration);
  const phase = duration / 3;

  if (firstBattle) {
    if (remaining > phase * 2)
      return {
        phase: "cores",
        count: 3,
        kicker: "DEIN ERSTER ZUG",
        title: selectedCardName
          ? `${selectedCardName.toUpperCase()} IST BEREIT`
          : "TRUPPE UNTEN WÄHLEN",
        detail: selectedCardName
          ? "DU KANNST UNTEN WECHSELN · MUSST ABER NICHT"
          : "TIPPE UNTEN AUF EINE EINHEIT",
        progress,
      };

    if (remaining > phase)
      return {
        phase: "supply",
        count: 2,
        kicker: "SCHRITT 1",
        title: "IM GRÜNEN GEBIET EINSETZEN",
        detail: "HALTEN · ZIEHEN · LOSLASSEN",
        progress,
      };

    if (remaining > 0)
      return {
        phase: "commanders",
        count: 1,
        kicker: "SCHRITT 2",
        title: "PUNKTE EROBERN",
        detail: "DEINE TRUPPEN KÄMPFEN VON SELBST",
        progress,
      };

    return {
      phase: "go",
      count: null,
      kicker: controlObjective ? "ZIEL · RELAIS SICHERN" : "ZIEL · CORE BRECHEN",
      title: "LOS",
      detail: controlObjective
        ? "MARKIERTE RELAIS HALTEN"
        : "BODEN GEWINNEN · FRONT VORSCHIEBEN",
      progress: 1,
    };
  }

  if (remaining > phase * 2)
    return {
      phase: "cores",
      count: 3,
      kicker: daily ? "TAGESFRONT · CORE-LINK" : "CORE-LINK",
      title: "BEIDE CORES ONLINE",
      detail: "GEGNER ERFASST · VERBINDUNG STABIL",
      progress,
    };

  if (remaining > phase)
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
