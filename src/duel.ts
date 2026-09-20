import { nativeApp, watchAppState } from "./mobile";
import { nativeDuelServer } from "./mobile-config";
import { renderDeckBuilder } from "./deck-builder";
import { DECK_PRESETS } from "./deck-presets";
import { duelAlerts } from "./duel-alerts";
import { ARENA_THEMES, type ArenaThemeId } from "./arena-themes";
import Phaser from "phaser";
import { Match, TRAINING_CONTROL, CARDS, BOARD_WIDTH, BOARD_HEIGHT, type CardId } from "./engine";
import { ArenaScene } from "./scene";
import { COMMANDERS, type CommanderId } from "./commanders";
import { unitSvg } from "./art";
import { Sound } from "./audio";
import { readDeck, readDeckSlots, readMastery, saveDeckSlots, readCommander, setting } from "./storage";
import { duelPerspective, type DuelSnapshot } from "./duel-protocol";
import { inviteCode, inviteUrl } from "./duel-invite";
import "./duel.css";
const nativeServer = nativeDuelServer(import.meta.env.VITE_DUEL_SERVER_URL);
const serverAvailable = !nativeApp || nativeServer !== null;
const apiUrl = nativeApp && nativeServer ? `${nativeServer}/api/duel` : "/api/duel";
const invitationBase = nativeApp && nativeServer ? `${nativeServer}/duel.html` : location.href;
type Session = { code: string; token: string; seq: number };
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main class="duel-shell"><header><a id="back-to-base" href="./">FRONTLINE</a><b>FREUNDESDUELL</b><button id="duel-sound" aria-label="Ton einschalten" aria-pressed="false">TON AUS</button></header><section id="room-panel"><h1>Deine Front.<br>Dein Gegenüber.</h1><p>Fordere einen Freund heraus. Drei Minuten, zwei Kommandanten, eine Front. Wähle dein Deck und Kommando für dieses Duell.</p><label for="duel-deck">DEIN DECK</label><select id="duel-deck"></select><p id="preset-tip" hidden></p><label for="duel-commander">DEIN KOMMANDO</label><select id="duel-commander"></select><div id="loadout" class="loadout-preview" aria-label="Dein Duell-Deck"></div><p id="invite-notice" hidden></p><label for="duel-mode">SPIELMODUS FÜR DEINEN RAUM</label><select id="duel-mode"><option value="core">Core-Angriff</option><option value="control">Signalkrieg · Relais halten</option></select><p id="mode-description">Zerstöre den gegnerischen Core. Bei Zeitablauf entscheidet der bestehende Tie-Break.</p><fieldset class="duel-themes"><legend>DEIN SCHLACHTFELD</legend><div id="theme-options"></div><small>Gilt für deinen neuen Raum. Beim Beitritt bestimmt der Gastgeber den Schauplatz.</small></fieldset><button id="create">RAUM ERSTELLEN</button><label for="code">Raumcode</label><input id="code" maxlength="6" placeholder="A1B2C3" autocomplete="off" autocapitalize="characters" spellcheck="false"><button id="join">BEITRETEN</button><p>Beide Geräte müssen dieselbe laufende Serveradresse öffnen. Für Handys im selben WLAN die Netzwerkadresse des Rechners verwenden, nicht localhost.</p><small>Lokaler PvP-Test · kein Matchmaking oder Konto. Duelle vergeben vorerst keine Kampagnen- oder Meisterungsbelohnungen.</small></section><section id="waiting" hidden><h2>Warte auf deinen Freund</h2><strong id="room-code"></strong><p id="room-expiry"></p><p id="waiting-theme"></p><div id="waiting-loadout" class="loadout-preview"></div><p id="waiting-objective"></p><p>Lade deinen Freund ein. Sobald er beitritt, beginnt euer Duell. Der Raum läuft nach fünf Minuten ab.</p><div class="invite-actions"><button id="share-room">FREUND EINLADEN</button><button id="copy-code">CODE KOPIEREN</button></div><label for="invite-link">Einladungslink</label><input id="invite-link" readonly aria-label="Einladungslink zum Kopieren"><p id="invite-feedback" role="status"></p><small id="local-invite-note" hidden>Dieser Link enthält eine lokale Rechneradresse. Für ein anderes Gerät öffne das Spiel zuerst über die WLAN-Adresse des Servers.</small></section><p id="status" role="status" aria-live="polite">Bereit.</p><aside id="connection-warning" role="status" aria-live="polite" hidden><b>VERBINDUNG UNTERBROCHEN</b><p id="connection-detail"></p><small>Das Match läuft auf dem Server weiter. Nach 20 Sekunden ohne Kontakt kann die Runde als verloren gelten.</small></aside><section id="battle" hidden><div class="battle-toolbar"><span>GEFECHTSANSICHT</span><button id="compact-view" aria-pressed="false">KOMPAKT</button></div><div class="duel-score" aria-label="Duellstand"><span>DU <b id="score-own">0</b></span><div><strong id="round-label"></strong><small id="score-draw"></small></div><span><b id="score-other">0</b> GEGNER</span></div><div class="duel-hud"><b id="own-hp"></b><strong id="clock"></strong><b id="other-hp"></b></div><section id="control-hud" hidden><b>2 MITTLERE RELAIS VERBUNDEN HALTEN</b><div><label>DU <meter id="control-own" min="0" max="45" value="0"></meter><span id="control-own-time"></span></label><label>GEGNER <meter id="control-other" min="0" max="45" value="0"></meter><span id="control-other-time"></span></label></div><small>Ungestört halten · 45 Sekunden sammeln · Core-Zerstörung gewinnt ebenfalls</small></section><div id="frontline-status"><div><b id="territory-own"></b><b id="territory-other"></b></div><div id="territory-strip" aria-label="Kontrollpunkte von oben links nach unten rechts"></div><p id="supply-status"></p></div><p id="battle-alert" role="status" aria-live="polite" hidden></p><div class="duel-arena-wrap"><div id="arena"></div><div id="countdown-overlay" hidden><span id="versus"></span><strong id="countdown-number" role="status" aria-live="polite"></strong><small id="battle-theme"></small></div></div><div class="duel-energy"><div class="energy-reserve"><b id="energy"></b><meter id="energy-meter" min="0" max="10" value="6" aria-label="Verfügbare Energie"></meter></div><span id="selection">Karte wählen, dann in der Arena einsetzen.</span></div><p id="action-feedback" role="status" aria-live="polite" hidden></p><div id="duel-cards"></div><button id="hero" aria-describedby="own-commander-help"></button><progress id="hero-charge" max="1" value="1" aria-label="Kommandofähigkeit aufgeladen"></progress><details id="battle-help"><summary>KOMMANDOS & SIEGBEDINGUNGEN <span>＋</span></summary><small>Das Online-Duell läuft weiter.</small><article class="own-command"><b id="own-commander-title"></b><p id="own-commander-help"></p></article><article class="enemy-command"><b id="enemy-commander-title"></b><p id="enemy-commander-help"></p></article><article><b>SO GEWINNST DU</b><p id="victory-help"></p></article><article><b>DEINE FRONT VERSORGEN</b><p>Erobere verbundene Punkte, um weiter vorn Truppen einzusetzen. Abgeschnittene Punkte erweitern deine Einsatzlinie nicht. Gegner am Punkt unterbrechen die Eroberung.</p></article></details></section><section id="result" hidden><h2 id="result-title" tabindex="-1"></h2><p id="result-reason"></p><div id="duel-report"></div><button id="rematch">REVANCHE</button><p id="rematch-status" role="status"></p><button id="inspect-battle" aria-expanded="false" aria-controls="battle">SCHLACHTFELD ANSEHEN</button><a id="new-room" href="./duel.html">NEUER RAUM</a></section><button id="leave" hidden>DUELL VERLASSEN / AUFGEBEN</button><p class="duel-note">Keine Pause im PvP. Bei Verbindungsabbruch bleiben 20 Sekunden zum Wiederverbinden. Diese Seite neu laden stellt die Sitzung wieder her.</p></main><dialog id="leave-dialog" aria-labelledby="leave-title" aria-describedby="leave-description"><h2 id="leave-title">Duell aufgeben?</h2><p id="leave-description">Dein Gegenüber gewinnt diese Runde. Das Duell läuft während dieser Rückfrage weiter.</p><form method="dialog"><button value="cancel" autofocus>WEITERSPIELEN</button><button id="confirm-leave" type="button">AUFGEBEN & ZUR BASIS</button></form></dialog><dialog id="duel-editor" aria-label="Duell-Deck bearbeiten"><div id="duel-editor-content"></div></dialog>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let compactView = setting("duel-compact") === "on";
function updateCompactView() {
  el("battle").classList.toggle("compact", compactView);
  el("compact-view").setAttribute("aria-pressed", String(compactView));
  el("compact-view").textContent = compactView ? "DETAILS ZEIGEN" : "KOMPAKT";
}
el("compact-view").onclick = () => {
  compactView = !compactView;
  setting("duel-compact", compactView ? "on" : "off");
  updateCompactView();
  game.scale.refresh();
};
updateCompactView();
const sound = new Sound();
sound.enabled = setting("sound") === "on";
function updateSound() {
  el("duel-sound").textContent = sound.enabled ? "♪ TON AN" : "TON AUS";
  el("duel-sound").setAttribute("aria-pressed", String(sound.enabled));
  el("duel-sound").setAttribute("aria-label", sound.enabled ? "Ton ausschalten" : "Ton einschalten");
}
el("duel-sound").onclick = () => {
  sound.enabled = !sound.enabled;
  setting("sound", sound.enabled ? "on" : "off");
  sound.unlock(); sound.play("select"); updateSound();
};
app.addEventListener("pointerdown", () => sound.unlock(), { passive: true });
app.addEventListener("keydown", () => sound.unlock());
updateSound();
const invitation = inviteCode(location.search);
if (invitation) {
  el<HTMLInputElement>("code").value = invitation;
  el("invite-notice").hidden = false;
  el("invite-notice").textContent = `Du bist eingeladen · Raum ${invitation}. Prüfe dein Deck und tritt bei.`;
}
function loadoutPreview(deck: readonly CardId[], commanderId: CommanderId) {
  const commander = COMMANDERS[commanderId];
  const cost = deck.reduce((sum, id) => sum + CARDS.find(card => card.id === id)!.cost, 0) / deck.length;
  return `<b>${commander.name} · ${commander.role}</b><p class="loadout-ability">${commander.description}</p><div>${deck.map(id => {
    const card = CARDS.find(c => c.id === id)!;
    return `<button type="button" class="preview-card" data-preview-card="${id}" aria-pressed="false" aria-label="${card.name}: Details anzeigen">${unitSvg(id)}<small>${card.name}</small><em>ϟ ${card.cost}</em></button>`;
  }).join("")}</div><small>Ø ${cost.toFixed(1)} Energie · ${deck.length} Karten · Karte antippen für Details</small><section class="preview-detail" role="status" aria-live="polite" hidden></section>`;
}
for (const containerId of ["loadout", "waiting-loadout"]) {
  el(containerId).addEventListener("click", event => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-preview-card]");
    if (!button) return;
    const card = CARDS.find(item => item.id === button.dataset.previewCard);
    if (!card) return;
    const selected = button.getAttribute("aria-pressed") !== "true";
    el(containerId).querySelectorAll<HTMLButtonElement>("[data-preview-card]").forEach(item => item.setAttribute("aria-pressed", String(selected && item === button)));
    const detail = el(containerId).querySelector<HTMLElement>(".preview-detail")!;
    detail.hidden = !selected;
    if (!selected) return;
    const stats = card.kind === "unit"
      ? `${card.count ?? 1} Einheit${(card.count ?? 1) === 1 ? "" : "en"} · ${card.hp} HP pro Einheit · ${card.damage} Schaden pro Treffer${card.interval ? ` · alle ${card.interval} s` : ""}`
      : "Taktische Fähigkeit · Ziel in der Arena wählen";
    detail.innerHTML = `<b>${card.name} · ϟ ${card.cost}</b><small>${card.role}</small><p>${card.description}</p><p class="preview-stats">${stats}</p>`;
  });
}
const activeDeck = readDeck();
let deckSlots = readDeckSlots();
let duelDeck = [...activeDeck];
let duelCommander = readCommander();
const deckSelect = el<HTMLSelectElement>("duel-deck");
deckSelect.add(new Option("Aktives Deck", "active"));
const customDeckOption = new Option("Eigenes Duell-Deck", "custom");
customDeckOption.disabled = true;
deckSelect.add(customDeckOption);
let customDeck: CardId[] | null = null;
deckSlots.forEach((slot, index) => {
  const option = new Option(slot ? `${index + 1} · ${slot.name}` : `${index + 1} · Leer`, String(index));
  option.disabled = !slot;
  deckSelect.add(option);
});
const presetGroup = document.createElement("optgroup");
presetGroup.label = "Taktikvorlagen";
for (const preset of DECK_PRESETS) presetGroup.appendChild(new Option(preset.name, `preset:${preset.id}`));
deckSelect.appendChild(presetGroup);
const commanderSelect = el<HTMLSelectElement>("duel-commander");
for (const [id, commander] of Object.entries(COMMANDERS)) commanderSelect.add(new Option(`${commander.name} · ${commander.role}`, id));
commanderSelect.value = duelCommander;
function refreshLoadout() {
  el("loadout").innerHTML = loadoutPreview(duelDeck, duelCommander) + `<button type="button" id="edit-duel-deck">KARTEN TAUSCHEN</button>`;
}
deckSelect.onchange = () => {
  const slot = deckSlots[Number(deckSelect.value)];
  const preset = DECK_PRESETS.find(item => `preset:${item.id}` === deckSelect.value);
  duelDeck = [...(deckSelect.value === "custom" && customDeck ? customDeck : preset?.cards ?? (deckSelect.value === "active" || !slot ? activeDeck : slot.cards))];
  el("preset-tip").hidden = !preset;
  el("preset-tip").textContent = preset?.tip ?? "";
  refreshLoadout();
};
commanderSelect.onchange = () => { duelCommander = commanderSelect.value as CommanderId; refreshLoadout(); };
refreshLoadout();
el("loadout").addEventListener("click", event => {
  if (!(event.target as Element).closest("#edit-duel-deck") || session || busy) return;
  const dialog = el<HTMLDialogElement>("duel-editor");
  renderDeckBuilder(el("duel-editor-content"), duelDeck, cards => {
    customDeck = [...cards]; duelDeck = [...cards];
    customDeckOption.disabled = false; deckSelect.value = "custom";
    el("preset-tip").hidden = true;
    refreshLoadout(); dialog.close();
  }, () => dialog.close(), readMastery(), deckSlots, slots => {
    if (!saveDeckSlots(slots)) return false;
    deckSlots = slots;
    deckSlots.forEach((slot, index) => {
      const option = Array.from(deckSelect.options).find(item => item.value === String(index))!;
      option.textContent = slot ? `${index + 1} · ${slot.name}` : `${index + 1} · Leer`;
      option.disabled = !slot;
    });
    return true;
  });
  el("duel-editor-content").querySelector(".deck-intro")!.textContent = "Sechs Einheiten und zwei Fähigkeiten für dein Duell. Übernehmen ändert nur diese Aufstellung; in einem Deckplatz kannst du sie dauerhaft speichern.";
  dialog.showModal(); dialog.scrollTop = 0;
});
let waitingPreviewCode = "";
let session: Session | null = null;
try {
  const value = JSON.parse(sessionStorage.getItem("frontline-duel") ?? "null");
  if (
    value &&
    /^[A-F0-9]{6}$/.test(value.code) &&
    /^[a-f0-9]{48}$/.test(value.token) &&
    Number.isSafeInteger(value.seq) &&
    value.seq >= 0
  )
    session = value;
} catch {}
if (session && invitation && session.code !== invitation) {
  el("invite-notice").textContent = "Dein laufendes Duell wird wiederhergestellt. Verlasse es zuerst, bevor du der Einladung beitrittst.";
}
async function copyInvite(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value);
    el("invite-feedback").textContent = success;
  } catch {
    const field = el<HTMLInputElement>("invite-link");
    field.focus(); field.select();
    el("invite-feedback").textContent = "Den markierten Einladungslink bitte manuell kopieren.";
  }
}
el("share-room").onclick = async () => {
  if (!session || started) return;
  const url = inviteUrl(invitationBase, session.code);
  if (navigator.share) {
    try {
      await navigator.share({ title: "FRONTLINE · Freundesduell", text: `Komm in mein Duell! Raum ${session.code}`, url });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }
  await copyInvite(url, "Einladungslink kopiert. Schicke ihn deinem Freund.");
};
el("copy-code").onclick = () => {
  if (session) void copyInvite(session.code, "Raumcode kopiert.");
};
function persist() {
  try {
    if (session)
      sessionStorage.setItem("frontline-duel", JSON.stringify(session));
    else sessionStorage.removeItem("frontline-duel");
  } catch {}
}
let match = new Match({ botEnabled: false }),
  selected: CardId | null = null,
  started = false,
  connected = false,
  complete = false,
  busy = false;
let arenaTheme: ArenaThemeId = "coast";
el("duel-mode").onchange = () => {
  el("mode-description").textContent = el<HTMLSelectElement>("duel-mode").value === "control"
    ? "Halte zwei der drei mittleren Relais verbunden und ungestört. Sammle 45 Sekunden Kontrollzeit. Core-Zerstörung gewinnt ebenfalls."
    : "Zerstöre den gegnerischen Core. Bei Zeitablauf entscheidet der bestehende Tie-Break.";
};
let chosenTheme: ArenaThemeId = "coast";
el("theme-options").innerHTML = Object.entries(ARENA_THEMES).map(([id, theme]) => `<button type="button" data-theme="${id}" aria-pressed="${id === chosenTheme}" style="--terrain:#${theme.ground.toString(16).padStart(6, "0")};--water:#${theme.water.toString(16).padStart(6, "0")};--accent:#${theme.accent.toString(16).padStart(6, "0")}"><span class="theme-island" aria-hidden="true">◆</span>${theme.name}</button>`).join("");
el("theme-options").querySelectorAll<HTMLButtonElement>("[data-theme]").forEach(button => {
  button.onclick = () => {
    chosenTheme = button.dataset.theme as ArenaThemeId;
    el("theme-options").querySelectorAll<HTMLButtonElement>("[data-theme]").forEach(option => option.setAttribute("aria-pressed", String(option === button)));
  };
});
let round = 0;
let reportedRound = 0;
let inspectBattle = false;
el("battle").before(el("result"));
el("inspect-battle").onclick = () => {
  inspectBattle = !inspectBattle;
  el("battle").hidden = !inspectBattle;
  el("inspect-battle").setAttribute("aria-expanded", String(inspectBattle));
  el("inspect-battle").textContent = inspectBattle ? "SCHLACHTFELD EINKLAPPEN" : "SCHLACHTFELD ANSEHEN";
  if (inspectBattle) { game.scale.refresh(); el("battle").scrollIntoView({ block: "start" }); }
};
let countdown = 0;
let rematchReady = false;
let roomClosed = false;
let reconnectAttempts = 0;
function disconnected() {
  connected = false;
  el("connection-warning").hidden = !session;
  el("connection-detail").textContent = `Automatisches Wiederverbinden${reconnectAttempts ? ` · Versuch ${reconnectAttempts}` : ""}. Eingaben bleiben bis zur Bestätigung gesperrt.`;
  hud();
}
window.addEventListener("offline", disconnected);
let chain: Promise<unknown> = Promise.resolve();
function request(
  input: Record<string, unknown>,
): Promise<DuelSnapshot & { token?: string }> {
  const work = async () => {
    if (!serverAvailable) throw Error("Für diesen iPhone-Test ist noch kein Duellserver eingerichtet. Solo-Modi sind in der Basis verfügbar.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw Error("Der Duellserver antwortet gerade nicht korrekt.");
      const data = await response.json();
      if (!response.ok || data.error)
        throw Error(data.error ?? "Server nicht erreichbar.");
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw Error("Der Server antwortet zu langsam. Erneuter Verbindungsversuch folgt.");
      if (error instanceof TypeError) throw Error("Server nicht erreichbar. Prüfe deine Internet- oder WLAN-Verbindung.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
  const next = chain.then(work, work);
  chain = next.catch(() => {});
  return next;
}
function drawCards() {
  el("duel-cards").innerHTML = match.decks.player
    .map((id) => {
      const card = CARDS.find((c) => c.id === id)!;
      return `<button data-card="${id}" data-kind="${card.kind}" aria-label="${card.name}, ${card.cost} Energie: ${card.description}"><i>ϟ ${card.cost}</i>${unitSvg(id)}<small>${card.name}</small><span class="card-role">${card.role}</span></button>`;
    })
    .join("");
  el("duel-cards")
    .querySelectorAll<HTMLButtonElement>("[data-card]")
    .forEach(
      (button) =>
        (button.onclick = () => {
          selected =
            selected === button.dataset.card
              ? null
              : (button.dataset.card as CardId);
          sound.play("select");
          hud();
        }),
    );
}
function apply(snapshot: DuelSnapshot) {
  const changedRound = round !== snapshot.round;
  const continuous = connected && started && round === snapshot.round;
  const wasComplete = complete;
  const previousPoints = match.state.points;
  connected = true;
  reconnectAttempts = 0;
  el("connection-warning").hidden = true;
  countdown = snapshot.countdown;
  arenaTheme = snapshot.theme;
  el("waiting-theme").textContent = (snapshot.mode === "control" ? "SIGNALKRIEG" : "CORE-ANGRIFF") + " · " + ARENA_THEMES[arenaTheme].name;
  el("battle-theme").textContent = ARENA_THEMES[arenaTheme].name;
  el("countdown-overlay").hidden = countdown === 0;
  const countText = String(countdown);
  if (el("countdown-number").textContent !== countText) el("countdown-number").textContent = countText;
  el("versus").textContent = `${COMMANDERS[snapshot.commanders[snapshot.team]].name} vs ${COMMANDERS[snapshot.commanders[snapshot.team === "player" ? "enemy" : "player"]].name}`;
  if (round !== snapshot.round) {
    round = snapshot.round;
    selected = null;
    clearTimeout(feedbackTimer);
    el("action-feedback").hidden = true;
    complete = false;
    el<HTMLDialogElement>("leave-dialog").close();
    inspectBattle = false;
    el("inspect-battle").setAttribute("aria-expanded", "false");
    el("inspect-battle").textContent = "SCHLACHTFELD ANSEHEN";
    el("result").hidden = true;
    el<HTMLDetailsElement>("battle-help").open = false;
  }
  const opponent = snapshot.team === "player" ? "enemy" : "player";
  el("score-own").textContent = String(snapshot.score[snapshot.team]);
  el("score-other").textContent = String(snapshot.score[opponent]);
  el("round-label").textContent = `RUNDE ${snapshot.round}`;
  el("score-draw").textContent = snapshot.score.draw ? `${snapshot.score.draw} unentschieden` : "EURE DUELLSERIE";
  rematchReady = snapshot.rematch[snapshot.team];
  roomClosed = snapshot.closed;
  el("room-panel").hidden = true;
  el("leave").hidden = false;
  el("waiting").hidden = !!snapshot.state;
  el("room-code").textContent = snapshot.code;
  const link = inviteUrl(invitationBase, snapshot.code);
  if (el<HTMLInputElement>("invite-link").value !== link) el<HTMLInputElement>("invite-link").value = link;
  el("local-invite-note").hidden = !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!snapshot.state) {
    const seconds = snapshot.waitingSeconds;
    el("room-expiry").textContent = `EINLADUNG GÜLTIG · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    el("room-expiry").classList.toggle("expiring", seconds <= 60);
    if (waitingPreviewCode !== snapshot.code) {
      waitingPreviewCode = snapshot.code;
      el("waiting-loadout").innerHTML = loadoutPreview(snapshot.decks[snapshot.team], snapshot.commanders[snapshot.team]);
      el("waiting-objective").textContent = snapshot.mode === "control"
        ? `Euer Ziel: ${TRAINING_CONTROL.requiredPoints} mittlere Relais verbunden halten und ${TRAINING_CONTROL.seconds} Sekunden Kontrollzeit sammeln. Core-Zerstörung gewinnt ebenfalls.`
        : "Euer Ziel: Den gegnerischen Core zerstören. Bei Zeitablauf entscheiden Core-Leben und gehaltene Punkte.";
    }
    el("status").textContent = "Raum offen · Code " + snapshot.code;
    return;
  }
  if (!started) {
    const own = snapshot.team,
      other = own === "player" ? "enemy" : "player";
    match = new Match({
      botEnabled: false,
      controlObjective: snapshot.mode === "control" ? TRAINING_CONTROL : undefined,
      playerDeck: snapshot.decks[own],
      enemyDeck: snapshot.decks[other],
      playerCommander: snapshot.commanders[own],
      enemyCommander: snapshot.commanders[other],
    });
    started = true;
    drawCards();
    for (const [side, team] of [["own", "player"], ["enemy", "enemy"]] as const) {
      const commander = COMMANDERS[match.commanders[team]];
      el(`${side}-commander-title`).textContent = `${side === "own" ? "DEIN KOMMANDO" : "GEGNERISCHES KOMMANDO"} · ${commander.name} · ${commander.ability}`;
      el(`${side}-commander-help`).textContent = `${commander.description} Abklingzeit: ${commander.cooldown} Sekunden.`;
    }
    const objective = match.controlObjective;
    el("victory-help").textContent = objective
      ? `Halte ${objective.requiredPoints} der ${objective.pointIds.length} mittleren Relais verbunden und ungestört. Sammle ${objective.seconds} Sekunden Kontrollzeit oder zerstöre den gegnerischen Core. Nach 3 Minuten entscheidet zuerst Kontrollzeit, dann Core-Leben, dann Gebiet. Keine Verlängerung.`
      : "Zerstöre den gegnerischen Core. Nach 3 Minuten entscheidet verbleibendes Core-Leben, danach die Anzahl eigener Punkte. Bei vollständigem Gleichstand folgen 45 Sekunden Verlängerung.";
  }
  const perspective = duelPerspective(snapshot.state, snapshot.team);
  if (continuous && !wasComplete && perspective.phase !== "ended" && !document.hidden &&
      perspective.points.some((point, index) => point.owner === "player" && previousPoints[index].owner !== "player")) sound.play("capture");
  Object.assign(match.state, perspective);
  const opening = el("battle").hidden;
  complete = match.state.phase === "ended";
  el("battle").hidden = complete && !inspectBattle;
  if (opening && !el("battle").hidden) game.scale.refresh();
  if (!complete && (changedRound || opening)) el("battle").scrollIntoView({ block: "start" });
  if (complete) {
    el<HTMLDialogElement>("leave-dialog").close();
    if (continuous && !wasComplete && !document.hidden) sound.play(match.state.winner === "player" ? "win" : match.state.winner === "enemy" ? "lose" : "select");
    el("result").hidden = false;
    el("result-title").textContent =
      match.state.winner === "draw"
        ? "Unentschieden"
        : match.state.winner === "player"
          ? "Duell gewonnen!"
          : "Duell verloren";
    el("result").dataset.outcome = match.state.winner ?? "draw";
    if (!wasComplete || changedRound) {
      el("result-title").focus({ preventScroll: true });
      el("result").scrollIntoView({ block: "start" });
    }
    el("result-reason").textContent = match.state.reason;
    if (reportedRound !== round) {
      reportedRound = round;
      const state = match.state;
      const duration = Math.floor(state.time);
      const rows: [string, string, string][] = [
        ["Core-Leben", ...(["player", "enemy"] as const).map(team => `${Math.max(0, state.cores[team].hp).toFixed(1)} / ${state.cores[team].maxHp}`)] as [string, string, string],
        ["Gehaltene Punkte", String(state.points.filter(point => point.owner === "player").length), String(state.points.filter(point => point.owner === "enemy").length)],
        ["Davon versorgt", String(state.points.filter(point => point.owner === "player" && point.supplied).length), String(state.points.filter(point => point.owner === "enemy" && point.supplied).length)],
      ];
      if (match.controlObjective) rows.unshift(["Kontrollzeit", `${state.controlTime.player.toFixed(2)} s`, `${state.controlTime.enemy.toFixed(2)} s`]);
      el("duel-report").innerHTML = `<p class="report-duration">RUNDE ${round} · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")} MINUTEN</p><table><caption>Stand bei Matchende</caption><thead><tr><th scope="col">WERT</th><th scope="col">DU</th><th scope="col">GEGNER</th></tr></thead><tbody>${rows.map(([label, own, other]) => `<tr><th scope="row">${label}</th><td>${own}</td><td>${other}</td></tr>`).join("")}</tbody></table><small>Der Entscheidungsgrund steht oben. Aufgabe und Verbindungsabbruch können ein Duell auch bei besseren Kampfwerten beenden.</small>`;
    }
    el("leave").hidden = false;
    el("leave").textContent = "ZUR BASIS";
    el("rematch-status").textContent = roomClosed ? "Dein Gegenüber hat den Raum verlassen." : rematchReady ? "Du bist bereit. Warte auf dein Gegenüber …" : snapshot.rematch[snapshot.team === "player" ? "enemy" : "player"] ? "Dein Gegenüber möchte eine Revanche!" : "Noch eine Runde mit denselben Decks?";
  }
  el("status").textContent = complete
    ? "Duell abgeschlossen."
    : snapshot.message || "Verbunden · Raum " + snapshot.code;
  if (!complete) el("leave").textContent = "DUELL VERLASSEN / AUFGEBEN";
  hud();
}
const territoryCells = Array.from({ length: 9 }, (_, index) => {
  const cell = document.createElement("span");
  cell.setAttribute("role", "img");
  cell.textContent = String(index + 1);
  el("territory-strip").appendChild(cell);
  return cell;
});
function hud() {
  el<HTMLButtonElement>("rematch").disabled = !connected || busy || rematchReady || roomClosed;
  if (!started) return;
  const s = match.state;
  let own = 0, enemy = 0, cutOff = 0, contested = 0;
  for (const point of s.points) {
    if (point.owner === "player") { own++; if (!point.supplied) cutOff++; }
    if (point.owner === "enemy") enemy++;
    if (point.contested) contested++;
    const cell = territoryCells[point.id];
    const owner = point.owner === "player" ? "Dein Punkt" : point.owner === "enemy" ? "Gegnerpunkt" : "Neutral";
    cell.dataset.owner = point.owner ?? "neutral";
    cell.classList.toggle("contested", point.contested);
    cell.classList.toggle("cut-off", point.owner !== null && !point.supplied);
    const label = `Punkt ${point.id + 1}: ${owner}${point.contested ? ", umkämpft" : ""}${point.owner && !point.supplied ? ", abgeschnitten" : ""}`;
    cell.setAttribute("aria-label", label);
    cell.title = label;
  }
  el("territory-own").textContent = `DU · ${own} PUNKTE`;
  el("territory-other").textContent = `GEGNER · ${enemy} PUNKTE`;
  el("supply-status").textContent = cutOff
    ? `${cutOff} eigene Punkte abgeschnitten – Verbindung zur Basis zurückerobern.`
    : contested ? `${contested} Punkte umkämpft – Eroberung dort unterbrochen.` : "Versorgung steht · Verbundene Punkte erweitern deine Front.";
  el("frontline-status").classList.toggle("supply-warning", cutOff > 0);
  el("control-hud").hidden = !match.controlObjective;
  if (match.controlObjective) {
    for (const [id, team] of [["own", "player"], ["other", "enemy"]] as const) {
      el<HTMLMeterElement>(`control-${id}`).max = match.controlObjective.seconds;
      el<HTMLMeterElement>(`control-${id}`).value = s.controlTime[team];
      el(`control-${id}-time`).textContent = `${Math.floor(s.controlTime[team] + 1e-8)} / ${match.controlObjective.seconds}s`;
    }
  }
  el("own-hp").textContent =
    `DU ${Math.ceil((s.cores.player.hp / s.cores.player.maxHp) * 100)}%`;
  el("other-hp").textContent =
    `GEGNER ${Math.ceil((s.cores.enemy.hp / s.cores.enemy.maxHp) * 100)}%`;
  const alerts = duelAlerts(s);
  const remain = alerts.remaining;
  const notice = connected && countdown === 0 ? alerts.message : "";
  el("battle-alert").hidden = !notice;
  if (el("battle-alert").textContent !== notice) el("battle-alert").textContent = notice;
  el("battle-alert").classList.toggle("critical", alerts.critical);
  el("clock").classList.toggle("urgent", connected && (alerts.final || alerts.overtime));
  el("own-hp").classList.toggle("critical", connected && alerts.critical);
  el("clock").textContent =
    `${s.phase === "overtime" ? "+ " : ""}${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`;
  el("energy").textContent = `ϟ ${s.energy.player.toFixed(1)} / 10`;
  el<HTMLMeterElement>("energy-meter").value = s.energy.player;
  const card = CARDS.find((c) => c.id === selected);
  el("selection").textContent = busy ? "Einsatz wird bestätigt …" : card
    ? `${card.name} · ${card.cost} Energie${card.cost > s.energy.player ? " · Energie lädt …" : ""}
${card.description}`
    : "Karte wählen, dann in der Arena einsetzen.";
  el("duel-cards")
    .querySelectorAll<HTMLButtonElement>("[data-card]")
    .forEach((button) => {
      button.classList.toggle("selected", button.dataset.card === selected);
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.card === selected),
      );
      button.disabled =
        !connected || countdown > 0 ||
        complete ||
        busy ||
        CARDS.find((c) => c.id === button.dataset.card)!.cost > s.energy.player;
    });
  const commander = COMMANDERS[match.commanders.player];
  el("hero").textContent =
    `${commander.name} · ${commander.ability} · ${s.commanderCooldown > 0 ? Math.ceil(s.commanderCooldown) + "s" : "BEREIT"}`;
  el<HTMLProgressElement>("hero-charge").value = Math.max(0, 1 - s.commanderCooldown / commander.cooldown);
  el<HTMLButtonElement>("hero").disabled =
    !connected || countdown > 0 || complete || busy || s.commanderCooldown > 0;
}
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
function actionFeedback(message: string, failed = false) {
  clearTimeout(feedbackTimer);
  const feedback = el("action-feedback");
  feedback.textContent = message;
  feedback.hidden = false;
  feedback.classList.toggle("failed", failed);
  feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 3000);
}
async function action(op: string, extra: Record<string, unknown> = {}) {
  if (!session || !connected || countdown > 0 || complete || busy || leaving) return;
  busy = true;
  const auth = { ...session, seq: ++session.seq };
  persist();
  hud();
  try {
    const result = await request({ ...auth, round, op, ...extra });
    apply(result);
    if (result.actionOk !== undefined) sound.play(result.actionOk ? op === "commander" || CARDS.find(c => c.id === extra.card)?.kind === "ability" ? "ability" : "deploy" : "error");
    if (result.message) actionFeedback(result.message, result.actionOk === false);
  } catch (error) {
    disconnected();
    actionFeedback((error as Error).message, true);
  } finally {
    busy = false;
    hud();
  }
}
async function poll() {
  if (!session) return;
  try {
    apply(await request({ ...session, op: "sync" }));
  } catch (error) {
    reconnectAttempts++;
    disconnected();
    const message = (error as Error).message;
    if (message.startsWith("Duell nicht gefunden")) {
      session = null;
      persist();
      started = false;
      complete = false;
      round = 0;
      reportedRound = 0;
      el("result").hidden = true;
      el("connection-warning").hidden = true;
      el<HTMLDialogElement>("leave-dialog").close();
      el("room-panel").hidden = false;
      el("waiting").hidden = true;
      el("battle").hidden = true;
      el("leave").hidden = true;
      el("status").textContent = message;
    } else
      el("status").textContent =
        "Verbindung unterbrochen. Wiederverbinden … " + message;
  }
  if (session) setTimeout(poll, !connected ? Math.min(2000, 500 * Math.max(1, reconnectAttempts)) : complete ? 750 : 150);
}
async function enter(op: "create" | "join") {
  if (session || busy || !serverAvailable) return;
  busy = true;
  deckSelect.disabled = true;
  commanderSelect.disabled = true;
  el<HTMLButtonElement>("create").disabled = true;
  el<HTMLButtonElement>("join").disabled = true;
  try {
    const data = await request({
      op,
      code: el<HTMLInputElement>("code").value.trim().toUpperCase(),
      deck: duelDeck,
      commander: duelCommander,
      ...(op === "create" ? { theme: chosenTheme, mode: el<HTMLSelectElement>("duel-mode").value } : {}),
    });
    session = { code: data.code, token: data.token!, seq: 0 };
    persist();
    apply(data);
    void poll();
  } catch (error) {
    el("status").textContent = (error as Error).message;
  } finally {
    busy = false;
    deckSelect.disabled = false;
    commanderSelect.disabled = false;
    el<HTMLButtonElement>("create").disabled = false;
    el<HTMLButtonElement>("join").disabled = false;
  }
}
el("create").onclick = () => void enter("create");
el("join").onclick = () => void enter("join");
el("code").addEventListener("keydown", event => {
  if (event.key === "Enter") void enter("join");
});
el("rematch").onclick = async () => {
  if (!session || !complete || busy || rematchReady || roomClosed) return;
  busy = true; hud();
  try { apply(await request({ ...session, op: "rematch", round })); }
  catch (error) { el("rematch-status").textContent = (error as Error).message; }
  finally { busy = false; hud(); }
};
el("hero").onclick = () => void action("commander");
let leaving = false;
async function leaveRoom(destination: string) {
  if (leaving) return;
  leaving = true;
  el<HTMLDialogElement>("leave-dialog").close();
  el<HTMLButtonElement>("leave").disabled = true;
  if (session) {
    try {
      await request({ ...session, op: "leave" });
    } catch {}
    session = null;
    persist();
  }
  location.href = destination;
}
function requestLeave() {
  if (leaving) return;
  if (session && started && !complete) {
    const dialog = el<HTMLDialogElement>("leave-dialog");
    if (!dialog.open) dialog.showModal();
  } else void leaveRoom("./");
}
el("leave").onclick = requestLeave;
el("back-to-base").onclick = event => { event.preventDefault(); requestLeave(); };
el("confirm-leave").onclick = () => void leaveRoom("./");
el("new-room").onclick = event => {
  event.preventDefault();
  void leaveRoom("./duel.html");
};
const scene = new ArenaScene({
  authoritative: true,
  theme: () => arenaTheme,
  match: () => match,
  running: () => started && !complete && countdown === 0,
  selected: () => connected && !busy ? selected : null,
  deploy: (x, y) => {
    if (selected && connected && !busy) void action("play", { card: selected, x, y });
  },
  tick: () => {},
});
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "arena",
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 30, limit: 30 },
  render: { powerPreference: "low-power" },
  scene: [scene],
  banner: false,
});
watchAppState(isActive => { if (!isActive && session) disconnected(); });
if (!serverAvailable) {
  el<HTMLButtonElement>("create").disabled = true;
  el<HTMLButtonElement>("join").disabled = true;
  el("status").textContent = "Solo-Testbuild · Online-Duelle werden mit einem eingerichteten Server verfügbar. Zurück zur Basis für Kampagne, Training und Draft.";
} else if (session) void poll();
