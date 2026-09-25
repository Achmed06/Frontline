import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "./engine";
import { openingLaneReads } from "./opening-lane-read";

test("neutral opening explains the center-versus-flank tradeoff", () => {
  const match = new Match({ botEnabled: false });
  const reads = openingLaneReads(match.state);
  assert.deepEqual(
    reads?.map(({ role, label }) => ({ role, label })),
    [
      { role: "flank", label: "FLANKE" },
      { role: "direct", label: "DIREKT" },
      { role: "flank", label: "FLANKE" },
    ],
  );
  assert.match(reads?.[1].detail ?? "", /TURRET FRÜH/);
  assert.match(reads?.[0].detail ?? "", /TURRET SPÄTER/);
});

test("control objectives override generic lane roles", () => {
  const match = new Match({ botEnabled: false });
  const reads = openingLaneReads(match.state, {
    pointIds: [3, 5],
    requiredPoints: 1,
    seconds: 45,
  });
  assert.equal(reads?.[0].role, "objective");
  assert.equal(reads?.[1].role, "direct");
  assert.equal(reads?.[2].role, "objective");
});

test("actual enemy presence is more important than objective labeling", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("enemy", "vanguard", 335, 180).ok, true);
  const reads = openingLaneReads(match.state, {
    pointIds: [5],
    requiredPoints: 1,
    seconds: 45,
  });
  assert.equal(reads?.[2].role, "contact");
  assert.equal(reads?.[2].label, "KONTAKT");
});

test("dead enemies do not create false contact reads", () => {
  const match = new Match({ botEnabled: false });
  assert.equal(match.play("enemy", "vanguard", 85, 180).ok, true);
  match.state.units[0].hp = 0;
  const reads = openingLaneReads(match.state);
  assert.equal(reads?.[0].role, "flank");
});

test("opening lane coaching disappears after twenty seconds", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = 20;
  assert.ok(openingLaneReads(match.state));
  match.state.time = 20.01;
  assert.equal(openingLaneReads(match.state), null);
});

test("malformed time fails closed instead of leaving permanent coaching", () => {
  const match = new Match({ botEnabled: false });
  match.state.time = Number.NaN;
  assert.equal(openingLaneReads(match.state), null);
});
