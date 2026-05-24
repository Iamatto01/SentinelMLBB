"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Search,
  X,
  Crown,
  Shield,
  Ban,
  Eye,
  ChevronDown,
  Zap,
  Filter,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

// ─── Types ──────────────────────────────────────────────────────────────────
interface HeroRankRecord {
  hero_id: number;
  hero_name: string;
  hero_head: string;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
}

type RankTier = "all" | "epic" | "legend" | "mythic" | "honor" | "glory";
type TimeWindow = "1" | "3" | "7" | "15" | "30";
type SortField = "win_rate" | "pick_rate" | "ban_rate";
type ViewMode = "tier" | "table";

const RANK_TIERS: { value: RankTier; label: string; emoji: string }[] = [
  { value: "all", label: "All Ranks", emoji: "🌐" },
  { value: "epic", label: "Epic", emoji: "💜" },
  { value: "legend", label: "Legend", emoji: "💛" },
  { value: "mythic", label: "Mythic", emoji: "❤️" },
  { value: "honor", label: "Mythical Honor", emoji: "🔥" },
  { value: "glory", label: "Mythical Glory", emoji: "👑" },
];

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "1", label: "24h" },
  { value: "3", label: "3 Days" },
  { value: "7", label: "7 Days" },
  { value: "15", label: "15 Days" },
  { value: "30", label: "30 Days" },
];

