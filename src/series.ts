import { isCommanderId, type CommanderId } from "./commanders";
/** New local three-battle challenge, using the existing mission combat rules. */
import { MISSIONS } from "./campaign";
import { isValidDeck, type CardId, type MatchState } from "./engine";
export const SERIES_ROUTES = [
  ["bridgehead", "crossfire"],
  ["dead-zone", "scatter"],
  ["firewall", "counter-battery"],
].map((ids) =>
  ids.map((id) => {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) throw new Error(`Missing series route: ${id}`);
    return mission;
  }),
);
export const SERIES_STAGES = SERIES_ROUTES.map((routes) => routes[0]);
export const SERIES_LIVES = 2;
export type SeriesRun = {
  deck: CardId[];
  commander: CommanderId;
  wins: number;
  losses: number;
  route: string | null;
};
export function newSeries(
  deck: readonly CardId[],
  commander: CommanderId = "atlas",
): SeriesRun {
  if (!isCommanderId(commander)) throw new Error("Invalid commander");
  if (!isValidDeck(deck)) throw new Error("Invalid series deck");
  return { deck: [...deck], commander, wins: 0, losses: 0, route: null };
}
export function seriesEnded(run: SeriesRun): boolean {
  return run.wins === SERIES_STAGES.length || run.losses === SERIES_LIVES;
}
export function normalizeSeries(value: unknown): SeriesRun | null {
  if (!value || typeof value !== "object") return null;
  const r = value as SeriesRun;
  if (
    !isValidDeck(r.deck) ||
    !Number.isInteger(r.wins) ||
    r.wins < 0 ||
    r.wins > SERIES_STAGES.length ||
    !Number.isInteger(r.losses) ||
    r.losses < 0 ||
    r.losses > SERIES_LIVES ||
    (r.wins === SERIES_STAGES.length && r.losses === SERIES_LIVES)
  )
    return null;
  const commander = r.commander === undefined ? "atlas" : r.commander;
  if (!isCommanderId(commander)) return null;
  const route = r.route ?? null;
  if (
    route !== null &&
    (typeof route !== "string" ||
      !SERIES_ROUTES[r.wins]?.some((m) => m.id === route) ||
      seriesEnded(r))
  )
    return null;
  return {
    deck: [...r.deck],
    commander,
    wins: r.wins,
    losses: r.losses,
    route,
  };
}
export function chooseSeriesRoute(
  run: SeriesRun,
  missionId: string,
): SeriesRun {
  if (
    seriesEnded(run) ||
    !SERIES_ROUTES[run.wins].some((m) => m.id === missionId)
  )
    throw new Error("Invalid series route");
  return { ...run, deck: [...run.deck], route: missionId };
}
export function completeSeriesBattle(
  run: SeriesRun,
  state: MatchState,
): SeriesRun {
  if (
    seriesEnded(run) ||
    state.phase !== "ended" ||
    !state.winner ||
    state.winner === "draw"
  )
    return run;
  return {
    ...run,
    deck: [...run.deck],
    route: null,
    wins: run.wins + Number(state.winner === "player"),
    losses: run.losses + Number(state.winner === "enemy"),
  };
}
