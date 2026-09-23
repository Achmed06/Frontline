import test from "node:test";
import assert from "node:assert/strict";
import { Match, DEFAULT_DECK, type CardId } from "./engine";
const deck: CardId[] = ["breaker", ...DEFAULT_DECK.slice(1)];
function strike(shield: number, team: "player" | "enemy" = "player") {
  const m = new Match({ playerDeck: deck, botEnabled: false });
  const opponent = team === "player" ? "enemy" : "player";
  assert.equal(
    m.play(team, "breaker", 210, team === "player" ? 480 : 80).ok,
    true,
  );
  assert.equal(
    m.play(opponent, "ranger", 210, opponent === "player" ? 480 : 80).ok,
    true,
  );
  const attacker = m.state.units[0],
    target = m.state.units[1];
  Object.assign(attacker, { x: 210, y: 280, speed: 0, attackCooldown: 0 });
  Object.assign(target, {
    x: 210,
    y: 300,
    speed: 0,
    attackCooldown: 100,
    shield,
    shieldTime: 6,
  });
  m.update(1 / 30);
  return { m, attacker, target };
}
test("Breaker removes only shield bonus before normal damage, equally for both teams", () => {
  for (const team of ["player", "enemy"] as const) {
    const full = strike(70, team);
    assert.equal(full.target.shield, 7);
    assert.equal(full.target.hp, full.target.maxHp);
    const partial = strike(10, team);
    assert.equal(partial.target.shield, 0);
    assert.equal(partial.target.hp, partial.target.maxHp - 18);
    const bare = strike(0, team);
    assert.equal(bare.target.hp, bare.target.maxHp - 18);
    assert.equal(bare.attacker.hp, bare.attacker.maxHp);
  }
});

test("Breaker special shield removal carries exact presentation data and emits a real break", () => {
  const full = strike(70);
  const fullSpecial = full.m.state.effects.find(
    (effect) => effect.type === "breaker",
  );
  assert.ok(fullSpecial);
  assert.equal(fullSpecial?.value, 45);
  assert.equal(fullSpecial?.sourceCardId, "breaker");
  assert.equal(fullSpecial?.sourceX, full.attacker.x);
  assert.equal(fullSpecial?.sourceY, full.attacker.y);
  assert.equal(
    full.m.state.effects.some(
      (effect) =>
        effect.type === "shield-break" &&
        effect.value === 45,
    ),
    false,
  );

  const partial = strike(10);
  const special = partial.m.state.effects.find(
    (effect) => effect.type === "breaker",
  );
  const shieldBreak = partial.m.state.effects.find(
    (effect) =>
      effect.type === "shield-break" &&
      effect.sourceCardId === "breaker",
  );
  assert.equal(special?.value, 10);
  assert.ok(shieldBreak);
  assert.equal(shieldBreak?.value, 10);
  assert.equal(shieldBreak?.team, "enemy");
  assert.equal(shieldBreak?.sourceX, partial.attacker.x);
  assert.equal(shieldBreak?.sourceY, partial.attacker.y);
});
test("Breaker deals ordinary core damage and remains a valid saved-deck unit", () => {
  const m = new Match({ playerDeck: deck, botEnabled: false });
  assert.equal(m.play("player", "breaker", 210, 480).ok, true);
  const unit = m.state.units[0];
  Object.assign(unit, { x: 210, y: 65, speed: 0, attackCooldown: 0 });
  const hp = m.state.cores.enemy.hp;
  m.update(1 / 30);
  assert.equal(m.state.cores.enemy.hp, hp - 18);
  assert.equal(m.state.stats.unitPlays.breaker, 1);
});
