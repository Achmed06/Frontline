import { renderBaseBuilder } from "./base-builder";
import { baseMapSvg } from "./base-map";
import { renderBackupMenu } from "./save-backup-menu";
import { selectedCardHint } from "./card-hints";
import { energyReadiness, energySpent, energyTempo } from "./energy-feedback";
import { corePressure, corePressureLabel } from "./core-pressure";
import { initializeStore, renderStore, supporterOwned } from "./store";
import { watchAppState } from "./mobile";
import { haptics } from "./haptics";
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
  BASE_PROJECTS,
  baseProjectBuilt,
  baseProjectProgress,
  type BaseProjectId,
  type BaseProjectMetrics,
  type BaseStyle,
} from "./headquarters";
import { readLearning, saveLearning } from "./storage";
import { battleCoachHint, type BattleCoachFocus } from "./battle-coach";
import { baseHonors } from "./honors";
import {
  COMMANDERS,
  commanderActiveSeconds,
  commanderCooldownProgress,
  commanderHasValidTarget,
  commanderOutcomeText,
  commanderStatusText,
  type CommanderId,
} from "./commanders";
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
  ENERGY_RATE,
  TRAINING_CONTROL,
  type CardId,
} from "./engine";
import { ArenaScene } from "./scene";
import { unitSvg, commanderSvg } from "./art";
import { Sound } from "./audio";
import { matchViewportProfile } from "./mobile-match-layout";
import { readStats, saveStats, setting, readDeck, saveDeck } from "./storage";
import {
  createMatchRecord,
  readHistory,
  saveHistory,
  HISTORY_LIMIT,
  type MatchFeedback,
} from "./storage";
import { resultComparison, renderMatchHistory } from "./match-report";
import { matchStartVisual, type MatchStartVisual } from "./match-start-visual";
import { resultDecision, resultSnapshot } from "./result-debrief";
import { quickPlayResultMomentum, resultMomentum, resultReplayLabel } from "./result-loop";
import { nextBattleProgress } from "./battle-progress";
import { rewardReveal } from "./reward-reveal";
import { dailyPreparation, seriesPreparation } from "./mode-preparation";
import { missionBriefingSnapshot } from "./mission-briefing";
import { commanderBriefing } from "./commander-briefing";
import { lobbyCommandStatus } from "./lobby-command-status";
import { privacyPolicyUrl } from "./release-links";
import { featuredEvent, lobbySectionLabel, type LobbySection } from "./focused-lobby";
import { firstMatchUnlock, firstSessionFocus } from "./first-session";
import { firstBattleOpeningCard } from "./first-battle-opening";
import { matchStartTiming } from "./match-start-timing";
import { quickPlayRotation } from "./quick-play-rotation";
import { quickPlayBaseline, quickPlaySessionCue } from "./quick-play-session";
import { frontRace } from "./front-race";
import { timeLimitOutlook } from "./time-limit-outlook";
import { coreAssault } from "./core-assault";
import { battleMomentum, INITIAL_BATTLE_MOMENTUM, type BattleMomentumMemory } from "./battle-momentum";
import {
  frontSurge,
  INITIAL_FRONT_SURGE,
  type FrontSurgeMemory,
} from "./front-surge";
import { boardPointFromClient, dragThresholdReached } from "./card-drag";
import { MATCH_END_SEQUENCE_MS, matchEndVisual } from "./match-end-visual";
import { matchRenderProfile } from "./match-render-profile";
import { renderDeckBuilder } from "./deck-builder";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const privacyUrl = privacyPolicyUrl(import.meta.env.VITE_PRIVACY_URL);
app.innerHTML = `
  <aside class="editorial">
    <a class="brand" href="./" aria-label="Frontline Start"><span class="brand-mark">F<span>∕</span></span> FRONTLINE<span class="brand-dot"></span></a>
    <div class="editorial-main"><div class="eyebrow"><span></span> TACTICAL TERRITORY BATTLES</div><h1>Boden<br>ist <em>Macht.</em></h1><p>Jeder Punkt verschiebt die Front.<br>Jede Entscheidung das Match.</p><div class="edition"><span>01</span><div>THE FIRST FRONT<br><small>SPIELBARER PROTOTYP</small></div></div></div>
    <div class="desktop-footer">PROJECT FRONTLINE <span>EST. 2026</span></div>
  </aside>
  <main class="device" aria-label="Project Frontline Spiel">
    <header class="game-top"><div class="mini-brand">F<span>∕</span></div><div><b>FRONTLINE</b><small id="mode-label">EINSATZBASIS</small></div><div class="top-actions"><button id="sound" class="icon-btn" aria-label="Ton einschalten" title="Ton umschalten">♪</button><button id="help" class="icon-btn" aria-label="Spielanleitung">?</button><button id="pause" class="icon-btn" aria-label="Spiel pausieren" disabled>Ⅱ</button></div></header>
    <section class="match-hud" aria-label="Matchstatus"><div id="player-core-info" class="core-info" data-core-state="stable" data-core-status=""><span><i class="team-dot player"></i> DEIN CORE</span><strong id="player-hp">100%</strong><div class="health-track"><i id="player-health"></i></div></div><div class="clock"><strong id="timer">3:00</strong><span id="phase-label">TRAINING</span><div id="time-limit-outlook" class="time-limit-outlook" data-leader="draw" hidden><b id="time-limit-label">GLEICHSTAND</b><small id="time-limit-detail">CORE · GEBIET GLEICH</small></div></div><div id="enemy-core-info" class="core-info enemy" data-core-state="stable" data-core-status=""><span><span class="enemy-command"><b id="enemy-commander-label">BOT</b><small id="enemy-commander-status">BEREIT</small><i id="enemy-commander-cooldown-progress" aria-hidden="true"></i></span><i class="team-dot enemy"></i></span><strong id="enemy-hp">100%</strong><div class="health-track"><i id="enemy-health"></i></div></div></section>
    <div id="control-hud" class="control-hud" hidden><b id="control-label"></b><div><span id="control-player"></span><span id="control-enemy"></span></div><div class="control-tracks"><i id="control-player-bar"></i><i id="control-enemy-bar"></i></div></div><div class="arena-wrap"><div id="arena" role="application" aria-label="Arena. Karte auswählen, im grünen Gebiet halten, zielen und loslassen."></div><div id="deployment-countdown" class="deployment-countdown" hidden aria-live="assertive"></div><div id="battle-banner" class="battle-banner" hidden role="status" aria-live="polite"><small id="battle-banner-label"></small><b id="battle-banner-title"></b></div><div id="learning-hud" class="learning-hud" hidden></div><div id="arena-tip" class="arena-tip">EROBERE DIE MITTE</div><div id="toast" class="toast" role="status" aria-live="polite"></div></div><div id="card-drag-ghost" class="card-drag-ghost" hidden aria-hidden="true"></div>
    <section class="command-deck" aria-label="Karten und Fähigkeiten"><div id="resource-row" class="resource-row"><div class="energy-caption"><span class="energy-symbol">ϟ</span><strong id="energy">6</strong><span id="energy-spend" class="energy-spend" aria-hidden="true"></span><span>/ 10</span></div><div class="energy-track"><i id="energy-fill"></i></div><span id="territory-count" class="territory-count" data-front-state="even" aria-label="Front ausgeglichen 3 zu 3. 3 neutrale Zonen."><span class="territory-score"><b id="territory-player">3</b><i>FRONT</i><b id="territory-enemy">3</b></span><span id="territory-segments" class="territory-segments" aria-hidden="true">${Array.from({length:9},()=>"<i data-owner=\"neutral\"></i>").join("")}</span></span></div><div class="selection-info"><b id="selected-name">DEIN EINSATZDECK</b><span id="selected-hint">ANTIPPEN ODER DIREKT INS FELD ZIEHEN</span></div><div id="cards" class="cards"></div><button id="commander" class="commander-btn" disabled><i id="commander-cooldown-progress" aria-hidden="true"></i><span class="commander-icon">◇</span><b id="commander-name">ATLAS <span>AEGIS-SCHILD</span></b><span id="commander-status">BEREIT</span><kbd>Q</kbd></button></section>
    <div id="lobby" class="overlay lobby base-lobby"><div class="lobby-scroll base-scroll">
      <div class="base-status"><span><i></i> FRONTLINE</span><b id="base-stars">0 ★</b></div>
      <nav id="main-loop-nav" class="main-loop-nav" aria-label="Hauptbereiche">
        <button id="lobby-tab-play" data-lobby-section="play" class="active" aria-pressed="true"><b>SPIELEN</b><small>3 MIN</small></button>
        <button id="lobby-tab-event" data-lobby-section="event" aria-pressed="false"><b>EVENT</b><small id="event-nav-label">HEUTE</small></button>
        <button id="lobby-tab-base" data-lobby-section="base" aria-pressed="false"><b>BASIS</b><small>LOADOUT</small></button>
      </nav>
      <section id="lobby-panel-play" class="lobby-panel play-panel">
        <section class="play-now-hero">
          <div class="play-now-grid" aria-hidden="true"></div>
          <div id="play-now-kicker" class="play-now-kicker">SCHNELLGEFECHT · GEGEN BOT</div>
          <h2 id="play-now-title">3 MINUTEN.<br><em>EINE FRONT.</em></h2>
          <p id="play-now-copy">Dein Deck. Dein Commander. Sofort ins Gefecht.</p>
          <div class="play-now-meta"><span id="quick-play-difficulty">TAKTIKER</span><span>CORE-ANGRIFF</span><span id="quick-play-arena">SMARAGDKÜSTE</span><span id="quick-play-streak" class="quick-play-streak" hidden>SERIE ×2</span><span>3:00</span></div>
          <section id="play-progress" class="play-progress" aria-label="Nächster Fortschritt">
            <div><small id="play-progress-kicker">NÄCHSTER FORTSCHRITT</small><b id="play-progress-title">Feldausbildung</b><span id="play-progress-detail"></span></div>
            <div class="play-progress-side"><strong id="play-progress-count">0/1</strong><em id="play-progress-reward"></em></div>
            <div class="play-progress-track"><i id="play-progress-fill"></i></div>
          </section>
          <button id="quick-play" class="primary play-now-button">JETZT SPIELEN <span>↗</span></button>
        </section>
        <div id="play-secondary-title" class="play-secondary-title"><span>MEHR SPIELEN</span><small>SOLO ODER MIT FREUND</small></div>
        <section id="campaign-quick-card" class="operation-hero compact-operation">
          <div class="hero-grid" aria-hidden="true"></div><div id="hero-portrait" class="hero-portrait" aria-hidden="true">${commanderSvg()}</div>
          <div class="hero-copy"><span id="next-chapter" class="hero-kicker"></span><h2>FELDZUG</h2><p id="next-mission-name"></p><span id="next-mission-type" class="hero-mode"></span></div>
          <div class="hero-bottom"><p id="next-mission-hint"></p><button id="continue-campaign" class="primary">WEITER IM FELDZUG <span>↗</span></button></div>
        </section>
        <div id="play-secondary-actions" class="play-secondary-actions"><button id="campaign" class="base-mode"><span class="mode-symbol">◈</span><span><b>ALLE MISSIONEN</b><small id="campaign-progress"></small></span><span>↗</span></button><a class="duel-launch primary" href="./duel.html">FREUNDESDUELL ↗ <small>Privater Raumcode</small></a></div>
        <details id="advanced-battle" class="quick-battle"><summary><span>GEFECHT ANPASSEN <small>STÄRKE · MODUS · ARENA</small></span><span>＋</span></summary><div class="training-control"><label for="difficulty">Gegnerstärke</label><select id="difficulty"><option value="rookie">Rekrut</option><option value="standard">Taktiker</option><option value="veteran">Veteran</option></select></div><div class="training-control"><label for="training-mode">Spielmodus</label><select id="training-mode"><option value="core">Core-Angriff</option><option value="control">Signalkrieg</option></select></div><div class="training-control"><label for="arena-theme">Schauplatz</label><select id="arena-theme">${Object.entries(ARENA_THEMES).map(([id, theme]) => `<option value="${id}">${theme.name}</option>`).join("")}</select></div><button id="start" class="primary">ANGEPASSTES GEFECHT STARTEN <span>↗</span></button></details>
      </section>
      <section id="lobby-panel-event" class="lobby-panel event-panel" hidden>
        <section id="featured-event" class="featured-event" data-accent="mint">
          <small id="featured-event-eyebrow">EVENT DES TAGES</small>
          <h2 id="featured-event-title">TAGESFRONT</h2>
          <p id="featured-event-hook">Eine feste Front. Heute zählt dein bester Lauf.</p>
          <div id="featured-event-status" class="featured-event-status">HEUTE AKTIV</div>
          <button id="featured-event-play" class="primary">EVENT SPIELEN <span>↗</span></button>
        </section>
        <details class="event-library"><summary><span>ANDERE EVENTS <small>BLEIBEN VERFÜGBAR</small></span><span>＋</span></summary>
          <div class="event-library-grid">
            <button id="daily" class="daily-launch"><span><small>TAGESFRONT</small><b id="daily-title">WIRD GELADEN</b><small id="daily-status"></small></span><span>↗</span></button>
            <button id="series" class="base-mode series-mode"><span class="mode-symbol">⋔</span><span><b>EINSATZSERIE</b><small id="series-preview">Ein Deck. Drei Siege.</small></span><span>↗</span></button>
            <button id="draft" class="base-mode draft-launch"><span class="mode-symbol">▱</span><span><b>DRAFT</b><small>8 Picks. Ein frisches Deck.</small></span><span>↗</span></button>
          </div>
        </details>
      </section>
      <section id="lobby-panel-base" class="lobby-panel base-panel" hidden>
        <nav class="command-status" aria-label="Fortschrittsstatus" hidden><button id="status-campaign" data-status="campaign"><small>FELDZUG</small><b id="status-campaign-value">0/0</b><span id="status-campaign-detail">0 ★</span></button><button id="status-headquarters" data-status="headquarters"><small>HQ</small><b id="status-headquarters-value">BASIS</b><span id="status-headquarters-detail">0/0 Ausbildung</span></button><button id="status-daily" data-status="daily"><small>HEUTE</small><b id="status-daily-value">OFFEN</b><span id="status-daily-detail">Tagesfront</span></button></nav>
        <button id="headquarters" class="hq-launch"><span id="hq-mini-art" aria-hidden="true"></span><span><small>DEIN HAUPTQUARTIER</small><b id="hq-name"></b><small id="hq-next"></small><span class="hq-progress-track"><i id="hq-progress-fill"></i></span></span><span class="hq-open">BASIS ANSEHEN ↗</span></button>
        <button id="choose-commander" class="commander-launch"><span id="commander-preview-art" aria-hidden="true"></span><span><small>DEIN KOMMANDANT</small><b id="commander-preview-name">ATLAS</b><small id="commander-preview-skill">AEGIS-SCHILD</small></span><span>WECHSELN ↗</span></button>
        <button id="edit-deck" class="base-deck"><span class="base-section-title"><b>DEIN EINSATZDECK</b><span>ANPASSEN ↗</span></span><span id="deck-portraits" class="deck-portraits" aria-hidden="true"></span><small id="deck-preview"></small></button>
        <button id="learning" class="learning-launch"><span><small id="learning-count"></small><b id="learning-next"></b><small>AURORA-GESTALTUNG FREISPIELEN</small></span><span>↗</span></button>
        <div class="base-section-title"><span>FORTSCHRITT</span><span id="base-completed"></span></div>
        <div id="chapter-track" class="chapter-track" aria-label="Kapitel-Fortschritt"></div>
        <div class="lobby-links"><button id="lobby-help" class="text-btn">Feldhandbuch →</button><button id="history" class="text-btn">Gefechtsverlauf →</button></div><div class="lobby-legal"><button id="save-backup" class="text-btn">Spielstand sichern / übertragen →</button>${privacyUrl ? `<a class="text-btn privacy-link" href="${privacyUrl}" target="_blank" rel="noopener noreferrer">Datenschutz →</a>` : ""}</div><div class="base-footer">DEIN LOADOUT · DEINE BASIS · DEIN FORTSCHRITT</div>
      </section>
    </div></div>
    <div id="modal" class="overlay modal" hidden role="dialog" aria-modal="true" aria-label="Spielmenü"><div id="modal-content" class="modal-content"></div></div>
  </main>
  <aside class="field-notes"><div class="notes-tag">DEIN ERSTER EINSATZ</div><h2>Eine Front.<br>Dein Plan.</h2><ol><li><span>01</span><div><b>Truppe wählen</b><p>Sechs aus ${CARDS.filter((card) => card.kind === "unit").length} Einheiten wählen. Jede mit einer eigenen Rolle.</p></div></li><li><span>02</span><div><b>Boden erobern</b><p>Einheiten im grünen Gebiet einsetzen. Kontrollpunkte erweitern deine Front.</p></div></li><li><span>03</span><div><b>Core durchbrechen</b><p>Schütze deinen Core und erreiche den gegnerischen.</p></div></li></ol><div class="commander-note"><span>DEIN COMMANDER</span><b id="notes-commander">ATLAS <i>◇</i></b><p id="notes-ability">Aegis schützt deine Truppen für den entscheidenden Vorstoß.</p></div><div class="keyboard-note"><span>AUCH MIT TASTATUR</span><p><kbd>1</kbd>–<kbd>8</kbd> Karten &nbsp; <kbd>Q</kbd> Fähigkeit<br><kbd>Esc</kbd> Pause</p></div><div id="local-record" class="local-record"></div></aside>
`;
const device = document.querySelector<HTMLElement>(".device")!;
function syncMatchViewportProfile(): void {
  const viewport = window.visualViewport;
  const profile = matchViewportProfile(
    viewport?.width ?? window.innerWidth,
    viewport?.height ?? window.innerHeight,
  );
  device.dataset.matchLayout = profile.density;
  device.dataset.matchWidth = profile.narrow ? "narrow" : "regular";
}
syncMatchViewportProfile();
window.addEventListener("resize", syncMatchViewportProfile, { passive: true });
window.visualViewport?.addEventListener(
  "resize",
  syncMatchViewportProfile,
  { passive: true },
);
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

