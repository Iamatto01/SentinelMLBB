"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Swords, Trophy, Target, Activity } from "lucide-react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roleData = [
    { name: "Marksman", value: 35 },
    { name: "Assassin", value: 20 },
    { name: "Mage", value: 25 },
    { name: "Tank", value: 10 },
    { name: "Fighter", value: 5 },
    { name: "Support", value: 5 },
  ];

  const winRateData = [
    { name: "Marksman", winRate: 65 },
    { name: "Assassin", winRate: 55 },
    { name: "Mage", winRate: 60 },
    { name: "Tank", winRate: 45 },
    { name: "Fighter", winRate: 50 },
    { name: "Support", winRate: 58 },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8B5CF6", "#EC4899"];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
            Overview
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Welcome back to the Sentinel Dashboard. Here's your summary.
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Matches" value="1,284" icon={<Swords className="text-indigo-500" />} trend="+12 this week" />
        <StatCard title="Overall Win Rate" value="58.4%" icon={<Trophy className="text-yellow-500" />} trend="+2.1% from last season" />
        <StatCard title="Average KDA" value="4.2" icon={<Target className="text-teal-500" />} trend="Top 15% player" />
        <StatCard title="Most Played" value="Claude" icon={<Activity className="text-pink-500" />} trend="65% win rate" />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        
        {/* Pie Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-6">Roles Distribution</h2>
          <div className="h-[300px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-6">Win Rate by Role (%)</h2>
          <div className="h-[300px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="winRate" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</h3>
        </div>
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          {icon}
        </div>
      </div>
      <div className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 inline-block px-2 py-1 rounded-md self-start">
        {trend}
      </div>
    </div>
  );
}
