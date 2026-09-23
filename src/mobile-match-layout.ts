export type MatchLayoutDensity = "standard" | "compact" | "tight";

export type MatchViewportProfile = {
  width: number;
  height: number;
  density: MatchLayoutDensity;
  narrow: boolean;
};

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function matchViewportProfile(
  width: number,
  height: number,
): MatchViewportProfile {
  const safeWidth = finiteOr(width, 390);
  const safeHeight = finiteOr(height, 844);
  const narrow = safeWidth <= 390;
  const density: MatchLayoutDensity =
    safeHeight <= 690
      ? "tight"
      : safeHeight <= 790
        ? "compact"
        : "standard";

  return {
    width: safeWidth,
    height: safeHeight,
    density,
    narrow,
  };
}
