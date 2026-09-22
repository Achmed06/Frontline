import assert from "node:assert/strict";
import test from "node:test";
import {
  MATCH_END_SEQUENCE_MS,
  matchEndVisual,
} from "./match-end-visual";

const state = (
  winner: "player" | "enemy" | "draw" | null,
  playerHp: number,
  enemyHp: number,
  reason = "Zeitentscheidung.",
  phase: "playing" | "overtime" | "ended" = "ended",
) => ({
  phase,
  winner,
  reason,
  cores: {
    player: { x: 210, y: 525, hp: playerHp, maxHp: 2300 },
    enemy: { x: 210, y: 35, hp: enemyHp, maxHp: 2300 },
  },
});

test("match end sequence keeps the shared 850 ms presentation window", () => {
  assert.equal(MATCH_END_SEQUENCE_MS, 850);
});

test("match end visual stays hidden before the match ends", () => {
  assert.equal(
    matchEndVisual(state(null, 2300, 2300, "", "playing")),
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
    metric: "core-break",
  });
  assert.deepEqual(matchEndVisual(state("enemy", 0, 1200)), {
    kind: "defeat",
    title: "STELLUNG GEFALLEN",
    subtitle: "DEIN CORE WURDE ZERSTÖRT",
    focus: "player",
    coreBreak: true,
    metric: "core-break",
  });
});

test("simultaneous Core destruction gets a neutral collapse presentation", () => {
  assert.deepEqual(matchEndVisual(state("draw", 0, 0)), {
    kind: "draw",
    title: "BEIDE CORES GEFALLEN",
    subtitle: "KEINE SEITE HÄLT DIE FRONT",
    focus: "center",
    coreBreak: true,
    metric: "core-break",
  });
});

test("completed relay objectives get explicit victory, defeat and draw copy", () => {
  assert.deepEqual(
    matchEndVisual(
      state("player", 1400, 1500, "Kontrollziel erreicht."),
    ),
    {
      kind: "victory",
      title: "RELAIS GESICHERT",
      subtitle: "KONTROLLZIEL ABGESCHLOSSEN",
      focus: "center",
      coreBreak: false,
      metric: "relay",
    },
  );
  assert.equal(
    matchEndVisual(
      state("enemy", 1400, 1500, "Kontrollziel erreicht."),
    )?.title,
    "RELAIS VERLOREN",
  );
  assert.deepEqual(
    matchEndVisual(
      state(
        "draw",
        1400,
        1500,
        "Beide Kontrollziele gleichzeitig erreicht.",
      ),
    ),
    {
      kind: "draw",
      title: "RELAIS GLEICHSTAND",
      subtitle: "BEIDE KONTROLLZIELE ERREICHT",
      focus: "center",
      coreBreak: false,
      metric: "relay",
    },
  );
});

test("time-limit decisions expose the exact deciding metric", () => {
  assert.equal(
    matchEndVisual(
      state("player", 1400, 1400, "Zeitlimit: mehr Kontrollzeit."),
    )?.metric,
    "control-time",
  );
  assert.equal(
    matchEndVisual(
      state("enemy", 900, 1400, "Zeitlimit: höhere Kern-HP."),
    )?.title,
    "CORE-NACHTEIL",
  );
  assert.equal(
    matchEndVisual(
      state("player", 1400, 1400, "Zeitlimit: mehr Kontrollpunkte."),
    )?.title,
    "FRONTMEHRHEIT",
  );
});

test("full score ties remain neutral and unknown reasons stay available", () => {
  assert.deepEqual(
    matchEndVisual(
      state("draw", 1400, 1400, "Gleiche Kern-HP und Kontrollpunkte."),
    ),
    {
      kind: "draw",
      title: "FRONT FESTGEFAHREN",
      subtitle: "CORE UND GEBIET GLEICH",
      focus: "center",
      coreBreak: false,
      metric: "draw",
    },
  );
  assert.deepEqual(matchEndVisual(state("player", 1400, 900)), {
    kind: "victory",
    title: "FRONT GESICHERT",
    subtitle: "ZEITENTSCHEIDUNG.",
    focus: "center",
    coreBreak: false,
    metric: "other",
  });
});
