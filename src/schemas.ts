import { z } from "zod/v4";

// Zod schemas for Claude structured output
export const SubtitleGroupsSchema = z.object({
  groups: z.array(
    z.array(z.string()).describe("Array of 3-5 short subtitle lines for one image")
  ).describe("Array of subtitle groups, one per image"),
});
export type SubtitleGroupsOutput = z.infer<typeof SubtitleGroupsSchema>;

// Input file schema for JSON mode
export const InputFileSchema = z.object({
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
