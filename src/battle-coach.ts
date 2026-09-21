import { CARDS, type MatchState } from "./engine";
import {
  commanderHasValidTarget,
  type CommanderId,
} from "./commanders";
import {
  matchLearning,
  type LearningProgress,
  type LessonId,
} from "./headquarters";

export type BattleCoachFocus = "cards" | "arena" | "commander";

export type BattleCoachHint = {
  lesson: LessonId;
  kicker: string;
  title: string;
  detail: string;
  focus: BattleCoachFocus;
  current: number;
  goal: number;
};

const GOALS: Record<LessonId, number> = {
  deploy: 3,
  capture: 1,
  ability: 1,
  win: 1,
};

function total(
  progress: LearningProgress,
  state: MatchState,
  lesson: LessonId,
): number {
  const live = matchLearning(state);
  return Math.min(GOALS[lesson], progress.counts[lesson] + live[lesson]);
}

/**
 * First-session guidance only. It reads the existing permanent learning path and
 * never changes match rules, energy, targeting or rewards.
 */
export function battleCoachHint(
  progress: LearningProgress,
  state: MatchState,
  selectedCardId: string | null,
  commander: CommanderId = "atlas",
): BattleCoachHint | null {
  const deployed = total(progress, state, "deploy");
  if (deployed < GOALS.deploy) {
    const selected = CARDS.find((card) => card.id === selectedCardId);
    const unitSelected = selected?.kind === "unit";
    if (!unitSelected) {
      return {
        lesson: "deploy",
        kicker: "FELDAUSBILDUNG · SCHRITT 1",
        title: deployed ? "NÄCHSTE TRUPPE WÄHLEN" : "TRUPPE WÄHLEN",
        detail:
          "Tippe unten auf eine Einheitenkarte. Die Zahl am Kartenrand sind ihre Energiekosten.",
        focus: "cards",
        current: deployed,
        goal: GOALS.deploy,
      };
    }
    return {
      lesson: "deploy",
      kicker: "FELDAUSBILDUNG · SCHRITT 1",
      title: "TRUPPE EINSETZEN",
      detail:
        "Halte im grünen Einsatzgebiet, ziehe zum gewünschten Punkt und lass los. Nur verbundener Boden versorgt deine Front.",
      focus: "arena",
      current: deployed,
      goal: GOALS.deploy,
    };
  }

  const captured = total(progress, state, "capture");
  if (captured < GOALS.capture) {
    return {
      lesson: "capture",
      kicker: "FELDAUSBILDUNG · SCHRITT 2",
      title: "BODEN EROBERN",
      detail:
        "Bringe Truppen in einen neutralen oder gegnerischen Kontrollpunkt. Gegner im Kreis stoppen die Eroberung.",
      focus: "arena",
      current: captured,
      goal: GOALS.capture,
    };
  }

  const ability = total(progress, state, "ability");
  if (ability < GOALS.ability) {
    const commanderReady =
      state.commanderCooldown <= 0 &&
      commanderHasValidTarget(commander, state.units, "player");
    if (commanderReady) {
      return {
        lesson: "ability",
        kicker: "FELDAUSBILDUNG · SCHRITT 3",
        title: "KOMMANDANTENFÄHIGKEIT NUTZEN",
        detail:
          "Tippe auf deinen Kommandanten, sobald der gezeigte Effekt deinen aktuellen Truppen wirklich hilft.",
        focus: "commander",
        current: ability,
        goal: GOALS.ability,
      };
    }
    return {
      lesson: "ability",
      kicker: "FELDAUSBILDUNG · SCHRITT 3",
      title: "TAKTIK EINSETZEN",
      detail:
        state.commanderCooldown > 0
          ? "Dein Kommandant lädt noch. Du kannst stattdessen eine Taktikkarte aus deinem Deck nutzen."
          : "Dein Kommandant hat gerade kein gültiges Ziel. Nutze bis dahin eine Taktikkarte oder bringe passende Truppen in Stellung.",
      focus: "cards",
      current: ability,
      goal: GOALS.ability,
    };
  }

  const won = total(progress, state, "win");
  if (won < GOALS.win) {
    const owned = state.points.filter((point) => point.owner === "player").length;
    return {
      lesson: "win",
      kicker: "FELDAUSBILDUNG · SCHRITT 4",
      title: owned >= 6 ? "CORE DURCHBRECHEN" : "FRONT WEITER SCHIEBEN",
      detail:
        owned >= 6
          ? "Deine Front steht weit vorne. Halte den Weg offen und bringe den Vorstoß bis zum gegnerischen Core."
          : "Erobere weitere verbundene Punkte. Je weiter deine Front vorrückt, desto näher kannst du Verstärkung einsetzen.",
      focus: "arena",
      current: won,
      goal: GOALS.win,
    };
  }

  return null;
}
