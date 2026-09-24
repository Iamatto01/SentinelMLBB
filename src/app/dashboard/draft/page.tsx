"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Search,
  Shield,
  Sword,
  Sparkles,
  Ban,
  Star,
  Flame,
  Crosshair,
  Zap,
  Users,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Settings2,
  Undo2,
} from "lucide-react";
import { ALL_HEROES, getHeroByName, HeroRole } from "@/data/heroes-data";
import {
  getComfortPlayers,
  PlayerProfile,
  LaneRole,
  LANE_ROLES,
  COMFORT_TIERS,
  ComfortHeroEntry,
  ComfortTier,
} from "@/lib/comfortHeroes";

type DraftMode = "ranked" | "tournament";

const BAN_COUNT: Record<DraftMode, number> = {
  ranked: 5,
  tournament: 5,
};

function getHeroImage(name: string): string {
  const hero = getHeroByName(name);
  return hero?.image ?? "";
}

function getRoleIcon(role: LaneRole, className = "w-3.5 h-3.5") {
  switch (role) {
    case "gold":
      return <Crosshair className={className} />;
    case "hyper":
      return <Zap className={className} />;
    case "exp":
      return <Sword className={className} />;
    case "roamer":
      return <Shield className={className} />;
    case "mid":
      return <Flame className={className} />;
  }
}

// ── Hero Avatar ─────────────────────────────────────────────────────────────
function HeroAvatar({
  name,
  size = "md",
  crossed = false,
  dim = false,
}: {
  name: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  crossed?: boolean;
  dim?: boolean;
}) {
  const [err, setErr] = useState(false);
  const img = name ? getHeroImage(name) : "";

  const sizeClass =
    size === "xs"
      ? "w-8 h-8 text-[10px]"
      : size === "sm"
      ? "w-11 h-11 text-xs"
      : size === "lg"
      ? "w-16 h-16 text-xl"
      : "w-14 h-14 text-base";

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 ${sizeClass} ${
        dim ? "opacity-40" : ""
      } border border-neutral-300/60 dark:border-neutral-700 shadow-inner`}
    >
      {name && img && !err ? (
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover object-top"
          referrerPolicy="no-referrer"
          onError={() => setErr(true)}
        />
      ) : name ? (
        <div className="w-full h-full flex items-center justify-center font-black text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-800">
          {name.charAt(0)}
        </div>
      ) : (
        <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900/60" />
      )}
      {crossed && (
        <div className="absolute inset-0 bg-rose-600/80 flex items-center justify-center">
          <X className="w-4 h-4 text-white stroke-[3]" />
        </div>
      )}
    </div>
  );
}

// ── Ban Slot ────────────────────────────────────────────────────────────────
function BanSlot({
  heroName,
  active,
  team,
  onClick,
  onRemove,
}: {
  heroName: string | null;
  active: boolean;
  team: "ally" | "enemy";
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const isAlly = team === "ally";

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 p-1 rounded-xl border-2 cursor-pointer transition-all w-12 h-14 select-none ${
        active
          ? isAlly
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 scale-105 shadow-md"
            : "border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/20 scale-105 shadow-md"
          : heroName
          ? "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm"
          : "border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 hover:border-neutral-400 dark:hover:border-neutral-700"
      }`}
    >
      {heroName ? (
        <>
          <HeroAvatar name={heroName} size="xs" crossed />
          <p className="text-[8px] font-black text-neutral-700 dark:text-neutral-300 truncate w-full text-center leading-none px-0.5">
            {heroName}
          </p>
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-500 shadow-sm"
            title="Remove ban"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </>
      ) : (
        <>
          <Ban className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600" />
          <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-600 leading-none">
            BAN
          </span>
        </>
      )}
    </div>
  );
}

// ── Pick Slot ───────────────────────────────────────────────────────────────
interface SlotPlayerAssignment {
  playerId: string;
  role: LaneRole;
}

