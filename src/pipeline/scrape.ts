import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { PipelineInput, ImageInput, Logger } from "../types.js";

/**
 * Scrape an article URL and extract title, body text, and images.
 * Downloads images to the given publicDir for Remotion to serve.
 */
export async function scrapeArticle(
  url: string,
  options: { publicDir: string; logger: Logger }
): Promise<PipelineInput> {
  const { publicDir, logger } = options;

  logger(`  Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract title: try og:title, then <h1>, then <title>
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled";

  // Extract article body text
  // Try common article selectors in order of specificity
  const articleSelectors = [
    "article",
    '[role="article"]',
    ".article-body",
    ".article__body",
    ".story-body",
    "main",
  ];

  const extractParagraphs = (root: cheerio.Cheerio<any>): string[] => {
    const result: string[] = [];
    root.find("p").each((_, p) => {
      const text = $(p).text().trim();
      if (text.length > 20) result.push(text);
    });
    return result;
  };

  let bodyText = "";
  for (const selector of articleSelectors) {
    const el = $(selector);
    if (el.length) {
      const paragraphs = extractParagraphs(el);
      if (paragraphs.length > 0) {
        bodyText = paragraphs.join("\n\n");
        break;
      }
    }
  }

  // Fallback: get all <p> tags
  if (!bodyText) {
    bodyText = extractParagraphs($.root()).join("\n\n");
  }

  if (!bodyText) {
    throw new Error("Could not extract article text from the page");
  }

  // Extract images
  const imageUrls = new Set<string>();

  // Try og:image first
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    imageUrls.add(resolveUrl(ogImage, url));
  }

  // Get images from article area — prefer srcset for higher resolution
  for (const selector of articleSelectors) {
    const sizeBefore = imageUrls.size;
    $(selector)
      .find("img")
      .each((_, img) => {
        const bestSrc = getBestImageSrc($, img, url);
        if (bestSrc && isContentImage(bestSrc)) {
          imageUrls.add(bestSrc);
        }
      });
    if (imageUrls.size > sizeBefore) break;
  }

  // Fallback: get prominent images from the page
  if (imageUrls.size === 0) {
    $("img").each((_, img) => {
      const bestSrc = getBestImageSrc($, img, url);
      const width = parseInt($(img).attr("width") || "0");
      if (bestSrc && isContentImage(bestSrc) && (width === 0 || width >= 300)) {
        imageUrls.add(bestSrc);
      }
    });
  }

  // Download images to publicDir (in parallel)
  await mkdir(publicDir, { recursive: true });

  const urlsToDownload = [...imageUrls].slice(0, 8);
  logger(`  Downloading ${urlsToDownload.length} images...`);

  const downloadResults = await Promise.allSettled(
    urlsToDownload.map(async (imgUrl, idx) => {
      const ext = getImageExtension(imgUrl);
      const filename = `img-${idx}.${ext}`;
      const filepath = path.join(publicDir, filename);

      const imgResponse = await fetch(imgUrl);
      if (!imgResponse.ok) return null;

      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      if (buffer.length < 5000) return null; // Skip tiny images

      await writeFile(filepath, buffer);
      return { id: `img-${idx}`, source: filepath } as ImageInput;
    })
  );

  const images = downloadResults
    .filter(
      (r): r is PromiseFulfilledResult<ImageInput | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((r): r is ImageInput => r !== null);

  if (images.length === 0) {
    throw new Error("No usable images found on the page");
  }

  logger(`  Extracted: "${title}" (${bodyText.length} chars, ${images.length} images)`);

  return {
    article: { title, text: bodyText, url },
    images,
  };
}

/**
 * Get the highest-resolution image URL available.
 * Prefers srcset (largest width descriptor) over src/data-src.
 */
function getBestImageSrc($: cheerio.CheerioAPI, img: any, baseUrl: string): string | null {
  // Try srcset first — pick the largest width descriptor
  const srcset = $(img).attr("srcset") || $(img).attr("data-srcset") || "";
  if (srcset) {
    const candidates = srcset
      .split(",")
      .map((entry) => entry.trim().split(/\s+/))
      .filter((parts) => parts.length >= 1 && parts[0])
      .map((parts) => ({
        url: parts[0],
        width: parseInt(parts[1]?.replace("w", "") || "0"),
      }))
      .sort((a, b) => b.width - a.width);

    if (candidates.length > 0) {
      return resolveUrl(candidates[0].url, baseUrl);
    }
  }

  // Fallback to src or data-src
  const src = $(img).attr("src") || $(img).attr("data-src") || "";
  if (src) return resolveUrl(src, baseUrl);
  return null;
}

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function isContentImage(src: string): boolean {
  // Filter out tracking pixels, icons, logos, etc.
  const ignore = [
    "logo",
    "icon",
    "avatar",
    "badge",
    "emoji",
    "pixel",
    "tracking",
    "advertisement",
    "banner-ad",
    ".svg",
    "data:image",
    "1x1",
    "spacer",
  ];
  const lower = src.toLowerCase();
  return !ignore.some((term) => lower.includes(term));
}

function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".png")) return "png";
    if (pathname.endsWith(".webp")) return "webp";
    if (pathname.endsWith(".gif")) return "gif";
  } catch {
    // Malformed URL — default to jpg
  }
  return "jpg";
}
