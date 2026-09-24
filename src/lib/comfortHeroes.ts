import { ALL_HEROES, getHeroByName } from "@/data/heroes-data";

export type LaneRole = "gold" | "hyper" | "exp" | "roamer" | "mid";

export interface LaneRoleInfo {
  key: LaneRole;
  label: string;
  shortLabel: string;
  color: string;
  borderClass: string;
  bgLightClass: string;
  textClass: string;
  badgeClass: string;
  defaultHeroRoles: string[];
}

export const LANE_ROLES: LaneRoleInfo[] = [
  {
    key: "gold",
    label: "Gold Lane",
    shortLabel: "Gold",
    color: "amber",
    borderClass: "border-amber-500/30 dark:border-amber-500/20",
    bgLightClass: "bg-amber-500/10 dark:bg-amber-500/15",
    textClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
    defaultHeroRoles: ["Marksman", "Mage", "Fighter"],
  },
  {
    key: "hyper",
    label: "Hyper / Jungler",
    shortLabel: "Jungler",
    color: "indigo",
    borderClass: "border-indigo-500/30 dark:border-indigo-500/20",
    bgLightClass: "bg-indigo-500/10 dark:bg-indigo-500/15",
    textClass: "text-indigo-600 dark:text-indigo-400",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
    defaultHeroRoles: ["Assassin", "Fighter", "Tank", "Mage"],
  },
  {
    key: "exp",
    label: "Exp Lane",
    shortLabel: "Exp",
    color: "rose",
    borderClass: "border-rose-500/30 dark:border-rose-500/20",
    bgLightClass: "bg-rose-500/10 dark:bg-rose-500/15",
    textClass: "text-rose-600 dark:text-rose-400",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
    defaultHeroRoles: ["Fighter", "Tank"],
  },
  {
    key: "roamer",
    label: "Roamer",
    shortLabel: "Roam",
    color: "emerald",
    borderClass: "border-emerald-500/30 dark:border-emerald-500/20",
    bgLightClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    textClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
    defaultHeroRoles: ["Tank", "Support", "Fighter", "Assassin"],
  },
  {
    key: "mid",
    label: "Mid Lane",
    shortLabel: "Mid",
    color: "cyan",
    borderClass: "border-cyan-500/30 dark:border-cyan-500/20",
    bgLightClass: "bg-cyan-500/10 dark:bg-cyan-500/15",
    textClass: "text-cyan-600 dark:text-cyan-400",
    badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/40",
    defaultHeroRoles: ["Mage", "Support"],
  },
];

export type ComfortTier = "signature" | "priority" | "comfort" | "pocket";

export interface ComfortTierConfig {
  key: ComfortTier;
  label: string;
  badge: string;
  icon: string;
  colorClass: string;
}

export const COMFORT_TIERS: Record<ComfortTier, ComfortTierConfig> = {
  signature: {
    key: "signature",
    label: "Signature Pick",
    badge: "🔥 Signature",
    icon: "🔥",
    colorClass: "bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-sm",
  },
  priority: {
    key: "priority",
    label: "Priority 1",
    badge: "⭐ Priority",
    icon: "⭐",
    colorClass: "bg-amber-500 text-black font-black",
  },
  comfort: {
    key: "comfort",
    label: "Comfort Pick",
    badge: "👍 Comfort",
    icon: "👍",
    colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300",
  },
  pocket: {
    key: "pocket",
    label: "Pocket Pick",
    badge: "🎯 Pocket",
    icon: "🎯",
    colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300",
  },
};

export interface ComfortHeroEntry {
  heroName: string;
  tier: ComfortTier;
  note?: string;
  winRate?: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  nickname?: string;
  primaryRole: LaneRole;
  isMainRoster?: boolean;
  comfortHeroes: Record<LaneRole, ComfortHeroEntry[]>;
}

