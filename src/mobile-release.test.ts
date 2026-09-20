import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { nativeDuelServer } from './mobile-config';
import { normalizeLearning, styleUnlocked } from './headquarters';
import { DuelService, duelMiddleware } from '../server/duels';
import { DEFAULT_DECK } from './engine';
test('native builds require an HTTPS origin; saved cosmetic selection never grants a purchase', () => {
  for (const value of [undefined, '', 'http://localhost:8080', 'https://user:secret@game.example', 'https://game.example/path', 'https://game.example?token=x', 'javascript:alert(1)']) assert.equal(nativeDuelServer(value), null);
  assert.equal(nativeDuelServer(' https://game.example/ '), 'https://game.example');
  const progress = normalizeLearning({ style: 'supporter', counts: { deploy: 3, capture: 1, ability: 1, win: 1 } });
  assert.equal(progress.style, 'supporter');
  assert.equal(styleUnlocked('supporter', progress, 24), false);
  assert.equal(styleUnlocked('supporter', progress, 0, true), true);
  assert.equal(styleUnlocked('supporter', progress, 24, false), false);
  assert.equal(styleUnlocked('ember', progress, 6), true);
});
test('only explicitly permitted native origins can preflight and create real duel rooms', async () => {
  const middleware = duelMiddleware(new DuelService(), ['capacitor://localhost']);
  const server = createServer((req, res) => void middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/api/duel`;
    const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'capacitor://localhost');
    const room = await fetch(url, { method: 'POST', headers: { Origin: 'capacitor://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'create', deck: DEFAULT_DECK, commander: 'atlas' }) });
    assert.equal(room.status, 200);
    assert.match((await room.json()).code, /^[A-F0-9]{6}$/);
    const denied = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' } });
    assert.equal(denied.status, 400);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
