"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, Loader2, Check, X, RotateCcw, ChevronRight, Sparkles, Search } from "lucide-react";
import {
  buildFingerprintDB,
  matchHeroIcon,
  cropImageRegion,
  type MatchResult,
} from "@/lib/hero-fingerprints";
import { ALL_HEROES, getHeroByName } from "@/data/heroes-data";

// ── Types ────────────────────────────────────────────────────────────────────
export interface DetectedHero {
  slotIndex: number;
  heroName: string;
  confidence: number;
  team: "ally" | "enemy";
  alternatives: MatchResult[];
}

interface Props {
  onDetectionComplete: (heroes: DetectedHero[]) => void;
  onCancel: () => void;
}

/**
 * Predefined icon regions for common MLBB post-game layouts.
 * These are relative positions (0-1) on the screenshot.
 * The post-game screen shows 5 heroes per team in a row.
 */
const LAYOUT_PRESETS = {
  // Standard 16:9 (most phones)
  standard: {
    label: "Standard (16:9)",
    allies: [
      { x: 0.035, y: 0.235, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.315, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.395, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.475, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.555, w: 0.072, h: 0.065 },
    ],
    enemies: [
      { x: 0.035, y: 0.655, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.735, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.815, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.895, w: 0.072, h: 0.065 },
      { x: 0.035, y: 0.975, w: 0.072, h: 0.065 },
    ],
  },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ScreenshotHeroDetector({ onDetectionComplete, onCancel }: Props) {
  const [step, setStep] = useState<"upload" | "detect" | "confirm">("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [detected, setDetected] = useState<DetectedHero[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [dragPoints, setDragPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload the fingerprint DB on mount
  useEffect(() => {
    buildFingerprintDB().then(() => setDbReady(true));
  }, []);

  // ── File handling ───────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      setStep("detect");
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Auto-detect from preset regions ─────────────────────────────────────
  const runAutoDetect = useCallback(async () => {
    if (!imageEl || !dbReady) return;
    setDetecting(true);

    try {
      const layout = LAYOUT_PRESETS.standard;
      const results: DetectedHero[] = [];
      const imgW = imageEl.naturalWidth;
      const imgH = imageEl.naturalHeight;

      for (let i = 0; i < 5; i++) {
        const reg = layout.allies[i];
        const crop = cropImageRegion(
          imageEl,
          reg.x * imgW, reg.y * imgH,
          reg.w * imgW, reg.h * imgH,
          64
        );
        const matches = await matchHeroIcon(crop, 5);
        results.push({
          slotIndex: i,
          heroName: matches[0]?.heroName || "Unknown",
          confidence: matches[0]?.confidence || 0,
          team: "ally",
          alternatives: matches,
        });
      }

      for (let i = 0; i < 5; i++) {
        const reg = layout.enemies[i];
        const crop = cropImageRegion(
          imageEl,
          reg.x * imgW, reg.y * imgH,
          reg.w * imgW, reg.h * imgH,
          64
        );
        const matches = await matchHeroIcon(crop, 5);
        results.push({
          slotIndex: i + 5,
          heroName: matches[0]?.heroName || "Unknown",
          confidence: matches[0]?.confidence || 0,
          team: "enemy",
          alternatives: matches,
        });
      }

      setDetected(results);
      setStep("confirm");
    } catch (err) {
      console.error("Detection failed:", err);
    } finally {
      setDetecting(false);
    }
  }, [imageEl, dbReady]);

  // ── Manual point picking ────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!manualMode || !canvasRef.current || !imageEl) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = imageEl.naturalWidth / rect.width;
      const scaleY = imageEl.naturalHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setDragPoints((prev) => {
        const next = [...prev, { x, y }];
        if (next.length >= 10) {
          // Process all 10 points
          processManualPoints(next);
        }
        return next;
      });
    },
    [manualMode, imageEl]
  );

  const processManualPoints = useCallback(
    async (points: { x: number; y: number }[]) => {
      if (!imageEl) return;
      setDetecting(true);

      const iconSize = Math.min(imageEl.naturalWidth, imageEl.naturalHeight) * 0.06;
      const results: DetectedHero[] = [];

      for (let i = 0; i < Math.min(points.length, 10); i++) {
        const p = points[i];
        const crop = cropImageRegion(
          imageEl,
          p.x - iconSize / 2,
          p.y - iconSize / 2,
          iconSize,
          iconSize,
          64
        );
        const matches = await matchHeroIcon(crop, 5);
        results.push({
          slotIndex: i,
          heroName: matches[0]?.heroName || "Unknown",
          confidence: matches[0]?.confidence || 0,
          team: i < 5 ? "ally" : "enemy",
          alternatives: matches,
        });
      }

      setDetected(results);
      setStep("confirm");
      setDetecting(false);
      setManualMode(false);
    },
    [imageEl]
  );

  // Draw screenshot on canvas
  useEffect(() => {
    if (step === "detect" && canvasRef.current && imageEl) {
      const canvas = canvasRef.current;
      const maxW = 600;
      const scale = maxW / imageEl.naturalWidth;
      canvas.width = maxW;
      canvas.height = imageEl.naturalHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

      // Draw manual points if any
      if (manualMode) {
        const scaleX = canvas.width / imageEl.naturalWidth;
        const scaleY = canvas.height / imageEl.naturalHeight;
        dragPoints.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x * scaleX, p.y * scaleY, 8, 0, Math.PI * 2);
          ctx.fillStyle = i < 5 ? "rgba(99,102,241,0.8)" : "rgba(239,68,68,0.8)";
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "white";
          ctx.font = "bold 10px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${i + 1}`, p.x * scaleX, p.y * scaleY);
        });
      }
    }
  }, [step, imageEl, manualMode, dragPoints]);

  // ── Update a detected hero ──────────────────────────────────────────────
  const updateDetectedHero = (index: number, heroName: string) => {
    setDetected((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, heroName, confidence: 1, alternatives: [] } : d
      )
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  // Upload step
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <h3 className="text-base font-bold text-neutral-800 dark:text-white">
            Upload Post-Game Screenshot
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Upload a screenshot from the MLBB post-game results screen
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all group"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
              <Upload className="w-8 h-8 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300 text-sm">
                Drop screenshot here or click to browse
              </p>
              <p className="text-xs text-neutral-400 mt-1">PNG, JPG supported</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          <span className="text-xs text-neutral-400 font-semibold">OR</span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Enter Heroes Manually Instead
        </button>
      </div>
    );
  }

  // Detect step — show screenshot and actions
  if (step === "detect") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <h3 className="text-base font-bold text-neutral-800 dark:text-white">
            {manualMode
              ? `Click on hero icons (${dragPoints.length}/10)`
              : "Screenshot Loaded"}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {manualMode
              ? "Click the 5 ally hero icons first, then 5 enemy hero icons"
              : "Choose auto-detect or manually click on hero icons"}
          </p>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-black">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`w-full ${manualMode ? "cursor-crosshair" : ""}`}
          />
          {detecting && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-white text-sm font-semibold">
                  Detecting heroes...
                </p>
                {!dbReady && (
                  <p className="text-neutral-400 text-xs">
                    Building hero fingerprint database...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={runAutoDetect}
            disabled={detecting || !dbReady}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Auto Detect
          </button>
          <button
            onClick={() => {
              setManualMode(!manualMode);
              setDragPoints([]);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              manualMode
                ? "bg-amber-500 border-amber-500 text-white"
                : "border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            <Camera className="w-4 h-4" />
            {manualMode ? "Cancel Manual" : "Manual Pick"}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setStep("upload");
              setImageUrl(null);
              setImageEl(null);
              setManualMode(false);
              setDragPoints([]);
            }}
            className="flex-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />
            Re-upload
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Confirm step — show detected heroes with edit controls
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-base font-bold text-neutral-800 dark:text-white">
          Confirm Detected Heroes
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Review and correct any misidentified heroes before proceeding
        </p>
      </div>

      {/* Allied Team */}
      <div>
        <p className="text-[11px] text-indigo-500 uppercase font-bold mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
          Your Team (Allies)
        </p>
        <div className="space-y-1.5">
          {detected.filter((d) => d.team === "ally").map((d, i) => (
            <DetectedHeroRow
              key={d.slotIndex}
              detection={d}
              index={i}
              onChangeHero={(name) => updateDetectedHero(d.slotIndex, name)}
            />
          ))}
        </div>
      </div>

      {/* Enemy Team */}
      <div>
        <p className="text-[11px] text-red-500 uppercase font-bold mb-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Enemy Team
        </p>
        <div className="space-y-1.5">
          {detected.filter((d) => d.team === "enemy").map((d, i) => (
            <DetectedHeroRow
              key={d.slotIndex}
              detection={d}
              index={i}
              onChangeHero={(name) => updateDetectedHero(d.slotIndex, name)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            setStep("detect");
            setDetected([]);
          }}
          className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
          Re-detect
        </button>
        <button
          onClick={() => onDetectionComplete(detected)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-500/25"
        >
          <Check className="w-4 h-4" />
          Use These Heroes
        </button>
      </div>
    </div>
  );
}

// ── Sub-component: single detected hero row ──────────────────────────────────
function DetectedHeroRow({
  detection,
  index,
  onChangeHero,
}: {
  detection: DetectedHero;
  index: number;
  onChangeHero: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const hero = getHeroByName(detection.heroName);
  const [imgErr, setImgErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const filteredHeroes = searchVal.trim()
    ? ALL_HEROES.filter((h) =>
        h.name.toLowerCase().includes(searchVal.toLowerCase())
      ).slice(0, 6)
    : [];

  const confidenceColor =
    detection.confidence > 0.8
      ? "text-emerald-500"
      : detection.confidence > 0.6
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 relative">
      {/* Hero icon */}
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
        {hero?.image && !imgErr ? (
          <img
            src={hero.image}
            alt={detection.heroName}
            className="w-full h-full object-cover object-top"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-neutral-500">
            {detection.heroName.charAt(0)}
          </div>
        )}
      </div>

      {/* Hero name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search hero..."
              className="w-full px-2 py-1 text-xs bg-white dark:bg-neutral-900 border border-indigo-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditing(false);
                  setSearchVal("");
                }
                if (e.key === "Enter" && filteredHeroes.length > 0) {
                  onChangeHero(filteredHeroes[0].name);
                  setEditing(false);
                  setSearchVal("");
                }
              }}
            />
            {filteredHeroes.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">
                {filteredHeroes.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      onChangeHero(h.name);
                      setEditing(false);
                      setSearchVal("");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-left transition-colors"
                  >
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {h.name}
                    </span>
                    <span className="text-neutral-400 text-[10px]">
                      {h.role.join("/")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 hover:text-indigo-500 transition-colors cursor-pointer flex items-center gap-1"
          >
            {detection.heroName}
            <Search className="w-3 h-3 text-neutral-400" />
          </button>
        )}
      </div>

      {/* Confidence badge */}
      <span className={`text-[10px] font-bold ${confidenceColor} tabular-nums`}>
        {Math.round(detection.confidence * 100)}%
      </span>

      {/* Alternative picks */}
      {detection.alternatives.length > 1 && !editing && (
        <div className="flex gap-0.5">
          {detection.alternatives.slice(1, 3).map((alt) => (
            <button
              key={alt.heroId}
              onClick={() => onChangeHero(alt.heroName)}
              title={`Switch to ${alt.heroName} (${Math.round(alt.confidence * 100)}%)`}
              className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 transition-colors font-semibold"
            >
              {alt.heroName.slice(0, 4)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
