"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Search, Shield, Sword, ShieldAlert, Sparkles, Ban } from "lucide-react";
import { HEROES, evaluateCounters, getHeroByName as getHeroInfoByName } from "@/lib/heroData";
import { ALL_HEROES, getHeroByName } from "@/data/heroes-data";

type DraftMode = "ranked" | "tournament";

const BAN_COUNT: Record<DraftMode, number> = {
  ranked: 2,
  tournament: 3,
};

function getHeroImage(name: string): string {
  const hero = getHeroByName(name);
  return hero?.image ?? "";
}

function HeroAvatar({
  name,
  size = "md",
  crossed = false,
  dim = false,
}: {
  name: string | null;
  size?: "sm" | "md" | "lg";
  crossed?: boolean;
  dim?: boolean;
}) {
  const [err, setErr] = useState(false);
  const img = name ? getHeroImage(name) : "";
  const sizeClass = size === "sm" ? "w-10 h-10 text-sm" : size === "lg" ? "w-16 h-16 text-xl" : "w-12 h-12 text-base";

  return (
    <div className={`relative rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 ${sizeClass} ${dim ? "opacity-50" : ""}`}>
      {name && img && !err ? (
        <img src={img} alt={name} className="w-full h-full object-cover object-top" onError={() => setErr(true)} />
      ) : name ? (
        <div className="w-full h-full flex items-center justify-center font-black text-neutral-400">
          {name.charAt(0)}
        </div>
      ) : (
        <div className="w-full h-full" />
      )}
      {crossed && (
        <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
          <X className="w-5 h-5 text-red-300" />
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
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-all
        ${active
          ? "border-rose-500 bg-rose-500/10"
          : heroName
            ? "border-rose-800/50 bg-rose-900/20"
            : "border-dashed border-neutral-700 hover:border-rose-500/50"
        }`}
    >
      {heroName ? (
        <>
          <HeroAvatar name={heroName} size="sm" crossed />
          <p className="text-[9px] text-rose-400 font-semibold text-center truncate w-full">{heroName}</p>
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neutral-800 border border-neutral-600 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-400"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center">
            <Ban className="w-4 h-4 text-neutral-600" />
          </div>
          <p className="text-[9px] text-neutral-600">Ban</p>
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
}: {
  heroName: string | null;
  team: "ally" | "enemy";
  active: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const accent = team === "ally" ? "indigo" : "rose";
  const heroInfo = heroName ? getHeroInfoByName(heroName) : null;

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
        ${active
          ? `border-${accent}-500 bg-${accent}-500/10`
          : heroName
            ? "border-neutral-700 bg-neutral-800/40"
            : `border-dashed border-neutral-700 hover:border-${accent}-500/50 hover:bg-neutral-800/30`
        }`}
    >
      {heroName ? (
        <>
          <HeroAvatar name={heroName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-neutral-100 truncate">{heroName}</p>
            <p className="text-xs text-neutral-500">{heroInfo?.roles.join(", ") ?? ""}</p>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <span className="text-neutral-600 text-sm font-medium">
          {team === "ally" ? "Pick hero..." : "Pick enemy..."}
        </span>
      )}
    </div>
  );
}

// ── Hero Pick Card (modal grid item) ────────────────────────────────────────
function HeroPickCard({
  name,
  disabled,
  isBanned,
  onSelect,
}: {
  name: string;
  disabled: boolean;
  isBanned: boolean;
  onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const heroImg = getHeroImage(name);
  return (
    <div
      onClick={onSelect}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all
        ${disabled
          ? "opacity-40 cursor-not-allowed border-neutral-800 bg-neutral-800/30"
          : "cursor-pointer border-neutral-700 hover:border-indigo-500 hover:bg-indigo-500/10"
        }`}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-800 relative">
        {heroImg && !imgErr ? (
          <img src={heroImg} alt={name} className="w-full h-full object-cover object-top" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-neutral-500">
            {name.charAt(0)}
          </div>
        )}
        {isBanned && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-300" />
          </div>
        )}
      </div>
      <span className="text-[10px] font-semibold text-center text-neutral-300 leading-tight">{name}</span>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DraftSimulatorPage() {
  const [mode, setMode] = useState<DraftMode>("ranked");
  const banCount = BAN_COUNT[mode];

  const [allyBans, setAllyBans] = useState<(string | null)[]>([null, null, null]);
  const [enemyBans, setEnemyBans] = useState<(string | null)[]>([null, null, null]);
  const [alliedTeam, setAlliedTeam] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyTeam, setEnemyTeam] = useState<(string | null)[]>([null, null, null, null, null]);

  type SlotType = { phase: "ban" | "pick"; team: "ally" | "enemy"; index: number };
  const [activeSlot, setActiveSlot] = useState<SlotType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // All taken names (ban + pick)
  const takenNames = useMemo(() => new Set([
    ...allyBans.filter(Boolean),
    ...enemyBans.filter(Boolean),
    ...alliedTeam.filter(Boolean),
    ...enemyTeam.filter(Boolean),
  ] as string[]), [allyBans, enemyBans, alliedTeam, enemyTeam]);

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
    setActiveSlot(null);
    setSearchQuery("");
  };

  const handleRemoveBan = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === "ally") { const n = [...allyBans]; n[index] = null; setAllyBans(n); }
    else { const n = [...enemyBans]; n[index] = null; setEnemyBans(n); }
  };

  const handleRemovePick = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === "ally") { const n = [...alliedTeam]; n[index] = null; setAlliedTeam(n); }
    else { const n = [...enemyTeam]; n[index] = null; setEnemyTeam(n); }
  };

  const handleModeChange = (m: DraftMode) => {
    setMode(m);
    setAllyBans([null, null, null]);
    setEnemyBans([null, null, null]);
    setAlliedTeam([null, null, null, null, null]);
    setEnemyTeam([null, null, null, null, null]);
    setActiveSlot(null);
  };

  const suggestions = useMemo(() => {
    const validAllies = alliedTeam.filter(Boolean) as string[];
    const validEnemies = enemyTeam.filter(Boolean) as string[];
    return evaluateCounters(validAllies, validEnemies);
  }, [alliedTeam, enemyTeam]);

  const topSuggestions = suggestions.slice(0, 5).filter(s => !takenNames.has(s.name));
  const badPicks = [...suggestions].reverse().slice(0, 3).filter(s => s.score < 0 && !takenNames.has(s.name));

  const filteredHeroes = HEROES.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) && !takenNames.has(h.name)
  );

  const bannedAll = new Set([...allyBans.filter(Boolean), ...enemyBans.filter(Boolean)] as string[]);

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
          Draft Simulator
        </h1>
        <p className="text-neutral-500 text-sm">Plan your comp and find the best counter-picks.</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl w-fit">
        {(["ranked", "tournament"] as DraftMode[]).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === m
                ? "bg-gradient-to-r from-indigo-500 to-teal-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {m === "ranked" ? "🏅 Ranked Mode" : "🏆 Tournament Mode"}
            <span className="ml-2 text-xs opacity-70">({BAN_COUNT[m]} bans)</span>
          </button>
        ))}
      </div>

      {/* BAN PHASE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Ban className="w-4 h-4 text-rose-500" />
          <h2 className="font-bold text-neutral-200">
            Ban Phase
            <span className="ml-2 text-xs text-neutral-500 font-normal">
              {mode === "ranked" ? "2 bans per team" : "3 bans per team"}
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Ally Bans */}
          <div>
            <p className="text-xs text-indigo-400 font-bold mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Allied Bans
            </p>
            <div className="flex gap-2 flex-wrap">
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
          {/* Enemy Bans */}
          <div>
            <p className="text-xs text-rose-400 font-bold mb-2 flex items-center gap-1">
              <Sword className="w-3 h-3" /> Enemy Bans
            </p>
            <div className="flex gap-2 flex-wrap">
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
        </div>
      </div>

      {/* PICK PHASE + SUGGESTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Teams */}
        <div className="lg:col-span-8 flex flex-col md:flex-row gap-4">
          {/* Allied Team */}
          <div className="flex-1 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h2 className="font-bold text-neutral-200">Allied Team</h2>
            </div>
            <div className="flex flex-col gap-2">
              {alliedTeam.map((heroName, i) => (
                <PickSlot
                  key={`ally-${i}`}
                  heroName={heroName}
                  team="ally"
                  active={activeSlot?.phase === "pick" && activeSlot?.team === "ally" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "pick", team: "ally", index: i })}
                  onRemove={(e) => handleRemovePick("ally", i, e)}
                />
              ))}
            </div>
          </div>

          {/* Enemy Team */}
          <div className="flex-1 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sword className="w-4 h-4 text-rose-500" />
              <h2 className="font-bold text-neutral-200">Enemy Team</h2>
            </div>
            <div className="flex flex-col gap-2">
              {enemyTeam.map((heroName, i) => (
                <PickSlot
                  key={`enemy-${i}`}
                  heroName={heroName}
                  team="enemy"
                  active={activeSlot?.phase === "pick" && activeSlot?.team === "enemy" && activeSlot?.index === i}
                  onClick={() => setActiveSlot({ phase: "pick", team: "enemy", index: i })}
                  onRemove={(e) => handleRemovePick("enemy", i, e)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion Engine */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <h2 className="font-bold">Suggested Picks</h2>
            </div>
            {enemyTeam.every(h => h === null) ? (
              <p className="text-indigo-200 text-sm">Add enemy picks to see counter suggestions.</p>
            ) : topSuggestions.length === 0 ? (
              <p className="text-indigo-200 text-sm">All suggested picks already taken.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {topSuggestions.map((s, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/15 flex items-center gap-3">
                    <HeroAvatar name={s.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm truncate">{s.name}</span>
                        <span className="text-xs bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-100 flex-shrink-0 ml-1">+{s.score}</span>
                      </div>
                      {s.reasons.slice(0, 1).map((r, j) => (
                        <span key={j} className="text-xs text-indigo-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-300 flex-shrink-0" /> {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {badPicks.length > 0 && (
            <div className="bg-neutral-900 border border-rose-800/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 text-rose-500">
                <ShieldAlert className="w-4 h-4" />
                <h2 className="font-bold text-sm">Avoid Picking</h2>
              </div>
              <div className="flex flex-col gap-2">
                {badPicks.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <HeroAvatar name={s.name} size="sm" dim />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-neutral-300 truncate">{s.name}</p>
                      <p className="text-xs text-rose-400">Heavily Countered</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Banned Heroes Summary */}
          {bannedAll.size > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Banned Heroes</p>
              <div className="flex flex-wrap gap-2">
                {[...bannedAll].map(name => (
                  <div key={name} className="flex items-center gap-1.5 bg-rose-900/20 border border-rose-800/30 rounded-lg px-2 py-1">
                    <HeroAvatar name={name} size="sm" crossed />
                    <span className="text-[10px] text-rose-400 font-semibold">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Selection Modal */}
      <AnimatePresence>
        {activeSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-neutral-700 flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
                {activeSlot.phase === "ban" ? (
                  <Ban className="w-4 h-4 text-rose-500" />
                ) : activeSlot.team === "ally" ? (
                  <Shield className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Sword className="w-4 h-4 text-rose-500" />
                )}
                <span className="text-sm font-bold text-neutral-300">
                  {activeSlot.phase === "ban" ? "Select hero to ban" :
                    activeSlot.team === "ally" ? "Select hero for Allied Team" : "Select Enemy Hero"}
                </span>
                <div className="flex-1" />
                <Search className="w-4 h-4 text-neutral-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-neutral-200 text-sm w-32"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setActiveSlot(null)} className="p-1 hover:bg-neutral-800 rounded">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {filteredHeroes.map(hero => {
                  const isBanned = bannedAll.has(hero.name);
                  const taken = takenNames.has(hero.name);
                  const disabled = taken || isBanned;
                  return (
                    <HeroPickCard
                      key={hero.name}
                      name={hero.name}
                      disabled={disabled}
                      isBanned={isBanned}
                      onSelect={() => !disabled && handleSelect(hero.name)}
                    />
                  );
                })}
                {filteredHeroes.length === 0 && (
                  <div className="col-span-full py-10 text-center text-neutral-500">No heroes found.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
