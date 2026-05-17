"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Swords, Trophy, Target, Search } from "lucide-react";

// Mock game data
const MOCK_GAMES = [
  { id: 1, date: "2025-05-15", hero: "Claude", role: "Marksman", result: "Win", kills: 8, deaths: 2, assists: 5, mode: "Ranked" },
  { id: 2, date: "2025-05-15", hero: "Lancelot", role: "Assassin", result: "Win", kills: 12, deaths: 3, assists: 4, mode: "Ranked" },
  { id: 3, date: "2025-05-14", hero: "Kagura", role: "Mage", result: "Lose", kills: 5, deaths: 6, assists: 7, mode: "Ranked" },
  { id: 4, date: "2025-05-14", hero: "Khufra", role: "Tank", result: "Win", kills: 2, deaths: 4, assists: 14, mode: "Classic" },
  { id: 5, date: "2025-05-13", hero: "Claude", role: "Marksman", result: "Win", kills: 10, deaths: 1, assists: 6, mode: "Ranked" },
  { id: 6, date: "2025-05-13", hero: "Ling", role: "Assassin", result: "Lose", kills: 7, deaths: 5, assists: 3, mode: "Ranked" },
  { id: 7, date: "2025-05-12", hero: "Lunox", role: "Mage", result: "Win", kills: 9, deaths: 3, assists: 8, mode: "Classic" },
  { id: 8, date: "2025-05-12", hero: "Claude", role: "Marksman", result: "Win", kills: 11, deaths: 2, assists: 7, mode: "Ranked" },
  { id: 9, date: "2025-05-11", hero: "Chou", role: "Fighter", result: "Lose", kills: 4, deaths: 5, assists: 6, mode: "Ranked" },
  { id: 10, date: "2025-05-11", hero: "Rafaela", role: "Support", result: "Win", kills: 1, deaths: 3, assists: 18, mode: "Classic" },
  { id: 11, date: "2025-05-10", hero: "Lancelot", role: "Assassin", result: "Win", kills: 14, deaths: 2, assists: 3, mode: "Ranked" },
  { id: 12, date: "2025-05-10", hero: "Kagura", role: "Mage", result: "Win", kills: 8, deaths: 4, assists: 9, mode: "Ranked" },
];

export default function GamesPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const filteredGames = MOCK_GAMES.filter(
    (g) =>
      g.hero.toLowerCase().includes(search.toLowerCase()) ||
      g.result.toLowerCase().includes(search.toLowerCase()) ||
      g.mode.toLowerCase().includes(search.toLowerCase())
  );

  const totalGames = MOCK_GAMES.length;
  const wins = MOCK_GAMES.filter((g) => g.result === "Win").length;
  const winRate = ((wins / totalGames) * 100).toFixed(1);

  // Role distribution
  const roleMap: Record<string, number> = {};
  MOCK_GAMES.forEach((g) => { roleMap[g.role] = (roleMap[g.role] || 0) + 1; });
  const roleData = Object.entries(roleMap).map(([name, value]) => ({ name, value }));

  // Hero win rates
  const heroStats: Record<string, { wins: number; total: number }> = {};
  MOCK_GAMES.forEach((g) => {
    if (!heroStats[g.hero]) heroStats[g.hero] = { wins: 0, total: 0 };
    heroStats[g.hero].total++;
    if (g.result === "Win") heroStats[g.hero].wins++;
  });
  const heroWinData = Object.entries(heroStats)
    .map(([name, s]) => ({ name, winRate: Math.round((s.wins / s.total) * 100) }))
    .sort((a, b) => b.winRate - a.winRate);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">Game Log</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{totalGames} games recorded · {winRate}% win rate</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input type="text" placeholder="Search by hero, result..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Games" value={totalGames.toString()} icon={<Swords className="text-indigo-500" />} />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={<Trophy className="text-yellow-500" />} />
        <StatCard title="Wins / Losses" value={`${wins} / ${totalGames - wins}`} icon={<Target className="text-teal-500" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Role Distribution</h2>
          <div className="h-[280px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Hero Win Rates</h2>
          <div className="h-[280px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heroWinData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="winRate" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500">#</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Hero</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Result</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">K/D/A</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game, i) => (
                <tr key={game.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3">{game.date}</td>
                  <td className="px-4 py-3 font-medium">{game.hero}</td>
                  <td className="px-4 py-3">{game.role}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      game.result === "Win" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    }`}>{game.result}</span>
                  </td>
                  <td className="px-4 py-3">{game.kills}/{game.deaths}/{game.assists}</td>
                  <td className="px-4 py-3 text-neutral-500">{game.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{value}</h3>
      </div>
    </div>
  );
}
