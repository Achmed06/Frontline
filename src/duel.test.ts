import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { DuelService, duelMiddleware } from "../server/duels";
import { DEFAULT_DECK } from "./engine";
import { duelPerspective } from "./duel-protocol";
test("two authenticated seats share authoritative combat, reject illegal commands and keep independent cooldowns", () => {
  let now = 1000;
  const service = new DuelService(() => now);
  const host = service.handle({
    op: "create",
    deck: DEFAULT_DECK,
    commander: "atlas",
  }) as ReturnType<typeof service.handle> & { token: string };
  const guest = service.handle({
    op: "join",
    code: host.code,
    deck: DEFAULT_DECK,
    commander: "nova",
  }) as typeof host;
  assert.ok(host.token && guest.token && host.token !== guest.token);
  const h = { code: host.code, token: host.token },
    g = { code: host.code, token: guest.token };
  assert.throws(() =>
    service.handle({ op: "sync", code: host.code, token: "bad" }),
  );
  assert.throws(() =>
    service.handle({
      op: "join",
      code: host.code,
      deck: DEFAULT_DECK,
      commander: "atlas",
    }),
  );
  assert.equal(guest.countdown, 3);
  assert.throws(() => service.handle({ ...h, op: "play", seq: 1, card: "vanguard", x: 210, y: 480 }));
  service.tick(.25);
  assert.equal(service.handle({ ...h, op: "sync" }).state!.time, 0);
  now += 3000;
  const invalid = service.handle({
    ...h,
    op: "play",
    seq: 1,
    card: "vanguard",
    x: 210,
    y: 80,
  });
  assert.equal("actionOk" in invalid && invalid.actionOk, false);
  assert.equal(invalid.state!.units.length, 0);
  assert.equal(invalid.state!.energy.player, 6);
  service.handle({
    ...h,
    op: "play",
    seq: 2,
    card: "vanguard",
    x: 210,
    y: 480,
  });
  service.handle({
    ...g,
    op: "play",
    seq: 1,
    card: "vanguard",
    x: 210,
    y: 480,
  });
  const repeated = service.handle({
    ...g,
    op: "play",
    seq: 1,
    card: "vanguard",
    x: 210,
    y: 480,
  });
  assert.equal(repeated.state!.units.length, 2);
  assert.equal(repeated.state!.units[1].y, 80);
  service.handle({ ...h, op: "commander", seq: 3 });
  const both = service.handle({ ...g, op: "commander", seq: 2 });
  assert.equal(both.state!.commanderCooldown, 30);
  assert.equal(both.state!.enemyCommanderCooldown, 32);
  assert.equal(both.state!.units[0].shield, 70);
  assert.equal(both.state!.units[1].rallyTime, 6);
  const view = duelPerspective(both.state!, "enemy");
  assert.equal(view.commanderCooldown, 32);
  assert.equal(view.units[1].team, "player");
  assert.equal(view.units[1].y, 480);
  assert.equal(view.cores.player.y, 525);
  assert.equal(view.points[6].owner, "player");
  assert.equal(both.state!.units[1].team, "enemy");
  // Session tokens remain valid after reconnect; the present player wins after grace expires.
  now += 19000;
  service.handle({ ...g, op: "sync" });
  service.tick(0.1);
  assert.notEqual(service.handle({ ...g, op: "sync" }).state!.phase, "ended");
  now += 2000;
  service.tick(0.1);
  assert.equal(service.handle({ ...g, op: "sync" }).state!.winner, "enemy");
});
test("HTTP room flow is available to two actual clients", async () => {
  let now = 1000;
  const middleware = duelMiddleware(new DuelService(() => now));
  const server = createServer(
    (req, res) =>
      void middleware(req, res, () => {
        res.statusCode = 404;
        res.end();
      }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const call = async (input: unknown) => {
    const r = await fetch(`http://127.0.0.1:${address.port}/api/duel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(r.status, 200);
    return r.json();
  };
  const a = await call({ op: "create", deck: DEFAULT_DECK, commander: "lyra" });
  const b = await call({
    op: "join",
    code: a.code,
    deck: DEFAULT_DECK,
    commander: "atlas",
  });
  try {
    assert.equal(b.team, "enemy");
    now += 3000;
    await call({
      op: "play",
      code: a.code,
      token: a.token,
      seq: 1,
      card: "vanguard",
      x: 210,
      y: 480,
    });
    const state = await call({ op: "sync", code: b.code, token: b.token });
    assert.equal(state.state.units.length, 1);
    assert.equal(state.state.units[0].team, "player");
  } finally {
    await call({ op: "leave", code: a.code, token: a.token });
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('rematch requires both seats and rejects stale rounds and departed opponents', () => {
 let now=1000;
 const service=new DuelService(()=>now);
 assert.throws(()=>service.handle({op:'create',deck:DEFAULT_DECK,commander:'atlas',theme:'invalid'}));
 const host=service.handle({op:'create',deck:DEFAULT_DECK,commander:'atlas',theme:'ember',mode:'control'}) as ReturnType<typeof service.handle> & {token:string};
 const guest=service.handle({op:'join',code:host.code,deck:DEFAULT_DECK,commander:'nova',theme:'frost',mode:'core'}) as typeof host;
 assert.equal(guest.theme,"ember");
 assert.equal(guest.mode,"control");
 assert.throws(()=>service.handle({op:"create",deck:DEFAULT_DECK,commander:"atlas",mode:"invalid"}));
 const h={code:host.code,token:host.token},g={code:host.code,token:guest.token};
 assert.throws(()=>service.handle({...h,op:'rematch',round:1}));
 now+=21000;service.tick(.1);
 const first=service.handle({...h,op:'rematch',round:1});
 assert.deepEqual(first.score,{player:0,enemy:0,draw:1});
 assert.deepEqual(service.handle({...g,op:'sync'}).score,first.score);
 assert.equal(first.state!.phase,'ended');assert.equal(first.rematch.player,true);
 assert.equal(service.handle({...h,op:'rematch',round:1}).round,1);
 const next=service.handle({...g,op:'rematch',round:1});
 assert.deepEqual(next.score,{player:0,enemy:0,draw:1});
 assert.equal(next.round,2);assert.notEqual(next.state!.phase,'ended');
 assert.equal(next.state!.time,0);assert.equal(next.state!.energy.player,6);
 assert.deepEqual(next.rematch,{player:false,enemy:false});
 assert.equal(next.commanders.enemy,'nova');
 assert.equal(next.countdown,3);
 assert.equal(next.theme,'ember');
 assert.equal(next.mode,'control');
 now+=3000;
 assert.throws(()=>service.handle({...g,op:'rematch',round:1}));
 assert.throws(()=>service.handle({...h,op:'play',round:1,seq:1,card:'vanguard',x:210,y:480}));
 assert.equal(service.handle({...h,op:'play',round:2,seq:1,card:'vanguard',x:210,y:480}).state!.units.length,1);
 service.handle({...g,op:'leave'});
 assert.equal(service.handle({...h,op:'sync'}).closed,true);
 assert.deepEqual(service.handle({...h,op:'sync'}).score,{player:1,enemy:0,draw:1});
 service.handle({...g,op:'leave'});
 assert.deepEqual(service.handle({...g,op:'sync'}).score,{player:1,enemy:0,draw:1});
 assert.throws(()=>service.handle({...h,op:'rematch',round:2}));
});
