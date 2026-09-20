/** New local draft mode; completed decks use the existing combat rules. */
import { CARDS, isValidDeck, type CardId } from "./engine";
import { unitSvg } from "./art";
export function draftOffers(
  picks: readonly CardId[],
  random = Math.random,
): CardId[] {
  if (picks.length >= 8) return [];
  const kind = picks.length < 6 ? "unit" : "ability";
  const pool = CARDS.filter(
    (card) => card.kind === kind && !picks.includes(card.id),
  ).map((card) => card.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
export function renderDraft(
  container: HTMLElement,
  onStart: (deck: CardId[]) => void,
  onClose: () => void,
) {
  const picks: CardId[] = [];
  function render() {
    const complete = picks.length === 8;
    const offers = draftOffers(picks);
    container.innerHTML = `<div class="deck-heading"><div class="eyebrow">DRAFT · LOKAL GEGEN BOT</div><button id="draft-close" class="icon-btn" aria-label="Draft verlassen">×</button></div><h2>${complete ? "Deine Auswahl steht." : picks.length < 6 ? "Wähle deine Truppe." : "Wähle deine Taktik."}</h2><p>Sechs Einheiten, zwei Fähigkeiten. Pro Runde wählst du eine von drei Karten. Der Bot erhält dasselbe Deck und deinen gewählten Kommandanten.</p><div class="draft-progress"><b>${picks.length}/8 GEWÄHLT</b><span>${complete ? "BEREIT" : picks.length < 6 ? `EINHEIT ${picks.length + 1}/6` : `TAKTIK ${picks.length - 5}/2`}</span></div><div class="draft-picked">${
      picks
        .map((id) => {
          const card = CARDS.find((c) => c.id === id)!;
          return `<div title="${card.name}">${unitSvg(id)}<small>${card.name}</small></div>`;
        })
        .join("") || "<p>Dein Deck entsteht hier.</p>"
    }</div>${
      complete
        ? `<p>Core-Angriff · Taktiker · bis zu 3 Minuten plus mögliche Verlängerung. Meisterung und Lernaufträge zählen. Dein gespeichertes Einsatzdeck bleibt erhalten.</p><button id="draft-start" class="primary">DRAFT-GEFECHT STARTEN ↗</button>`
        : `<div class="draft-offers">${offers
            .map((id) => {
              const card = CARDS.find((c) => c.id === id)!;
              return `<button data-draft-card="${id}"><span class="draft-art">${unitSvg(id)}<b>ϟ ${card.cost}</b></span><strong>${card.name}</strong><small>${card.role}</small><p>${card.description}</p><span class="draft-pick-label">WÄHLEN +</span></button>`;
            })
            .join(
              "",
            )}</div><p class="draft-tip">Achte auf Energiebedarf und ergänzende Rollen. Die nicht gewählten Karten können später wieder angeboten werden.</p>`
    }`;
    container.querySelector<HTMLButtonElement>("#draft-close")!.onclick =
      onClose;
    container
      .querySelectorAll<HTMLButtonElement>("[data-draft-card]")
      .forEach((button) => {
        button.onclick = () => {
          const id = button.dataset.draftCard as CardId;
          if (!offers.includes(id) || picks.includes(id)) return;
          picks.push(id);
          render();
        };
      });
    const start = container.querySelector<HTMLButtonElement>("#draft-start");
    if (start)
      start.onclick = () => {
        if (isValidDeck(picks)) onStart([...picks]);
      };
    (start ??
      container.querySelector<HTMLButtonElement>("[data-draft-card]") ??
      container.querySelector<HTMLButtonElement>("#draft-close"))!.focus({
      preventScroll: true,
    });
    container.scrollTop = 0;
  }
  render();
}
