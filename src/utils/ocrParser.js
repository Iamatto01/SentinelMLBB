import { createWorker } from 'tesseract.js';
import { HEROES } from '../data/heroes';

export async function processScreenshotOCR(imageFile) {
  const worker = await createWorker('eng');

  const { data: { text } } = await worker.recognize(imageFile);
  await worker.terminate();

  return parsePostgameText(text);
}

// --- Helper: detect stats / numeric lines ---
function isStatsLine(line) {
  const s = line.replace(/[\s,.:\-\/]+/g, '');
  if (!s) return true;
  if (/^\d+$/.test(s)) return true;
  // KDA-style: "1 7 1 6164" or "8008 2 3 14"
  const nums = line.trim().split(/\s+/);
  if (nums.length >= 2 && nums.every(n => /^\d+(\.\d+)?$/.test(n))) return true;
  if (/^\d+(\.\d+)?%$/.test(s)) return true;
  // Single decimal like "3.0", "8.4"
  if (/^\d+\.\d+$/.test(s)) return true;
  // Date/time patterns
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line.trim())) return true;
  if (/^duration/i.test(line.trim())) return true;
  return false;
}

// --- Helper: skip common OCR keywords ---
const SKIP_KEYWORDS = [
  'submit', 'feedback', 'about', 'match', 'here', 'mvp', 'gold',
  'defeat', 'victory', 'win', 'lose', 'loss',
  'ranked', 'classic', 'custom', 'brawl', 'mcl', 'mro', 'tour',
  'turret', 'damage', 'taken', 'teamfight', 'participation',
  'duration', 'total', 'assist', 'kill', 'death'
];

function isSkipKeyword(line) {
  const l = line.toLowerCase().trim();
  return SKIP_KEYWORDS.some(kw => l.includes(kw));
}

// --- Levenshtein distance for fuzzy hero matching ---
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatchHero(word) {
  if (!word || word.length < 3) return '';
  const w = word.toLowerCase();
  // Exact match first
  for (const hero of HEROES) {
    if (w === hero.toLowerCase()) return hero;
  }
  // Fuzzy match
  let bestHero = '';
  let bestDist = 999;
  for (const hero of HEROES) {
    const h = hero.toLowerCase();
    const maxDist = h.length >= 6 ? 2 : 1;
    const dist = levenshtein(w, h);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestHero = hero;
    }
  }
  return bestHero;
}

