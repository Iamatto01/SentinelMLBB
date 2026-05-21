"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Swords, Trophy, Target, Search, Camera, Upload, Loader2, Check, X, ImagePlus, Sparkles } from "lucide-react";
import { getHeroByName } from "@/data/heroes-data";

const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev";

function HeroWithPlayer({ heroName, playerName }: { heroName: string; playerName?: string }) {
  const hero = getHeroByName(heroName);
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="flex items-center gap-2 py-0.5">
      {/* Hero image thumbnail */}
      <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
        {hero?.image && !imgErr ? (
          <img
            src={hero.image}
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

// ─── Screenshot Upload & Parse Modal ─────────────────────────────────────
function ScreenshotUploadModal({
  isOpen,
  onClose,
  onGameCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/png");
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImagePreview(null);
    setImageBase64(null);
    setParsedData(null);
    setError(null);
    setParsing(false);
    setSaving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError(null);
    setParsedData(null);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 from data URL
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleParse = async () => {
    if (!imageBase64) return;
    setParsing(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/games/parse-screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setParsedData(data.data);
      } else {
        setError(data.error || "Failed to parse screenshot. Try a clearer image.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  const handleSaveGame = async () => {
    if (!parsedData) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        date: new Date().toISOString().split("T")[0],
        mode: parsedData.mode || "Ranked",
        duration: parsedData.duration || 0,
        result: parsedData.result || "Win",
        notes: "📸 Auto-parsed from screenshot",
        players: (parsedData.players || []).map((p: any) => ({
          player_name: p.player_name || "",
          hero_name: p.hero_name || "",
        })),
      };
      const res = await fetch(`${API_URL}/api/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onGameCreated();
        handleClose();
      } else {
        setError("Failed to save game. Please try again.");
      }
    } catch (err) {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-neutral-900 dark:to-neutral-900">
          <div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-500" />
              Upload Screenshot
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload MLBB post-game screenshot untuk auto-parse ke Game Log
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop Zone / Preview */}
          {!imagePreview ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-teal-400 dark:hover:border-teal-600 bg-neutral-50 dark:bg-neutral-800/30"
              }`}
            >
              <ImagePlus className={`w-12 h-12 mx-auto mb-3 ${
                dragOver ? "text-teal-500" : "text-neutral-400"
              }`} />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Drop screenshot here or click to browse
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Supports PNG, JPG, WEBP
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <img
                  src={imagePreview}
                  alt="Screenshot preview"
                  className="w-full max-h-[280px] object-contain bg-neutral-100 dark:bg-neutral-800"
                />
                <button
                  onClick={() => { resetState(); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Parse Button */}
              {!parsedData && (
                <button
                  onClick={handleParse}
                  disabled={parsing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-teal-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse Screenshot
                    </>
                  )}
                </button>
              )}

              {/* Parsed Results Preview */}
              {parsedData && (
                <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Parsed Result</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Result</p>
                      <p className={`text-sm font-bold mt-0.5 ${
                        parsedData.result?.toLowerCase() === "win"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {parsedData.result || "-"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Mode</p>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {parsedData.mode || "-"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Duration</p>
                      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {parsedData.duration ? `${parsedData.duration}m` : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">Players & Heroes</p>
                    {(parsedData.players || []).map((p: any, i: number) => {
                      const hero = getHeroByName(p.hero_name);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-white dark:bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-100 dark:border-neutral-800"
                        >
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                            {hero?.image ? (
                              <img
                                src={hero.image}
                                alt={p.hero_name}
                                className="w-full h-full object-cover object-top"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-neutral-500">
                                {(p.hero_name || "?").charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">
                              {p.hero_name || "Unknown"}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {p.player_name || "Unknown"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveGame}
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
                        Save to Game Log
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

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
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">
            Game Log
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {loading ? "Loading..." : `${totalGames} games recorded · ${winRate}% win rate`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/35 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Camera className="w-4 h-4" />
            Upload Screenshot
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search hero, player, result..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
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
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Hero Distribution</h2>
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
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Hero Win Rates</h2>
          <div className="h-[280px] w-full">
            {mounted && heroWinData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heroWinData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none" }} />
                  <Bar dataKey="winRate" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                {loading ? "Loading..." : "No data yet"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500">#</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 min-w-[320px]">Heroes & Players</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Result</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Mode</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-400">Loading games...</td></tr>
              ) : filteredGames.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-400">No games found</td></tr>
              ) : (
                filteredGames.map((game, i) => (
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Upload Modal */}
      <ScreenshotUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onGameCreated={() => {
          fetchGames();
        }}
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
