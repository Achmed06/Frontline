import test from 'node:test';
import assert from 'node:assert/strict';
import { inviteCode, inviteUrl } from './duel-invite';
test('invitation contains only a validated room, never existing URL credentials', () => {
 assert.equal(inviteCode('?room=ab12cd'),'AB12CD');
 for(const query of ['', '?room=<script>', '?room=1234567']) assert.equal(inviteCode(query),null);
 assert.equal(inviteUrl('https://game.example/duel.html?token=secret#private','AB12CD'),'https://game.example/duel.html?room=AB12CD');
 assert.throws(()=>inviteUrl('https://game.example/','invalid'));
});