// Built-in starter dataset based on Sentinel MLBB actual squad match history
export const DEFAULT_SENTINEL_PLAYERS: PlayerProfile[] = [
  {
    id: "p-huehue",
    name: "huehue",
    primaryRole: "gold",
    isMainRoster: true,
    comfortHeroes: {
      gold: [
        { heroName: "Karrie", tier: "signature", note: "Tank shredder & high DPS" },
        { heroName: "Hanabi", tier: "priority", note: "Safe teamfight bounce" },
        { heroName: "Ixia", tier: "priority", note: "Wipeout ultimate setup" },
        { heroName: "Popol and Kupa", tier: "comfort", note: "Early lane bully & trap vision" },
        { heroName: "Moskov", tier: "comfort", note: "Late game hyper carry" },
        { heroName: "Roger", tier: "pocket", note: "Aggressive dive flex" },
      ],
      hyper: [
        { heroName: "Aulus", tier: "comfort", note: "Late game damage engine" },
        { heroName: "Fredrinn", tier: "comfort", note: "Tanky objective secure" },
        { heroName: "Julian", tier: "pocket", note: "Fast level 3 power spike" },
      ],
      exp: [
        { heroName: "Freya", tier: "priority", note: "1v1 lane domination" },
        { heroName: "Lapu-Lapu", tier: "comfort", note: "Backline dive" },
        { heroName: "Guinevere", tier: "comfort", note: "Surprise airborne combo" },
      ],
      roamer: [
        { heroName: "Grock", tier: "comfort", note: "Early pressure & invades" },
      ],
      mid: [
        { heroName: "Harith", tier: "pocket", note: "High mobility magic DPS" },
      ],
    },
  },
  {
    id: "p-ryuu",
    name: "ryuu",
    primaryRole: "roamer",
    isMainRoster: true,
    comfortHeroes: {
      roamer: [
        { heroName: "Belerick", tier: "signature", note: "Passive counter burst MM" },
        { heroName: "Chou", tier: "priority", note: "Single-target pick-off kick" },
        { heroName: "Gloo", tier: "priority", note: "Disruption & zoning" },
        { heroName: "Akai", tier: "comfort", note: "Pin enemy into walls" },
        { heroName: "Gatotkaca", tier: "comfort", note: "Huge physical defense & taunt" },
        { heroName: "Franco", tier: "comfort", note: "Early hook pressure" },
      ],
      exp: [
        { heroName: "Arlott", tier: "priority", note: "Aggressive dash stun" },
        { heroName: "Phoveus", tier: "priority", note: "Anti-dash counter" },
        { heroName: "Chou", tier: "comfort", note: "Damage offlane" },
      ],
      gold: [
        { heroName: "Irithel", tier: "pocket", note: "Kiting on the move" },
      ],
      hyper: [
        { heroName: "Fredrinn", tier: "comfort", note: "Frontline retribution" },
      ],
      mid: [
        { heroName: "Alice", tier: "pocket", note: "Sustained magic drain" },
      ],
    },
  },
  {
    id: "p-gerakan-tambahan",
    name: "gerakan tambahan(real)",
    primaryRole: "exp",
    isMainRoster: true,
    comfortHeroes: {
      exp: [
        { heroName: "Phoveus", tier: "signature", note: "Heavy counter to mobile enemy team" },
        { heroName: "Badang", tier: "priority", note: "Wall burst & stun locks" },
        { heroName: "Jawhead", tier: "comfort", note: "Ejector isolator" },
        { heroName: "Grock", tier: "comfort", note: "Wall block and immunity" },
      ],
      roamer: [
        { heroName: "Chip", tier: "signature", note: "Teleport portals for whole team" },
        { heroName: "Lolita", tier: "priority", note: "Block all projectile ultimate" },
        { heroName: "Hylos", tier: "priority", note: "Tower dive & speedway" },
        { heroName: "Faramis", tier: "comfort", note: "Nether realm revive" },
      ],
      mid: [
        { heroName: "Zetian", tier: "comfort", note: "AoE zoning & slow" },
      ],
      hyper: [
        { heroName: "Badang", tier: "pocket", note: "Jungle surprise burst" },
      ],
      gold: [
        { heroName: "Karrie", tier: "pocket", note: "Pocket marksman" },
      ],
    },
  },
  {
    id: "p-abang-jamil",
    name: "abang jamil",
    primaryRole: "mid",
    isMainRoster: true,
    comfortHeroes: {
      mid: [
        { heroName: "Zhuxin", tier: "signature", note: "Continuous airborne control" },
        { heroName: "Valentina", tier: "priority", note: "Steal key enemy ultimates" },
        { heroName: "Gord", tier: "priority", note: "True damage laser melting" },
        { heroName: "Selena", tier: "comfort", note: "Abyssal trap vision & arrow stun" },
        { heroName: "Faramis", tier: "comfort", note: "Teamfight insurance" },
        { heroName: "Cecilion", tier: "comfort", note: "Infinite late game stacks" },
        { heroName: "Yve", tier: "comfort", note: "Real World Manipulation slow grid" },
        { heroName: "Lylia", tier: "comfort", note: "Fast wave clear & black shoes reset" },
      ],
      roamer: [
        { heroName: "Selena", tier: "comfort", note: "Roam warding and early snipes" },
        { heroName: "Faramis", tier: "comfort", note: "Aggressive pull & revival" },
      ],
      gold: [
        { heroName: "Harith", tier: "comfort", note: "Chrono dash carry" },
      ],
      exp: [
        { heroName: "Phoveus", tier: "pocket", note: "Magic bruiser" },
      ],
      hyper: [
        { heroName: "Julian", tier: "pocket", note: "Burst assassin" },
      ],
    },
  },
  {
    id: "p-tauke",
    name: "tauke",
    primaryRole: "hyper",
    isMainRoster: true,
    comfortHeroes: {
      hyper: [
        { heroName: "Fredrinn", tier: "priority", note: "Lord secure & taunt armor" },
        { heroName: "Paquito", tier: "priority", note: "Heavy burst & fast rotation" },
        { heroName: "Leomord", tier: "comfort", note: "Barbiel execute crit" },
        { heroName: "Dyrroth", tier: "comfort", note: "Armor shred invasion" },
        { heroName: "Alpha", tier: "comfort", note: "True damage Beta strikes" },
      ],
      exp: [
        { heroName: "Lapu-Lapu", tier: "priority", note: "Unstoppable backline dive" },
        { heroName: "Paquito", tier: "priority", note: "Lane freeze & burst" },
        { heroName: "X.Borg", tier: "comfort", note: "Firaga armor poke" },
        { heroName: "Terizla", tier: "comfort", note: "Frontline sustain hammer" },
      ],
      gold: [
        { heroName: "Brody", tier: "comfort", note: "Abyss corrosion kite" },
      ],
      roamer: [
        { heroName: "Fredrinn", tier: "comfort", note: "Tank setter" },
      ],
      mid: [
        { heroName: "Valentina", tier: "pocket", note: "Counter pick flex" },
      ],
    },
  },
  {
    id: "p-australo",
    name: "australo",
    primaryRole: "gold",
    isMainRoster: false,
    comfortHeroes: {
      gold: [
        { heroName: "Irithel", tier: "signature", note: "Sprint & heavy AOE crits" },
        { heroName: "Karrie", tier: "priority", note: "Anti-tank DPS" },
        { heroName: "Granger", tier: "priority", note: "Rhapsody burst & death sonata" },
      ],
      hyper: [
        { heroName: "Suyou", tier: "priority", note: "Mortal/Immortal form flexibility" },
        { heroName: "Karrie", tier: "comfort", note: "Jungle marksman" },
      ],
      exp: [
        { heroName: "Khaleed", tier: "comfort", note: "Quicksand sustain & desert storm" },
      ],
      roamer: [
        { heroName: "Akai", tier: "comfort", note: "Heavy spin pin" },
        { heroName: "Hilda", tier: "comfort", note: "Bush invasion bully" },
      ],
      mid: [
        { heroName: "Vexana", tier: "comfort", note: "Eternal guard crowd control" },
      ],
    },
  },
  {
    id: "p-ryuuna",
    name: "ryuuna",
    primaryRole: "hyper",
    isMainRoster: false,
    comfortHeroes: {
      hyper: [
        { heroName: "Gusion", tier: "signature", note: "Fast dagger assassination" },
        { heroName: "Fredrinn", tier: "priority", note: "Sturdy frontline jungler" },
        { heroName: "Akai", tier: "comfort", note: "Heavy spin objective contest" },
      ],
      exp: [
        { heroName: "Dyrroth", tier: "comfort", note: "Lane bully" },
      ],
      mid: [
        { heroName: "Julian", tier: "comfort", note: "Multi-element burst" },
      ],
      roamer: [
        { heroName: "Akai", tier: "comfort", note: "CC roamer" },
      ],
      gold: [
        { heroName: "Beatrix", tier: "pocket", note: "Wesker / Renner snipe" },
      ],
    },
  },
  {
    id: "p-eitsss",
    name: "eitsss",
    primaryRole: "hyper",
    isMainRoster: false,
    comfortHeroes: {
      hyper: [
        { heroName: "Ling", tier: "signature", note: "Wall gliding & tempest swords" },
        { heroName: "Suyou", tier: "priority", note: "High mobility dual stance" },
        { heroName: "Fanny", tier: "comfort", note: "Steel cables aggression" },
        { heroName: "Hayabusa", tier: "comfort", note: "Shadow lock burst" },
      ],
      exp: [
        { heroName: "Chou", tier: "comfort", note: "Pick off fighter" },
      ],
      gold: [
        { heroName: "Claude", tier: "comfort", note: "Blazing duet teamwipe" },
      ],
      roamer: [
        { heroName: "Chou", tier: "comfort", note: "Way of dragon roamer" },
      ],
      mid: [
        { heroName: "Gusion", tier: "pocket", note: "Magic assassin" },
      ],
    },
  },
];

