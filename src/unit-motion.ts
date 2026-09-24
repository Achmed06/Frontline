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


export type UnitMotionFrame = UnitMotionSample & {
  sampledAt: number;
  x: number;
  y: number;
};

export function sampleUnitMotionFrame(
  previous: UnitMotionFrame | undefined,
  x: number,
  y: number,
  sampledAt: number,
  attackTargetX?: number,
): UnitMotionFrame {
  const safeSampledAt = Number.isFinite(sampledAt)
    ? sampledAt
    : previous?.sampledAt ?? 0;
  const simulationAdvanced =
    !previous ||
    previous.sampledAt !== safeSampledAt ||
    Math.abs(previous.x - x) > 1e-6 ||
    Math.abs(previous.y - y) > 1e-6;

  if (!simulationAdvanced)
    return {
      ...previous,
      sampledAt: safeSampledAt,
      stopped: false,
    };

  return {
    ...sampleUnitMotion(previous, x, y, attackTargetX),
    sampledAt: safeSampledAt,
    x,
    y,
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


export type UnitRenderPositionState = {
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  progress: number;
};

export type UnitRenderPositionSample = {
  x: number;
  y: number;
  state: UnitRenderPositionState;
};

const PRESENTATION_STEP_SECONDS = 1 / 30;
const TELEPORT_SNAP_DISTANCE = 18;

export function sampleUnitRenderPosition(
  previous: UnitRenderPositionState | undefined,
  targetX: number,
  targetY: number,
  deltaSeconds: number,
  snap = false,
): UnitRenderPositionSample {
  const safeX = Number.isFinite(targetX) ? targetX : previous?.targetX ?? 0;
  const safeY = Number.isFinite(targetY) ? targetY : previous?.targetY ?? 0;
  const safeDelta =
    Number.isFinite(deltaSeconds) && deltaSeconds > 0
      ? Math.min(deltaSeconds, 0.1)
      : 0;

  if (!previous || snap)
    return {
      x: safeX,
      y: safeY,
      state: {
        fromX: safeX,
        fromY: safeY,
        targetX: safeX,
        targetY: safeY,
        progress: 1,
      },
    };

  const targetChanged =
    Math.abs(safeX - previous.targetX) > 1e-6 ||
    Math.abs(safeY - previous.targetY) > 1e-6;
  const targetJump = Math.hypot(
    safeX - previous.targetX,
    safeY - previous.targetY,
  );

  let fromX = previous.fromX;
  let fromY = previous.fromY;
  let progress = previous.progress;

  if (targetChanged) {
    if (targetJump >= TELEPORT_SNAP_DISTANCE)
      return {
        x: safeX,
        y: safeY,
        state: {
          fromX: safeX,
          fromY: safeY,
          targetX: safeX,
          targetY: safeY,
          progress: 1,
        },
      };

    fromX = previous.targetX;
    fromY = previous.targetY;
    progress = 0;
  }

  progress = Math.min(1, progress + safeDelta / PRESENTATION_STEP_SECONDS);
  const x = fromX + (safeX - fromX) * progress;
  const y = fromY + (safeY - fromY) * progress;

  return {
    x,
    y,
    state: {
      fromX,
      fromY,
      targetX: safeX,
      targetY: safeY,
      progress,
    },
  };
}
