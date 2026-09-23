import assert from "node:assert/strict";
import test from "node:test";
import { storeModeCopy, storePurchaseLabel } from "./store-copy";

test("sandbox catalog is explicitly presented as a free test purchase", () => {
  const catalog = { available: true, price: "0,99 €", testOnly: true };
  assert.equal(storePurchaseLabel(catalog), "TESTKAUF · 0,99 €");
  assert.match(storeModeCopy(catalog).note, /Testbetrieb/);
  assert.match(storeModeCopy(catalog).ready, /Kein Echtgeldkauf/);
});

test("production catalog never carries test-purchase copy", () => {
  const catalog = { available: true, price: "0,99 €", testOnly: false };
  assert.equal(storePurchaseLabel(catalog), "KAUFEN · 0,99 €");
  const copy = storeModeCopy(catalog);
  assert.doesNotMatch(copy.eyebrow, /TEST/);
  assert.doesNotMatch(copy.note, /Test/);
  assert.doesNotMatch(copy.ready, /Test/);
});

test("unavailable catalog does not expose a purchasable action", () => {
  assert.equal(
    storePurchaseLabel({ available: false, price: "", testOnly: false }),
    "KAUF NOCH NICHT VERFÜGBAR",
  );
});
