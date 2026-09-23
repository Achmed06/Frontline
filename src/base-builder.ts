import { BASE_PROJECTS, BASE_STAGES, baseStage, baseProjectProgress, type BaseProjectId, type BaseProjectMetrics, type LearningProgress } from "./headquarters";
import {
  BASE_ROOTS,
  COMMAND_PLOT,
  baseFacing,
  resolvedBaseLayout,
  type BaseRoot,
} from "./base-layout";
import {
  canConstructOnPlot,
  canMoveBaseBuilding,
  constructOnPlot,
  moveBaseBuilding,
  projectRoot,
  rotateBaseBuilding,
  visibleProject,
} from "./base-construction";
import { baseMapSvg, buildingArt } from "./base-map";
import { basePlacementVisual } from "./base-placement-visual";
import "./base-builder.css";

type BuilderOptions = {
  progress: () => LearningProgress;
  metrics: BaseProjectMetrics;
  accent: string;
  commit: (next: LearningProgress) => boolean;
  close: () => void;
  details: () => void;
  initial?: BaseProjectId;
};
const metricNames = { wins: "Feldzugsiege", stars: "Kampagnensterne", mastery: "Mastery-Punkte", lessons: "Lernaufträge" };
export function renderBaseBuilder(container: HTMLElement, options: BuilderOptions) {
  let selected: BaseProjectId = options.initial ?? visibleProject(options.progress(), "depot");
  let mode: "inspect" | "place" | "move" = "inspect";
  let chosen: number | undefined;
  let zoom = false;
  let message = "";
  let justBuilt = false;
  function draw(focus?: string) {
    const previousMapScroll =
      container.querySelector<HTMLElement>(".builder-map-scroll");
    const previousScrollLeft = previousMapScroll?.scrollLeft ?? 0;
    const previousScrollTop = previousMapScroll?.scrollTop ?? 0;
    const progress = options.progress();
    const layout = resolvedBaseLayout(progress.projects ?? [], progress.layout);
    const project = BASE_PROJECTS.find(p => p.id === selected)!;
    const root = projectRoot(selected);
    const built = progress.projects?.includes(selected) ?? false;
    const upgrade = BASE_PROJECTS.find(p => p.requires === root);
    const status = baseProjectProgress(selected, options.metrics);
    const prerequisite = !project.requires || !!progress.projects?.includes(project.requires);
    const ready = status.ready && prerequisite;
    const isExpansion = project.requires !== null;
    const canPlace =
      chosen !== undefined &&
      (mode === "move"
        ? canMoveBaseBuilding(progress, root, chosen)
        : canConstructOnPlot(progress, selected, chosen, options.metrics));
    const placement = basePlacementVisual(
      progress,
      selected,
      options.metrics,
      mode,
      chosen,
    );
    const tier = built ? (isExpansion ? 2 : 1) : 0;
    container.innerHTML = `<section class="base-builder" style="--base-accent:${options.accent}">
      <header class="builder-header"><div><span class="builder-eyebrow">FRONTLINE / HAUPTQUARTIER</span><h2>${BASE_STAGES[baseStage(options.metrics.wins)].name}</h2></div><button class="builder-close" data-action="close" aria-label="Zurück zur Lobby">×</button></header>
      <div class="builder-resources"><span><b>${Object.keys(layout).length}<small>/5</small></b>GEBÄUDE</span><span><b>${options.metrics.wins}</b>FELDZUGSIEGE</span><span><b>${options.metrics.stars} ★</b>STERNE</span><button data-action="details">GESTALTUNG<br>& ERFOLGE ↗</button></div>
      <div class="builder-map-shell ${mode !== 'inspect' ? 'editing' : ''} ${placement.chosenValid === true ? 'placement-confirmable' : placement.chosenValid === false ? 'placement-rejected' : ''} ${justBuilt ? 'construction-complete' : ''}"><div class="builder-map-hint">${mode === 'move' ? 'NEUEN BAUPLATZ ANTIPPEN' : mode === 'place' ? isExpansion ? 'AUSBAU AM BESTEHENDEN GEBÄUDE' : 'FREIEN BAUPLATZ ANTIPPEN' : chosen !== undefined ? `BAUPLATZ ${chosen + 1} VORGEMERKT · GEBÄUDE WÄHLEN` : 'DEINE BASIS · GEBÄUDE ANTIPPEN'}</div><div class="builder-map-scroll"><div class="builder-map-scale ${zoom ? 'zoomed' : ''}">${baseMapSvg(progress, options.accent, { selected: built ? root : undefined, placing: mode !== 'inspect', chosen, ghost: mode === 'place' ? selected : undefined, stage: baseStage(options.metrics.wins), placementStates: placement.states })}</div></div><button class="builder-zoom" data-action="zoom" aria-label="${zoom ? 'Karte verkleinern' : 'Karte vergrößern'}">${zoom ? '−' : '+'}</button><span class="builder-map-caption">${mode === 'inspect' && chosen !== undefined ? `BAUPLATZ ${chosen + 1} VORGEMERKT` : zoom ? 'ZUM VERSCHIEBEN WISCHEN' : 'SEKTOR 01 / HEIMATFRONT'}</span></div>
      <div class="builder-catalog" aria-label="Gebäude auswählen">${BASE_ROOTS.map(id => {
        const shown = visibleProject(progress, id);
        const owned = progress.projects?.includes(id);
        const available = baseProjectProgress(id, options.metrics).ready;
        return `<button data-building="${shown}" class="${root === id ? 'selected' : ''}" aria-pressed="${root === id}"><svg viewBox="-48 -85 96 115" aria-hidden="true">${buildingArt(shown, options.accent)}</svg><b>${id === 'depot' ? 'DEPOT' : id === 'training' ? 'TRAINING' : id === 'relay' ? 'SIGNAL' : id === 'workshop' ? 'WERKSTATT' : 'EHRENHOF'}</b><small>${owned ? shown === id ? 'STUFE 1' : 'STUFE 2' : available ? 'BAUBEREIT' : 'GESPERRT'}</small></button>`;
      }).join('')}</div>
      <article class="builder-inspector"><div class="builder-inspector-title"><div><span class="builder-eyebrow">${mode === 'move' ? 'GEBÄUDE VERSETZEN' : built ? `GEBAUT / STUFE ${tier}` : isExpansion ? 'AUSBAU / STUFE 2' : 'BAUPROJEKT / STUFE 1'}</span><h3>${project.name}</h3></div><span class="builder-level">${built ? '0' + tier : '+'}</span></div><p>${project.description}</p>
      ${!built ? `<div class="builder-requirement"><span>${metricNames[project.metric]}</span><b>${Math.min(status.current, status.goal)} / ${status.goal}</b><i><em style="width:${Math.min(100, status.current / status.goal * 100)}%"></em></i></div>${!prerequisite ? `<p>Zuerst ${BASE_PROJECTS.find(p => p.id === project.requires)!.name} bauen.</p>` : ''}` : `<p class="builder-location">BAUPLATZ ${(layout[root] ?? 0) + 1} · AUSRICHTUNG ${baseFacing(progress.facings, root) === 1 ? '↖' : '↗'} · DAUERHAFT GESPEICHERT</p>`}
      <div class="builder-actions">${mode !== 'inspect' ? `<button class="primary" data-action="confirm" ${!canPlace || mode === 'place' && !ready ? 'disabled' : ''}>${mode === 'move' ? 'HIER PLATZIEREN' : isExpansion ? 'AUSBAU BESTÄTIGEN' : 'HIER BAUEN'}${chosen === undefined ? '' : ` · FELD ${chosen + 1}`}</button><button class="secondary" data-action="cancel">Abbrechen</button>` : built ? `<button class="secondary" data-action="move">VERSETZEN</button><button class="secondary" data-action="rotate" aria-label="${project.name} drehen">DREHEN ↻</button>${upgrade && !progress.projects?.includes(upgrade.id) ? '<button class="primary" data-action="upgrade">AUSBAU ↗</button>' : '<span class="builder-max">MAX ✓</span>'}` : `<button class="primary" data-action="place" ${!ready ? 'disabled' : ''}>${ready ? isExpansion ? 'AUSBAU VORBEREITEN' : 'BAUPLATZ WÄHLEN ↗' : 'SPIELZIEL NOCH OFFEN'}</button>`}</div>
      <p class="builder-feedback" role="status" aria-live="polite">${message || (mode !== 'inspect' ? 'Erst mit Bestätigung wird deine Basis geändert.' : 'Bauen und Versetzen sind kostenlos. Freischaltungen verdienst du im Spiel.')}</p></article>
      <p class="builder-fairplay">Deine Basis, dein Aufbau. Gleiche Kampfwerte für alle.</p></section>`;
    container.querySelectorAll<HTMLElement>('[data-building]').forEach(button => button.onclick = () => {
      const rememberedPlot = chosen;
      selected = button.dataset.building as BaseProjectId;
      const nextProgress = options.progress();
      const selectedRoot = projectRoot(selected);
      const rootBuilt = nextProgress.projects?.includes(selectedRoot) ?? false;
      justBuilt = false;
      if (
        rememberedPlot !== undefined &&
        canConstructOnPlot(
          nextProgress,
          selected,
          rememberedPlot,
          options.metrics,
        )
      ) {
        mode = "place";
        chosen = rememberedPlot;
        message = `Bauplatz ${rememberedPlot + 1} ist vorgemerkt. Mit Bestätigung wird das Gebäude dort gebaut.`;
      } else {
        mode = "inspect";
        chosen = rememberedPlot !== undefined && !rootBuilt
          ? rememberedPlot
          : undefined;
        message = chosen !== undefined
          ? `Bauplatz ${chosen + 1} bleibt vorgemerkt. Wähle ein baubereites Gebäude.`
          : "";
      }
      draw(`[data-building="${selected}"]`);
    });
    container.querySelectorAll<SVGElement>('[data-plot]').forEach(plot => {
      const activate = () => {
        const value = Number(plot.dataset.plot);
        if (value === COMMAND_PLOT) { chosen = undefined; message = 'Deine Kommandozentrale wächst mit deinen Feldzugsiegen und bleibt in der Mitte.'; draw('[data-plot="12"]'); return; }
        const occupant = BASE_ROOTS.find(id => layout[id] === value);
        if (mode !== 'inspect') {
          if (occupant && !(occupant === root && isExpansion && mode === 'place')) { message = 'Dieser Bauplatz ist bereits belegt. Wähle ein freies Feld.'; draw(`[data-plot="${value}"]`); return; }
          if (mode === 'place' && isExpansion && value !== layout[root]) { message = 'Der Ausbau bleibt am bisherigen Standort. Versetzen ist nach dem Ausbau möglich.'; draw(`[data-plot="${value}"]`); return; }
          chosen = value; message = ''; draw('[data-action="confirm"]');
        } else if (occupant) {
          chosen = undefined;
          selected = visibleProject(progress, occupant);
          message = "";
          draw(`[data-building="${selected}"]`);
        } else {
          chosen = value;
          message = `Bauplatz ${value + 1} ist vorgemerkt. Wähle unten ein baubereites Gebäude.`;
          draw(`[data-plot="${value}"]`);
        }
      };
      plot.onclick = activate;
      plot.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } };
    });
    container.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.onclick = () => {
      const action = button.dataset.action;
      if (action === 'close') return options.close();
      if (action === 'details') return options.details();
      if (action === 'zoom') { zoom = !zoom; draw('[data-action="zoom"]'); return; }
      if (action === 'cancel') { mode = 'inspect'; chosen = undefined; message = ''; }
      if (action === 'upgrade' && upgrade) { selected = upgrade.id; message = ''; }
      if (action === 'place') { mode = 'place'; chosen = isExpansion ? layout[root] : chosen; message = ''; }
      if (action === 'move') { mode = 'move'; chosen = undefined; message = ''; }
      if (action === 'rotate') {
        const current = options.progress();
        const next = rotateBaseBuilding(current, root);
        if (next === current) {
          message = 'Dieses Gebäude kann noch nicht gedreht werden.';
          draw();
          return;
        }
        if (!options.commit(next)) {
          message = 'Speichern nicht möglich. Die bisherige Ausrichtung bleibt erhalten.';
          draw();
          return;
        }
        message = `${project.name} gedreht und gespeichert.`;
        justBuilt = false;
      }
      if (action === 'confirm' && chosen !== undefined) {
        const current = options.progress();
        const next = mode === 'move' ? moveBaseBuilding(current, root, chosen) : constructOnPlot(current, selected, chosen, options.metrics);
        if (next === current) { message = 'Dieser Bau ist hier nicht möglich. Wähle einen freien Bauplatz.'; draw(); return; }
        if (!options.commit(next)) { message = 'Speichern nicht möglich. Deine bisherige Basis bleibt erhalten. Bitte Speicherplatz prüfen und erneut versuchen.'; draw(); return; }
        message = mode === 'move' ? `${project.name} versetzt und gespeichert.` : `${project.name} ${isExpansion ? 'ausgebaut' : 'gebaut'} und gespeichert.`;
        justBuilt = mode === 'place'; mode = 'inspect'; chosen = undefined;
      }
      draw(mode === 'inspect' ? `[data-building="${selected}"]` : '[data-action="cancel"]');
    });
    const mapScroll =
      container.querySelector<HTMLElement>(".builder-map-scroll");
    if (mapScroll) {
      mapScroll.scrollLeft = Math.min(
        previousScrollLeft,
        Math.max(0, mapScroll.scrollWidth - mapScroll.clientWidth),
      );
      mapScroll.scrollTop = Math.min(
        previousScrollTop,
        Math.max(0, mapScroll.scrollHeight - mapScroll.clientHeight),
      );
    }
    if (focus) container.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  }
  draw();
  container.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus({ preventScroll: true });
}
