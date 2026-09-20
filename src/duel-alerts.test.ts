import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from './engine';
import { duelAlerts } from './duel-alerts';
test('alerts follow authoritative time, core threshold and match end', () => {
 const state = new Match({botEnabled:false}).state;
 assert.equal(duelAlerts(state).message,'');
 state.time=149;assert.equal(duelAlerts(state).final,false);
 state.time=150;assert.equal(duelAlerts(state).final,true);
 state.cores.player.hp=state.cores.player.maxHp*.25;
 assert.equal(duelAlerts(state).critical,true);
 state.phase='overtime';state.time=180;
 assert.equal(duelAlerts(state).remaining,45);
 assert.equal(duelAlerts(state).final,false);
 assert.equal(duelAlerts(state).overtime,true);
 state.phase='ended';assert.equal(duelAlerts(state).message,'');
});
