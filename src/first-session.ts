export type FirstSessionPhase = "first-battle" | "learning" | "full";

export type FirstSessionFocus = {
  phase: FirstSessionPhase;
  showMainNavigation: boolean;
  showSecondaryPlay: boolean;
  showAdvancedBattle: boolean;
  kicker: string;
  title: string;
  copy: string;
  cta: string;
};

export function firstSessionFocus(matches: number): FirstSessionFocus {
  const safeMatches =
    Number.isFinite(matches) && matches > 0 ? Math.floor(matches) : 0;

  if (safeMatches === 0)
    return {
      phase: "first-battle",
      showMainNavigation: false,
      showSecondaryPlay: false,
      showAdvancedBattle: false,
      kicker: "DEIN ERSTES GEFECHT",
      title: "3 MINUTEN.\nEINE FRONT.",
      copy: "Karte wählen. Boden gewinnen. Core durchbrechen. Mehr musst du für den Start nicht wissen.",
      cta: "ERSTES GEFECHT STARTEN",
    };

  if (safeMatches < 3)
    return {
      phase: "learning",
      showMainNavigation: true,
      showSecondaryPlay: true,
      showAdvancedBattle: false,
      kicker: "SCHNELLGEFECHT · GEGEN BOT",
      title: "3 MINUTEN.\nEINE FRONT.",
      copy: "Dein Deck. Dein Commander. Direkt wieder ins Gefecht.",
      cta: "JETZT SPIELEN",
    };

  return {
    phase: "full",
    showMainNavigation: true,
    showSecondaryPlay: true,
    showAdvancedBattle: true,
    kicker: "SCHNELLGEFECHT · GEGEN BOT",
    title: "3 MINUTEN.\nEINE FRONT.",
    copy: "Dein Deck. Dein Commander. Sofort ins Gefecht.",
    cta: "JETZT SPIELEN",
  };
}

export function firstMatchUnlock(previousMatches: number, nextMatches: number) {
  return previousMatches === 0 && nextMatches === 1;
}
