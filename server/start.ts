import { resolve } from "node:path";
import { createFrontlineServer } from "./app";
import { duelServerRuntimeConfig } from "../src/duel-server-runtime";

const config = duelServerRuntimeConfig(process.env);
const server = await createFrontlineServer(
  resolve(process.env.FRONTLINE_DIST ?? "dist"),
  {
    maxRooms: config.maxRooms,
    allowedOrigins: config.allowedOrigins,
    trustedProxyHops: config.trustedProxyHops,
  },
);

server.on("error", (error) => {
  console.error("Serverstart fehlgeschlagen:", error.message);
  process.exitCode = 1;
});
server.listen(config.port, config.host, () => {
  console.log(
    `FRONTLINE läuft auf ${config.host}:${config.port} · /healthz · /readyz · ${config.maxRooms} Räume · native Origins: ${config.allowedOrigins.length} · Proxy-Hops: ${config.trustedProxyHops}`,
  );
});

let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  console.log(
    "FRONTLINE wird beendet. Aktive Duelle liegen nur im Arbeitsspeicher.",
  );
  server.close(() => {
    process.exitCode = 0;
  });
  setTimeout(() => server.closeAllConnections(), 5000).unref();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
