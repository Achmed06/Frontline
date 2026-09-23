export type LobbyAttention = "campaign" | "headquarters" | "daily" | "none";

export type LobbyCommandStatusInput = {
  completedMissions: number;
  totalMissions: number;
  stars: number;
  maxStars: number;
  headquartersName: string;
  readyProjects: number;
  learningDone: number;
  learningTotal: number;
  dailyCompleted: boolean;
  dailyAttempts: number;
  seriesActive: boolean;
  seriesWins: number;
  seriesLosses: number;
};

export type LobbyCommandStatus = {
  campaign: { value: string; detail: string; complete: boolean };
  headquarters: { value: string; detail: string; ready: boolean };
  daily: { value: string; detail: string; complete: boolean };
  attention: LobbyAttention;
};

function count(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function lobbyCommandStatus(
  input: LobbyCommandStatusInput,
): LobbyCommandStatus {
  const completed = Math.min(count(input.completedMissions), count(input.totalMissions));
  const total = Math.max(1, count(input.totalMissions));
  const stars = Math.min(count(input.stars), Math.max(1, count(input.maxStars)));
  const maxStars = Math.max(1, count(input.maxStars));
  const readyProjects = count(input.readyProjects);
  const learningDone = Math.min(count(input.learningDone), Math.max(1, count(input.learningTotal)));
  const learningTotal = Math.max(1, count(input.learningTotal));
  const dailyAttempts = count(input.dailyAttempts);
  const seriesWins = Math.min(3, count(input.seriesWins));
  const seriesLosses = Math.min(2, count(input.seriesLosses));

  const campaignComplete = completed >= total;
  const dailyComplete = Boolean(input.dailyCompleted);
  const attention: LobbyAttention =
    readyProjects > 0
      ? "headquarters"
      : !dailyComplete
        ? "daily"
        : !campaignComplete
          ? "campaign"
          : "none";

  return {
    campaign: {
      value: campaignComplete ? "GESICHERT" : `${completed}/${total}`,
      detail: `${stars}/${maxStars} ★`,
      complete: campaignComplete,
    },
    headquarters: {
      value: readyProjects > 0 ? `${readyProjects} BEREIT` : input.headquartersName,
      detail:
        readyProjects > 0
          ? `${learningDone}/${learningTotal} Ausbildung`
          : `${learningDone}/${learningTotal} Ausbildung`,
      ready: readyProjects > 0,
    },
    daily: {
      value: dailyComplete ? "GESICHERT" : dailyAttempts > 0 ? `${dailyAttempts}. VERSUCH` : "OFFEN",
      detail: input.seriesActive
        ? `Serie ${seriesWins}/3 · ${Math.max(0, 2 - seriesLosses)} Leben`
        : "Tagesfront",
      complete: dailyComplete,
    },
    attention,
  };
}
