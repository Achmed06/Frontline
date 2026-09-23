import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DECK } from "./engine";
import { dailyChallenge, type DailyRecord } from "./daily-front";
import { newSeries } from "./series";
import {
  dailyPreparation,
  draftPreparation,
  seriesPreparation,
} from "./mode-preparation";

test("new series preparation exposes three-battle run and fixed loadout", () => {
  const prep = seriesPreparation(
    newSeries(DEFAULT_DECK, "atlas"),
    DEFAULT_DECK,
    "atlas",
  );
  assert.equal(prep.wins, 0);
  assert.equal(prep.livesRemaining, 2);
  assert.equal(prep.battle, 1);
  assert.equal(prep.commander, "ATLAS");
  assert.equal(prep.complete, false);
  assert.equal(prep.failed, false);
  assert.equal(prep.deckAverageCost > 0, true);
});

test("series progress clamps the visible next battle after completion", () => {
  const run = { ...newSeries(DEFAULT_DECK, "nova"), wins: 3 };
  const prep = seriesPreparation(run, DEFAULT_DECK, "atlas");
  assert.equal(prep.complete, true);
  assert.equal(prep.battle, 3);
  assert.equal(prep.commander, "NOVA");
});

test("daily preparation derives mode, territory, commanders and record status", () => {
  const challenge = dailyChallenge(new Date(2026, 8, 23));
  const record: DailyRecord = {
    key: challenge.key,
    attempts: 2,
    completed: true,
    bestTime: 120,
    bestCore: 70,
    bestPoints: 5,
  };
  const prep = dailyPreparation(challenge, record);
  assert.equal(
    prep.playerTerritory + prep.enemyTerritory + prep.neutralTerritory,
    9,
  );
  assert.equal(prep.attempts, 2);
  assert.equal(prep.complete, true);
  assert.equal(prep.playerAverageCost > 0, true);
  assert.equal(prep.enemyAverageCost > 0, true);
});

test("draft preparation moves from units to tactics to ready", () => {
  const units = ["vanguard", "bulwark", "ranger", "swarm", "lancer", "medic"] as const;
  const unitPrep = draftPreparation(units.slice(0, 3));
  assert.equal(unitPrep.phase, "units");
  assert.equal(unitPrep.nextSlot, "EINHEIT 4/6");

  const tacticPrep = draftPreparation(units);
  assert.equal(tacticPrep.phase, "abilities");
  assert.equal(tacticPrep.nextSlot, "TAKTIK 1/2");

  const ready = draftPreparation([...units, "pulse", "rally"]);
  assert.equal(ready.phase, "ready");
  assert.equal(ready.phaseLabel, "EINSATZBEREIT");
  assert.equal(ready.picked, 8);
});

test("draft preparation ignores unknown values instead of faking progress", () => {
  const prep = draftPreparation(["vanguard", "bogus" as never]);
  assert.equal(prep.picked, 1);
  assert.equal(prep.unitCount, 1);
  assert.equal(prep.abilityCount, 0);
});
