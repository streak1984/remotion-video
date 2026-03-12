import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Segment } from "./Segment.js";
import type { Manuscript } from "../types.js";

interface Props {
  manuscript: Manuscript;
}

/**
 * Main video composition that sequences all segments.
 */
export const Video: React.FC<Props> = ({ manuscript }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {manuscript.segments.map((segment) => (
          <Series.Sequence
            key={segment.id}
            durationInFrames={segment.durationInFrames}
          >
            <Segment segment={segment} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
