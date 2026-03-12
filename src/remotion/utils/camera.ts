import type { CameraMovement } from "../../types.js";

export interface CameraTransform {
  scale: number;
  posX: number;
  posY: number;
  rotation: number;
}

/**
 * Calculate camera movement transform values for a given effect progress.
 * Ported from videofy_minimal's calculateCameraMovement.ts.
 *
 * @param effect - Progress value from 0 to 2 (interpolated from frame)
 * @param movement - The type of camera movement
 * @returns Transform values for scale, position, and rotation
 */
export function calculateCameraMovement(
  effect: number,
  movement: CameraMovement
): CameraTransform {
  switch (movement) {
    case "zoom-in":
      return {
        scale: 1 + effect * 0.07, // 1.0 → 1.14
        posX: 0,
        posY: 0,
        rotation: 0,
      };

    case "zoom-out":
      return {
        scale: 1.2 - effect * 0.07, // 1.2 → 1.06
        posX: 0,
        posY: 0,
        rotation: 0,
      };

    case "pan-left":
      return {
        scale: 1.4,
        posX: 75 - effect * 75, // 75 → -75
        posY: 0,
        rotation: 0,
      };

    case "pan-right":
      return {
        scale: 1.4,
        posX: -75 + effect * 75, // -75 → 75
        posY: 0,
        rotation: 0,
      };

    case "pan-up":
      return {
        scale: 1.2,
        posX: 0,
        posY: 50 - effect * 50, // 50 → -50
        rotation: 0,
      };

    case "pan-down":
      return {
        scale: 1.2,
        posX: 0,
        posY: -50 + effect * 50, // -50 → 50
        rotation: 0,
      };

    case "zoom-rotate-right":
      return {
        scale: 1 + effect * 0.07,
        posX: 0,
        posY: 0,
        rotation: effect * 1.5, // 0 → 3 degrees
      };

    case "zoom-rotate-left":
      return {
        scale: 1 + effect * 0.07,
        posX: 0,
        posY: 0,
        rotation: -(effect * 1.5),
      };

    case "none":
    default:
      return {
        scale: 1.05,
        posX: 0,
        posY: 0,
        rotation: 0,
      };
  }
}
