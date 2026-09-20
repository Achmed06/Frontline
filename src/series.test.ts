import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DECK, Match } from "./engine";
import {
  SERIES_STAGES,
  SERIES_ROUTES,
  chooseSeriesRoute,
  newSeries,
  seriesEnded,
  normalizeSeries,
  completeSeriesBattle,
} from "./series";
import { readSeries, saveSeries } from "./storage";

test("series snapshots decks, advances only wins and ends after three victories or two defeats", () => {
  const deck = [...DEFAULT_DECK];
  let run = newSeries(deck);
  deck.reverse();
  assert.deepEqual(run.deck, DEFAULT_DECK);
  assert.deepEqual(
    SERIES_STAGES.map((s) => s.difficulty),
    ["rookie", "standard", "veteran"],
  );
  const m = new Match({ botEnabled: false });
  assert.equal(completeSeriesBattle(run, m.state), run);
  m.state.phase = "ended";
  m.state.winner = "draw";
  assert.equal(completeSeriesBattle(run, m.state), run);
  m.state.winner = "enemy";
  run = completeSeriesBattle(run, m.state);
  assert.equal(run.losses, 1);
  assert.equal(run.wins, 0);
  m.state.winner = "player";
  for (let i = 0; i < 3; i++) run = completeSeriesBattle(run, m.state);
  assert.ok(seriesEnded(run));
  assert.equal(run.wins, 3);
  assert.equal(completeSeriesBattle(run, m.state), run);
  m.state.winner = "enemy";
  const failed = completeSeriesBattle(
    completeSeriesBattle(newSeries(DEFAULT_DECK), m.state),
    m.state,
  );
  assert.ok(seriesEnded(failed));
  assert.equal(failed.losses, 2);
});

test("series storage validates and restores progress without changing saved decks", () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
    },
  });
  const run = { ...newSeries(DEFAULT_DECK), wins: 2, losses: 1 };
  assert.ok(saveSeries(run));
  assert.deepEqual(readSeries(), run);
  for (const invalid of [
    null,
    {},
    { ...run, wins: 4 },
    { ...run, losses: -1 },
    { ...run, deck: [] },
    { ...run, wins: 3, losses: 2 },
  ])
    assert.equal(normalizeSeries(invalid), null);
  data.set("frontline-series-v1", "broken");
  assert.equal(readSeries(), null);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    },
  });
  assert.equal(saveSeries(run), false);
  assert.equal(readSeries(), null);
  Reflect.deleteProperty(globalThis, "localStorage");
});

test("routes remain within the current stage and old saves migrate without losing progress", () => {
  const legacy = { deck: [...DEFAULT_DECK], wins: 1, losses: 1 };
  const run = normalizeSeries(legacy)!;
  assert.equal(run.route, null);
  assert.equal(run.wins, 1);
  assert.equal(run.losses, 1);
  assert.throws(() => chooseSeriesRoute(run, "firewall"));
  assert.throws(() => chooseSeriesRoute(run, "unknown"));
  const chosen = chooseSeriesRoute(run, "scatter");
  assert.equal(run.route, null);
  assert.deepEqual(normalizeSeries(JSON.parse(JSON.stringify(chosen))), chosen);
  assert.equal(normalizeSeries({ ...chosen, route: "firewall" }), null);
  const m = new Match({ botEnabled: false });
  m.state.phase = "ended";
  m.state.winner = "draw";
  assert.equal(completeSeriesBattle(chosen, m.state).route, "scatter");
  const alternate = chooseSeriesRoute(chosen, "dead-zone");
  assert.deepEqual(alternate.deck, chosen.deck);
  m.state.winner = "player";
  const next = completeSeriesBattle(alternate, m.state);
  assert.equal(next.wins, 2);
  assert.equal(next.route, null);
  assert.throws(() => chooseSeriesRoute(next, "dead-zone"));
  m.state.winner = "enemy";
  const failed = completeSeriesBattle(chosen, m.state);
  assert.equal(failed.route, null);
  assert.throws(() => chooseSeriesRoute(failed, "scatter"));
});
test("all six route options start with their own deck, front and goal at the expected difficulty", () => {
  for (const [index, routes] of SERIES_ROUTES.entries()) {
    assert.equal(routes.length, 2);
    assert.equal(new Set(routes.map((m) => m.id)).size, 2);
    for (const route of routes) {
      assert.equal(route.difficulty, ["rookie", "standard", "veteran"][index]);
      const m = new Match({
        playerDeck: DEFAULT_DECK,
        enemyDeck: route.enemyDeck,
        startingOwners: route.owners,
        controlObjective: route.controlObjective,
        difficulty: route.difficulty,
      });
      assert.deepEqual(m.decks.enemy, route.enemyDeck);
      assert.deepEqual(
        m.state.points.map((p) => p.owner),
        route.owners,
      );
      assert.deepEqual(m.controlObjective, route.controlObjective ?? null);
    }
  }
});
