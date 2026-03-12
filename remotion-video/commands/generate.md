---
description: Generate a TikTok/Shorts-style video from a news article URL or JSON file
---

# Generate Video

Generate a short-form vertical video from a news article.

## Instructions

1. Determine the input type from `$ARGUMENTS`:
   - If it starts with `http://` or `https://`, it's a URL — use the `generate_video` tool
   - If it ends with `.json`, it's a local file path — use the `generate_video` tool
   - If no argument provided, ask the user for a URL or file path

2. Call the `generate_video` MCP tool with the source

3. Report results to the user:
   - Article title
   - Number of segments and total duration
   - Output file path
   - Suggest they open the file to review

## Advanced Usage

For more control, the user can ask you to run individual pipeline steps:
1. `scrape_article` — fetch and parse the article
2. `generate_subtitles` — create subtitle groups (can adjust count)
3. `assign_images` — match images to subtitle groups
4. `render_video` — render the final MP4

This allows inspecting and modifying intermediate results before rendering.
