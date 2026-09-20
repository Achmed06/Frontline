import { analyzeDeck } from "./deck-analysis";
import "./deck-analysis.css";
import { DECK_PRESETS } from "./deck-presets";
import {
  DECK_NAME_LIMIT,
  normalizeDeckSlots,
  storeDeckSlot,
  type DeckSlot,
} from "./deck-slots";
import { masteryLabel, masteryRank, type Mastery } from "./mastery";
import { CARDS, isValidDeck, type CardId } from "./engine";
import { unitSvg } from "./art";

export function renderDeckBuilder(
  container: HTMLElement,
  initial: readonly CardId[],
  onSave: (deck: CardId[]) => void,
  onClose: () => void,
  mastery: Mastery,
  initialSlots: readonly DeckSlot[],
  onSaveSlots: (slots: DeckSlot[]) => boolean,
) {
  const units = CARDS.filter((card) => card.kind === "unit");
  const tactics = CARDS.filter((card) => card.kind === "ability");
  let draft = [...initial];
  let slots = normalizeDeckSlots(initialSlots);
  container.innerHTML = `
    <div class="deck-heading"><div class="eyebrow">DEINE TAKTIK</div><button id="deck-cancel" class="icon-btn" aria-label="Deckauswahl schließen">×</button></div>
    <h2>Stell dich auf.</h2><p class="deck-intro">Wähle sechs Einheiten und zwei Fähigkeiten. Im freien Training erhält der Bot dieselbe Auswahl.</p>
    <section class="deck-library" aria-label="Eigene Deckplätze"><div class="eyebrow">DEINE AUFSTELLUNGEN</div><label for="deck-slot">Speicherplatz</label><select id="deck-slot"></select><label for="deck-slot-name">Deckname</label><input id="deck-slot-name" maxlength="${DECK_NAME_LIMIT}" placeholder="Zum Beispiel: Flankendruck" autocomplete="off"><div class="deck-library-actions"><button id="deck-slot-load" class="secondary">IN EDITOR LADEN</button><button id="deck-slot-save" class="secondary">HIER SPEICHERN</button></div><p id="deck-slot-status" role="status" aria-live="polite">Deckplätze speichern deine Karten. Mit „Deck übernehmen“ aktivierst du die Auswahl. Eine laufende Einsatzserie behält ihr festes Deck.</p></section>
    <p class="deck-intro">MEISTERUNG: Eine Einheit mindestens dreimal in einem abgeschlossenen Gefecht einsetzen = ein Punkt. Bei 1 / 5 / 15 Punkten erhält sie automatisch Bronze / Silber / Gold. Nur optisch, auch Niederlagen zählen.</p><div class="deck-presets">${DECK_PRESETS.map(preset => `<button data-preset="${preset.id}">${preset.name}</button>`).join("") }</div>
    <div class="deck-summary"><strong id="deck-count"></strong><span id="deck-average"></span></div>
    <section id="deck-analysis" class="deck-analysis" aria-label="Deckzusammensetzung"></section><div class="roster">${[...units, ...tactics]
      .map((card) => `${card.id === tactics[0].id ? '<h3 class="tactics-heading">Zwei Fähigkeiten wählen</h3>' : ""}<button class="roster-card" data-mastery="${masteryRank(mastery.units[card.id] ?? 0).frame}" data-unit="${card.id}" aria-pressed="false" aria-label="${card.name} auswählen">
      <div class="roster-art">${unitSvg(card.id)}<span class="roster-cost">ϟ ${card.cost}</span></div><div class="roster-copy"><b>${card.name}</b><span>${card.role}</span><small>${card.kind === "unit" ? `${card.hp} HP · ${card.damage} Schaden` : "TAKTISCHE FÄHIGKEIT"}</small></div><p>${card.description}</p>${card.kind === "unit" ? `<small class="mastery-label">${masteryLabel(mastery, card.id)}</small>` : ""}<span class="roster-check" aria-hidden="true">+</span>
    </button>`).join("")}</div>
    <p id="deck-message" class="deck-message" role="status" aria-live="polite"></p>
    <button id="deck-save" class="primary">DECK ÜBERNEHMEN <span>→</span></button>`;
  const get = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-unit]"));
  const completeDeck = () => [
    ...draft.filter((id) => units.some((c) => c.id === id)),
    ...draft.filter((id) => tactics.some((c) => c.id === id)),
  ];
  function update(message = "") {
    buttons.forEach((button) => {
      const chosen = draft.includes(button.dataset.unit as CardId);
      button.classList.toggle("chosen", chosen);
      button.setAttribute("aria-pressed", String(chosen));
      button.setAttribute("aria-label", `${CARDS.find((card) => card.id === button.dataset.unit)!.name} ${chosen ? "entfernen" : "auswählen"}`);
      button.querySelector(".roster-check")!.textContent = chosen ? "✓" : "+";
    });
    const unitCount = draft.filter((id) => units.some((c) => c.id === id)).length;
    const tacticCount = draft.length - unitCount;
    get("deck-count").textContent = `${unitCount}/6 EINHEITEN · ${tacticCount}/2 TAKTIKEN`;
    const cards = completeDeck().map((id) => CARDS.find((card) => card.id === id)!);
    get("deck-average").textContent = `Ø ${(cards.reduce((sum, card) => sum + card.cost, 0) / Math.max(1, cards.length)).toFixed(1)} Energie`;
    const analysis = analyzeDeck(draft);
    get("deck-analysis").innerHTML = `<b>DEINE AUFSTELLUNG</b><div class="analysis-counts"><span>${analysis.frontline} Nahkampf</span><span>${analysis.ranged} Fernkampf</span><span>${analysis.support} Heiler</span><span>${analysis.cheap} günstige Einheiten</span></div>${analysis.hints.map(hint => `<p>${hint}</p>`).join("")}<small>Gezählt werden Karten, nicht einzelne Schwarmmitglieder. Hinweise sind keine Siegprognose.</small>`;
    get<HTMLButtonElement>("deck-save").disabled = !isValidDeck(completeDeck());
    get<HTMLButtonElement>("deck-slot-save").disabled = !isValidDeck(completeDeck());
    get("deck-message").textContent = message || (isValidDeck(completeDeck())
      ? "Deck vollständig. Alle Einheiten haben für beide Seiten gleiche Werte."
      : `Noch ${6 - unitCount} ${unitCount === 5 ? "Einheit" : "Einheiten"} und ${2 - tacticCount} ${tacticCount === 1 ? "Fähigkeit" : "Fähigkeiten"} wählen.`);
  }
  buttons.forEach((button) => (button.onclick = () => {
    const id = button.dataset.unit as CardId;
    const kind = CARDS.find((card) => card.id === id)!.kind;
    const count = draft.filter((selected) => CARDS.find((card) => card.id === selected)!.kind === kind).length;
    if (draft.includes(id)) draft = draft.filter((selected) => selected !== id);
    else if (count < (kind === "unit" ? 6 : 2)) draft.push(id);
    else { update("Entferne zuerst eine Karte desselben Typs, um sie auszutauschen."); return; }
    update();
  }));
  container.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => (button.onclick = () => {
    const preset = DECK_PRESETS.find(item => item.id === button.dataset.preset);
    if (!preset) return;
    draft = [...preset.cards];
    update();
  }));
  const slotSelect = get<HTMLSelectElement>("deck-slot");
  const slotName = get<HTMLInputElement>("deck-slot-name");
  function refreshSlots(selected: number) {
    slotSelect.replaceChildren();
    slots.forEach((slot, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index + 1} · ${slot?.name ?? "Freier Platz"}`;
      slotSelect.append(option);
    });
    slotSelect.value = String(selected);
    slotName.value = slots[selected]?.name ?? "";
    get<HTMLButtonElement>("deck-slot-load").disabled = !slots[selected];
    get("deck-slot-save").textContent = slots[selected] ? "PLATZ ÜBERSCHREIBEN" : "HIER SPEICHERN";
  }
  slotSelect.onchange = () => refreshSlots(Number(slotSelect.value));
  get("deck-slot-load").onclick = () => {
    const slot = slots[Number(slotSelect.value)];
    if (!slot) return;
    draft = [...slot.cards];
    update();
    get("deck-slot-status").textContent = `${slot.name} geladen. Du kannst es bearbeiten oder unten als aktives Deck übernehmen.`;
  };
  get("deck-slot-save").onclick = () => {
    const cards = completeDeck();
    if (!isValidDeck(cards)) return;
    const index = Number(slotSelect.value);
    slots = storeDeckSlot(slots, index, slotName.value, cards);
    const persisted = onSaveSlots(normalizeDeckSlots(slots));
    refreshSlots(index);
    get("deck-slot-status").textContent = persisted
      ? `${slots[index]!.name} auf Platz ${index + 1} gespeichert.`
      : "Speicher nicht verfügbar: Deckplatz bleibt nur für diese Sitzung erhalten.";
  };
  refreshSlots(0);
  get<HTMLButtonElement>("deck-cancel").onclick = onClose;
  get<HTMLButtonElement>("deck-save").onclick = () => {
    const deck = completeDeck();
    if (isValidDeck(deck)) onSave(deck);
  };
  update();
  get<HTMLButtonElement>("deck-cancel").focus();
}