const STORAGE_KEY = "sentinel_comfort_heroes_v1";

export function getComfortPlayers(): PlayerProfile[] {
  if (typeof window === "undefined") {
    return DEFAULT_SENTINEL_PLAYERS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SENTINEL_PLAYERS));
      return DEFAULT_SENTINEL_PLAYERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SENTINEL_PLAYERS;
  } catch (e) {
    console.error("Failed to parse comfort players from localStorage", e);
    return DEFAULT_SENTINEL_PLAYERS;
  }
}

export function saveComfortPlayers(players: PlayerProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    window.dispatchEvent(new Event("sentinel_comfort_heroes_updated"));
  } catch (e) {
    console.error("Failed to save comfort players to localStorage", e);
  }
}

export function addComfortHero(
  playerId: string,
  role: LaneRole,
  entry: ComfortHeroEntry
): PlayerProfile[] {
  const players = getComfortPlayers();
  const player = players.find((p) => p.id === playerId);
  if (!player) return players;

  if (!player.comfortHeroes[role]) {
    player.comfortHeroes[role] = [];
  }

  // Check if hero already exists in this role
  const existingIdx = player.comfortHeroes[role].findIndex(
    (h) => h.heroName.toLowerCase() === entry.heroName.toLowerCase()
  );

  if (existingIdx >= 0) {
    player.comfortHeroes[role][existingIdx] = entry;
  } else {
    player.comfortHeroes[role].push(entry);
  }

  saveComfortPlayers(players);
  return players;
}

