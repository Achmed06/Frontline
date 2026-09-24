export type QuickPlayBaseline = {
  completedMatches: number;
  migrated: boolean;
};

export function quickPlayBaseline(
  totalMatches: number,
  quickPlayMatches?: number,
): QuickPlayBaseline {
  if (
    typeof quickPlayMatches === "number" &&
    Number.isSafeInteger(quickPlayMatches) &&
    quickPlayMatches >= 0
  )
    return { completedMatches: quickPlayMatches, migrated: false };

  const legacyMatches =
    Number.isSafeInteger(totalMatches) && totalMatches > 0
      ? Math.floor(totalMatches)
      : 0;
  return { completedMatches: legacyMatches, migrated: true };
}

export type QuickPlaySessionState = {
  completedMatches?: number;
  winStreak?: number;
  lastOutcome?: "player" | "enemy" | "draw" | null;
};

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
  session: QuickPlaySessionState,
  arenaName: string,
  matchNumber: number,
): QuickPlaySessionCue {
  const safeArena = arenaName.trim() || "NÄCHSTE FRONT";
  const safeMatch =
    Number.isFinite(matchNumber) && matchNumber > 0
      ? Math.floor(matchNumber)
      : 1;
  const completedMatches =
    Number.isFinite(session.completedMatches) &&
    (session.completedMatches ?? 0) > 0
      ? Math.floor(session.completedMatches!)
      : 0;
  const outcome =
    session.lastOutcome === "player" ||
    session.lastOutcome === "enemy" ||
    session.lastOutcome === "draw"
      ? session.lastOutcome
      : null;
  const streak =
    outcome === "player" &&
    Number.isFinite(session.winStreak) &&
    (session.winStreak ?? 0) > 0
      ? Math.min(completedMatches, Math.floor(session.winStreak!))
      : 0;

  if (completedMatches === 0 || !outcome)
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

  if (outcome === "player") {
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

  if (outcome === "enemy")
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
