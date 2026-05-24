import fs from 'fs';
import path from 'path';

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/mlbb/heroes";
const HERO_DETAIL_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/mlbb/heroes/";
const HEROES_DATA_PATH = path.resolve('../src/data/heroes-data.ts');

const missingList = [
  { name: "Balmond", id: 2 },
  { name: "Bruno", id: 12 },
  { name: "Eudora", id: 15 },
  { name: "Argus", id: 45 },
  { name: "Zhask", id: 50 },
  { name: "Hanzo", id: 69 },
  { name: "Kimmy", id: 71 },
  { name: "Kadita", id: 75 },
  { name: "Granger", id: 79 },
  { name: "Aulus", id: 108 },
  { name: "Yin", id: 113 },
  { name: "Cici", id: 123 },
  { name: "Lukas", id: 127 },
  { name: "Kalea", id: 128 }
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function run() {
  try {
    const formattedHeroes = [];

    for (const hero of missingList) {
      console.log(`Fetching details for ${hero.name} (id: ${hero.id})...`);
      const res = await fetch(`${HERO_DETAIL_URL}${hero.id}`);
      if (!res.ok) {
        console.error(`Failed to fetch ${hero.name}`);
        continue;
      }
      const json = await res.json();
      const mainHero = json?.data?.records?.[0]?.data?.hero?.data;
      if (!mainHero) {
        console.error(`No hero data found for ${hero.name}`);
        continue;
      }

      // Map roles
      const apiRoles = mainHero.sortlabel || [];
      const roles = apiRoles
        .map(r => capitalize(r.trim()))
        .filter(r => ["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"].includes(r));
      
      if (roles.length === 0) {
        // Fallback guess
        roles.push("Fighter");
      }

      // Map id
      const heroIdStr = hero.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Map specialty
      const specialty = (mainHero.speciality || []).join('/') || "General Specialty";

      // Map description
      const description = mainHero.story || mainHero.tale || `${hero.name} is a powerful hero in Mobile Legends.`;

      // Map tags based on role
      let tags = ["playsafe"];
      if (roles.includes("Assassin") || roles.includes("Fighter")) {
        tags = ["barbar"];
      } else if (roles.includes("Tank")) {
        tags = ["semi-barbar"];
      }

      const heroObj = {
        id: heroIdStr,
        name: hero.name,
        mlbbId: hero.id,
        role: roles,
        tags: tags,
        strategy: [],
        cc: "semi-cc",
        timing: ["mid"],
        image: mainHero.head || "",
        description: description.replace(/"/g, '\\"').replace(/\n/g, ' '),
        specialty: specialty,
        difficulty: 2
      };

      formattedHeroes.push(heroObj);
    }

    console.log(`Generated ${formattedHeroes.length} formatted heroes.`);

    console.log("Reading heroes-data.ts...");
    let content = fs.readFileSync(HEROES_DATA_PATH, 'utf8');

    // Find the end of ALL_HEROES array (right before the final closing square bracket of ALL_HEROES)
    // ALL_HEROES starts with `export const ALL_HEROES: HeroData[] = [`
    // And ends with `];`
    
    // We can locate the last `];` in the file.
    const lastBracketIndex = content.lastIndexOf('];');
    if (lastBracketIndex === -1) {
      throw new Error("Could not find the end of the array in heroes-data.ts");
    }

    // Format new entries as strings
    let newEntriesStr = "\n";
    for (const h of formattedHeroes) {
      newEntriesStr += `  {\n`;
      newEntriesStr += `    id: "${h.id}", name: "${h.name}",\n`;
      newEntriesStr += `    mlbbId: ${h.mlbbId},\n`;
      newEntriesStr += `    role: ${JSON.stringify(h.role)},\n`;
      newEntriesStr += `    tags: ${JSON.stringify(h.tags)},\n`;
      newEntriesStr += `    strategy: [],\n`;
      newEntriesStr += `    cc: "${h.cc}",\n`;
      newEntriesStr += `    timing: ${JSON.stringify(h.timing)},\n`;
      newEntriesStr += `    image: "${h.image}",\n`;
      newEntriesStr += `    description: "${h.description}",\n`;
      newEntriesStr += `    specialty: "${h.specialty}",\n`;
      newEntriesStr += `    difficulty: ${h.difficulty},\n`;
      newEntriesStr += `  },\n`;
    }

    content = content.substring(0, lastBracketIndex) + newEntriesStr + content.substring(lastBracketIndex);

    fs.writeFileSync(HEROES_DATA_PATH, content, 'utf8');
    console.log("Successfully appended missing heroes to heroes-data.ts!");

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
