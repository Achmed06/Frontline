import assert from "node:assert/strict";
import test from "node:test";
import {
  effectPresentationBudget,
  effectPriority,
} from "./effect-density";

test("objective and tactical effects remain critical presentation", () => {
  for (const type of [
    "capture",
    "frontline",
    "commander",
    "core-hit",
    "pulse",
    "rally",
    "stasis",
    "repulsor",
    "shield-break",
    "blast",
  ] as const) {
    assert.equal(effectPriority({ type }), "critical", type);
    const budget = effectPresentationBudget({ id: 1, type }, 80);
    assert.equal(budget.visible, true, type);
    assert.equal(budget.alphaScale, 1, type);
    assert.equal(budget.priority, "critical", type);
  }
});

test("heavy impacts stay readable while routine impacts compress", () => {
  assert.equal(effectPriority({ type: "impact", radius: 14 }), "high");
  assert.equal(effectPriority({ type: "impact", radius: 8 }), "routine");

  const heavy = effectPresentationBudget(
    { id: 5, type: "impact", radius: 14 },
    60,
  );
  assert.equal(heavy.visible, true);
  assert.equal(heavy.alphaScale, 0.8);

  const routineVisible = effectPresentationBudget(
    { id: 6, type: "impact", radius: 8 },
    60,
  );
  const routineHidden = effectPresentationBudget(
    { id: 7, type: "impact", radius: 8 },
    60,
  );
  assert.equal(routineVisible.visible, true);
  assert.equal(routineHidden.visible, false);
  assert.equal(routineVisible.alphaScale, 0.56);
});

test("routine effect sampling is deterministic at dense and saturated load", () => {
  const denseA = effectPresentationBudget(
    { id: 8, type: "shot" },
    40,
  );
  const denseB = effectPresentationBudget(
    { id: 9, type: "shot" },
    40,
  );
  assert.equal(denseA.visible, true);
  assert.equal(denseB.visible, false);
  assert.equal(denseA.density, "dense");

  const saturatedA = effectPresentationBudget(
    { id: 12, type: "shot" },
    70,
  );
  const saturatedB = effectPresentationBudget(
    { id: 13, type: "shot" },
    70,
  );
  assert.equal(saturatedA.visible, true);
  assert.equal(saturatedB.visible, false);
  assert.equal(saturatedA.density, "saturated");
});

test("camera impulse is progressively restrained without muting critical visuals", () => {
  const clear = effectPresentationBudget(
    { id: 1, type: "death" },
    12,
  );
  const busy = effectPresentationBudget(
    { id: 1, type: "death" },
    26,
  );
  const dense = effectPresentationBudget(
    { id: 1, type: "death" },
    42,
  );
  const saturated = effectPresentationBudget(
    { id: 1, type: "death" },
    70,
  );

  assert.equal(clear.cameraScale, 1);
  assert.ok(busy.cameraScale < clear.cameraScale);
  assert.ok(dense.cameraScale < busy.cameraScale);
  assert.ok(saturated.cameraScale < dense.cameraScale);
  assert.equal(saturated.visible, true);
});

test("malformed active counts fail back to clear presentation", () => {
  const budget = effectPresentationBudget(
    { id: 1, type: "impact", radius: 8 },
    Number.NaN,
  );
  assert.equal(budget.density, "clear");
  assert.equal(budget.visible, true);
  assert.equal(budget.alphaScale, 1);
});
