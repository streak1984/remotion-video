import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import {
  type SubtitleGroup,
  type ImageInput,
  type ImageAssignment,
} from "../types.js";
import { getCleanEnv } from "./sdk-env.js";

const SYSTEM_PROMPT = `Du er en erfaren videoredaktør som tilordner pressebilder til undertekstgrupper for en kort nyhetsvideo.

Du vil bli bedt om å lese bildefiler og se nummererte grupper med undertekstlinjer.

For hver gruppe, velg bildet som passer best til innholdet i den gruppen.
Bilder KAN gjenbrukes på flere grupper hvis de klart er det beste valget.
Gi en kort beskrivelse av hvert bilde for å forklare valget ditt.

Prioriter:
- Visuell relevans til tekstgruppen
- Variasjon (unngå å bruke samme bilde for hver gruppe hvis alternativer finnes)
- Emosjonell match (dramatiske bilder for dramatisk tekst, osv.)

VIKTIG: Etter at du har lest og analysert bildene, svar KUN med en JSON-array av tilordninger i dette formatet:
[{"groupIndex": 0, "imageId": "img-1", "description": "Kort beskrivelse"}, ...]
Inkluder én tilordning per gruppe. Svar KUN med JSON-arrayen, ingenting annet.`;

/**
 * Use Claude to analyze images and assign them to subtitle groups.
 */
export async function assignImages(
  groups: SubtitleGroup[],
  images: ImageInput[]
): Promise<ImageAssignment[]> {

  const imageList = images
    .map((img) => `- Bilde "${img.id}": ${path.resolve(img.source)}`)
    .join("\n");

  const groupList = groups
    .map((g) => `  Gruppe ${g.index}:\n${g.lines.map((l) => `    - "${l}"`).join("\n")}`)
    .join("\n\n");

  const prompt = `Les og analyser disse bildefilene:
${imageList}

Her er undertekstgruppene for videoen:
${groupList}

Les hvert bilde med Read-verktøyet, beskriv hva du ser, og tilordne det mest relevante bildet til hver gruppe.
Avslutt med KUN en JSON-array: [{"groupIndex": 0, "imageId": "...", "description": "..."}]`;

  let resultText: string | null = null;

  for await (const message of query({
    prompt,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: "sonnet",
      env: getCleanEnv(),
      allowedTools: ["Read"],
      tools: ["Read"],
      maxTurns: 10,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      resultText = message.result;
    }
  }

  if (!resultText) {
    throw new Error("Failed to get image assignments from Claude");
  }

  const jsonMatch = resultText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in Claude response: ${resultText.substring(0, 300)}`);
  }

  let result: ImageAssignment[];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected array");
    }
    result = parsed.map((item: { groupIndex: number; imageId: string; description: string }) => ({
      groupIndex: item.groupIndex,
      imageId: item.imageId,
      description: item.description || "",
    }));
  } catch (e) {
    throw new Error(`Failed to parse assignments JSON: ${(e as Error).message}\nRaw: ${jsonMatch[0].substring(0, 300)}`);
  }

  // Validate
  const validIndexes = new Set(groups.map((g) => g.index));
  const validImageIds = new Set(images.map((i) => i.id));

  for (const assignment of result) {
    if (!validIndexes.has(assignment.groupIndex)) {
      assignment.groupIndex = Math.min(
        Math.max(0, assignment.groupIndex),
        groups.length - 1
      );
    }
    if (!validImageIds.has(assignment.imageId)) {
      assignment.imageId = images[0].id;
    }
  }

  // Ensure every group has an assignment
  for (const group of groups) {
    if (!result.some((a) => a.groupIndex === group.index)) {
      const fallbackImage = images[group.index % images.length];
      result.push({
        groupIndex: group.index,
        imageId: fallbackImage.id,
        description: "Automatisk tilordnet (fallback)",
      });
    }
  }

  return result.sort((a, b) => a.groupIndex - b.groupIndex);
}
