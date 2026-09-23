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
