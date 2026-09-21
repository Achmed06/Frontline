import { BASE_PROJECTS, type LearningProgress, type BaseProjectId } from "./headquarters";
import {
  BASE_PLOT_COUNT,
  BASE_ROOTS,
  COMMAND_PLOT,
  baseFacing,
  baseRoadEdges,
  baseRoadRoute,
  resolvedBaseLayout,
  type BaseRoot,
} from "./base-layout";
import { visibleProject } from "./base-construction";

export function plotPosition(plot: number) {
  return { x: 280 + ((plot % 5) - Math.floor(plot / 5)) * 49, y: 93 + ((plot % 5) + Math.floor(plot / 5)) * 25 };
}
/** Original vector buildings, kept sharp at every map zoom level. */
export function buildingArt(id: BaseProjectId | "command", accent: string): string {
  const box = (x: number, y: number, w: number, d: number, h: number, roof = "#63838d") =>
    `<g transform="translate(${x} ${y})"><path d="M0 0 ${w} ${w / 2} ${w} ${w / 2 - h} 0 ${-h}Z" fill="#2d454a"/><path d="M${w} ${w / 2} ${w + d} ${(w - d) / 2} ${w + d} ${(w - d) / 2 - h} ${w} ${w / 2 - h}Z" fill="#192f35"/><path d="M0 ${-h} ${d} ${-d / 2 - h} ${w + d} ${(w - d) / 2 - h} ${w} ${w / 2 - h}Z" fill="${roof}" stroke="#b2c9ba" stroke-width=".7"/><path d="M3 ${4 - h} ${w - 3} ${w / 2 - h + 1}" stroke="${accent}" stroke-width="2"/><path d="M${w + 4} ${w / 2 - 7} ${w + d - 4} ${(w - d) / 2 - 3}" stroke="#d9bd6f" stroke-width="2"/></g>`;
  const mast = (x: number, y: number, height: number) => `<g transform="translate(${x} ${y})"><path d="M-9 3 0 ${-height} 9 3M-5-14h10M-3-28h6" stroke="#b5c9c0" stroke-width="3" fill="none"/><ellipse cy="${-height}" rx="13" ry="5" fill="#22414a" stroke="${accent}" stroke-width="2"/><circle cy="${-height - 3}" r="3" fill="${accent}" class="base-beacon"/></g>`;
  const pad = `<path d="M-34 0 0-17 34 0 0 17Z" fill="#587269" stroke="#bac6a1"/><path d="M-27 0 0-13 27 0 0 13Z" fill="none" stroke="#dfc17c" stroke-dasharray="3 3"/>`;
  const flag = `<path d="M0 0v-30" stroke="#dbca96" stroke-width="2"/><path d="M1-30h14l-4 6 4 6H1" fill="${accent}"/>`;
  const root = BASE_PROJECTS.find(p => p.id === id)?.requires ?? id;
  const tier = root !== id;
  let structure = "";
  if (root === "command") structure = box(-34, -1, 35, 33, 31, "#9aa9a0") + box(-16, -9, 18, 18, 44, "#d1cbbb") + mast(23, -12, 54) + `<path d="M-9-34 0-39 9-34 0-29Z" fill="${accent}"/><path d="M0 13v-17" stroke="#0c2028" stroke-width="9"/>`;
  if (root === "depot") structure = box(-32, 0, 26, 23, 20, "#c3a36c") + box(5, 12, 16, 18, 14, "#7f9b8b") + `<path d="M-24-17v14m8-10V1m29 0v12" stroke="#6b5e40" stroke-width="2"/>` + (tier ? `<path d="M-24 5v-63l50 24M-24-55 10-37M18-39v23" fill="none" stroke="#e4bf68" stroke-width="4"/><path d="m13-15 5 4 5-4" stroke="#d6e0cc" fill="none"/>` : "");
  if (root === "training") structure = pad + `<circle cx="12" cy="-7" r="7" fill="#29443c" stroke="#e9ba6c" stroke-width="2"/><circle cx="12" cy="-7" r="3" fill="#e9ba6c"/><path d="M12 0v9" stroke="#d6cc9e" stroke-width="2"/><g fill="${accent}" stroke="#1e3639"><circle cx="-12" cy="-8" r="4"/><path d="M-17 5v-8h10v8m-8 0-2 7m8-7 2 7" stroke-width="3"/></g>` + (tier ? box(-29, -13, 25, 24, 32, "#a5b6a0") : "");
  if (root === "relay") structure = box(-19, 6, 21, 18, 13) + mast(0, -4, tier ? 70 : 51) + (tier ? `<path d="M-16-54 0-62 16-54 0-46Z" fill="#bcc7ad" stroke="${accent}"/><path d="M-13-55v12m26-12v12" stroke="#cddfd1" stroke-width="3"/>` : "");
  if (root === "workshop") structure = box(-34, -1, 37, 28, 23, "#7e9492") + `<path d="M-25-12v13m8-9v13" stroke="#e7bb60" stroke-width="3"/><path d="M9 7 25-1v-15L9-8Z" fill="#0f252b"/><path d="m12-6 10-5" stroke="${accent}"/>` + (tier ? `<g transform="translate(0 -41)"><path d="M-23 0h46M-15-8 15 8M-15 8 15-8" stroke="#cbd9d3" stroke-width="3"/><ellipse cx="-23" rx="8" ry="3" fill="#1c3238" stroke="${accent}"/><ellipse cx="23" rx="8" ry="3" fill="#1c3238" stroke="${accent}"/><path d="M-7-5h14v10H-7Z" fill="#b5c8ba"/></g>` : "");
  if (root === "honor") structure = pad + `<g transform="translate(-21 -2)">${flag}</g><g transform="translate(21 -2)">${flag}</g>` + (tier ? `<path d="M-9 4 0-43 9 4 0 9Z" fill="#d2b575" stroke="#ffdf9d"/><path d="m0-47 7 9-7 8-7-8Z" fill="${accent}"/>` : `<path d="M-7 0 0-14 7 0 0 6Z" fill="#e2be75"/>`);
  return `<ellipse cy="10" rx="37" ry="16" fill="#081c20" opacity=".27"/>${structure}`;
}
export function baseMapSvg(progress: LearningProgress, accent: string, options: {
  selected?: BaseRoot; placing?: boolean; chosen?: number; ghost?: BaseProjectId; interactive?: boolean; stage?: number;
} = {}): string {
  const { selected, placing = false, chosen, ghost, interactive = true, stage = 0 } = options;
  const layout = resolvedBaseLayout(progress.projects ?? [], progress.layout);
  const roadEdges = baseRoadEdges(layout);
  const roadNodes = [...new Set(roadEdges.flat())];
  const roads = roadEdges.length
    ? `<g class="base-roads" pointer-events="none">${roadEdges.map(([a, b]) => {
        const start = plotPosition(a);
        const end = plotPosition(b);
        return `<path d="M${start.x} ${start.y}L${end.x} ${end.y}" stroke="#344b45" stroke-width="17" stroke-linecap="round"/><path d="M${start.x} ${start.y}L${end.x} ${end.y}" stroke="#77816c" stroke-width="11" stroke-linecap="round"/><path d="M${start.x} ${start.y}L${end.x} ${end.y}" stroke="#d7c37d" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="5 7" opacity=".58"/>`;
      }).join("")}${roadNodes.map(plot => {
        const point = plotPosition(plot);
        return `<circle cx="${point.x}" cy="${point.y}" r="6" fill="#6d795f" stroke="#303f39" stroke-width="2"/>`;
      }).join("")}</g>`
    : "";
  const activeRoots = BASE_ROOTS.filter(
    (root) => layout[root] !== undefined,
  ).slice(0, 3);
  const traffic = activeRoots.length
    ? `<g class="base-traffic" pointer-events="none" aria-hidden="true">${activeRoots.map((root, index) => {
        const route = baseRoadRoute(layout[root]!);
        const path = route.map((plot, step) => {
          const point = plotPosition(plot);
          return `${step ? "L" : "M"}${point.x} ${point.y}`;
        }).join("");
        const duration = (4.4 + route.length * 0.35 + index * 0.55).toFixed(2);
        const delay = (index * 1.15).toFixed(2);
        return `<g class="base-convoy"><ellipse cx="0" cy="4" rx="9" ry="4" fill="#0b1e20" opacity=".35"/><rect x="-7" y="-5" width="14" height="9" rx="2" fill="#c9b66f" stroke="#f4e2a4" stroke-width="1"/><rect x="-4" y="-3" width="5" height="4" rx="1" fill="${accent}" opacity=".9"/><circle cx="-4" cy="5" r="2" fill="#1a2d2d"/><circle cx="4" cy="5" r="2" fill="#1a2d2d"/><animateMotion path="${path}" dur="${duration}s" begin="-${delay}s" repeatCount="indefinite" rotate="auto"/></g>`;
      }).join("")}</g>`
    : "";
  const plots = Array.from({ length: BASE_PLOT_COUNT }, (_, plot) => plot).sort((a, b) => plotPosition(a).y - plotPosition(b).y || a - b).map(plot => {
    const { x, y } = plotPosition(plot);
    const root = (Object.keys(layout) as BaseRoot[]).find(id => layout[id] === plot);
    const id = root ? visibleProject(progress, root) : undefined;
    const name = id ? BASE_PROJECTS.find(p => p.id === id)!.name : plot === COMMAND_PLOT ? "Kommandozentrale" : `Bauplatz ${plot + 1}`;
    const selectedPlot = root === selected && selected !== undefined || plot === chosen;
    const facingTransform =
      root && baseFacing(progress.facings, root) === 1
        ? ' transform="scale(-1 1)"'
        : "";
    const art =
      plot === COMMAND_PLOT
        ? buildingArt("command", accent) +
          (stage >= 2
            ? `<g transform="translate(-26 11) scale(.45)">${buildingArt("depot", accent)}</g>`
            : "") +
          (stage >= 4
            ? `<g transform="translate(26 11) scale(.45)">${buildingArt("relay", accent)}</g>`
            : "") +
          (stage >= 6
            ? `<path d="M-35 12 0 30 35 12" fill="none" stroke="#f2d286" stroke-width="3"/>`
            : "")
        : id
          ? `<g${facingTransform}>${buildingArt(id, accent)}</g>`
          : plot === chosen && ghost
            ? `<g opacity=".6">${buildingArt(ghost, accent)}</g>`
            : "";
    return `<g class="base-plot ${root ? "occupied" : "empty"} ${selectedPlot ? "selected" : ""}" data-plot="${plot}" transform="translate(${x} ${y})" ${interactive ? `role="button" tabindex="0" aria-label="${name}${root ? (id === root ? ', Stufe 1' : ', Stufe 2') : ''}" aria-pressed="${selectedPlot}"` : ''}><path class="plot-ground" d="M-46 0 0-23 46 0 0 23Z" fill="${root || plot === COMMAND_PLOT ? '#647967' : (plot % 2 ? '#588069' : '#5e876c')}" stroke="${selectedPlot ? accent : '#9bb08a'}" stroke-opacity="${selectedPlot ? 1 : .22}" stroke-width="${selectedPlot ? 3 : 1}"/>${!root && plot !== COMMAND_PLOT ? `<path d="M-6 0h12M0-4v8" stroke="${placing ? accent : '#bdd5aa'}" stroke-width="2" opacity="${placing ? .9 : .35}"/>` : ""}${art}${root ? `<g transform="translate(0 21)"><rect x="-13" y="-5" width="26" height="12" rx="4" fill="#102e32" stroke="${accent}" stroke-width=".6"/><text text-anchor="middle" y="4" fill="#eaf2d6" font-size="8" font-family="sans-serif">${id === root ? 'I' : 'II'}</text></g>` : ""}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 380" class="base-world" role="group" aria-label="Deine Basis mit 25 Feldern. Gebäude oder freie Bauplätze antippen."><defs><linearGradient id="base-water" x2="0" y2="1"><stop stop-color="#214a55"/><stop offset="1" stop-color="#0e2c36"/></linearGradient></defs><rect width="560" height="380" fill="url(#base-water)"/><path d="m0 280 130-60m-80 130 160-80m225-210 115-55m-95 235 95-45" stroke="#90ccc3" stroke-opacity=".12" stroke-width="2"/><ellipse cx="280" cy="236" rx="268" ry="110" fill="#061e25" opacity=".35"/><path d="M13 197 280 332 547 197v21L280 357 13 218Z" fill="#334847"/><path d="M13 197 280 60 547 197 280 337Z" fill="#91a285" stroke="#bfd0a2" stroke-width="3"/><path d="M34 197 280 72 526 197 280 323Z" fill="#aeae83"/>${roads}${traffic}${plots}<g fill="#365745" stroke="#799468"><path d="m29 245 12-33 12 33Z"/><path d="m492 125 12-33 12 33Z"/><path d="m473 115 10-26 10 26Z"/><path d="m63 138 11-30 11 30Z"/></g><path d="m244 342 36 18 36-18" fill="none" stroke="${accent}" stroke-width="3" opacity=".65"/></svg>`;
}
