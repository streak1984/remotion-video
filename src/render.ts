import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import type { Manuscript, Logger } from "./types.js";

/**
 * Bundle the Remotion project and render a video to MP4.
 */
export async function renderVideo(
  manuscript: Manuscript,
  outputPath: string,
  options: { projectRoot: string; logger: Logger }
): Promise<void> {
  const { projectRoot, logger } = options;

  // Step 1: Bundle the Remotion entry point
  // Use the source .tsx file directly — Remotion's bundler handles TypeScript via webpack
  const entryPoint = path.resolve(projectRoot, "src/remotion/Root.tsx");
  logger("  Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint,
    publicDir: path.resolve(projectRoot, "public"),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          ".js": [".ts", ".tsx", ".js"],
        },
      },
    }),
  });

  // Step 2: Select the composition and calculate metadata
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ShortsVideo",
    inputProps: { manuscript },
  });

  // Step 3: Render to MP4
  logger(
    `  Rendering ${composition.durationInFrames} frames at ${composition.fps}fps (${Math.round(composition.durationInFrames / composition.fps)}s)...`
  );

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { manuscript },
    onProgress: (() => {
      let lastReported = -1;
      return ({ progress }: { progress: number }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0 && pct !== lastReported) {
          lastReported = pct;
          logger(`  Rendering: ${pct}%`);
        }
      };
    })(),
  });
}