function getTier(winRate: number): { tier: string; color: string; bg: string; border: string; glow: string } {
  if (winRate >= 0.54) return { tier: "S+", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-amber-500/20" };
  if (winRate >= 0.52) return { tier: "S", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", glow: "shadow-orange-500/20" };
  if (winRate >= 0.50) return { tier: "A", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" };
  if (winRate >= 0.48) return { tier: "B", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", glow: "shadow-blue-500/20" };
  if (winRate >= 0.46) return { tier: "C", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-purple-500/20" };
  return { tier: "D", color: "text-neutral-500", bg: "bg-neutral-500/10", border: "border-neutral-500/30", glow: "shadow-neutral-500/20" };
}

// ─── Hero Card ──────────────────────────────────────────────────────────────
function MetaHeroCard({ hero, rank }: { hero: HeroRankRecord; rank: number }) {
  const [imgErr, setImgErr] = useState(false);
  const tierInfo = getTier(hero.win_rate);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-white dark:bg-neutral-900 border ${tierInfo.border} rounded-2xl overflow-hidden hover:shadow-lg ${tierInfo.glow} transition-all group`}
    >
      {/* Rank Badge */}
      {rank <= 3 && (
        <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ${
          rank === 1 ? "bg-amber-500 text-white" : rank === 2 ? "bg-slate-300 text-neutral-800" : "bg-amber-700 text-white"
        }`}>
          {rank}
        </div>
      )}

      {/* Tier Badge */}
      <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-black ${tierInfo.bg} ${tierInfo.color} border ${tierInfo.border}`}>
        {tierInfo.tier}
      </div>

      {/* Hero Image */}
      <div className="h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
        {!imgErr && hero.hero_head ? (
          <img
            src={hero.hero_head}
            alt={hero.hero_name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-black text-neutral-400 dark:text-neutral-600">
            {hero.hero_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="font-bold text-xs text-neutral-800 dark:text-neutral-100 truncate">{hero.hero_name}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <p className="text-[9px] text-neutral-400 font-semibold uppercase">Win</p>
            <p className={`text-xs font-black ${hero.win_rate >= 0.50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-rose-400"}`}>
              {(hero.win_rate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-neutral-400 font-semibold uppercase">Pick</p>
            <p className="text-xs font-black text-blue-600 dark:text-blue-400">{(hero.pick_rate * 100).toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-neutral-400 font-semibold uppercase">Ban</p>
            <p className="text-xs font-black text-rose-600 dark:text-rose-400">{(hero.ban_rate * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Meta Page ─────────────────────────────────────────────────────────
export default function MetaPage() {
  const [heroes, setHeroes] = useState<HeroRankRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankTier, setRankTier] = useState<RankTier>("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7");
  const [sortField, setSortField] = useState<SortField>("win_rate");
  const [viewMode, setViewMode] = useState<ViewMode>("tier");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/mlbb/heroes/rank?days=${timeWindow}&rank=${rankTier}&sort_field=${sortField}&sort_order=desc`
        );
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();

        if (data?.data?.records) {
          const parsed: HeroRankRecord[] = data.data.records.map((r: any) => ({
            hero_id: r.data?.main_heroid || 0,
            hero_name: r.data?.main_hero?.data?.name || "Unknown",
            hero_head: r.data?.main_hero?.data?.head || "",
            win_rate: r.data?.main_hero_win_rate || 0,
            pick_rate: r.data?.main_hero_appearance_rate || 0,
            ban_rate: r.data?.main_hero_ban_rate || 0,
          }));
          if (!cancelled) setHeroes(parsed);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to fetch meta data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [rankTier, timeWindow, sortField]);

  // Filtered + sorted
  const filteredHeroes = useMemo(() => {
    let result = heroes;
    if (search) {
      result = result.filter(h => h.hero_name.toLowerCase().includes(search.toLowerCase()));
    }
    // Already sorted by API but re-sort by selected field
    return [...result].sort((a, b) => {
      const field = sortField;
      return (b[field] as number) - (a[field] as number);
    });
  }, [heroes, search, sortField]);

  // Tier grouped
  const tierGroups = useMemo(() => {
    const groups: Record<string, HeroRankRecord[]> = { "S+": [], "S": [], "A": [], "B": [], "C": [], "D": [] };
    filteredHeroes.forEach(h => {
      const t = getTier(h.win_rate).tier;
      if (groups[t]) groups[t].push(h);
    });
    return groups;
  }, [filteredHeroes]);

  // Top stats
  const topStats = useMemo(() => {
    if (heroes.length === 0) return null;
    const byWR = [...heroes].sort((a, b) => b.win_rate - a.win_rate);
    const byPick = [...heroes].sort((a, b) => b.pick_rate - a.pick_rate);
    const byBan = [...heroes].sort((a, b) => b.ban_rate - a.ban_rate);
    return {
      topWR: byWR[0],
      topPick: byPick[0],
      topBan: byBan[0],
      totalHeroes: heroes.length,
    };
  }, [heroes]);

  if (!mounted) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 flex items-center gap-2">
            📊 Global Meta Tier List
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Live hero statistics from MLBB official data • Updated hourly
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl gap-1 shrink-0">
          <button
            onClick={() => setViewMode("tier")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              viewMode === "tier"
                ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <Crown className="w-4 h-4" /> Tier List
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              viewMode === "table"
                ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Table View
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {topStats && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Total Heroes */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Heroes Tracked</span>
            </div>
            <p className="text-2xl font-black text-neutral-800 dark:text-white">{topStats.totalHeroes}</p>
          </div>

          {/* Highest WR */}
          <div className="bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Top Win Rate</span>
            </div>
            <div className="flex items-center gap-2">
              {topStats.topWR.hero_head && (
                <img src={topStats.topWR.hero_head} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
              )}
              <div>
                <p className="text-sm font-black text-neutral-800 dark:text-white">{topStats.topWR.hero_name}</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{(topStats.topWR.win_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Most Picked */}
          <div className="bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Most Picked</span>
            </div>
            <div className="flex items-center gap-2">
              {topStats.topPick.hero_head && (
                <img src={topStats.topPick.hero_head} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
              )}
              <div>
                <p className="text-sm font-black text-neutral-800 dark:text-white">{topStats.topPick.hero_name}</p>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{(topStats.topPick.pick_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Most Banned */}
          <div className="bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Most Banned</span>
            </div>
            <div className="flex items-center gap-2">
              {topStats.topBan.hero_head && (
                <img src={topStats.topBan.hero_head} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
              )}
              <div>
                <p className="text-sm font-black text-neutral-800 dark:text-white">{topStats.topBan.hero_name}</p>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{(topStats.topBan.ban_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:border-indigo-500 transition-all shadow-sm md:hidden"
          >
            <Filter className="w-4 h-4" /> Filters <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {/* Sort Field */}
          <div className="hidden md:flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl gap-0.5">
            {[
              { value: "win_rate" as SortField, label: "Win Rate", icon: <TrendingUp className="w-3 h-3" /> },
              { value: "pick_rate" as SortField, label: "Pick Rate", icon: <Eye className="w-3 h-3" /> },
              { value: "ban_rate" as SortField, label: "Ban Rate", icon: <Shield className="w-3 h-3" /> },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setSortField(s.value)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  sortField === s.value
                    ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {(showFilters || true) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-3 overflow-hidden"
            >
              {/* Rank Tier */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider self-center mr-1">Rank:</span>
                {RANK_TIERS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRankTier(r.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      rankTier === r.value
                        ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500/40 shadow-sm"
                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                    }`}
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>

              {/* Time Window */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider self-center mr-1">Period:</span>
                {TIME_WINDOWS.map((tw) => (
                  <button
                    key={tw.value}
                    onClick={() => setTimeWindow(tw.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      timeWindow === tw.value
                        ? "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-500/40 shadow-sm"
                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                    }`}
                  >
                    {tw.label}
                  </button>
                ))}
              </div>

              {/* Sort (mobile) */}
              <div className="flex flex-wrap gap-1.5 md:hidden">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider self-center mr-1">Sort:</span>
                {[
                  { value: "win_rate" as SortField, label: "Win Rate" },
                  { value: "pick_rate" as SortField, label: "Pick Rate" },
                  { value: "ban_rate" as SortField, label: "Ban Rate" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortField(s.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      sortField === s.value
                        ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500/40 shadow-sm"
                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-neutral-500 font-semibold">Fetching live meta data from MLBB servers...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-500/20 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <AnimatePresence mode="wait">
          {viewMode === "tier" ? (
            /* ─── TIER LIST VIEW ─────────────────────────────────────────── */
            <motion.div
              key="tier-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {Object.entries(tierGroups).map(([tier, tierHeroes]) => {
                if (tierHeroes.length === 0) return null;
                const tierInfo = getTier(tier === "S+" ? 0.55 : tier === "S" ? 0.53 : tier === "A" ? 0.51 : tier === "B" ? 0.49 : tier === "C" ? 0.47 : 0.44);
                return (
                  <div key={tier} className="space-y-3">
                    {/* Tier Header */}
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-xl font-black text-lg ${tierInfo.bg} ${tierInfo.color} border ${tierInfo.border}`}>
                        {tier}
                      </div>
                      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      <span className="text-xs text-neutral-400 font-semibold">{tierHeroes.length} heroes</span>
                    </div>

                    {/* Hero Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                      {tierHeroes.map((hero, idx) => (
                        <MetaHeroCard key={hero.hero_id} hero={hero} rank={filteredHeroes.indexOf(hero) + 1} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredHeroes.length === 0 && (
                <div className="text-center py-20 text-neutral-400 text-sm italic">
                  No heroes found matching &quot;{search}&quot;
                </div>
              )}
            </motion.div>
          ) : (
            /* ─── TABLE VIEW ─────────────────────────────────────────────── */
            <motion.div
              key="table-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                      <th className="text-center px-4 py-3.5 font-bold w-14">#</th>
                      <th className="text-center px-2 py-3.5 font-bold w-10">Tier</th>
                      <th className="text-left px-4 py-3.5 font-bold">Hero</th>
                      <th className="text-center px-4 py-3.5 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300" onClick={() => setSortField("win_rate")}>
                        Win Rate {sortField === "win_rate" && "▼"}
                      </th>
                      <th className="text-center px-4 py-3.5 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300" onClick={() => setSortField("pick_rate")}>
                        Pick Rate {sortField === "pick_rate" && "▼"}
                      </th>
                      <th className="text-center px-4 py-3.5 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300" onClick={() => setSortField("ban_rate")}>
                        Ban Rate {sortField === "ban_rate" && "▼"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHeroes.map((hero, idx) => {
                      const tierInfo = getTier(hero.win_rate);
                      return (
                        <tr key={hero.hero_id} className="border-b border-neutral-100 dark:border-neutral-850 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all">
                          <td className="px-4 py-3 text-center">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20">1</span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-neutral-800 font-extrabold text-xs">2</span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-xs">3</span>
                            ) : (
                              <span className="text-neutral-400 font-mono text-xs">{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${tierInfo.bg} ${tierInfo.color} border ${tierInfo.border}`}>
                              {tierInfo.tier}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hero.hero_head ? (
                                <img src={hero.hero_head} alt="" className="w-7 h-7 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-500">
                                  {hero.hero_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-bold text-neutral-800 dark:text-neutral-100">{hero.hero_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-black text-xs ${hero.win_rate >= 0.50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-rose-400"}`}>
                              {(hero.win_rate * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                                  style={{ width: `${Math.min(hero.pick_rate * 100 * 5, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{(hero.pick_rate * 100).toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-red-500"
                                  style={{ width: `${Math.min(hero.ban_rate * 100 * 2, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{(hero.ban_rate * 100).toFixed(2)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredHeroes.length === 0 && (
                <div className="text-center py-20 text-neutral-400 text-sm italic">
                  No heroes found matching &quot;{search}&quot;
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Footer info */}
      <div className="text-center pb-4">
        <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
          Data sourced from MLBB Public Data API (mlbb.rone.dev) • Cached for 1 hour • Not affiliated with Moonton
        </p>
      </div>
    </div>
  );
}
