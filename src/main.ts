import { renderBackupMenu } from "./save-backup-menu";
import { initializeStore, renderStore, supporterOwned } from "./store";
import { watchAppState } from "./mobile";
import { ARENA_THEMES, isArenaTheme, type ArenaThemeId } from "./arena-themes";
import { renderDraft } from "./draft";
import {
  completeDaily,
  dailyChallenge,
  dailyRecord,
  type DailyChallenge,
} from "./daily-front";
import { readDeckSlots, saveDeckSlots, readDailyHistory, saveDailyHistory } from "./storage";
import { advanceMastery, masteryRank, masteryLabel } from "./mastery";
import { readMastery, saveMastery } from "./storage";
import {
  LESSONS,
  BASE_STAGES,
  BASE_STYLES,
  baseStage,
  completedLessons,
  styleUnlocked,
  advanceLearning,
  headquartersSvg,
  BASE_PROJECTS,
  baseProjectBuilt,
  baseProjectProgress,
  buildBaseProject,
  type BaseProjectId,
  type BaseProjectMetrics,
  type BaseStyle,
} from "./headquarters";
import { readLearning, saveLearning } from "./storage";
import { battleCoachHint, type BattleCoachFocus } from "./battle-coach";
import { baseHonors } from "./honors";
import { COMMANDERS, type CommanderId } from "./commanders";
import { readCommander, saveCommander } from "./storage";
import {
  SERIES_ROUTES,
  chooseSeriesRoute,
  SERIES_LIVES,
  newSeries,
  seriesEnded,
  completeSeriesBattle,
} from "./series";
import { readSeries, saveSeries } from "./storage";
import {
  MISSIONS,
  CHAPTERS,
  missionUnlocked,
  missionStars,
  completeMission,
  objectiveDescription,
  type Mission,
} from "./campaign";
import { renderCampaign } from "./campaign-menu";
import { readCampaign, saveCampaign } from "./storage";
import Phaser from "phaser";
import {
  Match,
  isValidDeck,
  CARDS,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  MATCH_DURATION,
  OVERTIME_DURATION,
  ENERGY_CAP,
  TRAINING_CONTROL,
  type CardId,
} from "./engine";
import { ArenaScene } from "./scene";
import { unitSvg, commanderSvg } from "./art";
import { Sound } from "./audio";
import { readStats, saveStats, setting, readDeck, saveDeck } from "./storage";
import {
  createMatchRecord,
  readHistory,
  saveHistory,
  HISTORY_LIMIT,
  type MatchFeedback,
} from "./storage";
import { resultComparison, renderMatchHistory } from "./match-report";
import { renderDeckBuilder } from "./deck-builder";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <aside class="editorial">
    <a class="brand" href="./" aria-label="Frontline Start"><span class="brand-mark">F<span>∕</span></span> FRONTLINE<span class="brand-dot"></span></a>
    <div class="editorial-main"><div class="eyebrow"><span></span> TACTICAL TERRITORY BATTLES</div><h1>Boden<br>ist <em>Macht.</em></h1><p>Jeder Punkt verschiebt die Front.<br>Jede Entscheidung das Match.</p><div class="edition"><span>01</span><div>THE FIRST FRONT<br><small>SPIELBARER PROTOTYP</small></div></div></div>
    <div class="desktop-footer">PROJECT FRONTLINE <span>EST. 2026</span></div>
  </aside>
  <main class="device" aria-label="Project Frontline Spiel">
    <header class="game-top"><div class="mini-brand">F<span>∕</span></div><div><b>FRONTLINE</b><small id="mode-label">EINSATZBASIS</small></div><div class="top-actions"><button id="sound" class="icon-btn" aria-label="Ton einschalten" title="Ton umschalten">♪</button><button id="help" class="icon-btn" aria-label="Spielanleitung">?</button><button id="pause" class="icon-btn" aria-label="Spiel pausieren" disabled>Ⅱ</button></div></header>
    <section class="match-hud" aria-label="Matchstatus"><div class="core-info"><span><i class="team-dot player"></i> DEIN CORE</span><strong id="player-hp">100%</strong><div class="health-track"><i id="player-health"></i></div></div><div class="clock"><strong id="timer">3:00</strong><span id="phase-label">TRAINING</span></div><div class="core-info enemy"><span><b id="enemy-commander-label">BOT</b> <i class="team-dot enemy"></i></span><strong id="enemy-hp">100%</strong><div class="health-track"><i id="enemy-health"></i></div></div></section>
    <div id="control-hud" class="control-hud" hidden><b id="control-label"></b><div><span id="control-player"></span><span id="control-enemy"></span></div><div class="control-tracks"><i id="control-player-bar"></i><i id="control-enemy-bar"></i></div></div><div class="arena-wrap"><div id="arena" role="application" aria-label="Arena. Karte auswählen, im grünen Gebiet halten, zielen und loslassen."></div><div id="deployment-countdown" class="deployment-countdown" hidden aria-live="assertive"></div><div id="battle-banner" class="battle-banner" hidden role="status" aria-live="polite"><small id="battle-banner-label"></small><b id="battle-banner-title"></b></div><div id="learning-hud" class="learning-hud" hidden></div><div id="arena-tip" class="arena-tip">EROBERE DIE MITTE</div><div id="toast" class="toast" role="status" aria-live="polite"></div></div>
    <section class="command-deck" aria-label="Karten und Fähigkeiten"><div class="resource-row"><div class="energy-caption"><span class="energy-symbol">ϟ</span><strong id="energy">6</strong><span>/ 10</span></div><div class="energy-track"><i id="energy-fill"></i></div><span id="territory-count" class="territory-count">3 / 9 PUNKTE</span></div><div class="selection-info"><b id="selected-name">DEIN EINSATZDECK</b><span id="selected-hint">Karte wählen → halten, zielen, loslassen</span></div><div id="cards" class="cards"></div><button id="commander" class="commander-btn" disabled><span class="commander-icon">◇</span><b id="commander-name">ATLAS <span>AEGIS-SCHILD</span></b><span id="commander-status">BEREIT</span><kbd>Q</kbd></button></section>
    <div id="lobby" class="overlay lobby base-lobby"><div class="lobby-scroll base-scroll">
      <div class="base-status"><span><i></i> DEINE EINSATZBASIS</span><b id="base-stars">0 ★</b></div>
      <section class="operation-hero">
        <div class="hero-grid" aria-hidden="true"></div><div id="hero-portrait" class="hero-portrait" aria-hidden="true">${commanderSvg()}</div>
        <div class="hero-copy"><span id="next-chapter" class="hero-kicker"></span><h2>DEINE FRONT.<br><em>DEIN VORSTOSS.</em></h2><p id="next-mission-name"></p><span id="next-mission-type" class="hero-mode"></span></div>
        <div class="hero-bottom"><p id="next-mission-hint"></p><button id="continue-campaign" class="primary">VORRÜCKEN <span>↗</span></button></div>
      </section>
      <button id="headquarters" class="hq-launch"><span id="hq-mini-art" aria-hidden="true"></span><span><small>DEIN HAUPTQUARTIER</small><b id="hq-name"></b><small id="hq-next"></small><span class="hq-progress-track"><i id="hq-progress-fill"></i></span></span><span class="hq-open">BASIS ANSEHEN ↗</span></button>
      <button id="learning" class="learning-launch"><span><small id="learning-count"></small><b id="learning-next"></b><small>AURORA-GESTALTUNG FREISPIELEN</small></span><span>↗</span></button>
      <button id="daily" class="daily-launch"><span><small>TAGESFRONT · HEUTE</small><b id="daily-title">WIRD GELADEN</b><small id="daily-status"></small></span><span>ANTRETEN ↗</span></button>
      <div class="base-section-title"><span>DEIN FELDZUG</span><span id="base-completed"></span></div>
      <div id="chapter-track" class="chapter-track" aria-label="Kapitel-Fortschritt"></div>
      <a class="duel-launch primary" href="./duel.html">FREUNDESDUELL ↗ <small>Raum erstellen oder mit Code beitreten</small></a><div class="base-modes">
        <button id="campaign" class="base-mode"><span class="mode-symbol">◈</span><span><b>KAMPAGNE</b><small id="campaign-progress"></small></span><span>↗</span></button>
        <button id="series" class="base-mode series-mode"><span class="mode-symbol">⋔</span><span><b>EINSATZSERIE</b><small id="series-preview">Ein Deck. Drei Siege.</small></span><span>↗</span></button>
      </div>
      <button id="draft" class="base-mode draft-launch"><span class="mode-symbol">▱</span><span><b>DRAFT-GEFECHT</b><small>8 Entscheidungen. Ein neues Deck.</small></span><span>↗</span></button>
      <button id="choose-commander" class="commander-launch"><span id="commander-preview-art" aria-hidden="true"></span><span><small>DEIN KOMMANDANT</small><b id="commander-preview-name">ATLAS</b><small id="commander-preview-skill">AEGIS-SCHILD</small></span><span>WECHSELN ↗</span></button><button id="edit-deck" class="base-deck"><span class="base-section-title"><b>DEIN EINSATZDECK</b><span>ANPASSEN ↗</span></span><span id="deck-portraits" class="deck-portraits" aria-hidden="true"></span><small id="deck-preview"></small></button>
      <details class="quick-battle"><summary><span>FREIES GEFECHT <small>DEIN MODUS · DEIN TEMPO</small></span><span>＋</span></summary><div class="training-control"><label for="difficulty">Gegnerstärke</label><select id="difficulty"><option value="rookie">Rekrut</option><option value="standard">Taktiker</option><option value="veteran">Veteran</option></select></div><div class="training-control"><label for="training-mode">Spielmodus</label><select id="training-mode"><option value="core">Core-Angriff</option><option value="control">Signalkrieg</option></select></div><div class="training-control"><label for="arena-theme">Schauplatz</label><select id="arena-theme">${Object.entries(ARENA_THEMES).map(([id, theme]) => `<option value="${id}">${theme.name}</option>`).join("")}</select></div><button id="start" class="primary">GEGEN BOT SPIELEN <span>↗</span></button></details>
      <div class="lobby-links"><button id="lobby-help" class="text-btn">Feldhandbuch →</button><button id="history" class="text-btn">Gefechtsverlauf →</button></div><button id="save-backup" class="text-btn">Spielstand sichern / übertragen →</button><div class="base-footer">LOKAL GEGEN BOT · GLEICHE KAMPFWERTE</div>
    </div></div>
    <div id="modal" class="overlay modal" hidden role="dialog" aria-modal="true" aria-label="Spielmenü"><div id="modal-content" class="modal-content"></div></div>
  </main>
  <aside class="field-notes"><div class="notes-tag">DEIN ERSTER EINSATZ</div><h2>Eine Front.<br>Dein Plan.</h2><ol><li><span>01</span><div><b>Truppe wählen</b><p>Sechs aus ${CARDS.filter((card) => card.kind === "unit").length} Einheiten wählen. Jede mit einer eigenen Rolle.</p></div></li><li><span>02</span><div><b>Boden erobern</b><p>Einheiten im grünen Gebiet einsetzen. Kontrollpunkte erweitern deine Front.</p></div></li><li><span>03</span><div><b>Core durchbrechen</b><p>Schütze deinen Core und erreiche den gegnerischen.</p></div></li></ol><div class="commander-note"><span>DEIN COMMANDER</span><b id="notes-commander">ATLAS <i>◇</i></b><p id="notes-ability">Aegis schützt deine Truppen für den entscheidenden Vorstoß.</p></div><div class="keyboard-note"><span>AUCH MIT TASTATUR</span><p><kbd>1</kbd>–<kbd>8</kbd> Karten &nbsp; <kbd>Q</kbd> Fähigkeit<br><kbd>Esc</kbd> Pause</p></div><div id="local-record" class="local-record"></div></aside>
