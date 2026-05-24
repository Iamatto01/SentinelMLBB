import fs from 'fs';
import path from 'path';

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/mlbb/heroes";
const HEROES_DATA_PATH = path.resolve('../src/data/heroes-data.ts');

async function run() {
  try {
    console.log("Fetching live heroes from API...");
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    const records = data?.data?.records || [];
    console.log(`Fetched ${records.length} heroes from API.`);

    const heroImageMap = new Map(); // name -> head URL
    const heroIdMap = new Map(); // name -> hero_id

    for (const record of records) {
      const name = record?.data?.hero?.data?.name;
      const head = record?.data?.hero?.data?.head;
      const heroId = record?.data?.hero_id;
      if (name && head) {
        heroImageMap.set(name.toLowerCase(), head);
        if (heroId) {
          heroIdMap.set(name.toLowerCase(), heroId);
        }
      }
    }

    console.log("Reading heroes-data.ts...");
    let content = fs.readFileSync(HEROES_DATA_PATH, 'utf8');

    // Parse the file line-by-line or locate the hero blocks.
    // We want to find hero blocks. Each block has a name: "HeroName" and image: "..."
    // Let's do a regex replacement that matches blocks.
    // Since names are unique, we can search for blocks containing name: "..." and image: "..."
    
    // Let's find all occurrences of name: "..."
    // Then we replace the image line that follows it.
    // To be precise and safe, we can match:
    // name: "Name", (optionally other fields) image: "..."
    
    // Let's use a regex to match hero objects:
    // { \s* id: "...", name: "Name", ... image: "...", ... }
    // Or we can just find the name, and replace the next image: "..."
    
    let updatedCount = 0;
    const heroNameRegex = /name:\s*"([^"]+)"/g;
    
    // We can also match mlbbId to add it if missing, or update it
    
    // To make it robust, we can split the file by hero objects or just do a regex replace.
    // Let's find name: "HeroName" and find the image property within the next few lines.
    // We can find the index of `name: "HeroName"`
    // Then find the index of `image: "` after that index.
    // Ensure that it belongs to the same hero object (e.g. before the next `name: "`)
    
    const matches = [...content.matchAll(/name:\s*"([^"]+)"/g)];
    
    // We will process matches in reverse order so that indices don't shift when we replace strings!
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const heroName = match[1];
      const matchIndex = match.index;
      
      const headUrl = heroImageMap.get(heroName.toLowerCase());
      if (headUrl) {
        // Find the next image property
        const searchSubstring = content.substring(matchIndex);
        const imageIndexMatch = searchSubstring.match(/image:\s*"[^"]*"/);
        
        // Find the next name property to ensure we don't cross into the next hero
        const nextNameMatch = searchSubstring.substring(match[0].length).match(/name:\s*"/);
        const maxSearchLength = nextNameMatch ? nextNameMatch.index + match[0].length : 1000;
        
        if (imageIndexMatch && imageIndexMatch.index < maxSearchLength) {
          const globalImageIndex = matchIndex + imageIndexMatch.index;
          const targetLength = imageIndexMatch[0].length;
          
          content = content.substring(0, globalImageIndex) + 
                    `image: "${headUrl}"` + 
                    content.substring(globalImageIndex + targetLength);
          
          updatedCount++;
        }
      } else {
        console.warn(`No head URL found in API for hero: ${heroName}`);
      }
    }

    console.log(`Successfully updated ${updatedCount} hero images in heroes-data.ts.`);
    fs.writeFileSync(HEROES_DATA_PATH, content, 'utf8');
    
  } catch (err) {
    console.error("Error updating hero images:", err);
  }
}

run();