export function parsePostgameText(text) {
  const src = String(text || '');
  const lines = src.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const lower = src.toLowerCase();

  // --- Mode Detection ---
  let mode = 'Ranked';
  if (/\b(classic)\b/i.test(lower)) mode = 'Classic';
  else if (/\b(custom)\b/i.test(lower)) mode = 'Custom';
  else if (/\b(mro|tour|tournament)\b/i.test(lower)) mode = 'Tour';
  else if (/\b(mcl)\b/i.test(lower)) mode = 'MCL';
  else if (/\b(brawl)\b/i.test(lower)) mode = 'Brawl';

  // --- Result Detection ---
  let result = 'Win';
  if (/defeat/i.test(lower)) result = 'Lose';
  else if (/\blose\b|\bloss\b/i.test(lower)) result = 'Lose';
  else if (/victory/i.test(lower)) result = 'Win';
  else if (/\bwin\b/i.test(lower)) result = 'Win';

  // --- Duration Detection ---
  let duration = 0;
  // Try "Duration MM:SS" first
  const durLabelMatch = lower.match(/duration\s+(\d{1,2})[:.]\d{2}/i);
  if (durLabelMatch) duration = parseInt(durLabelMatch[1]) || 0;

  if (!duration) {
    const timePatterns = [
      /(\d{1,2})\s*:\s*(\d{2})/,
      /(\d{1,2})\s*\.\s*(\d{2})\s*$/m,
      /duration[:\s]*(\d{1,2})/i,
      /(\d{1,2})\s*(?:min|m)\b/i,
      /(\d{1,2})\s*分/,
    ];
    for (const pat of timePatterns) {
      const m = lower.match(pat);
      if (m) {
        duration = parseInt(m[1]) || 0;
        if (duration > 0 && duration < 60) break;
        duration = 0;
      }
    }
  }

  // === TWO-PASS HERO+PLAYER DETECTION ===
  const heroesByLength = [...HEROES].sort((a, b) => b.length - a.length);
  const heroLines = []; // { lineIdx, hero }
  const usedHeroes = {};
  const heroLineSet = {};

  // Pass 1: Find all lines that contain a hero name
  for (let li = 0; li < lines.length; li++) {
    if (heroLines.length >= 5) break;
    const line = lines[li];
    const lineLower = line.toLowerCase();

    let heroFound = '';

    // Exact match
    for (const hero of heroesByLength) {
      if (usedHeroes[hero]) continue;
      if (lineLower.includes(hero.toLowerCase())) {
        heroFound = hero;
        break;
      }
    }

    // Fuzzy match
    if (!heroFound) {
      const words = line.split(/[\s|:;\-\[\]().,]+/).filter(w => w.length >= 3);
      for (let wi = 0; wi < words.length; wi++) {
        const fm = fuzzyMatchHero(words[wi]);
        if (fm && !usedHeroes[fm]) { heroFound = fm; break; }
        if (wi + 1 < words.length) {
          const combo = words[wi] + ' ' + words[wi + 1];
          const fm2 = fuzzyMatchHero(combo);
          if (fm2 && !usedHeroes[fm2]) { heroFound = fm2; break; }
        }
      }
    }

    // Also check special partial matches
    if (!heroFound) {
      const fuzzyMap = {
        'lapu': 'Lapu-Lapu', 'yss': 'Yi Sun-shin', 'xborg': 'X.Borg',
        'x borg': 'X.Borg', 'chang': "Chang'e", 'luo': 'Luo Yi',
        'popol': 'Popol and Kupa', 'sun-shin': 'Yi Sun-shin',
      };
      for (const [partial, fullHero] of Object.entries(fuzzyMap)) {
        if (usedHeroes[fullHero]) continue;
        if (lineLower.includes(partial)) {
          heroFound = fullHero;
          break;
        }
      }
    }

    if (heroFound && !usedHeroes[heroFound]) {
      usedHeroes[heroFound] = true;
      heroLines.push({ lineIdx: li, hero: heroFound });
      heroLineSet[li] = true;
    }
  }

  // Pass 2: For each hero, look BACKWARDS to find the player name
  const pairs = [];
  const usedPlayerLines = {};

  for (const entry of heroLines) {
    const { lineIdx: heroIdx, hero } = entry;
    let playerName = '';

    // Check if the hero line itself also has a player name embedded
    const rx = new RegExp(hero.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    const remainder = lines[heroIdx]
      .replace(rx, '')
      .replace(/[|:\-\[\](){}]/g, ' ')
      .replace(/\d+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (remainder.length >= 2 && !isStatsLine(remainder) && !isSkipKeyword(remainder)) {
      playerName = remainder.substring(0, 20).trim();
    }

    // If no player name on the same line, look backwards up to 5 lines
    if (!playerName) {
      for (let back = heroIdx - 1; back >= Math.max(0, heroIdx - 5); back--) {
        if (heroLineSet[back]) break; // hit another hero line, stop
        if (usedPlayerLines[back]) continue;
        const candidate = lines[back];
        if (isStatsLine(candidate)) continue;
        if (isSkipKeyword(candidate)) continue;
        if (!/[a-zA-Z]/.test(candidate)) continue;
        // This is likely the player name
        playerName = candidate.replace(/[|:\-\[\](){}]/g, ' ').replace(/\s+/g, ' ').trim();
        playerName = playerName.substring(0, 20).trim();
        usedPlayerLines[back] = true;
        break;
      }
    }

    if (!playerName) playerName = '';
    pairs.push({ player: playerName, hero });
  }

  // Pad to 5 pairs
  while (pairs.length < 5) {
    pairs.push({ player: '', hero: '' });
  }

  return {
    mode,
    duration,
    result,
    pairs,
    rawText: src
  };
}
