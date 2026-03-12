---
description: Generate a TikTok/Shorts-style video from a news article URL or JSON file
---

# Generate Video

Generate a short-form vertical video from a news article.

## Instructions

1. Determine the input source from `$ARGUMENTS`:
   - If it starts with `http://` or `https://`, it's a URL
   - If it ends with `.json`, it's a local file path
   - If no argument provided, ask the user for a URL or file path

2. Call the `load_article` MCP tool with the source. This returns a PipelineInput JSON object containing the article text and downloaded image paths. Save the full JSON response — you will need it in step 5.

3. **Generate subtitle groups yourself.** Read the article title and text from the PipelineInput, then write subtitle groups following these rules:

   **Language and style:**
   - Write in Norwegian
   - Use simple, direct, powerful language
   - Use present tense (nåtid) when possible
   - No quotation marks, no source attributions
   - Think "breaking news ticker" meets "viral TikTok text"

   **Structure:**
   - Generate 3-8 groups (aim for one group per available image, minimum 3, maximum 8)
   - Each group has 3-5 lines
   - Each line is MAX 3-7 words
   - The lines within a group tell one part of the story together
   - First group MUST start with an attention-grabbing hook
   - Create a narrative arc across groups: hook → facts → details → consequence

   **Example group:**
   `["Strømprisen eksploderer", "Nordmenn betaler rekordmye", "Regjeringen lover tiltak", "Men ekspertene tviler"]`

   **Output format:** A JSON array of SubtitleGroup objects:
   ```json
   [
     {"index": 0, "lines": ["Line 1", "Line 2", "Line 3"]},
     {"index": 1, "lines": ["Line 1", "Line 2", "Line 3", "Line 4"]}
   ]
   ```

4. **Assign images to subtitle groups yourself.** The PipelineInput contains an `images` array with `id` and `source` (absolute file path) for each image. Read each image file to see what it depicts, then assign the best-matching image to each subtitle group.

   **Guidelines:**
   - Prioritize visual relevance to the text group
   - Vary images — avoid using the same image for every group if alternatives exist
   - Match emotional tone (dramatic images for dramatic text, etc.)
   - Images CAN be reused across multiple groups if they are clearly the best choice

   **Output format:** A JSON array of ImageAssignment objects:
   ```json
   [
     {"groupIndex": 0, "imageId": "img-0", "description": "Brief description of why this image fits"},
     {"groupIndex": 1, "imageId": "img-1", "description": "Brief description"}
   ]
   ```
   Include one assignment per subtitle group.

5. Call the `build_manuscript` MCP tool with three JSON string parameters:
   - `subtitleGroups` — the subtitle groups JSON from step 3
   - `imageAssignments` — the image assignments JSON from step 4
   - `pipelineInput` — the full PipelineInput JSON from step 2

6. Call the `render_video` MCP tool with the manuscript JSON from step 5. Note: the first run may take 1-2 minutes as it downloads a headless browser.

7. Report results to the user:
   - Article title
   - Number of segments and total duration
   - Output file path
   - Suggest they open the file to review
