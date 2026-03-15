// Arc positions mapped to target directions (angles on the halo ring)
const SECTOR_MAP: Record<string, { startAngle: number; sweepAngle: number }> = {
  left: { startAngle: Math.PI * 0.75, sweepAngle: Math.PI * 0.5 },   // left side
  right: { startAngle: -Math.PI * 0.25, sweepAngle: Math.PI * 0.5 }, // right side
  up: { startAngle: -Math.PI * 0.75, sweepAngle: Math.PI * 0.5 },    // top
  down: { startAngle: Math.PI * 0.25, sweepAngle: Math.PI * 0.5 },   // bottom
};

function getSectorKey(targetYaw: number, targetPitch: number): string | null {
  if (Math.abs(targetYaw) < 2 && Math.abs(targetPitch) < 2) return null; // straight
  if (targetYaw < -5) return 'left';
  if (targetYaw > 5) return 'right';
  if (targetPitch < -3) return 'up';
  if (targetPitch > 3) return 'down';
  return null;
}

/**
 * Draw a tracking overlay:
 * - Glowing halo ring around the face center
 * - Target arc sector on the ring (highlighted region to aim for)
 *
 * Does NOT call clearRect — caller handles that.
 */
export function drawPoseArrow(
  ctx: CanvasRenderingContext2D,
  isOnTarget: boolean,
  canvasWidth: number,
  canvasHeight: number,
  targetYaw: number,
  targetPitch: number,
  faceCenterX: number,
  faceCenterY: number,
  faceScale: number,
): void {
  const unit = Math.min(canvasWidth, canvasHeight);

  // === HALO RING — anchored near canvas center, gently follows face ===
  const anchorX = canvasWidth / 2;
  const anchorY = canvasHeight * 0.42;
  const followStrength = 0.15; // how much the ring follows the face (0=fixed, 1=tracks)
  const ringCenterX = anchorX + (faceCenterX - anchorX) * followStrength;
  const ringCenterY = anchorY + (faceCenterY - anchorY) * followStrength;

  const ringRadius = Math.min(canvasWidth, canvasHeight) * 0.28;
  const ringStroke = Math.max(3, unit * 0.005);

  ctx.save();

  // Base ring
  ctx.beginPath();
  ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = isOnTarget
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(100, 180, 255, 0.15)';
  ctx.lineWidth = ringStroke;
  ctx.stroke();

  // === TARGET ARC SECTOR ===
  const sectorKey = getSectorKey(targetYaw, targetPitch);
  if (sectorKey) {
    const sector = SECTOR_MAP[sectorKey];
    const arcRadius = ringRadius + unit * 0.012;
    const arcStroke = Math.max(5, unit * 0.009);

    ctx.beginPath();
    ctx.arc(
      ringCenterX,
      ringCenterY,
      arcRadius,
      sector.startAngle,
      sector.startAngle + sector.sweepAngle,
    );
    ctx.strokeStyle = isOnTarget
      ? 'rgba(34, 197, 94, 0.7)'
      : 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = arcStroke;
    ctx.lineCap = 'round';

    // Glow
    ctx.shadowColor = isOnTarget
      ? 'rgba(34, 197, 94, 0.6)'
      : 'rgba(100, 180, 255, 0.4)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Small tick marks at sector edges
    const tickLen = unit * 0.015;
    for (const edgeAngle of [sector.startAngle, sector.startAngle + sector.sweepAngle]) {
      const tx = ringCenterX + Math.cos(edgeAngle) * (arcRadius - tickLen);
      const ty = ringCenterY + Math.sin(edgeAngle) * (arcRadius - tickLen);
      const tex = ringCenterX + Math.cos(edgeAngle) * (arcRadius + tickLen);
      const tey = ringCenterY + Math.sin(edgeAngle) * (arcRadius + tickLen);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tex, tey);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw a green check flash animation frame on the canvas (capture feedback).
 */
export function drawCaptureFlash(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  alpha: number,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = `rgba(34, 197, 94, ${alpha * 0.3})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const size = Math.min(canvasWidth, canvasHeight) * 0.1;

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.5, cy);
  ctx.lineTo(cx - size * 0.1, cy + size * 0.4);
  ctx.lineTo(cx + size * 0.5, cy - size * 0.35);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}


