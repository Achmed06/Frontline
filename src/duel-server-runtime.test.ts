import assert from "node:assert/strict";
import test from "node:test";
import {
  duelAllowedOrigins,
  duelServerRuntimeConfig,
} from "./duel-server-runtime";

test("development server stays loopback-only by default", () => {
  assert.deepEqual(duelServerRuntimeConfig({}), {
    host: "127.0.0.1",
    port: 8080,
    maxRooms: 12,
    allowedOrigins: [],
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
  });
  assert.equal(config.host, "::");
  assert.equal(config.port, 3000);
  assert.equal(config.maxRooms, 24);
  assert.deepEqual(config.allowedOrigins, [
    "capacitor://localhost",
    "https://game.example",
  ]);
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
