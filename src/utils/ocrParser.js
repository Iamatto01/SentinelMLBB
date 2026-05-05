import { createWorker } from 'tesseract.js';
import { HEROES } from '../data/heroes';

export async function processScreenshotOCR(imageFile) {
  const worker = await createWorker('eng');

  const { data: { text } } = await worker.recognize(imageFile);
  await worker.terminate();

  return parsePostgameText(text);
}

export function parsePostgameText(text) {
  const src = String(text || "");
  const lines = src.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const lower = src.toLowerCase();

  // --- Mode Detection ---
  let mode = "Ranked";
  if (/\b(classic)\b/i.test(lower)) mode = "Classic";
  else if (/\b(custom)\b/i.test(lower)) mode = "Custom";
  else if (/\b(mro|tour|tournament)\b/i.test(lower)) mode = "Tour";
  else if (/\b(mcl)\b/i.test(lower)) mode = "MCL";
  else if (/\b(brawl)\b/i.test(lower)) mode = "Brawl";

  // --- Result Detection (more aggressive) ---
  let result = "Win";
  // Look for DEFEAT first since it's usually more prominent in screenshots
  if (/defeat/i.test(lower)) result = "Lose";
  else if (/\blose\b|\bloss\b/i.test(lower)) result = "Lose";
  else if (/victory/i.test(lower)) result = "Win";
  else if (/\bwin\b/i.test(lower)) result = "Win";

  // --- Duration Detection (improved) ---
  let duration = 0;
  // Try MM:SS format first (e.g., "12:34" or "12.34")
  const timePatterns = [
    /(\d{1,2})\s*:\s*(\d{2})/,         // 12:34
    /(\d{1,2})\s*\.\s*(\d{2})\s*$/m,   // 12.34 at end of line
    /duration[:\s]*(\d{1,2})/i,          // "Duration: 12"
    /(\d{1,2})\s*(?:min|m)\b/i,         // "12 min" or "12m"
    /(\d{1,2})\s*分/,                    // Chinese minutes character
  ];
  
  for (const pat of timePatterns) {
    const m = lower.match(pat);
    if (m) {
      duration = parseInt(m[1]) || 0;
      if (duration > 0 && duration < 60) break;
      duration = 0;
    }
  }

  // --- Hero Detection (improved with fuzzy matching) ---
  const pairs = [];
  const usedHeroes = {};
  const heroesByLength = [...HEROES].sort((a, b) => b.length - a.length);

  // First pass: exact hero name matching in each line
  lines.forEach(line => {
    if (pairs.length >= 5) return;
    const lineLower = line.toLowerCase();
    
    for (const hero of heroesByLength) {
      if (usedHeroes[hero]) continue;
      
      const heroLower = hero.toLowerCase();
      // Check for exact or close match
      if (lineLower.includes(heroLower)) {
        usedHeroes[hero] = true;
        
        // Try to extract player name from the same line
        const rx = new RegExp(hero.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
        let player = line.replace(rx, " ")
          .replace(/[|:\-\[\](){}]/g, " ")
          .replace(/\d+\s*(\/\s*\d+\s*){2}/g, " ")  // Remove K/D/A patterns like "5/3/7"
          .replace(/\d+(\.\d+)?%/g, " ")               // Remove percentages
          .replace(/\b\d{1,2}:\d{2}\b/g, " ")         // Remove time patterns
          .replace(/\s+/g, " ").trim();
        
        // Clean up common OCR artifacts
        player = player.replace(/^['"<>]+|['"<>]+$/g, '').substring(0, 15).trim();
        if (!player || player.length < 2) player = "";
        
        pairs.push({ player, hero });
        break;
      }
    }
  });

  // Second pass: try fuzzy matching for heroes with common OCR mistakes
  if (pairs.length < 5) {
    const fuzzyMap = {
      'lapu': 'Lapu-Lapu',
      'yss': 'Yi Sun-shin',
      'xborg': 'X.Borg',
      'x borg': 'X.Borg',
      'chang': "Chang'e",
      'luo': 'Luo Yi',
      'popol': 'Popol and Kupa',
      'sun-shin': 'Yi Sun-shin',
    };

    lines.forEach(line => {
      if (pairs.length >= 5) return;
      const lineLower = line.toLowerCase();
      
      for (const [partial, fullHero] of Object.entries(fuzzyMap)) {
        if (usedHeroes[fullHero]) continue;
        if (lineLower.includes(partial)) {
          usedHeroes[fullHero] = true;
          pairs.push({ player: "", hero: fullHero });
          break;
        }
      }
    });
  }

  // Pad to 5 pairs
  while (pairs.length < 5) {
    pairs.push({ player: "", hero: "" });
  }

  return {
    mode,
    duration,
    result,
    pairs,
    rawText: src
  };
}
