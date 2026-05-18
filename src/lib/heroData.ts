export type Role = "Assassin" | "Fighter" | "Mage" | "Marksman" | "Support" | "Tank";

export interface HeroInfo {
  name: string;
  roles: Role[];
  strongAgainst: string[];
  weakAgainst: string[];
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
  { name: "Minotaur", roles: ["Tank", "Support"], strongAgainst: ["Saber", "Gusion", "Hayabusa"], weakAgainst: ["Diggie", "Akai", "Valir"] }
];

// Helper functions for the draft engine
export function getHeroByName(name: string): HeroInfo | undefined {
  return HEROES.find(h => h.name.toLowerCase() === name.toLowerCase());
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
