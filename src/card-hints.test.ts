import assert from "node:assert/strict";
import test from "node:test";
import { selectedCardHint } from "./card-hints";
import { CARDS } from "./engine";

const card = (id: string) => CARDS.find((item) => item.id === id)!;

test("ability selection hints expose exact configured combat values", () => {
  assert.equal(
    selectedCardHint(card("pulse")),
    "85 SCHADEN · 45 CORE · ZIELEN & LOSLASSEN",
  );
  assert.equal(
    selectedCardHint(card("rally")),
    "+65 HP · +25% BEWEGUNG · +30% ANGRIFF · 6s",
  );
  assert.equal(
    selectedCardHint(card("stasis")),
    "-40% BEWEGUNG · 4s · KEIN SCHADEN",
  );
  assert.equal(
    selectedCardHint(card("repulsor")),
    "55 PUSH · KEIN SCHADEN · ZIELEN & LOSLASSEN",
  );
});

test("specialist unit hints expose exact configured combat values", () => {
  assert.equal(
    selectedCardHint(card("pioneer")),
    "+50% EROBERUNG · 85 HP · 8 SCHADEN",
  );
  assert.equal(
    selectedCardHint(card("breaker")),
    "45 SCHILDBRUCH · 18 SCHADEN · 160 HP",
  );
  assert.equal(
    selectedCardHint(card("lancer")),
    "48 SCHADEN · +60% CORE · 135 REICHWEITE",
  );
  assert.equal(
    selectedCardHint(card("medic")),
    "+19 HP · 100 HEILREICHWEITE · 1,1s TAKT",
  );
  assert.equal(
    selectedCardHint(card("mortar")),
    "40 DIREKT · 28 SPLASH · 42 RADIUS",
  );
  assert.equal(
    selectedCardHint(card("disruptor")),
    "12 SCHADEN · -40% BEWEGUNG · 2s",
  );
});

test("ordinary unit and empty selection keep their concise fallbacks", () => {
  const vanguard = card("vanguard");
  assert.equal(selectedCardHint(vanguard), vanguard.description);
  assert.equal(
    selectedCardHint(undefined),
    "Karte wählen → halten, zielen, loslassen",
  );
});
