"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const MOCK_PLAYERS = [
  { name: "Atto", games: 48, wins: 30, kills: 312, deaths: 145, assists: 267 },
  { name: "Zafran", games: 42, wins: 25, kills: 189, deaths: 132, assists: 298 },
  { name: "Hakim", games: 38, wins: 22, kills: 245, deaths: 118, assists: 156 },
  { name: "Aiman", games: 35, wins: 18, kills: 178, deaths: 167, assists: 201 },
  { name: "Faris", games: 30, wins: 19, kills: 267, deaths: 98, assists: 134 },
  { name: "Danish", games: 28, wins: 14, kills: 134, deaths: 112, assists: 189 },
];

export default function PlayersPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const players = MOCK_PLAYERS.map(p => ({
    ...p,
    winRate: Math.round((p.wins / p.games) * 100),
    kda: ((p.kills + p.assists) / Math.max(p.deaths, 1)).toFixed(1),
  })).sort((a, b) => b.games - a.games);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const pieData = players.map(p => ({ name: p.name, value: p.games }));
  const barData = players.map(p => ({ name: p.name, winRate: p.winRate }));

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">Player Stats</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{players.length} players tracked</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Games per Player</h2>
          <div className="h-[280px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Win Rate by Player</h2>
          <div className="h-[280px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="winRate" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Player</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Games</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Wins</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">KDA</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.games}</td>
                <td className="px-4 py-3">{p.wins}</td>
                <td className="px-4 py-3">{p.kda}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.winRate >= 50 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  }`}>{p.winRate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
