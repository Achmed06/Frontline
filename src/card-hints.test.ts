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

test("unit selection hints keep the unit description", () => {
  const vanguard = card("vanguard");
  assert.equal(selectedCardHint(vanguard), vanguard.description);
  assert.equal(
    selectedCardHint(undefined),
    "Karte wählen → halten, zielen, loslassen",
  );
});
