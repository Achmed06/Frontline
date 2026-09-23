import { COMMANDERS } from "./commanders";
import { commanderSvg } from "./art";
import { CARDS } from "./engine";
import { missionBriefingSnapshot } from "./mission-briefing";
import {
  MISSIONS,
  CHAPTERS,
  missionUnlocked,
  type CampaignProgress,
  type Mission,
} from "./campaign";

export function renderCampaign(
  container: HTMLElement,
  progress: CampaignProgress,
  onStart: (mission: Mission) => void,
  onClose: () => void,
) {
  const stars = Object.values(progress).reduce(
    (sum, best) => sum + best.stars,
    0,
  );
  container.innerHTML = `<div class="deck-heading"><div class="eyebrow">FRONTKAMPAGNE</div><button id="campaign-close" class="icon-btn" aria-label="Kampagne schließen">×</button></div><h2>${CHAPTERS.length} Kapitel. Deine Front.</h2><p>${MISSIONS.length} Einsätze. Dein Deck. Jeder Sieg öffnet die nächste Front. <strong>${stars} / ${MISSIONS.length * 3} ★</strong></p><div class="campaign-regions" aria-label="Kapitel wählen"></div><div class="campaign-route"></div><div class="mission-list"></div>`;
  const list = container.querySelector<HTMLElement>(".mission-list")!;
  for (const [index, mission] of MISSIONS.entries()) {
    const unlocked = missionUnlocked(index, progress),
      best = progress[mission.id];
    const briefing = missionBriefingSnapshot(mission);
    const card = document.createElement("article");
    card.dataset.mission = mission.id;
    card.hidden = true;
    card.className = `mission-card ${unlocked ? "" : "locked"}`;
    const level =
      mission.difficulty === "rookie"
        ? "REKRUT"
        : mission.difficulty === "standard"
          ? "TAKTIKER"
          : "VETERAN";
    card.innerHTML = `<div class="mission-top"><span>EINSATZ ${String(index + 1).padStart(2, "0")} · ${level}</span><b>${"★".repeat(best?.stars ?? 0)}${"☆".repeat(3 - (best?.stars ?? 0))}</b></div><div class="mission-title-row"><div><small>${briefing.modeLabel}</small><h3>${mission.name}</h3></div><span class="mission-difficulty">${briefing.difficultyLabel}</span></div><section class="mission-briefing-hero"><div class="mission-map" aria-label="Startfront: oben Gegnerbasis, unten deine Basis">${mission.owners.map((owner, id) => `<i class="owner-${owner ?? "neutral"} ${mission.controlObjective?.pointIds.includes(id) ? "relay" : ""}"></i>`).join("")}</div><div class="mission-briefing-copy"><small>AUFTRAG</small><b>${briefing.objectiveMeta}</b><p>${mission.briefing}</p><div class="mission-front-counts"><span><i class="player"></i>${briefing.playerTerritory} DEIN</span><span><i class="neutral"></i>${briefing.neutralTerritory} NEUTRAL</span><span><i class="enemy"></i>${briefing.enemyTerritory} GEGNER</span></div></div></section><section class="mission-star-objectives" aria-label="Sternziele">${briefing.starTargets.map((target, starIndex) => `<div class="${(best?.stars ?? 0) > starIndex ? "earned" : ""}"><span>★</span><b>${target}</b></div>`).join("")}</section>${mission.enemyCommander ? `<div class="mission-commander"><span aria-hidden="true">${commanderSvg(mission.enemyCommander)}</span><div><small>GEGNERISCHES KOMMANDO</small><b>${briefing.enemyCommander}</b><p>${COMMANDERS[mission.enemyCommander].description}</p><span class="mission-enemy-deck-meta">${briefing.enemyUnits} EINHEITEN · ${briefing.enemyAbilities} TAKTIKEN · Ø ${briefing.enemyAverageCost.toFixed(1)} ENERGIE</span></div></div>` : `<div class="mission-enemy-profile"><small>GEGNERPROFIL</small><b>${briefing.enemyCommander}</b><span>${briefing.enemyUnits} EINHEITEN · ${briefing.enemyAbilities} TAKTIKEN · Ø ${briefing.enemyAverageCost.toFixed(1)} ENERGIE</span></div>`}<div class="mission-tactical-tip"><small>TAKTISCHER HINWEIS</small><p>${mission.tip}</p></div><details class="mission-intel"><summary>Gegnerdeck ansehen</summary><p>${briefing.objective}</p><p>${mission.enemyDeck.map((id) => CARDS.find((card) => card.id === id)!.name).join(" · ")}</p></details>${best ? `<div class="mission-record"><span>BESTLEISTUNG</span><b>${Math.floor(best.bestTime / 60)}:${String(Math.floor(best.bestTime % 60)).padStart(2, "0")}</b><small>${best.stars}/3 STERNE</small></div>` : ""}<button class="mission-start ${unlocked ? "primary" : "secondary"}" ${unlocked ? "" : "disabled"}>${!unlocked ? `Erst Einsatz ${String(index).padStart(2, "0")} gewinnen` : best ? "ERNEUT ANGREIFEN ↗" : "EINSATZ STARTEN ↗"}</button>`;
    card.querySelector("button")!.onclick = () => {
      if (unlocked) onStart(mission);
    };
    list.append(card);
  }
  // New map selector reuses the original briefing and start guards.
  const nextIndex = MISSIONS.findIndex((mission, index) => missionUnlocked(index, progress) && !progress[mission.id]);
  let selected = nextIndex < 0 ? MISSIONS.length - 1 : nextIndex;
  let region = CHAPTERS.reduce((found, chapter, index) => MISSIONS.findIndex(m => m.id === chapter.firstMission) <= selected ? index : found, 0);
  const regionBar = container.querySelector<HTMLElement>(".campaign-regions")!;
  const route = container.querySelector<HTMLElement>(".campaign-route")!;
  function renderMap() {
    regionBar.innerHTML = CHAPTERS.map((chapter, index) => `<button data-region="${index}" aria-pressed="${index === region}" class="${index === region ? "selected" : ""}"><b>0${index + 1}</b><small>${chapter.title}</small></button>`).join("");
    const first = MISSIONS.findIndex(m => m.id === CHAPTERS[region].firstMission);
    const end = region + 1 < CHAPTERS.length ? MISSIONS.findIndex(m => m.id === CHAPTERS[region + 1].firstMission) : MISSIONS.length;
    const missions = MISSIONS.slice(first, end);
    const positions = missions.map((_, i) => ({ x: i % 2 === 0 ? 25 : 75, y: 15 + Math.floor(i / 2) * 34 }));
    route.dataset.region = String(region);
    route.innerHTML = `<div class="route-landscape" aria-hidden="true"><i></i><i></i><i></i></div><svg class="route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${positions.map(p => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#fff0b9" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="2 2"/></svg>${missions.map((mission, i) => {
      const index = first + i, best = progress[mission.id], unlocked = missionUnlocked(index, progress);
      return `<button data-route-mission="${index}" class="route-node ${best ? "won" : unlocked ? "available" : "locked"} ${selected === index ? "selected" : ""}" style="left:${positions[i].x}%;top:${positions[i].y}%" aria-pressed="${selected === index}" aria-label="${mission.name}, ${best ? `${best.stars} Sterne` : unlocked ? "verfügbar" : "gesperrt"}"><b>${unlocked ? String(index + 1).padStart(2, "0") : "◇"}</b><span>${mission.name}</span><small>${best ? "★".repeat(best.stars) + "☆".repeat(3 - best.stars) : index === nextIndex ? "NÄCHSTE FRONT" : unlocked ? "BEREIT" : "GESPERRT"}</small></button>`;
    }).join("")}`;
    list.querySelectorAll<HTMLElement>("[data-mission]").forEach(card => card.hidden = card.dataset.mission !== MISSIONS[selected].id);
    regionBar.querySelectorAll<HTMLButtonElement>("[data-region]").forEach(button => button.onclick = () => {
      region = Number(button.dataset.region);
      selected = MISSIONS.findIndex(m => m.id === CHAPTERS[region].firstMission);
      renderMap();
      regionBar.querySelector<HTMLButtonElement>(`[data-region="${region}"]`)!.focus({ preventScroll: true });
    });
    route.querySelectorAll<HTMLButtonElement>("[data-route-mission]").forEach(button => button.onclick = () => {
      selected = Number(button.dataset.routeMission);
      renderMap();
      route.querySelector<HTMLButtonElement>(`[data-route-mission="${selected}"]`)!.focus({ preventScroll: true });
    });
  }
  renderMap();
  const close = container.querySelector<HTMLButtonElement>("#campaign-close")!;
  close.onclick = onClose;
  close.focus({ preventScroll: true });
}
