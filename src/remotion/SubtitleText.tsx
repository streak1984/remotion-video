import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["900"],
  subsets: ["latin-ext"],
});

// Timing constants (must match build-manuscript.ts)
const FRAMES_PER_WORD = 10;
const FRAMES_LINE_PAUSE = 12;

const MAX_VISIBLE_LINES = 4;

// Opacity levels for karaoke effect
const OPACITY_UNREAD = 0.25;
const OPACITY_READ = 0.75;
const OPACITY_ACTIVE = 1.0;

interface Props {
  lines: string[];
}

/**
 * Karaoke-style subtitle overlay.
 * Up to 4 lines visible at once. All words are shown — the current word
 * is highlighted at full opacity, read words are slightly dimmed,
 * and upcoming words are faded. No movement or scaling, just clean opacity.
 */
export const SubtitleText: React.FC<Props> = ({ lines }) => {
  const frame = useCurrentFrame();

  // Build timing data: when each word across all lines gets highlighted
  let frameOffset = 0;
  const lineTimings = lines.map((line, lineIdx) => {
    const words = line.split(/\s+/);
    const wordTimings = words.map((word, wordIdx) => {
      const highlightFrame = frameOffset + wordIdx * FRAMES_PER_WORD;
      return { word, highlightFrame };
    });
    const lineStart = frameOffset;
    frameOffset += words.length * FRAMES_PER_WORD + FRAMES_LINE_PAUSE;
    return { lineIdx, lineStart, wordTimings };
  });

  // Find the active line index (last line whose start has passed)
  let activeIdx = 0;
  for (let i = lineTimings.length - 1; i >= 0; i--) {
    if (frame >= lineTimings[i].lineStart) {
      activeIdx = i;
      break;
    }
  }

  // Sliding window: show up to 4 lines, keeping the active line in view.
  // Start with lines 0-3, then shift forward when active line would be off-screen.
  const firstVisible = Math.max(0, activeIdx - 1);
  const lastVisible = Math.min(lineTimings.length - 1, firstVisible + MAX_VISIBLE_LINES - 1);
  const visibleLines = lineTimings.slice(firstVisible, lastVisible + 1);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "15%",
        left: "4%",
        right: "4%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "20px 28px",
          borderRadius: "18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          maxWidth: "95%",
        }}
      >
        {visibleLines.map((lt) => (
          <div
            key={lt.lineIdx}
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "0 0.25em",
            }}
          >
            {lt.wordTimings.map((wt, wordIdx) => {
              // Determine word state: active, read, or unread
              const isHighlighted = frame >= wt.highlightFrame;
              const isCurrentWord =
                isHighlighted &&
                (wordIdx === lt.wordTimings.length - 1 ||
                  frame < lt.wordTimings[wordIdx + 1].highlightFrame);

              // Smooth transition over a few frames when a word gets highlighted
              const fadeIn = isHighlighted
                ? interpolate(
                    frame - wt.highlightFrame,
                    [0, 6],
                    [OPACITY_UNREAD, isCurrentWord ? OPACITY_ACTIVE : OPACITY_READ],
                    { extrapolateRight: "clamp" }
                  )
                : OPACITY_UNREAD;

              return (
                <span
                  key={wordIdx}
                  style={{
                    fontFamily,
                    fontWeight: 900,
                    fontSize: "64px",
                    lineHeight: 1.2,
                    color: "white",
                    textShadow:
                      "0 3px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)",
                    display: "inline-block",
                    marginRight: "16px",
                    opacity: fadeIn,
                    transition: "none",
                  }}
                >
                  {wt.word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
