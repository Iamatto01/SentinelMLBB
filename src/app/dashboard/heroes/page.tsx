"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

export default function HeroesPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_URL}/api/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setGames(d.games || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const heroMap: Record<string, { games: number; wins: number }> = {};
  games.forEach((g) => {
    (g.players || []).forEach((p: any) => {
      const hero = p.hero_name || "Unknown";
      if (!heroMap[hero]) heroMap[hero] = { games: 0, wins: 0 };
      heroMap[hero].games++;
      if (g.result?.toLowerCase() === "win") heroMap[hero].wins++;
    });
  });

  const heroes = Object.entries(heroMap)
    .map(([name, s]) => ({ name, ...s, winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
    .sort((a, b) => b.games - a.games);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
  const pieData = heroes.slice(0, 8).map((h) => ({ name: h.name, value: h.games }));

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">Hero Pool</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{loading ? "Loading..." : `${heroes.length} heroes used`}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Hero Pick Distribution</h2>
          <div className="h-[300px] w-full">
            {mounted && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm">{loading ? "Loading..." : "No data"}</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Hero</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Games</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Wins</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Win Rate</th>
            </tr></thead>
            <tbody>
              {heroes.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-neutral-400">{loading ? "Loading..." : "No hero data"}</td></tr>
              ) : heroes.map((h, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">{h.games}</td>
                  <td className="px-4 py-3">{h.wins}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${h.winRate >= 50 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${h.winRate}%` }} />
                      </div>
                      <span className="text-xs font-medium">{h.winRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
