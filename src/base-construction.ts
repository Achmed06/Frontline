import {
  BASE_PROJECTS,
  buildBaseProject,
  type LearningProgress,
  type BaseProjectId,
  type BaseProjectMetrics,
} from "./headquarters";
import {
  BASE_ROOTS,
  baseFacing,
  resolvedBaseLayout,
  validPlot,
  type BaseRoot,
} from "./base-layout";

export function projectRoot(id: BaseProjectId): BaseRoot {
  const project = BASE_PROJECTS.find((p) => p.id === id)!;
  return (project.requires ?? id) as BaseRoot;
}

export function visibleProject(
  progress: LearningProgress,
  root: BaseRoot,
): BaseProjectId {
  return (
    BASE_PROJECTS.find(
      (p) => p.requires === root && progress.projects?.includes(p.id),
    )?.id ?? root
  );
}

export function basePlotOccupant(
  progress: LearningProgress,
  plot: number,
): BaseRoot | undefined {
  if (!validPlot(plot)) return undefined;
  const layout = resolvedBaseLayout(
    progress.projects ?? [],
    progress.layout,
  );
  return BASE_ROOTS.find((root) => layout[root] === plot);
}

export function canConstructOnPlot(
  progress: LearningProgress,
  id: BaseProjectId,
  plot: number,
  metrics: BaseProjectMetrics,
): boolean {
  if (!validPlot(plot)) return false;
  const root = projectRoot(id);
  const layout = resolvedBaseLayout(
    progress.projects ?? [],
    progress.layout,
  );
  const project = BASE_PROJECTS.find((p) => p.id === id)!;
  if (project.requires && layout[root] !== plot) return false;
  if (
    Object.entries(layout).some(
      ([key, value]) => key !== root && value === plot,
    )
  )
    return false;
  return buildBaseProject(progress, id, metrics) !== progress;
}

export function canMoveBaseBuilding(
  progress: LearningProgress,
  root: BaseRoot,
  plot: number,
): boolean {
  if (!progress.projects?.includes(root) || !validPlot(plot)) return false;
  const layout = resolvedBaseLayout(progress.projects, progress.layout);
  return layout[root] !== plot && !Object.values(layout).includes(plot);
}

/** New buildings use a free plot; expansions stay on their predecessor's plot. */
export function constructOnPlot(
  progress: LearningProgress,
  id: BaseProjectId,
  plot: number,
  metrics: BaseProjectMetrics,
): LearningProgress {
  if (!canConstructOnPlot(progress, id, plot, metrics)) return progress;
  const root = projectRoot(id);
  const layout = resolvedBaseLayout(
    progress.projects ?? [],
    progress.layout,
  );
  const built = buildBaseProject(progress, id, metrics);
  if (built === progress) return progress;
  return { ...built, layout: { ...layout, [root]: plot } };
}

export function moveBaseBuilding(
  progress: LearningProgress,
  root: BaseRoot,
  plot: number,
): LearningProgress {
  if (!canMoveBaseBuilding(progress, root, plot)) return progress;
  const layout = resolvedBaseLayout(progress.projects!, progress.layout);
  return { ...progress, layout: { ...layout, [root]: plot } };
}

export function rotateBaseBuilding(
  progress: LearningProgress,
  root: BaseRoot,
): LearningProgress {
  if (!progress.projects?.includes(root)) return progress;
  const facings = { ...(progress.facings ?? {}) };
  if (baseFacing(progress.facings, root) === 0) facings[root] = 1;
  else delete facings[root];
  return {
    ...progress,
    ...(Object.keys(facings).length ? { facings } : { facings: undefined }),
  };
}
