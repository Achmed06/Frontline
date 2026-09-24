import { unitIdentityVisual } from "./unit-identity-visual";

export type DeploymentCue = "deployFast" | "deploy" | "deployHeavy";

export function deploymentFeedback(cardId: string): DeploymentCue {
  const identity = unitIdentityVisual(cardId);

  if (identity.kind === "heavy" || identity.kind === "siege")
    return "deployHeavy";

  if (identity.kind === "skirmisher" || identity.kind === "swarm")
    return "deployFast";

  return "deploy";
}
