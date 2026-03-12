import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { calculateCameraMovement } from "./utils/camera.js";
import type { CameraMovement } from "../types.js";

interface Props {
  src: string;
  cameraMovement: CameraMovement;
}

/**
 * Ken Burns-style image animation component.
 * Applies zoom/pan/rotate effects to a still image over the segment duration.
 */
export const ImageAnimation: React.FC<Props> = ({ src, cameraMovement }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Map frame progress to effect value (0 → 2)
  const effect = interpolate(frame, [0, durationInFrames], [0, 2], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const { scale, posX, posY, rotation } = calculateCameraMovement(
    effect,
    cameraMovement
  );

  // URLs pass through; local filenames are resolved via staticFile()
  const resolvedSrc = src.startsWith("http") ? src : staticFile(src);

  return (
    <AbsoluteFill>
      <Img
        src={resolvedSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${posX}px, ${posY}px) rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
