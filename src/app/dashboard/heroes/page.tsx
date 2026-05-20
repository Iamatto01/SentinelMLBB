"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Star, Filter, ChevronDown } from "lucide-react";
import {
  ALL_HEROES,
  HeroData,
  PlaystyleTag,
  StrategyTag,
  CCTag,
  TimingTag,
  HeroRole,
} from "@/data/heroes-data";

// ─── Tag config ────────────────────────────────────────────────────────────

const PLAYSTYLE_CONFIG: Record<PlaystyleTag, { label: string; emoji: string; color: string; bg: string }> = {
  "barbar":              { label: "Barbar",        emoji: "⚔️", color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
  "semi-barbar":         { label: "Semi Barbar",   emoji: "🗡️", color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  "situational-barbar":  { label: "Situational",   emoji: "🎯", color: "text-cyan-600 dark:text-cyan-400",   bg: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20" },
  "playsafe":            { label: "Playsafe",      emoji: "🛡️", color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
};

const STRATEGY_CONFIG: Record<StrategyTag, { label: string; emoji: string; color: string; bg: string }> = {
  "high-ground":          { label: "High Ground",        emoji: "🏔️", color: "text-yellow-600 dark:text-yellow-400",  bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
  "tebal":                { label: "Tebal",              emoji: "🪨", color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20" },
  "healer":               { label: "Healer",             emoji: "💚", color: "text-lime-600 dark:text-lime-400",    bg: "bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/20" },
  "split-push":           { label: "Split Push",         emoji: "🏃", color: "text-orange-600 dark:text-orange-400",  bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
  "counter-split-push":   { label: "Counter Split",      emoji: "🚫", color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" },
};

const CC_CONFIG: Record<CCTag, { label: string; emoji: string; color: string; bg: string }> = {
  "full-cc":  { label: "Full CC",  emoji: "⛓️", color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" },
  "semi-cc":  { label: "Semi CC",  emoji: "🔗", color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10 border-fuchsia-200 dark:border-fuchsia-500/20" },
  "no-cc":    { label: "No CC",    emoji: "➖", color: "text-neutral-600 dark:text-neutral-400",  bg: "bg-neutral-50 dark:bg-neutral-500/10 border-neutral-200 dark:border-neutral-500/20" },
};

const TIMING_CONFIG: Record<TimingTag, { label: string; emoji: string; color: string; bg: string }> = {
  "early": { label: "Early (0-7m)", emoji: "⏱️", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
  "mid":   { label: "Mid (7-12m)",  emoji: "⏱️", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" },
  "late":  { label: "Late (12m+)",  emoji: "⏱️", color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
};

const ROLE_COLORS: Record<HeroRole, string> = {
  Tank:      "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
  Fighter:   "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
  Assassin:  "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  Mage:      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
  Marksman:  "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20",
  Support:   "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/20",
};

// ─── Small pill component ──────────────────────────────────────────────────
function Pill({ emoji, label, color, bg }: { emoji: string; label: string; color: string; bg: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${color}`}>
      {emoji} {label}
    </span>
  );
}

// ─── Filter button ─────────────────────────────────────────────────────────
function FilterBtn<T extends string>({
  value, active, label, emoji, color, bg, onClick,
}: {
  value: T; active: boolean; label: string; emoji: string;
  color: string; bg: string; onClick: (v: T) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
        ${active ? `${bg} ${color} border-current shadow-md scale-105` : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"}`}
    >
      {emoji} {label}
    </button>
  );
}

// ─── Hero Card ─────────────────────────────────────────────────────────────
function HeroCard({ hero, onClick }: { hero: HeroData; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all"
    >
      {/* Hero Image */}
      <div className="relative h-36 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
        {!imgErr ? (
          <img
            src={hero.image}
            alt={hero.name}
            className="w-full h-full object-cover object-top"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-black text-neutral-400 dark:text-neutral-600">
            {hero.name.charAt(0)}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-transparent to-transparent" />
        {/* CC badge top-right */}
        <div className="absolute top-2 right-2">
          <Pill {...CC_CONFIG[hero.cc]} />
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Name + Role */}
        <div>
          <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{hero.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {hero.role.map(r => (
              <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ROLE_COLORS[r]}`}>{r}</span>
            ))}
          </div>
        </div>

        {/* Playstyle tags */}
        <div className="flex flex-wrap gap-1">
          {hero.tags.map(t => (
            <Pill key={t} {...PLAYSTYLE_CONFIG[t]} />
          ))}
        </div>

        {/* Timing */}
        <div className="flex flex-wrap gap-1">
          {hero.timing.map(t => (
            <Pill key={t} {...TIMING_CONFIG[t]} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────
function HeroModal({ hero, onClose }: { hero: HeroData; onClose: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Hero banner image */}
          <div className="relative h-56 bg-gradient-to-br from-indigo-50 to-neutral-100 dark:from-indigo-900 dark:to-neutral-900 overflow-hidden">
            {!imgErr ? (
              <img src={hero.image} alt={hero.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" onError={() => setImgErr(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl font-black text-neutral-450 dark:text-neutral-700">{hero.name.charAt(0)}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-white/30 dark:via-neutral-900/30 to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-neutral-900/80 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white shadow-sm transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-5">
              <h2 className="text-2xl font-black text-neutral-850 dark:text-white">{hero.name}</h2>
              <div className="flex flex-wrap gap-1 mt-1">
                {hero.role.map(r => (
                  <span key={r} className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ROLE_COLORS[r]}`}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-350 leading-relaxed">{hero.description}</p>

            {/* Specialty + Difficulty */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-450 font-medium">{hero.specialty}</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= hero.difficulty ? "text-amber-500 fill-amber-500" : "text-neutral-200 dark:text-neutral-700"}`} />
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Playstyle</p>
              <div className="flex flex-wrap gap-1">
                {hero.tags.map(t => <Pill key={t} {...PLAYSTYLE_CONFIG[t]} />)}
              </div>
            </div>

            {hero.strategy.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Strategy</p>
                <div className="flex flex-wrap gap-1">
                  {hero.strategy.map(t => <Pill key={t} {...STRATEGY_CONFIG[t]} />)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">CC Level</p>
                <Pill {...CC_CONFIG[hero.cc]} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Power Spike</p>
                <div className="flex flex-wrap gap-1">
                  {hero.timing.map(t => <Pill key={t} {...TIMING_CONFIG[t]} />)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function HeroesPage() {
  const [search, setSearch] = useState("");
  const [selectedPlaystyle, setSelectedPlaystyle] = useState<PlaystyleTag | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTag | null>(null);
  const [selectedCC, setSelectedCC] = useState<CCTag | null>(null);
  const [selectedTiming, setSelectedTiming] = useState<TimingTag | null>(null);
  const [selectedRole, setSelectedRole] = useState<HeroRole | null>(null);
  const [selectedHero, setSelectedHero] = useState<HeroData | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const toggleFilter = <T,>(current: T | null, value: T, set: (v: T | null) => void) => {
    set(current === value ? null : value);
  };

  const filtered = useMemo(() => {
    return ALL_HEROES.filter(h => {
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedPlaystyle && !h.tags.includes(selectedPlaystyle)) return false;
      if (selectedStrategy && !h.strategy.includes(selectedStrategy)) return false;
      if (selectedCC && h.cc !== selectedCC) return false;
      if (selectedTiming && !h.timing.includes(selectedTiming)) return false;
      if (selectedRole && !h.role.includes(selectedRole)) return false;
      return true;
    });
  }, [search, selectedPlaystyle, selectedStrategy, selectedCC, selectedTiming, selectedRole]);

  const hasFilter = selectedPlaystyle || selectedStrategy || selectedCC || selectedTiming || selectedRole;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-600 dark:from-teal-400 dark:to-indigo-400">
            Hero Pool
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">{filtered.length} heroes {hasFilter ? "(filtered)" : "available"}</p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search hero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-750 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-sm shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4 shadow-sm">
              {/* Playstyle */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Playstyle</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(PLAYSTYLE_CONFIG) as [PlaystyleTag, typeof PLAYSTYLE_CONFIG[PlaystyleTag]][]).map(([key, cfg]) => (
                    <FilterBtn key={key} value={key} active={selectedPlaystyle === key} {...cfg} onClick={v => toggleFilter(selectedPlaystyle, v, setSelectedPlaystyle)} />
                  ))}
                </div>
              </div>

              {/* Strategy */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Strategy</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STRATEGY_CONFIG) as [StrategyTag, typeof STRATEGY_CONFIG[StrategyTag]][]).map(([key, cfg]) => (
                    <FilterBtn key={key} value={key} active={selectedStrategy === key} {...cfg} onClick={v => toggleFilter(selectedStrategy, v, setSelectedStrategy)} />
                  ))}
                </div>
              </div>

              {/* CC */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Crowd Control</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(CC_CONFIG) as [CCTag, typeof CC_CONFIG[CCTag]][]).map(([key, cfg]) => (
                    <FilterBtn key={key} value={key} active={selectedCC === key} {...cfg} onClick={v => toggleFilter(selectedCC, v, setSelectedCC)} />
                  ))}
                </div>
              </div>

              {/* Power Spike */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Power Spike</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(TIMING_CONFIG) as [TimingTag, typeof TIMING_CONFIG[TimingTag]][]).map(([key, cfg]) => (
                    <FilterBtn key={key} value={key} active={selectedTiming === key} {...cfg} onClick={v => toggleFilter(selectedTiming, v, setSelectedTiming)} />
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Role</p>
                <div className="flex flex-wrap gap-2">
                  {(["Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as HeroRole[]).map(role => (
                    <button
                      key={role}
                      onClick={() => toggleFilter(selectedRole, role, setSelectedRole)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${selectedRole === role ? ROLE_COLORS[role] + " scale-105 shadow-sm" : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {hasFilter && (
                <button
                  onClick={() => { setSelectedPlaystyle(null); setSelectedStrategy(null); setSelectedCC(null); setSelectedTiming(null); setSelectedRole(null); }}
                  className="text-xs text-neutral-450 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400 underline transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No heroes found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(hero => (
              <HeroCard key={hero.id} hero={hero} onClick={() => setSelectedHero(hero)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedHero && <HeroModal hero={selectedHero} onClose={() => setSelectedHero(null)} />}
      </AnimatePresence>
    </div>
  );
}
