export type DuelServerRuntimeConfig = {
  host: string;
  port: number;
  maxRooms: number;
  allowedOrigins: readonly string[];
  trustedProxyHops: number;
  production: boolean;
};

function integer(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max)
    throw Error(`${label} muss zwischen ${min} und ${max} liegen.`);
  return parsed;
}

function host(value: string | undefined, production: boolean): string {
  const fallback = production ? "0.0.0.0" : "127.0.0.1";
  if (!value?.trim()) return fallback;
  const candidate = value.trim();
  if (
    candidate.length > 255 ||
    /[\s/?#]/.test(candidate) ||
    candidate.includes("://")
  )
    throw Error("HOST muss eine reine Listen-Adresse ohne Protokoll oder Pfad sein.");
  return candidate;
}

export function duelAllowedOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  const result = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item === "*") throw Error("DUEL_ALLOWED_ORIGINS darf kein Wildcard-Origin enthalten.");
      let url: URL;
      try {
        url = new URL(item);
      } catch {
        throw Error(`Ungültiger Duel-Origin: ${item}`);
      }
      if (
        !["https:", "http:", "capacitor:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !["", "/"].includes(url.pathname)
      )
        throw Error(`Ungültiger Duel-Origin: ${item}`);
      if (url.protocol === "capacitor:" && url.origin !== "null") {
        // URL implementations treat custom schemes differently; normalization
        // below intentionally preserves Capacitor's canonical origin string.
      }
      return item.replace(/\/$/, "");
    });
  return [...new Set(result)];
}

export function duelServerRuntimeConfig(
  env: Record<string, string | undefined>,
): DuelServerRuntimeConfig {
  const production = env.NODE_ENV === "production";
  return {
    host: host(env.HOST, production),
    port: integer(env.PORT, 8080, 1, 65535, "PORT"),
    maxRooms: integer(env.DUEL_MAX_ROOMS, 12, 2, 64, "DUEL_MAX_ROOMS"),
    allowedOrigins: duelAllowedOrigins(env.DUEL_ALLOWED_ORIGINS),
    trustedProxyHops: integer(
      env.DUEL_TRUST_PROXY_HOPS,
      0,
      0,
      3,
      "DUEL_TRUST_PROXY_HOPS",
    ),
    production,
  };
}


export function duelClientAddress(
  remoteAddress: string | undefined,
  forwardedFor: string | string[] | undefined,
  trustedProxyHops: number,
): string {
  const remote = remoteAddress?.trim() || "unknown";
  if (trustedProxyHops <= 0 || !forwardedFor) return remote;
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(",") : forwardedFor;
  const forwarded = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!forwarded.length) return remote;
  const chain = [...forwarded, remote];
  const index = chain.length - 1 - trustedProxyHops;
  return index >= 0 ? chain[index] : remote;
}
