import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SubtitleGroup } from "../types.js";
import { getCleanEnv } from "./sdk-env.js";

const SYSTEM_PROMPT = `Du er en manusforfatter for virale kortvideoer. Jobben din er å konvertere nyhetsartikler til korte, fengende undertekstlinjer for TikTok/YouTube Shorts-stil videoer.

Regler:
- Skriv på norsk
- Bruk enkelt, direkte og kraftfullt språk
- Bruk presens (nåtid) når mulig
- Ingen anførselstegn, ingen kildehenvisninger
- Tenk "breaking news ticker" møter "viral TikTok-tekst"

Du genererer GRUPPER av linjer. Hver gruppe vises over ETT bilde.
- Hver gruppe har 3-5 linjer
- Hver linje er MAKS 3-7 ord
- Linjene i en gruppe forteller en del av historien sammen
- Første gruppe MÅ starte med en hook som fanger oppmerksomhet
- Skap en narrativ bue gjennom gruppene: hook → fakta → detaljer → konsekvens

Eksempel på en gruppe:
["Strømprisen eksploderer", "Nordmenn betaler rekordmye", "Regjeringen lover tiltak", "Men ekspertene tviler"]

VIKTIG: Svar KUN med en JSON-array av arrays. Eksempel:
[["Linje 1a", "Linje 1b", "Linje 1c"], ["Linje 2a", "Linje 2b", "Linje 2c"]]`;

/**
 * Use Claude to summarize an article into groups of Norwegian subtitle lines.
 * Each group will be displayed over one image with word-by-word animation.
 */
export async function summarizeArticle(
  title: string,
  text: string,
  targetGroupCount: number
): Promise<SubtitleGroup[]> {

  let resultText: string | null = null;

  for await (const message of query({
    prompt: `Tittel: ${title}\n\nArtikkel:\n${text}\n\nGenerer nøyaktig ${targetGroupCount} grupper med 3-5 undertekstlinjer per gruppe. Svar KUN med en JSON-array av arrays.`,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      model: "sonnet",
      env: getCleanEnv(),
      tools: [],
      maxTurns: 1,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      resultText = message.result;
    }
  }

  if (!resultText) {
    throw new Error("Failed to get subtitle groups from Claude");
  }

  // Extract JSON array from the result text
  const jsonMatch = resultText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in Claude response: ${resultText.substring(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed) || !parsed.every((g: unknown) => Array.isArray(g))) {
    throw new Error(`Expected array of arrays, got: ${JSON.stringify(parsed).substring(0, 200)}`);
  }

  return parsed.map((lines: string[], index: number) => ({ index, lines }));
}