let lobbySection: LobbySection = "play";
function setLobbySection(section: LobbySection, moveFocus = false): void {
  lobbySection = section;
  for (const key of ["play", "event", "base"] as const) {
    const activeSection = key === section;
    el(`lobby-panel-${key}`).hidden = !activeSection;
    const button = el<HTMLButtonElement>(`lobby-tab-${key}`);
    button.classList.toggle("active", activeSection);
    button.setAttribute("aria-pressed", String(activeSection));
  }
  if (!active) el("mode-label").textContent = lobbySectionLabel(section);
  if (moveFocus) el<HTMLButtonElement>(`lobby-tab-${section}`).focus();
}

function updateFeaturedEvent(): void {
  const event = featuredEvent(new Date());
  const card = el<HTMLElement>("featured-event");
  card.dataset.accent = event.accent;
  el("featured-event-eyebrow").textContent = event.eyebrow;
  el("featured-event-title").textContent = event.title;
  el("featured-event-hook").textContent = event.hook;
  el("featured-event-play").textContent = `${event.cta} ↗`;
  el("event-nav-label").textContent = event.title;

  if (event.id === "daily") {
    const challenge = dailyChallenge();
    const record = dailyRecord(dailyHistory, challenge.key);
    el("featured-event-title").textContent = challenge.title;
    el("featured-event-status").textContent = record?.completed
      ? "HEUTE GESICHERT · BESTWERT VERBESSERN"
      : record?.attempts
        ? `${record.attempts} VERSUCH${record.attempts === 1 ? "" : "E"} · NOCH OFFEN`
        : "NEUE FRONT · HEUTE";
  } else if (event.id === "series") {
    el("featured-event-status").textContent =
      seriesRun && !seriesEnded(seriesRun)
        ? `${seriesRun.wins}/3 SIEGE · ${Math.max(0, SERIES_LIVES - seriesRun.losses)} LEBEN`
        : "3 SIEGE · 2 LEBEN";
  } else {
    el("featured-event-status").textContent = "8 PICKS · FRISCHES DECK";
  }
}

for (const key of ["play", "event", "base"] as const)
  el<HTMLButtonElement>(`lobby-tab-${key}`).onclick = () =>
    setLobbySection(key, false);
const sound = new Sound();
sound.enabled = setting("sound") === "on";
const stats = readStats();
const quickPlayMigration = quickPlayBaseline(
  stats.matches,
  stats.quickPlayMatches,
);
if (quickPlayMigration.migrated) {
  stats.quickPlayMatches = quickPlayMigration.completedMatches;
  stats.quickPlayWinStreak = 0;
  delete stats.quickPlayLastOutcome;
  saveStats(stats);
}
const history = readHistory();

function updateFirstSessionFocus(): void {
  const focus = firstSessionFocus(stats.matches);
  el("lobby").dataset.sessionPhase = focus.phase;
  el<HTMLElement>("main-loop-nav").hidden = !focus.showMainNavigation;
  el<HTMLElement>("play-secondary-title").hidden = !focus.showSecondaryPlay;
  el<HTMLElement>("campaign-quick-card").hidden = !focus.showSecondaryPlay;
  el<HTMLElement>("play-secondary-actions").hidden = !focus.showSecondaryPlay;
  el<HTMLDetailsElement>("advanced-battle").hidden = !focus.showAdvancedBattle;
  const rotation = quickPlayRotation(stats.quickPlayMatches ?? 0);
  const session = quickPlaySessionCue(
    {
      completedMatches: stats.quickPlayMatches ?? 0,
      winStreak: stats.quickPlayWinStreak ?? 0,
      lastOutcome: stats.quickPlayLastOutcome ?? null,
    },
    rotation.arenaName,
    rotation.matchNumber,
  );
  const sessionActive = focus.phase === "full" && session.tone !== "neutral";
  el("play-now-kicker").textContent = sessionActive
    ? session.heroKicker
    : focus.kicker;
  el("play-now-copy").textContent = sessionActive
    ? session.heroCopy
    : focus.copy;
  el("play-now-title").innerHTML = sessionActive
    ? `${session.heroTitleTop}<br><em>${session.heroTitleBottom}</em>`
    : `${focus.title.split("\n")[0]}<br><em>${focus.title.split("\n")[1] ?? ""}</em>`;
  el("quick-play-difficulty").textContent = rotation.difficultyLabel;
  el("quick-play-arena").textContent = rotation.arenaName.toUpperCase();
  const streak = el<HTMLElement>("quick-play-streak");
  streak.hidden = !sessionActive || session.streak < 2;
  streak.textContent = `SERIE ×${session.streak}`;
  const hero = el<HTMLElement>("lobby-panel-play").querySelector<HTMLElement>(".play-now-hero");
  if (hero) {
    hero.dataset.arena = rotation.theme;
    hero.dataset.sessionTone = sessionActive ? session.tone : "neutral";
  }
  el("quick-play").innerHTML = `${sessionActive ? session.heroCta : focus.cta} <span>↗</span>`;
}

