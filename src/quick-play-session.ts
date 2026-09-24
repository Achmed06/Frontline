import type { MatchRecord } from "./storage";

export type QuickPlaySessionCue = {
  tone: "neutral" | "hot" | "rebound";
  streak: number;
  heroKicker: string;
  heroTitleTop: string;
  heroTitleBottom: string;
  heroCopy: string;
  heroCta: string;
  startKicker: string;
  startDetail: string;
};

export function quickPlaySessionCue(
  records: readonly MatchRecord[],
  arenaName: string,
  matchNumber: number,
): QuickPlaySessionCue {
  const safeArena = arenaName.trim() || "NÄCHSTE FRONT";
  const safeMatch =
    Number.isFinite(matchNumber) && matchNumber > 0
      ? Math.floor(matchNumber)
      : 1;
  const latest = records[0];

  if (!latest)
    return {
      tone: "neutral",
      streak: 0,
      heroKicker: "SCHNELLGEFECHT · GEGEN BOT",
      heroTitleTop: "3 MINUTEN.",
      heroTitleBottom: "EINE FRONT.",
      heroCopy: "Dein Deck. Dein Commander. Sofort ins Gefecht.",
      heroCta: "JETZT SPIELEN",
      startKicker: safeArena.toUpperCase(),
      startDetail: `FRONT ${safeMatch} · LOADOUT BEREIT`,
    };

  if (latest.outcome === "player") {
    let streak = 0;
    for (const record of records) {
      if (record.outcome !== "player") break;
      streak++;
    }
    if (streak >= 2)
      return {
        tone: "hot",
        streak,
        heroKicker: `${streak} SIEGE IN FOLGE · ${safeArena.toUpperCase()}`,
        heroTitleTop: `${streak} SIEGE.`,
        heroTitleBottom: "WEITER.",
        heroCopy: "Momentum halten. Gleiches Loadout, nächste Front.",
        heroCta: "SERIE HALTEN",
        startKicker: `SERIE ×${streak} · ${safeArena.toUpperCase()}`,
        startDetail: `FRONT ${safeMatch} · MOMENTUM HALTEN`,
      };
    return {
      tone: "neutral",
      streak: 0,
      heroKicker: "SCHNELLGEFECHT · GEGEN BOT",
      heroTitleTop: "3 MINUTEN.",
      heroTitleBottom: "EINE FRONT.",
      heroCopy: "Dein Deck. Dein Commander. Sofort ins Gefecht.",
      heroCta: "JETZT SPIELEN",
      startKicker: safeArena.toUpperCase(),
      startDetail: `FRONT ${safeMatch} · LOADOUT BEREIT`,
    };
  }

  if (latest.outcome === "enemy")
    return {
      tone: "rebound",
      streak: 0,
      heroKicker: `REVANCHE BEREIT · ${safeArena.toUpperCase()}`,
      heroTitleTop: "NÄCHSTE FRONT.",
      heroTitleBottom: "ZURÜCK.",
      heroCopy: "Gleiches Loadout. Neuer Schauplatz. Sofort zurückschlagen.",
      heroCta: "ZURÜCKSCHLAGEN",
      startKicker: `REVANCHE · ${safeArena.toUpperCase()}`,
      startDetail: `FRONT ${safeMatch} · LOADOUT BEREIT`,
    };

  return {
    tone: "neutral",
    streak: 0,
    heroKicker: `NÄCHSTE FRONT · ${safeArena.toUpperCase()}`,
    heroTitleTop: "3 MINUTEN.",
    heroTitleBottom: "ENTSCHEIDEN.",
    heroCopy: "Unentschieden. Gleiche Stärke, neue Front.",
    heroCta: "NOCHMAL",
    startKicker: `ENTSCHEIDUNG · ${safeArena.toUpperCase()}`,
    startDetail: `FRONT ${safeMatch} · NEUER VERSUCH`,
  };
}
