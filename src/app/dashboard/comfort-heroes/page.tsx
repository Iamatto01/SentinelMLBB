"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Plus,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  Sparkles,
  Shield,
  Crosshair,
  Zap,
  Sword,
  Flame,
  RotateCcw,
  RefreshCw,
  Users,
  Award,
  ChevronRight,
  Info,
} from "lucide-react";
import { ALL_HEROES, getHeroByName, HeroRole } from "@/data/heroes-data";
import {
  LaneRole,
  LANE_ROLES,
  ComfortTier,
  COMFORT_TIERS,
  ComfortHeroEntry,
  PlayerProfile,
  getComfortPlayers,
  saveComfortPlayers,
  addComfortHero,
  removeComfortHero,
  addPlayer,
  updatePlayer,
  deletePlayer,
  resetToDefaultComfortHeroes,
  syncPlayersFromTeamManagement,
} from "@/lib/comfortHeroes";

function getRoleIcon(role: LaneRole, className = "w-4 h-4") {
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

export default function ComfortHeroesPage() {
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [activeRoleTab, setActiveRoleTab] = useState<LaneRole>("gold");
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  // Modal States
  const [isAddHeroModalOpen, setIsAddHeroModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<LaneRole>("gold");
  const [selectedHeroToAdd, setSelectedHeroToAdd] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<ComfortTier>("priority");
  const [heroNote, setHeroNote] = useState("");
  const [heroPickerSearch, setHeroPickerSearch] = useState("");
  const [heroPickerRoleFilter, setHeroPickerRoleFilter] = useState<HeroRole | "All">("All");

  // Player Management Modal
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRole, setNewPlayerRole] = useState<LaneRole>("gold");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const loaded = getComfortPlayers();
    setPlayers(loaded);
    if (loaded.length > 0) {
      setSelectedPlayerId(loaded[0].id);
      setActiveRoleTab(loaded[0].primaryRole || "gold");
    }

    const handleUpdate = () => {
      setPlayers(getComfortPlayers());
    };
    window.addEventListener("sentinel_comfort_heroes_updated", handleUpdate);
    return () => window.removeEventListener("sentinel_comfort_heroes_updated", handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const selectedPlayer = useMemo(() => {
    return players.find((p) => p.id === selectedPlayerId) || players[0] || null;
  }, [players, selectedPlayerId]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalComfortEntries = 0;
    const heroUsageMap: Record<string, number> = {};

    players.forEach((p) => {
      Object.values(p.comfortHeroes || {}).forEach((entries) => {
        entries.forEach((e) => {
          totalComfortEntries++;
          heroUsageMap[e.heroName] = (heroUsageMap[e.heroName] || 0) + 1;
        });
      });
    });

    const topHero = Object.entries(heroUsageMap).sort((a, b) => b[1] - a[1])[0];

    return {
      totalPlayers: players.length,
      totalComfortEntries,
      topHero: topHero ? `${topHero[0]} (${topHero[1]}x)` : "None yet",
    };
  }, [players]);

  // Open Add Hero modal for specific role
  const handleOpenAddHeroModal = (role: LaneRole) => {
    setModalRole(role);
    setSelectedHeroToAdd(null);
    setSelectedTier("priority");
    setHeroNote("");
    setHeroPickerSearch("");

    // Set smart default role filter
    const roleInfo = LANE_ROLES.find((r) => r.key === role);
    if (roleInfo && roleInfo.defaultHeroRoles.length > 0) {
      setHeroPickerRoleFilter(roleInfo.defaultHeroRoles[0] as HeroRole);
    } else {
      setHeroPickerRoleFilter("All");
    }

    setIsAddHeroModalOpen(true);
  };

  // Save hero to player's comfort pool
  const handleSaveHero = () => {
    if (!selectedPlayer || !selectedHeroToAdd) return;

    const entry: ComfortHeroEntry = {
      heroName: selectedHeroToAdd,
      tier: selectedTier,
      note: heroNote.trim() || undefined,
    };

    const updated = addComfortHero(selectedPlayer.id, modalRole, entry);
    setPlayers(updated);
    setIsAddHeroModalOpen(false);
    showToast(`Added ${selectedHeroToAdd} to ${selectedPlayer.name}'s ${modalRole.toUpperCase()} pool!`);
  };

  // Remove hero from player's comfort pool
  const handleRemoveHero = (role: LaneRole, heroName: string) => {
    if (!selectedPlayer) return;
    const updated = removeComfortHero(selectedPlayer.id, role, heroName);
    setPlayers(updated);
    showToast(`Removed ${heroName} from ${selectedPlayer.name}'s pool`);
  };

  // Add / Edit Player
  const handleSavePlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    if (editingPlayerId) {
      const updated = updatePlayer(editingPlayerId, {
        name: trimmed,
        primaryRole: newPlayerRole,
      });
      setPlayers(updated);
      showToast(`Updated player ${trimmed}`);
    } else {
      const updated = addPlayer(trimmed, newPlayerRole);
      setPlayers(updated);
      const newP = updated[updated.length - 1];
      if (newP) {
        setSelectedPlayerId(newP.id);
        setActiveRoleTab(newP.primaryRole);
      }
      showToast(`Added new player: ${trimmed}`);
    }

    setIsPlayerModalOpen(false);
    setNewPlayerName("");
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = (playerId: string, name: string) => {
    if (players.length <= 1) {
      alert("At least one player is required.");
      return;
    }
    if (confirm(`Are you sure you want to delete player "${name}"?`)) {
      const updated = deletePlayer(playerId);
      setPlayers(updated);
      if (selectedPlayerId === playerId && updated.length > 0) {
        setSelectedPlayerId(updated[0].id);
        setActiveRoleTab(updated[0].primaryRole);
      }
      showToast(`Deleted player ${name}`);
    }
  };

  const handleSyncSquad = () => {
    const synced = syncPlayersFromTeamManagement();
    setPlayers(synced);
    showToast("Synced roster with Team Management!");
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all players and comfort heroes to official Sentinel defaults?")) {
      const reset = resetToDefaultComfortHeroes();
      setPlayers(reset);
      if (reset.length > 0) {
        setSelectedPlayerId(reset[0].id);
        setActiveRoleTab(reset[0].primaryRole);
      }
      showToast("Reset to default Sentinel roster!");
    }
  };

  // Filtered heroes for hero picker
  const filteredPickerHeroes = useMemo(() => {
    const existingInRole = new Set(
      (selectedPlayer?.comfortHeroes?.[modalRole] || []).map((h) => h.heroName.toLowerCase())
    );

    return ALL_HEROES.filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(heroPickerSearch.toLowerCase());
      const matchesRole =
        heroPickerRoleFilter === "All" || h.role.includes(heroPickerRoleFilter);
      return matchesSearch && matchesRole;
    }).map((h) => ({
      ...h,
      alreadyInRole: existingInRole.has(h.name.toLowerCase()),
    }));
  }, [selectedPlayer, modalRole, heroPickerSearch, heroPickerRoleFilter]);

  if (!mounted) {
    return (
      <div className="p-8 text-neutral-500 font-semibold flex items-center gap-2">
        <Sparkles className="w-5 h-5 animate-spin text-amber-500" />
        Loading Comfort Heroes...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 bg-neutral-900 text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs border border-neutral-700 dark:border-neutral-200"
          >
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 p-6 rounded-3xl border border-amber-500/20 dark:border-amber-500/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </span>
            <span className="text-xs font-black tracking-widest uppercase text-amber-600 dark:text-amber-400">
              Sentinel Squad System
            </span>
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500">
            Comfort Heroes & Role Pools
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-2xl font-medium">
            Manage comfort hero pools for every squad player across all 5 roles. Seamlessly synchronized with the{" "}
            <Link href="/dashboard/draft" className="text-indigo-500 underline font-bold hover:text-indigo-600">
              Draft Simulator
            </Link>{" "}
            for intelligent draft recommendations and 1-click comfort picks.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingPlayerId(null);
              setNewPlayerName("");
              setNewPlayerRole("gold");
              setIsPlayerModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Player
          </button>

          <button
            onClick={handleSyncSquad}
            title="Import names from Team Management"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" /> Sync Team
          </button>

          <button
            onClick={handleResetDefaults}
            title="Reset to default Sentinel MLBB lineup"
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-500 dark:text-neutral-400 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <Link
            href="/dashboard/draft"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold rounded-xl text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" /> Open Draft Simulator
          </Link>
        </div>
      </div>

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Squad Players</p>
            <p className="text-xl font-black text-neutral-800 dark:text-white">{stats.totalPlayers} Players</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Comfort Picks</p>
            <p className="text-xl font-black text-neutral-800 dark:text-white">{stats.totalComfortEntries} Configured</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Most Registered Hero</p>
            <p className="text-xl font-black text-neutral-800 dark:text-white truncate">{stats.topHero}</p>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Player List, Right Role & Comfort Heroes Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Player Selector Cards (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Select Player ({players.length})
            </h2>
            <button
              onClick={() => {
                setEditingPlayerId(null);
                setNewPlayerName("");
                setNewPlayerRole("gold");
                setIsPlayerModalOpen(true);
              }}
              className="text-xs text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[680px] overflow-y-auto pr-1">
            {players.map((p) => {
              const isSelected = p.id === selectedPlayerId;
              const primaryRoleInfo = LANE_ROLES.find((r) => r.key === p.primaryRole);
              
              // Count heroes for this player
              const count = Object.values(p.comfortHeroes || {}).reduce(
                (acc, arr) => acc + (arr ? arr.length : 0),
                0
              );

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlayerId(p.id);
                    if (p.primaryRole) setActiveRoleTab(p.primaryRole);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white shadow-lg scale-[1.01]"
                      : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-neutral-700 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm truncate">{p.name}</span>
                        {p.isMainRoster && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                              isSelected
                                ? "bg-amber-400 text-black"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                            }`}
                          >
                            Main
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span
                          className={`flex items-center gap-1 font-semibold text-[11px] ${
                            isSelected ? "opacity-90" : primaryRoleInfo?.textClass
                          }`}
                        >
                          {getRoleIcon(p.primaryRole, "w-3 h-3")}
                          {primaryRoleInfo?.shortLabel}
                        </span>
                        <span className={isSelected ? "text-white/60 dark:text-black/60" : "text-neutral-400"}>
                          •
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            isSelected ? "text-white/70 dark:text-black/70" : "text-neutral-400"
                          }`}
                        >
                          {count} heroes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayerId(p.id);
                        setNewPlayerName(p.name);
                        setNewPlayerRole(p.primaryRole);
                        setIsPlayerModalOpen(true);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? "hover:bg-white/20 dark:hover:bg-black/10 text-white dark:text-black"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
                      }`}
                      title="Edit player"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlayer(p.id, p.name);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? "hover:bg-rose-500/30 text-rose-300"
                          : "hover:bg-rose-50 dark:hover:bg-rose-950/20 text-neutral-400 hover:text-rose-500"
                      }`}
                      title="Delete player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Roles & Comfort Heroes for Selected Player (8 cols) */}
        {selectedPlayer && (
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Player Banner & Role Selector Tabs */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {selectedPlayer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                        {selectedPlayer.name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-bold text-neutral-600 dark:text-neutral-300">
                        Primary: {LANE_ROLES.find((r) => r.key === selectedPlayer.primaryRole)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Configure comfort heroes for each role below. All roles are accessible during draft.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAddHeroModal(activeRoleTab)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl text-xs font-black shadow-md transition-all self-end sm:self-center"
                >
                  <Plus className="w-4 h-4" /> Add Hero to {LANE_ROLES.find((r) => r.key === activeRoleTab)?.shortLabel}
                </button>
              </div>

              {/* 5 Lane Roles Navigation Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {LANE_ROLES.map((role) => {
                  const isActive = activeRoleTab === role.key;
                  const count = (selectedPlayer.comfortHeroes?.[role.key] || []).length;

                  return (
                    <button
                      key={role.key}
                      onClick={() => setActiveRoleTab(role.key)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center relative ${
                        isActive
                          ? `${role.bgLightClass} ${role.borderClass} ring-2 ring-indigo-500/20 shadow-sm`
                          : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <div className={`p-2 rounded-xl mb-1.5 ${isActive ? "bg-white dark:bg-neutral-900 shadow-sm" : ""}`}>
                        {getRoleIcon(role.key, `w-5 h-5 ${role.textClass}`)}
                      </div>
                      <span className={`text-xs font-extrabold ${isActive ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"}`}>
                        {role.shortLabel}
                      </span>
                      <span
                        className={`text-[10px] mt-0.5 px-2 py-0.2 rounded-full font-bold ${
                          count > 0
                            ? role.badgeClass
                            : "text-neutral-400 dark:text-neutral-500"
                        }`}
                      >
                        {count} {count === 1 ? "hero" : "heroes"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Role's Hero List Section */}
            {(() => {
              const currentRoleInfo = LANE_ROLES.find((r) => r.key === activeRoleTab)!;
              const heroesInRole = selectedPlayer.comfortHeroes?.[activeRoleTab] || [];

              return (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${currentRoleInfo.bgLightClass} ${currentRoleInfo.textClass}`}>
                        {getRoleIcon(currentRoleInfo.key, "w-4 h-4")}
                      </div>
                      <div>
                        <h4 className="font-black text-neutral-900 dark:text-white text-base flex items-center gap-2">
                          {currentRoleInfo.label} Comfort Pool
                        </h4>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          {heroesInRole.length} comfort {heroesInRole.length === 1 ? "hero" : "heroes"} registered for {selectedPlayer.name}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAddHeroModal(activeRoleTab)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Hero
                    </button>
                  </div>

                  {/* Hero Cards Grid */}
                  {heroesInRole.length === 0 ? (
                    <div className="py-14 text-center flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-neutral-400">
                        {getRoleIcon(currentRoleInfo.key, "w-8 h-8")}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-neutral-700 dark:text-neutral-300">
                          No comfort heroes added for {currentRoleInfo.label} yet
                        </p>
                        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                          Add {selectedPlayer.name}&apos;s signature and comfort champions for this role so they appear highlighted during Draft Simulator.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddHeroModal(activeRoleTab)}
                        className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        <Plus className="w-4 h-4" /> Add First Comfort Hero
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {heroesInRole.map((entry, idx) => {
                        const heroData = getHeroByName(entry.heroName);
                        const tierInfo = COMFORT_TIERS[entry.tier] || COMFORT_TIERS.comfort;

                        return (
                          <motion.div
                            key={`${entry.heroName}-${idx}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 flex items-start gap-3.5 group hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-md transition-all"
                          >
                            {/* Hero Avatar */}
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-300 dark:border-neutral-700 shadow-inner relative">
                              {heroData?.image ? (
                                <img
                                  src={heroData.image}
                                  alt={entry.heroName}
                                  className="w-full h-full object-cover object-top"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-neutral-400 text-sm">
                                  {entry.heroName.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <h5 className="font-black text-sm text-neutral-900 dark:text-neutral-100 truncate">
                                  {entry.heroName}
                                </h5>
                                <button
                                  onClick={() => handleRemoveHero(activeRoleTab, entry.heroName)}
                                  className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                  title="Remove hero"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${tierInfo.colorClass}`}>
                                  {tierInfo.badge}
                                </span>
                                {heroData?.role?.map((r) => (
                                  <span
                                    key={r}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200/70 dark:bg-neutral-750 text-neutral-600 dark:text-neutral-400 font-semibold"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>

                              {entry.note ? (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-150 dark:border-neutral-800">
                                  💡 {entry.note}
                                </p>
                              ) : (
                                <p className="text-[11px] text-neutral-400 italic">No notes added.</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Tip Banner */}
                  <div className="mt-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">
                        Comfort heroes will show up with a <strong>⭐ Comfort Badge</strong> in the Draft Simulator when picking for {selectedPlayer.name}.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/draft"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0 hover:underline"
                    >
                      Try in Draft <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── MODAL: Add Comfort Hero ────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddHeroModalOpen && selectedPlayer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-neutral-900 dark:text-white">
                      Add Comfort Hero
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Player: <span className="font-bold text-indigo-500">{selectedPlayer.name}</span> | Role:{" "}
                      <span className="font-bold uppercase text-neutral-700 dark:text-neutral-300">{modalRole}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddHeroModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Select Hero from Grid with Search */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  1. Select Hero ({filteredPickerHeroes.length} available)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search hero by name..."
                      value={heroPickerSearch}
                      onChange={(e) => setHeroPickerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {(["All", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setHeroPickerRoleFilter(r)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                          heroPickerRoleFilter === r
                            ? "bg-indigo-600 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hero selection scroll list */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto p-1 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/40">
                  {filteredPickerHeroes.map((hero) => {
                    const isSelected = selectedHeroToAdd === hero.name;
                    return (
                      <button
                        key={hero.id}
                        onClick={() => setSelectedHeroToAdd(hero.name)}
                        className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all select-none ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30 scale-105"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 mb-1 relative">
                          {hero.image ? (
                            <img
                              src={hero.image}
                              alt={hero.name}
                              className="w-full h-full object-cover object-top"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                              {hero.name.charAt(0)}
                            </div>
                          )}
                          {hero.alreadyInRole && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-400" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black truncate w-full text-neutral-800 dark:text-neutral-200">
                          {hero.name}
                        </span>
                        {hero.alreadyInRole && (
                          <span className="text-[8px] text-emerald-500 font-bold">Added</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Tier & Priority */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  2. Comfort Level / Tier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(COMFORT_TIERS) as ComfortTier[]).map((tierKey) => {
                    const cfg = COMFORT_TIERS[tierKey];
                    const isSelected = selectedTier === tierKey;
                    return (
                      <button
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Strategy Note */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  3. Strategy Note / Synergy (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter Ling, Fast invades, High win rate"
                  value={heroNote}
                  onChange={(e) => setHeroNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setIsAddHeroModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedHeroToAdd}
                  onClick={handleSaveHero}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all ${
                    selectedHeroToAdd
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 cursor-not-allowed"
                  }`}
                >
                  <Check className="w-4 h-4" /> Save {selectedHeroToAdd || "Hero"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Add / Edit Player ────────────────────────────────────────── */}
      <AnimatePresence>
        {isPlayerModalOpen && (
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
                  {editingPlayerId ? "Edit Player" : "Add New Player"}
                </h3>
                <button
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Player Name / IGN
                </label>
                <input
                  type="text"
                  placeholder="e.g. huehue, ryuu, zepho..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Primary Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LANE_ROLES.map((role) => {
                    const isSelected = newPlayerRole === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => setNewPlayerRole(role.key)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                          isSelected
                            ? `${role.bgLightClass} ${role.borderClass} ring-2 ring-indigo-500/20`
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                        }`}
                      >
                        {getRoleIcon(role.key, `w-4 h-4 ${role.textClass}`)}
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {role.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  disabled={!newPlayerName.trim()}
                  onClick={handleSavePlayer}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all disabled:opacity-50"
                >
                  Save Player
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
