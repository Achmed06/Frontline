import test from "node:test";
import assert from "node:assert/strict";
import { Match } from "./engine";
import {
  normalizeLearning,
  advanceLearning,
  completedLessons,
  baseStage,
  styleUnlocked,
  baseProjectBuilt,
  baseProjectProgress,
  buildBaseProject,
  headquartersSvg,
} from "./headquarters";
test("permanent learning rewards require finished matches, survive saves, and never double grant", () => {
  const m = new Match({ botEnabled: false });
  const empty = normalizeLearning(null);
  Object.assign(m.state.stats, { deployed: 3, captured: 1, abilities: 1 });
  assert.equal(advanceLearning(empty, m.state, "a"), empty);
  m.state.phase = "ended";
  m.state.winner = "enemy";
  const first = advanceLearning(empty, m.state, "a");
  assert.equal(completedLessons(first), 3);
  assert.equal(styleUnlocked("aurora", first, 0), false);
  assert.equal(advanceLearning(first, m.state, "a"), first);
  m.state.winner = "player";
  const complete = advanceLearning(first, m.state, "b");
  assert.equal(styleUnlocked("aurora", complete, 0), true);
  complete.style = "aurora";
  assert.deepEqual(
    normalizeLearning(JSON.parse(JSON.stringify(complete))),
    complete,
  );
  assert.equal(baseStage(0), 0);
  assert.equal(baseStage(1), 1);
  assert.equal(baseStage(6), 3);
  assert.equal(baseStage(18), 5);
  assert.equal(baseStage(23), 5);
  assert.equal(baseStage(24), 6);
  assert.equal(styleUnlocked("ember", complete, 5), false);
  assert.equal(styleUnlocked("ember", complete, 6), true);
  assert.deepEqual(
    normalizeLearning({
      counts: { deploy: -1, capture: Infinity },
      style: "bad",
    }),
    empty,
  );
});


test("headquarters projects unlock from existing progression and persist without combat power", () => {
  const progress = normalizeLearning(null);
  const early = { wins: 2, mastery: 2, lessons: 3, stars: 20 };

  assert.equal(baseProjectProgress("depot", early).ready, false);
  assert.equal(buildBaseProject(progress, "depot", early), progress);

  const ready = { wins: 3, mastery: 3, lessons: 4, stars: 24 };
  const depot = buildBaseProject(progress, "depot", ready);
  assert.equal(baseProjectBuilt(depot, "depot"), true);
  assert.deepEqual(depot.projects, ["depot"]);

  const training = buildBaseProject(depot, "training", ready);
  const relay = buildBaseProject(training, "relay", ready);
  const workshop = buildBaseProject(relay, "workshop", ready);
  assert.deepEqual(workshop.projects, ["depot", "training", "relay", "workshop"]);
  assert.equal(baseProjectBuilt(workshop, "honor"), false);

  const honor = buildBaseProject(workshop, "honor", { ...ready, wins: 18 });
  assert.equal(baseProjectBuilt(honor, "honor"), true);
  assert.deepEqual(
    normalizeLearning(JSON.parse(JSON.stringify(honor))),
    honor,
  );
});

test("headquarters project normalization drops unknown and duplicate project ids", () => {
  const normalized = normalizeLearning({
    counts: { deploy: 0, capture: 0, ability: 0, win: 0 },
    style: "field",
    lastMatch: "",
    projects: ["relay", "relay", "bad", "depot"],
  });
  assert.deepEqual(normalized.projects, ["depot", "relay"]);
});


test("headquarters patrols only appear for mastered units after the training ground is built", () => {
  const withoutTraining = headquartersSvg(3, "#a3efd0", [], [
    "vanguard",
    "ranger",
  ]);
  assert.equal(withoutTraining.includes("hq-patrol"), false);

  const withTraining = headquartersSvg(3, "#a3efd0", ["training"], [
    "vanguard",
    "ranger",
    "swarm",
    "medic",
    "mortar",
  ]);
  assert.equal((withTraining.match(/hq-patrol hq-patrol-/g) ?? []).length, 4);
  assert.equal(withTraining.includes("hq-patrol-1"), true);
  assert.equal(withTraining.includes("hq-patrol-4"), true);
});


test("second-tier headquarters projects require their predecessor even when metrics are already high", () => {
  const metrics = { wins: 24, mastery: 30, lessons: 4, stars: 72 };
  const empty = normalizeLearning(null);

  assert.equal(buildBaseProject(empty, "supplyhub", metrics), empty);
  assert.equal(buildBaseProject(empty, "barracks", metrics), empty);
  assert.equal(buildBaseProject(empty, "watchtower", metrics), empty);
  assert.equal(buildBaseProject(empty, "dronepad", metrics), empty);
  assert.equal(buildBaseProject(empty, "monument", metrics), empty);

  const depot = buildBaseProject(empty, "depot", metrics);
  const supplyhub = buildBaseProject(depot, "supplyhub", metrics);
  assert.equal(baseProjectBuilt(supplyhub, "supplyhub"), true);

  const training = buildBaseProject(supplyhub, "training", metrics);
  const barracks = buildBaseProject(training, "barracks", metrics);
  assert.equal(baseProjectBuilt(barracks, "barracks"), true);

  const relay = buildBaseProject(barracks, "relay", metrics);
  const watchtower = buildBaseProject(relay, "watchtower", metrics);
  assert.equal(baseProjectBuilt(watchtower, "watchtower"), true);

  const workshop = buildBaseProject(watchtower, "workshop", metrics);
  const dronepad = buildBaseProject(workshop, "dronepad", metrics);
  assert.equal(baseProjectBuilt(dronepad, "dronepad"), true);

  const honor = buildBaseProject(dronepad, "honor", metrics);
  const monument = buildBaseProject(honor, "monument", metrics);
  assert.equal(baseProjectBuilt(monument, "monument"), true);

  assert.deepEqual(
    normalizeLearning(JSON.parse(JSON.stringify(monument))),
    monument,
  );
});

test("second-tier projects add visible structures to headquarters art only after construction", () => {
  const base = headquartersSvg(6, "#a3efd0", [
    "depot",
    "training",
    "relay",
    "workshop",
    "honor",
  ]);
  const expanded = headquartersSvg(6, "#a3efd0", [
    "depot",
    "training",
    "relay",
    "workshop",
    "honor",
    "supplyhub",
    "barracks",
    "watchtower",
    "dronepad",
    "monument",
  ]);
  assert.ok(expanded.length > base.length + 500);
  assert.notEqual(expanded, base);
});
