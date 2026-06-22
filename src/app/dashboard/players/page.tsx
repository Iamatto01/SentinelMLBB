"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Save, Check, Users } from "lucide-react";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

export default function PlayersPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Squad State
  const [squad, setSquad] = useState({
    gold: "", hyper: "", exp: "", roamer: "", mid: "", subs: Array(8).fill("")
  });
  const [savedSquad, setSavedSquad] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Load squad if exists
        const saved = localStorage.getItem("squadLineup");
        if (saved) {
          try { setSquad(JSON.parse(saved)); } catch (e) {}
        }
        
        if (!token) { setLoading(false); return; }
        const res = await fetch(`${API_URL}/api/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setGames(d.games || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Build player stats from game_players
  const playerMap: Record<string, { games: number; wins: number }> = {};
  games.forEach((g) => {
    (g.players || []).forEach((p: any) => {
      const name = p.player_name;
      if (!name) return;
      if (!playerMap[name]) playerMap[name] = { games: 0, wins: 0 };
      playerMap[name].games++;
      if (g.result?.toLowerCase() === "win") playerMap[name].wins++;
    });
  });

  const players = Object.entries(playerMap)
    .map(([name, s]) => ({ name, ...s, winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
    .sort((a, b) => b.games - a.games);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const pieData = players.slice(0, 6).map((p) => ({ name: p.name, value: p.games }));
  const barData = players.slice(0, 6).map((p) => ({ name: p.name, winRate: p.winRate }));

  const handleSaveSquad = () => {
    localStorage.setItem("squadLineup", JSON.stringify(squad));
    setSavedSquad(true);
    setTimeout(() => setSavedSquad(false), 2000);
  };

  const inputClass = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all";

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">Player Stats</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">{loading ? "Loading..." : `${players.length} players tracked`}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-4">Games per Player</h2>
          <div className="h-[280px] w-full">
            {mounted && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm font-semibold">{loading ? "Loading..." : "No data"}</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-4">Win Rate by Player</h2>
          <div className="h-[280px] w-full">
            {mounted && barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="winRate" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm font-semibold">{loading ? "Loading..." : "No data"}</div>
            )}
          </div>
        </div>
      </div>

      {/* Squad Lineup Builder */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-800 dark:text-white">Squad Lineup</h2>
              <p className="text-xs font-medium text-neutral-500">Save your main roster for 1-click easy add in Game Log.</p>
            </div>
          </div>
          <button
            onClick={handleSaveSquad}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              savedSquad 
                ? "bg-emerald-500 text-white shadow-emerald-500/20 shadow-md" 
                : "bg-neutral-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-md"
            }`}
          >
            {savedSquad ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedSquad ? "Saved!" : "Save Lineup"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main 5 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Main Roster
            </h3>
            
            <div className="space-y-3">
              {[
                { label: "Gold Lane", key: "gold" },
                { label: "Hyper", key: "hyper" },
                { label: "Exp Lane", key: "exp" },
                { label: "Roamer", key: "roamer" },
                { label: "Mid Lane", key: "mid" }
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-24 text-xs font-bold text-neutral-500">{label}</label>
                  <input
                    type="text"
                    placeholder="Player Name"
                    value={(squad as any)[key]}
                    onChange={(e) => setSquad({ ...squad, [key]: e.target.value })}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Subs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
              Substitutes
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {squad.subs.map((sub, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-400 w-8">Sub {i+1}</span>
                  <input
                    type="text"
                    placeholder={`Name`}
                    value={sub}
                    onChange={(e) => {
                      const newSubs = [...squad.subs];
                      newSubs[i] = e.target.value;
                      setSquad({ ...squad, subs: newSubs });
                    }}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
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
