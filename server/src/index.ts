import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeArticle } from "../../src/pipeline/scrape.js";
import { buildManuscript } from "../../src/pipeline/build-manuscript.js";
import { renderVideo } from "../../src/render.js";
import { ensureBrowser } from "@remotion/renderer";
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

// Tool 1: Load article from URL or JSON file
server.tool(
  "load_article",
  "Scrape a news article URL or read a JSON input file. Downloads images to public/ and returns PipelineInput JSON.",
  {
    source: z
      .string()
      .describe("URL to a news article, or path to a JSON input file"),
  },
  async ({ source }) => {
    let pipelineInput: PipelineInput;

    if (source.startsWith("http://") || source.startsWith("https://")) {
      // URL path: scrape article
      pipelineInput = await scrapeArticle(source, {
        publicDir: path.resolve(PROJECT_ROOT, "public"),
        logger,
      });
    } else {
      // JSON file path: read and validate
      const resolvedPath = path.isAbsolute(source)
        ? source
        : path.resolve(PROJECT_ROOT, source);
      const raw = readFileSync(resolvedPath, "utf-8");
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

      // Download URL-based images to public/ so Remotion can serve them
      const publicDir = path.resolve(PROJECT_ROOT, "public");
      const hasUrlImages = pipelineInput.images.some((img) =>
        img.source.startsWith("http")
      );
      if (hasUrlImages) {
        await mkdir(publicDir, { recursive: true });
        const downloaded = [];
        for (const img of pipelineInput.images) {
          if (img.source.startsWith("http")) {
            try {
              const resp = await fetch(img.source);
              if (!resp.ok) {
                downloaded.push(img);
                continue;
              }
              const buffer = Buffer.from(await resp.arrayBuffer());
              const ext =
                img.source.match(/\.(png|webp|gif)/i)?.[1] ?? "jpg";
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
        pipelineInput.images = downloaded;
      }
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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(pipelineInput, null, 2),
        },
      ],
    };
  }
);

// Tool 2: Build manuscript from subtitle groups + image assignments + pipeline input
server.tool(
  "build_manuscript",
  "Combine subtitle groups, image assignments, and pipeline input into a Manuscript. All parameters are JSON strings.",
  {
    subtitleGroups: z
      .string()
      .describe(
        'JSON string of SubtitleGroup[] — e.g. [{"index":0,"lines":["Line 1","Line 2"]}, ...]'
      ),
    imageAssignments: z
      .string()
      .describe(
        'JSON string of ImageAssignment[] — e.g. [{"groupIndex":0,"imageId":"img-0","description":"..."}, ...]'
      ),
    pipelineInput: z
      .string()
      .describe(
        "JSON string of the PipelineInput object (as returned by load_article)"
      ),
  },
  async ({ subtitleGroups, imageAssignments, pipelineInput }) => {
    try {
      const groups = JSON.parse(subtitleGroups);
      const assignments = JSON.parse(imageAssignments);
      const input = JSON.parse(pipelineInput);
      const manuscript = buildManuscript(groups, assignments, input);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(manuscript, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to build manuscript: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: Render manuscript to MP4 video
server.tool(
  "render_video",
  "Render a Manuscript to an MP4 video file using Remotion. Automatically downloads a headless browser if needed.",
  {
    manuscript: z.string().describe("JSON string of the Manuscript object"),
  },
  async ({ manuscript }) => {
    // Ensure headless browser is available (downloads on first run)
    logger("Ensuring headless browser is available...");
    await ensureBrowser({ chromeMode: "headless-shell" });

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
