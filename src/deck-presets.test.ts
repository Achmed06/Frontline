import test from 'node:test';
import assert from 'node:assert/strict';
import { DECK_PRESETS } from './deck-presets';
import { isValidDeck, DEFAULT_DECK } from './engine';
test('shared templates remain valid six-unit two-tactic decks', () => {
 assert.equal(DECK_PRESETS.length,6);
 assert.equal(new Set(DECK_PRESETS.map(p=>p.id)).size,6);
 for(const preset of DECK_PRESETS) assert.ok(isValidDeck(preset.cards),preset.id);
 assert.deepEqual(DECK_PRESETS.find(p=>p.id==='standard')!.cards,DEFAULT_DECK);
 const copy=[...DECK_PRESETS[0].cards];copy.reverse();
 assert.deepEqual(DECK_PRESETS[0].cards,DEFAULT_DECK);
});