export function removeComfortHero(
  playerId: string,
  role: LaneRole,
  heroName: string
): PlayerProfile[] {
  const players = getComfortPlayers();
  const player = players.find((p) => p.id === playerId);
  if (!player || !player.comfortHeroes[role]) return players;

  player.comfortHeroes[role] = player.comfortHeroes[role].filter(
    (h) => h.heroName.toLowerCase() !== heroName.toLowerCase()
  );

  saveComfortPlayers(players);
  return players;
}

export function addPlayer(name: string, primaryRole: LaneRole): PlayerProfile[] {
  const players = getComfortPlayers();
  const trimmed = name.trim();
  if (!trimmed) return players;

  const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newPlayer: PlayerProfile = {
    id,
    name: trimmed,
    primaryRole,
    isMainRoster: false,
    comfortHeroes: {
      gold: [],
      hyper: [],
      exp: [],
      roamer: [],
      mid: [],
    },
  };

  const updated = [...players, newPlayer];
  saveComfortPlayers(updated);
  return updated;
}

export function updatePlayer(
  playerId: string,
  updates: Partial<Pick<PlayerProfile, "name" | "primaryRole" | "isMainRoster">>
): PlayerProfile[] {
  const players = getComfortPlayers();
  const player = players.find((p) => p.id === playerId);
  if (!player) return players;

  if (updates.name !== undefined) player.name = updates.name.trim();
  if (updates.primaryRole !== undefined) player.primaryRole = updates.primaryRole;
  if (updates.isMainRoster !== undefined) player.isMainRoster = updates.isMainRoster;

  saveComfortPlayers(players);
  return players;
}

export function deletePlayer(playerId: string): PlayerProfile[] {
  const players = getComfortPlayers();
  const updated = players.filter((p) => p.id !== playerId);
  saveComfortPlayers(updated);
  return updated;
}

export function resetToDefaultComfortHeroes(): PlayerProfile[] {
  saveComfortPlayers(DEFAULT_SENTINEL_PLAYERS);
  return DEFAULT_SENTINEL_PLAYERS;
}

export function syncPlayersFromTeamManagement(): PlayerProfile[] {
  if (typeof window === "undefined") return getComfortPlayers();
  const saved = localStorage.getItem("squadLineup");
  if (!saved) return getComfortPlayers();

  try {
    const lineup = JSON.parse(saved);
    const existing = getComfortPlayers();
    const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

    const roleMap: Record<string, LaneRole> = {
      gold: "gold",
      hyper: "hyper",
      exp: "exp",
      roamer: "roamer",
      mid: "mid",
    };

    const newPlayers: PlayerProfile[] = [...existing];

    // Sync main roles
    for (const [key, role] of Object.entries(roleMap)) {
      const name = (lineup[key] || "").trim();
      if (name && !existingNames.has(name.toLowerCase())) {
        existingNames.add(name.toLowerCase());
        newPlayers.push({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          primaryRole: role,
          isMainRoster: true,
          comfortHeroes: {
            gold: [],
            hyper: [],
            exp: [],
            roamer: [],
            mid: [],
          },
        });
      }
    }

    // Sync subs
    if (Array.isArray(lineup.subs)) {
      lineup.subs.forEach((subName: string) => {
        const name = (subName || "").trim();
        if (name && !existingNames.has(name.toLowerCase())) {
          existingNames.add(name.toLowerCase());
          newPlayers.push({
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            primaryRole: "gold",
            isMainRoster: false,
            comfortHeroes: {
              gold: [],
              hyper: [],
              exp: [],
              roamer: [],
              mid: [],
            },
          });
        }
      });
    }

    saveComfortPlayers(newPlayers);
    return newPlayers;
  } catch (e) {
    console.error("Failed to sync players from team management", e);
    return getComfortPlayers();
  }
}
