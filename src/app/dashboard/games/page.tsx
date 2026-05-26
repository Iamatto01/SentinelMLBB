"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Swords, Trophy, Target, Search, Loader2, Check, X, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { getHeroByName, ALL_HEROES } from "@/data/heroes-data";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

type GameSaveCallback = () => Promise<void> | void;
type GamePlayer = { player_name?: string; hero_name?: string };
type GameEntry = {
  id?: number;
  game_num?: number | null;
  date?: string | null;
  mode?: string | null;
  duration?: number | null;
  result?: string | null;
  notes?: string | null;
  players?: GamePlayer[];
};

// ─── Manual Create/Update Modal ───────────────────────────────────────────
function ManualGameModal({
  isOpen,
  onClose,
  onGameSaved,
  gameToEdit,
  knownPlayers = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onGameSaved: GameSaveCallback;
  gameToEdit: GameEntry | null;
  knownPlayers?: string[];
}) {
  const isEdit = Boolean(gameToEdit?.id);
  const [gameNum, setGameNum] = useState("");
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("Ranked");
  const [duration, setDuration] = useState("");
  const [result, setResult] = useState("Win");
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState<Array<{ player_name: string; hero_name: string }>>(
    Array.from({ length: 5 }, () => ({ player_name: "", hero_name: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (gameToEdit) {
      const nextPlayers = Array.from({ length: 5 }, (_, i) => ({
        player_name: gameToEdit.players?.[i]?.player_name || "",
        hero_name: gameToEdit.players?.[i]?.hero_name || "",
      }));
      setGameNum(gameToEdit.game_num?.toString() || "");
      setDate(gameToEdit.date || "");
      setMode(gameToEdit.mode || "Ranked");
      setDuration(gameToEdit.duration?.toString() || "");
      setResult(gameToEdit.result || "Win");
      setNotes(gameToEdit.notes || "");
      setPlayers(nextPlayers);
    } else {
      setGameNum("");
      setDate(new Date().toISOString().split("T")[0]);
      setMode("Ranked");
      setDuration("");
      setResult("Win");
      setNotes("");
      setPlayers(Array.from({ length: 5 }, () => ({ player_name: "", hero_name: "" })));
    }
    setSaving(false);
    setError(null);
  }, [isOpen, gameToEdit]);

  const updatePlayer = (idx: number, key: "player_name" | "hero_name", value: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        game_num: gameNum.trim() ? Number(gameNum) : null,
        date: date || null,
        mode: mode || "Ranked",
        duration: duration.trim() ? Number(duration) : null,
        result: result || "Win",
        notes: notes || "",
        players: players
          .filter((p) => p.player_name.trim() || p.hero_name.trim())
          .map((p) => ({
            player_name: p.player_name.trim(),
            hero_name: p.hero_name.trim(),
          })),
      };

      const endpoint = isEdit ? `${API_URL}/api/games/${gameToEdit!.id}` : `${API_URL}/api/games`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setError(data?.error || `Failed to ${isEdit ? "update" : "save"} game.`);
        return;
      }

      await onGameSaved();
      onClose();
    } catch (err) {
      setError("Network error while saving game.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white">
              {isEdit ? "Update Game Log" : "Add Manual Game"}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Manual input for game log entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Game # (optional)"
              value={gameNum}
              onChange={(e) => setGameNum(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="Ranked">Ranked</option>
              <option value="Classic">Classic</option>
              <option value="Brawl">Brawl</option>
              <option value="Custom">Custom</option>
              <option value="Tour">Tour</option>
            </select>
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="Win">Win</option>
              <option value="Lose">Lose</option>
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-neutral-400 uppercase font-bold">Players & Heroes</p>
            <datalist id="heroes-list">
              {ALL_HEROES.map((h) => (
                <option key={h.id} value={h.name} />
              ))}
            </datalist>
            <datalist id="players-list">
              {knownPlayers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            {players.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={`Player ${i + 1}`}
                  value={p.player_name}
                  list="players-list"
                  onChange={(e) => updatePlayer(i, "player_name", e.target.value)}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <input
                  type="text"
                  placeholder={`Hero ${i + 1}`}
                  value={p.hero_name}
                  list="heroes-list"
                  onChange={(e) => updatePlayer(i, "hero_name", e.target.value)}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-500/25 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEdit ? "Update Game Log" : "Save to Game Log"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroWithPlayer({ heroName, playerName }: { heroName: string; playerName?: string }) {
  const hero = getHeroByName(heroName);
  const [imgErr, setImgErr] = useState(false);
  const heroImageSrc = hero?.image;

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      {/* Hero image thumbnail */}
      <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
        {heroImageSrc && !imgErr ? (
          <img
            src={heroImageSrc}
            alt={heroName}
            className="w-full h-full object-cover object-top"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-neutral-500">
            {heroName.charAt(0)}
          </div>
        )}
      </div>
      {/* Hero name + player name */}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
          {heroName}
        </p>
        {playerName && (
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight">
            {playerName}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<GameEntry[]>([]);
  const knownPlayers = useMemo(() => {
    const playersSet = new Set<string>();
    games.forEach((g) => {
      (g.players || []).forEach((p: any) => {
        if (p.player_name) playersSet.add(p.player_name.trim());
      });
    });
    return Array.from(playersSet);
  }, [games]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [editingGame, setEditingGame] = useState<GameEntry | null>(null);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

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

  const filteredGames = games.filter(
    (g) =>
      (g.result || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.mode || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.players || []).some(
        (p: any) =>
          (p.hero_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.player_name || "").toLowerCase().includes(search.toLowerCase())
      )
  );

  const sortedGames = [...filteredGames].sort((a, b) => {
    if (!sortConfig) return 0;
    if (sortConfig.key === "date") {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
    }
    if (sortConfig.key === "result") {
      const resA = (a.result || "").toLowerCase();
      const resB = (b.result || "").toLowerCase();
      return sortConfig.direction === "asc" ? resA.localeCompare(resB) : resB.localeCompare(resA);
    }
    return 0;
  });

  const totalGames = games.length;
  const wins = games.filter((g) => g.result?.toLowerCase() === "win").length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0";

  const heroStats: Record<string, { wins: number; total: number }> = {};
  games.forEach((g) => {
    (g.players || []).forEach((p: any) => {
      const hero = p.hero_name || "Unknown";
      if (!heroStats[hero]) heroStats[hero] = { wins: 0, total: 0 };
      heroStats[hero].total++;
      if (g.result?.toLowerCase() === "win") heroStats[hero].wins++;
    });
  });

  const roleData = Object.entries(heroStats)
    .map(([name, s]) => ({ name, value: s.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const heroWinData = Object.entries(heroStats)
    .map(([name, s]) => ({ name, winRate: Math.round((s.wins / s.total) * 100) }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 8);

  const COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
            Game Log
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {loading ? "Loading..." : `${totalGames} games recorded · ${winRate}% win rate`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setEditingGame(null); setShowManual(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Log New Game
          </button>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search hero, player, result..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Games" value={totalGames.toString()} icon={<Swords className="text-indigo-500" />} />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={<Trophy className="text-yellow-500" />} />
        <StatCard title="Wins / Losses" value={`${wins} / ${totalGames - wins}`} icon={<Target className="text-teal-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-4">Hero Distribution</h2>
          <div className="h-[280px] w-full">
            {mounted && roleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                {loading ? "Loading..." : "No data yet"}
              </div>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
          <h2 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-4">Hero Win Rates</h2>
          <div className="h-[280px] w-full">
            {mounted && heroWinData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heroWinData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="winRate" fill="#8B5CF6" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm font-semibold">
                {loading ? "Loading..." : "No data yet"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500">#</th>
                <th
                  className="text-left px-4 py-3 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <span className="flex flex-col -space-y-[0.35rem]">
                      <ChevronUp className={`w-3 h-3 ${sortConfig?.key === "date" && sortConfig.direction === "asc" ? "text-indigo-500" : "text-neutral-300 dark:text-neutral-600"}`} />
                      <ChevronDown className={`w-3 h-3 ${sortConfig?.key === "date" && sortConfig.direction === "desc" ? "text-indigo-500" : "text-neutral-300 dark:text-neutral-600"}`} />
                    </span>
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 min-w-[320px]">Heroes & Players</th>
                <th
                  className="text-left px-4 py-3 font-medium text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors select-none"
                  onClick={() => handleSort("result")}
                >
                  <div className="flex items-center gap-1">
                    Result
                    <span className="flex flex-col -space-y-[0.35rem]">
                      <ChevronUp className={`w-3 h-3 ${sortConfig?.key === "result" && sortConfig.direction === "asc" ? "text-indigo-500" : "text-neutral-300 dark:text-neutral-600"}`} />
                      <ChevronDown className={`w-3 h-3 ${sortConfig?.key === "result" && sortConfig.direction === "desc" ? "text-indigo-500" : "text-neutral-300 dark:text-neutral-600"}`} />
                    </span>
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Mode</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-400">Loading games...</td></tr>
              ) : sortedGames.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-400">No games found</td></tr>
              ) : (
                sortedGames.map((game, i) => (
                  <tr
                    key={game.id || i}
                    className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-400">{game.game_num || i + 1}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 text-xs">{game.date || "-"}</td>

                    {/* Heroes & Players column */}
                    <td className="px-4 py-2">
                      {(game.players || []).filter((p: any) => p.hero_name).length === 0 ? (
                        <span className="text-neutral-400">-</span>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {(game.players || [])
                            .filter((p: any) => p.hero_name)
                            .map((p: any, j: number) => (
                              <HeroWithPlayer
                                key={j}
                                heroName={p.hero_name}
                                playerName={p.player_name}
                              />
                            ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        game.result?.toLowerCase() === "win"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      }`}>
                        {game.result || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{game.mode || "-"}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{game.duration ? `${game.duration}m` : "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setEditingGame(game); setShowManual(true); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManualGameModal
        isOpen={showManual}
        gameToEdit={editingGame}
        knownPlayers={knownPlayers}
        onClose={() => {
          setShowManual(false);
          setEditingGame(null);
        }}
        onGameSaved={fetchGames}
      />
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
