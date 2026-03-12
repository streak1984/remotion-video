import path from "path";
import type {
  SubtitleGroup,
  ImageAssignment,
  ImageInput,
  Manuscript,
  Segment,
  CameraMovement,
  PipelineInput,
} from "../types.js";

const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;

// Timing: ~10 frames per word (0.33s), 12 frames pause between lines, 15 frames pad at end
const FRAMES_PER_WORD = 10;
const FRAMES_LINE_PAUSE = 12;
const FRAMES_END_PAD = 15;
const MIN_SEGMENT_FRAMES = 90; // At least 3 seconds

const CTA_DURATION_FRAMES = 120; // 4 seconds for CTA

const CAMERA_MOVEMENTS: CameraMovement[] = [
  "zoom-in",
  "pan-right",
  "zoom-out",
  "pan-left",
  "pan-up",
  "zoom-rotate-right",
];

/**
 * Calculate segment duration based on total word count across all lines.
 */
function calculateDuration(lines: string[], fps: number): number {
  let totalFrames = 0;
  for (const line of lines) {
    const wordCount = line.split(/\s+/).length;
    totalFrames += wordCount * FRAMES_PER_WORD + FRAMES_LINE_PAUSE;
  }
  totalFrames += FRAMES_END_PAD;
  return Math.max(totalFrames, MIN_SEGMENT_FRAMES);
}

/**
 * Assemble subtitle groups + image assignments into a Manuscript.
 * Duration is calculated from word count for readable pacing.
 * A CTA segment is appended at the end if a source URL is available.
 */
export function buildManuscript(
  groups: SubtitleGroup[],
  assignments: ImageAssignment[],
  input: PipelineInput
): Manuscript {
  const fps = DEFAULT_FPS;

  const imageMap = new Map<string, ImageInput>();
  for (const img of input.images) {
    imageMap.set(img.id, img);
  }

  // Build content segments: one per subtitle group
  const segments: Segment[] = groups.map((group, i) => {
    const assignment = assignments.find((a) => a.groupIndex === group.index);
    const imageId = assignment?.imageId ?? input.images[i % input.images.length].id;
    const image = imageMap.get(imageId) ?? input.images[0];
    const cameraMovement = CAMERA_MOVEMENTS[i % CAMERA_MOVEMENTS.length];

    const source = image.source;
    let imageSrc: string;
    if (source.startsWith("http://") || source.startsWith("https://")) {
      imageSrc = source;
    } else {
      imageSrc = path.basename(source);
    }

    return {
      id: i,
      subtitleLines: group.lines,
      imageSrc,
      imageByline: image.byline,
      cameraMovement,
      durationInFrames: calculateDuration(group.lines, fps),
    };
  });

  // Add CTA segment at the end
  const ctaLines: string[] = ["Les hele saken"];
  if (input.article.url) {
    try {
      const domain = new URL(input.article.url).hostname.replace("www.", "");
      ctaLines.push(domain);
    } catch {
      // skip domain if URL is invalid
    }
  }

  segments.push({
    id: segments.length,
    subtitleLines: ctaLines,
    imageSrc: segments[0]?.imageSrc ?? "", // Reuse first image for CTA background
    cameraMovement: "none",
    durationInFrames: CTA_DURATION_FRAMES,
  });

  return {
    title: input.article.title,
    sourceUrl: input.article.url,
    segments,
    fps,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  };
}
