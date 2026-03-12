import { readFileSync } from "fs";
import path from "path";
import { scrapeArticle } from "./pipeline/scrape.js";
import { runPipeline } from "./pipeline/index.js";
import { InputFileSchema } from "./schemas.js";
import type { PipelineInput } from "./types.js";

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(
      "Bruk: npx tsx src/cli.ts <url-eller-input.json>\n\nEksempler:\n  npx tsx src/cli.ts https://www.vg.no/nyheter/...\n  npx tsx src/cli.ts input/example.json"
    );
    process.exit(1);
  }

  const projectRoot = process.cwd();
  let pipelineInput: PipelineInput;

  if (input.startsWith("http://") || input.startsWith("https://")) {
    console.log("Steg 1/5: Henter artikkel fra URL...");
    pipelineInput = await scrapeArticle(input, {
      publicDir: path.resolve(projectRoot, "public"),
      logger: console.log,
    });
  } else {
    console.log("Steg 1/5: Leser input fra JSON-fil...");
    const raw = readFileSync(path.resolve(input), "utf-8");
    const parsed = InputFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error("Ugyldig input-fil:", parsed.error.message);
      process.exit(1);
    }
    pipelineInput = parsed.data;
  }

  if (pipelineInput.images.length === 0) {
    console.error("Feil: Ingen bilder funnet. Kan ikke generere video uten bilder.");
    process.exit(1);
  }

  await runPipeline(pipelineInput, {
    projectRoot,
    onProgress: console.log,
  });
}

main().catch((err) => {
  console.error("Feil:", err.message || err);
  process.exit(1);
});
