export type MatchStartTiming = {
  countdownMs: number;
  goMs: number;
  allowPreselect: boolean;
};

export function matchStartTiming(
  completedMatches: number,
  rematch = false,
): MatchStartTiming {
  const safeMatches =
    Number.isFinite(completedMatches) && completedMatches > 0
      ? Math.floor(completedMatches)
      : 0;

  if (safeMatches === 0)
    return {
      countdownMs: 3000,
      goMs: 650,
      allowPreselect: true,
    };

  if (rematch)
    return {
      countdownMs: 1200,
      goMs: 300,
      allowPreselect: true,
    };

  return {
    countdownMs: 1800,
    goMs: 420,
    allowPreselect: true,
  };
}
