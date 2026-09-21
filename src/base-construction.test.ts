import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLearning, advanceLearning } from './headquarters';
import {
  COMMAND_PLOT,
  baseFacing,
  baseRoadEdges,
  resolvedBaseLayout,
} from './base-layout';
import {
  canConstructOnPlot,
  canMoveBaseBuilding,
  constructOnPlot,
  moveBaseBuilding,
  rotateBaseBuilding,
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

test('building facing is cosmetic, persistent and only valid for built roots', () => {
  const empty = normalizeLearning(null);
  assert.equal(rotateBaseBuilding(empty, 'depot'), empty);

  let base = constructOnPlot(empty, 'depot', 7, metrics);
  assert.equal(baseFacing(base.facings, 'depot'), 0);

  base = rotateBaseBuilding(base, 'depot');
  assert.equal(baseFacing(base.facings, 'depot'), 1);
  assert.deepEqual(base.facings, { depot: 1 });

  const moved = moveBaseBuilding(base, 'depot', 20);
  assert.equal(baseFacing(moved.facings, 'depot'), 1);

  const upgraded = constructOnPlot(moved, 'supplyhub', 20, metrics);
  assert.equal(baseFacing(upgraded.facings, 'depot'), 1);

  const roundtrip = normalizeLearning(JSON.parse(JSON.stringify(upgraded)));
  assert.deepEqual(roundtrip, upgraded);

  const restoredDefault = rotateBaseBuilding(upgraded, 'depot');
  assert.equal(baseFacing(restoredDefault.facings, 'depot'), 0);
  assert.equal(restoredDefault.facings, undefined);

  const sanitized = normalizeLearning({
    projects: ['depot'],
    layout: { depot: 7 },
    facings: { depot: 1, training: 1, relay: 0, bogus: 1 },
  });
  assert.deepEqual(sanitized.facings, { depot: 1 });
});

test('automatic base roads form one deterministic shared network to command', () => {
  const layout = resolvedBaseLayout(
    ['depot', 'training', 'relay', 'workshop', 'honor'],
  );
  const edges = baseRoadEdges(layout);
  assert.deepEqual(edges, [
    [2, 3],
    [2, 7],
    [6, 7],
    [7, 8],
    [7, 12],
    [12, 17],
    [16, 17],
    [17, 18],
  ]);

  const edgeKeys = new Set(edges.map(([a, b]) => `${a}-${b}`));
  assert.equal(edgeKeys.size, edges.length);
  for (const [a, b] of edges) {
    const rowDistance = Math.abs(Math.floor(a / 5) - Math.floor(b / 5));
    const colDistance = Math.abs((a % 5) - (b % 5));
    assert.equal(rowDistance + colDistance, 1);
  }

  for (const start of Object.values(layout)) {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      for (const [a, b] of edges) {
        const next = a === current ? b : b === current ? a : undefined;
        if (next !== undefined && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    assert.equal(seen.has(COMMAND_PLOT), true);
  }

  const moved = { ...layout, depot: 24 };
  assert.notDeepEqual(baseRoadEdges(moved), edges);
});

