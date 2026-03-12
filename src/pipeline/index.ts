import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { summarizeArticle } from "./summarize.js";
import { assignImages } from "./assign-images.js";
import { buildManuscript } from "./build-manuscript.js";
import { renderVideo } from "../render.js";
import type { PipelineInput, ImageInput, Manuscript, Logger } from "../types.js";

export interface PipelineOptions {
  projectRoot: string;
  onProgress?: Logger;
}

export interface PipelineResult {
  manuscript: Manuscript;
  outputPath: string;
}

/**
 * Run the full video generation pipeline:
 * download URL images → generate subtitles → assign images → build manuscript → render video.
 *
 * Expects a PipelineInput with article text and images (from scraping or JSON file).
 */
export async function runPipeline(
  input: PipelineInput,
  options: PipelineOptions
): Promise<PipelineResult> {
  const log = options.onProgress ?? (() => {});
  const projectRoot = options.projectRoot;
  const publicDir = path.resolve(projectRoot, "public");
  const outputDir = path.resolve(projectRoot, "output");

  // Download URL-based images to public/ so Remotion can serve them
  const hasUrlImages = input.images.some((img) => img.source.startsWith("http"));
  if (hasUrlImages) {
    await mkdir(publicDir, { recursive: true });
    const downloaded: ImageInput[] = [];
    for (const img of input.images) {
      if (img.source.startsWith("http")) {
        try {
          const resp = await fetch(img.source);
          if (!resp.ok) continue;
          const buffer = Buffer.from(await resp.arrayBuffer());
          const ext = img.source.match(/\.(png|webp|gif)/i)?.[1] ?? "jpg";
          const filename = `${img.id}.${ext}`;
          const filepath = path.join(publicDir, filename);
          await writeFile(filepath, buffer);
          downloaded.push({ ...img, source: filepath });
        } catch {
          downloaded.push(img); // Keep URL as fallback
        }
      } else {
        downloaded.push(img);
      }
    }
    input.images = downloaded;
  }

  log(`  Tittel: "${input.article.title}"`);
  log(`  Bilder: ${input.images.length}`);

  // Step 2: Generate subtitle groups
  const targetGroups = Math.min(Math.max(input.images.length, 3), 8);
  log(`Steg 2/5: Genererer ${targetGroups} undertekstgrupper med Claude...`);
  const subtitleGroups = await summarizeArticle(
    input.article.title,
    input.article.text,
    targetGroups
  );
  log("  Genererte grupper:");
  for (const group of subtitleGroups) {
    log(`    Gruppe ${group.index}:`);
    for (const line of group.lines) {
      log(`      - "${line}"`);
    }
  }

  // Step 3: Assign images to subtitle groups
  log("Steg 3/5: Analyserer bilder og tilordner til grupper...");
  const assignments = await assignImages(subtitleGroups, input.images);
  for (const a of assignments) {
    log(`    Gruppe ${a.groupIndex} → ${a.imageId}: ${a.description}`);
  }

  // Step 4: Build manuscript
  log("Steg 4/5: Bygger manus...");
  const manuscript = buildManuscript(subtitleGroups, assignments, input);
  log(
    `  ${manuscript.segments.length} segmenter, ${manuscript.segments.reduce((s, seg) => s + seg.durationInFrames, 0) / manuscript.fps}s total`
  );

  // Step 5: Render video
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, `${Date.now()}.mp4`);
  log("Steg 5/5: Rendrer video...");
  await renderVideo(manuscript, outputPath, { projectRoot, logger: log });

  log(`Ferdig! Video lagret til: ${outputPath}`);
  return { manuscript, outputPath };
}
