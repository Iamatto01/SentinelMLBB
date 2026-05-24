import { getHeroByName as getHeroData } from "@/data/heroes-data";

export type Role = "Assassin" | "Fighter" | "Mage" | "Marksman" | "Support" | "Tank";

export interface HeroInfo {
  name: string;
  roles: Role[];
  strongAgainst: string[];
  weakAgainst: string[];
  image?: string;
}

export const HEROES: HeroInfo[] = [
  // Tanks
  { name: "Tigreal", roles: ["Tank", "Support"], strongAgainst: ["Estes", "Gusion", "Hanabi"], weakAgainst: ["Diggie", "Akai", "Valir"] },
  { name: "Khufra", roles: ["Tank", "Support"], strongAgainst: ["Fanny", "Lancelot", "Chou"], weakAgainst: ["Franco", "Kaja", "Valir"] },
  { name: "Franco", roles: ["Tank", "Support"], strongAgainst: ["Fanny", "Ling", "Lancelot"], weakAgainst: ["Diggie", "Lylia", "Sun"] },
  { name: "Minotaur", roles: ["Tank", "Support"], strongAgainst: ["Saber", "Gusion", "Hayabusa"], weakAgainst: ["Diggie", "Akai", "Valir"] },
  { name: "Johnson", roles: ["Tank", "Support"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Grock", "Akai", "Diggie"] },
  { name: "Grock", roles: ["Tank", "Fighter"], strongAgainst: ["Johnson", "Fanny", "Aldous"], weakAgainst: ["X.Borg", "Valir", "Karrie"] },
  { name: "Edith", roles: ["Tank", "Marksman"], strongAgainst: ["Chou", "Paquito", "Zilong"], weakAgainst: ["Esmeralda", "Uranus", "Karrie"] },
  
  // Fighters
  { name: "Chou", roles: ["Fighter"], strongAgainst: ["Gusion", "Lancelot", "Fanny"], weakAgainst: ["Khufra", "Minsitthar", "Phoveus"] },
  { name: "Paquito", roles: ["Fighter", "Assassin"], strongAgainst: ["Chou", "Aldous", "Zilong"], weakAgainst: ["Esmeralda", "Uranus", "Phoveus"] },
  { name: "Yu Zhong", roles: ["Fighter"], strongAgainst: ["Esmeralda", "Uranus", "Alice"], weakAgainst: ["Baxia", "Dyrroth", "Valir"] },
  { name: "Dyrroth", roles: ["Fighter"], strongAgainst: ["Esmeralda", "Uranus", "Yu Zhong"], weakAgainst: ["Chou", "Paquito", "Guinevere"] },
  { name: "Terizla", roles: ["Fighter"], strongAgainst: ["Chou", "Aldous", "Zilong"], weakAgainst: ["Valir", "Lylia", "Karrie"] },
  { name: "Zilong", roles: ["Fighter", "Assassin"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Chou", "Paquito", "Khufra"] },
  { name: "Bane", roles: ["Fighter", "Mage"], strongAgainst: ["Zilong", "Aldous", "Sun"], weakAgainst: ["Chou", "Paquito", "Gusion"] },
  { name: "Aldous", roles: ["Fighter"], strongAgainst: ["Marksman", "Mage", "Assassin"], weakAgainst: ["Chou", "Esmeralda", "Akai"] },

  // Assassins
  { name: "Fanny", roles: ["Assassin"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Khufra", "Moskov", "Saber", "Chou"] },
  { name: "Ling", roles: ["Assassin"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Khufra", "Moskov", "Saber", "Chou"] },
  { name: "Lancelot", roles: ["Assassin"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Khufra", "Moskov", "Saber", "Chou"] },
  { name: "Hayabusa", roles: ["Assassin"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Khufra", "Moskov", "Saber", "Chou"] },
  { name: "Gusion", roles: ["Assassin", "Mage"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Khufra", "Moskov", "Saber", "Chou"] },
  { name: "Saber", roles: ["Assassin"], strongAgainst: ["Fanny", "Ling", "Lancelot"], weakAgainst: ["Tigreal", "Khufra", "Grock"] },
  { name: "Joy", roles: ["Assassin"], strongAgainst: ["Pharsa", "Yve", "Gord"], weakAgainst: ["Minsitthar", "Khufra", "Franco"] },
  { name: "Nolan", roles: ["Assassin"], strongAgainst: ["Hanabi", "Layla", "Vexana"], weakAgainst: ["Khufra", "Franco", "Minsitthar"] },
  
  // Mages
  { name: "Pharsa", roles: ["Mage"], strongAgainst: ["Yve", "Gord", "Odette"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Yve", roles: ["Mage"], strongAgainst: ["Pharsa", "Gord", "Odette"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Kagura", roles: ["Mage"], strongAgainst: ["Fanny", "Ling", "Lancelot"], weakAgainst: ["Chou", "Paquito", "Khufra"] },
  { name: "Lylia", roles: ["Mage"], strongAgainst: ["Grock", "Khufra", "Tigreal"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Valir", roles: ["Mage"], strongAgainst: ["Tigreal", "Khufra", "Grock"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Nana", roles: ["Mage", "Support"], strongAgainst: ["Fanny", "Ling", "Lancelot"], weakAgainst: ["Chou", "Paquito", "Khufra"] },
  { name: "Vexana", roles: ["Mage"], strongAgainst: ["Estes", "Faramis", "Diggie"], weakAgainst: ["Lancelot", "Ling", "Fanny"] },
  { name: "Novaria", roles: ["Mage"], strongAgainst: ["Yve", "Pharsa", "Xavier"], weakAgainst: ["Joy", "Ling", "Fanny"] },

  // Marksmen
  { name: "Beatrix", roles: ["Marksman"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Claude", roles: ["Marksman"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Karrie", roles: ["Marksman"], strongAgainst: ["Tigreal", "Khufra", "Grock"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Brody", roles: ["Marksman"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Clint", roles: ["Marksman"], strongAgainst: ["Beatrix", "Claude", "Karrie"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Moskov", roles: ["Marksman"], strongAgainst: ["Fanny", "Ling", "Lancelot"], weakAgainst: ["Tigreal", "Khufra", "Grock"] },
  { name: "Melissa", roles: ["Marksman"], strongAgainst: ["Chou", "Paquito", "Zilong"], weakAgainst: ["Pharsa", "Yve", "Gord"] },
  { name: "Wanwan", roles: ["Marksman"], strongAgainst: ["Tigreal", "Khufra", "Grock"], weakAgainst: ["Phoveus", "Khufra", "Franco"] },
  
  // Support
  { name: "Estes", roles: ["Support"], strongAgainst: ["Zilong", "Aldous", "Sun"], weakAgainst: ["Baxia", "Luo Yi", "Atlas"] },
  { name: "Diggie", roles: ["Support"], strongAgainst: ["Tigreal", "Atlas", "Khufra"], weakAgainst: ["Natalia", "Hilda", "Lancelot"] },
  { name: "Mathilda", roles: ["Support", "Assassin"], strongAgainst: ["Tigreal", "Khufra", "Grock"], weakAgainst: ["Fanny", "Ling", "Lancelot"] },
  { name: "Angela", roles: ["Support"], strongAgainst: ["Zilong", "Aldous", "Sun"], weakAgainst: ["Baxia", "Luo Yi", "Atlas"] },
  { name: "Faramis", roles: ["Support", "Mage"], strongAgainst: ["Gloo", "Vexana", "Atlas"], weakAgainst: ["Akai", "Valentina", "Chou"] },
  { name: "Floryn", roles: ["Support"], strongAgainst: ["Zilong", "Aldous", "Sun"], weakAgainst: ["Baxia", "Luo Yi", "Atlas"] },
  { name: "Minotaur", roles: ["Tank", "Support"], strongAgainst: ["Saber", "Gusion", "Hayabusa"], weakAgainst: ["Diggie", "Akai", "Valir"] },
  
  // Custom & Newly Added Heroes
  { name: "Suyou", roles: ["Assassin", "Fighter"], strongAgainst: ["Hanabi", "Layla", "Miya"], weakAgainst: ["Khufra", "Minsitthar", "Franco"] },
  { name: "Zhuxin", roles: ["Mage"], strongAgainst: ["Tigreal", "Atlas", "Gloo"], weakAgainst: ["Lancelot", "Ling", "Fanny"] },
  { name: "Ixia", roles: ["Marksman"], strongAgainst: ["Hanabi", "Layla", "Estes"], weakAgainst: ["Chou", "Saber"] },
  { name: "Gatotkaca", roles: ["Tank", "Fighter"], strongAgainst: ["Karrie", "Claude", "Wanwan"], weakAgainst: ["Diggie", "Valir", "Akai"] },
  { name: "Fredrinn", roles: ["Tank", "Fighter"], strongAgainst: ["Gusion", "Hayabusa"], weakAgainst: ["Karrie", "Valir", "Baxia"] },
  { name: "Harith", roles: ["Mage"], strongAgainst: ["Fighter", "Tank"], weakAgainst: ["Minsitthar", "Khufra", "Kaja"] },
  { name: "Roger", roles: ["Fighter", "Marksman"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Khufra", "Saber", "Chou"] },
  { name: "Alpha", roles: ["Fighter"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Valir", "Lylia", "Karrie"] },
  { name: "Sora", roles: ["Fighter", "Assassin"], strongAgainst: ["Mage", "Marksman"], weakAgainst: ["Khufra", "Minsitthar", "Saber"] },
  { name: "Zetian", roles: ["Fighter", "Mage"], strongAgainst: ["Support", "Fighter"], weakAgainst: ["Lancelot", "Hayabusa", "Fanny"] },
  { name: "Marcel", roles: ["Tank", "Fighter"], strongAgainst: ["Assassin", "Fighter"], weakAgainst: ["Karrie", "Baxia", "Valir"] },
  { name: "Obsidia", roles: ["Tank"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Karrie", "Valir", "Baxia"] },
  { name: "Lolita", roles: ["Tank", "Support"], strongAgainst: ["Beatrix", "Chang'e", "Cyclops"], weakAgainst: ["Diggie", "Akai", "Valir"] },
  { name: "Balmond", roles: ["Fighter"], strongAgainst: ["Layla", "Hanabi", "Miya"], weakAgainst: ["Lesley", "Irithel"] },
  { name: "Bruno", roles: ["Marksman"], strongAgainst: ["Layla", "Hanabi"], weakAgainst: ["Fanny", "Lancelot"] },
  { name: "Eudora", roles: ["Mage"], strongAgainst: ["Marksman", "Assassin"], weakAgainst: ["Tigreal", "Chou"] },
  { name: "Argus", roles: ["Fighter"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Valir", "Valir"] },
  { name: "Zhask", roles: ["Mage"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Fanny", "Ling"] },
  { name: "Hanzo", roles: ["Assassin"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Natalia", "Helcurt"] },
  { name: "Kimmy", roles: ["Marksman", "Mage"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Lancelot", "Gusion"] },
  { name: "Kadita", roles: ["Mage", "Assassin"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Chou", "Kaja"] },
  { name: "Granger", roles: ["Marksman"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Fanny", "Khufra"] },
  { name: "Aulus", roles: ["Fighter"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Valir", "Karrie"] },
  { name: "Yin", roles: ["Fighter", "Assassin"], strongAgainst: ["Marksman", "Mage"], weakAgainst: ["Chou", "Paquito"] },
  { name: "Cici", roles: ["Fighter"], strongAgainst: ["Tank", "Fighter"], weakAgainst: ["Karrie", "Valir"] },
  { name: "Lukas", roles: ["Fighter"], strongAgainst: ["Fighter"], weakAgainst: ["Chou", "Valir"] },
  { name: "Kalea", roles: ["Support", "Fighter"], strongAgainst: ["Fighter"], weakAgainst: ["Valir", "Akai"] }
];

// Helper functions for the draft engine
export function getHeroByName(name: string): (HeroInfo & { image: string }) | undefined {
  const hero = HEROES.find(h => h.name.toLowerCase() === name.toLowerCase());
  if (!hero) return undefined;
  return { ...hero, image: getHeroData(name)?.image ?? "" };
}

export function evaluateCounters(alliedPicks: string[], enemyPicks: string[]) {
  const scores: Record<string, { score: number; reasons: string[] }> = {};
  
  // Initialize scores for all heroes
  HEROES.forEach(h => {
    // Skip if already picked
    if (alliedPicks.includes(h.name) || enemyPicks.includes(h.name)) return;
    scores[h.name] = { score: 0, reasons: [] };
  });

  // Calculate scores based on enemy picks
  enemyPicks.forEach(enemyName => {
    const enemy = getHeroByName(enemyName);
    if (!enemy) return;

    // Heroes that are strong against this enemy pick get +1
    HEROES.forEach(h => {
      if (!scores[h.name]) return;
      if (h.strongAgainst.includes(enemy.name)) {
        scores[h.name].score += 1.5;
        scores[h.name].reasons.push(`Strong against ${enemy.name}`);
      }
      if (enemy.weakAgainst.includes(h.name)) {
        scores[h.name].score += 1.5;
        scores[h.name].reasons.push(`Counters ${enemy.name}`);
      }
      
      // Heroes that are weak against this enemy pick get -1.5
      if (h.weakAgainst.includes(enemy.name)) {
        scores[h.name].score -= 1.5;
      }
      if (enemy.strongAgainst.includes(h.name)) {
        scores[h.name].score -= 1.5;
      }
    });
  });

  // Calculate role synergy
  const currentRoles = alliedPicks.flatMap(p => getHeroByName(p)?.roles || []);
  const missingRoles = ["Tank", "Fighter", "Mage", "Marksman", "Assassin"].filter(r => !currentRoles.includes(r as Role));
  
  HEROES.forEach(h => {
    if (!scores[h.name]) return;
    
    // Bonus for filling a missing role
    if (missingRoles.some(r => h.roles.includes(r as Role))) {
      scores[h.name].score += 0.5;
      // scores[h.name].reasons.push(`Fills missing role`);
    }
  });

  // Return sorted array
  return Object.entries(scores)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.score - a.score);
}
