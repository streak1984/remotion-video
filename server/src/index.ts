import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeArticle } from "../../src/pipeline/scrape.js";
import { summarizeArticle } from "../../src/pipeline/summarize.js";
import { assignImages } from "../../src/pipeline/assign-images.js";
import { buildManuscript } from "../../src/pipeline/build-manuscript.js";
import { renderVideo } from "../../src/render.js";
import { runPipeline } from "../../src/pipeline/index.js";
import type { PipelineInput } from "../../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.REMOTION_PROJECT_ROOT || path.resolve(__dirname, "../..");

// Logger for MCP — must use stderr (stdout is reserved for JSON-RPC)
const logger = (msg: string) => console.error(msg);

// Input validation schema (zod@3, matching the pipeline's PipelineInput type)
const InputFileSchema = z.object({
  article: z.object({
    title: z.string(),
    text: z.string(),
    url: z.string().optional(),
  }),
  images: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      byline: z.string().optional(),
    })
  ),
  options: z
    .object({
      secondsPerSegment: z.number().optional(),
    })
    .optional(),
});

const server = new McpServer({
  name: "remotion-video",
  version: "1.0.0",
});

// Full pipeline: URL or JSON file → rendered video
server.tool(
  "generate_video",
  "Generate a TikTok/Shorts-style video from a news article URL or JSON file",
  {
    source: z
      .string()
      .describe("URL to a news article, or path to a JSON input file"),
  },
  async ({ source }) => {
    let pipelineInput: PipelineInput;

    if (source.startsWith("http://") || source.startsWith("https://")) {
      pipelineInput = await scrapeArticle(source, {
        publicDir: path.resolve(PROJECT_ROOT, "public"),
        logger,
      });
    } else {
      const raw = readFileSync(path.resolve(source), "utf-8");
      const parsed = InputFileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid input file: ${parsed.error.message}`,
            },
          ],
          isError: true,
        };
      }
      pipelineInput = parsed.data;
    }

    if (pipelineInput.images.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No images found. Cannot generate video without images.",
          },
        ],
        isError: true,
      };
    }

    const result = await runPipeline(pipelineInput, {
      projectRoot: PROJECT_ROOT,
      onProgress: logger,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              title: result.manuscript.title,
              segments: result.manuscript.segments.length,
              durationSeconds:
                result.manuscript.segments.reduce(
                  (s, seg) => s + seg.durationInFrames,
                  0
                ) / result.manuscript.fps,
              outputPath: result.outputPath,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Scrape an article URL
server.tool(
  "scrape_article",
  "Scrape a news article URL and extract title, body text, and images",
  {
    url: z.string().describe("URL of the news article to scrape"),
  },
  async ({ url }) => {
    const result = await scrapeArticle(url, {
      publicDir: path.resolve(PROJECT_ROOT, "public"),
      logger,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Generate subtitle groups from article text
server.tool(
  "generate_subtitles",
  "Generate subtitle groups from article text using Claude AI",
  {
    title: z.string().describe("Article title"),
    text: z.string().describe("Article body text"),
    targetGroups: z
      .number()
      .optional()
      .describe("Number of subtitle groups to generate (default: 5)"),
  },
  async ({ title, text, targetGroups }) => {
    const groups = await summarizeArticle(title, text, targetGroups ?? 5);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(groups, null, 2),
        },
      ],
    };
  }
);

// Assign images to subtitle groups
server.tool(
  "assign_images",
  "Use Claude AI to analyze images and assign them to subtitle groups",
  {
    subtitleGroups: z
      .string()
      .describe("JSON string of SubtitleGroup[] array"),
    images: z.string().describe("JSON string of ImageInput[] array"),
  },
  async ({ subtitleGroups, images }) => {
    const groups = JSON.parse(subtitleGroups);
    const imgs = JSON.parse(images);
    const assignments = await assignImages(groups, imgs);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(assignments, null, 2),
        },
      ],
    };
  }
);

// Render a manuscript to MP4
server.tool(
  "render_video",
  "Render a manuscript to an MP4 video file using Remotion",
  {
    manuscript: z.string().describe("JSON string of the Manuscript object"),
  },
  async ({ manuscript }) => {
    const ms = JSON.parse(manuscript);
    const outputDir = path.resolve(PROJECT_ROOT, "output");
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.resolve(outputDir, `${Date.now()}.mp4`);

    await renderVideo(ms, outputPath, {
      projectRoot: PROJECT_ROOT,
      logger,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ outputPath }, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Remotion video MCP server running");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
