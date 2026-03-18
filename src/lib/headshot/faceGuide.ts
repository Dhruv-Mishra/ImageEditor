import type { GuidanceState } from './types';
import { IDEAL_FACE_SCALE, FACE_SCALE_TOLERANCE } from './instructionEngine';

/**
 * Draw the complete guidance overlay on the canvas.
 *
 * The canvas has `scale-x-[-1]` CSS (matches the mirrored video), so all
 * drawing uses raw camera coordinates — no manual X-flipping needed.
 *
 * Layers:
 *   1. Face positioning oval (dashed outline showing WHERE to place face)
 *   2. Orientation chevrons (pulsing arrows showing which way to turn)
 *   3. On-target glow + progress arc (green feedback when pose matches)
 *   4. Distance indicator (arrows when too close/far)
 */
export function drawGuidanceOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  guidance: GuidanceState,
): void {
  ctx.clearRect(0, 0, canvasW, canvasH);

  if (!guidance.hasFace) {
    drawFacePositionGuide(ctx, canvasW, canvasH, 0, 0, 0, false);
    drawNoFaceHint(ctx, canvasW, canvasH);
    return;
  }

  drawFacePositionGuide(
    ctx,
    canvasW,
    canvasH,
    guidance.faceCenterX,
    guidance.faceCenterY,
    guidance.faceScale,
    true,
  );

  if (guidance.isOnTarget) {
    drawOnTargetFeedback(
      ctx,
      guidance.faceCenterX,
      guidance.faceCenterY,
      guidance.faceScale,
      canvasH,
      guidance.holdProgress,
      guidance.isStable,
    );
  } else {
    drawOrientationIndicator(
      ctx,
      canvasW,
      canvasH,
      guidance.currentYaw,
      guidance.currentPitch,
      guidance.targetYaw,
      guidance.targetPitch,
    );
    drawDistanceIndicator(ctx, canvasW, canvasH, guidance.faceScale);
  }

  // Roll warning bar
  if (Math.abs(guidance.currentRoll) > 8 && !guidance.isOnTarget) {
    drawRollWarning(ctx, canvasW, canvasH, guidance.currentRoll);
  }
}

// ─── Layer 1: Face positioning oval ────────────────────────────────────

