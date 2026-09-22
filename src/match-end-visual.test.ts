import assert from "node:assert/strict";
import test from "node:test";
import { matchEndVisual } from "./match-end-visual";

const state = (
  winner: "player" | "enemy" | "draw" | null,
  playerHp: number,
  enemyHp: number,
  phase: "playing" | "overtime" | "ended" = "ended",
) => ({
  phase,
  winner,
  reason: "Zeitentscheidung.",
  cores: {
    player: { x: 210, y: 525, hp: playerHp, maxHp: 2300 },
    enemy: { x: 210, y: 35, hp: enemyHp, maxHp: 2300 },
  },
});

test("match end visual stays hidden before the match ends", () => {
  assert.equal(
    matchEndVisual(state(null, 2300, 2300, "playing")),
    null,
  );
});

test("core victory and defeat focus the actually destroyed Core", () => {
  assert.deepEqual(matchEndVisual(state("player", 900, 0)), {
    kind: "victory",
    title: "FRONT DURCHBROCHEN",
    subtitle: "GEGNERISCHER CORE GEFALLEN",
    focus: "enemy",
    coreBreak: true,
  });
  assert.deepEqual(matchEndVisual(state("enemy", 0, 1200)), {
    kind: "defeat",
    title: "STELLUNG GEFALLEN",
    subtitle: "DEIN CORE WURDE ZERSTÖRT",
    focus: "player",
    coreBreak: true,
  });
});

test("simultaneous Core destruction gets a neutral collapse presentation", () => {
  assert.deepEqual(matchEndVisual(state("draw", 0, 0)), {
    kind: "draw",
    title: "BEIDE CORES GEFALLEN",
    subtitle: "KEINE SEITE HÄLT DIE FRONT",
    focus: "center",
    coreBreak: true,
  });
});

test("non-Core endings retain the engine reason without faking destruction", () => {
  assert.deepEqual(matchEndVisual(state("player", 1400, 900)), {
    kind: "victory",
    title: "FRONT GESICHERT",
    subtitle: "ZEITENTSCHEIDUNG.",
    focus: "center",
    coreBreak: false,
  });
  assert.deepEqual(matchEndVisual(state("draw", 1400, 1400)), {
    kind: "draw",
    title: "FRONT FESTGEFAHREN",
    subtitle: "ZEITENTSCHEIDUNG.",
    focus: "center",
    coreBreak: false,
  });
});