`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const sound = new Sound();
sound.enabled = setting("sound") === "on";
const stats = readStats();
const history = readHistory();
let campaignProgress = readCampaign();
let learningProgress = readLearning();
let mastery = readMastery();
let activeMission: Mission | null = null;
const savedArena = setting("arena-theme");
let arenaTheme: ArenaThemeId = isArenaTheme(savedArena) ? savedArena : "coast";
el<HTMLSelectElement>("arena-theme").value = arenaTheme;
let seriesRun = readSeries();
let dailyHistory = readDailyHistory();
let activeSeries = false;
let activeDraftDeck: CardId[] | null = null;
let activeDaily: DailyChallenge | null = null;
let commanderId = readCommander();
let deck: CardId[] = readDeck();
let deckSlots = readDeckSlots();
let deckCards = deck.map((id) => CARDS.find((card) => card.id === id)!);
let match = new Match({ playerDeck: deck, playerCommander: commanderId });
let active = false,
  paused = false,
  selected: string | null = null,
  ended = false,
  lastHud = 0,
  lastCaptured = 0,
  toastTimer = 0,
  matchReadyAt = 0,
  matchGoUntil = 0,
  pauseBeganAt = 0,
  startBannerShown = false,
  lastPointOwners: Array<"player" | "enemy" | null> = match.state.points.map(
    (point) => point.owner,
  );
const battleNotices = new Set<string>();
let bannerUntil = 0;
let nextCampaignMission: Mission = MISSIONS[0];
let difficulty: "rookie" | "standard" | "veteran" = "rookie";
const savedDifficulty = setting("difficulty");
if (
  savedDifficulty === "rookie" ||
  savedDifficulty === "standard" ||
  savedDifficulty === "veteran"
)
  difficulty = savedDifficulty;
el<HTMLSelectElement>("difficulty").value = difficulty;
const cardButtons = new Map<string, HTMLButtonElement>();
function renderCards(override?: readonly CardId[]) {
  cardButtons.clear();
  el("cards").replaceChildren();
  deckCards = (
    override ?? (activeSeries && seriesRun ? seriesRun.deck : deck)
  ).map((id) => CARDS.find((card) => card.id === id)!);
  for (const [index, card] of deckCards.entries()) {
    const button = document.createElement("button");
    button.className = `card ${card.kind}`;
    button.dataset.card = card.id;
    button.dataset.mastery = masteryRank(mastery.units[card.id] ?? 0).frame;
    button.setAttribute(
      "aria-label",
      `${card.name}, ${card.cost} Energie. ${card.description}`,
    );
    button.title = `${card.name} · ${card.role}\n${card.description}`;
    button.innerHTML = `<span class="card-cost">${card.cost}</span><span class="card-art">${unitSvg(card.id)}</span><span class="card-name">${card.name}</span><kbd>${index + 1}</kbd>`;
    button.addEventListener("click", () => selectCard(card.id));
    el("cards").append(button);
    cardButtons.set(card.id, button);
  }
  el("deck-portraits").innerHTML = deckCards
    .map(
      (card) =>
        `<span class="deck-portrait ${card.kind}" data-card="${card.id}" data-mastery="${masteryRank(mastery.units[card.id] ?? 0).frame}">${unitSvg(card.id)}<i>${card.cost}</i></span>`,
    )
    .join("");
  el("deck-preview").textContent = deckCards
    .map((card) => card.name)
    .join(" · ");
}
renderCards();
function showToast(message: string, error = false) {
  el("toast").textContent = message;
  el("toast").classList.toggle("error", error);
  el("toast").classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => el("toast").classList.remove("visible"),
    2200,
  );
}
function matchLive(): boolean {
  return active && !paused && !ended && performance.now() >= matchReadyAt;
}
function selectCard(id: string) {
  if (!matchLive()) return;
  sound.unlock();
  const card = CARDS.find((c) => c.id === id)!;
  selected = selected === id ? null : id;
  updateSelection();
  sound.play("select");
  if (selected && match.state.energy.player < card.cost)
    showToast(
      `Noch ${Math.ceil(card.cost - match.state.energy.player)} Energie nötig.`,
    );
}
function updateSelection() {
  for (const [id, b] of cardButtons) {
    b.classList.toggle("selected", id === selected);
    b.setAttribute("aria-pressed", String(id === selected));
  }
  const c = CARDS.find((c) => c.id === selected);
  el("selected-name").textContent = c
    ? `${c.name} · ${c.role}`
    : "DEIN EINSATZDECK";
  el("selected-hint").textContent = c
    ? c.kind === "ability"
      ? "Halten zum Zielen · loslassen zum Wirken"
      : c.description
    : "Karte wählen → halten, zielen, loslassen";
  el("arena-tip").textContent = c
    ? c.kind === "ability"
      ? "FÄHIGKEIT: ZIEL ANTIPPEN"
      : "IM GRÜNEN GEBIET EINSETZEN"
    : "EROBERE DIE MITTE";
  el("arena-tip").classList.toggle("selected", !!selected);
}
function deploy(x: number, y: number) {
  if (!matchLive()) return;
  if (!selected) {
    showToast("Wähle zuerst unten eine Karte.");
    return;
  }
  const result = match.play("player", selected, x, y);
  if (!result.ok) {
    showToast(result.message, true);
    sound.play("error");
    return;
  }
  sound.play(
    CARDS.find((c) => c.id === selected)?.kind === "ability"
      ? "ability"
      : "deploy",
  );
  selected = null;
  updateSelection();
  updateHud(true);
}
function start(
  rematch = false,
  mission: Mission | null = null,
  inSeries = false,
  draftDeck: readonly CardId[] | null = null,
  daily: DailyChallenge | null = null,
) {
  if (
    (draftDeck && (!isValidDeck(draftDeck) || inSeries || mission || daily)) ||
    (daily && (mission || inSeries || draftDeck))
  )
    return;
  if (
    inSeries &&
    (!seriesRun || seriesEnded(seriesRun) || mission?.id !== seriesRun.route)
  )
    return;
  if (
    !inSeries &&
    mission &&
    !missionUnlocked(MISSIONS.indexOf(mission), campaignProgress)
  )
    return;
  activeSeries = inSeries;
  activeDaily = daily;
  activeMission = daily ? null : mission;
  const chosenArena = el<HTMLSelectElement>("arena-theme").value;
  arenaTheme = daily
    ? daily.theme
    : mission
      ? CHAPTERS.reduce((current, chapter) => MISSIONS.findIndex(m => m.id === chapter.firstMission) <= MISSIONS.indexOf(mission) ? chapter.theme : current, "coast" as ArenaThemeId)
      : isArenaTheme(chosenArena) ? chosenArena : "coast";
  if (!mission && !daily) setting("arena-theme", arenaTheme);
  activeDraftDeck = draftDeck ? [...draftDeck] : null;
  renderCards(daily?.playerDeck ?? activeDraftDeck ?? undefined);
  if (rematch) {
    stats.rematches++;
    saveStats(stats);
  }
  difficulty = daily
    ? daily.difficulty
    : draftDeck
      ? "standard"
      : (el<HTMLSelectElement>("difficulty").value as typeof difficulty);
  if (!draftDeck && !daily) setting("difficulty", difficulty);
  match = new Match({
    seed: daily?.seed ?? mission?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0],
    difficulty: daily?.difficulty ?? mission?.difficulty ?? difficulty,
    playerDeck:
      daily?.playerDeck ?? activeDraftDeck ?? (inSeries ? seriesRun!.deck : deck),
    playerCommander:
      daily?.playerCommander ?? (inSeries ? seriesRun!.commander : commanderId),
    enemyDeck: daily?.enemyDeck ?? mission?.enemyDeck,
    enemyCommander: daily?.enemyCommander ?? mission?.enemyCommander,
    startingOwners: daily?.owners ?? mission?.owners,
    controlObjective: daily
      ? daily.controlObjective
      : draftDeck
        ? undefined
        : mission
          ? mission.controlObjective
          : el<HTMLSelectElement>("training-mode").value === "control"
            ? TRAINING_CONTROL
            : undefined,
  });
  lastPointOwners = match.state.points.map((point) => point.owner);
  renderCommander(match.commanders.player);
  el("enemy-commander-label").textContent =
    `BOT · ${COMMANDERS[match.commanders.enemy].name}`;
  active = true;
  paused = false;
  selected = null;
  matchReadyAt = performance.now() + 3000;
  matchGoUntil = matchReadyAt + 650;
  startBannerShown = false;
  ended = false;
  lastCaptured = 0;
  battleNotices.clear();
  bannerUntil = 0;
  el("battle-banner").hidden = true;
  el("deployment-countdown").hidden = false;
  el("deployment-countdown").classList.remove("go");
  el("deployment-countdown").textContent = "3";
  el("lobby").hidden = true;
  el("modal").hidden = true;
  el<HTMLButtonElement>("pause").disabled = false;
  el<HTMLButtonElement>("commander").disabled = false;
  el("mode-label").textContent = daily
    ? `TAGESFRONT · ${daily.title}`
    : draftDeck ? "DRAFT · TAKTIKER" : inSeries
      ? `SERIE ${seriesRun!.wins + 1}/3 · ${SERIES_LIVES - seriesRun!.losses} VERSUCHE`
      : mission
        ? `EINSATZ ${MISSIONS.indexOf(mission) + 1} · ${mission.name.toUpperCase()}`
        : `TRAINING · ${difficulty === "rookie" ? "REKRUT" : difficulty === "standard" ? "TAKTIKER" : "VETERAN"}`;
  sound.unlock();
  sound.play("deploy");
  updateSelection();
  updateHud(true);
}
function announceBattle(label: string, title: string, danger = false) {
  el("battle-banner-label").textContent = label;
  el("battle-banner-title").textContent = title;
  el("battle-banner").classList.toggle("danger", danger);
  el("battle-banner").hidden = false;
  bannerUntil = match.state.time + 2.5;
}
function showModal(content: string) {
  el("modal-content").innerHTML = content;
  el("modal").hidden = false;
  el("modal-content").querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  el("modal-content").scrollTop = 0;
}
function resume() {
  if (pauseBeganAt && match.state.time === 0 && matchReadyAt > pauseBeganAt) {
    const shift = performance.now() - pauseBeganAt;
    matchReadyAt += shift;
    matchGoUntil += shift;
  }
  pauseBeganAt = 0;
  paused = false;
  el("modal").hidden = true;
  el("pause").focus();
  updateHud(true);
}
function pause() {
  if (!active || ended || paused) return;
  paused = true;
  pauseBeganAt = performance.now();
  updateHud(true);
  showModal(
    `<div class="eyebrow">ATEMPAUSE</div><h2>Dein Plan.<br>Dein Tempo.</h2><p>${activeDaily ? `${activeDaily.title}: ${activeDaily.briefing}<br>${activeDaily.tip}<br><br>Tagesfronten haben ein festes Deck und Setup. Wiederholungen kosten nichts.` : activeMission ? `${activeMission.name}: ${objectiveDescription(activeMission)}<br>${activeMission.tip}<br><br>${activeSeries ? "Einsatzserie: Dein Deck bleibt fest. Die zweite Niederlage beendet den Durchlauf." : `Sternziele: Sieg · mindestens ${Math.round(activeMission.healthTarget * 100)}% Core · Sieg in ${activeMission.speedTarget}s.`}` : match.controlObjective ? "Signalkrieg: Markierte Punkte verbunden und ungestört halten. Am Zeitlimit zählt Kontrollzeit, dann Core-Leben und Gebiet. Core-Zerstörung gewinnt sofort." : "Das Gefecht ist angehalten."}</p><button class="primary" id="resume">WEITERSPIELEN <span>▷</span></button><button class="secondary" id="pause-help">Spielregeln ansehen</button><button class="text-btn" id="quit">Gefecht beenden</button>`,
  );
  el("resume").onclick = resume;
  el("pause-help").onclick = () => help(true);
  el("quit").onclick = () => {
    showModal(
      `<div class="eyebrow">GEFECHT BEENDEN</div><h2>Zurück zur Basis?</h2><p>Das laufende Gefecht wird verworfen. Eine Einsatzserie bleibt vor diesem Gefecht gespeichert.</p><button id="stay" class="primary">WEITERSPIELEN</button><button id="confirm-quit" class="secondary">Match verlassen</button>`,
    );
    el("stay").onclick = resume;
    el("confirm-quit").onclick = lobby;
  };
}
function lobby() {
  activeSeries = false;
  activeDraftDeck = null;
  activeDaily = null;
  renderCommander(commanderId);
  renderCards();
  activeMission = null;
  active = false;
  paused = false;
  selected = null;
  ended = false;
  match = new Match({ playerDeck: deck, playerCommander: commanderId });
  el("modal").hidden = true;
  el("lobby").hidden = false;
  el<HTMLButtonElement>("pause").disabled = true;
  el<HTMLButtonElement>("commander").disabled = true;
  el("mode-label").textContent = "EINSATZBASIS";
  updateSelection();
  updateHud(true);
  updateRecord();
  updateCampaignProgress();
  updateDaily();
  el("battle-banner").hidden = true;
  el("deployment-countdown").hidden = true;
  matchReadyAt = 0;
  matchGoUntil = 0;
  pauseBeganAt = 0;
  startBannerShown = false;
  el("continue-campaign").focus();
}
function help(fromPause = false) {
  const wasPlaying = active && !ended;
  const restoreMenu = (fromPause || ended) && !el("modal").hidden;
  const previous = restoreMenu
    ? Array.from(el("modal-content").childNodes)
    : [];
  if (wasPlaying) paused = true;
  updateHud(true);
  showModal(
    `<div class="eyebrow">FELDHANDBUCH / 01</div><h2>Boden ist Macht.</h2><div class="rules"><p><b>1 · Karte antippen</b>Jede Karte kostet Energie. Sie lädt automatisch auf, maximal bis 10.</p><p><b>2 · Im grünen Gebiet einsetzen</b>Halte die Arena gedrückt, korrigiere dein Ziel und lasse zum Einsetzen los. Außerhalb der Arena abbrechen. Rot bedeutet: Einsatz nicht möglich. Deine Einheiten kämpfen selbstständig und erobern Punkte. Verbundene Punkte verschieben deine Einsatzgrenze nach vorne. Gelb markierte Punkte sind umkämpft oder von deiner Basis abgeschnitten.</p><p><b>3 · Auf Rollen achten</b>Vanguard erobert, Bulwark hält Schaden aus. Ranger und Lancer treffen aus der Distanz. Swarm überwältigt, Medic heilt. Raider stößt schnell vor, Sentinel hält aus der Distanz dagegen. Mortar trifft Gruppen: Setze deine Truppen verteilt ein. Disruptor bremst Bewegungen, aber keine Angriffe; Fernkämpfer können weiter feuern.</p><p><b>4 · Den richtigen Moment nutzen</b>Wähle im Deckeditor zwei Fähigkeiten: Pulse trifft Gegner im Zielkreis, Rally heilt und beschleunigt deine Truppen. Stasis bremst getroffene Gegner vier Sekunden lang, Repulsor stößt sie vom Zielpunkt weg. Beide neuen Fähigkeiten verursachen keinen Schaden und brauchen Gegner im Zielgebiet. Wähle vor dem Match deinen Kommandanten: ATLAS gibt allen eigenen Truppen 70 Schild für 6 Sekunden. LYRA heilt bis zu 80 HP und entfernt Verlangsamung, aber repariert keinen Core. Die Fähigkeit kostet keine Energie; ATLAS lädt 30, LYRA 35 Sekunden. Der Bot nutzt dieselbe Kommandantenwahl.</p><p><b>5 · Core zerstören</b>Nach 3 Minuten zählt Core-Leben, dann Gebiet. Bei Gleichstand: 45 Sekunden Verlängerung. Danach ist auch ein Unentschieden möglich.</p><p><b>6 · Signalkrieg</b>Markierte Relais zählen, wenn sie dir gehören, mit deiner Basis verbunden und nicht umkämpft sind. Erreiche die angezeigte Kontrollzeit oder zerstöre den Core. Verlorene Kontrolle pausiert deinen Zähler. Nach 3 Minuten zählt Kontrollzeit, dann Core-Leben und Gebiet; keine Verlängerung.</p></div><button id="help-close" class="primary">${restoreMenu ? "ZURÜCK" : wasPlaying ? "ZURÜCK INS GEFECHT" : "VERSTANDEN"} <span>→</span></button>`,
  );
  el("help-close").onclick = () => {
    if (restoreMenu) {
      el("modal-content").replaceChildren(...previous);
      el("modal-content").querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  el("modal-content").scrollTop = 0;
    } else if (wasPlaying) resume();
    else el("modal").hidden = true;
  };
}
function finalFrontMap(): string {
  const state = match.state;
  const playerPoints = state.points.filter((point) => point.owner === "player").length;
  const enemyPoints = state.points.filter((point) => point.owner === "enemy").length;
  const playerCore = Math.round(
    (state.cores.player.hp / state.cores.player.maxHp) * 100,
  );
  const enemyCore = Math.round(
    (state.cores.enemy.hp / state.cores.enemy.maxHp) * 100,
  );
  return `<div class="result-front"><div class="result-front-head"><span><b>DEINE FRONT</b><small>${playerPoints}/9 Gebiete · Core ${playerCore}%</small></span><span><b>GEGNER</b><small>${enemyPoints}/9 Gebiete · Core ${enemyCore}%</small></span></div><div class="result-front-grid" aria-label="Finale Gebietskontrolle">${state.points.map((point) => `<i class="owner-${point.owner ?? "neutral"} ${point.owner && !point.supplied ? "cut" : ""}"><span>${"ABC"[point.id % 3]}${Math.floor(point.id / 3) + 1}</span></i>`).join("")}</div><div class="result-front-legend"><span class="player">DEIN GEBIET</span><span class="neutral">NEUTRAL</span><span class="enemy">GEGNER</span></div></div>`;
}

function finish() {
  ended = true;
  selected = null;
  updateSelection();
  el<HTMLButtonElement>("commander").disabled = true;
  el<HTMLButtonElement>("pause").disabled = true;
  const won = match.state.winner === "player",
    draw = match.state.winner === "draw";
  stats.matches++;
  if (won) stats.wins++;
  saveStats(stats);
  updateRecord();
  sound.play(won ? "win" : "lose");
  const st = match.state.stats;
  const wasSeries = activeSeries;
  const wasDraft = activeDraftDeck !== null;
  const daily = activeDaily;
  const wasDaily = daily !== null;
  let seriesResult = "";
  let dailyResult = "";
  if (wasSeries && seriesRun) {
    seriesRun = completeSeriesBattle(seriesRun, match.state);
    const saved = saveSeries(seriesRun);
    seriesResult = `<div class="mission-result"><b>${seriesRun.wins} / 3 SIEGE</b><p>${seriesRun.wins === 3 ? "Serie gemeistert!" : seriesEnded(seriesRun) ? "Serie beendet. Stelle dein Deck neu auf und versuche es erneut." : `${SERIES_LIVES - seriesRun.losses} Versuche übrig. ${draw ? "Unentschieden: kein Versuch verloren." : "Dein Deck bleibt für die nächste Front bestehen."}`}</p>${saved ? "" : "<small>Zwischenstand nur für diese Sitzung gespeichert.</small>"}</div>`;
  }
  if (daily) {
    const before = dailyRecord(dailyHistory, daily.key);
    dailyHistory = completeDaily(dailyHistory, daily.key, match.state);
    const after = dailyRecord(dailyHistory, daily.key)!;
    const saved = saveDailyHistory(dailyHistory);
    const firstClear = won && !before?.completed;
    const faster =
      won &&
      !!before?.bestTime &&
      after.bestTime > 0 &&
      after.bestTime < before.bestTime;
    dailyResult = `<div class="mission-result daily-result"><b>${firstClear ? "TAGESFRONT GESICHERT" : won ? faster ? "NEUE BESTZEIT" : "TAGESFRONT GEHALTEN" : draw ? "TAGESFRONT UNENTSCHIEDEN" : "TAGESFRONT OFFEN"}</b><p>${won ? `Bestzeit ${Math.floor(after.bestTime / 60)}:${String(after.bestTime % 60).padStart(2, "0")} · bester Core ${after.bestCore}% · ${after.bestPoints}/9 Punkte` : `Versuch ${after.attempts}. Das heutige Setup bleibt gleich und kann sofort erneut gespielt werden.`}</p>${saved ? "" : "<small>Tagesrekord nur für diese Sitzung gespeichert.</small>"}</div>`;
    updateDaily();
  }
  const previousBaseStage = baseStage(Object.keys(campaignProgress).length);
  const mission = wasSeries || wasDaily ? null : activeMission;
  const earnedStars = mission ? missionStars(mission, match.state) : 0;
  let progressSaved = true;
  if (mission && earnedStars) {
    campaignProgress = completeMission(campaignProgress, mission, match.state);
    progressSaved = saveCampaign(campaignProgress);
    updateCampaignProgress();
  }
  const nextMission =
    mission && won ? MISSIONS[MISSIONS.indexOf(mission) + 1] : undefined;
  const missionResult = mission
    ? `<div class="mission-result"><b>${"★".repeat(earnedStars)}${"☆".repeat(3 - earnedStars)}</b><p>${won ? (nextMission ? "Nächster Einsatz freigeschaltet." : "Kampagne abgeschlossen. Verbessere deine Sterne in früheren Einsätzen.") : "Gewinne diesen Einsatz, um weiter vorzurücken."}</p>${!progressSaved ? "<small>Fortschritt nur für diese Sitzung gespeichert.</small>" : ""}</div>`
    : "";
  const report = createMatchRecord(match, mission?.id);
  const oldMastery = mastery;
  mastery = advanceMastery(mastery, match.state, report.id);
  const masterySaved = saveMastery(mastery);
  const improved = CARDS.filter(
    (card) => (mastery.units[card.id] ?? 0) > (oldMastery.units[card.id] ?? 0),
  );
  const masteryResult = improved.length
    ? `<div class="learning-result"><b>EINHEITENMEISTERUNG</b>${improved.map((card) => `<p>${card.name} · ${masteryLabel(mastery, card.id)}${masteryRank(mastery.units[card.id] ?? 0).frame !== masteryRank(oldMastery.units[card.id] ?? 0).frame ? " · NEUER KARTENRAHMEN!" : ""}</p>`).join("")}${!masterySaved ? "<small>Meisterung nur für diese Sitzung gespeichert.</small>" : ""}</div>`
    : "";
  const previousLessonCount = completedLessons(learningProgress);
  learningProgress = advanceLearning(learningProgress, match.state, report.id);
  const learningSaved = saveLearning(learningProgress);
  const learned = completedLessons(learningProgress) - previousLessonCount;
  const newBaseStage = baseStage(Object.keys(campaignProgress).length);
  const rewardResult = `<div class="learning-result"><b>${learned > 0 ? `${learned} LERNAUFTRAG${learned > 1 ? "E" : ""} ERFÜLLT` : "DEIN LERNPFAD"}</b><p>${completedLessons(learningProgress)}/${LESSONS.length} abgeschlossen${learned > 0 && completedLessons(learningProgress) === LESSONS.length ? " · Aurora-Gestaltung freigeschaltet! In deiner Basis ausrüsten." : " · Fortschritt bleibt auch bei Niederlagen erhalten."}</p>${newBaseStage > previousBaseStage ? `<p>HAUPTQUARTIER AUSGEBAUT: ${BASE_STAGES[newBaseStage].name}${previousBaseStage < 3 && newBaseStage >= 3 ? " · Glut-Gestaltung freigeschaltet!" : ""}</p>` : ""}${!learningSaved ? "<small>Lernfortschritt nur für diese Sitzung gespeichert.</small>" : ""}</div>`;
  updateHeadquarters();
  history.unshift(report);
  history.length = Math.min(history.length, HISTORY_LIMIT);
  const recorded = saveHistory(history);
  showModal(
    `<div class="result-emblem ${won ? "won" : ""}">${won ? "↗" : draw ? "＝" : "◇"}</div><div class="eyebrow">EINSATZ ABGESCHLOSSEN</div><h2>${won ? "Front gesichert." : draw ? "Front gehalten." : "Neu formieren."}</h2><p>${match.state.reason}</p>${missionResult}${seriesResult}${dailyResult}${rewardResult}${masteryResult}${resultComparison(report)}${finalFrontMap()}<div class="result-stats"><div><strong>${st.captured}</strong><span>EROBERUNGEN</span></div><div><strong>${st.deployed}</strong><span>EINSÄTZE</span></div><div><strong>${st.kills}</strong><span>ABSCHÜSSE</span></div></div>${nextMission ? `<button id="next-mission" class="primary">NÄCHSTER EINSATZ ↗</button>` : ""}<button id="rematch" class="${nextMission ? "secondary" : "primary"}">${wasDraft ? "NEUES DECK DRAFTEN" : wasSeries ? (seriesEnded(seriesRun!) ? "SERIENÜBERSICHT" : "SERIE FORTSETZEN") : wasDaily ? "TAGESFRONT WIEDERHOLEN" : mission ? "EINSATZ WIEDERHOLEN" : "NOCH EIN GEFECHT"} <span>↗</span></button><button id="back" class="secondary">Zur Basis</button><div class="feedback"><span>Wie war das Match?</span><div><button data-feedback="again">Macht Lust auf mehr</button><button data-feedback="unclear">Noch unklar</button><button data-feedback="boring">Zu wenig Spannung</button></div><small id="feedback-note">${recorded ? "Ergebnis und Feedback bleiben auf diesem Gerät." : "Speicher nicht verfügbar: Verlauf nur für diese Sitzung."}</small></div>`,
  );
  el("rematch").onclick = () => {
    if (wasDraft) {
      lobby();
      openDraft();
    } else if (wasSeries) {
      lobby();
      openSeries();
    } else if (daily) {
      start(true, null, false, null, daily);
    } else start(true, mission);
  };
  if (nextMission) el("next-mission").onclick = () => start(false, nextMission);
  el("back").onclick = lobby;
  document.querySelectorAll<HTMLButtonElement>("[data-feedback]").forEach(
    (b) =>
      (b.onclick = () => {
        report.feedback = b.dataset.feedback as MatchFeedback;
        const feedbackSaved = saveHistory(history);
        stats.lastFeedback = report.feedback;
        saveStats(stats);
        document
          .querySelectorAll("[data-feedback]")
          .forEach((other) => other.classList.toggle("chosen", other === b));
        el("feedback-note").textContent = feedbackSaved
          ? "Lokal gespeichert. Danke für den Spieltest."
          : "Rückmeldung für diese Sitzung übernommen.";
      }),
  );
  updateHud(true);
}
function updateRecord() {
  el("local-record").textContent = stats.matches
    ? `${stats.matches} lokale Matches · ${stats.wins} Siege`
    : "LOKAL SPIELEN. DIREKT LOSLEGEN.";
}
function setCoachFocus(focus: BattleCoachFocus | null) {
  el("cards").classList.toggle("coach-focus", focus === "cards");
  el("arena").parentElement?.classList.toggle("coach-focus", focus === "arena");
  el("commander").classList.toggle("coach-focus", focus === "commander");
}
function updateHud(force = false) {
  if (!force && (!active || paused || ended)) return;
  const now = performance.now();
  const live = matchLive();
  const countdown = el("deployment-countdown");
  if (active && !ended && now < matchReadyAt) {
    countdown.hidden = false;
    countdown.classList.remove("go");
    countdown.textContent = String(
      Math.max(1, Math.ceil((matchReadyAt - now) / 1000)),
    );
  } else if (active && !ended && now < matchGoUntil) {
    countdown.hidden = false;
    countdown.classList.add("go");
    countdown.textContent = "LOS";
    if (!startBannerShown) {
      startBannerShown = true;
      announceBattle(
        activeDaily ? "TAGESFRONT" : "DEIN AUFTRAG",
        match.controlObjective ? "RELAIS SICHERN" : "FRONT DURCHBRECHEN",
      );
    }
  } else {
    countdown.hidden = true;
    countdown.classList.remove("go");
  }
  if (!force && now - lastHud < 100) return;
  lastHud = now;
  const s = match.state;
  const coach = battleCoachHint(learningProgress, s, selected);
  el("learning-hud").hidden = !live || !coach;
  if (coach) {
    el("learning-hud").innerHTML =
      `<small>${coach.kicker}</small><b>${coach.title}</b><span>${coach.detail}</span><i>${coach.current}/${coach.goal}</i>`;
    setCoachFocus(coach.focus);
  } else {
    setCoachFocus(null);
  }
  if (s.time >= bannerUntil || ended || !active)
    el("battle-banner").hidden = true;
  if (live && s.phase !== "ended") {
    const critical = s.cores.player.hp <= s.cores.player.maxHp * 0.25;
    const lastPush = s.time >= MATCH_DURATION - 30;
    const notice =
      critical && !battleNotices.has("critical")
        ? "critical"
        : lastPush && !battleNotices.has("lastPush")
          ? "lastPush"
          : null;
    if (notice) {
      battleNotices.add(notice);
      announceBattle(
        notice === "critical" ? "DEIN CORE BRAUCHT SCHUTZ" : "NOCH 30 SEKUNDEN",
        notice === "critical" ? "BASIS IN GEFAHR" : "JETZT ENTSCHEIDET’S",
        notice === "critical",
      );
    }
  }
  const remaining = Math.max(
    0,
    Math.ceil(
      (s.phase === "overtime" || s.time > MATCH_DURATION
        ? MATCH_DURATION + OVERTIME_DURATION
        : MATCH_DURATION) - s.time,
    ),
  );
  el("timer").textContent =
    `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  el("phase-label").textContent =
    active && !live && !paused
      ? "BEREIT"
      : s.phase === "overtime"
      ? "OVERTIME"
      : activeDaily
        ? "TAGESFRONT"
        : activeSeries
          ? `SERIE ${Math.min(3, (seriesRun?.wins ?? 0) + (ended ? 0 : 1))}/3`
          : activeMission
            ? `EINSATZ ${MISSIONS.indexOf(activeMission) + 1}`
            : match.controlObjective
              ? "SIGNALKRIEG"
              : "TRAINING";
  const control = match.controlObjective;
  el("control-hud").hidden = !control;
  if (control) {
    el("control-label").textContent =
      `SIGNALKRIEG · ${control.requiredPoints}/${control.pointIds.length} RELAIS HALTEN · ZIEL ${control.seconds}s`;
    for (const team of ["player", "enemy"] as const) {
      el(`control-${team}`).textContent =
        `${team === "player" ? "DU" : "BOT"} ${Math.floor(s.controlTime[team] + 1e-8)}s`;
      el(`control-${team}-bar`).style.width =
        `${Math.min(100, (s.controlTime[team] / control.seconds) * 100)}%`;
    }
  }
  el("timer").classList.toggle("urgent", remaining <= 30);
  for (const team of ["player", "enemy"] as const) {
    const percent = Math.ceil(
      Math.max(0, s.cores[team].hp / s.cores[team].maxHp) * 100,
    );
    el(`${team}-hp`).textContent = `${percent}%`;
    el(`${team}-health`).style.width = `${percent}%`;
  }
  el("energy").textContent = String(Math.floor(s.energy.player));
  el("energy-fill").style.width = `${(s.energy.player / ENERGY_CAP) * 100}%`;
  el("territory-count").textContent =
    `${s.points.filter((p) => p.owner === "player").length} / 9 PUNKTE`;
  if (!selected) {
    const disconnected = s.points.some(
      (point) => point.owner === "player" && !point.supplied,
    );
    const contested = s.points.some((point) => point.contested);
    el("arena-tip").textContent = disconnected
      ? "VERSORGUNG UNTERBROCHEN"
      : contested
        ? "PUNKT UMKÄMPFT"
        : s.points.filter((point) => point.owner === "player").length >= 6
          ? "ERREICHE DEN GEGNERISCHEN CORE"
          : control
            ? "HALTE DIE MARKIERTEN RELAIS"
            : "EROBERE DIE MITTE";
  }
  for (const card of deckCards) {
    const b = cardButtons.get(card.id)!;
    b.classList.toggle("unaffordable", s.energy.player < card.cost);
    b.disabled = !live;
  }
  el("commander-status").textContent =
    s.commanderCooldown > 0 ? `${Math.ceil(s.commanderCooldown)}s` : "BEREIT";
  el<HTMLButtonElement>("commander").disabled =
    !live || s.commanderCooldown > 0;
  const lostPoint =
    active && !ended
      ? s.points.find(
          (point, index) =>
            lastPointOwners[index] === "player" && point.owner === "enemy",
        )
      : undefined;
  if (lostPoint) {
    const pointName =
      `${"ABC"[lostPoint.id % 3]}${Math.floor(lostPoint.id / 3) + 1}`;
    if (el("battle-banner").hidden)
      announceBattle("FRONT VERLOREN", `${pointName} IST GEFALLEN`);
    else showToast(`${pointName} verloren. Front neu stabilisieren.`, true);
  }
  lastPointOwners = s.points.map((point) => point.owner);
  if (active && !ended && s.stats.captured > lastCaptured) {
    lastCaptured = s.stats.captured;
    if (el("battle-banner").hidden)
      announceBattle("GEBIET GESICHERT", "DEINE FRONT RÜCKT VOR");
    else showToast("Punkt erobert. Deine Front rückt vor.");
    sound.play("capture");
  }
  if (active && !ended && s.phase === "ended") finish();
}
function commander() {
  if (!matchLive()) return;
  const result = match.activateCommander();
  showToast(result.message, !result.ok);
  sound.play(result.ok ? "ability" : "error");
  updateHud(true);
}
function updateSound() {
  el("sound").classList.toggle("on", sound.enabled);
  el("sound").setAttribute(
    "aria-label",
    sound.enabled ? "Ton ausschalten" : "Ton einschalten",
  );
  el("sound").setAttribute("aria-pressed", String(sound.enabled));
}
el("sound").onclick = () => {
  sound.enabled = !sound.enabled;
  setting("sound", sound.enabled ? "on" : "off");
  sound.unlock();
  sound.play("select");
  updateSound();
};
el("edit-deck").onclick = () => {
  if (active) return;
  showModal("");
  renderDeckBuilder(
    el("modal-content"),
    deck,
    (next) => {
      deck = [...next];
      const persisted = saveDeck(deck);
      match = new Match({ playerDeck: deck, playerCommander: commanderId });
      renderCards();
      updateSelection();
      updateHud(true);
      el("modal").hidden = true;
      el("edit-deck").focus();
      showToast(
        persisted
          ? "Einsatzdeck gespeichert."
          : "Deck für diese Sitzung übernommen.",
      );
    },
    () => {
      el("modal").hidden = true;
      el("edit-deck").focus();
    },
    mastery,
    deckSlots,
    (slots) => {
      deckSlots = slots;
      return saveDeckSlots(slots);
    },
  );
};
el("history").onclick = () => {
  if (active) return;
  showModal("");
  renderMatchHistory(
    el("modal-content"),
    history,
    (next) => {
      deck = next;
      saveDeck(deck);
      renderCards();
      lobby();
      el("edit-deck").focus();
    },
    () => {
      el("modal").hidden = true;
      el("history").focus();
    },
  );
};
function updateCampaignProgress() {
  updateHeadquarters();
  const completed = Object.keys(campaignProgress).length;
  const stars = Object.values(campaignProgress).reduce(
    (sum, best) => sum + best.stars,
    0,
  );
  el("campaign-progress").textContent =
    `${completed}/${MISSIONS.length} Einsätze · ${stars} Sterne`;
  el("base-stars").textContent = `${stars} / ${MISSIONS.length * 3} ★`;
  el("base-completed").textContent =
    `${completed} VON ${MISSIONS.length} GESICHERT`;
  nextCampaignMission =
    MISSIONS.find(
      (mission, index) =>
        missionUnlocked(index, campaignProgress) &&
        !campaignProgress[mission.id],
    ) ??
    MISSIONS.reduce(
      (best, mission) =>
        (campaignProgress[mission.id]?.stars ?? 0) <
        (campaignProgress[best.id]?.stars ?? 0)
          ? mission
          : best,
      MISSIONS[0],
    );
  const nextIndex = MISSIONS.indexOf(nextCampaignMission);
  const chapterIndex = CHAPTERS.reduce(
    (latest, chapter, index) =>
      MISSIONS.findIndex((m) => m.id === chapter.firstMission) <= nextIndex
        ? index
        : latest,
    0,
  );
  el("next-chapter").textContent =
    `KAPITEL ${String(chapterIndex + 1).padStart(2, "0")} / ${CHAPTERS[chapterIndex].title}`;
  el("next-mission-name").textContent =
    `${String(nextIndex + 1).padStart(2, "0")} — ${nextCampaignMission.name}`;
  el("next-mission-type").textContent = nextCampaignMission.controlObjective
    ? "◈ SIGNALKRIEG"
    : "◇ CORE-ANGRIFF";
  el("next-mission-hint").textContent = nextCampaignMission.briefing;
  el("continue-campaign").innerHTML =
    `${completed === MISSIONS.length ? "STERNE VERBESSERN" : completed ? "FELDZUG FORTSETZEN" : "ERSTE FRONT EROBERN"} <span>↗</span>`;
  el("chapter-track").innerHTML = CHAPTERS.map((chapter, index) => {
    const first = MISSIONS.findIndex((m) => m.id === chapter.firstMission);
    const end =
      index + 1 < CHAPTERS.length
        ? MISSIONS.findIndex((m) => m.id === CHAPTERS[index + 1].firstMission)
        : MISSIONS.length;
    const missions = MISSIONS.slice(first, end);
    const earned = missions.reduce(
      (sum, m) => sum + (campaignProgress[m.id]?.stars ?? 0),
      0,
    );
    return `<div class="chapter-stop ${chapterIndex === index ? "current" : ""}"><span>0${index + 1}</span><b>${chapter.title}</b><div class="chapter-meter"><i style="width:${(earned / (missions.length * 3)) * 100}%"></i></div><small>${earned}/${missions.length * 3} ★</small></div>`;
  }).join("");
  el("series-preview").textContent =
    seriesRun && !seriesEnded(seriesRun)
      ? `${seriesRun.wins}/3 Siege · Fortsetzen`
      : seriesRun?.wins === 3
        ? "Gemeistert · Neue Route?"
        : "Ein Deck. Drei Siege.";
}
el("continue-campaign").onclick = () => {
  if (!active) start(false, nextCampaignMission);
};
el("campaign").onclick = () => {
  if (active) return;
  showModal("");
  renderCampaign(
    el("modal-content"),
    campaignProgress,
    (mission) => start(false, mission),
    () => {
      el("modal").hidden = true;
      el("campaign").focus();
    },
  );
};
function openSeries() {
  if (active) return;
  const ongoing = seriesRun && !seriesEnded(seriesRun);
  const routes = SERIES_ROUTES[ongoing ? seriesRun!.wins : 0];
  const chosen = ongoing ? seriesRun!.deck : deck;
  showModal(
    `<div class="eyebrow">EINSATZSERIE</div><h2>Drei Fronten. Ein Deck.</h2><p>Gewinne drei Gefechte: Rekrut, Taktiker, Veteran. Die zweite Niederlage beendet die Serie. Unentschieden kosten keinen Versuch. Core und Energie starten jedes Gefecht frisch.</p><p>Deck und Kommandant bleiben innerhalb der Serie fest. Zwischenstände werden lokal gespeichert; ein unterbrochenes Gefecht beginnt beim Fortsetzen neu. Kampagnensterne werden hier nicht vergeben.</p><p><b>${ongoing ? `${seriesRun!.wins}/3 Siege · ${SERIES_LIVES - seriesRun!.losses} Versuche übrig` : seriesRun?.wins === 3 ? "Letzte Serie gemeistert" : "Neue Serie bereit"}</b></p><p>Kommandant: <b>${COMMANDERS[ongoing ? seriesRun!.commander : commanderId].name}</b></p><p>Deck: ${chosen.map((id) => CARDS.find((c) => c.id === id)!.name).join(" · ")}</p><h3>Wähle deine nächste Front</h3><p>Nach Niederlage oder Unentschieden kannst du die Route wechseln. Das Deck bleibt fest.</p><div class="mission-list">${routes.map((stage, index) => `<article class="mission-card"><div class="mission-top"><span>ROUTE ${index + 1} · ${stage.controlObjective ? "SIGNALKRIEG" : "CORE-ANGRIFF"}</span>${seriesRun?.route === stage.id && ongoing ? "<b>ZULETZT GEWÄHLT</b>" : ""}</div><h3>${stage.name}</h3><div class="mission-body"><div class="mission-map" aria-label="Startfront: oben Gegnerbasis, unten deine Basis">${stage.owners.map((owner, id) => `<i class="owner-${owner ?? "neutral"} ${stage.controlObjective?.pointIds.includes(id) ? "relay" : ""}"></i>`).join("")}</div><p>${stage.briefing}</p></div><p class="mission-tip">${stage.tip}</p><details><summary>Ziel & Gegnerdeck</summary><p>${objectiveDescription(stage)}</p><p>${stage.enemyDeck.map((id) => CARDS.find((c) => c.id === id)!.name).join(" · ")}</p></details><button data-series-route="${stage.id}" class="primary">DIESE FRONT ANGREIFEN ↗</button></article>`).join("")}</div><button id="series-close" class="secondary">Zur Basis</button>`,
  );
  el("modal-content")
    .querySelectorAll<HTMLButtonElement>("[data-series-route]")
    .forEach((button) => {
      button.onclick = () => {
        if (!seriesRun || seriesEnded(seriesRun))
          seriesRun = newSeries(deck, commanderId);
        const stage = routes.find((m) => m.id === button.dataset.seriesRoute)!;
        seriesRun = chooseSeriesRoute(seriesRun, stage.id);
        const saved = saveSeries(seriesRun);
        start(false, stage, true);
        if (!saved) showToast("Serie nur für diese Sitzung gespeichert.");
      };
    });
  el("series-close").onclick = () => {
    el("modal").hidden = true;
    el("series").focus();
  };
}
function dailyObjective(challenge: DailyChallenge): string {
  const objective = challenge.controlObjective;
  return objective
    ? `${objective.requiredPoints} von ${objective.pointIds.length} markierten Relais · ${objective.seconds}s Kontrollzeit`
    : "Core-Angriff · nach 3 Minuten zählt Core-Leben und Gebiet";
}
function updateDaily() {
  const challenge = dailyChallenge();
  const record = dailyRecord(dailyHistory, challenge.key);
  el("daily-title").textContent = challenge.title;
  el("daily-status").textContent = record?.completed
    ? `GESICHERT · Bestzeit ${Math.floor(record.bestTime / 60)}:${String(record.bestTime % 60).padStart(2, "0")}`
    : record?.attempts
      ? `${record.attempts} Versuch${record.attempts === 1 ? "" : "e"} · Noch offen`
      : `${challenge.difficulty === "veteran" ? "Veteran" : "Taktiker"} · ${dailyObjective(challenge)}`;
  el("daily").classList.toggle("complete", !!record?.completed);
}
function openDaily() {
  if (active) return;
  const challenge = dailyChallenge();
  const record = dailyRecord(dailyHistory, challenge.key);
  showModal(
    `<div class="eyebrow">TAGESFRONT · ${challenge.key}</div><h2>${challenge.title}</h2><p>${challenge.briefing}</p><div class="daily-brief"><div><small>SCHAUPLATZ</small><b>${ARENA_THEMES[challenge.theme].name}</b></div><div><small>GEGNER</small><b>${challenge.difficulty === "veteran" ? "VETERAN" : "TAKTIKER"} · ${COMMANDERS[challenge.enemyCommander].name}</b></div><div><small>DEIN COMMANDER</small><b>${COMMANDERS[challenge.playerCommander].name}</b></div><div><small>ZIEL</small><b>${dailyObjective(challenge)}</b></div></div><p class="mission-tip">${challenge.tip}</p><div class="daily-map" aria-label="Heutige Startfront">${challenge.owners.map((owner, id) => `<i class="owner-${owner ?? "neutral"} ${challenge.controlObjective?.pointIds.includes(id) ? "relay" : ""}"></i>`).join("")}</div><h3>Heutiges Einsatzdeck</h3><div class="daily-deck">${challenge.playerDeck.map((id) => { const card = CARDS.find((item) => item.id === id)!; return `<span data-card="${id}"><i>${card.cost}</i><span>${unitSvg(id)}</span><b>${card.name}</b></span>`; }).join("")}</div>${record ? `<div class="daily-record ${record.completed ? "complete" : ""}"><b>${record.completed ? "HEUTE GESICHERT" : "HEUTE NOCH OFFEN"}</b><span>${record.attempts} Versuch${record.attempts === 1 ? "" : "e"}${record.completed ? ` · Bestzeit ${Math.floor(record.bestTime / 60)}:${String(record.bestTime % 60).padStart(2, "0")} · Core ${record.bestCore}%` : ""}</span></div>` : ""}<p class="daily-note">Für diesen Kalendertag sind Setup, Deck und Seed fest. Wiederholungen sind kostenlos. Morgen entsteht automatisch eine neue Front.</p><button id="daily-play" class="primary">${record?.completed ? "BESTWERT VERBESSERN" : "TAGESFRONT STARTEN"} ↗</button><button id="daily-close" class="secondary">Zur Basis</button>`,
  );
  el("daily-play").onclick = () => start(false, null, false, null, challenge);
  el("daily-close").onclick = () => {
    el("modal").hidden = true;
    el("daily").focus();
  };
}
el("daily").onclick = openDaily;

