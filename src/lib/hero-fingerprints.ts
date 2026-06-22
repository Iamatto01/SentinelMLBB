/**
 * Hero Image Fingerprinting System
 *
 * Computes color-histogram fingerprints for every hero icon in
 * /images/heroes/<id>.png and provides a matcher that takes
 * an ImageData crop and returns the best hero match.
 *
 * Everything runs client-side on a hidden canvas.
 */

import { ALL_HEROES } from "@/data/heroes-data";

// ── Types ────────────────────────────────────────────────────────────────────
export interface HeroFingerprint {
  heroId: string;
  heroName: string;
  /** Average RGB per 4×4 grid cell (48 values: 16 cells × 3 channels) */
  gridColors: number[];
  /** Top-5 dominant colour buckets (quantized to 4-bit per channel) */
  dominantBuckets: number[];
}

export interface MatchResult {
  heroId: string;
  heroName: string;
  confidence: number; // 0-1
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRID = 4; // 4×4 grid
const BUCKET_BITS = 4; // quantize each channel to 4 bits (16 levels)

function quantize(channel: number): number {
  return channel >> (8 - BUCKET_BITS);
}

function bucketKey(r: number, g: number, b: number): number {
  return (quantize(r) << (BUCKET_BITS * 2)) | (quantize(g) << BUCKET_BITS) | quantize(b);
}

/**
 * Compute the fingerprint of an ImageData.
 * Returns { gridColors, dominantBuckets }.
 */
function computeFingerprint(data: ImageData): { gridColors: number[]; dominantBuckets: number[] } {
  const { width, height, data: px } = data;
  const cellW = Math.floor(width / GRID);
  const cellH = Math.floor(height / GRID);

  const gridColors: number[] = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      let r = 0, g = 0, b = 0, count = 0;
      const x0 = gx * cellW;
      const y0 = gy * cellH;
      for (let y = y0; y < y0 + cellH; y++) {
        for (let x = x0; x < x0 + cellW; x++) {
          const i = (y * width + x) * 4;
          const a = px[i + 3];
          if (a < 128) continue; // skip transparent
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
          count++;
        }
      }
      if (count > 0) {
        gridColors.push(Math.round(r / count), Math.round(g / count), Math.round(b / count));
      } else {
        gridColors.push(0, 0, 0);
      }
    }
  }

  // Dominant colour buckets
  const bucketCounts = new Map<number, number>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const key = bucketKey(px[i], px[i + 1], px[i + 2]);
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
  }
  const sorted = [...bucketCounts.entries()].sort((a, b) => b[1] - a[1]);
  const dominantBuckets = sorted.slice(0, 5).map(([k]) => k);

  return { gridColors, dominantBuckets };
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Count how many dominant buckets overlap.
 */
function bucketOverlap(a: number[], b: number[]): number {
  const setB = new Set(b);
  let overlap = 0;
  for (const v of a) {
    if (setB.has(v)) overlap++;
  }
  return overlap / Math.max(a.length, 1);
}

// ── Singleton DB ─────────────────────────────────────────────────────────────

let _db: HeroFingerprint[] | null = null;
let _dbPromise: Promise<HeroFingerprint[]> | null = null;

/**
 * Load hero icon from a URL onto a canvas and return its ImageData.
 */
function loadImageData(src: string, size = 64): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      resolve(ctx.getImageData(0, 0, size, size));
    };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

/**
 * Build the fingerprint database by loading all hero icons.
 * Resolves once the DB is ready. Results are cached.
 */
export function buildFingerprintDB(): Promise<HeroFingerprint[]> {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    const db: HeroFingerprint[] = [];
    // Process in batches of 10 to avoid hammering the browser
    const batchSize = 10;
    for (let i = 0; i < ALL_HEROES.length; i += batchSize) {
      const batch = ALL_HEROES.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (hero) => {
          // Use the correct basePath defined in next.config.ts
          const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/SentinelMLBB') 
            ? '/SentinelMLBB' 
            : '';
          const src = `${basePath}/images/heroes/${hero.id}.png`;
          try {
            const imgData = await loadImageData(src);
            const fp = computeFingerprint(imgData);
            return { heroId: hero.id, heroName: hero.name, ...fp } as HeroFingerprint;
          } catch (err) {
            // Hero image might not exist — skip
            console.warn(`Fingerprint DB: Failed to load ${src}`, err);
            return null;
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          db.push(r.value);
        }
      }
    }
    _db = db;
    return db;
  })();

  return _dbPromise;
}

/**
 * Match an ImageData crop against the fingerprint database.
 * Returns top-N matches sorted by confidence.
 */
export async function matchHeroIcon(
  crop: ImageData,
  topN = 3
): Promise<MatchResult[]> {
  const db = await buildFingerprintDB();
  const fp = computeFingerprint(crop);

  const scored = db.map((entry) => {
    const gridSim = cosineSimilarity(fp.gridColors, entry.gridColors);
    const bucketSim = bucketOverlap(fp.dominantBuckets, entry.dominantBuckets);
    // Weighted combination
    const confidence = gridSim * 0.7 + bucketSim * 0.3;
    return { heroId: entry.heroId, heroName: entry.heroName, confidence };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, topN);
}

/**
 * Extract ImageData from a specific rectangular region of a loaded image element.
 */
export function cropImageRegion(
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  outputSize = 64
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, x, y, w, h, 0, 0, outputSize, outputSize);
  return ctx.getImageData(0, 0, outputSize, outputSize);
}
