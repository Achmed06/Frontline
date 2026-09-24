export type FrontOwner = "player" | "enemy" | null;
export type FrontRaceState = "player" | "enemy" | "even";

export type FrontRaceSnapshot = {
  player: number;
  enemy: number;
  neutral: number;
  state: FrontRaceState;
  aria: string;
};

export function frontRace(
  owners: readonly FrontOwner[],
): FrontRaceSnapshot {
  const player = owners.filter((owner) => owner === "player").length;
  const enemy = owners.filter((owner) => owner === "enemy").length;
  const neutral = owners.filter((owner) => owner === null).length;
  const state: FrontRaceState =
    player > enemy ? "player" : enemy > player ? "enemy" : "even";
  const lead =
    state === "player"
      ? `Du führst ${player} zu ${enemy}.`
      : state === "enemy"
        ? `Gegner führt ${enemy} zu ${player}.`
        : `Front ausgeglichen ${player} zu ${enemy}.`;

  return {
    player,
    enemy,
    neutral,
    state,
    aria: `${lead} ${neutral} neutrale ${neutral === 1 ? "Zone" : "Zonen"}.`,
  };
}
