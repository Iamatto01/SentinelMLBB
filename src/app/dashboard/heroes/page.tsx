"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Star,
  Filter,
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Shield,
  Swords,
  Check,
} from "lucide-react";
import {
  ALL_HEROES,
  HeroData,
  PlaystyleTag,
  StrategyTag,
  CCTag,
  TimingTag,
  HeroRole,
} from "@/data/heroes-data";

// ─── Extended Hero Data Type ───────────────────────────────────────────────
export interface ExtendedHeroData extends Omit<HeroData, "tags" | "strategy"> {
  tags: string[];
  strategy: string[];
  counters: string[];      // IDs of heroes this hero counters
  counteredBy: string[];   // IDs of heroes that counter this hero
}

// ─── Custom Tag Type ────────────────────────────────────────────────────────
interface CustomTag {
  id: string;
  category: "playstyle" | "strategy";
  label: string;
  emoji: string;
  colorScheme: string; // "rose", "emerald", "cyan", "indigo", "red", "yellow", "purple"
}

// ─── Color Schemes for Custom Tags ──────────────────────────────────────────
const COLOR_SCHEMES = [
  { id: "rose", name: "Sunset Rose", color: "text-rose-650 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20", ring: "ring-rose-500" },
  { id: "emerald", name: "Emerald Aura", color: "text-emerald-650 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", ring: "ring-emerald-500" },
  { id: "cyan", name: "Oceanic Breeze", color: "text-cyan-655 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20", ring: "ring-cyan-500" },
  { id: "indigo", name: "Indigo Magic", color: "text-indigo-650 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20", ring: "ring-indigo-500" },
  { id: "red", name: "Crimson Fury", color: "text-red-650 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20", ring: "ring-red-500" },
  { id: "yellow", name: "Golden Glow", color: "text-yellow-650 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20", ring: "ring-yellow-500" },
  { id: "purple", name: "Purple Dream", color: "text-purple-650 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20", ring: "ring-purple-500" },
];

