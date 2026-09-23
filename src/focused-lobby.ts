export type FeaturedEventId = "daily" | "draft" | "series";
export type LobbySection = "play" | "event" | "base";

export type FeaturedEvent = {
  id: FeaturedEventId;
  eyebrow: string;
  title: string;
  hook: string;
  cta: string;
  accent: "mint" | "violet" | "amber";
};

const EVENTS: readonly FeaturedEvent[] = [
  {
    id: "daily",
    eyebrow: "EVENT DES TAGES",
    title: "TAGESFRONT",
    hook: "Eine feste Front. Heute zählt dein bester Lauf.",
    cta: "HEUTIGE FRONT SPIELEN",
    accent: "mint",
  },
  {
    id: "draft",
    eyebrow: "EVENT DES TAGES",
    title: "DRAFT",
    hook: "Acht Picks. Ein frisches Deck. Sofort ins Gefecht.",
    cta: "DRAFT STARTEN",
    accent: "violet",
  },
  {
    id: "series",
    eyebrow: "EVENT DES TAGES",
    title: "EINSATZSERIE",
    hook: "Drei Siege. Zwei Leben. Ein festes Loadout.",
    cta: "SERIE SPIELEN",
    accent: "amber",
  },
] as const;

export function featuredEvent(date: Date): FeaturedEvent {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  return EVENTS[((day % EVENTS.length) + EVENTS.length) % EVENTS.length];
}

export function lobbySectionLabel(section: LobbySection): string {
  return section === "play"
    ? "SPIELEN"
    : section === "event"
      ? "EVENT"
      : "BASIS";
}
