import { unitIdentityVisual } from "./unit-identity-visual";

export type DeploymentCue = "deployFast" | "deploy" | "deployHeavy";

export type DeploymentFeedback = {
  cue: DeploymentCue;
  haptic: "light" | "medium" | "heavy";
  impactScale: number;
};

export function deploymentFeedback(cardId: string): DeploymentFeedback {
  const identity = unitIdentityVisual(cardId);

  if (identity.kind === "heavy" || identity.kind === "siege")
    return {
      cue: "deployHeavy",
      haptic: "heavy",
      impactScale: identity.kind === "heavy" ? 1.18 : 1.1,
    };

  if (identity.kind === "skirmisher" || identity.kind === "swarm")
    return {
      cue: "deployFast",
      haptic: "light",
      impactScale: 0.88,
    };

  return {
    cue: "deploy",
    haptic: "medium",
    impactScale:
      identity.kind === "support" || identity.kind === "controller" ? 0.96 : 1,
  };
}
