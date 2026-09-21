/** Compact, portable plot positions. Old saves receive a deterministic layout on display. */
export const BASE_ROOTS = ["depot", "training", "relay", "workshop", "honor"] as const;
export type BaseRoot = typeof BASE_ROOTS[number];
export type BaseLayout = Partial<Record<BaseRoot, number>>;
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
