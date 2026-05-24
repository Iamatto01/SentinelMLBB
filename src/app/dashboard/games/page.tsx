"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Swords, Trophy, Target, Search, Camera, Upload, Loader2, Check, X, ImagePlus, Sparkles, ChevronUp, ChevronDown, Pencil } from "lucide-react";
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onGameSaved: GameSaveCallback;
  gameToEdit: GameEntry | null;
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
            {players.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={`Player ${i + 1}`}
                  value={p.player_name}
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

// ─── Screenshot Upload & Parse Modal ─────────────────────────────────────
type UploadedFile = {
  id: string;
  preview: string;
  base64: string;
  mimeType: string;
  parsing: boolean;
  parsedData: any | null;
  error: string | null;
  saved: boolean;
};

function ScreenshotUploadModal({
  isOpen,
  onClose,
  onGameCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: GameSaveCallback;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setFiles([]);
    setSavingAll(false);
    onClose();
  };

  const updateFileState = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const updateParsedData = (id: string, newParsedData: any) => {
    updateFileState(id, { parsedData: newParsedData });
  };

  const handleParse = async (file: UploadedFile) => {
    if (!file.base64 || file.saved) return;
    updateFileState(file.id, { parsing: true, error: null });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/games/parse-screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          image: file.base64, 
          mimeType: file.mimeType,
          validHeroes: ALL_HEROES.map(h => h.name)
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        const parsed = {
          ...data.data,
          mode: data.data.mode || "Ranked"
        };
        updateFileState(file.id, { parsedData: parsed, parsing: false });
      } else {
        updateFileState(file.id, { error: data.error || "Failed to parse. Try a clearer image.", parsing: false });
      }
    } catch (err) {
      updateFileState(file.id, { error: "Network error. Please try again.", parsing: false });
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith("image/")) continue;
      
      const id = Math.random().toString(36).substring(7);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const newFile: UploadedFile = {
          id,
          preview: dataUrl,
          base64,
          mimeType: file.type,
          parsing: false,
          parsedData: null,
          error: null,
          saved: false,
        };
        setFiles((prev) => [...prev, newFile]);
        // Auto parse the file immediately
        handleParse(newFile);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const handleParseAll = () => {
    files.forEach((file) => {
      if (!file.parsedData && !file.parsing && !file.saved) {
        handleParse(file);
      }
    });
  };

  const handleSaveGame = async (file: UploadedFile) => {
    if (!file.parsedData || file.saved) return;
    
    // Set global loading if only one is saving? Actually, just mark it saving locally.
    // For simplicity, we use savingAll for global and individual just await.
    try {
      const token = localStorage.getItem("token");
      const payload = {
        date: new Date().toISOString().split("T")[0],
        mode: file.parsedData.mode || "Ranked",
        duration: file.parsedData.duration || 0,
        result: file.parsedData.result || "Win",
        notes: "📸 Auto-parsed from screenshot",
        players: (file.parsedData.players || []).map((p: any) => ({
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok !== false) {
        updateFileState(file.id, { saved: true, error: null });
        await onGameCreated();
      } else {
        updateFileState(file.id, { error: data?.error || "Failed to save game." });
      }
    } catch (err) {
      updateFileState(file.id, { error: "Network error while saving." });
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    for (const file of files) {
      if (file.parsedData && !file.saved) {
        await handleSaveGame(file);
      }
    }
    setSavingAll(false);
    
    // Auto close if all are saved
    setFiles((current) => {
      if (current.every((f) => f.saved)) {
        setTimeout(handleClose, 500);
      }
      return current;
    });
  };

  if (!isOpen) return null;

  const allSaved = files.length > 0 && files.every(f => f.saved);
  const anyToParse = files.some(f => !f.parsedData && !f.parsing && !f.saved);
  const anyToSave = files.some(f => f.parsedData && !f.saved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-neutral-900 dark:to-neutral-900 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-teal-500" />
              Upload Screenshots
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload multiple MLBB post-game screenshots for batch processing
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar (if files exist) */}
        {files.length > 0 && !allSaved && (
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {files.length} file(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Add More
              </button>
              {anyToParse && (
                <button
                  onClick={handleParseAll}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Parse All
                </button>
              )}
              {anyToSave && (
                <button
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save All Parsed
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!files.length ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all h-full min-h-[300px] flex flex-col items-center justify-center ${
                dragOver
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-500/10"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-teal-400 dark:hover:border-teal-600 bg-neutral-50 dark:bg-neutral-800/30"
              }`}
            >
              <ImagePlus className={`w-12 h-12 mx-auto mb-3 ${
                dragOver ? "text-teal-500" : "text-neutral-400"
              }`} />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                Drop screenshots here or click to browse
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Supports multiple PNG, JPG, WEBP files
              </p>
            </div>
          ) : allSaved ? (
             <div className="py-20 text-center">
               <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Check className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">All Games Saved!</h3>
               <p className="text-neutral-500 text-sm mb-6">Successfully processed and saved {files.length} games to your log.</p>
               <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-xl text-sm"
               >
                 Close
               </button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file) => (
                <div key={file.id} className={`relative rounded-2xl border ${file.saved ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'} overflow-hidden flex flex-col`}>
                  {/* Remove Button */}
                  {!file.saved && (
                    <button
                      onClick={() => setFiles(f => f.filter(x => x.id !== file.id))}
                      className="absolute top-2 right-2 p-1.5 bg-neutral-900/50 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {/* Image Thumbnail */}
                  <div className="h-32 bg-neutral-100 dark:bg-neutral-800 relative group overflow-hidden shrink-0">
                    <img
                      src={file.preview}
                      alt="Screenshot"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {file.saved && (
                       <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[2px]">
                         <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                           <Check className="w-3.5 h-3.5" /> Saved
                         </div>
                       </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-4">
                    {/* Status / Parse Action */}
                    {!file.parsedData && !file.saved && (
                      <div className="mt-auto">
                        <button
                          onClick={() => handleParse(file)}
                          disabled={file.parsing}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors disabled:opacity-60"
                        >
                          {file.parsing ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing...</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Parse AI</>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Parsed Form */}
                    {file.parsedData && !file.saved && (
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800/80">
                            <p className="text-[9px] text-neutral-400 uppercase font-bold">Result</p>
                            <select
                              value={file.parsedData.result || "Win"}
                              onChange={(e) => updateParsedData(file.id, { ...file.parsedData, result: e.target.value })}
                              className={`text-xs font-bold mt-0.5 bg-transparent focus:outline-none cursor-pointer w-full ${
                                file.parsedData.result?.toLowerCase() === "win" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              <option value="Win" className="text-emerald-600">Win</option>
                              <option value="Lose" className="text-red-600">Lose</option>
                            </select>
                          </div>
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2 border border-neutral-100 dark:border-neutral-800/80">
                            <p className="text-[9px] text-neutral-400 uppercase font-bold">Mode</p>
                            <select
                              value={file.parsedData.mode || "Ranked"}
                              onChange={(e) => updateParsedData(file.id, { ...file.parsedData, mode: e.target.value })}
                              className="text-xs font-bold text-neutral-800 dark:text-neutral-100 mt-0.5 bg-transparent focus:outline-none w-full cursor-pointer"
                            >
                              <option value="Ranked">Ranked</option>
                              <option value="Classic">Classic</option>
                              <option value="Brawl">Brawl</option>
                              <option value="Custom">Custom</option>
                              <option value="Tour">Tour</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] text-neutral-400 uppercase font-bold">Players & Heroes</p>
                          <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                            {(file.parsedData.players || []).map((p: any, i: number) => {
                              const hero = getHeroByName(p.hero_name);
                              return (
                                <div key={i} className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-2 py-1.5 border border-neutral-100 dark:border-neutral-800/80 group">
                                  <div className="w-6 h-6 rounded flex-shrink-0 overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                                    {hero?.image ? <img src={hero.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-neutral-500">{(p.hero_name || "?").charAt(0)}</div>}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    <input
                                      type="text"
                                      value={p.hero_name || ""}
                                      placeholder="Hero"
                                      onChange={(e) => {
                                        const newPlayers = [...file.parsedData.players];
                                        newPlayers[i].hero_name = e.target.value;
                                        updateParsedData(file.id, { ...file.parsedData, players: newPlayers });
                                      }}
                                      className="text-[11px] font-bold text-neutral-800 dark:text-neutral-100 bg-transparent focus:outline-none w-full leading-tight"
                                    />
                                    <input
                                      type="text"
                                      value={p.player_name || ""}
                                      placeholder="Player"
                                      onChange={(e) => {
                                        const newPlayers = [...file.parsedData.players];
                                        newPlayers[i].player_name = e.target.value;
                                        updateParsedData(file.id, { ...file.parsedData, players: newPlayers });
                                      }}
                                      className="text-[9px] text-neutral-500 bg-transparent focus:outline-none w-full leading-tight"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-auto pt-2 border-t border-neutral-100 dark:border-neutral-800">
                           <button
                             onClick={() => handleSaveGame(file)}
                             disabled={savingAll}
                             className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-semibold text-xs transition-colors disabled:opacity-60"
                           >
                             <Check className="w-3.5 h-3.5" /> Save
                           </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Overlay / Message */}
                  {file.error && (
                    <div className="mx-4 mb-4 mt-auto bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-2 text-[10px] text-red-600 dark:text-red-400 leading-tight">
                      {file.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const [mounted, setMounted] = useState(false);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
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
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Pencil className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Camera className="w-4 h-4" />
            Upload Screenshot
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

      {/* Screenshot Upload Modal */}
      <ScreenshotUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onGameCreated={fetchGames}
      />

      <ManualGameModal
        isOpen={showManual}
        gameToEdit={editingGame}
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
