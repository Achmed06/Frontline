/** New local draft mode; completed decks use the existing combat rules. */
import { CARDS, isValidDeck, type CardId } from "./engine";
import { unitSvg } from "./art";
import { draftPreparation } from "./mode-preparation";
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
    const preparation = draftPreparation(picks);
    const complete = preparation.phase === "ready";
    const offers = draftOffers(picks);
    container.innerHTML = `<div class="deck-heading"><div class="eyebrow">DRAFT · LOKAL GEGEN BOT</div><button id="draft-close" class="icon-btn" aria-label="Draft verlassen">×</button></div><section class="draft-hero ${complete ? "ready" : preparation.phase}"><div><small>DRAFT-FORTSCHRITT</small><h2>${complete ? "Deine Auswahl steht." : preparation.phase === "units" ? "Baue deine Truppe." : "Lege deine Taktik fest."}</h2><p>Sechs Einheiten, zwei Fähigkeiten. Pro Runde wählst du eine von drei Karten. Der Bot erhält dasselbe Deck und deinen gewählten Kommandanten.</p></div><div class="draft-hero-status"><strong>${preparation.picked}/8</strong><b>${preparation.phaseLabel}</b><span>${preparation.nextSlot}</span></div></section><div class="draft-stage-track" aria-label="${preparation.picked} von 8 Karten gewählt"><span class="${preparation.unitCount === 6 ? "complete" : preparation.phase === "units" ? "active" : ""}"><b>01</b><i></i><small>6 EINHEITEN</small></span><span class="${preparation.phase === "abilities" ? "active" : preparation.abilityCount === 2 ? "complete" : ""}"><b>02</b><i></i><small>2 TAKTIKEN</small></span><span class="${complete ? "complete active" : ""}"><b>03</b><i></i><small>EINSATZ</small></span></div><div class="draft-progress"><b>${preparation.picked}/8 GEWÄHLT</b><span>${preparation.nextSlot}</span></div><div class="draft-picked draft-loadout">${
      Array.from({ length: 8 }, (_, index) => {
        const id = picks[index];
        if (!id)
          return `<div class="draft-empty ${index >= 6 ? "ability" : "unit"}"><span>+</span><small>${index >= 6 ? `TAKTIK ${index - 5}` : `EINHEIT ${index + 1}`}</small></div>`;
        const card = CARDS.find((c) => c.id === id)!;
        return `<div class="filled ${card.kind}" title="${card.name}"><i>ϟ ${card.cost}</i>${unitSvg(id)}<small>${card.name}</small></div>`;
      }).join("")
    }</div>${
      complete
        ? `<section class="draft-ready-card"><small>EINSATZPARAMETER</small><div><span>CORE-ANGRIFF</span><span>TAKTIKER</span><span>3 MIN + OVERTIME</span></div><p>Meisterung und Lernaufträge zählen. Dein gespeichertes Einsatzdeck bleibt erhalten.</p></section><button id="draft-start" class="primary draft-start">DRAFT-GEFECHT STARTEN ↗</button>`
        : `<div class="draft-choice-label"><span>ANGEBOT ${preparation.picked + 1}/8</span><b>${preparation.phase === "units" ? "EINE EINHEIT WÄHLEN" : "EINE TAKTIK WÄHLEN"}</b></div><div class="draft-offers">${offers
            .map((id) => {
              const card = CARDS.find((c) => c.id === id)!;
              return `<button data-draft-card="${id}"><span class="draft-art">${unitSvg(id)}<b>ϟ ${card.cost}</b></span><strong>${card.name}</strong><small>${card.role}</small><p>${card.description}</p><span class="draft-pick-label">WÄHLEN +</span></button>`;
            })
            .join(
              "",
            )}</div><p class="draft-tip">Achte auf Energiebedarf und ergänzende Rollen. Nicht gewählte Karten können in späteren Runden erneut erscheinen.</p>`
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