let campaignProgress = readCampaign();
let learningProgress = readLearning();
let mastery = readMastery();

function updateBattleProgress(): void {
  const cue = nextBattleProgress(learningProgress, mastery, deck);
  const panel = el<HTMLElement>("play-progress");
  panel.hidden = !cue;
  if (!cue) return;
  el("play-progress-kicker").textContent = cue.kicker;
  el("play-progress-title").textContent = cue.title;
  el("play-progress-detail").textContent = cue.detail;
  el("play-progress-count").textContent = `${cue.current}/${cue.goal}`;
  el("play-progress-reward").textContent = cue.reward;
  el<HTMLElement>("play-progress-fill").style.width =
    `${Math.round(Math.max(0, Math.min(1, cue.progress)) * 100)}%`;
  panel.dataset.kind = cue.kind;
}

let activeMission: Mission | null = null;
const savedArena = setting("arena-theme");
let arenaTheme: ArenaThemeId = isArenaTheme(savedArena) ? savedArena : "coast";
el<HTMLSelectElement>("arena-theme").value = arenaTheme;
let seriesRun = readSeries();
let dailyHistory = readDailyHistory();
let activeSeries = false;
let activeDraftDeck: CardId[] | null = null;
let activeDaily: DailyChallenge | null = null;
let activeQuickPlay = false;
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
  matchStartDurationMs = 3000,
  allowCountdownPreselect = false,
  pauseBeganAt = 0,
  startBannerShown = false,
  finishReadyAt = 0,
  lastCommanderReady = false,
  lastEnemyCommanderCooldown = 0,
  commanderReadyFlashUntil = 0,
  lastPointOwners: Array<"player" | "enemy" | null> = match.state.points.map(
    (point) => point.owner,
  );
const battleNotices = new Set<string>();
let battleMomentumMemory: BattleMomentumMemory = INITIAL_BATTLE_MOMENTUM;
let frontSurgeMemory: FrontSurgeMemory = INITIAL_FRONT_SURGE;
let lastFrontLeader: "player" | "enemy" | null = null;
let frontShiftTimer = 0;
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
const cardAffordable = new Map<string, boolean>();
let energySpendTimer = 0;
let energyWasCapped = false;
let energyCapFlashUntil = 0;
type CardDragState = {
  pointerId: number;
  cardId: CardId;
  startX: number;
  startY: number;
  active: boolean;
  previousSelected: CardId | null;
  button: HTMLButtonElement;
};
let cardDragState: CardDragState | null = null;

function dragBoardPoint(clientX: number, clientY: number) {
  const canvas = el("arena").querySelector<HTMLCanvasElement>("canvas");
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return boardPointFromClient(
    clientX,
    clientY,
    rect,
    BOARD_WIDTH,
    BOARD_HEIGHT,
  );
}

function showCardDrag(
  state: CardDragState,
  card: (typeof CARDS)[number],
  event: PointerEvent,
): void {
  if (!state.active) {
    if (
      !matchLive() ||
      !dragThresholdReached(
        state.startX,
        state.startY,
        event.clientX,
        event.clientY,
      )
    )
      return;
    state.active = true;
    state.button.classList.add("dragging");
    if (selected !== card.id) {
      selected = card.id;
      updateSelection();
      sound.play("select");
      haptics.play("select");
    }
    const ghost = el("card-drag-ghost");
    ghost.className = `card-drag-ghost ${card.kind}`;
    ghost.innerHTML = `<span>${card.cost}</span><i>${unitSvg(card.id)}</i><b>${card.name}</b>`;
    ghost.hidden = false;
  }

  event.preventDefault();
  const point = dragBoardPoint(event.clientX, event.clientY);
  const validation = point
    ? match.validatePlay("player", card.id, point.x, point.y)
    : null;
  const validTarget = Boolean(point && validation?.ok);
  const invalidTarget = Boolean(point && validation && !validation.ok);
  const ghost = el<HTMLElement>("card-drag-ghost");
  ghost.style.left = `${event.clientX}px`;
  ghost.style.top = `${event.clientY}px`;
  ghost.classList.toggle("over-arena", Boolean(point));
  ghost.classList.toggle("valid-target", validTarget);
  ghost.classList.toggle("invalid-target", invalidTarget);
  const arenaWrap = el("arena").parentElement;
  arenaWrap?.classList.toggle("card-drop-ready", validTarget);
  arenaWrap?.classList.toggle("card-drop-invalid", invalidTarget);
  el("arena-tip").textContent = !point
    ? "INS SPIELFELD ZIEHEN"
    : validTarget
      ? card.kind === "ability"
        ? "LOSLASSEN · FÄHIGKEIT AUSLÖSEN"
        : "LOSLASSEN · EINHEIT EINSETZEN"
      : validation?.message.toUpperCase() ?? "ZIEL NICHT VERFÜGBAR";
  el("arena-tip").classList.add("dragging-card");
  el("arena-tip").classList.toggle("drag-invalid", invalidTarget);
}

function finishCardDrag(event: PointerEvent, cancelled = false): void {
  const state = cardDragState;
  if (!state || state.pointerId !== event.pointerId) return;
  cardDragState = null;
  try {
    state.button.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }
  if (!state.active) return;

  state.button.dataset.dragConsumed = "1";
  window.setTimeout(() => delete state.button.dataset.dragConsumed, 0);
  state.button.classList.remove("dragging");
  el("card-drag-ghost").hidden = true;
  const arenaWrap = el("arena").parentElement;
  arenaWrap?.classList.remove("card-drop-ready", "card-drop-invalid");
  el("arena-tip").classList.remove("dragging-card", "drag-invalid");

  const point = cancelled ? null : dragBoardPoint(event.clientX, event.clientY);
  if (point && matchLive()) {
    deploy(point.x, point.y);
  } else {
    selected = state.previousSelected;
    updateSelection();
  }
}

