import type { MatchRecord } from "./storage";

export type ResultMomentum = {
  streak: number;
  label: string;
  title: string;
  detail: string;
  tone: "win" | "draw" | "loss";
};

export function resultMomentum(records: readonly MatchRecord[]): ResultMomentum {
  const latest = records[0];
  if (!latest)
    return {
      streak: 0,
      label: "NÄCHSTE FRONT",
      title: "Bereit für den nächsten Vorstoß.",
      detail: "Dein Deck bleibt einsatzbereit.",
      tone: "draw",
    };

  if (latest.outcome === "player") {
    let streak = 0;
    for (const record of records) {
      if (record.outcome !== "player") break;
      streak++;
    }
    return {
      streak,
      label: streak >= 2 ? `${streak} SIEGE IN FOLGE` : "FRONT GESICHERT",
      title: streak >= 3 ? "Die Serie läuft." : "Momentum halten.",
      detail:
        streak >= 2
          ? "Noch ein Gefecht, solange dein Loadout sitzt."
          : "Direkt weiter oder den Bericht ansehen.",
      tone: "win",
    };
  }

  if (latest.outcome === "draw")
    return {
      streak: 0,
      label: "UNENTSCHIEDEN",
      title: "Die nächste Front entscheidet.",
      detail: "Gleiches Loadout. Neuer Versuch.",
      tone: "draw",
    };

  return {
    streak: 0,
    label: "NEU FORMATIEREN",
    title: "Sofort zurückschlagen.",
    detail: "Dein Deck bleibt bereit. Passe nur an, wenn du wirklich willst.",
    tone: "loss",
  };
}


export type ResultReplayContext = {
  quickPlay?: boolean;
  streak?: number;
};

export function resultReplayLabel(
  outcome: MatchRecord["outcome"],
  context: ResultReplayContext = {},
): string {
  const streak =
    Number.isFinite(context.streak) && (context.streak ?? 0) > 0
      ? Math.floor(context.streak!)
      : 0;

  if (context.quickPlay) {
    if (outcome === "player")
      return streak >= 2 ? "SERIE HALTEN" : "NÄCHSTE FRONT";
    if (outcome === "draw") return "NOCHMAL";
    return "ZURÜCKSCHLAGEN";
  }

  if (outcome === "player") return "NOCH EIN GEFECHT";
  if (outcome === "draw") return "NOCHMAL";
  return "SOFORT ZURÜCKSCHLAGEN";
}


export function quickPlayResultMomentum(
  outcome: MatchRecord["outcome"],
  winStreak: number,
): ResultMomentum {
  const streak =
    outcome === "player" &&
    Number.isFinite(winStreak) &&
    winStreak > 0
      ? Math.floor(winStreak)
      : 0;

  if (outcome === "player")
    return {
      streak,
      label: streak >= 2 ? `${streak} SIEGE IN FOLGE` : "FRONT GESICHERT",
      title: streak >= 3 ? "Die Serie läuft." : "Momentum halten.",
      detail:
        streak >= 2
          ? "Noch ein Schnellgefecht, solange dein Loadout sitzt."
          : "Direkt zur nächsten Front oder den Bericht ansehen.",
      tone: "win",
    };

  if (outcome === "draw")
    return {
      streak: 0,
      label: "UNENTSCHIEDEN",
      title: "Die nächste Front entscheidet.",
      detail: "Gleiches Loadout. Neuer Versuch.",
      tone: "draw",
    };

  return {
    streak: 0,
    label: "REVANCHE BEREIT",
    title: "Sofort zurückschlagen.",
    detail: "Gleiches Loadout. Nächste Quick-Play-Front.",
    tone: "loss",
  };
}

export type ResultActionKind =
  | "next-mission"
  | "draft"
  | "series"
  | "series-ended"
  | "daily"
  | "mission"
  | "quick-play"
  | "replay";

export function resultActionDetail(kind: ResultActionKind): string {
  switch (kind) {
    case "next-mission":
      return "NEUER EINSATZ · LOADOUT BLEIBT";
    case "draft":
      return "NEUES DECK · DIREKT DRAFTEN";
    case "series":
      return "NÄCHSTE SERIENFRONT · DECK BLEIBT";
    case "series-ended":
      return "SERIE AUSWERTEN · DANACH NEU STARTEN";
    case "daily":
      return "GLEICHES SETUP · SOFORT NOCHMAL";
    case "mission":
      return "GLEICHER EINSATZ · GLEICHES LOADOUT";
    case "quick-play":
      return "GLEICHES LOADOUT · NEUE FRONT";
    default:
      return "GLEICHES LOADOUT · DIREKT WEITER";
  }
}

