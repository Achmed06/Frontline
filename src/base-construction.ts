import { BASE_PROJECTS, buildBaseProject, type LearningProgress, type BaseProjectId, type BaseProjectMetrics } from "./headquarters";
import { resolvedBaseLayout, validPlot, type BaseRoot } from "./base-layout";

export function projectRoot(id: BaseProjectId): BaseRoot {
  const project = BASE_PROJECTS.find(p => p.id === id)!;
  return (project.requires ?? id) as BaseRoot;
}
export function visibleProject(progress: LearningProgress, root: BaseRoot): BaseProjectId {
  return BASE_PROJECTS.find(p => p.requires === root && progress.projects?.includes(p.id))?.id ?? root;
}
/** New buildings use a free plot; expansions stay on their predecessor's plot. */
export function constructOnPlot(progress: LearningProgress, id: BaseProjectId, plot: number, metrics: BaseProjectMetrics): LearningProgress {
  if (!validPlot(plot)) return progress;
  const root = projectRoot(id);
  const layout = resolvedBaseLayout(progress.projects ?? [], progress.layout);
  const project = BASE_PROJECTS.find(p => p.id === id)!;
  if (project.requires && layout[root] !== plot) return progress;
  if (Object.entries(layout).some(([key, value]) => key !== root && value === plot)) return progress;
  const built = buildBaseProject(progress, id, metrics);
  if (built === progress) return progress;
  return { ...built, layout: { ...layout, [root]: plot } };
}
export function moveBaseBuilding(progress: LearningProgress, root: BaseRoot, plot: number): LearningProgress {
  if (!progress.projects?.includes(root) || !validPlot(plot)) return progress;
  const layout = resolvedBaseLayout(progress.projects, progress.layout);
  if (layout[root] === plot || Object.values(layout).includes(plot)) return progress;
  return { ...progress, layout: { ...layout, [root]: plot } };
}
