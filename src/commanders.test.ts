import test from "node:test";
import assert from "node:assert/strict";
import { Match, DEFAULT_DECK } from "./engine";
import {
  COMMANDERS,
  commanderActiveSeconds,
  commanderCooldownProgress,
  commanderHasValidTarget,
  commanderOutcome,
  commanderOutcomeText,
  commanderStatusText,
  commanderUnavailableText,
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
  assert.equal(commanderStatusText("atlas", 0, [], "enemy"), "TRUPP FEHLT");
});

test("commander readiness requires a real target instead of only zero cooldown", () => {
  const healthy = [
    { team: "player" as const, hp: 120, maxHp: 120, shieldTime: 0, rallyTime: 0, slowTime: 0 },
  ];
  assert.equal(commanderHasValidTarget("atlas", healthy), true);
  assert.equal(commanderHasValidTarget("nova", healthy), true);
  assert.equal(commanderHasValidTarget("lyra", healthy), false);
  assert.equal(commanderStatusText("lyra", 0, healthy), "ALLE INTAKT");
  assert.equal(commanderUnavailableText("lyra", healthy), "ALLE INTAKT");

  const wounded = [{ ...healthy[0], hp: 70 }];
  assert.equal(commanderHasValidTarget("lyra", wounded), true);
  assert.equal(commanderStatusText("lyra", 0, wounded), "BEREIT");

  const slowed = [{ ...healthy[0], slowTime: 2.5 }];
  assert.equal(commanderHasValidTarget("lyra", slowed), true);

  const boosted = [{ ...healthy[0], rallyTime: COMMANDERS.nova.duration }];
  assert.equal(commanderHasValidTarget("nova", boosted), false);
  assert.equal(commanderStatusText("nova", 0, boosted), "AKTIV 6s");

  const dead = [{ ...healthy[0], hp: 0 }];
  assert.equal(commanderHasValidTarget("atlas", dead), false);
  assert.equal(commanderStatusText("atlas", 0, dead), "TRUPP FEHLT");
  assert.equal(commanderUnavailableText("nova", dead), "TRUPP FEHLT");
});


test("commander cooldown progress is clamped and reaches one at readiness", () => {
  assert.equal(commanderCooldownProgress(30, 30), 0);
  assert.equal(commanderCooldownProgress(15, 30), 0.5);
  assert.equal(commanderCooldownProgress(0, 30), 1);
  assert.equal(commanderCooldownProgress(-2, 30), 1);
  assert.equal(commanderCooldownProgress(40, 30), 0);
  assert.equal(commanderCooldownProgress(5, 0), 0);
  assert.equal(commanderCooldownProgress(0, 0), 1);
});

test("commander outcome preview reports exact shield, heal, cleanse and tempo totals", () => {
  const units = [
    {
      team: "player" as const,
      hp: 40,
      maxHp: 125,
      shield: 0,
      shieldTime: 0,
      rallyTime: 0,
      slowTime: 3,
    },
    {
      team: "player" as const,
      hp: 100,
      maxHp: 125,
      shield: 50,
      shieldTime: 2,
      rallyTime: 5,
      slowTime: 0,
    },
    {
      team: "player" as const,
      hp: 125,
      maxHp: 125,
      shield: 80,
      shieldTime: 4,
      rallyTime: 6,
      slowTime: 0,
    },
    {
      team: "enemy" as const,
      hp: 20,
      maxHp: 125,
      shield: 0,
      shieldTime: 0,
      rallyTime: 0,
      slowTime: 4,
    },
  ];

  assert.deepEqual(commanderOutcome("atlas", units), {
    affected: 3,
    shieldGain: 90,
    healing: 0,
    cleanses: 0,
    tempoUnits: 0,
  });
  assert.equal(commanderOutcomeText("atlas", units), "SCHILD 3 · +90");

  assert.deepEqual(commanderOutcome("lyra", units), {
    affected: 2,
    shieldGain: 0,
    healing: 105,
    cleanses: 1,
    tempoUnits: 0,
  });
  assert.equal(commanderOutcomeText("lyra", units), "+105 HP · CLEANSE 1");

  assert.deepEqual(commanderOutcome("nova", units), {
    affected: 2,
    shieldGain: 0,
    healing: 0,
    cleanses: 0,
    tempoUnits: 2,
  });
  assert.equal(commanderOutcomeText("nova", units), "TEMPO 2 · 6s");

  const fullyShielded = units.slice(0, 2).map((unit) => ({
    ...unit,
    shield: COMMANDERS.atlas.shield,
  }));
  assert.equal(
    commanderOutcomeText("atlas", fullyShielded),
    "SCHILD 2 · REFRESH",
  );
});

test("commander execution consumes the same eligibility as its preview", () => {
  const lyra = new Match({ playerCommander: "lyra", botEnabled: false });
  lyra.play("player", "vanguard", 210, 450);
  lyra.play("player", "ranger", 240, 450);
  const first = lyra.state.units[0];
  const second = lyra.state.units[1];
  Object.assign(first, { hp: 50, slowTime: 2, slowFactor: 0.6 });
  second.hp = second.maxHp - 10;
  const before = commanderOutcome("lyra", lyra.state.units);
  assert.deepEqual(before, {
    affected: 2,
    shieldGain: 0,
    healing: 85,
    cleanses: 1,
    tempoUnits: 0,
  });
  const result = lyra.activateCommander();
  assert.equal(result.ok, true);
  assert.equal(first.hp, first.maxHp);
  assert.equal(first.slowTime, 0);
  assert.equal(first.slowFactor, 1);
  assert.equal(second.hp, second.maxHp);
  assert.deepEqual(
    lyra.state.effects
      .filter((effect) => effect.type === "heal")
      .map((effect) => effect.value),
    [75, 10],
  );
  assert.match(result.message, /\+85 HP · CLEANSE 1/);

  const atlas = new Match({ playerCommander: "atlas", botEnabled: false });
  atlas.play("player", "vanguard", 210, 450);
  atlas.state.units[0].shield = 50;
  const atlasPreview = commanderOutcome("atlas", atlas.state.units);
  assert.equal(atlasPreview.shieldGain, 20);
  const atlasResult = atlas.activateCommander();
  assert.equal(atlasResult.ok, true);
  assert.equal(atlas.state.units[0].shield, COMMANDERS.atlas.shield);
  assert.equal(
    atlas.state.effects.find((effect) => effect.type === "shield")?.value,
    20,
  );
  assert.match(atlasResult.message, /SCHILD 1 · \+20/);

  const nova = new Match({ playerCommander: "nova", botEnabled: false });
  nova.play("player", "vanguard", 210, 450);
  nova.play("player", "ranger", 240, 450);
  nova.state.units[1].rallyTime = COMMANDERS.nova.duration;
  assert.equal(commanderOutcome("nova", nova.state.units).tempoUnits, 1);
  const novaResult = nova.activateCommander();
  assert.equal(novaResult.ok, true);
  assert.equal(nova.state.units[0].rallyTime, COMMANDERS.nova.duration);
  assert.equal(nova.state.units[1].rallyTime, COMMANDERS.nova.duration);
  assert.match(novaResult.message, /TEMPO 1 · 6s/);
});