function PickSlot({
  heroName,
  team,
  active,
  onClick,
  onRemove,
  index,
  assignedPlayer,
  comfortBadge,
  onOpenPlayerSelector,
}: {
  heroName: string | null;
  team: "ally" | "enemy";
  active: boolean;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
  index: number;
  assignedPlayer?: { player: PlayerProfile; role: LaneRole } | null;
  comfortBadge?: { tier: ComfortTier; label: string } | null;
  onOpenPlayerSelector?: (e: React.MouseEvent) => void;
}) {
  const isAlly = team === "ally";
  const roleInfo = assignedPlayer ? LANE_ROLES.find((r) => r.key === assignedPlayer.role) : null;

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all min-h-[66px] select-none ${
        active
          ? isAlly
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 scale-[1.01] shadow-md"
            : "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/20 scale-[1.01] shadow-md"
          : heroName
          ? "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700"
          : "border-dashed border-neutral-300 dark:border-neutral-800 bg-white/60 dark:bg-neutral-950/40 hover:border-neutral-400 dark:hover:border-neutral-700"
      }`}
    >
      {heroName ? (
        <>
          <div className="relative">
            <HeroAvatar name={heroName} size="sm" />
            {comfortBadge && (
              <div
                className={`absolute -top-1.5 -left-1.5 px-1 py-0.2 text-[9px] font-black rounded shadow ${
                  comfortBadge.tier === "signature"
                    ? "bg-red-500 text-white"
                    : "bg-amber-500 text-black"
                }`}
                title={`Comfort Hero: ${comfortBadge.label}`}
              >
                {comfortBadge.tier === "signature" ? "🔥" : "⭐"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Pick {index + 1}
              </span>
              {isAlly && assignedPlayer && (
                <button
                  type="button"
                  onClick={onOpenPlayerSelector}
                  className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  title="Change player or role"
                >
                  {getRoleIcon(assignedPlayer.role, "w-2.5 h-2.5")}
                  <span className="truncate max-w-[80px]">{assignedPlayer.player.name}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <p className="font-black text-sm text-neutral-900 dark:text-white truncate">
                {heroName}
              </p>
              {comfortBadge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    comfortBadge.tier === "signature"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {comfortBadge.label}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onRemove}
            className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
            title="Clear pick"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-black text-neutral-400 dark:text-neutral-500 text-sm shrink-0">
              {index + 1}
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-600 dark:text-neutral-300 text-xs font-bold leading-tight">
                {isAlly ? "Select Ally Hero..." : "Select Enemy Hero..."}
              </span>
              {isAlly && assignedPlayer && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${roleInfo?.textClass}`}>
                    {getRoleIcon(assignedPlayer.role, "w-2.5 h-2.5")}
                    {roleInfo?.shortLabel}:
                  </span>
                  <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                    {assignedPlayer.player.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAlly && assignedPlayer && (
            <button
              type="button"
              onClick={onOpenPlayerSelector}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Change player or role"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hero Grid Selection Card ────────────────────────────────────────────────
function HeroGridCard({
  hero,
  disabled,
  isBanned,
  isComfort,
  comfortTier,
  onSelect,
}: {
  hero: typeof ALL_HEROES[number];
  disabled: boolean;
  isBanned: boolean;
  isComfort?: boolean;
  comfortTier?: ComfortTier;
  onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all select-none relative ${
        disabled
          ? "opacity-30 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
          : isComfort
          ? "cursor-pointer border-amber-400 dark:border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400/40 hover:scale-105 shadow-sm active:scale-95"
          : "cursor-pointer border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:shadow-sm active:scale-95"
      }`}
    >
      {/* Comfort Star Badge */}
      {isComfort && !disabled && (
        <div
          className={`absolute -top-1.5 -right-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-md font-bold ${
            comfortTier === "signature" ? "bg-red-500 text-white" : "bg-amber-500 text-black"
          }`}
          title={comfortTier === "signature" ? "🔥 Signature Pick" : "⭐ Comfort Pick"}
        >
          {comfortTier === "signature" ? "🔥" : "⭐"}
        </div>
      )}

      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative shadow-inner">
        {hero.image && !imgErr ? (
          <img
            src={hero.image}
            alt={hero.name}
            className="w-full h-full object-cover object-top"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-neutral-400 dark:text-neutral-500 bg-neutral-200 dark:bg-neutral-800 text-xs">
            {hero.name.charAt(0)}
          </div>
        )}
        {isBanned && (
          <div className="absolute inset-0 bg-rose-600/80 flex items-center justify-center">
            <Ban className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <span className="text-[10px] font-black text-center text-neutral-800 dark:text-neutral-200 leading-tight truncate w-full px-0.5">
        {hero.name}
      </span>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────
export default function DraftSimulatorPage() {
  const [mode, setMode] = useState<DraftMode>("ranked");
  const banCount = BAN_COUNT[mode];

  const [allyBans, setAllyBans] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyBans, setEnemyBans] = useState<(string | null)[]>([null, null, null, null, null]);
  const [alliedTeam, setAlliedTeam] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyTeam, setEnemyTeam] = useState<(string | null)[]>([null, null, null, null, null]);

  // Squad Players & Slot Assignments for Allied Picks
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<SlotPlayerAssignment[]>([
    { playerId: "", role: "gold" },
    { playerId: "", role: "hyper" },
    { playerId: "", role: "exp" },
    { playerId: "", role: "roamer" },
    { playerId: "", role: "mid" },
  ]);

  // Modal for changing player slot assignment
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);

  type SlotType = { phase: "ban" | "pick"; team: "ally" | "enemy"; index: number };

  // Set default active slot to first Ally Ban slot
  const [activeSlot, setActiveSlot] = useState<SlotType | null>({
    phase: "ban",
    team: "ally",
    index: 0,
  });

  // History stack for Undo
  const [historyStack, setHistoryStack] = useState<
    {
      allyBans: (string | null)[];
      enemyBans: (string | null)[];
      alliedTeam: (string | null)[];
      enemyTeam: (string | null)[];
      activeSlot: SlotType | null;
    }[]
  >([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<HeroRole | "All" | "Comfort">("All");

  // Load comfort players
  useEffect(() => {
    const loaded = getComfortPlayers();
    setPlayers(loaded);

    // Auto assign initial 5 slots from loaded squad
    const roleSequence: LaneRole[] = ["gold", "hyper", "exp", "roamer", "mid"];
    const initialAssignments: SlotPlayerAssignment[] = roleSequence.map((role) => {
      const matchingPlayer = loaded.find((p) => p.primaryRole === role);
      return {
        playerId: matchingPlayer ? matchingPlayer.id : loaded[0]?.id || "",
        role,
      };
    });
    setSlotAssignments(initialAssignments);

    const handleUpdate = () => {
      setPlayers(getComfortPlayers());
    };
    window.addEventListener("sentinel_comfort_heroes_updated", handleUpdate);
    return () => window.removeEventListener("sentinel_comfort_heroes_updated", handleUpdate);
  }, []);

  // All taken names (ban + pick)
  const takenNames = useMemo(
    () =>
      new Set(
        [
          ...allyBans.filter(Boolean),
          ...enemyBans.filter(Boolean),
          ...alliedTeam.filter(Boolean),
          ...enemyTeam.filter(Boolean),
        ] as string[]
      ),
    [allyBans, enemyBans, alliedTeam, enemyTeam]
  );

  const bannedAll = useMemo(
    () => new Set([...allyBans.filter(Boolean), ...enemyBans.filter(Boolean)] as string[]),
    [allyBans, enemyBans]
  );

  // Get player assigned to active allied pick slot
  const activeAssignedPlayer = useMemo(() => {
    if (!activeSlot || activeSlot.team !== "ally" || activeSlot.phase !== "pick") return null;
    const assignment = slotAssignments[activeSlot.index];
    if (!assignment) return null;
    const p = players.find((pl) => pl.id === assignment.playerId);
    if (!p) return null;
    return { player: p, role: assignment.role };
  }, [activeSlot, slotAssignments, players]);

  // Comfort heroes for the active player in their role
  const activePlayerComfortHeroes = useMemo(() => {
    if (!activeAssignedPlayer) return [];
    return activeAssignedPlayer.player.comfortHeroes?.[activeAssignedPlayer.role] || [];
  }, [activeAssignedPlayer]);

  // Set of comfort hero names for the active player
  const activePlayerComfortNames = useMemo(() => {
    if (!activeAssignedPlayer) return new Set<string>();
    const names = new Set<string>();
    const pool = activeAssignedPlayer.player.comfortHeroes?.[activeAssignedPlayer.role] || [];
    pool.forEach((h) => names.add(h.heroName.toLowerCase()));
    return names;
  }, [activeAssignedPlayer]);

  // Push state to undo stack
  const pushHistory = () => {
    setHistoryStack((prev) => [
      ...prev.slice(-15),
      {
        allyBans: [...allyBans],
        enemyBans: [...enemyBans],
        alliedTeam: [...alliedTeam],
        enemyTeam: [...enemyTeam],
        activeSlot,
      },
    ]);
  };

  // Undo last action
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setAllyBans(prev.allyBans);
    setEnemyBans(prev.enemyBans);
    setAlliedTeam(prev.alliedTeam);
    setEnemyTeam(prev.enemyTeam);
    setActiveSlot(prev.activeSlot);
    setHistoryStack((s) => s.slice(0, -1));
  };

  // Auto-advance logic
  const autoAdvance = (current: SlotType) => {
    const { phase, team, index } = current;

    if (phase === "ban") {
      if (team === "ally") {
        setActiveSlot({ phase: "ban", team: "enemy", index });
      } else {
        if (index < banCount - 1) {
          setActiveSlot({ phase: "ban", team: "ally", index: index + 1 });
        } else {
          setActiveSlot({ phase: "pick", team: "ally", index: 0 });
        }
      }
    } else {
      if (team === "ally") {
        setActiveSlot({ phase: "pick", team: "enemy", index });
      } else {
        if (index < 4) {
          setActiveSlot({ phase: "pick", team: "ally", index: index + 1 });
        } else {
          setActiveSlot(null);
        }
      }
    }
  };

  const handleSelect = (heroName: string) => {
    if (!activeSlot || takenNames.has(heroName)) return;
    pushHistory();

    const { phase, team, index } = activeSlot;

    if (phase === "ban") {
      if (team === "ally") {
        const next = [...allyBans];
        next[index] = heroName;
        setAllyBans(next);
      } else {
        const next = [...enemyBans];
        next[index] = heroName;
        setEnemyBans(next);
      }
    } else {
      if (team === "ally") {
        const next = [...alliedTeam];
        next[index] = heroName;
        setAlliedTeam(next);
      } else {
        const next = [...enemyTeam];
        next[index] = heroName;
        setEnemyTeam(next);
      }
    }

    autoAdvance(activeSlot);
    setSearchQuery("");
  };

  const handleRemoveBan = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    if (team === "ally") {
      const n = [...allyBans];
      n[index] = null;
      setAllyBans(n);
    } else {
      const n = [...enemyBans];
      n[index] = null;
      setEnemyBans(n);
    }
    setActiveSlot({ phase: "ban", team, index });
  };

  const handleRemovePick = (team: "ally" | "enemy", index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    if (team === "ally") {
      const n = [...alliedTeam];
      n[index] = null;
      setAlliedTeam(n);
    } else {
      const n = [...enemyTeam];
      n[index] = null;
      setEnemyTeam(n);
    }
    setActiveSlot({ phase: "pick", team, index });
  };

  const handleResetDraft = () => {
    if (confirm("Reset the entire draft? All picks and bans will be cleared.")) {
      pushHistory();
      setAllyBans([null, null, null, null, null]);
      setEnemyBans([null, null, null, null, null]);
      setAlliedTeam([null, null, null, null, null]);
      setEnemyTeam([null, null, null, null, null]);
      setActiveSlot({ phase: "ban", team: "ally", index: 0 });
    }
  };

  const handleModeChange = (m: DraftMode) => {
    setMode(m);
    setAllyBans([null, null, null, null, null]);
    setEnemyBans([null, null, null, null, null]);
    setAlliedTeam([null, null, null, null, null]);
    setEnemyTeam([null, null, null, null, null]);
    setActiveSlot({ phase: "ban", team: "ally", index: 0 });
    setHistoryStack([]);
  };

  // Hero list filtering
  const filteredHeroes = useMemo(() => {
    return ALL_HEROES.filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedRole === "Comfort") {
        return matchesSearch && activePlayerComfortNames.has(h.name.toLowerCase());
      }
      const matchesRole = selectedRole === "All" || h.role.includes(selectedRole);
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, selectedRole, activePlayerComfortNames]);

  // Detect if enemy banned any comfort hero from our squad
  const enemyBannedComforts = useMemo(() => {
    const banned = new Set(enemyBans.filter(Boolean) as string[]);
    const list: { heroName: string; playerName: string; role: LaneRole; tier: ComfortTier }[] = [];

    slotAssignments.forEach((assign) => {
      const p = players.find((pl) => pl.id === assign.playerId);
      if (!p) return;
      const pool = p.comfortHeroes?.[assign.role] || [];
      pool.forEach((c) => {
        if (banned.has(c.heroName)) {
          list.push({ heroName: c.heroName, playerName: p.name, role: assign.role, tier: c.tier });
        }
      });
    });

    return list;
  }, [enemyBans, slotAssignments, players]);

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* ── TOP ACTION & HEADER BAR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">
              Draft Simulator
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/20 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500" /> Comfort Heroes Integrated
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
            Fast, intuitive competitive drafting. Click any slot to activate, pick from comfort pools, and lock in champions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {historyStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Undo last action"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
          )}

          <button
            onClick={handleResetDraft}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Reset draft"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Draft
          </button>

          <Link
            href="/dashboard/comfort-heroes"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 shadow-sm"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Edit Comfort Pools
          </Link>

          {/* Mode Switcher */}
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
            {(["ranked", "tournament"] as DraftMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mode === m
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm font-black"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                {m === "ranked" ? "Ranked" : "Tournament"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Ban Warning Alert */}
      {enemyBannedComforts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="text-xs text-rose-700 dark:text-rose-300">
            <span className="font-black uppercase tracking-wider">Enemy Target Ban:</span>{" "}
            Enemy banned{" "}
            {enemyBannedComforts.map((b, i) => (
              <span key={i} className="font-extrabold underline underline-offset-2">
                {b.playerName}&apos;s {b.heroName} ({b.role.toUpperCase()})
                {i < enemyBannedComforts.length - 1 ? ", " : ""}
              </span>
            ))}
            . Check backup comfort picks below!
          </div>
        </div>
      )}

      {/* ── MAIN ESPORTS DRAFT BOARD ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT: ALLIED TEAM (3 cols) ──────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
              <h2 className="font-black text-sm text-neutral-900 dark:text-white tracking-wide uppercase">
                Allied Squad (Blue)
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              5 Roster
            </span>
          </div>

          {/* Allied Bans */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Bans ({banCount})
            </span>
            <div className="flex gap-1.5 justify-between">
              {Array.from({ length: banCount }).map((_, i) => (
                <BanSlot
                  key={`ally-ban-${i}`}
                  heroName={allyBans[i]}
                  team="ally"
                  active={
                    activeSlot?.phase === "ban" &&
                    activeSlot?.team === "ally" &&
                    activeSlot?.index === i
                  }
                  onClick={() => setActiveSlot({ phase: "ban", team: "ally", index: i })}
                  onRemove={(e) => handleRemoveBan("ally", i, e)}
                />
              ))}
            </div>
          </div>

          {/* Allied Picks */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Picks (1-5)
            </span>
            <div className="flex flex-col gap-2">
              {alliedTeam.map((heroName, i) => {
                const assignment = slotAssignments[i];
                const playerObj = assignment ? players.find((p) => p.id === assignment.playerId) : null;
                const assignedPlayerInfo = playerObj ? { player: playerObj, role: assignment.role } : null;

                let comfortBadge: { tier: ComfortTier; label: string } | null = null;
                if (heroName && playerObj) {
                  const pool = playerObj.comfortHeroes?.[assignment.role] || [];
                  const found = pool.find((c) => c.heroName.toLowerCase() === heroName.toLowerCase());
                  if (found) {
                    comfortBadge = {
                      tier: found.tier,
                      label: COMFORT_TIERS[found.tier]?.badge || "Comfort",
                    };
                  }
                }

                return (
                  <PickSlot
                    key={`ally-${i}`}
                    heroName={heroName}
                    team="ally"
                    active={
                      activeSlot?.phase === "pick" &&
                      activeSlot?.team === "ally" &&
                      activeSlot?.index === i
                    }
                    onClick={() => setActiveSlot({ phase: "pick", team: "ally", index: i })}
                    onRemove={(e) => handleRemovePick("ally", i, e)}
                    index={i}
                    assignedPlayer={assignedPlayerInfo}
                    comfortBadge={comfortBadge}
                    onOpenPlayerSelector={(e) => {
                      e.stopPropagation();
                      setEditingSlotIdx(i);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CENTER: SELECTION HUB & COMFORT POOL (6 cols) ───────────────── */}
        <div className="lg:col-span-6 flex flex-col gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm">
          {/* Active Action Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-3 h-3 rounded-full animate-pulse ${
                  activeSlot?.team === "ally"
                    ? "bg-indigo-500 shadow-indigo-500/50"
                    : activeSlot?.team === "enemy"
                    ? "bg-rose-500 shadow-rose-500/50"
                    : "bg-neutral-400"
                }`}
              />
              <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                {activeSlot ? (
                  <>
                    <span className={activeSlot.team === "ally" ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}>
                      {activeSlot.team === "ally" ? "Blue Team" : "Red Team"}
                    </span>{" "}
                    • {activeSlot.phase === "ban" ? "Ban" : "Pick"} Slot {activeSlot.index + 1}
                    {activeAssignedPlayer && activeSlot.phase === "pick" && (
                      <span className="ml-2 font-bold text-neutral-500">
                        ({activeAssignedPlayer.player.name} • {activeAssignedPlayer.role.toUpperCase()})
                      </span>
                    )}
                  </>
                ) : (
                  "Draft Finished"
                )}
              </span>
            </div>

            {activeSlot && (
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Select from Grid
              </span>
            )}
          </div>

          {/* DYNAMIC 1-CLICK COMFORT HEROES BAR (When picking for Allied Slot) */}
          {activeAssignedPlayer && activePlayerComfortHeroes.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                    {activeAssignedPlayer.player.name}&apos;s Comfort Heroes ({activeAssignedPlayer.role.toUpperCase()})
                  </span>
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider">
                  ⚡ 1-Click Pick
                </span>
              </div>

              {/* Horizontal Scrollable Comfort Cards */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {activePlayerComfortHeroes.map((entry, idx) => {
                  const isBanned = bannedAll.has(entry.heroName);
                  const isTaken = takenNames.has(entry.heroName);
                  const disabled = isBanned || isTaken;
                  const tierInfo = COMFORT_TIERS[entry.tier] || COMFORT_TIERS.comfort;

                  return (
                    <button
                      key={`${entry.heroName}-${idx}`}
                      disabled={disabled}
                      onClick={() => !disabled && handleSelect(entry.heroName)}
                      className={`flex items-center gap-2 p-2 rounded-xl border shrink-0 transition-all text-left ${
                        disabled
                          ? "opacity-35 cursor-not-allowed border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
                          : "bg-white dark:bg-neutral-900 border-amber-400 dark:border-amber-600 hover:border-amber-500 hover:scale-105 shadow-sm active:scale-95 cursor-pointer"
                      }`}
                    >
                      <HeroAvatar name={entry.heroName} size="xs" crossed={isBanned} />
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-neutral-900 dark:text-white truncate">
                            {entry.heroName}
                          </span>
                          <span className="text-[9px]">{tierInfo.icon}</span>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 block truncate">
                          {isBanned ? "Banned" : isTaken ? "Picked" : entry.note || tierInfo.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search heroes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {activeAssignedPlayer && activePlayerComfortHeroes.length > 0 && (
                <button
                  onClick={() => setSelectedRole(selectedRole === "Comfort" ? "All" : "Comfort")}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1 shrink-0 ${
                    selectedRole === "Comfort"
                      ? "bg-amber-500 text-black border-amber-500 shadow-sm"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  {activeAssignedPlayer.player.name}&apos;s Pool ({activePlayerComfortHeroes.length})
                </button>
              )}

              {(["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as const).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                      selectedRole === role
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white shadow-sm font-black"
                        : "bg-neutral-100 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    {role}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Hero Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredHeroes.map((hero) => {
              const isBanned = bannedAll.has(hero.name);
              const taken = takenNames.has(hero.name);
              const disabled = taken || isBanned;
              const isComfort = activePlayerComfortNames.has(hero.name.toLowerCase());
              const comfortTier = isComfort
                ? activePlayerComfortHeroes.find(
                    (c) => c.heroName.toLowerCase() === hero.name.toLowerCase()
                  )?.tier
                : undefined;

              return (
                <HeroGridCard
                  key={hero.id}
                  hero={hero}
                  disabled={disabled}
                  isBanned={isBanned}
                  isComfort={isComfort}
                  comfortTier={comfortTier}
                  onSelect={() => !disabled && handleSelect(hero.name)}
                />
              );
            })}
            {filteredHeroes.length === 0 && (
              <div className="col-span-full py-16 text-center text-neutral-400 font-bold text-xs">
                No matching heroes found.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: ENEMY TEAM (3 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-3xl shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <h2 className="font-black text-sm text-neutral-900 dark:text-white tracking-wide uppercase">
                Enemy Team (Red)
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              Opponent
            </span>
          </div>

          {/* Enemy Bans */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Bans ({banCount})
            </span>
            <div className="flex gap-1.5 justify-between">
              {Array.from({ length: banCount }).map((_, i) => (
                <BanSlot
                  key={`enemy-ban-${i}`}
                  heroName={enemyBans[i]}
                  team="enemy"
                  active={
                    activeSlot?.phase === "ban" &&
                    activeSlot?.team === "enemy" &&
                    activeSlot?.index === i
                  }
                  onClick={() => setActiveSlot({ phase: "ban", team: "enemy", index: i })}
                  onRemove={(e) => handleRemoveBan("enemy", i, e)}
                />
              ))}
            </div>
          </div>

          {/* Enemy Picks */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Picks (1-5)
            </span>
            <div className="flex flex-col gap-2">
              {enemyTeam.map((heroName, i) => (
                <PickSlot
                  key={`enemy-${i}`}
                  heroName={heroName}
                  team="enemy"
                  active={
                    activeSlot?.phase === "pick" &&
                    activeSlot?.team === "enemy" &&
                    activeSlot?.index === i
                  }
                  onClick={() => setActiveSlot({ phase: "pick", team: "enemy", index: i })}
                  onRemove={(e) => handleRemovePick("enemy", i, e)}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: SQUAD COMFORT ROSTER MATRIX ────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                Squad Draft Pool Monitor
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Live availability of your 5 drafted players&apos; comfort pools.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/comfort-heroes"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Manage Pools <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 5 Column Grid for the 5 Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {slotAssignments.map((assign, slotIdx) => {
            const p = players.find((pl) => pl.id === assign.playerId);
            const roleInfo = LANE_ROLES.find((r) => r.key === assign.role);
            const pool = p ? p.comfortHeroes?.[assign.role] || [] : [];
            const pickedHeroInSlot = alliedTeam[slotIdx];

            return (
              <div
                key={slotIdx}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 flex flex-col gap-2.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={roleInfo?.textClass}>
                        {getRoleIcon(assign.role, "w-3 h-3")}
                      </span>
                      <span className="font-black text-xs text-neutral-900 dark:text-white truncate">
                        {p?.name || `Slot ${slotIdx + 1}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Pick {slotIdx + 1} • {roleInfo?.shortLabel}
                    </span>
                  </div>

                  <button
                    onClick={() => setEditingSlotIdx(slotIdx)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded"
                    title="Change player/role"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Picked Status Badge */}
                {pickedHeroInSlot && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <HeroAvatar name={pickedHeroInSlot} size="xs" />
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate">
                      Picked: {pickedHeroInSlot}
                    </span>
                  </div>
                )}

                {/* Hero list */}
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-0.5">
                  {pool.length === 0 ? (
                    <span className="text-[10px] text-neutral-400 italic py-2">
                      No heroes configured
                    </span>
                  ) : (
                    pool.map((entry, idx) => {
                      const isBanned = bannedAll.has(entry.heroName);
                      const isTaken = takenNames.has(entry.heroName);
                      const isPickedByAlly = alliedTeam.includes(entry.heroName);

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!isBanned && !isTaken && activeSlot && activeSlot.team === "ally") {
                              handleSelect(entry.heroName);
                            }
                          }}
                          className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-all ${
                            isBanned
                              ? "bg-rose-500/10 text-rose-500 line-through opacity-60"
                              : isTaken
                              ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                              : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800 cursor-pointer text-neutral-800 dark:text-neutral-200"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <HeroAvatar name={entry.heroName} size="xs" crossed={isBanned} />
                            <span className="font-extrabold text-[11px] truncate">
                              {entry.heroName}
                            </span>
                          </div>
                          <span className="text-[9px] font-black shrink-0">
                            {isBanned ? (
                              <span className="text-rose-500">Banned</span>
                            ) : isPickedByAlly ? (
                              <span className="text-indigo-500">Picked</span>
                            ) : isTaken ? (
                              <span className="text-neutral-400">Taken</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Ready
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL: CHANGE PLAYER / ROLE FOR SLOT ───────────────────────────── */}
      <AnimatePresence>
        {editingSlotIdx !== null && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Assign Slot {editingSlotIdx + 1}
                </h3>
                <button
                  onClick={() => setEditingSlotIdx(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Select Player */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Select Player
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1">
                  {players.map((p) => {
                    const isSelected = slotAssignments[editingSlotIdx]?.playerId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const updated = [...slotAssignments];
                          updated[editingSlotIdx] = {
                            ...updated[editingSlotIdx],
                            playerId: p.id,
                          };
                          setSlotAssignments(updated);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 font-black text-neutral-900 dark:text-white"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs">
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Role for this slot */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Select Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LANE_ROLES.map((role) => {
                    const isSelected = slotAssignments[editingSlotIdx]?.role === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => {
                          const updated = [...slotAssignments];
                          updated[editingSlotIdx] = {
                            ...updated[editingSlotIdx],
                            role: role.key,
                          };
                          setSlotAssignments(updated);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? `${role.bgLightClass} ${role.borderClass} ring-2 ring-indigo-500/20 font-black`
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {getRoleIcon(role.key, `w-3.5 h-3.5 ${role.textClass}`)}
                        <span className="text-xs font-bold">{role.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setEditingSlotIdx(null)}
                  className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
