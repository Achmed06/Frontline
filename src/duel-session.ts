export type DuelSession = {
  code: string;
  token: string;
  seq: number;
};

export const DUEL_SESSION_KEY = "frontline-duel";
export const DUEL_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type StoredDuelSession = DuelSession & { savedAt?: number };

export function parseDuelSession(
  raw: string | null,
  now = Date.now(),
): DuelSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredDuelSession> | null;
    if (
      !value ||
      typeof value.code !== "string" ||
      !/^[A-F0-9]{6}$/.test(value.code) ||
      typeof value.token !== "string" ||
      !/^[a-f0-9]{48}$/.test(value.token) ||
      !Number.isSafeInteger(value.seq) ||
      (value.seq as number) < 0
    )
      return null;

    if (value.savedAt !== undefined) {
      if (
        !Number.isFinite(value.savedAt) ||
        value.savedAt > now + 60_000 ||
        now - value.savedAt > DUEL_SESSION_MAX_AGE_MS
      )
        return null;
    }

    return { code: value.code, token: value.token, seq: value.seq as number };
  } catch {
    return null;
  }
}

export function serializeDuelSession(
  session: DuelSession,
  now = Date.now(),
): string {
  return JSON.stringify({ ...session, savedAt: now });
}