function headquartersMetrics(): BaseProjectMetrics {
  return {
    wins: Object.keys(campaignProgress).length,
    stars: Object.values(campaignProgress).reduce((sum, best) => sum + best.stars, 0),
    lessons: completedLessons(learningProgress),
    mastery: Object.values(mastery.units).reduce(
      (sum, value) => sum + (value ?? 0),
      0,
    ),
  };
}
function baseMetricLabel(metric: keyof BaseProjectMetrics): string {
  return metric === "wins"
    ? "verschiedene Siege"
    : metric === "stars"
      ? "Kampagnensterne"
      : metric === "mastery"
        ? "Mastery-Punkte"
        : "Lernaufträge";
}
function headquartersGarrison() {
  return CARDS.filter((card) => card.kind === "unit")
    .map((card) => ({
      card,
      mastery: mastery.units[card.id] ?? 0,
    }))
    .filter((entry) => entry.mastery > 0)
    .sort(
      (a, b) =>
        b.mastery - a.mastery ||
        a.card.cost - b.card.cost ||
        a.card.name.localeCompare(b.card.name),
    )
    .slice(0, 4);
}
function updateHeadquarters() {
  const wins = Object.keys(campaignProgress).length;
  const stage = baseStage(wins);
  const next = BASE_STAGES[stage + 1];
  const displayStyle = styleUnlocked(learningProgress.style, learningProgress, wins, supporterOwned) ? learningProgress.style : "field";
  const style = BASE_STYLES[displayStyle];
  const projects = learningProgress.projects ?? [];
  const garrisonIds = headquartersGarrison().map((entry) => entry.card.id);
  el("lobby").dataset.baseStyle = displayStyle;
  el("hq-mini-art").innerHTML = headquartersSvg(
    stage,
    style.color,
    projects,
    garrisonIds,
  );
  el("hq-name").textContent = BASE_STAGES[stage].name;
  el("hq-progress-fill").style.width = `${next ? Math.min(100, ((wins - BASE_STAGES[stage].wins) / (next.wins - BASE_STAGES[stage].wins)) * 100) : 100}%`;
  const readyProjects = BASE_PROJECTS.filter(
    (project) =>
      !baseProjectBuilt(learningProgress, project.id) &&
      baseProjectProgress(project.id, headquartersMetrics()).ready,
  ).length;
  el("hq-next").textContent = readyProjects
    ? `${readyProjects} Bauprojekt${readyProjects === 1 ? "" : "e"} bereit · Basis öffnen`
    : next
      ? `${wins}/${next.wins} Einsätze · Nächster Ausbau: ${next.name}`
      : "Vollständig ausgebaut · Deine Front steht";
  const done = completedLessons(learningProgress);
  el("learning-count").textContent =
    `FELDAUSBILDUNG · ${done}/${LESSONS.length}`;
  el("learning-next").textContent =
    LESSONS.find((l) => learningProgress.counts[l.id] < l.goal)?.name ??
    "Aurora freigeschaltet · Jetzt ausrüsten";
}
function openHeadquarters() {
  if (active) return;
  const metrics = headquartersMetrics();
  const wins = metrics.wins;
  const stage = baseStage(wins);
  const nextStage = BASE_STAGES[stage + 1];
  const displayStyle = styleUnlocked(learningProgress.style, learningProgress, wins, supporterOwned) ? learningProgress.style : "field";
  const projects = learningProgress.projects ?? [];
  const garrisonIds = headquartersGarrison().map((entry) => entry.card.id);
  showModal(
    `<div class="eyebrow">DEINE BLEIBENDE FRONT</div><h2>${BASE_STAGES[stage].name}</h2><div class="hq-art">${headquartersSvg(stage, BASE_STYLES[displayStyle].color, projects, garrisonIds)}</div><p>${BASE_STAGES[stage].description}</p>${nextStage ? `<details class="hq-next-preview"><summary>NÄCHSTER AUSBAU · ${nextStage.name} · Noch ${nextStage.wins - wins} ${nextStage.wins - wins === 1 ? "Sieg" : "Siege"}</summary><div class="hq-art">${headquartersSvg(stage + 1, BASE_STYLES[displayStyle].color, projects, garrisonIds)}</div><p>${nextStage.description}</p><small>VORSCHAU · ${nextStage.wins} verschiedene Kampagneneinsätze gewinnen.</small></details>` : '<div class="learning-reward"><b>KOMMANDOZITADELLE VOLLSTÄNDIG</b><p>Alle Ausbaustufen erreicht. Deine Basis zeigt deinen gesamten Feldzug.</p></div>'}<p>Deine Basis wächst auf zwei Arten: Feldzugstufen entstehen durch verschiedene Siege. Bauprojekte errichtest du selbst, sobald du ihre Spielziele erreicht hast. Alles bleibt kosmetisch und verändert keine Kampfwerte.</p><div class="hq-stages">${BASE_STAGES.map((item, i) => `<span class="${i <= stage ? "built" : ""}"><b>${i <= stage ? "✓" : item.wins}</b>${item.name}</span>`).join("")}</div><h3>Bauprojekte</h3><div class="hq-projects">${BASE_PROJECTS.map((project, index) => { const state = baseProjectProgress(project.id, metrics); const built = baseProjectBuilt(learningProgress, project.id); return `<article data-base-project-card="${project.id}" class="hq-project ${built ? "built" : state.ready ? "ready" : "locked"}"><div class="hq-project-head"><span>${String(index + 1).padStart(2, "0")}</span><b>${built ? "GEBAUT" : state.ready ? "BEREIT ZUM BAUEN" : "PROJEKT GESPERRT"}</b></div><h4>${project.name}</h4><p>${project.description}</p><div class="hq-project-progress"><i style="width:${Math.min(100, (state.current / state.goal) * 100)}%"></i></div><small>${Math.min(state.current, state.goal)}/${state.goal} ${baseMetricLabel(project.metric)}</small>${built ? '<button class="secondary" disabled>GEBAUT ✓</button>' : state.ready ? `<button class="primary" data-base-project="${project.id}">JETZT BAUEN ↗</button>` : '<button class="secondary" disabled>NOCH NICHT BEREIT</button>'}</article>`; }).join("")}</div><h3>Deine Garnison</h3>${baseProjectBuilt(learningProgress, "training") ? (() => { const garrison = headquartersGarrison(); return garrison.length ? `<div class="hq-garrison">${garrison.map(({ card, mastery: points }) => `<article data-mastery="${masteryRank(points).frame}"><div>${unitSvg(card.id)}</div><b>${card.name}</b><small>${masteryLabel(mastery, card.id)}</small></article>`).join("")}</div><p class="hq-garrison-note">Deine meistgenutzten Einheiten trainieren hier. Die Anzeige folgt deiner Mastery und verändert keine Kampfwerte.</p>` : '<div class="hq-garrison-empty"><b>TRAININGSPLATZ BEREIT</b><p>Setze Einheiten in Gefechten häufiger ein. Sobald sie Mastery sammeln, erscheinen sie hier.</p></div>'; })() : '<div class="hq-garrison-empty locked"><b>GARNISON NOCH GESPERRT</b><p>Baue zuerst den Trainingsplatz. Danach ziehen deine gemeisterten Einheiten sichtbar in die Basis ein.</p></div>'}<h3>Ehrenhof</h3>${baseProjectBuilt(learningProgress, "honor") ? (() => { const honors = baseHonors(campaignProgress, dailyHistory, mastery); return `<div class="hq-honors">${honors.map((honor, index) => `<article class="${honor.unlocked ? "unlocked" : "locked"}"><span>${honor.unlocked ? "◆" : String(index + 1).padStart(2, "0")}</span><div><b>${honor.name}</b><p>${honor.detail}</p><small>${honor.current}/${honor.goal}</small></div></article>`).join("")}</div><p class="hq-honor-note">${honors.filter((honor) => honor.unlocked).length}/${honors.length} Auszeichnungen freigeschaltet. Trophäen sind rein kosmetisch.</p>`; })() : '<div class="hq-garrison-empty locked"><b>EHRENHOF NOCH NICHT GEBAUT</b><p>Errichte zuerst den Ehrenhof. Danach werden große Feldzug-, Tagesfront- und Mastery-Erfolge hier dauerhaft sichtbar.</p></div>'}<h3>Deine Gestaltung</h3><div class="hq-styles">${(Object.keys(BASE_STYLES) as BaseStyle[]).map((id) => `<button data-base-style="${id}" class="${id === learningProgress.style ? "selected" : ""}" ${styleUnlocked(id, learningProgress, wins, supporterOwned) ? "" : "disabled"}><i style="background:${BASE_STYLES[id].color}"></i><b>${BASE_STYLES[id].name}</b><small>${styleUnlocked(id, learningProgress, wins, supporterOwned) ? (id === learningProgress.style ? "AUSGERÜSTET" : "AUSRÜSTEN") : BASE_STYLES[id].requirement}</small></button>`).join("")}</div><button id="hq-store" class="primary">KOMMANDOGOLD ANSEHEN</button><button id="hq-close" class="secondary">Zur Basis</button>`,
  );
  el("modal-content")
    .querySelectorAll<HTMLButtonElement>("[data-base-project]")
    .forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.baseProject as BaseProjectId;
        const project = BASE_PROJECTS.find((item) => item.id === id);
        if (!project) return;
        const next = buildBaseProject(learningProgress, id, headquartersMetrics());
        if (next === learningProgress) return;
        learningProgress = next;
        const saved = saveLearning(learningProgress);
        updateHeadquarters();
        openHeadquarters();
        el("modal-content")
          .querySelector<HTMLElement>(`[data-base-project-card="${id}"]`)
          ?.classList.add("just-built");
        el("modal-content")
          .querySelector<HTMLElement>(".hq-art")
          ?.classList.add("build-flash");
        showToast(
          saved
            ? `${project.name} gebaut. Deine Basis hat sich verändert.`
            : `${project.name} für diese Sitzung gebaut.`,
        );
      };
    });
  el("modal-content")
    .querySelectorAll<HTMLButtonElement>("[data-base-style]")
    .forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.baseStyle as BaseStyle;
        if (!styleUnlocked(id, learningProgress, wins, supporterOwned)) return;
        learningProgress.style = id;
        const saved = saveLearning(learningProgress);
        updateHeadquarters();
        openHeadquarters();
        if (!saved) showToast("Gestaltung nur für diese Sitzung übernommen.");
      };
    });
  el("hq-store").onclick = () => {
    showModal("");
    renderStore(el("modal-content"), stage, openHeadquarters, () => {
      if (!supporterOwned) return;
      learningProgress.style = "supporter";
      saveLearning(learningProgress);
      updateHeadquarters();
      openHeadquarters();
    });
    el("store-close").focus({ preventScroll: true });
  };
  el("hq-close").onclick = () => {
    el("modal").hidden = true;
    el("headquarters").focus();
  };
}
function openLearning() {
  if (active) return;
  showModal(
    `<div class="eyebrow">FELDAUSBILDUNG</div><h2>Lernen. Kämpfen. Behalten.</h2><p>Erfülle diese Aufträge in beliebigen Gefechten. Sie zeigen dir die Grundlagen und bleiben nach Matchende gespeichert – auch bei einer Niederlage. Verlassene Gefechte zählen nicht.</p><div class="lesson-list">${LESSONS.map((lesson, index) => `<article class="${learningProgress.counts[lesson.id] >= lesson.goal ? "complete" : ""}"><b>${learningProgress.counts[lesson.id] >= lesson.goal ? "✓" : String(index + 1).padStart(2, "0")}</b><div><h3>${lesson.name}</h3><p>${lesson.tip}</p><small>${learningProgress.counts[lesson.id]}/${lesson.goal}</small></div></article>`).join("")}</div><div class="learning-reward"><b>DEINE BELOHNUNG: AURORA</b><p>Eine eisblaue Gestaltung für Hauptquartier und Einsatzbasis. Alle vier Aufträge abschließen und unter Hauptquartier ausrüsten.</p></div><button id="learning-play" class="primary">${completedLessons(learningProgress) === LESSONS.length ? "BELOHNUNG ANSEHEN" : "IM BRÜCKENKOPF ÜBEN"} ↗</button><button id="learning-close" class="secondary">Zur Basis</button>`,
  );
  el("learning-play").onclick = () => {
    if (completedLessons(learningProgress) === LESSONS.length)
      openHeadquarters();
    else start(false, MISSIONS[0]);
  };
  el("learning-close").onclick = () => {
    el("modal").hidden = true;
    el("learning").focus();
  };
}
el("save-backup").onclick = () => {
  if (active) return;
  showModal("");
  renderBackupMenu(el("modal-content"), () => { el("modal").hidden = true; el("save-backup").focus(); });
  el("backup-export").focus({ preventScroll: true });
};
el("headquarters").onclick = openHeadquarters;
el("learning").onclick = openLearning;
function renderCommander(id: CommanderId) {
  const definition = COMMANDERS[id];
  el("commander-name").innerHTML =
    `${definition.name} <span>${definition.ability}</span>`;
  el("commander").querySelector(".commander-icon")!.textContent =
    definition.icon;
  el("commander").setAttribute(
    "aria-label",
    `${definition.name}: ${definition.description}`,
  );
  el("commander").title =
    `${definition.description} ${definition.cooldown}s Abklingzeit.`;
  el("hero-portrait").innerHTML = commanderSvg(id);
  el("commander-preview-art").innerHTML = commanderSvg(id);
  el("commander-preview-name").textContent = definition.name;
  el("commander-preview-skill").textContent =
    `${definition.ability} · ${definition.cooldown}s`;
  el("notes-commander").textContent = `${definition.name} ${definition.icon}`;
  el("notes-ability").textContent = definition.description;
}
el("choose-commander").onclick = () => {
  if (active) return;
  showModal(
    `<div class="eyebrow">DEIN KOMMANDO</div><h2>Schutz. Heilung. Angriff.</h2><p>Die Fähigkeit kostet keine Energie. Im freien Gefecht erhält der Bot denselben Kommandanten. Kampagneneinsätze können ein festes Gegnerkommando haben; die Kampfwerte bleiben gleich. Eine laufende Einsatzserie behält ihre bisherige Wahl.</p><div class="commander-roster">${(
      Object.keys(COMMANDERS) as CommanderId[]
    )
      .map((id) => {
        const c = COMMANDERS[id];
        return `<article class="commander-option ${commanderId === id ? "selected" : ""}"><div class="commander-portrait">${commanderSvg(id)}</div><div><small>${c.role}</small><h3>${c.name}</h3><b>${c.ability}</b><p>${c.description}</p><small>${c.cooldown} SEKUNDEN ABKLINGZEIT</small><button data-commander="${id}" class="${commanderId === id ? "secondary" : "primary"}">${commanderId === id ? "AUSGEWÄHLT" : "KOMMANDO ÜBERNEHMEN"}</button></div></article>`;
      })
      .join(
        "",
      )}</div><button id="commander-close" class="secondary">Zur Basis</button>`,
  );
  el("modal-content")
    .querySelectorAll<HTMLButtonElement>("[data-commander]")
    .forEach((button) => {
      button.onclick = () => {
        commanderId = button.dataset.commander as CommanderId;
        const saved = saveCommander(commanderId);
        lobby();
        el("choose-commander").focus();
        if (!saved) showToast("Kommandant für diese Sitzung übernommen.");
      };
    });
  el("commander-close").onclick = () => {
    el("modal").hidden = true;
    el("choose-commander").focus();
  };
};
renderCommander(commanderId);
function openDraft() {
  if (active) return;
  showModal("");
  renderDraft(
    el("modal-content"),
    (picked) => start(false, null, false, picked),
    () => {
      el("modal").hidden = true;
      el("draft").focus();
    },
  );
}
el("draft").onclick = openDraft;
el("series").onclick = openSeries;
el("start").onclick = () => start();
el("lobby-help").onclick = () => help();
el("help").onclick = () => help();
el("pause").onclick = pause;
el("commander").onclick = commander;
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLSelectElement || e.repeat) return;
  if (e.key === "Escape") {
    if (!active && !el("modal").hidden) {
      document
        .querySelector<HTMLButtonElement>(
          "#deck-cancel, #history-close, #help-close, #campaign-close, #series-close, #daily-close, #commander-close, #hq-close, #store-close, #backup-close, #learning-close, #draft-close",
        )
        ?.click();
      return;
    }
    if (!el("modal").hidden && active && !ended) resume();
    else pause();
    return;
  }
  if (!el("modal").hidden) return;
  if (e.key.toLowerCase() === "q") commander();
  const index = Number(e.key) - 1;
  if (index >= 0 && index < deckCards.length) selectCard(deckCards[index].id);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && active && !ended) pause();
});
watchAppState(isActive => { if (!isActive && active && !ended) pause(); });
const scene = new ArenaScene({
  theme: () => arenaTheme,
  match: () => match,
  running: matchLive,
  selected: () => selected,
  deploy,
  tick: () => updateHud(),
});
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "arena",
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  backgroundColor: "#101e21",
  transparent: false,
  antialias: true,
  roundPixels: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: "low-power" },
  fps: { target: 30, limit: 30, forceSetTimeOut: false },
  scene: [scene],
  banner: false,
});
updateRecord();
updateCampaignProgress();
updateDaily();
updateSound();
updateSelection();
updateHud(true);

initializeStore(updateHeadquarters);
