"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

type GameData = {
  id: number;
  game_num: number;
  date: string;
  mode: string;
  result: string;
  players: { slot: number; player_name: string; hero_name: string }[];
};

/** Generate all k-size combinations from an array */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

export default function CompsPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamSize, setTeamSize] = useState(5);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "total", direction: "desc" });

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  };

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_URL}/api/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setGames(d.games || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Build compositions: for each game with >= teamSize players,
  // generate all subsets of that size and track which combos recur across games
  const comps = useMemo(() => {
    const compMap: Record<string, { heroes: string[]; wins: number; total: number }> = {};

    games.forEach((g) => {
      const allPlayers = (g.players || []).filter((p) => p.hero_name && p.hero_name.trim());
      // Need at least teamSize players in the game
      if (allPlayers.length < teamSize) return;

      const heroNames = allPlayers.map((p) => p.hero_name.trim());

      // Generate all C(n, teamSize) hero subsets from this game
      const heroCombos = combinations(heroNames, teamSize);

      heroCombos.forEach((combo) => {
        // Normalize: sort alphabetically, case-insensitive key
        const sorted = [...combo].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const key = sorted.map((n) => n.toLowerCase()).join("|");

        if (!compMap[key]) {
          compMap[key] = { heroes: sorted, wins: 0, total: 0 };
        }
        compMap[key].total++;
        if (g.result?.toLowerCase() === "win") compMap[key].wins++;
      });
    });

    const resultList = Object.entries(compMap)
      .map(([key, v]) => ({
        key,
        ...v,
        winRate: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
      }))
      .filter((c) => c.total >= 2); // Only show combos that appeared in 2+ games

    // Apply sorting
    resultList.sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return resultList;
  }, [games, teamSize, sortConfig]);

  const sizes = [1, 2, 3, 4, 5];

  const SortableHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th
      className="text-left px-4 py-3 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-neutral-300 dark:text-neutral-600 flex flex-col -space-y-[0.35rem]">
          <ChevronUp className={`w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === "asc" ? "text-indigo-500" : ""}`} />
          <ChevronDown className={`w-3 h-3 ${sortConfig.key === sortKey && sortConfig.direction === "desc" ? "text-indigo-500" : ""}`} />
        </span>
      </div>
    </th>
  );

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">Team Compositions</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {loading ? "Loading..." : `${comps.length} unique ${teamSize}-man compositions found`}
          </p>
        </div>

        {/* Team size tabs */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setTeamSize(s)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                teamSize === s
                  ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {s}-Man
            </button>
          ))}
        </div>
      </div>

      {/* Compositions Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500">#</th>
                {Array.from({ length: teamSize }).map((_, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-neutral-500">
                    Hero {i + 1}
                  </th>
                ))}
                <SortableHeader label="Games" sortKey="total" />
                <SortableHeader label="Win Rate" sortKey="winRate" />
                <SortableHeader label="Wins" sortKey="wins" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={teamSize + 4} className="px-4 py-16 text-center text-neutral-400">
                    Loading compositions...
                  </td>
                </tr>
              ) : comps.length === 0 ? (
                <tr>
                  <td colSpan={teamSize + 4} className="px-4 py-16 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🎮</span>
                      <span>No {teamSize}-man compositions found.</span>
                      <span className="text-xs">Need at least 2 games with the same {teamSize}-hero combo.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                comps.map((comp, i) => (
                  <tr key={comp.key} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 text-neutral-400 font-mono">{i + 1}</td>
                    {comp.heroes.map((hero, j) => (
                      <td key={j} className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                          {hero}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold">{comp.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${comp.winRate >= 60 ? "bg-emerald-500" : comp.winRate >= 50 ? "bg-blue-500" : "bg-red-500"}`}
                            style={{ width: `${comp.winRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${comp.winRate >= 60 ? "text-emerald-600" : comp.winRate >= 50 ? "text-blue-600" : "text-red-500"}`}>
                          {comp.winRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      <span className="text-emerald-600 font-medium">{comp.wins}W</span>
                      {" / "}
                      <span className="text-red-500 font-medium">{comp.total - comp.wins}L</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      {comps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-500 mb-1">Best Composition</p>
            <p className="text-sm font-bold text-emerald-600">{comps.filter(c => c.total >= 2).sort((a, b) => b.winRate - a.winRate)[0]?.heroes.join(" + ") || "N/A"}</p>
            <p className="text-xs text-neutral-400 mt-1">{comps.filter(c => c.total >= 2).sort((a, b) => b.winRate - a.winRate)[0]?.winRate || 0}% win rate</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-500 mb-1">Most Used</p>
            <p className="text-sm font-bold text-indigo-600">{comps[0]?.heroes.join(" + ") || "N/A"}</p>
            <p className="text-xs text-neutral-400 mt-1">{comps[0]?.total || 0} games played</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-500 mb-1">Unique Comps</p>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{comps.length}</p>
            <p className="text-xs text-neutral-400 mt-1">{teamSize}-man formations</p>
          </div>
        </div>
      )}
    </div>
  );
}
