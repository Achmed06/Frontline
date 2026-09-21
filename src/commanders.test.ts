import test from "node:test";
import assert from "node:assert/strict";
import { Match, DEFAULT_DECK } from "./engine";
import {
  COMMANDERS,
  commanderActiveSeconds,
  commanderHasValidTarget,
  commanderStatusText,
} from "./commanders";
import { newSeries, normalizeSeries, chooseSeriesRoute } from "./series";

test("LYRA heals and cleanses only living allies, never wastes cooldown on a full healthy army", () => {
  const m = new Match({ playerCommander: "lyra", botEnabled: false });
  assert.equal(m.commanders.enemy, "lyra");
  assert.equal(m.activateCommander().ok, false);
  m.play("player", "vanguard", 210, 450);
  m.play("enemy", "vanguard", 210, 110);
  const ally = m.state.units[0],
    enemy = m.state.units[1];
  assert.equal(m.activateCommander().ok, false);
  assert.equal(m.state.commanderCooldown, 0);
  Object.assign(ally, { hp: 30, slowTime: 4, slowFactor: 0.6 });
  enemy.hp = 30;
  m.state.cores.player.hp = 900;
  const energy = m.state.energy.player;
  assert.equal(m.activateCommander().ok, true);
  assert.equal(ally.hp, 110);
  assert.equal(ally.slowTime, 0);
  assert.equal(ally.slowFactor, 1);
  assert.equal(enemy.hp, 30);
  assert.equal(m.state.cores.player.hp, 900);
  assert.equal(m.state.energy.player, energy);
  assert.equal(m.state.commanderCooldown, 35);
  assert.equal(m.activateCommander().ok, false);
  m.state.commanderCooldown = 0;
  assert.equal(m.activateCommander().ok, true);
  assert.equal(ally.hp, 125);
});
test("series retains commander choice and migrates legacy saves to ATLAS", () => {
  const run = chooseSeriesRoute(newSeries(DEFAULT_DECK, "lyra"), "bridgehead");
  assert.equal(run.commander, "lyra");
  assert.deepEqual(normalizeSeries(JSON.parse(JSON.stringify(run))), run);
  const { commander: _id, ...legacy } = run;
  assert.equal(normalizeSeries(legacy)?.commander, "atlas");
  assert.equal(normalizeSeries({ ...run, commander: "fake" }), null);
  assert.equal(new Match().commanders.player, "atlas");
});

test("commander active timer reflects only the live team-wide duration", () => {
  const units = [
    { team: "player" as const, hp: 100, maxHp: 100, shieldTime: 4.2, rallyTime: 0, slowTime: 0 },
    { team: "player" as const, hp: 80, maxHp: 100, shieldTime: 2.4, rallyTime: 5.1, slowTime: 0 },
    { team: "enemy" as const, hp: 100, maxHp: 100, shieldTime: 5.8, rallyTime: 5.9, slowTime: 0 },
    { team: "player" as const, hp: 0, maxHp: 100, shieldTime: 6, rallyTime: 6, slowTime: 0 },
  ];
  assert.equal(commanderActiveSeconds("atlas", units), 4.2);
  assert.equal(commanderActiveSeconds("nova", units), 5.1);
  assert.equal(commanderActiveSeconds("atlas", units, "enemy"), 5.8);
  assert.equal(commanderActiveSeconds("lyra", units), 0);
});

test("commander status text prioritizes active effect, then cooldown, then ready", () => {
  const units = [
    { team: "player" as const, hp: 100, maxHp: 100, shieldTime: 4.2, rallyTime: 0, slowTime: 0 },
    { team: "enemy" as const, hp: 100, maxHp: 100, shieldTime: 0, rallyTime: 5.1, slowTime: 0 },
  ];
  assert.equal(commanderStatusText("atlas", 28.4, units), "AKTIV 5s");
  assert.equal(commanderStatusText("lyra", 12.2, units), "13s");
  assert.equal(commanderStatusText("nova", 0, units, "enemy"), "AKTIV 6s");
  assert.equal(commanderStatusText("atlas", 0, [], "enemy"), "KEIN ZIEL");
});

test("commander readiness requires a real target instead of only zero cooldown", () => {
  const healthy = [
    { team: "player" as const, hp: 120, maxHp: 120, shieldTime: 0, rallyTime: 0, slowTime: 0 },
  ];
  assert.equal(commanderHasValidTarget("atlas", healthy), true);
  assert.equal(commanderHasValidTarget("nova", healthy), true);
  assert.equal(commanderHasValidTarget("lyra", healthy), false);
  assert.equal(commanderStatusText("lyra", 0, healthy), "KEIN ZIEL");

  const wounded = [{ ...healthy[0], hp: 70 }];
  assert.equal(commanderHasValidTarget("lyra", wounded), true);
  assert.equal(commanderStatusText("lyra", 0, wounded), "BEREIT");

  const slowed = [{ ...healthy[0], slowTime: 2.5 }];
  assert.equal(commanderHasValidTarget("lyra", slowed), true);

  const boosted = [{ ...healthy[0], rallyTime: COMMANDERS.nova.duration }];
  assert.equal(commanderHasValidTarget("nova", boosted), false);
  assert.equal(commanderStatusText("nova", 0, boosted), "KEIN ZIEL");

  const dead = [{ ...healthy[0], hp: 0 }];
  assert.equal(commanderHasValidTarget("atlas", dead), false);
});
