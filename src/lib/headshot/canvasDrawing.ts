/**
 * Canvas drawing module — re-exports from the new faceGuide module.
 *
 * The old drawPoseArrow function is replaced by drawGuidanceOverlay,
 * which provides face positioning oval, orientation chevrons,
 * on-target glow, distance indicators, and roll warnings.
 */
export { drawGuidanceOverlay, drawCaptureFlash } from './faceGuide';


