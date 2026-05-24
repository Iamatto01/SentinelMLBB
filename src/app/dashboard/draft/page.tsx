"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Search, Shield, Sword, ShieldAlert, Sparkles, Ban } from "lucide-react";
import { evaluateCounters, getHeroByName as getHeroInfoByName } from "@/lib/heroData";
import { ALL_HEROES, getHeroByName, HeroRole } from "@/data/heroes-data";

type DraftMode = "ranked" | "tournament";

const BAN_COUNT: Record<DraftMode, number> = {
  ranked: 5,
  tournament: 5,
};

function getHeroImage(name: string): string {
  const hero = getHeroByName(name);
  return hero?.image ?? "";
}

// ── Hero Avatar ─────────────────────────────────────────────────────────────
function HeroAvatar({
  name,
  size = "md",
  crossed = false,
  dim = false,
}: {
  name: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  crossed?: boolean;
  dim?: boolean;
}) {
  const [err, setErr] = useState(false);
  const img = name ? getHeroImage(name) : "";
  
  const sizeClass = 
    size === "xs" ? "w-8 h-8 text-[10px]" :
    size === "sm" ? "w-11 h-11 text-xs" : 
    size === "lg" ? "w-16 h-16 text-xl" : 
    "w-14 h-14 text-base";

  return (
    <div className={`relative rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 ${sizeClass} ${dim ? "opacity-45" : ""} border border-neutral-200/50 dark:border-neutral-750 shadow-inner`}>
      {name && img && !err ? (
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover object-top"
          referrerPolicy="no-referrer"
          onError={() => setErr(true)}
        />
      ) : name ? (
        <div className="w-full h-full flex items-center justify-center font-bold text-neutral-400 bg-neutral-200 dark:bg-neutral-750">
          {name.charAt(0)}
        </div>
      ) : (
        <div className="w-full h-full" />
      )}
      {crossed && (
        <div className="absolute inset-0 bg-rose-500/70 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// ── Ban Slot ────────────────────────────────────────────────────────────────
function BanSlot({
  heroName,
  active,
  onClick,
  onRemove,
}: {
  heroName: string | null;
  active: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 cursor-pointer transition-all w-[54px]
        ${active
          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 scale-105 shadow-md ring-2 ring-rose-500/10"
          : heroName
            ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/5"
            : "border-dashed border-neutral-200 dark:border-neutral-750 bg-white dark:bg-neutral-900 hover:border-rose-300 dark:hover:border-rose-800"
        }`}
    >
      {heroName ? (
        <>
          <HeroAvatar name={heroName} size="xs" crossed />
          <p className="text-[8px] text-rose-600 dark:text-rose-455 font-bold text-center truncate w-full mt-0.5 leading-none">{heroName}</p>
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 shadow-sm"
          >
            <X className="w-2 h-2" />
          </button>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center bg-neutral-50 dark:bg-neutral-850">
            <Ban className="w-3 h-3 text-neutral-400" />
          </div>
          <p className="text-[8px] text-neutral-400 dark:text-neutral-500 font-bold mt-0.5 leading-none">Ban</p>
        </>
      )}
    </div>
  );
}

// ── Pick Slot ───────────────────────────────────────────────────────────────
function PickSlot({
  heroName,
  team,
  active,
  onClick,
  onRemove,
  index,
}: {
  heroName: string | null;
  team: "ally" | "enemy";
  active: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  index: number;
}) {
  const accent = team === "ally" ? "indigo" : "rose";

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 p-2.5 rounded-2xl border-2 cursor-pointer transition-all min-h-[58px]
        ${active
          ? `border-${accent}-500 bg-${accent}-50 dark:bg-${accent}-950/20 scale-[1.02] shadow-md ring-2 ring-${accent}-500/10`
          : heroName
            ? "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm"
            : `border-dashed border-neutral-200 dark:border-neutral-750 bg-white dark:bg-neutral-900/50 hover:border-${accent}-400 hover:bg-neutral-50 dark:hover:bg-neutral-850/50`
        }`}
    >
      {heroName ? (
        <>
          <HeroAvatar name={heroName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-0.5">Pick {index + 1}</p>
            <p className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 truncate leading-tight">{heroName}</p>
          </div>
          <button
            onClick={onRemove}
            className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-755 bg-neutral-50 dark:bg-neutral-850 flex items-center justify-center font-bold text-neutral-350 dark:text-neutral-500 text-sm">
            {index + 1}
          </div>
          <span className="text-neutral-400 dark:text-neutral-500 text-xs font-semibold">
            {team === "ally" ? "Select Ally..." : "Select Enemy..."}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Hero Grid Selection Card ────────────────────────────────────────────────
function HeroGridCard({
  hero,
  disabled,
  isBanned,
  onSelect,
}: {
  hero: typeof ALL_HEROES[number];
  disabled: boolean;
  isBanned: boolean;
  onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl border transition-all select-none
        ${disabled
          ? "opacity-35 cursor-not-allowed border-neutral-100 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-900/50"
          : "cursor-pointer border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10 hover:shadow-sm active:scale-95"
        }`}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative shadow-inner">
        {hero.image && !imgErr ? (
          <img
            src={hero.image}
            alt={hero.name}
            className="w-full h-full object-cover object-top"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-neutral-400 bg-neutral-200 dark:bg-neutral-750 text-xs">
            {hero.name.charAt(0)}
          </div>
        )}
        {isBanned && (
          <div className="absolute inset-0 bg-rose-500/70 flex items-center justify-center">
            <Ban className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <span className="text-[9px] font-black text-center text-neutral-700 dark:text-neutral-300 leading-tight truncate w-full px-0.5">{hero.name}</span>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DraftSimulatorPage() {
  const [mode, setMode] = useState<DraftMode>("ranked");
  const banCount = BAN_COUNT[mode];

  const [allyBans, setAllyBans] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyBans, setEnemyBans] = useState<(string | null)[]>([null, null, null, null, null]);
  const [alliedTeam, setAlliedTeam] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyTeam, setEnemyTeam] = useState<(string | null)[]>([null, null, null, null, null]);

  type SlotType = { phase: "ban" | "pick"; team: "ally" | "enemy"; index: number };
  
  // Set default active slot to first Ally Ban slot
  const [activeSlot, setActiveSlot] = useState<SlotType | null>({ phase: "ban", team: "ally", index: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<HeroRole | "All">("All");

  // All taken names (ban + pick)
  const takenNames = useMemo(() => new Set([
    ...allyBans.filter(Boolean),
    ...enemyBans.filter(Boolean),
    ...alliedTeam.filter(Boolean),
    ...enemyTeam.filter(Boolean),
  ] as string[]), [allyBans, enemyBans, alliedTeam, enemyTeam]);

  // Helper to find the next logical slot to auto-advance
  const autoAdvance = (current: SlotType) => {
    const { phase, team, index } = current;
    
    if (phase === "ban") {
      // Advance within bans: Ally Ban -> Enemy Ban -> next Ally Ban...
      if (team === "ally") {
        setActiveSlot({ phase: "ban", team: "enemy", index });
      } else {
        if (index < banCount - 1) {
          setActiveSlot({ phase: "ban", team: "ally", index: index + 1 });
        } else {
          // If bans are full, advance to picks
          setActiveSlot({ phase: "pick", team: "ally", index: 0 });
        }
      }
    } else {
      // Advance within picks: Ally Pick -> Enemy Pick -> next Ally Pick...
      if (team === "ally") {
        setActiveSlot({ phase: "pick", team: "enemy", index });
      } else {
        if (index < 4) {
          setActiveSlot({ phase: "pick", team: "ally", index: index + 1 });
        } else {
          // Drafting complete
          setActiveSlot(null);
        }
      }
    }
  };

  const handleSelect = (heroName: string) => {
    if (!activeSlot || takenNames.has(heroName)) return;
    const { phase, team, index } = activeSlot;

    if (phase === "ban") {
      if (team === "ally") {
        const next = [...allyBans]; next[index] = heroName; setAllyBans(next);
      } else {
        const next = [...enemyBans]; next[index] = heroName; setEnemyBans(next);
      }
    } else {
      if (team === "ally") {
        const next = [...alliedTeam]; next[index] = heroName; setAlliedTeam(next);
      } else {
        const next = [...enemyTeam]; next[index] = heroName; setEnemyTeam(next);
      }
    }
    
    // Auto advance to next slot
    autoAdvance(activeSlot);
    setSearchQuery("");
  };

  const handleRemoveBan = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === "ally") { const n = [...allyBans]; n[index] = null; setAllyBans(n); }
    else { const n = [...enemyBans]; n[index] = null; setEnemyBans(n); }
    setActiveSlot({ phase: "ban", team, index });
  };

  const handleRemovePick = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === "ally") { const n = [...alliedTeam]; n[index] = null; setAlliedTeam(n); }
    else { const n = [...enemyTeam]; n[index] = null; setEnemyTeam(n); }
    setActiveSlot({ phase: "pick", team, index });
  };

  const handleModeChange = (m: DraftMode) => {
    setMode(m);
    setAllyBans([null, null, null, null, null]);
    setEnemyBans([null, null, null, null, null]);
    setAlliedTeam([null, null, null, null, null]);
    setEnemyTeam([null, null, null, null, null]);
    setActiveSlot({ phase: "ban", team: "ally", index: 0 });
  };

  const [liveHeroes, setLiveHeroes] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const res = await fetch("https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api/mlbb/heroes");
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.records && !cancelled) {
            setLiveHeroes(data.data.records);
          }
        }
      } catch (e) {}
    };
    fetchLive();
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    const validAllies = alliedTeam.filter(Boolean) as string[];
    const validEnemies = enemyTeam.filter(Boolean) as string[];

    if (liveHeroes.length > 0) {
      // ── LIVE API EVALUATION ──
      const scores: Record<string, { score: number; reasons: string[] }> = {};
      
      ALL_HEROES.forEach(h => {
        if (validAllies.includes(h.name) || validEnemies.includes(h.name)) return;
        scores[h.name] = { score: 0, reasons: [] };
      });

      // 1. Evaluate against Enemy Picks (Counters)
      validEnemies.forEach(enemyName => {
        const enemyLocal = ALL_HEROES.find(h => h.name === enemyName);
        if (!enemyLocal || !enemyLocal.mlbbId) return;

        const enemyRecord = liveHeroes.find(r => r.data.hero_id === enemyLocal.mlbbId);
        if (!enemyRecord) return;

        const strongAgainstIds = enemyRecord.data.relation?.strong?.target_hero_id || [];
        const weakAgainstIds = enemyRecord.data.relation?.weak?.target_hero_id || [];

        ALL_HEROES.forEach(h => {
          if (!scores[h.name] || !h.mlbbId) return;
          // If enemy is WEAK against H -> H counters enemy (Good)
          if (weakAgainstIds.includes(h.mlbbId)) {
            scores[h.name].score += 1.5;
            scores[h.name].reasons.push(`Counters ${enemyName}`);
          }
          // If enemy is STRONG against H -> Enemy counters H (Bad)
          if (strongAgainstIds.includes(h.mlbbId)) {
            scores[h.name].score -= 1.5;
          }
        });
      });

      // 2. Evaluate against Allied Picks (Synergy)
      validAllies.forEach(allyName => {
        const allyLocal = ALL_HEROES.find(h => h.name === allyName);
        if (!allyLocal || !allyLocal.mlbbId) return;

        const allyRecord = liveHeroes.find(r => r.data.hero_id === allyLocal.mlbbId);
        if (!allyRecord) return;

        const assistIds = allyRecord.data.relation?.assist?.target_hero_id || [];
        ALL_HEROES.forEach(h => {
          if (!scores[h.name] || !h.mlbbId) return;
          if (assistIds.includes(h.mlbbId)) {
            scores[h.name].score += 1.0;
            if (scores[h.name].reasons.length < 2) {
              scores[h.name].reasons.push(`Combos with ${allyName}`);
            }
          }
        });
      });

      return Object.entries(scores)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.score - a.score);
        
    } else {
      // ── STATIC FALLBACK ──
      return evaluateCounters(validAllies, validEnemies);
    }
  }, [alliedTeam, enemyTeam, liveHeroes]);

  const topSuggestions = suggestions.slice(0, 5).filter(s => !takenNames.has(s.name));
  const badPicks = [...suggestions].reverse().slice(0, 3).filter(s => s.score < 0 && !takenNames.has(s.name));

  // Full 120+ hero database filtering
  const filteredHeroes = ALL_HEROES.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "All" || h.role.includes(selectedRole);
    return matchesSearch && matchesRole;
  });

  const bannedAll = new Set([...allyBans.filter(Boolean), ...enemyBans.filter(Boolean)] as string[]);

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1400px] mx-auto bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-850 shadow-sm min-h-screen">
      
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-600">
            Draft Simulator
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">Click a slot to activate it, then select a hero from the grid to pick or ban.</p>
        </div>
        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-fit flex-shrink-0">
          {(["ranked", "tournament"] as DraftMode[]).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === m
                  ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white shadow-sm border border-neutral-200/60 dark:border-neutral-700"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
              }`}
            >
              {m === "ranked" ? "🏅 Ranked Mode" : "🏆 Tournament Mode"}
              <span className="ml-1.5 text-[10px] opacity-75 font-semibold">({BAN_COUNT[m]} bans)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Draft Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Allied Team (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          
          {/* Allied Bans */}
          <div className="bg-neutral-50 dark:bg-neutral-850/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black mb-2.5 flex items-center gap-1 uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5" /> Allied Bans
            </p>
            <div className="flex gap-1.5 justify-between">
              {Array.from({ length: banCount }).map((_, i) => (
                <BanSlot
                  key={`ally-ban-${i}`}
                  heroName={allyBans[i]}
                  active={activeSlot?.phase === "ban" && activeSlot?.team === "ally" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "ban", team: "ally", index: i })}
                  onRemove={(e) => handleRemoveBan("ally", i, e)}
                />
              ))}
            </div>
          </div>

          {/* Allied Picks */}
          <div className="bg-neutral-50 dark:bg-neutral-850/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-neutral-200/50 dark:border-neutral-800/80 pb-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h2 className="font-black text-neutral-800 dark:text-neutral-250 text-sm">Allied Picks</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {alliedTeam.map((heroName, i) => (
                <PickSlot
                  key={`ally-${i}`}
                  heroName={heroName}
                  team="ally"
                  active={activeSlot?.phase === "pick" && activeSlot?.team === "ally" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "pick", team: "ally", index: i })}
                  onRemove={(e) => handleRemovePick("ally", i, e)}
                  index={i}
                />
              ))}
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: Hero Selection Grid (6 cols) */}
        <div className="xl:col-span-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-md flex flex-col gap-4">
          
          {/* Active Slot Status Bar */}
          <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-850/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-black text-neutral-700 dark:text-neutral-350">
                {activeSlot 
                  ? `Active Action: ${activeSlot.team === "ally" ? "Allied" : "Enemy"} ${activeSlot.phase === "ban" ? "Ban" : "Pick"} Slot ${activeSlot.index + 1}`
                  : "Draft Completed"
                }
              </span>
            </div>
            {activeSlot && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-350 px-2 py-0.5 rounded-lg font-bold">
                Waiting Choice
              </span>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by hero name..."
                className="w-full bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-2xl pl-10 pr-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Role Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex-shrink-0
                    ${selectedRole === role
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Hero portrait list (Scrollable grid) */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredHeroes.map(hero => {
              const isBanned = bannedAll.has(hero.name);
              const taken = takenNames.has(hero.name);
              const disabled = taken || isBanned;
              return (
                <HeroGridCard
                  key={hero.id}
                  hero={hero}
                  disabled={disabled}
                  isBanned={isBanned}
                  onSelect={() => !disabled && handleSelect(hero.name)}
                />
              );
            })}
            {filteredHeroes.length === 0 && (
              <div className="col-span-full py-16 text-center text-neutral-450 dark:text-neutral-500 font-extrabold text-sm">
                No matching heroes in pool.
              </div>
            )}
          </div>

          {/* Counter Suggestions Panel */}
          <div className="mt-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-200">Recommended Counter-Picks</h3>
            </div>
            {enemyTeam.every(h => h === null) ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed bg-neutral-50 dark:bg-neutral-850/30 p-3 rounded-2xl">
                Add enemy picks on the right to trigger real-time AI suggestions.
              </p>
            ) : topSuggestions.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 p-3 bg-neutral-50 dark:bg-neutral-850/30 rounded-2xl">All counter-picks taken.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {topSuggestions.slice(0, 4).map((s, i) => (
                  <div key={i} className="bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl p-2.5 border border-indigo-100/40 dark:border-indigo-900/10 flex items-center gap-2.5">
                    <HeroAvatar name={s.name} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center leading-none">
                        <span className="font-extrabold text-xs text-neutral-800 dark:text-neutral-100 truncate">{s.name}</span>
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md text-indigo-700 dark:text-indigo-350 font-bold ml-1 flex-shrink-0">+{s.score}</span>
                      </div>
                      {s.reasons.slice(0, 1).map((r, j) => (
                        <p key={j} className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" /> {r}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Enemy Team (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          
          {/* Enemy Bans */}
          <div className="bg-neutral-50 dark:bg-neutral-850/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm">
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-black mb-2.5 flex items-center gap-1 uppercase tracking-widest">
              <Sword className="w-3.5 h-3.5" /> Enemy Bans
            </p>
            <div className="flex gap-1.5 justify-between">
              {Array.from({ length: banCount }).map((_, i) => (
                <BanSlot
                  key={`enemy-ban-${i}`}
                  heroName={enemyBans[i]}
                  active={activeSlot?.phase === "ban" && activeSlot?.team === "enemy" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "ban", team: "enemy", index: i })}
                  onRemove={(e) => handleRemoveBan("enemy", i, e)}
                />
              ))}
            </div>
          </div>

          {/* Enemy Picks */}
          <div className="bg-neutral-50 dark:bg-neutral-850/40 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-neutral-200/50 dark:border-neutral-800/80 pb-2">
              <Sword className="w-4 h-4 text-rose-500" />
              <h2 className="font-black text-neutral-800 dark:text-neutral-250 text-sm">Enemy Picks</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {enemyTeam.map((heroName, i) => (
                <PickSlot
                  key={`enemy-${i}`}
                  heroName={heroName}
                  team="enemy"
                  active={activeSlot?.phase === "pick" && activeSlot?.team === "enemy" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "pick", team: "enemy", index: i })}
                  onRemove={(e) => handleRemovePick("enemy", i, e)}
                  index={i}
                />
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Avoid Picks & Summary Panel (Bottom Section) */}
      {badPicks.length > 0 && (
        <div className="bg-rose-50/30 dark:bg-rose-950/5 border border-rose-100/50 dark:border-rose-900/20 rounded-3xl p-4 mt-2">
          <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-450">
            <ShieldAlert className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider">Avoid Picking (Heavy Counters)</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {badPicks.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-rose-100 dark:border-rose-950/20 rounded-2xl px-3 py-1.5 shadow-sm">
                <HeroAvatar name={s.name} size="xs" dim />
                <div className="leading-none">
                  <p className="font-extrabold text-xs text-neutral-800 dark:text-neutral-100">{s.name}</p>
                  <p className="text-[9px] text-rose-500 font-bold mt-0.5">Countered by {enemyTeam.find(e => e !== null)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
