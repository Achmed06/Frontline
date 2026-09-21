import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLearning, advanceLearning } from './headquarters';
import { resolvedBaseLayout } from './base-layout';
import {
  canConstructOnPlot,
  canMoveBaseBuilding,
  constructOnPlot,
  moveBaseBuilding,
  visibleProject,
} from './base-construction';
import { Match } from './engine';
const metrics = { wins: 24, stars: 72, mastery: 20, lessons: 4 };

test('construction requires unlocked projects, free land and a real predecessor for upgrades', () => {
  const empty = normalizeLearning(null);
  assert.equal(constructOnPlot(empty, 'depot', 6, { ...metrics, wins: 0 }), empty);
  assert.equal(constructOnPlot(empty, 'depot', 12, metrics), empty);
  assert.equal(constructOnPlot(empty, 'depot', -1, metrics), empty);
  assert.equal(constructOnPlot(empty, 'depot', 25, metrics), empty);
  assert.equal(constructOnPlot(empty, 'supplyhub', 6, metrics), empty);
  const depot = constructOnPlot(empty, 'depot', 7, metrics);
  assert.deepEqual(depot.layout, { depot: 7 });
  assert.equal(constructOnPlot(depot, 'training', 7, metrics), depot);
  assert.equal(constructOnPlot(depot, 'supplyhub', 8, metrics), depot);
  const upgraded = constructOnPlot(depot, 'supplyhub', 7, metrics);
  assert.equal(visibleProject(upgraded, 'depot'), 'supplyhub');
  assert.deepEqual(upgraded.layout, { depot: 7 });
  assert.equal(constructOnPlot(upgraded, 'supplyhub', 7, metrics), upgraded);
});

test('moving an upgraded building preserves all progression and survives later matches', () => {
  let base = constructOnPlot(normalizeLearning(null), 'depot', 7, metrics);
  base = constructOnPlot(base, 'supplyhub', 7, metrics);
  base = constructOnPlot(base, 'training', 9, metrics);
  assert.equal(moveBaseBuilding(base, 'depot', 9), base);
  assert.equal(moveBaseBuilding(base, 'depot', 12), base);
  assert.equal(moveBaseBuilding(base, 'honor', 8), base);
  const moved = moveBaseBuilding(base, 'depot', 20);
  assert.deepEqual(moved.projects, base.projects);
  assert.deepEqual(moved.layout, { depot: 20, training: 9 });
  assert.deepEqual(normalizeLearning(JSON.parse(JSON.stringify(moved))), moved);
  const match = new Match({ botEnabled: false });
  match.state.phase = 'ended'; match.state.winner = 'player';
  assert.deepEqual(advanceLearning(moved, match.state, 'next').layout, moved.layout);
});

test('legacy bases keep their buildings and resolve missing or invalid locations without collisions', () => {
  const legacy = normalizeLearning({ projects: ['depot', 'training', 'relay', 'workshop', 'honor'] });
  assert.equal(legacy.layout, undefined);
  assert.equal(new Set(Object.values(resolvedBaseLayout(legacy.projects!))).size, 5);
  const repaired = normalizeLearning({ ...legacy, layout: { depot: 8, training: 8, relay: 12, workshop: 26, honor: '7', bogus: 0 } });
  assert.deepEqual(repaired.layout, { depot: 8 });
  const resolved = resolvedBaseLayout(repaired.projects!, repaired.layout);
  assert.equal(resolved.depot, 8);
  assert.equal(new Set(Object.values(resolved)).size, 5);
  assert.equal(Object.values(resolved).includes(12), false);
  assert.equal(normalizeLearning({ layout: { depot: 4 } }).layout, undefined);
});

test('placement helpers expose the exact rules used by the mobile builder', () => {
  const empty = normalizeLearning(null);
  assert.equal(canConstructOnPlot(empty, 'depot', 6, metrics), true);
  assert.equal(canConstructOnPlot(empty, 'depot', 12, metrics), false);
  assert.equal(
    canConstructOnPlot(empty, 'depot', 6, { ...metrics, wins: 0 }),
    false,
  );

  const depot = constructOnPlot(empty, 'depot', 6, metrics);
  assert.equal(canConstructOnPlot(depot, 'training', 6, metrics), false);
  assert.equal(canConstructOnPlot(depot, 'supplyhub', 6, metrics), true);
  assert.equal(canConstructOnPlot(depot, 'supplyhub', 7, metrics), false);

  assert.equal(canMoveBaseBuilding(depot, 'depot', 6), false);
  assert.equal(canMoveBaseBuilding(depot, 'depot', 12), false);
  assert.equal(canMoveBaseBuilding(depot, 'depot', 7), true);
});

