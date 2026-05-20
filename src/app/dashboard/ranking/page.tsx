"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Crown,
  Search,
  Trophy,
  Gamepad2,
  Sparkles,
  Users,
  Target,
  ChevronRight,
  TrendingUp,
  X,
} from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

// ─── Leaderboard Types ──────────────────────────────────────────────────────
interface PlayerRankData {
  name: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  uniqueHeroesCount: number;
  uniqueHeroes: string[];
  avgKda: string;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
}

interface HeroRankData {
  name: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  uniquePlayersCount: number;
  avgKda: string;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
}

export default function RankingsPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "heroes">("players");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_URL}/api/games`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGames(data.games || []);
        }
      } catch (err) {
        console.error("Failed to load rankings data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Process Player Stats ──────────────────────────────────────────────────
  const playersData = useMemo(() => {
    const map: Record<
      string,
      {
        wins: number;
        games: number;
        kills: number;
        deaths: number;
        assists: number;
        heroes: Set<string>;
      }
    > = {};

    games.forEach((g) => {
      const isWin = g.result?.toLowerCase() === "win";
      (g.players || []).forEach((p: any) => {
        const name = p.player_name?.trim();
        const hero = p.hero_name?.trim();
        if (!name) return;

        if (!map[name]) {
          map[name] = { wins: 0, games: 0, kills: 0, deaths: 0, assists: 0, heroes: new Set() };
        }

        map[name].games++;
        if (isWin) map[name].wins++;
        if (p.kills) map[name].kills += p.kills;
        if (p.deaths) map[name].deaths += p.deaths;
        if (p.assists) map[name].assists += p.assists;
        if (hero) map[name].heroes.add(hero);
      });
    });

    return Object.entries(map).map(([name, s]) => {
      const losses = s.games - s.wins;
      const winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
      const kda = s.deaths > 0 ? ((s.kills + s.assists) / s.deaths).toFixed(2) : (s.kills + s.assists).toFixed(2);

      return {
        name,
        games: s.games,
        wins: s.wins,
        losses,
        winRate,
        uniqueHeroesCount: s.heroes.size,
        uniqueHeroes: Array.from(s.heroes),
        avgKda: kda,
        totalKills: s.kills,
        totalDeaths: s.deaths,
        totalAssists: s.assists,
      };
    });
  }, [games]);

  // ─── Process Hero Stats ────────────────────────────────────────────────────
  const heroesData = useMemo(() => {
    const map: Record<
      string,
      {
        wins: number;
        games: number;
        kills: number;
        deaths: number;
        assists: number;
        players: Set<string>;
      }
    > = {};

    games.forEach((g) => {
      const isWin = g.result?.toLowerCase() === "win";
      (g.players || []).forEach((p: any) => {
        const hero = p.hero_name?.trim();
        const player = p.player_name?.trim();
        if (!hero) return;

        if (!map[hero]) {
          map[hero] = { wins: 0, games: 0, kills: 0, deaths: 0, assists: 0, players: new Set() };
        }

        map[hero].games++;
        if (isWin) map[hero].wins++;
        if (p.kills) map[hero].kills += p.kills;
        if (p.deaths) map[hero].deaths += p.deaths;
        if (p.assists) map[hero].assists += p.assists;
        if (player) map[hero].players.add(player);
      });
    });

    return Object.entries(map).map(([name, s]) => {
      const losses = s.games - s.wins;
      const winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
      const kda = s.deaths > 0 ? ((s.kills + s.assists) / s.deaths).toFixed(2) : (s.kills + s.assists).toFixed(2);

      return {
        name,
        games: s.games,
        wins: s.wins,
        losses,
        winRate,
        uniquePlayersCount: s.players.size,
        avgKda: kda,
        totalKills: s.kills,
        totalDeaths: s.deaths,
        totalAssists: s.assists,
      };
    });
  }, [games]);

  // ─── Find Hall of Fame / Accolades 👑 ──────────────────────────────────────
  const awards = useMemo(() => {
    if (playersData.length === 0) return null;

    // Filter players with minimum 3 games for WR accolade to prevent 1-game bias
    const qualifiedPlayersForWR = playersData.filter((p) => p.games >= 3);
    const topWRPlayer =
      qualifiedPlayersForWR.length > 0
        ? [...qualifiedPlayersForWR].sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0]
        : [...playersData].sort((a, b) => b.winRate - a.winRate)[0];

    const topGrinderPlayer = [...playersData].sort((a, b) => b.games - a.games)[0];
    const topVersatilePlayer = [...playersData].sort((a, b) => b.uniqueHeroesCount - a.uniqueHeroesCount)[0];

    // Top Heroes
    const qualifiedHeroesForWR = heroesData.filter((h) => h.games >= 3);
    const topWRHero =
      qualifiedHeroesForWR.length > 0
        ? [...qualifiedHeroesForWR].sort((a, b) => b.winRate - a.winRate)[0]
        : [...heroesData].sort((a, b) => b.winRate - a.winRate)[0];

    const topPickedHero = [...heroesData].sort((a, b) => b.games - a.games)[0];

    return {
      topWRPlayer,
      topGrinderPlayer,
      topVersatilePlayer,
      topWRHero,
      topPickedHero,
    };
  }, [playersData, heroesData]);

  // ─── Filtered Lists ────────────────────────────────────────────────────────
  const filteredPlayers = useMemo(() => {
    return playersData
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.winRate - a.winRate || b.games - a.games);
  }, [playersData, searchQuery]);

  const filteredHeroes = useMemo(() => {
    return heroesData
      .filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.winRate - a.winRate || b.games - a.games);
  }, [heroesData, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-450 via-teal-400 to-indigo-500 flex items-center gap-2">
            🏆 Hall of Fame & Rankings
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Who is the ultimate carry? Real-time rankings computed from match logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl gap-1 shrink-0">
          <button
            onClick={() => {
              setActiveTab("players");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "players"
                ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Player Standings
          </button>
          <button
            onClick={() => {
              setActiveTab("heroes");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "heroes"
                ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Hero Standings
          </button>
        </div>
      </div>

      {/* Hall of Fame / Accolades Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-850 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : awards ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Highest Win Rate Card */}
          <div className="relative bg-gradient-to-tr from-amber-500/10 via-amber-400/5 to-transparent dark:from-amber-550/10 border border-amber-250 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="absolute -right-8 -top-8 text-amber-500/10 group-hover:scale-110 transition-transform duration-300">
              <Crown className="w-32 h-32" />
            </div>
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  👑 Apex Carry
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">min 3 games</span>
              </div>
              <h3 className="text-2xl font-black text-neutral-800 dark:text-white mt-3 truncate">
                {activeTab === "players" ? awards.topWRPlayer?.name : awards.topWRHero?.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Highest Win Rate Award
              </p>
            </div>
            <div className="flex justify-between items-baseline mt-4 border-t border-amber-500/10 pt-3 z-10">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {activeTab === "players" ? awards.topWRPlayer?.winRate : awards.topWRHero?.winRate}%
              </span>
              <span className="text-[10px] font-semibold text-neutral-405">
                {activeTab === "players"
                  ? `${awards.topWRPlayer?.wins}W - ${awards.topWRPlayer?.losses}L`
                  : `${awards.topWRHero?.wins}W - ${awards.topWRHero?.losses}L`}
              </span>
            </div>
          </div>

          {/* Grinder / Most Picked Card */}
          <div className="relative bg-gradient-to-tr from-indigo-500/10 via-indigo-400/5 to-transparent dark:from-indigo-550/10 border border-indigo-250 dark:border-indigo-500/30 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="absolute -right-8 -top-8 text-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
              <Gamepad2 className="w-32 h-32" />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {activeTab === "players" ? "🔥 Ultimate Grinder" : "🔥 Most Contested"}
              </span>
              <h3 className="text-2xl font-black text-neutral-800 dark:text-white mt-3 truncate">
                {activeTab === "players" ? awards.topGrinderPlayer?.name : awards.topPickedHero?.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {activeTab === "players" ? "Most Matches Played" : "Most Played Hero"}
              </p>
            </div>
            <div className="flex justify-between items-baseline mt-4 border-t border-indigo-500/10 pt-3 z-10">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {activeTab === "players" ? awards.topGrinderPlayer?.games : awards.topPickedHero?.games}
              </span>
              <span className="text-[10px] font-semibold text-neutral-405">Matches Played</span>
            </div>
          </div>

          {/* Versatility / KDA Card */}
          <div className="relative bg-gradient-to-tr from-purple-500/10 via-purple-400/5 to-transparent dark:from-purple-550/10 border border-purple-250 dark:border-purple-500/30 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group">
            <div className="absolute -right-8 -top-8 text-purple-500/10 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-32 h-32" />
            </div>
            <div>
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {activeTab === "players" ? "🔮 Master of All" : "🎯 Deadly Striker"}
              </span>
              <h3 className="text-2xl font-black text-neutral-800 dark:text-white mt-3 truncate">
                {activeTab === "players" ? awards.topVersatilePlayer?.name : awards.topPickedHero?.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {activeTab === "players" ? "Most Unique Heroes Played" : "Highest Hero Avg KDA"}
              </p>
            </div>
            <div className="flex justify-between items-baseline mt-4 border-t border-purple-500/10 pt-3 z-10">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {activeTab === "players"
                  ? `${awards.topVersatilePlayer?.uniqueHeroesCount} heroes`
                  : awards.topPickedHero?.avgKda}
              </span>
              <span className="text-[10px] font-semibold text-neutral-405">
                {activeTab === "players" ? "Diversity Index" : "Average KDA"}
              </span>
            </div>
          </div>

        </div>
      ) : null}

      {/* Standings Filter Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={
            activeTab === "players"
              ? "Search player in standings..."
              : "Search hero in standings..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-850 dark:text-neutral-100 placeholder-neutral-405 dark:placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-550/10 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-405 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Standings Leaderboard Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {activeTab === "players" ? (
              <motion.table
                key="players-table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full text-sm"
              >
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                    <th className="text-center px-4 py-3.5 font-bold w-16">Rank</th>
                    <th className="text-left px-4 py-3.5 font-bold">Player</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Played</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Wins</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Losses</th>
                    <th className="text-left px-4 py-3.5 font-bold w-48">Win Rate</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Avg KDA</th>
                    <th className="text-center px-4 py-3.5 font-bold w-28">Unique Heroes</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-neutral-400">
                        Analyzing match logs, calculating standings...
                      </td>
                    </tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-neutral-400 italic">
                        No players found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((player, idx) => {
                      const isWRChampion = player.name === awards?.topWRPlayer?.name;
                      const isGrindChampion = player.name === awards?.topGrinderPlayer?.name;
                      const isVersatileChampion = player.name === awards?.topVersatilePlayer?.name;

                      return (
                        <tr
                          key={player.name}
                          className="border-b border-neutral-100 dark:border-neutral-850 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all group"
                        >
                          {/* Rank # */}
                          <td className="px-4 py-4 text-center">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-350 text-neutral-800 font-extrabold text-xs">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-mono text-xs">{idx + 1}</span>
                            )}
                          </td>

                          {/* Player name + accolade icons */}
                          <td className="px-4 py-4 font-bold text-neutral-800 dark:text-neutral-100">
                            <div className="flex items-center gap-2">
                              <span>{player.name}</span>
                                <div className="flex gap-0.5">
                                 {isWRChampion && (
                                   <span title="Win Rate Champion 👑">
                                     <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                                   </span>
                                 )}
                                 {isGrindChampion && (
                                   <span title="Ultimate Grinder">
                                     <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                                   </span>
                                 )}
                                 {isVersatileChampion && (
                                   <span title="Versatile Tactician">
                                     <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                   </span>
                                 )}
                                </div>
                            </div>
                          </td>

                          {/* Played */}
                          <td className="px-4 py-4 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                            {player.games}
                          </td>

                          {/* Wins */}
                          <td className="px-4 py-4 text-center text-emerald-600 font-semibold dark:text-emerald-450">
                            {player.wins}
                          </td>

                          {/* Losses */}
                          <td className="px-4 py-4 text-center text-neutral-400">
                            {player.losses}
                          </td>

                          {/* Win Rate */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 max-w-[120px] h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden relative">
                                <div
                                  className={`h-full rounded-full ${
                                    player.winRate >= 60
                                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                      : player.winRate >= 50
                                      ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                                      : "bg-gradient-to-r from-red-400 to-rose-500"
                                  }`}
                                  style={{ width: `${player.winRate}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-black ${
                                  player.winRate >= 60
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : player.winRate >= 50
                                    ? "text-indigo-600 dark:text-indigo-300"
                                    : "text-red-550 dark:text-rose-450"
                                }`}
                              >
                                {player.winRate}%
                              </span>
                            </div>
                          </td>

                          {/* Avg KDA */}
                          <td className="px-4 py-4 text-center font-semibold">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-750 dark:text-neutral-250 text-xs">
                              {player.avgKda}
                            </span>
                          </td>

                          {/* Unique Heroes count */}
                          <td className="px-4 py-4 text-center">
                            <span
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-help"
                              title={player.uniqueHeroes.join(", ")}
                            >
                              {player.uniqueHeroesCount} heroes
                            </span>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </motion.table>
            ) : (
              <motion.table
                key="heroes-table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full text-sm"
              >
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                    <th className="text-center px-4 py-3.5 font-bold w-16">Rank</th>
                    <th className="text-left px-4 py-3.5 font-bold">Hero</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Games</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Wins</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Losses</th>
                    <th className="text-left px-4 py-3.5 font-bold w-48">Win Rate</th>
                    <th className="text-center px-4 py-3.5 font-bold w-24">Avg KDA</th>
                    <th className="text-center px-4 py-3.5 font-bold w-28">Unique Contenders</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-neutral-400">
                        Analyzing match logs, calculating standings...
                      </td>
                    </tr>
                  ) : filteredHeroes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-neutral-400 italic">
                        No heroes found matching &quot;{searchQuery}&quot;
                      </td>
                    </tr>
                  ) : (
                    filteredHeroes.map((hero, idx) => {
                      const isWRHeroChampion = hero.name === awards?.topWRHero?.name;
                      const isPickedHeroChampion = hero.name === awards?.topPickedHero?.name;

                      return (
                        <tr
                          key={hero.name}
                          className="border-b border-neutral-100 dark:border-neutral-850 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all group"
                        >
                          {/* Rank # */}
                          <td className="px-4 py-4 text-center">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-355 bg-slate-300 text-neutral-800 font-extrabold text-xs">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-mono text-xs">{idx + 1}</span>
                            )}
                          </td>

                          {/* Hero name + accolade icons */}
                          <td className="px-4 py-4 font-bold text-neutral-850 dark:text-neutral-100">
                            <div className="flex items-center gap-2">
                              <span>{hero.name}</span>
                                <div className="flex gap-0.5">
                                 {isWRHeroChampion && (
                                   <span title="Win Rate Champion Hero 👑">
                                     <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                                   </span>
                                 )}
                                 {isPickedHeroChampion && (
                                   <span title="Most picked hero">
                                     <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                                   </span>
                                 )}
                                </div>
                            </div>
                          </td>

                          {/* Played */}
                          <td className="px-4 py-4 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                            {hero.games}
                          </td>

                          {/* Wins */}
                          <td className="px-4 py-4 text-center text-emerald-600 font-semibold dark:text-emerald-450">
                            {hero.wins}
                          </td>

                          {/* Losses */}
                          <td className="px-4 py-4 text-center text-neutral-400">
                            {hero.losses}
                          </td>

                          {/* Win Rate */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 max-w-[120px] h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden relative">
                                <div
                                  className={`h-full rounded-full ${
                                    hero.winRate >= 60
                                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                      : hero.winRate >= 50
                                      ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                                      : "bg-gradient-to-r from-red-400 to-rose-500"
                                  }`}
                                  style={{ width: `${hero.winRate}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-black ${
                                  hero.winRate >= 60
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : hero.winRate >= 50
                                    ? "text-indigo-600 dark:text-indigo-300"
                                    : "text-red-550 dark:text-rose-455"
                                }`}
                              >
                                {hero.winRate}%
                              </span>
                            </div>
                          </td>

                          {/* Avg KDA */}
                          <td className="px-4 py-4 text-center font-semibold">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-750 dark:text-neutral-250 text-xs">
                              {hero.avgKda}
                            </span>
                          </td>

                          {/* Unique contenders */}
                          <td className="px-4 py-4 text-center text-neutral-500 font-medium">
                            {hero.uniquePlayersCount} players
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </motion.table>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
