import type { ControlObjective, MatchState } from "./engine";

export type ResultDecisionMetric = "control" | "core" | "territory" | "draw";

export type ResultDecisionRow = {
  key: "control" | "core" | "territory";
  label: string;
  player: string;
  enemy: string;
  decisive: boolean;
};

export type ResultDecision = {
  metric: ResultDecisionMetric;
  title: string;
  detail: string;
  rows: ResultDecisionRow[];
};

function percent(value: number, max: number): string {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0)
    return "0%";
  return `${Math.round(Math.max(0, Math.min(1, value / max)) * 100)}%`;
}

function seconds(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${(Math.round(safe * 10) / 10).toFixed(1).replace(".", ",")}s`;
}

export function resultDecision(
  state: MatchState,
  objective?: ControlObjective,
): ResultDecision {
  const playerPoints = state.points.filter(
    (point) => point.owner === "player",
  ).length;
  const enemyPoints = state.points.filter(
    (point) => point.owner === "enemy",
  ).length;

  const reason = state.reason;
  const bothCores =
    state.cores.player.hp <= 0 && state.cores.enemy.hp <= 0;
  const coreDestroyed =
    bothCores ||
    state.cores.player.hp <= 0 ||
    state.cores.enemy.hp <= 0 ||
    reason === "Kern zerstört." ||
    reason === "Beide Kerne zerstört.";
  const simultaneousControl =
    reason === "Beide Kontrollziele gleichzeitig erreicht.";
  const controlGoal = reason === "Kontrollziel erreicht." || simultaneousControl;
  const controlScore = reason === "Zeitlimit: mehr Kontrollzeit.";
  const coreScore = reason === "Zeitlimit: höhere Kern-HP.";
  const territoryScore = reason === "Zeitlimit: mehr Kontrollpunkte.";
  const draw =
    state.winner === "draw" ||
    reason === "Gleiche Kern-HP und Kontrollpunkte." ||
    bothCores ||
    simultaneousControl;

  const metric: ResultDecisionMetric = draw
    ? "draw"
    : controlGoal || controlScore
      ? "control"
      : coreDestroyed || coreScore
        ? "core"
        : territoryScore
          ? "territory"
          : "draw";

  const rows: ResultDecisionRow[] = [];
  if (objective) {
    rows.push({
      key: "control",
      label: "RELAIS",
      player: `${seconds(state.controlTime.player)} / ${objective.seconds}s`,
      enemy: `${seconds(state.controlTime.enemy)} / ${objective.seconds}s`,
      decisive: metric === "control",
    });
  }
  rows.push(
    {
      key: "core",
      label: "CORE",
      player: percent(state.cores.player.hp, state.cores.player.maxHp),
      enemy: percent(state.cores.enemy.hp, state.cores.enemy.maxHp),
      decisive: metric === "core",
    },
    {
      key: "territory",
      label: "GEBIET",
      player: `${playerPoints}/9`,
      enemy: `${enemyPoints}/9`,
      decisive: metric === "territory",
    },
  );

  if (metric === "control")
    return {
      metric,
      title: controlGoal ? "KONTROLLZIEL" : "KONTROLLZEIT",
      detail: controlGoal
        ? "Das Relaisziel hat das Gefecht beendet."
        : "Die höhere gesicherte Kontrollzeit hat entschieden.",
      rows,
    };
  if (metric === "core")
    return {
      metric,
      title: coreDestroyed ? "CORE DURCHBRUCH" : "CORE-VORTEIL",
      detail: coreDestroyed
        ? "Ein zerstörter Core beendet das Gefecht sofort."
        : "Nach Ablauf der Zeit entschied der höhere Core-Stand.",
      rows,
    };
  if (metric === "territory")
    return {
      metric,
      title: "GEBIETSVORTEIL",
      detail: "Core-Stand war gleich; mehr kontrollierte Sektoren entschieden.",
      rows,
    };
  return {
    metric: "draw",
    title: "GLEICHSTAND",
    detail:
      bothCores || simultaneousControl
        ? "Beide Seiten erreichten das entscheidende Ziel gleichzeitig."
        : "Die vollständige Schlusswertung blieb ausgeglichen.",
    rows,
  };
}
