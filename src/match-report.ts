import { COMMANDERS } from "./commanders";
import { MISSIONS } from "./campaign";
import { CARDS, type CardId } from "./engine";
import { HISTORY_LIMIT, type MatchRecord } from "./storage";

const difficultyNames = {
  rookie: "Rekrut",
  standard: "Taktiker",
  veteran: "Veteran",
};
const outcomeNames = {
  player: "Sieg",
  enemy: "Niederlage",
  draw: "Unentschieden",
};
const feedbackNames = {
  again: "Lust auf mehr",
  unclear: "Noch unklar",
  boring: "Zu wenig Spannung",
  "": "Keine Rückmeldung",
};
const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function resultComparison(record: MatchRecord): string {
  const mission = MISSIONS.find((item) => item.id === record.missionId);
  return `${mission ? `<div class="eyebrow">KAMPAGNE · ${mission.name}</div>` : ""}<div class="report-score" aria-label="Endstand"><div class="report-meta"><span>${duration(record.duration)} MIN · ${COMMANDERS[record.commander ?? "atlas"].name}</span><span>${record.control ? "SIGNALKRIEG · " : "BOT · "}${difficultyNames[record.difficulty]}</span></div><div class="report-columns"><span>DU</span><span></span><span>BOT</span><strong>${record.core.player}%</strong><span>CORE</span><strong>${record.core.enemy}%</strong>${record.control ? `<b>${record.control.player}s</b><span>KONTROLLE / ${record.control.target}s</span><b>${record.control.enemy}s</b>` : ""}<b>${record.points.player}</b><span>PUNKTE</span><b>${record.points.enemy}</b></div></div>`;
}
export function renderMatchHistory(
  container: HTMLElement,
  records: readonly MatchRecord[],
  onDeck: (deck: CardId[]) => void,
  onClose: () => void,
) {
  container.innerHTML = `<div class="deck-heading"><div class="eyebrow">DEINE GEFECHTE</div><button id="history-close" class="icon-btn" aria-label="Gefechtsverlauf schließen">×</button></div><h2>Deine letzte Front.</h2><p>Die letzten ${HISTORY_LIMIT} abgeschlossenen Trainingsmatches. Nur auf diesem Gerät gespeichert.</p><div class="match-history"></div>`;
  const list = container.querySelector<HTMLElement>(".match-history")!;
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent =
      "Noch keine Gefechte aufgezeichnet. Schließe ein Match ab; danach findest du hier Endstand und Einsatzdeck. Frühere Gesamtstatistiken bleiben erhalten.";
    list.append(empty);
  }
  for (const record of records) {
    const article = document.createElement("article");
    article.className = "history-entry";
    const date = new Date(record.recordedAt).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    article.innerHTML = `<div class="history-title"><b class="outcome-${record.outcome}">${outcomeNames[record.outcome]}</b><time></time></div>${resultComparison(record)}<p class="history-deck"></p><small class="history-feedback">${feedbackNames[record.feedback]}</small><button class="secondary">Dieses Deck übernehmen →</button>`;
    article.querySelector("time")!.textContent = date;
    article.querySelector(".history-deck")!.textContent = record.deck
      .map((id) => CARDS.find((card) => card.id === id)!.name)
      .join(" · ");
    article.querySelector("button")!.onclick = () => onDeck([...record.deck]);
    list.append(article);
  }
  const close = container.querySelector<HTMLButtonElement>("#history-close")!;
  close.onclick = onClose;
  close.focus();
}
