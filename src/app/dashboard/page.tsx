"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Swords, Trophy, Target, Activity } from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/api/games`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const totalGames = games.length;
  const wins = games.filter((g) => g.result?.toLowerCase() === "win").length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";


  // Role/hero distribution from players
  const heroCount: Record<string, number> = {};
  const heroWins: Record<string, number> = {};
  games.forEach((g) => {
    (g.players || []).forEach((p: any) => {
      const hero = p.hero_name || "Unknown";
      heroCount[hero] = (heroCount[hero] || 0) + 1;
      if (g.result?.toLowerCase() === "win") heroWins[hero] = (heroWins[hero] || 0) + 1;
    });
  });

  const allHeroData = Object.entries(heroCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top 8 heroes for pie chart, rest grouped as "Others"
  const topHeroes = allHeroData.slice(0, 8);
  const othersTotal = allHeroData.slice(8).reduce((sum, h) => sum + h.value, 0);
  const roleData = othersTotal > 0 ? [...topHeroes, { name: "Others", value: othersTotal }] : topHeroes;

  // ALL heroes win rate data (no limit, for scrollable list)
  const winRateData = Object.entries(heroCount)
    .map(([name, total]) => ({
      name,
      wins: heroWins[name] || 0,
      games: total,
      winRate: Math.round(((heroWins[name] || 0) / total) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // Most played hero
  const topHero = allHeroData.length > 0 ? allHeroData[0].name : "N/A";
  const topHeroWR = heroCount[topHero] > 0 ? Math.round(((heroWins[topHero] || 0) / heroCount[topHero]) * 100) : 0;

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#9ca3af"];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
            Overview
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {loading ? "Loading your data..." : `Welcome back to the Sentinel Dashboard. ${totalGames} games recorded.`}
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Matches" value={totalGames.toLocaleString()} icon={<Swords className="text-indigo-500" />} trend={`${wins} wins`} />
        <StatCard title="Overall Win Rate" value={`${winRate}%`} icon={<Trophy className="text-yellow-500" />} trend={`${wins}W ${totalGames - wins}L`} />
        <StatCard title="Most Played" value={topHero} icon={<Activity className="text-pink-500" />} trend={`${topHeroWR}% win rate`} />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-6">Hero Distribution</h2>
          <div className="h-[300px] w-full">
            {mounted && roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {roleData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm font-semibold">
                {loading ? "Loading..." : "No game data yet"}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-4">Win Rate by Hero</h2>
          <div className="max-h-[340px] overflow-y-auto pr-2 space-y-3">
            {winRateData.length > 0 ? winRateData.map((hero, i) => (
              <div key={i} className="flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 p-2 rounded-xl transition-colors">
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate shrink-0">{hero.name}</span>
                <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800/80 rounded-full overflow-hidden relative border border-neutral-200/50 dark:border-neutral-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${hero.winRate >= 60 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : hero.winRate >= 50 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`}
                    style={{ width: `${hero.winRate}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-neutral-800 dark:text-white mix-blend-difference">
                    {hero.winRate}%
                  </span>
                </div>
                <span className="text-xs text-neutral-400 w-16 text-right shrink-0 font-bold">{hero.wins}W/{hero.games - hero.wins}L</span>
              </div>
            )) : (
              <div className="h-[200px] flex items-center justify-center text-neutral-400 text-sm font-semibold">
                {loading ? "Loading..." : "No game data yet"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
          <h3 className="text-3xl font-black text-neutral-800 dark:text-neutral-100">{value}</h3>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 inline-block px-2.5 py-1 rounded-lg self-start border border-indigo-100 dark:border-indigo-500/20">
        {trend}
      </div>
    </div>
  );
}
