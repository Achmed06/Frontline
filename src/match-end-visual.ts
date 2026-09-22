import type { MatchState } from "./engine";

export const MATCH_END_SEQUENCE_MS = 850;

export type MatchEndMetric =
  | "core-break"
  | "relay"
  | "control-time"
  | "core-health"
  | "territory"
  | "draw"
  | "other";

export type MatchEndVisual = {
  kind: "victory" | "defeat" | "draw";
  title: string;
  subtitle: string;
  focus: "player" | "enemy" | "center";
  coreBreak: boolean;
  metric: MatchEndMetric;
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
      metric: "core-break",
    };

  if (enemyBroken)
    return {
      kind: "victory",
      title: "FRONT DURCHBROCHEN",
      subtitle: "GEGNERISCHER CORE GEFALLEN",
      focus: "enemy",
      coreBreak: true,
      metric: "core-break",
    };

  if (playerBroken)
    return {
      kind: "defeat",
      title: "STELLUNG GEFALLEN",
      subtitle: "DEIN CORE WURDE ZERSTÖRT",
      focus: "player",
      coreBreak: true,
      metric: "core-break",
    };

  const kind =
    state.winner === "player"
      ? "victory"
      : state.winner === "enemy"
        ? "defeat"
        : "draw";
  const reason = state.reason.trim().toLowerCase();

  if (
    reason === "kontrollziel erreicht." ||
    reason === "beide kontrollziele gleichzeitig erreicht."
  ) {
    if (kind === "draw")
      return {
        kind,
        title: "RELAIS GLEICHSTAND",
        subtitle: "BEIDE KONTROLLZIELE ERREICHT",
        focus: "center",
        coreBreak: false,
        metric: "relay",
      };
    return {
      kind,
      title: kind === "victory" ? "RELAIS GESICHERT" : "RELAIS VERLOREN",
      subtitle:
        kind === "victory"
          ? "KONTROLLZIEL ABGESCHLOSSEN"
          : "GEGNER HÄLT DAS KONTROLLZIEL",
      focus: "center",
      coreBreak: false,
      metric: "relay",
    };
  }

  if (reason === "zeitlimit: mehr kontrollzeit.")
    return {
      kind,
      title:
        kind === "victory"
          ? "KONTROLLE GEHALTEN"
          : kind === "defeat"
            ? "KONTROLLE VERLOREN"
            : "KONTROLLE GLEICH",
      subtitle:
        kind === "victory"
          ? "MEHR KONTROLLZEIT BEIM SCHLUSSSIGNAL"
          : kind === "defeat"
            ? "GEGNER MIT MEHR KONTROLLZEIT"
            : "GLEICHE KONTROLLZEIT",
      focus: "center",
      coreBreak: false,
      metric: "control-time",
    };

  if (reason === "zeitlimit: höhere kern-hp.")
    return {
      kind,
      title:
        kind === "victory"
          ? "CORE-VORTEIL"
          : kind === "defeat"
            ? "CORE-NACHTEIL"
            : "CORES GLEICH",
      subtitle:
        kind === "victory"
          ? "MEHR CORE-HP BEIM SCHLUSSSIGNAL"
          : kind === "defeat"
            ? "GEGNER MIT MEHR CORE-HP"
            : "GLEICHE CORE-HP",
      focus: "center",
      coreBreak: false,
      metric: "core-health",
    };

  if (reason === "zeitlimit: mehr kontrollpunkte.")
    return {
      kind,
      title:
        kind === "victory"
          ? "FRONTMEHRHEIT"
          : kind === "defeat"
            ? "FRONTNACHTEIL"
            : "FRONT GLEICH",
      subtitle:
        kind === "victory"
          ? "MEHR GEBIET BEIM SCHLUSSSIGNAL"
          : kind === "defeat"
            ? "GEGNER MIT MEHR GEBIET"
            : "GLEICH VIEL GEBIET",
      focus: "center",
      coreBreak: false,
      metric: "territory",
    };

  if (reason === "gleiche kern-hp und kontrollpunkte.")
    return {
      kind: "draw",
      title: "FRONT FESTGEFAHREN",
      subtitle: "CORE UND GEBIET GLEICH",
      focus: "center",
      coreBreak: false,
      metric: "draw",
    };

  return {
    kind,
    title:
      kind === "victory"
        ? "FRONT GESICHERT"
        : kind === "defeat"
          ? "FRONT VERLOREN"
          : "FRONT FESTGEFAHREN",
    subtitle: state.reason.toUpperCase(),
    focus: "center",
    coreBreak: false,
    metric: "other",
  };
}
