---
name: video-pipeline
description: Background knowledge about the Remotion video generation pipeline, input formats, and capabilities. Reference when users ask about video generation, the pipeline, or need help with input formats.
---

# Video Pipeline Knowledge

This plugin generates TikTok/Shorts-style vertical videos from news articles.

## Pipeline Steps

1. **Scrape/load article** — Extract title, body text, and images from a URL or JSON file
2. **Generate subtitles** — Claude AI creates 3-8 groups of 3-5 short subtitle lines each (in Norwegian)
3. **Assign images** — Claude AI reads each image file and matches the most relevant image to each subtitle group
4. **Build manuscript** — Combines subtitle groups, image assignments, and timing data; adds a CTA segment at the end
5. **Render video** — Remotion bundles and renders H.264 MP4 at 1080x1920

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

## Subtitle Style

- Written in Norwegian
- 3-5 lines per group, 3-7 words per line
- Present tense, direct and punchy language
- Narrative arc: hook → facts → details → consequence
- Word-by-word reveal with opacity animation

## Camera Movements

Each segment gets one of these Ken Burns effects, cycling through:
zoom-in, pan-right, zoom-out, pan-left, pan-up, zoom-rotate-right

## Prerequisites

- Node.js 18+
- Chrome or Chromium (for Remotion rendering)
- ffmpeg (for video encoding)
- `ANTHROPIC_API_KEY` environment variable (for Claude AI calls)
