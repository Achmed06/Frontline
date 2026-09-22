export type MovementFootprintKind =
  | "heavy"
  | "siege"
  | "swarm"
  | "standard";

export type MovementFootprintVisual = {
  kind: MovementFootprintKind;
  trailDistance: number;
  dustAlpha: number;
  primaryWidth: number;
  primaryHeight: number;
  secondaryWidth: number;
  secondaryHeight: number;
  lateralOffset: number;
  settleWidthScale: number;
  settleHeightScale: number;
  segmentCount: number;
};

export function movementFootprintVisual(
  cardId: string,
  moved: number,
): MovementFootprintVisual {
  const safeMoved = Number.isFinite(moved)
    ? Math.max(0, Math.min(3, moved))
    : 0;

  let kind: MovementFootprintKind = "standard";
  if (cardId === "bulwark" || cardId === "sentinel") kind = "heavy";
  else if (cardId === "lancer" || cardId === "mortar") kind = "siege";
  else if (cardId === "swarm") kind = "swarm";

  const speedFactor = Math.min(1, safeMoved / 0.9);

  if (kind === "heavy")
    return {
      kind,
      trailDistance: 9 + safeMoved * 2.4,
      dustAlpha: 0.13 + speedFactor * 0.12,
      primaryWidth: 10.5,
      primaryHeight: 3.6,
      secondaryWidth: 8,
      secondaryHeight: 2.8,
      lateralOffset: 4.2,
      settleWidthScale: 0.72,
      settleHeightScale: 0.24,
      segmentCount: 3,
    };

  if (kind === "siege")
    return {
      kind,
      trailDistance: 10 + safeMoved * 2.8,
      dustAlpha: 0.09 + speedFactor * 0.08,
      primaryWidth: 8,
      primaryHeight: 2.2,
      secondaryWidth: 7,
      secondaryHeight: 1.8,
      lateralOffset: 3.8,
      settleWidthScale: 0.62,
      settleHeightScale: 0.2,
      segmentCount: 2,
    };

  if (kind === "swarm")
    return {
      kind,
      trailDistance: 6 + safeMoved * 1.6,
      dustAlpha: 0.07 + speedFactor * 0.07,
      primaryWidth: 4,
      primaryHeight: 1.8,
      secondaryWidth: 3,
      secondaryHeight: 1.4,
      lateralOffset: 3,
      settleWidthScale: 0.42,
      settleHeightScale: 0.14,
      segmentCount: 3,
    };

  return {
    kind,
    trailDistance: 7 + safeMoved * 1.8,
    dustAlpha: 0.08 + speedFactor * 0.08,
    primaryWidth: 7,
    primaryHeight: 2.6,
    secondaryWidth: 5,
    secondaryHeight: 2,
    lateralOffset: 3,
    settleWidthScale: 0.48,
    settleHeightScale: 0.16,
    segmentCount: 2,
  };
}
