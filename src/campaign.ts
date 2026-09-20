import type { CommanderId } from "./commanders";
import {
  DEFAULT_DECK,
  type CardId,
  type Difficulty,
  type MatchState,
  type Team,
  type ControlObjective,
  MATCH_DURATION,
  OVERTIME_DURATION,
} from "./engine";

export type Mission = {
  enemyCommander?: CommanderId;
  controlObjective?: ControlObjective;
  id: string;
  name: string;
  briefing: string;
  tip: string;
  difficulty: Difficulty;
  enemyDeck: readonly CardId[];
  owners: readonly (Team | null)[];
  seed: number;
  speedTarget: number;
  healthTarget: number;
};
const E = "enemy",
  P = "player";
const assault: readonly CardId[] = [
  "vanguard",
  "ranger",
  "swarm",
  "lancer",
  "raider",
  "sentinel",
  "pulse",
  "rally",
];
const siege: readonly CardId[] = [
  "vanguard",
  "bulwark",
  "ranger",
  "medic",
  "lancer",
  "sentinel",
  "pulse",
  "rally",
];
// New chapter metadata keeps menu boundaries tied to stable mission IDs.
export const CHAPTERS = [
  { firstMission: "bridgehead", theme: "coast", title: "DIE ERSTE FRONT" },
  { firstMission: "relay", theme: "frost", title: "SIGNALKRIEG" },
  { firstMission: "scatter", theme: "ember", title: "GEGENFEUER" },
  { firstMission: "recovery-line", theme: "nexus", title: "KOMMANDOKRIEG" },
] as const;
const bombardment: readonly CardId[] = [
  "vanguard",
  "bulwark",
  "ranger",
  "medic",
  "mortar",
  "sentinel",
  "pulse",
  "rally",
];
const disruption: readonly CardId[] = [
  "vanguard",
  "ranger",
  "raider",
  "swarm",
  "disruptor",
  "sentinel",
  "pulse",
  "rally",
];
const combinedArms: readonly CardId[] = [
  "bulwark",
  "ranger",
  "medic",
  "lancer",
  "mortar",
  "disruptor",
  "pulse",
  "rally",
];
// Chapter four opponents use existing tactics and the same commander rules.
const recovery: readonly CardId[] = [
  "vanguard",
  "bulwark",
  "ranger",
  "medic",
  "mortar",
  "disruptor",
  "stasis",
  "rally",
];
const displacement: readonly CardId[] = [
  "vanguard",
  "ranger",
  "swarm",
  "raider",
  "sentinel",
  "disruptor",
  "repulsor",
  "stasis",
];
const commandGuard: readonly CardId[] = [
  "bulwark",
  "ranger",
  "medic",
  "lancer",
  "mortar",
  "sentinel",
  "repulsor",
  "rally",
];
export const MISSIONS: readonly Mission[] = [
  {
    id: "bridgehead",
    name: "Brückenkopf",
    briefing: "Die Mitte ist offen. Sichere einen Weg zum gegnerischen Core.",
    tip: "Setze Vanguard an der Front ein und unterstütze ihn aus der Distanz.",
    difficulty: "rookie",
    enemyDeck: DEFAULT_DECK,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 701,
    speedTarget: 150,
    healthTarget: 0.65,
  },
  {
    id: "crossfire",
    name: "Schwarmkontakt",
    briefing:
      "Der Gegner besetzt den linken Mittelsektor. Seine schnellen Truppen drücken nach vorne.",
    tip: "Halte Pulse für dichte Gruppen bereit. Über die rechte Seite kannst du ausweichen.",
    difficulty: "rookie",
    enemyDeck: assault,
    owners: [E, E, E, E, null, null, P, P, P],
    seed: 702,
    speedTarget: 145,
    healthTarget: 0.65,
  },
  {
    id: "breach",
    name: "Stahlriegel",
    briefing:
      "Ein schweres Deck sichert die zentrale Front. Durchbrich die Stellung oder greife seitlich an.",
    tip: "Bulwark bindet Feuer. Lancer braucht Schutz, um am Core Schaden anzurichten.",
    difficulty: "standard",
    enemyDeck: siege,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 703,
    speedTarget: 140,
    healthTarget: 0.6,
  },
  {
    id: "reconnect",
    name: "Abgeschnitten",
    briefing:
      "Dein Außenposten links oben ist isoliert. Die gegnerische Mitte trennt ihn von deiner Basis.",
    tip: "Erobere den linken Mittelsektor zurück, um den Außenposten als Einsatzgebiet zu verbinden.",
    difficulty: "standard",
    enemyDeck: DEFAULT_DECK,
    owners: [P, E, E, E, E, null, P, P, P],
    seed: 704,
    speedTarget: 140,
    healthTarget: 0.55,
  },
  {
    id: "spearhead",
    name: "Gegenstoß",
    briefing:
      "Du hältst die linke Mitte, der Veteran die rechte. Entscheide, wo du den entscheidenden Vorstoß führst.",
    tip: "ATLAS schützt deine bereits eingesetzten Truppen. Nutze den Schild beim Zusammentreffen.",
    difficulty: "veteran",
    enemyDeck: assault,
    owners: [E, E, E, P, null, E, P, P, P],
    seed: 705,
    speedTarget: 135,
    healthTarget: 0.5,
  },
  {
    id: "citadel",
    name: "Die letzte Bastion",
    briefing:
      "Die gesamte Mitte gehört der gegnerischen Festung. Gewinne Boden zurück und zerstöre ihren Core.",
    tip: "Ein gemeinsamer Vorstoß aus Tank, Fernkampf und Unterstützung ist stärker als einzelne Einsätze.",
    difficulty: "veteran",
    enemyDeck: siege,
    owners: [E, E, E, E, E, E, P, P, P],
    seed: 706,
    speedTarget: 135,
    healthTarget: 0.5,
  },
  {
    id: "relay",
    name: "Relaisstation",
    briefing:
      "B2 ist der Schlüssel. Sammle 30 Sekunden verbundene, ungestörte Kontrolle über die Mitte.",
    tip: "Halte deine Versorgung nach B2 offen. Gegner im Zielkreis stoppen den Zähler.",
    difficulty: "standard",
    enemyDeck: DEFAULT_DECK,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 707,
    speedTarget: 100,
    healthTarget: 0.6,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 30 },
  },
  {
    id: "twin-link",
    name: "Doppelverbindung",
    briefing:
      "Kontrolliere zwei der drei mittleren Punkte und sammle 40 Sekunden Kontrollzeit.",
    tip: "Verteile deine Truppen. Ein einzelner starker Vorstoß reicht hier nicht.",
    difficulty: "standard",
    enemyDeck: assault,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 708,
    speedTarget: 120,
    healthTarget: 0.6,
    controlObjective: { pointIds: [3, 4, 5], requiredPoints: 2, seconds: 40 },
  },
  {
    id: "flank-signal",
    name: "Flankensignal",
    briefing:
      "Nur die beiden äußeren Mittelpunkte zählen. Einer davon genügt für 45 Sekunden Kontrollzeit.",
    tip: "Du kannst die eigene Flanke halten oder die gegnerische Verbindung unterbrechen.",
    difficulty: "veteran",
    enemyDeck: assault,
    owners: [E, E, E, P, null, E, P, P, P],
    seed: 709,
    speedTarget: 120,
    healthTarget: 0.5,
    controlObjective: { pointIds: [3, 5], requiredPoints: 1, seconds: 45 },
  },
  {
    id: "lost-relay",
    name: "Störgebiet",
    briefing:
      "Der Gegner kontrolliert B2 bereits. Unterbrich seine Verbindung und sammle selbst 40 Sekunden.",
    tip: "Ein früher Angriff auf den Zielkreis verhindert einen schnellen Kontrollsieg des Gegners.",
    difficulty: "veteran",
    enemyDeck: siege,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 710,
    speedTarget: 120,
    healthTarget: 0.5,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 40 },
  },
  {
    id: "outer-ring",
    name: "Äußerer Ring",
    briefing:
      "Halte beide äußeren Mittelpunkte gleichzeitig für insgesamt 35 Sekunden.",
    tip: "Die Mitte zählt nicht direkt, bleibt aber ein Weg zur gegnerischen Basis.",
    difficulty: "veteran",
    enemyDeck: DEFAULT_DECK,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 711,
    speedTarget: 135,
    healthTarget: 0.5,
    controlObjective: { pointIds: [3, 5], requiredPoints: 2, seconds: 35 },
  },
  {
    id: "signal-crown",
    name: "Signalhoheit",
    briefing:
      "Der Gegner hält zwei Relais. Erobere mindestens zwei zurück und sammle 60 Sekunden Kontrolle.",
    tip: "Verbinde deine Front, halte Verstärkung bereit und nutze Rally, bevor deine Stellung fällt.",
    difficulty: "veteran",
    enemyDeck: siege,
    owners: [E, E, E, E, null, E, P, P, P],
    seed: 712,
    speedTarget: 150,
    healthTarget: 0.45,
    controlObjective: { pointIds: [3, 4, 5], requiredPoints: 2, seconds: 60 },
  },
  {
    id: "scatter",
    name: "Feuerfächer",
    briefing:
      "Mortar-Batterien decken die gegnerische Mitte. Durchbrich die Front über getrennte Angriffswege.",
    tip: "Setze Truppen mit Abstand ein. Ein schneller Raider kann Mortar binden, während Fernkämpfer nachrücken.",
    difficulty: "standard",
    enemyDeck: bombardment,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 713,
    speedTarget: 145,
    healthTarget: 0.55,
  },
  {
    id: "dead-zone",
    name: "Bremszone",
    briefing:
      "Disruptoren verzögern deinen Anmarsch auf B2. Halte das zentrale Relais insgesamt 45 Sekunden.",
    tip: "Die Bremse reduziert keine Angriffe. Fernkämpfer können aus ihrer Stellung weiterfeuern; Rally hilft beim Nachrücken.",
    difficulty: "standard",
    enemyDeck: disruption,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 714,
    speedTarget: 125,
    healthTarget: 0.55,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 45 },
  },
  {
    id: "counter-battery",
    name: "Gegenbatterie",
    briefing:
      "Du hältst links einen Brückenkopf. Rechts sichern schwere Truppen und Mortar den gegnerischen Vorstoß.",
    tip: "Nutze deinen vorgeschobenen Einsatzraum. Ein Angriff auf die gegnerische Unterstützung nimmt Druck von deiner Verteidigung.",
    difficulty: "veteran",
    enemyDeck: bombardment,
    owners: [E, E, E, P, null, E, P, P, P],
    seed: 715,
    speedTarget: 140,
    healthTarget: 0.5,
  },
  {
    id: "broken-circuit",
    name: "Offener Stromkreis",
    briefing:
      "Dein Relais A2 ist von der Basis getrennt. Verbinde es wieder oder erobere C2; sammle 50 Sekunden an einer der beiden Flanken.",
    tip: "A3 verbindet deinen linken Außenposten. Solange diese Verbindung fehlt, liefert A2 weder Kontrollzeit noch vorgeschobene Einsätze.",
    difficulty: "veteran",
    enemyDeck: disruption,
    owners: [E, E, E, P, null, null, E, P, P],
    seed: 716,
    speedTarget: 140,
    healthTarget: 0.5,
    controlObjective: { pointIds: [3, 5], requiredPoints: 1, seconds: 50 },
  },
  {
    id: "cross-current",
    name: "Kreuzstrom",
    briefing:
      "Mortar und Disruptor sichern gemeinsam die Mitte. Halte beide äußeren Relais insgesamt 40 Sekunden.",
    tip: "Zwei kleine Kampfgruppen verteilen das gegnerische Flächenfeuer. Schütze jede Gruppe mit einer eigenen Frontlinie.",
    difficulty: "veteran",
    enemyDeck: combinedArms,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 717,
    speedTarget: 150,
    healthTarget: 0.45,
    controlObjective: { pointIds: [3, 5], requiredPoints: 2, seconds: 40 },
  },
  {
    id: "firewall",
    name: "Feuerwall",
    briefing:
      "Die letzte Verteidigung hält alle drei mittleren Relais. Unterbrich ihre Kontrolle und sammle 70 Sekunden mit mindestens zwei Relais.",
    tip: "Greife früh einen Zielkreis an. Kombiniere geschützten Fernkampf mit einem zweiten Vorstoß, statt alle Truppen auf einem Punkt zu sammeln.",
    difficulty: "veteran",
    enemyDeck: combinedArms,
    owners: [E, E, E, E, E, E, P, P, P],
    seed: 718,
    speedTarget: 165,
    healthTarget: 0.4,
    controlObjective: { pointIds: [3, 4, 5], requiredPoints: 2, seconds: 70 },
  },
  {
    id: "recovery-line",
    name: "Reparaturlinie",
    briefing:
      "LYRA führt eine schwere Reparaturkolonne. Ihre Heilungsimpulse halten beschädigte Verbände im Gefecht.",
    tip: "Konzentriere dein Feuer auf einzelne Ziele. Einheiten, die bereits gefallen sind, kann LYRA nicht zurückholen.",
    difficulty: "veteran",
    enemyCommander: "lyra",
    enemyDeck: recovery,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 719,
    speedTarget: 150,
    healthTarget: 0.45,
  },
  {
    id: "shock-ring",
    name: "Rückstoßring",
    briefing:
      "ATLAS schützt mobile Truppen. Repulsor drängt deine Einheiten aus dem zentralen Relais; sammle dort 45 Sekunden Kontrolle.",
    tip: "Rücke in zwei Wellen an. Nach einem Rückstoß sichern nachrückende Truppen den Kreis, während die erste Gruppe zurückkehrt.",
    difficulty: "veteran",
    enemyCommander: "atlas",
    enemyDeck: displacement,
    owners: [E, E, E, null, null, null, P, P, P],
    seed: 720,
    speedTarget: 140,
    healthTarget: 0.45,
    controlObjective: { pointIds: [4], requiredPoints: 1, seconds: 45 },
  },
  {
    id: "split-command",
    name: "Geteiltes Kommando",
    briefing:
      "Beide Seiten halten eine Flanke. LYRA repariert den gegnerischen Verband – entscheide, wo du den Core-Angriff vorbereitest.",
    tip: "Ein Vorstoß auf der anderen Seite zwingt die langsamen Verteidiger zum Wegwechsel. Dein linker Brückenkopf erlaubt frühe Verstärkung.",
    difficulty: "veteran",
    enemyCommander: "lyra",
    enemyDeck: commandGuard,
    owners: [E, E, E, P, null, E, P, P, P],
    seed: 721,
    speedTarget: 145,
    healthTarget: 0.45,
  },
  {
    id: "frozen-corridor",
    name: "Stillstandkorridor",
    briefing:
      "Stasis und Disruptoren bremsen die äußeren Wege. Halte beide Flankenrelais insgesamt 35 Sekunden gegen ATLAS.",
    tip: "LYRA entfernt Verlangsamung. Alternativ hält geschützter Fernkampf die Stellung, während schnelle Verstärkung nachrückt.",
    difficulty: "veteran",
    enemyCommander: "atlas",
    enemyDeck: displacement,
    owners: [E, E, E, null, E, null, P, P, P],
    seed: 722,
    speedTarget: 150,
    healthTarget: 0.4,
    controlObjective: { pointIds: [3, 5], requiredPoints: 2, seconds: 35 },
  },
  {
    id: "rescue-link",
    name: "Rettungsverbindung",
    briefing:
      "Dein rechter Außenposten ist abgeschnitten. Verbinde C2 über C3 oder erobere A2 und sammle 55 Sekunden Flankenkontrolle.",
    tip: "Der isolierte Punkt zählt erst nach der Wiederverbindung. Greife die Versorgung früh an, bevor LYRA ihre Verteidigung stabilisiert.",
    difficulty: "veteran",
    enemyCommander: "lyra",
    enemyDeck: recovery,
    owners: [E, E, E, null, null, P, P, P, E],
    seed: 723,
    speedTarget: 150,
    healthTarget: 0.4,
    controlObjective: { pointIds: [3, 5], requiredPoints: 1, seconds: 55 },
  },
  {
    id: "command-nexus",
    name: "Kommandoknoten",
    briefing:
      "ATLAS hält die gesamte Mittellinie mit Schild und Rückstoß. Erobere zwei Relais und sammle 65 Sekunden Kontrolle.",
    tip: "Verteile deine Verstärkung auf zwei verbundene Fronten. Sammle nicht die gesamte Armee im Radius eines Repulsors.",
    difficulty: "veteran",
    enemyCommander: "atlas",
    enemyDeck: commandGuard,
    owners: [E, E, E, E, E, E, P, P, P],
    seed: 724,
    speedTarget: 170,
    healthTarget: 0.35,
    controlObjective: { pointIds: [3, 4, 5], requiredPoints: 2, seconds: 65 },
  },
];
export type MissionBest = { stars: number; bestTime: number };
export type CampaignProgress = Record<string, MissionBest>;
export function normalizeProgress(value: unknown): CampaignProgress {
  const result: CampaignProgress = {};
  if (!value || typeof value !== "object") return result;
  for (const mission of MISSIONS) {
    const best = (value as Record<string, MissionBest>)[mission.id];
    if (
      best &&
      Number.isInteger(best.stars) &&
      best.stars >= 1 &&
      best.stars <= 3 &&
      Number.isFinite(best.bestTime) &&
      best.bestTime >= 0 &&
      best.bestTime <= MATCH_DURATION + OVERTIME_DURATION
    )
      result[mission.id] = { stars: best.stars, bestTime: best.bestTime };
  }
  return result;
}
export function missionUnlocked(
  index: number,
  progress: CampaignProgress,
): boolean {
  return (
    index >= 0 &&
    index < MISSIONS.length &&
    (index === 0 || !!progress[MISSIONS[index - 1].id])
  );
}
export function missionStars(mission: Mission, state: MatchState): number {
  if (state.phase !== "ended" || state.winner !== "player") return 0;
  return (
    1 +
    Number(
      state.cores.player.hp / state.cores.player.maxHp >= mission.healthTarget,
    ) +
    Number(state.time <= mission.speedTarget)
  );
}
export function completeMission(
  progress: CampaignProgress,
  mission: Mission,
  state: MatchState,
): CampaignProgress {
  const stars = missionStars(mission, state);
  if (
    !stars ||
    !missionUnlocked(
      MISSIONS.findIndex((item) => item.id === mission.id),
      progress,
    )
  )
    return progress;
  const old = progress[mission.id];
  return {
    ...progress,
    [mission.id]: {
      stars: Math.max(stars, old?.stars ?? 0),
      bestTime: Math.min(state.time, old?.bestTime ?? Infinity),
    },
  };
}

export function objectiveDescription(mission: Mission): string {
  const goal = mission.controlObjective;
  return goal
    ? `${goal.requiredPoints} von ${goal.pointIds.length} markierten Punkten verbunden und ungestört halten: insgesamt ${goal.seconds}s. Core-Zerstörung gewinnt ebenfalls. Nach 3 Minuten zählt Kontrollzeit, dann Core-Leben, dann Gebiet; keine Verlängerung.`
    : "Core zerstören. Am Zeitlimit zählt Core-Leben, dann Gebiet.";
}
