export type UnitFacing = -1 | 1;

export type UnitMotionSnapshot = {
  x: number;
  y: number;
  facing: UnitFacing;
  moving: boolean;
};

export type UnitMotionSample = {
  dx: number;
  dy: number;
  moved: number;
  moving: boolean;
  facing: UnitFacing;
  stopped: boolean;
};

export function sampleUnitMotion(
  previous: UnitMotionSnapshot | undefined,
  x: number,
  y: number,
  attackTargetX?: number,
): UnitMotionSample {
  const dx = previous ? x - previous.x : 0;
  const dy = previous ? y - previous.y : 0;
  const moved = Math.hypot(dx, dy);
  const moving = moved > 0.015;

  let facing: UnitFacing = previous?.facing ?? 1;
  if (
    attackTargetX !== undefined &&
    Number.isFinite(attackTargetX) &&
    Math.abs(attackTargetX - x) > 1
  )
    facing = attackTargetX < x ? -1 : 1;
  else if (Math.abs(dx) > 0.015)
    facing = dx < 0 ? -1 : 1;

  return {
    dx,
    dy,
    moved,
    moving,
    facing,
    stopped: Boolean(previous?.moving && !moving),
  };
}

export function unitTrailPoint(
  x: number,
  y: number,
  dx: number,
  dy: number,
  distance = 8,
): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) return { x, y };
  return {
    x: x - (dx / length) * distance,
    y: y - (dy / length) * distance,
  };
}
