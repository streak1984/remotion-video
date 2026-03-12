import React from "react";
import { AbsoluteFill } from "remotion";
import { ImageAnimation } from "./ImageAnimation.js";
import { SubtitleText } from "./SubtitleText.js";
import type { Segment as SegmentType } from "../types.js";

interface Props {
  segment: SegmentType;
}

/**
 * A single video segment: full-screen image with Ken Burns animation
 * and a TikTok-style subtitle overlay.
 */
export const Segment: React.FC<Props> = ({ segment }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <ImageAnimation
        src={segment.imageSrc}
        cameraMovement={segment.cameraMovement}
      />
      <SubtitleText lines={segment.subtitleLines} />
    </AbsoluteFill>
  );
};
