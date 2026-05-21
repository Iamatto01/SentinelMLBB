import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = String.raw`C:\Users\muham\.gemini\antigravity\brain\143498ed-f6ec-4e2d-b32e-1b3c146a523e\.system_generated\steps`;

const results = [];

// Scan all step dirs for content.md files
const dirs = readdirSync(BASE);
for (const dir of dirs) {
  const contentPath = join(BASE, dir, 'content.md');
  let content;
  try { content = readFileSync(contentPath, 'utf8'); } catch { continue; }
  
  // Must be an mlbb.tools hero page
  if (!content.includes('mlbb.tools/heroes/') || !content.includes('## Matchups')) continue;
  
  // Source slug
  const sourceMatch = content.match(/Source:\s*https:\/\/mlbb\.tools\/heroes\/([^\s\n]+)/);
  if (!sourceMatch) continue;
  const slug = sourceMatch[1];
  
  // Find the description line
  const descLine = content.split('\n').find(l => /is a[n]?\s+[\w/]+\s+hero/i.test(l));
  
  // Roles
  let roles = [];
  const roleMatch = descLine?.match(/is a[n]?\s+([\w/]+)\s+hero/i);
  if (roleMatch) roles = roleMatch[1].split('/').map(r => r.trim());
  
  // Win Rate
  let winRate = "";
  const wrMatch = descLine?.match(/([\d.]+)%\s+win\s+rate/i);
  if (wrMatch) winRate = wrMatch[1];
  
  // Difficulty
  let difficulty = 2;
  if (content.includes('Difficulty: Easy')) difficulty = 1;
  else if (content.includes('Difficulty: Hard')) difficulty = 3;
  else if (content.includes('Difficulty: Moderate')) difficulty = 2;
  
  // Strong Against - pattern: [HeroName+X.X%](url)
  const strongAgainst = [];
  const strongSection = content.match(/#### Strong Against\n([\s\S]*?)(?=\n#### Weak Against|\n## )/);
  if (strongSection) {
    // Match [Name+X.X%](url) where Name can contain spaces, dots, apostrophes
    const heroLinks = [...strongSection[1].matchAll(/\[([A-Z][A-Za-z'._ -]+?)\+[\d.]+%\]/g)];
    heroLinks.forEach(m => strongAgainst.push(m[1].trim()));
  }
  
  // Weak Against
  const weakAgainst = [];
  const weakSection = content.match(/#### Weak Against\n([\s\S]*?)(?=\n## |\n\[View full)/);
  if (weakSection) {
    const heroLinks = [...weakSection[1].matchAll(/\[([A-Z][A-Za-z'._ -]+?)\+[\d.]+%\]/g)];
    heroLinks.forEach(m => weakAgainst.push(m[1].trim()));
  }

  // Name from description
  let name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const nameMatch = descLine?.match(/([A-Z][A-Za-z'._ -]+?)\s+is\s+a/);
  if (nameMatch) name = nameMatch[1].trim();
  
  results.push({ slug, name, roles, winRate, difficulty, strongAgainst, weakAgainst });
}

results.sort((a, b) => a.slug.localeCompare(b.slug));
console.log(`Parsed ${results.length} heroes`);
results.forEach(r => {
  console.log(`  ${r.name} [${r.roles.join('/')}] WR:${r.winRate}% D:${r.difficulty} | Strong: ${r.strongAgainst.join(', ')} | Weak: ${r.weakAgainst.join(', ')}`);
});

writeFileSync('scripts/parsed-heroes.json', JSON.stringify(results, null, 2));
console.log('\nSaved to scripts/parsed-heroes.json');
