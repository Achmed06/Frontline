import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createFrontlineServer } from '../server/app';
import { DEFAULT_DECK } from './engine';

test('standalone host serves builds safely and runs two-player duels', async () => {
 const directory=await mkdtemp(join(tmpdir(),'frontline-server-'));
 const root=join(directory,'dist');
 await mkdir(join(root,'assets'),{recursive:true});
 await writeFile(join(root,'index.html'),'<title>FRONTLINE</title>');
 await writeFile(join(root,'duel.html'),'<title>Duell</title>');
 await writeFile(join(root,'assets','game.js'),'export {};');
 await writeFile(join(directory,'private.json'),'secret');
 await symlink(join(directory,'private.json'),join(root,'escape.json'));
 const server=await createFrontlineServer(root);
 try {
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  assert.match(await (await fetch(base)).text(),/FRONTLINE/);
  assert.match(await (await fetch(base+'/duel.html')).text(),/Duell/);
  assert.deepEqual(await (await fetch(base+'/healthz')).json(),{status:'ok'});
  assert.deepEqual(await (await fetch(base+'/readyz')).json(),{status:'ready',rooms:0,capacity:12});
  const asset=await fetch(base+'/assets/game.js',{method:'HEAD'});
  assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control')!,/immutable/);
  assert.equal(await asset.text(),'');
  for(const path of ['/escape.json','/missing.html','/..%2fprivate.json']) assert.equal((await fetch(base+path)).status,404);
  const call=async(input:unknown)=>{
   const response=await fetch(base+'/api/duel',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
   assert.equal(response.status,200);return response.json();
  };
  const host=await call({op:'create',deck:DEFAULT_DECK,commander:'atlas'});
  assert.deepEqual(await (await fetch(base+'/readyz')).json(),{status:'ready',rooms:1,capacity:12});
  const guest=await call({op:'join',code:host.code,deck:DEFAULT_DECK,commander:'nova'});
  assert.equal(guest.team,'enemy');
  await new Promise(resolve=>setTimeout(resolve,3100));
  await call({op:'play',code:host.code,token:host.token,seq:1,card:'vanguard',x:210,y:480});
  const snapshot=await call({op:'sync',code:host.code,token:guest.token});
  assert.equal(snapshot.state.units.length,1);
  await call({op:'leave',code:host.code,token:host.token});
  assert.equal((await call({op:'sync',code:host.code,token:guest.token})).state.winner,'enemy');
 } finally {
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  await rm(directory,{recursive:true,force:true});
 }
});


test('standalone host enforces configured room capacity', async () => {
 const directory=await mkdtemp(join(tmpdir(),'frontline-capacity-'));
 const root=join(directory,'dist');
 await mkdir(root,{recursive:true});
 await writeFile(join(root,'index.html'),'<title>FRONTLINE</title>');
 await writeFile(join(root,'duel.html'),'<title>Duell</title>');
 const server=await createFrontlineServer(root,{maxRooms:2});
 try {
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const url=`http://127.0.0.1:${address.port}/api/duel`;
  const create=()=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'create',deck:DEFAULT_DECK,commander:'atlas'})});
  assert.equal((await create()).status,200);
  assert.equal((await create()).status,200);
  const full=await create();
  assert.equal(full.status,400);
  assert.match((await full.json()).error,/Duellplätze/);
 } finally {
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  await rm(directory,{recursive:true,force:true});
 }
});
