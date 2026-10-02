import type { ControlObjective, MatchState } from "./engine";
import { matchRhythm } from "./match-rhythm";
import { midgameHandoff } from "./midgame-handoff";
import { playerActionCount } from "./second-action-read";

/** Shared neutral guidance for both selection changes and live HUD refreshes. */
export function arenaGuidance(
  state: MatchState,
  objective?: ControlObjective | null,
): string {
  if (state.points.some((point) => point.owner === "player" && !point.supplied))
    return "VERSORGUNG UNTERBROCHEN";
  if (state.points.some((point) => point.contested))
    return "PUNKT UMKÄMPFT";
  if (objective) return "HALTE DIE MARKIERTEN RELAIS";

  const rhythm = matchRhythm(state);
  // A damaged Core can escalate the match before the opening timer expires.
  if (rhythm.stage === "pressure" || rhythm.stage === "climax")
    return rhythm.neutralTip;

  const handoff = rhythm.stage === "opening"
    ? midgameHandoff(state, playerActionCount(state))
    : null;
  if (handoff?.kind === "rebuild") return handoff.tip;
  if (state.points.filter((point) => point.owner === "player").length >= 6)
    return "ERREICHE DEN GEGNERISCHEN CORE";
  return handoff?.tip ?? rhythm.neutralTip;
}
