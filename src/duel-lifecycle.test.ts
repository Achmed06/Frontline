import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelService } from '../server/duels';
import { DEFAULT_DECK } from './engine';
test('expired waiting rooms free capacity before creation and cannot be joined', () => {
 let now=0; const service=new DuelService(()=>now);
 const input={op:'create',deck:DEFAULT_DECK,commander:'atlas'};
 const room=service.handle(input);
 assert.equal(room.waitingSeconds,300);
 for(let i=1;i<12;i++) service.handle(input);
 assert.throws(()=>service.handle(input));
 now=300000;
 assert.throws(()=>service.handle({...input,op:'join',code:room.code}));
 assert.equal(service.handle(input).waitingSeconds,300);
});
test('finished rooms survive active viewing, then expire when both clients leave', () => {
 let now=0;const service=new DuelService(()=>now);
 const input={deck:DEFAULT_DECK,commander:'atlas'};
 const host=service.handle({...input,op:'create'}) as ReturnType<typeof service.handle> & {token:string};
 const guest=service.handle({...input,op:'join',code:host.code}) as typeof host;
 const auth={code:host.code,token:host.token};
 service.handle({...auth,op:'leave'});
 now=59000;service.handle({...auth,op:'sync'});
 now=61000;service.tick(.1);
 assert.equal(service.handle({...auth,op:'sync'}).state!.phase,'ended');
 now+=60000;
 assert.throws(()=>service.handle({code:host.code,token:guest.token,op:'sync'}));
});
