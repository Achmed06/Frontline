import { defineConfig } from "vite";
import { DuelService, duelMiddleware } from "./server/duels";
import { startDuelClock } from "./server/app";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "frontline-duels",
      configureServer(server) {
        const service = new DuelService();
        server.middlewares.use(duelMiddleware(service));
        const stop = startDuelClock(service);
        server.httpServer?.once("close", stop);
      },
    },
  ],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  build: {
    target: "es2020",
    rollupOptions: { input: { main: "index.html", duel: "duel.html" } },
  },
});
