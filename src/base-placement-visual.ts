import {
  BASE_PROJECTS,
  type BaseProjectId,
  type BaseProjectMetrics,
  type LearningProgress,
} from "./headquarters";
import {
  BASE_PLOT_COUNT,
  BASE_ROOTS,
  COMMAND_PLOT,
  resolvedBaseLayout,
  type BaseRoot,
} from "./base-layout";
import {
  canConstructOnPlot,
  canMoveBaseBuilding,
  projectRoot,
} from "./base-construction";

export type BasePlacementMode = "inspect" | "place" | "move";
export type BasePlotPresentation =
  | "idle"
  | "command"
  | "occupied"
  | "source"
  | "valid"
  | "required"
  | "blocked"
  | "chosen-valid"
  | "chosen-invalid";

export type BasePlacementVisual = {
  states: readonly BasePlotPresentation[];
  validCount: number;
  chosenValid: boolean | null;
};

export function basePlacementVisual(
  progress: LearningProgress,
  selected: BaseProjectId,
  metrics: BaseProjectMetrics,
  mode: BasePlacementMode,
  chosen?: number,
): BasePlacementVisual {
  const layout = resolvedBaseLayout(
    progress.projects ?? [],
    progress.layout,
  );
  const root = projectRoot(selected);
  const project = BASE_PROJECTS.find((item) => item.id === selected)!;
  const expansion = project.requires !== null;
  let validCount = 0;

  const states = Array.from(
    { length: BASE_PLOT_COUNT },
    (_, plot): BasePlotPresentation => {
      if (plot === COMMAND_PLOT) return "command";

      const occupant = BASE_ROOTS.find((id) => layout[id] === plot);

      if (mode === "inspect") {
        if (occupant === root) return "source";
        return occupant ? "occupied" : "idle";
      }

      if (mode === "move") {
        if (occupant === root) return "source";
        const valid = canMoveBaseBuilding(progress, root as BaseRoot, plot);
        if (valid) {
          validCount++;
          return chosen === plot ? "chosen-valid" : "valid";
        }
        if (chosen === plot) return "chosen-invalid";
        return occupant ? "occupied" : "blocked";
      }

      const valid = canConstructOnPlot(progress, selected, plot, metrics);
      if (valid) {
        validCount++;
        if (chosen === plot) return "chosen-valid";
        if (expansion && layout[root] === plot) return "required";
        return "valid";
      }
      if (chosen === plot) return "chosen-invalid";
      if (occupant) return occupant === root && expansion ? "source" : "occupied";
      return "blocked";
    },
  );

  const chosenState =
    chosen !== undefined && chosen >= 0 && chosen < states.length
      ? states[chosen]
      : undefined;

  return {
    states,
    validCount,
    chosenValid:
      chosenState === undefined
        ? null
        : chosenState === "chosen-valid" || chosenState === "required",
  };
}
