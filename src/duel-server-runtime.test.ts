import assert from "node:assert/strict";
import test from "node:test";
import {
  duelAllowedOrigins,
  duelClientAddress,
  duelServerRuntimeConfig,
} from "./duel-server-runtime";

test("development server stays loopback-only by default", () => {
  assert.deepEqual(duelServerRuntimeConfig({}), {
    host: "127.0.0.1",
    port: 8080,
    maxRooms: 12,
    allowedOrigins: [],
    trustedProxyHops: 0,
    production: false,
  });
});

test("production defaults to container-safe binding without changing local defaults", () => {
  const config = duelServerRuntimeConfig({ NODE_ENV: "production" });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.production, true);
});

test("runtime accepts explicit port, room capacity and exact native origins", () => {
  const config = duelServerRuntimeConfig({
    NODE_ENV: "production",
    HOST: "::",
    PORT: "3000",
    DUEL_MAX_ROOMS: "24",
    DUEL_ALLOWED_ORIGINS:
      "capacitor://localhost, https://game.example,capacitor://localhost",
    DUEL_TRUST_PROXY_HOPS: "1",
  });
  assert.equal(config.host, "::");
  assert.equal(config.port, 3000);
  assert.equal(config.maxRooms, 24);
  assert.deepEqual(config.allowedOrigins, [
    "capacitor://localhost",
    "https://game.example",
  ]);
  assert.equal(config.trustedProxyHops, 1);
});

test("origin parser rejects wildcards, paths, credentials and unsafe schemes", () => {
  for (const value of [
    "*",
    "https://game.example/path",
    "https://user:secret@game.example",
    "javascript://game.example",
    "not an origin",
  ])
    assert.throws(() => duelAllowedOrigins(value));
});

test("invalid numeric and host deployment settings fail fast", () => {
  assert.throws(() => duelServerRuntimeConfig({ PORT: "0" }), /PORT/);
  assert.throws(
    () => duelServerRuntimeConfig({ DUEL_MAX_ROOMS: "1000" }),
    /DUEL_MAX_ROOMS/,
  );
  assert.throws(
    () => duelServerRuntimeConfig({ HOST: "https://game.example" }),
    /HOST/,
  );
});


test("forwarded addresses are ignored unless proxy trust is explicit", () => {
  assert.equal(
    duelClientAddress("10.0.0.8", "203.0.113.5", 0),
    "10.0.0.8",
  );
  assert.equal(
    duelClientAddress("10.0.0.8", "203.0.113.5", 1),
    "203.0.113.5",
  );
});

test("trusted proxy hops select from the right side of the forwarding chain", () => {
  assert.equal(
    duelClientAddress("10.0.0.9", "203.0.113.5, 10.0.0.8", 2),
    "203.0.113.5",
  );
  assert.equal(
    duelClientAddress("10.0.0.9", "203.0.113.5, 10.0.0.8", 1),
    "10.0.0.8",
  );
});
