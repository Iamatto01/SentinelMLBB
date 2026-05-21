/**
 * Scrape hero data from mlbb.tools and generate updated heroData.ts
 * Run: node scripts/scrape-heroes.mjs
 */

const HERO_SLUGS = [
  "tigreal","khufra","franco","johnson","grock","atlas","uranus","hylos","akai",
  "belerick","minotaur","edith","baxia","carmilla","gloo","chip","gatotkaca",
  "fredrinn","lolita","marcel","obsidia",
  "chou","paquito","yu-zhong","dyrroth","terizla","zilong","aldous","esmeralda",
  "masha","badang","guinevere","ruby","phoveus","sun","thamuz","hilda","alucard",
  "silvanna","freya","jawhead","bane","x.borg","lapu-lapu","khaleed","barats",
  "leomord","martis","arlott","alpha","roger","harith","sora","zetian",
  "fanny","ling","lancelot","hayabusa","gusion","saber","helcurt","natalia",
  "karina","hanzo","benedetta","aamon","joy","nolan","suyou",
  "pharsa","yve","kagura","lylia","valir","nana","vexana","novaria","lunox",
  "alice","cecilion","odette","cyclops","luo-yi","vale","xavier","valentina",
  "esmeralda","kadita","harley","eudora","aurora","change","zhask","zhuxin",
  "beatrix","claude","karrie","brody","clint","moskov","melissa","wanwan",
  "irithel","hanabi","layla","miya","lesley","granger","roger","popol-and-kupa",
  "bruno","yi-sun-shin","kimmy","ixia",
  "estes","diggie","mathilda","angela","faramis","floryn","rafaela","kaja",
  "luo-yi","minsitthar","johnson"
];

// De-duplicate
const uniqueSlugs = [...new Set(HERO_SLUGS)];

async function fetchHeroPage(slug) {
  const url = `https://mlbb.tools/heroes/${slug}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    console.error(`Failed to fetch ${slug}: ${e.message}`);
    return null;
  }
}

function extractMetaDescription(html) {
  // OG description has the key data
  const ogMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
  if (ogMatch) return ogMatch[1];
  const metaMatch = html.match(/name="description"\s+content="([^"]+)"/);
  if (metaMatch) return metaMatch[1];
  return null;
}

function parseMetaDescription(desc, slug) {
  // Example: "Tigreal is a Tank hero played in Roam lane. 47.3% win rate across all ranks in 2026. View counter picks, synergies, skill combos, and pro builds."
  // or: "Tigreal is a Tank/Support hero played in Roam lane..."
  const result = {
    slug,
    name: "",
    roles: [],
    winRate: "",
    description: desc
  };

  // Extract name: first word before "is a"
  const nameMatch = desc.match(/^(.+?)\s+is\s+a[n]?\s+/i);
  if (nameMatch) result.name = nameMatch[1];

  // Extract roles: "is a Tank hero" or "is a Tank/Support hero"
  const roleMatch = desc.match(/is\s+a[n]?\s+([\w/]+)\s+hero/i);
  if (roleMatch) {
    result.roles = roleMatch[1].split('/').map(r => r.trim());
  }

  // Extract win rate
  const wrMatch = desc.match(/([\d.]+)%\s+win\s+rate/i);
  if (wrMatch) result.winRate = wrMatch[1];

  return result;
}

async function main() {
  console.log(`Scraping ${uniqueSlugs.length} heroes from mlbb.tools...`);
  
  const results = [];
  
  // Batch in groups of 5 to avoid hammering
  for (let i = 0; i < uniqueSlugs.length; i += 5) {
    const batch = uniqueSlugs.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(async slug => {
      const html = await fetchHeroPage(slug);
      if (!html) {
        console.log(`  ✗ ${slug} - failed`);
        return null;
      }
      const desc = extractMetaDescription(html);
      if (!desc) {
        console.log(`  ✗ ${slug} - no meta`);
        return null;
      }
      const parsed = parseMetaDescription(desc, slug);
      console.log(`  ✓ ${slug} → ${parsed.name} [${parsed.roles.join('/')}] WR:${parsed.winRate}%`);
      return parsed;
    }));
    results.push(...batchResults.filter(Boolean));
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nSuccessfully scraped ${results.length} heroes`);
  
  // Write results
  const fs = await import('fs');
  fs.writeFileSync('scripts/scraped-heroes.json', JSON.stringify(results, null, 2));
  console.log('Saved to scripts/scraped-heroes.json');
}

main().catch(console.error);
