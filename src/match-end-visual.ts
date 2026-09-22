import type { MatchState } from "./engine";

export type MatchEndVisual = {
  kind: "victory" | "defeat" | "draw";
  title: string;
  subtitle: string;
  focus: "player" | "enemy" | "center";
  coreBreak: boolean;
};

type MatchEndState = Pick<
  MatchState,
  "phase" | "winner" | "reason" | "cores"
>;

export function matchEndVisual(
  state: MatchEndState,
): MatchEndVisual | null {
  if (state.phase !== "ended" || !state.winner) return null;

  const playerBroken = state.cores.player.hp <= 0;
  const enemyBroken = state.cores.enemy.hp <= 0;

  if (playerBroken && enemyBroken)
    return {
      kind: "draw",
      title: "BEIDE CORES GEFALLEN",
      subtitle: "KEINE SEITE HÄLT DIE FRONT",
      focus: "center",
      coreBreak: true,
    };

  if (state.winner === "player")
    return {
      kind: "victory",
      title: enemyBroken ? "FRONT DURCHBROCHEN" : "FRONT GESICHERT",
      subtitle: enemyBroken
        ? "GEGNERISCHER CORE GEFALLEN"
        : state.reason.toUpperCase(),
      focus: enemyBroken ? "enemy" : "center",
      coreBreak: enemyBroken,
    };

  if (state.winner === "enemy")
    return {
      kind: "defeat",
      title: playerBroken ? "STELLUNG GEFALLEN" : "FRONT VERLOREN",
      subtitle: playerBroken
        ? "DEIN CORE WURDE ZERSTÖRT"
        : state.reason.toUpperCase(),
      focus: playerBroken ? "player" : "center",
      coreBreak: playerBroken,
    };

  return {
    kind: "draw",
    title: "FRONT FESTGEFAHREN",
    subtitle: state.reason.toUpperCase(),
    focus: "center",
    coreBreak: false,
  };
}