function bindCardDrag(
  button: HTMLButtonElement,
  card: (typeof CARDS)[number],
): void {
  button.addEventListener("pointerdown", (event) => {
    if (
      cardDragState ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    cardDragState = {
      pointerId: event.pointerId,
      cardId: card.id,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      previousSelected: selected as CardId | null,
      button,
    };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    const state = cardDragState;
    if (!state || state.pointerId !== event.pointerId || state.cardId !== card.id)
      return;
    showCardDrag(state, card, event);
  });
  button.addEventListener("pointerup", (event) => finishCardDrag(event));
  button.addEventListener("pointercancel", (event) =>
    finishCardDrag(event, true),
  );
}
function renderCards(override?: readonly CardId[]) {
  cardButtons.clear();
  cardAffordable.clear();
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
    button.addEventListener("click", () => {
      if (button.dataset.dragConsumed === "1") return;
      selectCard(card.id);
    });
    bindCardDrag(button, card);
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
function showEnergySpend(spent: number) {
  if (spent <= 0) return;
  const spend = el("energy-spend");
  const track = el("energy-fill").parentElement;
  spend.textContent = `−${Math.round(spent * 10) / 10}`;
  spend.classList.remove("visible");
  track?.classList.remove("spent");
  void spend.offsetWidth;
  spend.classList.add("visible");
  track?.classList.add("spent");
  window.clearTimeout(energySpendTimer);
  energySpendTimer = window.setTimeout(() => {
    spend.classList.remove("visible");
    track?.classList.remove("spent");
  }, 720);
}
function sceneRunning(): boolean {
  return active && !paused && !ended && performance.now() >= matchReadyAt;
}
function matchLive(): boolean {
  return sceneRunning() && match.state.phase !== "ended" && finishReadyAt === 0;
}
function selectCard(id: string) {
  const preselecting =
    active &&
    !paused &&
    !ended &&
    allowCountdownPreselect &&
    performance.now() < matchReadyAt;
  if (!matchLive() && !preselecting) return;
  sound.unlock();
  const card = CARDS.find((c) => c.id === id)!;
  selected = selected === id ? null : id;
  updateSelection();
  sound.play("select");
  haptics.play("select");
  if (selected) {
    const readiness = energyReadiness(
      match.state.energy.player,
      card.cost,
    );
    if (!readiness.affordable)
      showToast(
        `Noch ${Math.ceil(readiness.missing)} Energie · bereit in ${energyWaitLabel(readiness.waitSeconds)}s.`,
      );
  }
}
function energyWaitLabel(seconds: number): string {
  const rounded = Math.max(0.1, Math.ceil(seconds * 10) / 10);
  return rounded.toFixed(1).replace(".", ",");
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
  const selectedHint = el("selected-hint");
  selectedHint.textContent = selectedCardHint(c);
  selectedHint.classList.remove("waiting-energy");
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
    haptics.play("error");
    return;
  }
  const playedCard = CARDS.find((card) => card.id === selected);
  const beforeEnergy = match.state.energy.player;
  const result = match.play("player", selected, x, y);
  if (!result.ok) {
    showToast(result.message, true);
    sound.play("error");
    haptics.play("error");
    return;
  }
  showEnergySpend(energySpent(beforeEnergy, match.state.energy.player));
  const playedAbility = playedCard?.kind === "ability";
  sound.play(playedAbility ? "ability" : "deploy");
  haptics.play(playedAbility ? "ability" : "deploy");
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
  quickPlay = false,
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
  activeQuickPlay =
    quickPlay && !mission && !daily && !inSeries && !draftDeck;
  const quickPlaySetup = activeQuickPlay
    ? quickPlayRotation(stats.quickPlayMatches ?? 0)
    : null;
  const chosenArena = el<HTMLSelectElement>("arena-theme").value;
  arenaTheme = daily
    ? daily.theme
    : mission
      ? CHAPTERS.reduce((current, chapter) => MISSIONS.findIndex(m => m.id === chapter.firstMission) <= MISSIONS.indexOf(mission) ? chapter.theme : current, "coast" as ArenaThemeId)
      : quickPlaySetup
        ? quickPlaySetup.theme
        : isArenaTheme(chosenArena) ? chosenArena : "coast";
  if (!mission && !daily && !activeQuickPlay) setting("arena-theme", arenaTheme);
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
      : quickPlaySetup
        ? quickPlaySetup.difficulty
        : (el<HTMLSelectElement>("difficulty").value as typeof difficulty);
  if (!draftDeck && !daily && !activeQuickPlay)
    setting("difficulty", difficulty);
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
          : activeQuickPlay
            ? undefined
            : el<HTMLSelectElement>("training-mode").value === "control"
              ? TRAINING_CONTROL
              : undefined,
  });
  lastPointOwners = match.state.points.map((point) => point.owner);
  renderCommander(match.commanders.player);
  el("enemy-commander-label").textContent =
    `BOT · ${COMMANDERS[match.commanders.enemy].name}`;
  el("enemy-commander-status").textContent = "BEREIT";
  active = true;
  paused = false;
  cardDragState = null;
  el("card-drag-ghost").hidden = true;
  el("arena").parentElement?.classList.remove(
    "card-drop-ready",
    "card-drop-invalid",
  );
  selected = firstBattleOpeningCard(
    stats.matches,
    match.decks.player,
    match.state.energy.player,
  );
  const startTiming = matchStartTiming(stats.matches);
  matchStartDurationMs = startTiming.countdownMs;
  allowCountdownPreselect = startTiming.allowPreselect;
  matchReadyAt = performance.now() + startTiming.countdownMs;
  matchGoUntil = matchReadyAt + startTiming.goMs;
  startBannerShown = false;
  ended = false;
  finishReadyAt = 0;
  lastCommanderReady = false;
  lastEnemyCommanderCooldown = 0;
  commanderReadyFlashUntil = 0;
  energyWasCapped = false;
  energyCapFlashUntil = 0;
  el("resource-row").classList.remove("energy-high", "energy-capped", "energy-cap-flash");
  el("cards").classList.remove("energy-cap-flash");
  lastCaptured = 0;
  battleNotices.clear();
  battleMomentumMemory = INITIAL_BATTLE_MOMENTUM;
  frontSurgeMemory = INITIAL_FRONT_SURGE;
  lastFrontLeader = null;
  window.clearTimeout(frontShiftTimer);
  el("territory-count").classList.remove("front-shift");
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
        : activeQuickPlay
          ? `SCHNELLGEFECHT · ${ARENA_THEMES[arenaTheme].name.toUpperCase()}`
          : `TRAINING · ${difficulty === "rookie" ? "REKRUT" : difficulty === "standard" ? "TAKTIKER" : "VETERAN"}`;
  sound.unlock();
  sound.play("start");
  updateSelection();
  updateHud(true);
}
function announceBattle(
  label: string,
  title: string,
  tone: "neutral" | "danger" | "opportunity" = "neutral",
  emphasis: "standard" | "surge" = "standard",
) {
  el("battle-banner-label").textContent = label;
  el("battle-banner-title").textContent = title;
  el("battle-banner").classList.toggle("danger", tone === "danger");
  el("battle-banner").classList.toggle("opportunity", tone === "opportunity");
  el("battle-banner").classList.toggle("surge", emphasis === "surge");
  el("battle-banner").hidden = false;
  bannerUntil = match.state.time + (emphasis === "surge" ? 2.9 : 2.5);
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
  activeQuickPlay = false;
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
  setLobbySection("play");
  updateFeaturedEvent();
  updateSelection();
  updateHud(true);
  updateRecord();
  updateCampaignProgress();
  updateDaily();
  updateBattleProgress();
  updateFirstSessionFocus();
  el("battle-banner").hidden = true;
  el("deployment-countdown").hidden = true;
  matchReadyAt = 0;
  matchGoUntil = 0;
  matchStartDurationMs = 3000;
  allowCountdownPreselect = false;
  pauseBeganAt = 0;
  startBannerShown = false;
  el("quick-play").focus();
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
    `<div class="eyebrow">FELDHANDBUCH / 01</div><h2>Boden ist Macht.</h2><div class="rules"><p><b>1 · Karte antippen</b>Jede Karte kostet Energie. Sie lädt automatisch auf, maximal bis 10.</p><p><b>2 · Im grünen Gebiet einsetzen</b>Halte die Arena gedrückt, korrigiere dein Ziel und lasse zum Einsetzen los. Außerhalb der Arena abbrechen. Rot bedeutet: Einsatz nicht möglich. Deine Einheiten kämpfen selbstständig und erobern Punkte. Verbundene Punkte verschieben deine Einsatzgrenze nach vorne. Gelb markierte Punkte sind umkämpft oder von deiner Basis abgeschnitten.</p><p><b>3 · Auf Rollen achten</b>Vanguard erobert, Bulwark hält Schaden aus. Ranger und Lancer treffen aus der Distanz. Swarm überwältigt, Medic heilt. Raider stößt schnell vor, Sentinel hält aus der Distanz dagegen. Mortar trifft Gruppen: Setze deine Truppen verteilt ein. Disruptor bremst Bewegungen, aber keine Angriffe; Fernkämpfer können weiter feuern.</p><p><b>4 · Den richtigen Moment nutzen</b>Wähle im Deckeditor zwei Fähigkeiten: Pulse trifft Gegner im Zielkreis, Rally heilt und beschleunigt deine Truppen. Stasis bremst getroffene Gegner vier Sekunden lang, Repulsor stößt sie vom Zielpunkt weg. Beide neuen Fähigkeiten verursachen keinen Schaden und brauchen Gegner im Zielgebiet. Wähle vor dem Match deinen Kommandanten: ATLAS gibt allen eigenen Truppen 70 Schild für 6 Sekunden. LYRA heilt bis zu 80 HP und entfernt Verlangsamung, aber repariert keinen Core. Die Fähigkeit kostet keine Energie; ATLAS lädt 30, LYRA 35 Sekunden. Der Bot nutzt dieselbe Kommandantenwahl.</p><p><b>5 · Core zerstören</b>Nach 3 Minuten zählt Core-Leben, dann Gebiet. Bei Gleichstand: 45 Sekunden Verlängerung. Danach ist auch ein Unentschieden möglich.</p><p><b>6 · Signalkrieg</b>Markierte Relais zählen, wenn sie dir gehören, mit deiner Basis verbunden und nicht umkämpft sind. Erreiche die angezeigte Kontrollzeit oder zerstöre den Core. Verlorene Kontrolle pausiert deinen Zähler. Nach 3 Minuten zählt Kontrollzeit, dann Core-Leben und Gebiet; keine Verlängerung.</p></div>${privacyUrl ? `<p class="help-privacy"><a href="${privacyUrl}" target="_blank" rel="noopener noreferrer">Datenschutzrichtlinie öffnen ↗</a></p>` : ""}<button id="help-close" class="primary">${restoreMenu ? "ZURÜCK" : wasPlaying ? "ZURÜCK INS GEFECHT" : "VERSTANDEN"} <span>→</span></button>`,
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
  const wasSeries = activeSeries;
  const wasDraft = activeDraftDeck !== null;
  const wasQuickPlay = activeQuickPlay;
  const daily = activeDaily;
  const previousMatches = stats.matches;
  stats.matches++;
  const unlockedMainLobby = firstMatchUnlock(previousMatches, stats.matches);
  if (won) stats.wins++;
  if (wasQuickPlay) {
    stats.quickPlayMatches = (stats.quickPlayMatches ?? 0) + 1;
    stats.quickPlayLastOutcome = match.state.winner ?? "draw";
    stats.quickPlayWinStreak = won
      ? (stats.quickPlayWinStreak ?? 0) + 1
      : 0;
  }
  saveStats(stats);
  updateRecord();
  sound.play(won ? "win" : draw ? "draw" : "lose");
  haptics.play(won ? "success" : draw ? "warning" : "error");
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
  const decision = resultDecision(match.state, match.controlObjective);
  const snapshot = resultSnapshot(match.state);
  const decisionResult =
    `<section class="result-decision" data-metric="${decision.metric}" aria-label="Matchentscheidung"><header><small>ENTSCHEIDUNG</small><b>${decision.title}</b><span>${decision.detail}</span></header><div class="result-decision-head"><span></span><b>DU</b><b>GEGNER</b></div>${decision.rows.map((row) => `<div class="result-decision-row ${row.decisive ? "decisive" : ""}"><span>${row.label}</span><strong>${row.player}</strong><strong>${row.enemy}</strong></div>`).join("")}</section>`;
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
  const oldLearningProgress = learningProgress;
  const previousLessonCount = completedLessons(oldLearningProgress);
  learningProgress = advanceLearning(learningProgress, match.state, report.id);
  const learningSaved = saveLearning(learningProgress);
  const learned = completedLessons(learningProgress) - previousLessonCount;
  const newBaseStage = baseStage(Object.keys(campaignProgress).length);
  const reveal = rewardReveal(
    oldLearningProgress,
    learningProgress,
    oldMastery,
    mastery,
    previousBaseStage,
    newBaseStage,
  );
  const revealResult = reveal
    ? `<section class="reward-reveal reward-${reveal.kind}"><div class="reward-reveal-badge">${reveal.cardId ? unitSvg(reveal.cardId) : `<span>${reveal.badge}</span>`}</div><div class="reward-reveal-copy"><small>${reveal.kicker}</small><b>${reveal.title}</b><p>${reveal.detail}</p>${reveal.extraCount > 0 ? `<em>+${reveal.extraCount} weiterer Fortschritt${reveal.extraCount === 1 ? "" : "e"}</em>` : ""}</div></section>`
    : "";
  const nextProgress = nextBattleProgress(
    learningProgress,
    mastery,
    match.decks.player,
  );
  const nextProgressResult = nextProgress
    ? `<section class="result-next-progress" data-kind="${nextProgress.kind}"><small>${nextProgress.kicker}</small><div><b>${nextProgress.title}</b><span>${nextProgress.current}/${nextProgress.goal} · ${nextProgress.reward}</span></div><div class="result-next-progress-track"><i style="width:${Math.round(Math.max(0, Math.min(1, nextProgress.progress)) * 100)}%"></i></div></section>`
    : "";
  const firstSessionResult = unlockedMainLobby
    ? `<section class="first-session-unlock"><small>FRONTLINE GEÖFFNET</small><b>EVENT + BASIS SIND JETZT DA</b><p>Du kennst den Kern. Ab jetzt kannst du Events spielen, dein Loadout ändern und deine Basis ausbauen.</p></section>`
    : "";
  const rewardResult = `<div class="learning-result"><b>${learned > 0 ? `${learned} LERNAUFTRAG${learned > 1 ? "E" : ""} ERFÜLLT` : "DEIN LERNPFAD"}</b><p>${completedLessons(learningProgress)}/${LESSONS.length} abgeschlossen${learned > 0 && completedLessons(learningProgress) === LESSONS.length ? " · Aurora-Gestaltung freigeschaltet! In deiner Basis ausrüsten." : " · Fortschritt bleibt auch bei Niederlagen erhalten."}</p>${newBaseStage > previousBaseStage ? `<p>HAUPTQUARTIER AUSGEBAUT: ${BASE_STAGES[newBaseStage].name}${previousBaseStage < 3 && newBaseStage >= 3 ? " · Glut-Gestaltung freigeschaltet!" : ""}</p>` : ""}${!learningSaved ? "<small>Lernfortschritt nur für diese Sitzung gespeichert.</small>" : ""}</div>`;
  updateHeadquarters();
  history.unshift(report);
  history.length = Math.min(history.length, HISTORY_LIMIT);
  const recorded = saveHistory(history);
  const momentum = wasQuickPlay
    ? quickPlayResultMomentum(
        report.outcome,
        stats.quickPlayWinStreak ?? 0,
      )
    : resultMomentum(history);
  const rematchLabel = wasDraft
    ? "NEUES DECK DRAFTEN"
    : wasSeries
      ? seriesEnded(seriesRun!)
        ? "SERIENÜBERSICHT"
        : "SERIE FORTSETZEN"
      : wasDaily
        ? "TAGESFRONT WIEDERHOLEN"
        : mission
          ? "EINSATZ WIEDERHOLEN"
          : resultReplayLabel(report.outcome, {
              quickPlay: wasQuickPlay,
              streak: wasQuickPlay
                ? stats.quickPlayWinStreak ?? 0
                : momentum.streak,
            });
  const nextAction = nextMission
    ? `<button id="next-mission" class="primary result-next-primary">NÄCHSTER EINSATZ <span>↗</span></button><button id="rematch" class="secondary">${rematchLabel} <span>↗</span></button>`
    : `<button id="rematch" class="primary result-next-primary">${rematchLabel} <span>↗</span></button>`;
  showModal(
    `<section class="result-hero outcome-${snapshot.outcome}"><div class="result-emblem ${won ? "won" : ""}">${won ? "↗" : draw ? "＝" : "◇"}</div><div class="result-hero-copy"><div class="eyebrow">EINSATZ ABGESCHLOSSEN</div><h2>${won ? "Front gesichert." : draw ? "Front gehalten." : "Neu formieren."}</h2><p>${match.state.reason}</p></div><div class="result-snapshot" aria-label="Endstand"><div class="player"><small>DEIN CORE</small><strong>${snapshot.playerCorePercent}%</strong><span>${snapshot.playerPoints}/9 GEBIETE</span></div><i aria-hidden="true">VS</i><div class="enemy"><small>GEGNER CORE</small><strong>${snapshot.enemyCorePercent}%</strong><span>${snapshot.enemyPoints}/9 GEBIETE</span></div></div></section><section class="result-momentum tone-${momentum.tone}"><small>${momentum.label}</small><div><strong>${momentum.streak >= 2 ? momentum.streak : won ? "↗" : draw ? "＝" : "↺"}</strong><span><b>${momentum.title}</b><em>${momentum.detail}</em></span></div></section>${revealResult}<section class="result-actions result-actions-fast" aria-label="Nächste Aktion">${nextAction}<button id="back" class="text-btn result-back">SPIELEN-MENÜ</button></section><section class="result-progress-stack" aria-label="Fortschritt und Belohnungen">${firstSessionResult}${missionResult}${seriesResult}${dailyResult}${rewardResult}${masteryResult}${nextProgressResult}</section><details class="result-report"><summary><span>GEFECHTSBERICHT</span><small>WERTUNG · KARTE · STATISTIKEN</small><b>＋</b></summary><div class="result-report-body">${decisionResult}${finalFrontMap()}<section class="result-performance" aria-label="Gefechtsleistung"><header><small>GEFECHTSLEISTUNG</small><span>DEINE AKTIONEN</span></header><div class="result-stats"><div><strong>${snapshot.captured}</strong><span>EROBERUNGEN</span></div><div><strong>${snapshot.deployed}</strong><span>EINSÄTZE</span></div><div><strong>${snapshot.kills}</strong><span>ABSCHÜSSE</span></div><div><strong>${snapshot.abilities}</strong><span>FÄHIGKEITEN</span></div></div></section>${resultComparison(report)}<div class="feedback"><span>Wie war das Match?</span><div><button data-feedback="again">Macht Lust auf mehr</button><button data-feedback="unclear">Noch unklar</button><button data-feedback="boring">Zu wenig Spannung</button></div><small id="feedback-note">${recorded ? "Ergebnis und Feedback bleiben auf diesem Gerät." : "Speicher nicht verfügbar: Verlauf nur für diese Sitzung."}</small></div></div></details>`,
  );
  if (reveal) {
    window.setTimeout(() => {
      const reward = el("modal-content").querySelector<HTMLElement>(".reward-reveal");
      if (!reward || el("modal").hidden) return;
      reward.classList.add("reveal-live");
      sound.play("unlock");
      haptics.play("reward");
    }, 560);
  }
  el("rematch").onclick = () => {
    if (wasDraft) {
      lobby();
      openDraft();
    } else if (wasSeries) {
      lobby();
      openSeries();
    } else if (daily) {
      start(true, null, false, null, daily);
    } else if (wasQuickPlay) {
      start(true, null, false, null, null, true);
    } else start(true, mission);
  };
  if (nextMission) el("next-mission").onclick = () => start(false, nextMission);
  el("back").onclick = lobby;
  updateBattleProgress();
  el<HTMLButtonElement>(nextMission ? "next-mission" : "rematch").focus({
    preventScroll: true,
  });
  el("modal-content").scrollTop = 0;
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

function currentMatchStartVisual(remainingMs: number): MatchStartVisual {
  const firstBattle = stats.matches === 0;
  const selectedCardName =
    firstBattle && selected
      ? CARDS.find((card) => card.id === selected)?.name ?? ""
      : "";
  const visual = matchStartVisual(
    remainingMs,
    COMMANDERS[match.commanders.player].name,
    COMMANDERS[match.commanders.enemy].name,
    Boolean(match.controlObjective),
    Boolean(activeDaily),
    matchStartDurationMs,
    firstBattle,
    selectedCardName,
  );
  if (firstBattle || !activeQuickPlay || visual.phase !== "cores") return visual;
  const rotation = quickPlayRotation(stats.quickPlayMatches ?? 0);
  const session = quickPlaySessionCue(
    {
      completedMatches: stats.quickPlayMatches ?? 0,
      winStreak: stats.quickPlayWinStreak ?? 0,
      lastOutcome: stats.quickPlayLastOutcome ?? null,
    },
    ARENA_THEMES[arenaTheme].name,
    rotation.matchNumber,
  );
  return {
    ...visual,
    kicker: session.startKicker,
    detail: session.startDetail,
  };
}

function renderMatchStartCountdown(
  countdown: HTMLElement,
  visual: MatchStartVisual,
): void {
  const key = [
    visual.phase,
    visual.count ?? "go",
    visual.kicker,
    visual.title,
    visual.detail,
  ].join("|");
  countdown.dataset.phase = visual.phase;
  countdown.style.setProperty("--start-progress", String(visual.progress));
  countdown.classList.toggle("go", visual.phase === "go");
  countdown.setAttribute(
    "aria-label",
    `${visual.kicker}. ${visual.title}. ${visual.detail}.`,
  );
  if (countdown.dataset.key === key) return;
  countdown.dataset.key = key;
  countdown.innerHTML =
    `<small>${visual.kicker}</small>` +
    `<b>${visual.count ?? "LOS"}</b>` +
    `<strong>${visual.title}</strong>` +
    `<span>${visual.detail}</span>` +
    '<div class="deployment-sync" aria-hidden="true"><i></i><i></i><i></i></div>';
}
function updateHud(force = false) {
  if (!force && (!active || paused || ended)) return;
  const now = performance.now();
  const live = matchLive();
  const countdown = el("deployment-countdown");
  if (active && !ended && now < matchReadyAt) {
    countdown.hidden = false;
    renderMatchStartCountdown(
      countdown,
      currentMatchStartVisual(matchReadyAt - now),
    );
  } else if (active && !ended && now < matchGoUntil) {
    countdown.hidden = false;
    renderMatchStartCountdown(
      countdown,
      currentMatchStartVisual(0),
    );
    if (!startBannerShown) {
      startBannerShown = true;
      const firstBattle = stats.matches === 0;
      const openingCard =
        firstBattle && selected
          ? CARDS.find((card) => card.id === selected)
          : undefined;
      announceBattle(
        firstBattle
          ? "ERSTER ZUG"
          : activeDaily
            ? "TAGESFRONT"
            : "DEIN AUFTRAG",
        firstBattle
          ? openingCard
            ? `${openingCard.name.toUpperCase()} IM GRÜNEN FELD EINSETZEN`
            : "TRUPPE IM GRÜNEN FELD EINSETZEN"
          : match.controlObjective
            ? "RELAIS SICHERN"
            : "FRONT DURCHBRECHEN",
      );
    }
  } else {
    countdown.hidden = true;
    countdown.classList.remove("go");
    delete countdown.dataset.phase;
    delete countdown.dataset.key;
  }
  if (!force && now - lastHud < 100) return;
  lastHud = now;
  const s = match.state;
  const coach = battleCoachHint(
    learningProgress,
    s,
    selected,
    match.commanders.player,
  );
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
    const playerCorePressure = corePressure(
      s.cores.player.hp,
      s.cores.player.maxHp,
    );
    const enemyCorePressure = corePressure(
      s.cores.enemy.hp,
      s.cores.enemy.maxHp,
    );
    const overtime = s.phase === "overtime";
    const lastPush = s.time >= MATCH_DURATION - 30;
    const notice =
      playerCorePressure.state === "critical" &&
      !battleNotices.has("playerCritical")
        ? "playerCritical"
        : enemyCorePressure.state === "critical" &&
            !battleNotices.has("enemyCritical")
          ? "enemyCritical"
          : overtime && !battleNotices.has("overtime")
            ? "overtime"
            : lastPush && !battleNotices.has("lastPush")
              ? "lastPush"
              : null;
    if (notice) {
      battleNotices.add(notice);
      if (notice === "playerCritical") {
        sound.play("warning");
        haptics.play("warning");
      } else if (notice === "enemyCritical") {
        sound.play("opportunity");
        haptics.play("ability");
      } else if (notice === "overtime") {
        sound.play("overtime");
      } else {
        sound.play("lastPush");
      }
      announceBattle(
        notice === "playerCritical"
          ? "DEIN CORE BRAUCHT SCHUTZ"
          : notice === "enemyCritical"
            ? "GEGNER-CORE KRITISCH"
            : notice === "overtime"
              ? "VERLÄNGERUNG"
              : "NOCH 30 SEKUNDEN",
        notice === "playerCritical"
          ? "CORE KRITISCH"
          : notice === "enemyCritical"
            ? "DURCHBRUCHSFENSTER"
            : notice === "overtime"
              ? "45 SEKUNDEN · CORE ODER SCHLUSSWERTUNG"
              : "JETZT ENTSCHEIDET’S",
        notice === "playerCritical" ? "danger" : notice === "enemyCritical" ? "opportunity" : "neutral",
      );
    }

    if (!notice && s.time >= bannerUntil) {
      const playerPoints = s.points.filter(
        (point) => point.owner === "player",
      ).length;
      const enemyPoints = s.points.filter(
        (point) => point.owner === "enemy",
      ).length;
      const momentum = battleMomentum(battleMomentumMemory, {
        time: s.time,
        playerPoints,
        enemyPoints,
      });
      battleMomentumMemory = momentum.memory;
      if (momentum.event) {
        if (momentum.event.tone === "danger") {
          sound.play("warning");
          haptics.play("warning");
        } else {
          sound.play("opportunity");
          haptics.play(
            momentum.event.id === "comeback" ? "success" : "capture",
          );
        }
        announceBattle(
          momentum.event.label,
          momentum.event.title,
          momentum.event.tone,
        );
      }
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
  el("timer").classList.toggle("overtime", s.phase === "overtime");
  const showTimeLimitOutlook =
    active &&
    live &&
    s.phase !== "ended" &&
    (remaining <= 30 || s.phase === "overtime");
  const outlookEl = el<HTMLElement>("time-limit-outlook");
  outlookEl.hidden = !showTimeLimitOutlook;
  el("phase-label").hidden = showTimeLimitOutlook;
  if (showTimeLimitOutlook) {
    const outlook = timeLimitOutlook(s, control);
    outlookEl.dataset.leader = outlook.leader;
    outlookEl.dataset.reason = outlook.reason;
    el("time-limit-label").textContent = outlook.label;
    el("time-limit-detail").textContent = outlook.detail;
    outlookEl.setAttribute(
      "aria-label",
      `Zeitlimit: ${outlook.label}. ${outlook.detail}`,
    );
  }
  for (const team of ["player", "enemy"] as const) {
    const pressure = corePressure(
      s.cores[team].hp,
      s.cores[team].maxHp,
    );
    const assault = coreAssault(s, team);
    const pressureStatus = corePressureLabel(pressure.state, team);
    const status =
      pressure.state !== "destroyed" && assault.active
        ? assault.label
        : pressureStatus;
    el(`${team}-hp`).textContent = `${pressure.percent}%`;
    el(`${team}-health`).style.width = `${pressure.percent}%`;
    const info = el<HTMLElement>(`${team}-core-info`);
    info.dataset.coreState = pressure.state;
    info.dataset.coreAssault = String(assault.active);
    info.dataset.coreStatus = status;
    info.setAttribute(
      "aria-label",
      `${team === "player" ? "Dein" : "Gegnerischer"} Core: ${pressure.percent}%${status ? `, ${status}` : ""}`,
    );
  }
  el("energy").textContent = String(Math.floor(s.energy.player));
  el("energy-fill").style.width = `${(s.energy.player / ENERGY_CAP) * 100}%`;
  const tempo = energyTempo(s.energy.player, ENERGY_CAP);
  const resourceRow = el<HTMLElement>("resource-row");
  const energyTrack = el("energy-fill").parentElement;
  resourceRow.classList.toggle("energy-high", live && tempo.state === "high");
  resourceRow.classList.toggle("energy-capped", live && tempo.state === "capped");
  resourceRow.setAttribute(
    "aria-label",
    live
      ? `${tempo.label}. ${Math.min(ENERGY_CAP, Math.max(0, s.energy.player)).toFixed(1).replace(".", ",")} von ${ENERGY_CAP}.`
      : `Energie ${Math.min(ENERGY_CAP, Math.max(0, s.energy.player)).toFixed(1).replace(".", ",")} von ${ENERGY_CAP}.`,
  );
  if (
    live &&
    tempo.state === "capped" &&
    !energyWasCapped &&
    s.time > 0.5
  ) {
    energyCapFlashUntil = performance.now() + 900;
    resourceRow.classList.remove("energy-cap-flash");
    el("cards").classList.remove("energy-cap-flash");
    void resourceRow.offsetWidth;
    resourceRow.classList.add("energy-cap-flash");
    el("cards").classList.add("energy-cap-flash");
    window.setTimeout(() => {
      resourceRow.classList.remove("energy-cap-flash");
      el("cards").classList.remove("energy-cap-flash");
    }, 900);
  }
  energyWasCapped = live && tempo.state === "capped";
  energyTrack?.classList.toggle("high", live && tempo.state === "high");
  energyTrack?.classList.toggle("capped", live && tempo.state === "capped");
  energyTrack?.classList.toggle(
    "cap-flash",
    live &&
      tempo.state === "capped" &&
      performance.now() < energyCapFlashUntil,
  );
  const selectedCard = CARDS.find((card) => card.id === selected);
  const selectedHint = el("selected-hint");
  const selectedReadiness = selectedCard
    ? energyReadiness(s.energy.player, selectedCard.cost)
    : null;
  const preselecting =
    active &&
    !live &&
    !paused &&
    !ended &&
    allowCountdownPreselect &&
    now < matchReadyAt;
  el("cards").classList.toggle("preselecting", preselecting);
  if (preselecting) {
    selectedHint.textContent = selectedCard
      ? `BEREIT BEI LOS · ${selectedCard.name}`
      : "KARTE VORWÄHLEN · BEI LOS DIREKT EINSETZEN";
    selectedHint.classList.remove("waiting-energy", "energy-capped");
  } else if (live && selectedReadiness && !selectedReadiness.affordable) {
    selectedHint.textContent =
      `ENERGIE IN ${energyWaitLabel(selectedReadiness.waitSeconds)}s · ${Math.round(selectedReadiness.progress * 100)}%`;
    selectedHint.classList.add("waiting-energy");
    selectedHint.classList.remove("energy-capped");
  } else if (live && !selectedCard && tempo.state === "capped") {
    selectedHint.textContent = "ENERGIE VOLL · JETZT KARTE SPIELEN";
    selectedHint.classList.add("energy-capped");
    selectedHint.classList.remove("waiting-energy");
  } else {
    selectedHint.textContent = selectedCardHint(selectedCard);
    selectedHint.classList.remove("waiting-energy", "energy-capped");
  }
  const race = frontRace(s.points.map((point) => point.owner));
  const territory = el<HTMLElement>("territory-count");
  el("territory-player").textContent = String(race.player);
  el("territory-enemy").textContent = String(race.enemy);
  territory.dataset.frontState = race.state;
  territory.setAttribute("aria-label", race.aria);
  const segments = el("territory-segments").children;
  s.points.forEach((point, index) => {
    const segment = segments.item(index) as HTMLElement | null;
    if (segment) segment.dataset.owner = point.owner ?? "neutral";
  });
  const leader = race.state === "even" ? null : race.state;
  if (
    live &&
    leader &&
    lastFrontLeader &&
    leader !== lastFrontLeader
  ) {
    territory.classList.remove("front-shift");
    void territory.offsetWidth;
    territory.classList.add("front-shift");
    window.clearTimeout(frontShiftTimer);
    frontShiftTimer = window.setTimeout(
      () => territory.classList.remove("front-shift"),
      520,
    );
  }
  if (leader) lastFrontLeader = leader;
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
    const readiness = energyReadiness(s.energy.player, card.cost);
    const previous = cardAffordable.get(card.id);
    b.style.setProperty(
      "--energy-readiness",
      readiness.progress.toFixed(4),
    );
    b.classList.toggle("unaffordable", !readiness.affordable);
    b.classList.toggle("affordable", readiness.affordable);
    b.dataset.energyReady = String(readiness.affordable);
    b.setAttribute(
      "aria-label",
      readiness.affordable
        ? `${card.name}, ${card.cost} Energie, bereit. ${card.description}`
        : `${card.name}, ${card.cost} Energie. Noch ${readiness.missing.toFixed(1).replace(".", ",")} Energie, bereit in ${energyWaitLabel(readiness.waitSeconds)} Sekunden. ${card.description}`,
    );
    if (
      live &&
      previous === false &&
      readiness.affordable
    ) {
      b.classList.remove("ready-flash");
      void b.offsetWidth;
      b.classList.add("ready-flash");
      window.setTimeout(() => b.classList.remove("ready-flash"), 720);
    }
    cardAffordable.set(card.id, readiness.affordable);
    b.disabled = !(live || preselecting);
  }
  const commanderButton = el<HTMLButtonElement>("commander");
  const commanderDefinition = COMMANDERS[match.commanders.player];
  const cooldownProgress = commanderCooldownProgress(
    s.commanderCooldown,
    commanderDefinition.cooldown,
  );
  const commanderProgressEl = el<HTMLElement>("commander-cooldown-progress");
  commanderProgressEl.style.transform = `scaleX(${cooldownProgress})`;
  commanderProgressEl.classList.toggle("cooling", s.commanderCooldown > 0);
  const commanderActive = live
    ? commanderActiveSeconds(match.commanders.player, s.units, "player")
    : 0;
  const commanderHasTarget = commanderHasValidTarget(
    match.commanders.player,
    s.units,
    "player",
  );
  const commanderReady =
    live && s.commanderCooldown <= 0 && commanderHasTarget;
  if (
    active &&
    !ended &&
    live &&
    commanderReady &&
    !lastCommanderReady &&
    s.time > 0.25
  )
    commanderReadyFlashUntil = performance.now() + 1250;
  lastCommanderReady = commanderReady;
  const enemyCommanderDefinition = COMMANDERS[match.commanders.enemy];
  const enemyCooldownProgress = commanderCooldownProgress(
    s.enemyCommanderCooldown,
    enemyCommanderDefinition.cooldown,
  );
  const enemyProgressEl = el<HTMLElement>(
    "enemy-commander-cooldown-progress",
  );
  enemyProgressEl.style.transform = `scaleX(${enemyCooldownProgress})`;
  enemyProgressEl.classList.toggle(
    "cooling",
    s.enemyCommanderCooldown > 0,
  );
  const enemyCommanderTriggered =
    active &&
    !ended &&
    live &&
    lastEnemyCommanderCooldown <= 0 &&
    s.enemyCommanderCooldown > 0;
  if (enemyCommanderTriggered) {
    announceBattle(
      "GEGNER-KOMMANDO",
      `${enemyCommanderDefinition.name}: ${enemyCommanderDefinition.ability}`,
      "danger",
    );
    sound.play("enemyCommander");
    haptics.play("warning");
  }
  lastEnemyCommanderCooldown = s.enemyCommanderCooldown;
  const enemyCommanderActive = commanderActiveSeconds(
    match.commanders.enemy,
    s.units,
    "enemy",
  );
  const enemyCommanderStatus = commanderStatusText(
    match.commanders.enemy,
    s.enemyCommanderCooldown,
    s.units,
    "enemy",
  );
  const enemyStatusEl = el("enemy-commander-status");
  enemyStatusEl.textContent = enemyCommanderStatus;
  enemyStatusEl.classList.toggle("active", enemyCommanderActive > 0);
  const enemyCommanderHasTarget = commanderHasValidTarget(
    match.commanders.enemy,
    s.units,
    "enemy",
  );
  enemyStatusEl.classList.toggle(
    "ready",
    live &&
      s.enemyCommanderCooldown <= 0 &&
      enemyCommanderActive <= 0 &&
      enemyCommanderHasTarget,
  );
  enemyStatusEl.classList.toggle(
    "blocked",
    live &&
      s.enemyCommanderCooldown <= 0 &&
      enemyCommanderActive <= 0 &&
      !enemyCommanderHasTarget,
  );
  const commanderStatus = commanderReady
    ? commanderOutcomeText(
        match.commanders.player,
        s.units,
        "player",
      )
    : commanderStatusText(
        match.commanders.player,
        s.commanderCooldown,
        s.units,
        "player",
      );
  el("commander-status").textContent = commanderStatus;
  commanderButton.title = commanderReady
    ? `${commanderDefinition.name} · ${commanderDefinition.ability} · ${commanderStatus}`
    : `${commanderDefinition.name} · ${commanderDefinition.ability}`;
  commanderButton.setAttribute(
    "aria-label",
    commanderReady
      ? `${commanderDefinition.name} ${commanderDefinition.ability}: ${commanderStatus}`
      : `${commanderDefinition.name} ${commanderDefinition.ability}`,
  );
  commanderButton.disabled = !commanderReady;
  commanderButton.classList.toggle("active", commanderActive > 0);
  commanderButton.classList.toggle(
    "no-target",
    live &&
      s.commanderCooldown <= 0 &&
      commanderActive <= 0 &&
      !commanderHasTarget,
  );
  commanderButton.classList.toggle("ready", commanderReady);
  commanderButton.classList.toggle(
    "just-ready",
    commanderReady && performance.now() < commanderReadyFlashUntil,
  );
  const currentPointOwners = s.points.map((point) => point.owner);
  const surge = frontSurge(frontSurgeMemory, {
    time: s.time,
    previousOwners: lastPointOwners,
    currentOwners: currentPointOwners,
  });
  frontSurgeMemory = surge.memory;
  const lostPoint =
    active && !ended
      ? s.points.find(
          (point, index) =>
            lastPointOwners[index] === "player" && point.owner === "enemy",
        )
      : undefined;
  const capturedPoint =
    active && !ended && s.stats.captured > lastCaptured;
  if (capturedPoint) lastCaptured = s.stats.captured;

  if (active && !ended && surge.event) {
    announceBattle(
      `${surge.event.label} · ${surge.event.captures} PUNKTE`,
      surge.event.title,
      surge.event.tone,
      "surge",
    );
    if (surge.event.team === "player") {
      sound.play("opportunity");
      haptics.play("success");
    } else {
      sound.play("warning");
      haptics.play("warning");
    }
  } else {
    if (lostPoint) {
      const pointName =
        `${"ABC"[lostPoint.id % 3]}${Math.floor(lostPoint.id / 3) + 1}`;
      if (el("battle-banner").hidden)
        announceBattle("FRONT VERLOREN", `${pointName} IST GEFALLEN`);
      else showToast(`${pointName} verloren. Front neu stabilisieren.`, true);
      sound.play("warning");
      haptics.play("warning");
    }
    if (capturedPoint) {
      if (el("battle-banner").hidden)
        announceBattle("GEBIET GESICHERT", "DEINE FRONT RÜCKT VOR");
      else showToast("Punkt erobert. Deine Front rückt vor.");
      sound.play("capture");
      haptics.play("capture");
    }
  }
  lastPointOwners = currentPointOwners;
  if (active && !ended && s.phase === "ended") {
    if (!finishReadyAt) {
      finishReadyAt = performance.now() + MATCH_END_SEQUENCE_MS;
      selected = null;
      updateSelection();
      el<HTMLButtonElement>("commander").disabled = true;
      for (const button of cardButtons.values()) button.disabled = true;
      const visual = matchEndVisual(s);
      announceBattle(
        visual?.title ?? "MATCH BEENDET",
        visual?.subtitle ?? s.reason.toUpperCase(),
        s.winner === "enemy" ? "danger" : s.winner === "player" ? "opportunity" : "neutral",
      );
    } else if (performance.now() >= finishReadyAt) {
      finishReadyAt = 0;
      finish();
    }
  }
}
function commander() {
  if (!matchLive()) return;
  const result = match.activateCommander();
  showToast(result.message, !result.ok);
  sound.play(result.ok ? "commander" : "error");
  haptics.play(result.ok ? "ability" : "error");
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
      updateBattleProgress();
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
el("status-campaign").onclick = () => el<HTMLButtonElement>("campaign").click();
el("status-headquarters").onclick = () => el<HTMLButtonElement>("headquarters").click();
el("status-daily").onclick = () => el<HTMLButtonElement>("daily").click();

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
  const ongoing = Boolean(seriesRun && !seriesEnded(seriesRun));
  const routes = SERIES_ROUTES[ongoing ? seriesRun!.wins : 0];
  const chosen = ongoing ? seriesRun!.deck : deck;
  const preparation = seriesPreparation(
    ongoing ? seriesRun : null,
    deck,
    commanderId,
  );
  showModal(
    `<section class="series-hero"><div class="eyebrow">EINSATZSERIE</div><div class="series-hero-main"><div><small>LAUFSTATUS</small><h2>${preparation.complete ? "Serie gemeistert." : preparation.failed ? "Serie beendet." : `Gefechtsfolge ${preparation.battle}/3`}</h2><p>Ein Deck. Ein Commander. Drei Fronten. Die zweite Niederlage beendet den Lauf; Unentschieden kosten keinen Versuch.</p></div><div class="series-score"><span><b>${preparation.wins}</b><small>SIEGE</small></span><span><b>${preparation.livesRemaining}</b><small>VERSUCHE</small></span></div></div><div class="series-track" aria-label="${preparation.wins} von 3 Siegen">${[0,1,2].map((step) => `<i class="${step < preparation.wins ? "won" : step === preparation.wins && !preparation.complete ? "current" : ""}"><b>${step + 1}</b><span>${step < preparation.wins ? "GESICHERT" : step === preparation.wins && !preparation.complete ? "NÄCHSTE FRONT" : "OFFEN"}</span></i>`).join("")}</div><div class="series-loadout"><div><small>FESTES KOMMANDO</small><b>${preparation.commander}</b><span>Ø ${preparation.deckAverageCost.toFixed(1)} Energie</span></div><div class="series-deck-mini" aria-label="Festes Seriendeck">${chosen.map((id) => `<span title="${CARDS.find((card) => card.id === id)!.name}">${unitSvg(id)}</span>`).join("")}</div></div></section><div class="series-note">Deck und Commander bleiben bis zum Ende dieses Laufs fest. Nach Niederlage oder Unentschieden darf die Route gewechselt werden.</div><div class="series-routes"><div class="series-route-heading"><span>NÄCHSTE FRONT WÄHLEN</span><small>${routes.length} ALTERNATIVEN</small></div>${routes.map((stage, index) => { const briefing = missionBriefingSnapshot(stage); return `<article class="series-route-card ${seriesRun?.route === stage.id && ongoing ? "previous" : ""}"><div class="series-route-map"><div class="mission-map" aria-label="Startfront">${stage.owners.map((owner, id) => `<i class="owner-${owner ?? "neutral"} ${stage.controlObjective?.pointIds.includes(id) ? "relay" : ""}"></i>`).join("")}</div></div><div class="series-route-copy"><div class="mission-top"><span>ROUTE ${index + 1} · ${briefing.modeLabel}</span>${seriesRun?.route === stage.id && ongoing ? "<b>ZULETZT GEWÄHLT</b>" : ""}</div><h3>${stage.name}</h3><b class="series-objective">${briefing.objectiveMeta}</b><p>${stage.briefing}</p><small>${briefing.enemyUnits} EINHEITEN · ${briefing.enemyAbilities} TAKTIKEN · Ø ${briefing.enemyAverageCost.toFixed(1)} ENERGIE</small><div class="series-tip">${stage.tip}</div><details><summary>Gegnerdeck ansehen</summary><p>${stage.enemyDeck.map((id) => CARDS.find((card) => card.id === id)!.name).join(" · ")}</p></details><button data-series-route="${stage.id}" class="primary">DIESE FRONT ANGREIFEN ↗</button></div></article>`; }).join("")}</div><button id="series-close" class="secondary">Zur Basis</button>`,
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
  updateLobbyCommandCenter();
  updateFeaturedEvent();
}
function openDaily() {
  if (active) return;
  const challenge = dailyChallenge();
  const record = dailyRecord(dailyHistory, challenge.key);
  const preparation = dailyPreparation(challenge, record);
  showModal(
    `<section class="daily-hero ${preparation.complete ? "complete" : ""}"><div><div class="eyebrow">TAGESFRONT · ${challenge.key}</div><h2>${challenge.title}</h2><b>${preparation.modeLabel} · ${preparation.objectiveMeta}</b><p>${challenge.briefing}</p></div><div class="daily-hero-status"><small>${preparation.complete ? "HEUTE GESICHERT" : preparation.attempts ? "NOCH OFFEN" : "NEUE FRONT"}</small><strong>${preparation.attempts}</strong><span>VERSUCHE</span></div></section><section class="daily-operation"><div class="daily-map" aria-label="Heutige Startfront">${challenge.owners.map((owner, id) => `<i class="owner-${owner ?? "neutral"} ${challenge.controlObjective?.pointIds.includes(id) ? "relay" : ""}"></i>`).join("")}</div><div class="daily-operation-copy"><div class="daily-front-counts"><span class="player">${preparation.playerTerritory} DEIN</span><span>${preparation.neutralTerritory} NEUTRAL</span><span class="enemy">${preparation.enemyTerritory} GEGNER</span></div><div class="daily-brief-grid"><div><small>SCHAUPLATZ</small><b>${ARENA_THEMES[challenge.theme].name}</b></div><div><small>SCHWIERIGKEIT</small><b>${challenge.difficulty === "veteran" ? "VETERAN" : "TAKTIKER"}</b></div><div><small>DEIN COMMANDER</small><b>${preparation.playerCommander}</b></div><div><small>GEGNER COMMANDER</small><b>${preparation.enemyCommander}</b></div></div></div></section><div class="daily-tactical-tip"><small>HEUTIGER HINWEIS</small><p>${challenge.tip}</p></div><section class="daily-loadout"><header><div><small>FESTES EINSATZDECK</small><b>Ø ${preparation.playerAverageCost.toFixed(1)} ENERGIE</b></div><span>GEGNER Ø ${preparation.enemyAverageCost.toFixed(1)}</span></header><div class="daily-deck">${challenge.playerDeck.map((id) => { const card = CARDS.find((item) => item.id === id)!; return `<span data-card="${id}"><i>${card.cost}</i><span>${unitSvg(id)}</span><b>${card.name}</b></span>`; }).join("")}</div></section>${record ? `<div class="daily-record ${record.completed ? "complete" : ""}"><b>${record.completed ? "HEUTE GESICHERT" : "HEUTE NOCH OFFEN"}</b><span>${record.attempts} Versuch${record.attempts === 1 ? "" : "e"}${record.completed ? ` · Bestzeit ${Math.floor(record.bestTime / 60)}:${String(record.bestTime % 60).padStart(2, "0")} · Core ${record.bestCore}% · ${record.bestPoints}/9 Gebiete` : ""}</span></div>` : ""}<p class="daily-note">Setup, Deck und Seed sind für diesen Kalendertag fest. Wiederholungen sind kostenlos; morgen entsteht automatisch eine neue Front.</p><button id="daily-play" class="primary daily-play">${record?.completed ? "BESTWERT VERBESSERN" : "TAGESFRONT STARTEN"} ↗</button><button id="daily-close" class="secondary">Zur Basis</button>`,
  );
  el("daily-play").onclick = () => start(false, null, false, null, challenge);
  el("daily-close").onclick = () => {
    el("modal").hidden = true;
    el("daily").focus();
  };
}
el("daily").onclick = openDaily;

function readyBaseProjectCount(): number {
  const metrics = headquartersMetrics();
  return BASE_PROJECTS.filter(
    (project) =>
      !baseProjectBuilt(learningProgress, project.id) &&
      baseProjectProgress(project.id, metrics).ready &&
      (project.requires === null ||
        baseProjectBuilt(
          learningProgress,
          project.requires as BaseProjectId,
        )),
  ).length;
}

function updateLobbyCommandCenter(): void {
  const completed = Object.keys(campaignProgress).length;
  const stars = Object.values(campaignProgress).reduce(
    (sum, best) => sum + best.stars,
    0,
  );
  const daily = dailyChallenge();
  const dailyProgress = dailyRecord(dailyHistory, daily.key);
  const stage = baseStage(completed);
  const status = lobbyCommandStatus({
    completedMissions: completed,
    totalMissions: MISSIONS.length,
    stars,
    maxStars: MISSIONS.length * 3,
    headquartersName: BASE_STAGES[stage].name,
    readyProjects: readyBaseProjectCount(),
    learningDone: completedLessons(learningProgress),
    learningTotal: LESSONS.length,
    dailyCompleted: Boolean(dailyProgress?.completed),
    dailyAttempts: dailyProgress?.attempts ?? 0,
    seriesActive: Boolean(seriesRun && !seriesEnded(seriesRun)),
    seriesWins: seriesRun?.wins ?? 0,
    seriesLosses: seriesRun?.losses ?? 0,
  });

  const lobby = el<HTMLElement>("lobby");
  lobby.dataset.commandFocus = status.attention;
  for (const key of ["campaign", "headquarters", "daily"] as const) {
    const item = status[key];
    const button = el<HTMLButtonElement>(`status-${key}`);
    el(`status-${key}-value`).textContent = item.value;
    el(`status-${key}-detail`).textContent = item.detail;
    button.classList.toggle("focus", status.attention === key);
    button.classList.toggle(
      "complete",
      "complete" in item && Boolean(item.complete),
    );
    button.classList.toggle(
      "ready",
      "ready" in item && Boolean(item.ready),
    );
  }

  el("status-campaign").setAttribute(
    "aria-label",
    `Feldzug: ${status.campaign.value}, ${status.campaign.detail}`,
  );
  el("status-headquarters").setAttribute(
    "aria-label",
    `Hauptquartier: ${status.headquarters.value}, ${status.headquarters.detail}`,
  );
  el("status-daily").setAttribute(
    "aria-label",
    `Tagesfront: ${status.daily.value}, ${status.daily.detail}`,
  );
}

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
  el("lobby").dataset.baseStyle = displayStyle;
  el("hq-mini-art").innerHTML = baseMapSvg(learningProgress, style.color, { interactive: false, stage });
  el("hq-name").textContent = BASE_STAGES[stage].name;
  el("hq-progress-fill").style.width = `${next ? Math.min(100, ((wins - BASE_STAGES[stage].wins) / (next.wins - BASE_STAGES[stage].wins)) * 100) : 100}%`;
  const readyProjects = readyBaseProjectCount();
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
  updateLobbyCommandCenter();
}
function openHeadquarters(initial?: BaseProjectId) {
  if (active) return;
  const metrics = headquartersMetrics();
  const style = styleUnlocked(learningProgress.style, learningProgress, metrics.wins, supporterOwned) ? learningProgress.style : "field";
  showModal("");
  renderBaseBuilder(el("modal-content"), {
    progress: () => learningProgress,
    metrics,
    accent: BASE_STYLES[style].color,
    initial,
    commit: next => {
      if (!saveLearning(next)) return false;
      learningProgress = next;
      updateHeadquarters();
      return true;
    },
    close: () => { el("modal").hidden = true; el("headquarters").focus(); },
    details: openHeadquartersDetails,
  });
}
function openHeadquartersDetails() {
  if (active) return;
  const metrics = headquartersMetrics();
  const wins = metrics.wins;
  const stage = baseStage(wins);
  const nextStage = BASE_STAGES[stage + 1];
  const displayStyle = styleUnlocked(learningProgress.style, learningProgress, wins, supporterOwned) ? learningProgress.style : "field";
  showModal(
    `<div class="eyebrow">DEINE BLEIBENDE FRONT</div><h2>${BASE_STAGES[stage].name}</h2><div class="hq-art">${baseMapSvg(learningProgress, BASE_STYLES[displayStyle].color, { interactive: false, stage })}</div><p>${BASE_STAGES[stage].description}</p>${nextStage ? `<details class="hq-next-preview"><summary>NÄCHSTER AUSBAU · ${nextStage.name} · Noch ${nextStage.wins - wins} ${nextStage.wins - wins === 1 ? "Sieg" : "Siege"}</summary><div class="hq-art">${baseMapSvg(learningProgress, BASE_STYLES[displayStyle].color, { interactive: false, stage: stage + 1 })}</div><p>${nextStage.description}</p><small>VORSCHAU · ${nextStage.wins} verschiedene Kampagneneinsätze gewinnen.</small></details>` : '<div class="learning-reward"><b>KOMMANDOZITADELLE VOLLSTÄNDIG</b><p>Alle Ausbaustufen erreicht. Deine Basis zeigt deinen gesamten Feldzug.</p></div>'}<p>Deine Basis wächst auf zwei Arten: Feldzugstufen entstehen durch verschiedene Siege. Bauprojekte errichtest du selbst, sobald du ihre Spielziele erreicht hast. Alles bleibt kosmetisch und verändert keine Kampfwerte.</p><div class="hq-stages">${BASE_STAGES.map((item, i) => `<span class="${i <= stage ? "built" : ""}"><b>${i <= stage ? "✓" : item.wins}</b>${item.name}</span>`).join("")}</div><h3>Bauprojekte</h3><div class="hq-projects">${BASE_PROJECTS.map((project, index) => { const state = baseProjectProgress(project.id, metrics); const built = baseProjectBuilt(learningProgress, project.id); const prerequisite = project.requires as BaseProjectId | null; const prerequisiteBuilt = prerequisite === null || baseProjectBuilt(learningProgress, prerequisite); const ready = state.ready && prerequisiteBuilt; const prerequisiteName = prerequisite === null ? "" : BASE_PROJECTS.find((item) => item.id === prerequisite)?.name ?? prerequisite; return `<article data-base-project-card="${project.id}" class="hq-project ${built ? "built" : ready ? "ready" : "locked"}"><div class="hq-project-head"><span>${String(index + 1).padStart(2, "0")}</span><b>${built ? "GEBAUT" : ready ? "BEREIT ZUM BAUEN" : prerequisiteBuilt ? "PROJEKT GESPERRT" : "BAUKETTE GESPERRT"}</b></div><h4>${project.name}</h4><p>${project.description}</p><div class="hq-project-progress"><i style="width:${Math.min(100, (state.current / state.goal) * 100)}%"></i></div><small>${Math.min(state.current, state.goal)}/${state.goal} ${baseMetricLabel(project.metric)}${prerequisiteName ? ` · Benötigt ${prerequisiteName}` : ""}</small>${built ? '<button class="secondary" disabled>GEBAUT ✓</button>' : ready ? `<button class="primary" data-base-project="${project.id}">JETZT BAUEN ↗</button>` : `<button class="secondary" disabled>${prerequisiteBuilt ? "NOCH NICHT BEREIT" : `ERST ${prerequisiteName.toUpperCase()} BAUEN`}</button>`}</article>`; }).join("")}</div><h3>Deine Garnison</h3>${baseProjectBuilt(learningProgress, "training") ? (() => { const garrison = headquartersGarrison(); return garrison.length ? `<div class="hq-garrison">${garrison.map(({ card, mastery: points }) => `<article data-mastery="${masteryRank(points).frame}"><div>${unitSvg(card.id)}</div><b>${card.name}</b><small>${masteryLabel(mastery, card.id)}</small></article>`).join("")}</div><p class="hq-garrison-note">Deine meistgenutzten Einheiten trainieren hier. Die Anzeige folgt deiner Mastery und verändert keine Kampfwerte.</p>` : '<div class="hq-garrison-empty"><b>TRAININGSPLATZ BEREIT</b><p>Setze Einheiten in Gefechten häufiger ein. Sobald sie Mastery sammeln, erscheinen sie hier.</p></div>'; })() : '<div class="hq-garrison-empty locked"><b>GARNISON NOCH GESPERRT</b><p>Baue zuerst den Trainingsplatz. Danach ziehen deine gemeisterten Einheiten sichtbar in die Basis ein.</p></div>'}<h3>Ehrenhof</h3>${baseProjectBuilt(learningProgress, "honor") ? (() => { const honors = baseHonors(campaignProgress, dailyHistory, mastery); return `<div class="hq-honors">${honors.map((honor, index) => `<article class="${honor.unlocked ? "unlocked" : "locked"}"><span>${honor.unlocked ? "◆" : String(index + 1).padStart(2, "0")}</span><div><b>${honor.name}</b><p>${honor.detail}</p><small>${honor.current}/${honor.goal}</small></div></article>`).join("")}</div><p class="hq-honor-note">${honors.filter((honor) => honor.unlocked).length}/${honors.length} Auszeichnungen freigeschaltet. Trophäen sind rein kosmetisch.</p>`; })() : '<div class="hq-garrison-empty locked"><b>EHRENHOF NOCH NICHT GEBAUT</b><p>Errichte zuerst den Ehrenhof. Danach werden große Feldzug-, Tagesfront- und Mastery-Erfolge hier dauerhaft sichtbar.</p></div>'}<h3>Deine Gestaltung</h3><div class="hq-styles">${(Object.keys(BASE_STYLES) as BaseStyle[]).map((id) => `<button data-base-style="${id}" class="${id === learningProgress.style ? "selected" : ""}" ${styleUnlocked(id, learningProgress, wins, supporterOwned) ? "" : "disabled"}><i style="background:${BASE_STYLES[id].color}"></i><b>${BASE_STYLES[id].name}</b><small>${styleUnlocked(id, learningProgress, wins, supporterOwned) ? (id === learningProgress.style ? "AUSGERÜSTET" : "AUSRÜSTEN") : BASE_STYLES[id].requirement}</small></button>`).join("")}</div><button id="hq-store" class="primary">KOMMANDOGOLD ANSEHEN</button><button id="hq-close" class="secondary">Zur Basis</button>`,
  );
  el("modal-content")
    .querySelectorAll<HTMLButtonElement>("[data-base-project]")
    .forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.baseProject as BaseProjectId;
        const project = BASE_PROJECTS.find((item) => item.id === id);
        if (!project) return;
        openHeadquarters(id);
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
    renderStore(el("modal-content"), stage, () => openHeadquarters(), () => {
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
el("headquarters").onclick = () => openHeadquarters();
el("learning").onclick = openLearning;
function renderCommander(id: CommanderId) {
  const definition = COMMANDERS[id];
  el("commander-name").innerHTML =
    `${definition.name} <span>${definition.ability}</span>`;
  el<HTMLButtonElement>("commander").dataset.commander = id;
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
  const activeBriefing = commanderBriefing(commanderId);
  showModal(
    `<section class="commander-loadout-hero ${activeBriefing.emphasis}"><div class="commander-loadout-art">${commanderSvg(commanderId)}</div><div><span>AKTIVES KOMMANDO</span><h2>${activeBriefing.name}</h2><b>${activeBriefing.ability}</b><small>${activeBriefing.role} · ${activeBriefing.cooldown}</small></div></section><div class="commander-loadout-intro"><div class="eyebrow">KOMMANDO WÄHLEN</div><p>Alle drei Fähigkeiten kosten keine Energie. Die Werte unten kommen direkt aus der tatsächlichen Kampflogik. Im freien Gefecht erhält der Bot denselben Kommandanten; Kampagneneinsätze können ein festes Gegnerkommando haben. Eine laufende Einsatzserie behält ihre bisherige Wahl.</p></div><div class="commander-roster">${(
      Object.keys(COMMANDERS) as CommanderId[]
    )
      .map((id) => {
        const c = COMMANDERS[id];
        const briefing = commanderBriefing(id);
        return `<article class="commander-option ${briefing.emphasis} ${commanderId === id ? "selected" : ""}" data-commander-option="${id}"><div class="commander-portrait">${commanderSvg(id)}<span class="commander-current">${commanderId === id ? "AKTIV" : briefing.cooldown}</span></div><div class="commander-option-copy"><small>${c.role}</small><h3>${c.name}</h3><b>${c.ability}</b><div class="commander-stat-row">${briefing.stats.map((stat) => `<span>${stat}</span>`).join("")}</div><p>${c.description}</p><button data-commander="${id}" class="${commanderId === id ? "secondary" : "primary"}" ${commanderId === id ? "disabled" : ""}>${commanderId === id ? "AKTIVES KOMMANDO ✓" : "KOMMANDO ÜBERNEHMEN"}</button></div></article>`;
      })
      .join(
        "",
      )}</div><button id="commander-close" class="secondary commander-close">Zur Basis</button>`,
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
el("quick-play").onclick = () =>
  start(false, null, false, null, null, true);
el("featured-event-play").onclick = () => {
  const event = featuredEvent(new Date());
  if (event.id === "daily") openDaily();
  else if (event.id === "draft") openDraft();
  else openSeries();
};
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
  running: sceneRunning,
  selected: () => selected,
  deploy,
  combatFeedback: (cue) => {
    sound.play(cue);
    haptics.play(cue);
  },
  tick: () => updateHud(),
});
const matchRender = matchRenderProfile();
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
  render: { powerPreference: matchRender.powerPreference },
  fps: {
    target: matchRender.targetFps,
    limit: matchRender.limitFps,
    forceSetTimeOut: false,
  },
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
