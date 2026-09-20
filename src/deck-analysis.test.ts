import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDeck } from './deck-analysis';
import { DEFAULT_DECK } from './engine';
test('composition counts cards, separates healer and handles incomplete decks', () => {
 const normal = analyzeDeck(DEFAULT_DECK);
 assert.equal(normal.frontline + normal.ranged + normal.support,6);
 assert.equal(normal.support,1);
 assert.equal(analyzeDeck(['swarm']).frontline,1);
 assert.equal(analyzeDeck(['medic']).ranged,0);
 assert.equal(analyzeDeck([]).average,0);
 assert.ok(analyzeDeck(['bulwark','sentinel','mortar']).hints.some(h=>h.includes('Hoher Energiebedarf')));
 assert.equal(analyzeDeck(['swarm','swarm']).cheap,1);
});
