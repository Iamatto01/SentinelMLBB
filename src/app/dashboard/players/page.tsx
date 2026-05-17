"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users as UsersIcon, Trophy, Target } from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api";

export default function PlayersPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setGames(d.games || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Build player stats
  const playerMap: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
  games.forEach((g: any) => {
    for (let i = 1; i <= 5; i++) {
      const name = g[`player${i}_name`] || g[`player${i}`];
      if (!name) continue;
      if (!playerMap[name]) playerMap[name] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      playerMap[name].games++;
      if (g.result?.toLowerCase() === "win") playerMap[name].wins++;
    }
  });

  const players = Object.entries(playerMap)
    .map(([name, s]) => ({ name, ...s, winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
    .sort((a, b) => b.games - a.games);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const barData = players.slice(0, 6).map((p) => ({ name: p.name, winRate: p.winRate }));
  const pieData = players.slice(0, 6).map((p) => ({ name: p.name, value: p.games }));

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
          Player Stats
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">{players.length} players tracked</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Games per Player</h2>
          <div className="h-[250px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-neutral-400 text-sm">{loading ? "Loading..." : "No data"}</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Win Rate by Player</h2>
          <div className="h-[250px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip /><Bar dataKey="winRate" fill="#14b8a6" radius={[4,4,0,0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-neutral-400 text-sm">{loading ? "Loading..." : "No data"}</div>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
            <th className="text-left px-4 py-3 font-medium text-neutral-500">Player</th>
            <th className="text-left px-4 py-3 font-medium text-neutral-500">Games</th>
            <th className="text-left px-4 py-3 font-medium text-neutral-500">Wins</th>
            <th className="text-left px-4 py-3 font-medium text-neutral-500">Win Rate</th>
          </tr></thead>
          <tbody>
            {players.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-neutral-400">{loading ? "Loading..." : "No player data"}</td></tr>
            ) : players.map((p, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.games}</td>
                <td className="px-4 py-3">{p.wins}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.winRate >= 50 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>
                    {p.winRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
