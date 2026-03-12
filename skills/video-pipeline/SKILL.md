---
name: video-pipeline
description: Background knowledge about the Remotion video generation pipeline, input formats, and capabilities. Reference when users ask about video generation, the pipeline, or need help with input formats.
---

# Video Pipeline Knowledge

This plugin generates TikTok/Shorts-style vertical videos from news articles.

## Pipeline Steps

1. **Load article** — `load_article` tool: scrape URL or read JSON file, download images to `public/`, return PipelineInput JSON
2. **Generate subtitles** — Claude generates 3-8 groups of 3-5 short subtitle lines each (in Norwegian), following the rules below
3. **Assign images** — Claude reads each image file and matches the most relevant image to each subtitle group, following the guidelines below
4. **Build manuscript** — `build_manuscript` tool: combines subtitle groups, image assignments, and timing data; adds a CTA segment at the end
5. **Render video** — `render_video` tool: ensures headless browser is available, then bundles and renders H.264 MP4 at 1080x1920

## MCP Tools

This plugin provides three mechanical MCP tools. None require an API key — all AI work (subtitles, image assignment) is done by Claude directly.

| Tool | Input | Returns |
|------|-------|---------|
| `load_article` | `source` (URL or JSON file path) | PipelineInput JSON with article text and image paths |
| `build_manuscript` | `subtitleGroups`, `imageAssignments`, `pipelineInput` (all JSON strings) | Manuscript JSON with segments and timing |
| `render_video` | `manuscript` (JSON string) | `{ outputPath }` — path to the rendered MP4 file |

## Subtitle Generation Rules

When generating subtitle groups, follow these rules exactly:

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

**Output format:** JSON array of `SubtitleGroup` objects:
```json
[{"index": 0, "lines": ["Line 1", "Line 2", "Line 3"]}, ...]
```

## Image Assignment Guidelines

When assigning images to subtitle groups:

- Read each image file to understand what it depicts
- For each subtitle group, choose the image that best matches the content
- Prioritize visual relevance to the text group
- Vary images — avoid using the same image for every group if alternatives exist
- Match emotional tone (dramatic images for dramatic text, etc.)
- Images CAN be reused across multiple groups if they are clearly the best choice
- Include a brief description of why each image was chosen

**Output format:** JSON array of `ImageAssignment` objects:
```json
[{"groupIndex": 0, "imageId": "img-0", "description": "Brief description"}, ...]
```

Include one assignment per subtitle group.

## Input Formats

### URL Input
Any news article URL. The scraper extracts title, body text, and up to 8 images. Images are downloaded to the local `public/` directory.

### JSON Input
```json
{
  "article": {
    "title": "Article title",
    "text": "Full article body text",
    "url": "https://source-url (optional, used for CTA)"
  },
  "images": [
    {
      "id": "img-0",
      "source": "https://url/to/image.jpg or /path/to/local.jpg",
      "byline": "Photo credit (optional)"
    }
  ],
  "options": {
    "secondsPerSegment": 4
  }
}
```

## Output

- **Format:** H.264 MP4, 1080x1920 (9:16 vertical), 30fps
- **Duration:** Varies by article length (typically 30-120 seconds)
- **Location:** `output/{timestamp}.mp4` in the project directory
- **Style:** Ken Burns camera effects (zoom, pan, rotate) + karaoke-style word-by-word subtitles

## Timing

Duration is calculated automatically from word count:
- ~10 frames (0.33s) per word
- 12 frames (0.4s) pause between lines
- Minimum 3 seconds per segment
- 4-second CTA card at the end

## Camera Movements

Each segment gets one of these Ken Burns effects, cycling through:
zoom-in, pan-right, zoom-out, pan-left, pan-up, zoom-rotate-right

## Prerequisites

- Node.js 18+
- No other system dependencies needed (headless browser is downloaded automatically on first render)