function drawFacePositionGuide(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  faceCenterX: number,
  faceCenterY: number,
  faceScale: number,
  hasFace: boolean,
): void {
  const idealCX = canvasW / 2;
  const idealCY = canvasH * 0.42;
  const idealRadiusY = canvasH * 0.22;
  const idealRadiusX = idealRadiusY * 0.78;

  ctx.save();
  ctx.setLineDash([8, 6]);

  let color: string;
  if (!hasFace) {
    color = 'rgba(255, 255, 255, 0.2)';
  } else {
    const dx = Math.abs(faceCenterX - idealCX) / canvasW;
    const dy = Math.abs(faceCenterY - idealCY) / canvasH;
    const posError = Math.sqrt(dx * dx + dy * dy);
    const scaleError = Math.abs(faceScale - IDEAL_FACE_SCALE) * 2;
    const totalError = posError + scaleError;

    if (totalError < 0.06) {
      color = 'rgba(34, 197, 94, 0.45)';
    } else if (totalError < 0.15) {
      color = 'rgba(250, 204, 21, 0.35)';
    } else {
      color = 'rgba(255, 255, 255, 0.25)';
    }
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(idealCX, idealCY, idealRadiusX, idealRadiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Corner crosshairs for framing reference
  const crossSize = 12;
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  const corners = [
    { x: idealCX - idealRadiusX, y: idealCY - idealRadiusY, dx: 1, dy: 1 },
    { x: idealCX + idealRadiusX, y: idealCY - idealRadiusY, dx: -1, dy: 1 },
    { x: idealCX - idealRadiusX, y: idealCY + idealRadiusY, dx: 1, dy: -1 },
    { x: idealCX + idealRadiusX, y: idealCY + idealRadiusY, dx: -1, dy: -1 },
  ];
  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + c.dy * crossSize);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x + c.dx * crossSize, c.y);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── No face hint ──────────────────────────────────────────────────────

function drawNoFaceHint(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
): void {
  const cx = canvasW / 2;
  const cy = canvasH * 0.42;

  // Simple face icon (circle + eyes + mouth)
  ctx.save();
  const faceR = canvasH * 0.08;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.stroke();

  // Eyes
  const eyeR = faceR * 0.12;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(cx - faceR * 0.35, cy - faceR * 0.15, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + faceR * 0.35, cy - faceR * 0.15, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.beginPath();
  ctx.arc(cx, cy + faceR * 0.25, faceR * 0.25, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Layer 2: Orientation chevrons ─────────────────────────────────────

function drawOrientationIndicator(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  currentYaw: number,
  currentPitch: number,
  targetYaw: number,
  targetPitch: number,
): void {
  const cx = canvasW / 2;
  const cy = canvasH * 0.42;
  const radius = canvasH * 0.27;

  const yawDiff = targetYaw - currentYaw;
  const pitchDiff = targetPitch - currentPitch;
  const absYawDiff = Math.abs(yawDiff);
  const absPitchDiff = Math.abs(pitchDiff);

  ctx.save();

  const now = performance.now();

  // Horizontal chevrons (yaw correction)
  // Canvas has scaleX(-1) CSS — position and angle drawn in raw camera space
  // are flipped by CSS. To make chevron appear on the correct side in display:
  //   display-space direction → negate for canvas-space position/angle
  if (absYawDiff > 5) {
    const displayDir = yawDiff > 0 ? 1 : -1; // 1 = turn right in mirror
    // Negate for canvas coords: CSS scaleX(-1) flips position and angle
    const canvasDir = -displayDir;
    const chevronX = cx + canvasDir * radius;
    const chevronY = cy;
    const size = Math.min(22, 8 + absYawDiff * 0.5);
    const pulse = 0.5 + 0.3 * Math.sin(now / 400);
    const opacity = Math.min(0.85, 0.3 + absYawDiff / 40) * pulse;
    const angle = canvasDir === 1 ? 0 : Math.PI;

    drawChevron(ctx, chevronX, chevronY, size, angle, opacity);

    // Double chevron for large differences
    if (absYawDiff > 15) {
      drawChevron(
        ctx,
        chevronX + canvasDir * 18,
        chevronY,
        size * 0.8,
        angle,
        opacity * 0.65,
      );
    }
  }

  // Vertical chevrons (pitch correction)
  if (absPitchDiff > 4) {
    const direction = pitchDiff > 0 ? 1 : -1; // 1 = tilt down
    const chevronX = cx;
    const chevronY = cy + direction * radius;
    const size = Math.min(20, 6 + absPitchDiff * 0.5);
    const pulse = 0.5 + 0.3 * Math.sin(now / 400);
    const opacity = Math.min(0.75, 0.3 + absPitchDiff / 30) * pulse;
    const angle = direction === 1 ? Math.PI / 2 : -Math.PI / 2;

    drawChevron(ctx, chevronX, chevronY, size, angle, opacity);
  }

  ctx.restore();
}

function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  opacity: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.6);
  ctx.lineTo(size * 0.5, 0);
  ctx.lineTo(-size * 0.5, size * 0.6);
  ctx.strokeStyle = `rgba(100, 180, 255, ${opacity})`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Glow
  ctx.shadowColor = `rgba(100, 180, 255, ${opacity * 0.6})`;
  ctx.shadowBlur = 8;
  ctx.stroke();

  ctx.restore();
}

// ─── Layer 3: On-target feedback ───────────────────────────────────────

function drawOnTargetFeedback(
  ctx: CanvasRenderingContext2D,
  faceCenterX: number,
  faceCenterY: number,
  faceScale: number,
  canvasH: number,
  holdProgress: number,
  isStable: boolean,
): void {
  const radius = faceScale * canvasH * 0.55;

  ctx.save();

  // Green glow ring (intensifies with hold progress)
  const gradient = ctx.createRadialGradient(
    faceCenterX,
    faceCenterY,
    radius * 0.9,
    faceCenterX,
    faceCenterY,
    radius * 1.15,
  );
  gradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
  gradient.addColorStop(
    0.5,
    `rgba(34, 197, 94, ${0.1 + holdProgress * 0.3})`,
  );
  gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(faceCenterX, faceCenterY, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Progress arc (circular countdown)
  if (holdProgress > 0 && isStable) {
    ctx.beginPath();
    ctx.arc(
      faceCenterX,
      faceCenterY,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + holdProgress * Math.PI * 2,
    );
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Background track
    ctx.beginPath();
    ctx.arc(faceCenterX, faceCenterY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Pulsing ring when on-target but not yet stable
  if (!isStable) {
    const pulse = 0.3 + 0.2 * Math.sin(performance.now() / 300);
    ctx.beginPath();
    ctx.arc(faceCenterX, faceCenterY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ─── Layer 4: Distance indicator ───────────────────────────────────────

function drawDistanceIndicator(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  faceScale: number,
): void {
  const scaleDiff = faceScale - IDEAL_FACE_SCALE;
  if (Math.abs(scaleDiff) < FACE_SCALE_TOLERANCE) return;

  const isTooClose = scaleDiff > 0;
  const cx = canvasW / 2;
  const y = canvasH * 0.88;
  const arrowSize = 12;
  const spacing = 25;
  const opacity = 0.6 + 0.2 * Math.sin(performance.now() / 500);

  ctx.save();
  ctx.strokeStyle = `rgba(250, 204, 21, ${opacity})`;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  if (isTooClose) {
    // Inward arrows ← → meaning "move back"
    drawChevron(ctx, cx - spacing, y, arrowSize, Math.PI, opacity);
    drawChevron(ctx, cx + spacing, y, arrowSize, 0, opacity);
  } else {
    // Outward arrows → ← meaning "move closer"
    drawChevron(ctx, cx - spacing, y, arrowSize, 0, opacity);
    drawChevron(ctx, cx + spacing, y, arrowSize, Math.PI, opacity);
  }

  ctx.restore();
}

// ─── Roll warning ──────────────────────────────────────────────────────

function drawRollWarning(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  roll: number,
): void {
  const cx = canvasW / 2;
  const cy = canvasH * 0.42;
  const radius = canvasH * 0.25;
  const opacity = 0.4 + 0.2 * Math.sin(performance.now() / 500);

  ctx.save();

  // Draw a tilted horizontal line showing the user they need to straighten
  ctx.translate(cx, cy);
  const rollRad = (roll * Math.PI) / 180;

  // Current roll line (red-ish)
  ctx.rotate(rollRad);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.6, 0);
  ctx.lineTo(radius * 0.6, 0);
  ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.rotate(-rollRad);

  // Target horizontal line (white)
  ctx.beginPath();
  ctx.moveTo(-radius * 0.6, 0);
  ctx.lineTo(radius * 0.6, 0);
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * Draw green check flash animation frame on the canvas (capture feedback).
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
