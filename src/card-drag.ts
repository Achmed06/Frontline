export type DragRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function dragThresholdReached(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  threshold = 10,
): boolean {
  if (![startX, startY, currentX, currentY, threshold].every(Number.isFinite))
    return false;
  const dx = currentX - startX;
  const dy = currentY - startY;
  return dx * dx + dy * dy >= Math.max(0, threshold) ** 2;
}

export function boardPointFromClient(
  clientX: number,
  clientY: number,
  rect: DragRect,
  boardWidth: number,
  boardHeight: number,
): { x: number; y: number } | null {
  if (
    ![clientX, clientY, rect.left, rect.top, rect.width, rect.height, boardWidth, boardHeight].every(Number.isFinite) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    boardWidth <= 0 ||
    boardHeight <= 0
  )
    return null;

  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height)
    return null;

  return {
    x: (localX / rect.width) * boardWidth,
    y: (localY / rect.height) * boardHeight,
  };
}
