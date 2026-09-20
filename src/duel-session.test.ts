import test from "node:test";
import assert from "node:assert/strict";
import {
  DUEL_SESSION_MAX_AGE_MS,
  parseDuelSession,
  serializeDuelSession,
  type DuelSession,
} from "./duel-session";

const session: DuelSession = {
  code: "A1B2C3",
  token: "a".repeat(48),
  seq: 7,
};

test("duel session survives a native/webview restart while still fresh", () => {
  const now = 1_000_000;
  assert.deepEqual(parseDuelSession(serializeDuelSession(session, now), now + 30_000), session);
});

test("duel session accepts the legacy sessionStorage shape once for migration", () => {
  assert.deepEqual(parseDuelSession(JSON.stringify(session), 1000), session);
});

test("duel session rejects malformed, future and stale credentials", () => {
  const now = 5_000_000;
  assert.equal(parseDuelSession("{broken", now), null);
  assert.equal(parseDuelSession(JSON.stringify({ ...session, code: "ABC" }), now), null);
  assert.equal(parseDuelSession(JSON.stringify({ ...session, token: "nope" }), now), null);
  assert.equal(parseDuelSession(JSON.stringify({ ...session, seq: -1 }), now), null);
  assert.equal(
    parseDuelSession(
      JSON.stringify({ ...session, savedAt: now - DUEL_SESSION_MAX_AGE_MS - 1 }),
      now,
    ),
    null,
  );
  assert.equal(
    parseDuelSession(JSON.stringify({ ...session, savedAt: now + 60_001 }), now),
    null,
  );
});
