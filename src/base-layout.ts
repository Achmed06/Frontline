/** Compact, portable plot positions. Old saves receive a deterministic layout on display. */
export const BASE_ROOTS = ["depot", "training", "relay", "workshop", "honor"] as const;
export type BaseRoot = typeof BASE_ROOTS[number];
export type BaseLayout = Partial<Record<BaseRoot, number>>;
export type BaseFacing = 0 | 1;
export type BaseFacings = Partial<Record<BaseRoot, BaseFacing>>;
export const BASE_PLOT_COUNT = 25;
export const COMMAND_PLOT = 12;
export const DEFAULT_PLOTS: Record<BaseRoot, number> = {
  depot: 6, training: 8, relay: 3, workshop: 16, honor: 18,
};
export function validPlot(plot: unknown): plot is number {
  return typeof plot === "number" && Number.isInteger(plot) &&
    plot >= 0 && plot < BASE_PLOT_COUNT && plot !== COMMAND_PLOT;
}
export function normalizeBaseLayout(value: unknown, built: readonly string[]): BaseLayout {
  const layout: BaseLayout = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return layout;
  const used = new Set<number>();
  for (const id of BASE_ROOTS) {
    const plot = (value as BaseLayout)[id];
    if (built.includes(id) && validPlot(plot) && !used.has(plot)) {
      layout[id] = plot;
      used.add(plot);
    }
  }
  return layout;
}

/** Facing 0 is the default and omitted from saves; only explicit mirrored roots persist. */
export function normalizeBaseFacings(
  value: unknown,
  built: readonly string[],
): BaseFacings {
  const facings: BaseFacings = {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    return facings;
  for (const id of BASE_ROOTS)
    if (
      built.includes(id) &&
      (value as Record<string, unknown>)[id] === 1
    )
      facings[id] = 1;
  return facings;
}

export function baseFacing(
  facings: BaseFacings | undefined,
  root: BaseRoot,
): BaseFacing {
  return facings?.[root] === 1 ? 1 : 0;
}

export type BaseRoadEdge = readonly [number, number];

export function baseRoadRoute(plot: number): number[] {
  if (!validPlot(plot)) return [];
  const route = [plot];
  let current = plot;
  let row = Math.floor(current / 5);
  let col = current % 5;
  const targetRow = Math.floor(COMMAND_PLOT / 5);
  const targetCol = COMMAND_PLOT % 5;
  while (col !== targetCol) {
    const nextCol = col + Math.sign(targetCol - col);
    current = row * 5 + nextCol;
    col = nextCol;
    route.push(current);
  }
  while (row !== targetRow) {
    const nextRow = row + Math.sign(targetRow - row);
    current = nextRow * 5 + col;
    row = nextRow;
    route.push(current);
  }
  return route;
}

/** Deterministic road graph from every built root to the fixed command plot. */
export function baseRoadEdges(layout: BaseLayout): BaseRoadEdge[] {
  const edges = new Map<string, BaseRoadEdge>();
  const add = (a: number, b: number) => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    edges.set(`${low}-${high}`, [low, high]);
  };
  for (const plot of Object.values(layout)) {
    const route = baseRoadRoute(plot ?? -1);
    for (let index = 0; index < route.length - 1; index++)
      add(route[index], route[index + 1]);
  }
  return [...edges.values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  );
}
export function resolvedBaseLayout(built: readonly string[], saved?: BaseLayout): BaseLayout {
  const layout = normalizeBaseLayout(saved, built);
  const used = new Set(Object.values(layout));
  for (const id of BASE_ROOTS) {
    if (!built.includes(id) || layout[id] !== undefined) continue;
    let plot = DEFAULT_PLOTS[id];
    if (used.has(plot)) plot = Array.from({ length: BASE_PLOT_COUNT }, (_, i) => i)
      .find(i => validPlot(i) && !used.has(i))!;
    layout[id] = plot;
    used.add(plot);
  }
  return layout;
}
