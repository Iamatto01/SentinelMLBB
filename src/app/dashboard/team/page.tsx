"use client";

import React, { useState, useEffect } from "react";
import { Save, Check, Users, Shield, Crosshair, Zap, Sword, Eye, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function TeamManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [squad, setSquad] = useState({
    gold: "", hyper: "", exp: "", roamer: "", mid: "", subs: Array(8).fill("")
  });
  const [savedSquad, setSavedSquad] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("squadLineup");
    if (saved) {
      try {
        setSquad(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse squad data");
      }
    }
  }, []);

  const handleSaveSquad = () => {
    localStorage.setItem("squadLineup", JSON.stringify(squad));
    setSavedSquad(true);
    setTimeout(() => setSavedSquad(false), 2000);
  };

  const inputClass = "w-full px-4 py-3 bg-neutral-100/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-600";

  const mainRoles = [
    { key: "gold", label: "Gold Lane", icon: <Crosshair className="w-5 h-5 text-amber-500" />, color: "bg-amber-50 dark:bg-amber-500/10" },
    { key: "hyper", label: "Hyper / Jungler", icon: <Zap className="w-5 h-5 text-indigo-500" />, color: "bg-indigo-50 dark:bg-indigo-500/10" },
    { key: "exp", label: "Exp Lane", icon: <Sword className="w-5 h-5 text-rose-500" />, color: "bg-rose-50 dark:bg-rose-500/10" },
    { key: "roamer", label: "Roamer", icon: <Shield className="w-5 h-5 text-emerald-500" />, color: "bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "mid", label: "Mid Lane", icon: <Flame className="w-5 h-5 text-cyan-500" />, color: "bg-cyan-50 dark:bg-cyan-500/10" },
  ];

  if (!mounted) return <div className="p-8 text-neutral-500">Loading Team Management...</div>;

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
            Team Management
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            Manage your main roster and substitutes for easy Game Log entry.
          </p>
        </div>
        
        <button
          onClick={handleSaveSquad}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all min-w-[160px] ${
            savedSquad 
              ? "bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg scale-105" 
              : "bg-neutral-900 dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-lg"
          }`}
        >
          {savedSquad ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {savedSquad ? "Roster Saved!" : "Save Roster"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        
        {/* Main Roster Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-neutral-800 dark:text-white">Main Roster</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {mainRoles.map((role, idx) => (
              <motion.div 
                key={role.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className={`p-3 rounded-xl flex-shrink-0 ${role.color}`}>
                  {role.icon}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">
                    {role.label}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter player name..."
                    value={(squad as any)[role.key]}
                    onChange={(e) => setSquad({ ...squad, [role.key]: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Substitutes Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-neutral-800 dark:text-white">Substitutes</h2>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {squad.subs.map((sub, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + (i * 0.05) }}
                  className="flex flex-col gap-1"
                >
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">
                    Sub {i+1}
                  </label>
                  <input
                    type="text"
                    placeholder="Player name"
                    value={sub}
                    onChange={(e) => {
                      const newSubs = [...squad.subs];
                      newSubs[i] = e.target.value;
                      setSquad({ ...squad, subs: newSubs });
                    }}
                    className={inputClass}
                  />
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">How it works</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              When you log a new game in the <strong>Game Log</strong>, the Main Roster will be automatically pre-filled. You can easily swap players out for anyone in the Substitutes list before saving the game record.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
