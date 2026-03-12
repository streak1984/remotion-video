// Camera movement types
export type CameraMovement =
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  | "zoom-rotate-right"
  | "zoom-rotate-left"
  | "none";

// Input provided by the user (or scraped from URL)
export interface ImageInput {
  id: string;
  source: string; // local file path or URL
  byline?: string;
}

export interface PipelineInput {
  article: {
    title: string;
    text: string;
    url?: string;
  };
  images: ImageInput[];
  options?: {
    secondsPerSegment?: number;
  };
}

// Output from Claude summarization — groups of lines, one group per image
export interface SubtitleGroup {
  index: number;
  lines: string[];
}

// Output from Claude image assignment
export interface ImageAssignment {
  groupIndex: number;
  imageId: string;
  description: string;
}

// Final data structure fed to Remotion
export interface Segment {
  id: number;
  subtitleLines: string[]; // Multiple lines shown word-by-word over the same image
  imageSrc: string; // resolved path for Remotion (staticFile path or URL)
  imageByline?: string;
  cameraMovement: CameraMovement;
  durationInFrames: number;
}

export interface Manuscript {
  title: string;
  sourceUrl?: string; // For the CTA end card
  segments: Segment[];
  fps: number;
  width: number;
  height: number;
}

// Logger callback type for injectable logging
export type Logger = (msg: string) => void;
