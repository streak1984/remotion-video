import React from "react";
import { Composition, registerRoot } from "remotion";
import { Video } from "./Video.js";
import type { Manuscript } from "../types.js";

// Default manuscript for Remotion Studio preview
const DEFAULT_MANUSCRIPT: Manuscript = {
  title: "Eksempel",
  fps: 30,
  width: 1080,
  height: 1920,
  segments: [
    {
      id: 0,
      subtitleLines: ["Dette endrer alt", "Norge knuser rekordene", "Og verden ser på"],
      imageSrc: "https://picsum.photos/1080/1920?random=1",
      cameraMovement: "zoom-in",
      durationInFrames: 180,
    },
    {
      id: 1,
      subtitleLines: ["Tallene er sjokkerende", "Ni av ti velger elbil", "Ingen land er i nærheten"],
      imageSrc: "https://picsum.photos/1080/1920?random=2",
      cameraMovement: "pan-right",
      durationInFrames: 180,
    },
    {
      id: 2,
      subtitleLines: ["Les hele saken", "example.com"],
      imageSrc: "https://picsum.photos/1080/1920?random=1",
      cameraMovement: "none",
      durationInFrames: 120,
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShortsVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={Video as any}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ manuscript: DEFAULT_MANUSCRIPT }}
      calculateMetadata={({ props }) => {
        const m = (props as { manuscript: Manuscript }).manuscript;
        return {
          durationInFrames: m.segments.reduce(
            (sum, s) => sum + s.durationInFrames,
            0
          ),
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