// ─── Default Static Configuration ──────────────────────────────────────────
const PLAYSTYLE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  "barbar":              { label: "Barbar",        emoji: "⚔️", color: "text-red-650 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
  "semi-barbar":         { label: "Semi Barbar",   emoji: "🗡️", color: "text-amber-650 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  "situational-barbar":  { label: "Situational",   emoji: "🎯", color: "text-cyan-650 dark:text-cyan-400",   bg: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20" },
  "playsafe":            { label: "Playsafe",      emoji: "🛡️", color: "text-emerald-650 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
};

const STRATEGY_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  "high-ground":          { label: "High Ground",        emoji: "🏔️", color: "text-yellow-650 dark:text-yellow-400",  bg: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
  "tebal":                { label: "Tebal",              emoji: "🪨", color: "text-slate-650 dark:text-slate-400",   bg: "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20" },
  "healer":               { label: "Healer",             emoji: "💚", color: "text-lime-650 dark:text-lime-400",    bg: "bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/20" },
  "split-push":           { label: "Split Push",         emoji: "🏃", color: "text-orange-650 dark:text-orange-400",  bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
  "counter-split-push":   { label: "Counter Split",      emoji: "🚫", color: "text-rose-650 dark:text-rose-400",    bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" },
};

const CC_CONFIG: Record<CCTag, { label: string; emoji: string; color: string; bg: string }> = {
  "full-cc":  { label: "Full CC",  emoji: "⛓️", color: "text-violet-650 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" },
  "semi-cc":  { label: "Semi CC",  emoji: "🔗", color: "text-fuchsia-650 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10 border-fuchsia-200 dark:border-fuchsia-500/20" },
  "no-cc":    { label: "No CC",    emoji: "➖", color: "text-neutral-650 dark:text-neutral-400",  bg: "bg-neutral-50 dark:bg-neutral-500/10 border-neutral-200 dark:border-neutral-500/20" },
};

const TIMING_CONFIG: Record<TimingTag, { label: string; emoji: string; color: string; bg: string }> = {
  "early": { label: "Early (0-7m)", emoji: "⏱️", color: "text-orange-650 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
  "mid":   { label: "Mid (7-12m)",  emoji: "⏱️", color: "text-purple-650 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" },
  "late":  { label: "Late (12m+)",  emoji: "⏱️", color: "text-blue-650 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
};

const ROLE_COLORS: Record<HeroRole, string> = {
  Tank:      "bg-sky-50 dark:bg-sky-500/10 text-sky-650 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
  Fighter:   "bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border-red-200 dark:border-red-500/20",
  Assassin:  "bg-purple-50 dark:bg-purple-500/10 text-purple-650 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
  Mage:      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
  Marksman:  "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-650 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20",
  Support:   "bg-teal-50 dark:bg-teal-500/10 text-teal-650 dark:text-teal-400 border-teal-200 dark:border-teal-500/20",
};

// ─── Small Pill Component ──────────────────────────────────────────────────
function Pill({ emoji, label, color, bg }: { emoji: string; label: string; color: string; bg: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${color} transition-all hover:scale-105`}>
      {emoji} {label}
    </span>
  );
}

// ─── Filter Button Component ───────────────────────────────────────────────
function FilterBtn<T extends string>({
  value, active, label, emoji, color, bg, onClick,
}: {
  value: T; active: boolean; label: string; emoji: string;
  color: string; bg: string; onClick: (v: T) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200
        ${active ? `${bg} ${color} border-current shadow-md scale-105` : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"}`}
    >
      {emoji} {label}
    </button>
  );
}

// ─── Hero Card Component ───────────────────────────────────────────────────
function HeroCard({
  hero,
  onClick,
  playstyleConfigs,
}: {
  hero: ExtendedHeroData;
  onClick: () => void;
  playstyleConfigs: Record<string, { label: string; emoji: string; color: string; bg: string }>;
}) {
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
      className="cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all flex flex-col h-full"
    >
      {/* Hero Image */}
      <div className="relative h-36 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden shrink-0">
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

      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        {/* Name + Role */}
        <div>
          <p className="font-bold text-sm text-neutral-850 dark:text-neutral-100 leading-tight">{hero.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {hero.role.map(r => (
              <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ROLE_COLORS[r]}`}>{r}</span>
            ))}
          </div>
        </div>

        {/* Playstyle tags */}
        <div className="flex flex-wrap gap-1">
          {hero.tags.map(t => {
            const config = playstyleConfigs[t] || { label: t, emoji: "🏷️", color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700" };
            return <Pill key={t} {...config} />;
          })}
        </div>

        {/* Timing */}
        <div className="flex flex-wrap gap-1 border-t border-neutral-100 dark:border-neutral-850 pt-2 shrink-0">
          {hero.timing.map(t => (
            <Pill key={t} {...TIMING_CONFIG[t]} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Detail Modal Component ───────────────────────────────────────────────
function HeroModal({
  hero,
  onClose,
  playstyleConfigs,
  strategyConfigs,
  allHeroesMap,
  onHeroSelect,
}: {
  hero: ExtendedHeroData;
  onClose: () => void;
  playstyleConfigs: Record<string, { label: string; emoji: string; color: string; bg: string }>;
  strategyConfigs: Record<string, { label: string; emoji: string; color: string; bg: string }>;
  allHeroesMap: Record<string, ExtendedHeroData>;
  onHeroSelect: (hero: ExtendedHeroData) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setImgErr(false);
  }, [hero]);

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
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Hero banner image */}
          <div className="relative h-52 bg-gradient-to-br from-indigo-55 to-neutral-100 dark:from-indigo-900 dark:to-neutral-900 overflow-hidden shrink-0">
            {!imgErr ? (
              <img src={hero.image} alt={hero.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" onError={() => setImgErr(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl font-black text-neutral-450 dark:text-neutral-700">{hero.name.charAt(0)}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-white/20 dark:via-neutral-900/20 to-transparent" />
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-neutral-900/80 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-805 dark:hover:text-white shadow-sm transition-colors z-10">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-5">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white">{hero.name}</h2>
              <div className="flex flex-wrap gap-1 mt-1">
                {hero.role.map(r => (
                  <span key={r} className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ROLE_COLORS[r]}`}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-350 leading-relaxed">{hero.description}</p>

            {/* Specialty + Difficulty */}
            <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/30 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-605 dark:text-neutral-400 font-bold uppercase tracking-wider">{hero.specialty || "General Specialty"}</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= hero.difficulty ? "text-amber-500 fill-amber-500" : "text-neutral-205 dark:text-neutral-700"}`} />
                ))}
              </div>
            </div>

            {/* Playstyle Tags */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Playstyle</p>
              <div className="flex flex-wrap gap-1">
                {hero.tags.map(t => {
                  const config = playstyleConfigs[t] || { label: t, emoji: "🏷️", color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700" };
                  return <Pill key={t} {...config} />;
                })}
              </div>
            </div>

            {/* Strategy Tags */}
            {hero.strategy.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold uppercase tracking-wider">Strategy</p>
                <div className="flex flex-wrap gap-1">
                  {hero.strategy.map(t => {
                    const config = strategyConfigs[t] || { label: t, emoji: "🎯", color: "text-neutral-600 dark:text-neutral-400", bg: "bg-neutral-50 dark:bg-neutral-850/50 border-neutral-200 dark:border-neutral-700" };
                    return <Pill key={t} {...config} />;
                  })}
                </div>
              </div>
            )}

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-800/20 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <div className="space-y-1.5">
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">CC Level</p>
                <Pill {...CC_CONFIG[hero.cc]} />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Power Spike</p>
                <div className="flex flex-wrap gap-1">
                  {hero.timing.map(t => (
                    <Pill key={t} {...TIMING_CONFIG[t]} />
                  ))}
                </div>
              </div>
            </div>

            {/* Matchups / Counters Section */}
            {((hero.counters && hero.counters.length > 0) || (hero.counteredBy && hero.counteredBy.length > 0)) ? (
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Matchup Synergy</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strong Against */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-emerald-650 dark:text-emerald-450 flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-emerald-500" /> Strong Against
                    </p>
                    {hero.counters && hero.counters.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {hero.counters.map(id => {
                          const target = allHeroesMap[id];
                          if (!target) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => onHeroSelect(target)}
                              className="group flex items-center gap-1.5 p-1 pr-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors"
                              title={`Click to view ${target.name}`}
                            >
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200">
                                <img src={target.image} alt={target.name} className="w-full h-full object-cover object-top" />
                              </div>
                              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 group-hover:underline">{target.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">No counters specified</p>
                    )}
                  </div>

                  {/* Weak Against */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-rose-650 dark:text-rose-450 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-rose-500" /> Weak Against
                    </p>
                    {hero.counteredBy && hero.counteredBy.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {hero.counteredBy.map(id => {
                          const target = allHeroesMap[id];
                          if (!target) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => onHeroSelect(target)}
                              className="group flex items-center gap-1.5 p-1 pr-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500 transition-colors"
                              title={`Click to view ${target.name}`}
                            >
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200">
                                <img src={target.image} alt={target.name} className="w-full h-full object-cover object-top" />
                              </div>
                              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 group-hover:underline">{target.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">No threats specified</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Tag & Counters Editor Modal ───────────────────────────────────────────
function EditorModal({
  isOpen,
  onClose,
  heroes,
  customTags,
  onCreateTag,
  onDeleteTag,
  onUpdateHero,
  onResetAll,
  allTagsByCategory,
}: {
  isOpen: boolean;
  onClose: () => void;
  heroes: ExtendedHeroData[];
  customTags: CustomTag[];
  onCreateTag: (category: "playstyle" | "strategy", label: string, emoji: string, colorScheme: string) => void;
  onDeleteTag: (tagId: string) => void;
  onUpdateHero: (heroId: string, updates: Partial<ExtendedHeroData>) => void;
  onResetAll: () => void;
  allTagsByCategory: (cat: "playstyle" | "strategy") => { id: string; label: string; emoji: string }[];
}) {
  const [selectedHeroId, setSelectedHeroId] = useState(heroes[0]?.id || "");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagEmoji, setNewTagEmoji] = useState("🏷️");
  const [newTagCategory, setNewTagCategory] = useState<"playstyle" | "strategy">("playstyle");
  const [newTagColorScheme, setNewTagColorScheme] = useState("rose");

  const [counterSearch, setCounterSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedHero = useMemo(() => {
    return heroes.find(h => h.id === selectedHeroId) || heroes[0];
  }, [heroes, selectedHeroId]);

  if (!isOpen) return null;

  const handleCreateTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagLabel.trim()) return;
    onCreateTag(newTagCategory, newTagLabel.trim(), newTagEmoji, newTagColorScheme);
    setNewTagLabel("");
    alert("New custom tag created successfully!");
  };

  // Helper to toggle a tag on the currently selected hero
  const toggleHeroTag = (category: "tags" | "strategy", tagId: string) => {
    if (!selectedHero) return;
    const currentList = selectedHero[category] as string[];
    const newList = currentList.includes(tagId)
      ? currentList.filter(t => t !== tagId)
      : [...currentList, tagId];
    onUpdateHero(selectedHero.id, { [category]: newList });
  };

  // Helper to toggle counter relationship
  const toggleCounterRelation = (relation: "counters" | "counteredBy", targetHeroId: string) => {
    if (!selectedHero) return;
    const currentList = selectedHero[relation] || [];
    const newList = currentList.includes(targetHeroId)
      ? currentList.filter(id => id !== targetHeroId)
      : [...currentList, targetHeroId];
    onUpdateHero(selectedHero.id, { [relation]: newList });
  };

  // Copy customized data
  const handleCopyJSON = () => {
    // Generate simplified customized state mapping
    const customizedMap: Record<string, any> = {};
    heroes.forEach(h => {
      customizedMap[h.id] = {
        tags: h.tags,
        strategy: h.strategy,
        cc: h.cc,
        timing: h.timing,
        counters: h.counters,
        counteredBy: h.counteredBy,
      };
    });

    const output = {
      custom_tags: customTags,
      hero_customizations: customizedMap,
    };

    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCounterCandidates = heroes.filter(
    h => h.id !== selectedHeroId && h.name.toLowerCase().includes(counterSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-850/50 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Hero Pool & Tags Customizer
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Customize hero tags, add new colors, and configure matchup counters.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Split Scroll Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          
          {/* Left Column - Custom Tags Creator & General Config */}
          <div className="space-y-6">
            
            {/* Tag Creator */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800/80">
              <h3 className="text-xs font-bold text-neutral-450 dark:text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-500" />
                Create Custom Tag
              </h3>
              
              <form onSubmit={handleCreateTagSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase">Tag Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Flex Core"
                      value={newTagLabel}
                      onChange={e => setNewTagLabel(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase">Emoji</label>
                    <input
                      type="text"
                      placeholder="e.g. 👑"
                      value={newTagEmoji}
                      onChange={e => setNewTagEmoji(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase">Category</label>
                    <select
                      value={newTagCategory}
                      onChange={e => setNewTagCategory(e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="playstyle">Playstyle Tag</option>
                      <option value="strategy">Strategy Tag</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-semibold uppercase">Color Theme</label>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {COLOR_SCHEMES.map(sc => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setNewTagColorScheme(sc.id)}
                          className={`w-5 h-5 rounded-full border transition-all ${sc.bg} ${newTagColorScheme === sc.id ? `ring-2 ring-offset-2 dark:ring-offset-neutral-900 ${sc.ring}` : "border-neutral-350"}`}
                          title={sc.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Create Custom Tag
                </button>
              </form>
            </div>

            {/* Manage Custom Tags */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800/80">
              <h3 className="text-xs font-bold text-neutral-450 dark:text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Manage Custom Tags
              </h3>
              {customTags.length > 0 ? (
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  {customTags.map(tag => {
                    const scheme = COLOR_SCHEMES.find(s => s.id === tag.colorScheme) || COLOR_SCHEMES[0];
                    return (
                      <div key={tag.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${scheme.bg} ${scheme.color}`}>
                          {tag.emoji} {tag.label}
                          <span className="text-[9px] opacity-60 font-normal ml-1">({tag.category})</span>
                        </span>
                        <button
                          onClick={() => onDeleteTag(tag.id)}
                          className="p-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-650 dark:text-red-400 transition-colors"
                          title={`Delete tag "${tag.label}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">No custom tags yet. Create one above!</p>
                </div>
              )}
            </div>

            {/* Quick Stats & Exporter */}
            <div className="bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-bold text-neutral-450 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-purple-500" />
                Data Exporter
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Changes are automatically saved in local browser storage. If you want to permanently update the database, copy the customized JSON config and ask your assistant to hardcode it!
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={handleCopyJSON}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      Copied JSON Config!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy JSON Override
                    </>
                  )}
                </button>

                <button
                  onClick={onResetAll}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/25 text-xs font-semibold text-red-600 dark:text-red-400 transition-all"
                  title="Reset all tags and counters to factory defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Defaults
                </button>
              </div>
            </div>

          </div>

          {/* Right Column - Hero Tag & Counters Editor */}
          <div className="space-y-5">
            
            {/* Hero Select */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Select Hero to Edit</label>
              <select
                value={selectedHeroId}
                onChange={e => setSelectedHeroId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-550/10 transition-all shadow-sm"
              >
                {heroes.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {selectedHero && (
              <div className="space-y-4">
                
                {/* Playstyle Tag Toggles */}
                <div>
                  <label className="text-[10px] text-neutral-450 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-2">Playstyle Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allTagsByCategory("playstyle").map(tag => {
                      const isActive = selectedHero.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleHeroTag("tags", tag.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium flex items-center gap-1 transition-all
                            ${isActive ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500/50 shadow-sm scale-110 ring-2 ring-indigo-400/50 dark:ring-indigo-500/40 ring-offset-1 dark:ring-offset-neutral-900" : "bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"}`}
                        >
                          {tag.emoji} {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Strategy Tag Toggles */}
                <div>
                  <label className="text-[10px] text-neutral-450 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-2">Strategy Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allTagsByCategory("strategy").map(tag => {
                      const isActive = selectedHero.strategy.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleHeroTag("strategy", tag.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium flex items-center gap-1 transition-all
                            ${isActive ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500/50 shadow-sm scale-110 ring-2 ring-indigo-400/50 dark:ring-indigo-500/40 ring-offset-1 dark:ring-offset-neutral-900" : "bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"}`}
                        >
                          {tag.emoji} {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Matchup Counters Selector */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-neutral-450 dark:text-neutral-400 font-bold uppercase tracking-wider block">Matchup Counters</label>
                    
                    {/* Tiny Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search matchups..."
                        value={counterSearch}
                        onChange={e => setCounterSearch(e.target.value)}
                        className="pl-7 pr-3 py-1 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-150 focus:outline-none focus:border-indigo-500 w-40"
                      />
                    </div>
                  </div>

                  {/* Counters grid list */}
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {filteredCounterCandidates.map(candidate => {
                      const isStrongAgainst = selectedHero.counters?.includes(candidate.id);
                      const isWeakAgainst = selectedHero.counteredBy?.includes(candidate.id);

                      return (
                        <div key={candidate.id} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/35 border border-neutral-100 dark:border-neutral-800/60">
                          
                          {/* Left: Avatar + Name */}
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200">
                              <img src={candidate.image} alt={candidate.name} className="w-full h-full object-cover object-top" />
                            </div>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{candidate.name}</span>
                          </div>

                          {/* Right: Toggle Matchup Relation */}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => toggleCounterRelation("counters", candidate.id)}
                              className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all
                                ${isStrongAgainst ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/30" : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-emerald-300"}`}
                              title={`Click to mark ${selectedHero.name} as STRONG counter to ${candidate.name}`}
                            >
                              ⚔️ Strong
                            </button>

                            <button
                              onClick={() => toggleCounterRelation("counteredBy", candidate.id)}
                              className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg border transition-all
                                ${isWeakAgainst ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-500/30" : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-rose-300"}`}
                              title={`Click to mark ${selectedHero.name} as WEAK / countered by ${candidate.name}`}
                            >
                              🛡️ Weak
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────
export default function HeroesPage() {
  const [search, setSearch] = useState("");
  const [selectedPlaystyle, setSelectedPlaystyle] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedCC, setSelectedCC] = useState<CCTag | null>(null);
  const [selectedTiming, setSelectedTiming] = useState<TimingTag | null>(null);
  const [selectedRole, setSelectedRole] = useState<HeroRole | null>(null);
  
  // Custom Overrides State
  const [customTags, setCustomTags] = useState<CustomTag[]>([]);
  const [heroes, setHeroes] = useState<ExtendedHeroData[]>([]);

  // Modals visibility
  const [selectedHero, setSelectedHero] = useState<ExtendedHeroData | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  // 1. Initial Load of Custom Tags & Hero Overrides & Live API Enrichment
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      const savedTags = localStorage.getItem("sentinel_custom_tags");
      const parsedTags: CustomTag[] = savedTags ? JSON.parse(savedTags) : [];
      if (!cancelled) setCustomTags(parsedTags);

      const savedHeroes = localStorage.getItem("sentinel_custom_heroes");
      const parsedHeroes = savedHeroes ? JSON.parse(savedHeroes) : {};

      // 1. Base merge of local custom data
      let merged = ALL_HEROES.map(hero => {
        const custom = parsedHeroes[hero.id] || {};
        return {
          ...hero,
          tags: custom.tags ? custom.tags : hero.tags,
          strategy: custom.strategy ? custom.strategy : hero.strategy,
          cc: custom.cc ? custom.cc : hero.cc,
          timing: custom.timing ? custom.timing : hero.timing,
          counters: custom.counters || [],
          counteredBy: custom.counteredBy || [],
        };
      });

      if (!cancelled) setHeroes(merged);

      // 2. Enrich with live MLBB API data
      try {
        const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";
        const res = await fetch(`${API_URL}/api/mlbb/heroes`);
        if (res.ok) {
          const apiData = await res.json();
          if (apiData?.data?.records) {
            // Map mlbbId -> local id
            const idMap: Record<number, string> = {};
            ALL_HEROES.forEach(h => { if (h.mlbbId) idMap[h.mlbbId] = h.id; });

            const enriched = merged.map(hero => {
              if (!hero.mlbbId) return hero;
              
              const apiRecord = apiData.data.records.find((r: any) => r.data?.hero_id === hero.mlbbId);
              if (!apiRecord) return hero;

              // Use official CDN head image
              const newImage = apiRecord.data?.hero?.data?.head || hero.image;

              const custom = parsedHeroes[hero.id] || {};
              let counters = hero.counters;
              let counteredBy = hero.counteredBy;

              // Inherit counters from API if not locally overridden
              if (!custom.counters || custom.counters.length === 0) {
                const strongIds = apiRecord.data?.relation?.strong?.target_hero_id || [];
                counters = strongIds.map((id: number) => idMap[id]).filter(Boolean);
              }
              if (!custom.counteredBy || custom.counteredBy.length === 0) {
                const weakIds = apiRecord.data?.relation?.weak?.target_hero_id || [];
                counteredBy = weakIds.map((id: number) => idMap[id]).filter(Boolean);
              }

              return { ...hero, image: newImage, counters, counteredBy };
            });

            if (!cancelled) setHeroes(enriched);
          }
        }
      } catch (err) {
        console.error("Failed to enrich heroes from MLBB API", err);
      }
    };
    
    loadData();
    return () => { cancelled = true; };
  }, []);

  // 2. Dynamic Configurations based on Custom Created Tags
  const playstyleConfigs = useMemo(() => {
    const base = { ...PLAYSTYLE_CONFIG };
    customTags
      .filter(t => t.category === "playstyle")
      .forEach(t => {
        const scheme = COLOR_SCHEMES.find(s => s.id === t.colorScheme) || COLOR_SCHEMES[0];
        base[t.id] = { label: t.label, emoji: t.emoji, color: scheme.color, bg: scheme.bg };
      });
    return base;
  }, [customTags]);

  const strategyConfigs = useMemo(() => {
    const base = { ...STRATEGY_CONFIG };
    customTags
      .filter(t => t.category === "strategy")
      .forEach(t => {
        const scheme = COLOR_SCHEMES.find(s => s.id === t.colorScheme) || COLOR_SCHEMES[0];
        base[t.id] = { label: t.label, emoji: t.emoji, color: scheme.color, bg: scheme.bg };
      });
    return base;
  }, [customTags]);

  const allTagsByCategory = (cat: "playstyle" | "strategy") => {
    const defaults = cat === "playstyle" ? PLAYSTYLE_CONFIG : STRATEGY_CONFIG;
    const list = Object.entries(defaults).map(([id, cfg]) => ({ id, label: cfg.label, emoji: cfg.emoji }));
    customTags.filter(t => t.category === cat).forEach(t => {
      list.push({ id: t.id, label: t.label, emoji: t.emoji });
    });
    return list;
  };

  const allHeroesMap = useMemo(() => {
    const map: Record<string, ExtendedHeroData> = {};
    heroes.forEach(h => { map[h.id] = h; });
    return map;
  }, [heroes]);

  // 3. Create a Custom Tag Handler
  const handleCreateTag = (category: "playstyle" | "strategy", label: string, emoji: string, colorScheme: string) => {
    const newTagId = label.toLowerCase().replace(/\s+/g, "-");
    
    // Check if tag already exists (either custom or static default)
    const isDuplicate = customTags.some(t => t.id === newTagId) || 
      (category === "playstyle" && newTagId in PLAYSTYLE_CONFIG) || 
      (category === "strategy" && newTagId in STRATEGY_CONFIG);
      
    if (isDuplicate) {
      alert("A tag with this name already exists!");
      return;
    }

    const newTag: CustomTag = { id: newTagId, category, label, emoji, colorScheme };
    const updatedTags = [...customTags, newTag];
    setCustomTags(updatedTags);
    localStorage.setItem("sentinel_custom_tags", JSON.stringify(updatedTags));
  };

  // 3b. Delete Custom Tag Handler
  const handleDeleteTag = (tagId: string) => {
    if (!confirm("Are you sure you want to delete this custom tag? It will be removed from all heroes using it.")) return;

    // Reset active page filters if they filter by this deleted tag
    if (selectedPlaystyle === tagId) setSelectedPlaystyle(null);
    if (selectedStrategy === tagId) setSelectedStrategy(null);

    // Remove from customTags array
    const updatedTags = customTags.filter(t => t.id !== tagId);
    setCustomTags(updatedTags);
    localStorage.setItem("sentinel_custom_tags", JSON.stringify(updatedTags));

    // Remove from heroes' lists
    const updatedHeroes = heroes.map(h => {
      const hasPlaystyleTag = h.tags.includes(tagId);
      const hasStrategyTag = h.strategy.includes(tagId);
      
      if (hasPlaystyleTag || hasStrategyTag) {
        const newTags = h.tags.filter(t => t !== tagId);
        const newStrategy = h.strategy.filter(s => s !== tagId);
        
        // Save in LocalStorage hero overrides
        const savedHeroes = localStorage.getItem("sentinel_custom_heroes");
        const parsed = savedHeroes ? JSON.parse(savedHeroes) : {};
        parsed[h.id] = {
          ...parsed[h.id],
          tags: newTags,
          strategy: newStrategy,
        };
        localStorage.setItem("sentinel_custom_heroes", JSON.stringify(parsed));

        return {
          ...h,
          tags: newTags,
          strategy: newStrategy,
        };
      }
      return h;
    });

    setHeroes(updatedHeroes);
  };

  // 4. Update Hero Properties Handler
  const handleUpdateHero = (heroId: string, updates: Partial<ExtendedHeroData>) => {
    const updatedHeroes = heroes.map(h => {
      if (h.id === heroId) {
        const fullUpdate = { ...h, ...updates };
        
        // Save in LocalStorage
        const savedHeroes = localStorage.getItem("sentinel_custom_heroes");
        const parsed = savedHeroes ? JSON.parse(savedHeroes) : {};
        parsed[heroId] = {
          tags: fullUpdate.tags,
          strategy: fullUpdate.strategy,
          cc: fullUpdate.cc,
          timing: fullUpdate.timing,
          counters: fullUpdate.counters,
          counteredBy: fullUpdate.counteredBy,
        };
        localStorage.setItem("sentinel_custom_heroes", JSON.stringify(parsed));

        // Sync detail modal if active
        if (selectedHero && selectedHero.id === heroId) {
          setSelectedHero(fullUpdate);
        }

        return fullUpdate;
      }
      return h;
    });

    setHeroes(updatedHeroes);
  };

  // 5. Reset All Handler
  const handleResetAll = () => {
    if (confirm("Are you sure you want to reset all custom tags and hero counter relationships to default? This cannot be undone.")) {
      localStorage.removeItem("sentinel_custom_tags");
      localStorage.removeItem("sentinel_custom_heroes");
      setCustomTags([]);
      
      const defaulted = ALL_HEROES.map(hero => ({
        ...hero,
        tags: hero.tags,
        strategy: hero.strategy,
        counters: [],
        counteredBy: [],
      }));
      setHeroes(defaulted);
      setShowEditor(false);
      setSelectedHero(null);
    }
  };

  const toggleFilter = <T,>(current: T | null, value: T, set: (v: T | null) => void) => {
    set(current === value ? null : value);
  };

  const filtered = useMemo(() => {
    return heroes.filter(h => {
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedPlaystyle && !h.tags.includes(selectedPlaystyle)) return false;
      if (selectedStrategy && !h.strategy.includes(selectedStrategy)) return false;
      if (selectedCC && h.cc !== selectedCC) return false;
      if (selectedTiming && !h.timing.includes(selectedTiming)) return false;
      if (selectedRole && !h.role.includes(selectedRole)) return false;
      return true;
    });
  }, [heroes, search, selectedPlaystyle, selectedStrategy, selectedCC, selectedTiming, selectedRole]);

  const hasFilter = selectedPlaystyle || selectedStrategy || selectedCC || selectedTiming || selectedRole;

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-650 dark:from-teal-400 dark:to-indigo-400">
            Hero Pool
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">{filtered.length} heroes {hasFilter ? "(filtered)" : "available"}</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowEditor(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            Edit Pool & Tags
          </button>
          
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all shadow-sm"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search hero by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-750 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-550/10 transition-all text-sm shadow-sm"
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
                  {Object.entries(playstyleConfigs).map(([key, cfg]) => (
                    <FilterBtn key={key} value={key} active={selectedPlaystyle === key} {...cfg} onClick={v => toggleFilter(selectedPlaystyle, v, setSelectedPlaystyle)} />
                  ))}
                </div>
              </div>

              {/* Strategy */}
              <div>
                <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Strategy</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(strategyConfigs).map(([key, cfg]) => (
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
                        ${selectedRole === role ? ROLE_COLORS[role] + " scale-105 shadow-sm" : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-605 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {hasFilter && (
                <button
                  onClick={() => {
                    setSelectedPlaystyle(null);
                    setSelectedStrategy(null);
                    setSelectedCC(null);
                    setSelectedTiming(null);
                    setSelectedRole(null);
                  }}
                  className="text-xs text-rose-500 dark:text-rose-400 font-semibold underline transition-colors"
                >
                  Clear all active filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-neutral-500">
          <p className="text-4xl mb-3 animate-bounce">🔍</p>
          <p className="font-bold">No heroes found</p>
          <p className="text-sm text-neutral-505">Try adjusting your filters or search keywords</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(hero => (
              <HeroCard
                key={hero.id}
                hero={hero}
                onClick={() => setSelectedHero(hero)}
                playstyleConfigs={playstyleConfigs}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedHero && (
          <HeroModal
            hero={selectedHero}
            onClose={() => setSelectedHero(null)}
            playstyleConfigs={playstyleConfigs}
            strategyConfigs={strategyConfigs}
            allHeroesMap={allHeroesMap}
            onHeroSelect={setSelectedHero}
          />
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <EditorModal
            isOpen={showEditor}
            onClose={() => setShowEditor(false)}
            heroes={heroes}
            customTags={customTags}
            onCreateTag={handleCreateTag}
            onDeleteTag={handleDeleteTag}
            onUpdateHero={handleUpdateHero}
            onResetAll={handleResetAll}
            allTagsByCategory={allTagsByCategory}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
