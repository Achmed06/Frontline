import assert from "node:assert/strict";
import test from "node:test";
import {
  COMBAT_CONTACT_RESET_SECONDS,
  combatContactKey,
  combatContactVisual,
  isFreshCombatContact,
  strongestCombatContact,
} from "./combat-contact";

test("combat contact uses an undirected source-target pair key", () => {
  const a = combatContactKey({
    type: "impact",
    sourceUnitId: 9,
    targetUnitId: 3,
  });
  const b = combatContactKey({
    type: "impact",
    sourceUnitId: 3,
    targetUnitId: 9,
  });
  assert.equal(a, "3:9");
  assert.equal(a, b);
});

test("ability and anonymous impacts do not become unit engagements", () => {
  assert.equal(
    combatContactKey({
      type: "impact",
      sourceCardId: "pulse",
      targetUnitId: 4,
    }),
    null,
  );
  assert.equal(
    combatContactKey({
      type: "core-hit",
      sourceUnitId: 2,
      targetUnitId: 4,
    }),
    null,
  );
});

test("continuous exchanges do not retrigger until the pair has been quiet", () => {
  assert.equal(isFreshCombatContact(undefined, 10), true);
  assert.equal(isFreshCombatContact(10, 10.8), false);
  assert.equal(
    isFreshCombatContact(10, 10 + COMBAT_CONTACT_RESET_SECONDS - 0.01),
    false,
  );
  assert.equal(
    isFreshCombatContact(10, 10 + COMBAT_CONTACT_RESET_SECONDS),
    true,
  );
});

test("melee contact reads as a clash", () => {
  const visual = combatContactVisual({
    type: "impact",
    sourceCardId: "vanguard",
    sourceUnitId: 1,
    targetUnitId: 2,
    radius: 9,
    life: 0.24,
    maxLife: 0.24,
  });
  assert.equal(visual?.kind, "clash");
  assert.equal(visual?.cue, "contact");
  assert.ok((visual?.rayCount ?? 0) >= 6);
});

test("heavy weapons receive the stronger contact cue", () => {
  const visual = combatContactVisual({
    type: "impact",
    sourceCardId: "mortar",
    sourceUnitId: 1,
    targetUnitId: 2,
    radius: 15,
    life: 0.24,
    maxLife: 0.24,
  });
  assert.equal(visual?.kind, "heavy");
  assert.equal(visual?.cue, "heavyContact");
  assert.equal(visual?.ringCount, 2);
  assert.ok((visual?.cameraIntensity ?? 0) > 0.0014);
});

test("precision contact stays restrained", () => {
  const visual = combatContactVisual({
    type: "impact",
    sourceCardId: "ranger",
    sourceUnitId: 1,
    targetUnitId: 2,
    radius: 10,
    life: 0.24,
    maxLife: 0.24,
  });
  assert.equal(visual?.kind, "ranged");
  assert.equal(visual?.cue, "contact");
  assert.ok((visual?.strength ?? 1) < 0.8);
});

test("simultaneous contacts choose the strongest local exchange", () => {
  const visual = strongestCombatContact([
    {
      type: "impact",
      sourceCardId: "ranger",
      sourceUnitId: 1,
      targetUnitId: 2,
      radius: 9,
      life: 0.24,
      maxLife: 0.24,
    },
    {
      type: "impact",
      sourceCardId: "lancer",
      sourceUnitId: 3,
      targetUnitId: 4,
      radius: 14,
      life: 0.24,
      maxLife: 0.24,
    },
  ]);
  assert.equal(visual?.weaponKind, "rail");
  assert.equal(visual?.cue, "heavyContact");
});
