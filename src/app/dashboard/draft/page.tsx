"use client";

import React, { useState, useMemo } from "react";
import { HEROES, evaluateCounters, getHeroByName, HeroInfo } from "@/lib/heroData";
import { Check, X, Search, Shield, Sword, ShieldAlert, Sparkles } from "lucide-react";

export default function DraftSimulatorPage() {
  const [alliedTeam, setAlliedTeam] = useState<(string | null)[]>([null, null, null, null, null]);
  const [enemyTeam, setEnemyTeam] = useState<(string | null)[]>([null, null, null, null, null]);
  
  const [activeSlot, setActiveSlot] = useState<{ team: 'ally' | 'enemy', index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectHero = (heroName: string) => {
    if (!activeSlot) return;
    
    // Prevent duplicate picks across both teams
    if (alliedTeam.includes(heroName) || enemyTeam.includes(heroName)) {
      return;
    }

    if (activeSlot.team === 'ally') {
      const newTeam = [...alliedTeam];
      newTeam[activeSlot.index] = heroName;
      setAlliedTeam(newTeam);
    } else {
      const newTeam = [...enemyTeam];
      newTeam[activeSlot.index] = heroName;
      setEnemyTeam(newTeam);
    }
    setActiveSlot(null);
    setSearchQuery("");
  };

  const handleRemoveHero = (team: 'ally' | 'enemy', index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === 'ally') {
      const newTeam = [...alliedTeam];
      newTeam[index] = null;
      setAlliedTeam(newTeam);
    } else {
      const newTeam = [...enemyTeam];
      newTeam[index] = null;
      setEnemyTeam(newTeam);
    }
  };

  const suggestions = useMemo(() => {
    const validAllies = alliedTeam.filter(Boolean) as string[];
    const validEnemies = enemyTeam.filter(Boolean) as string[];
    return evaluateCounters(validAllies, validEnemies);
  }, [alliedTeam, enemyTeam]);

  const topSuggestions = suggestions.slice(0, 5);
  const badPicks = [...suggestions].reverse().slice(0, 3).filter(s => s.score < 0);

  const filteredHeroes = HEROES.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">Draft Simulator</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Plan your team composition and find the best counter-picks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Teams Layout */}
        <div className="lg:col-span-8 flex flex-col md:flex-row gap-6">
          
          {/* Allied Team */}
          <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Allied Team</h2>
            </div>
            <div className="flex flex-col gap-3">
              {alliedTeam.map((heroName, i) => (
                <div 
                  key={`ally-${i}`}
                  onClick={() => setActiveSlot({ team: 'ally', index: i })}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    activeSlot?.team === 'ally' && activeSlot?.index === i
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                      : heroName 
                        ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" 
                        : "border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                  }`}
                >
                  {heroName ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {heroName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200">{heroName}</p>
                          <p className="text-xs text-neutral-500">{getHeroByName(heroName)?.roles.join(", ")}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleRemoveHero('ally', i, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-neutral-400 font-medium">Select Hero...</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Team */}
          <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Sword className="w-5 h-5 text-rose-500" />
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Enemy Team</h2>
            </div>
            <div className="flex flex-col gap-3">
              {enemyTeam.map((heroName, i) => (
                <div 
                  key={`enemy-${i}`}
                  onClick={() => setActiveSlot({ team: 'enemy', index: i })}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    activeSlot?.team === 'enemy' && activeSlot?.index === i
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10"
                      : heroName 
                        ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" 
                        : "border-dashed border-neutral-300 dark:border-neutral-700 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                  }`}
                >
                  {heroName ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold">
                          {heroName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200">{heroName}</p>
                          <p className="text-xs text-neutral-500">{getHeroByName(heroName)?.roles.join(", ")}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleRemoveHero('enemy', i, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-neutral-400 font-medium">Select Enemy...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suggestion Engine */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-200" />
              <h2 className="text-lg font-bold">Suggested Picks</h2>
            </div>
            
            {enemyTeam.every(h => h === null) ? (
              <p className="text-indigo-100 text-sm">Add enemy picks to see counter suggestions.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {topSuggestions.map((s, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-xs bg-indigo-900/50 px-2 py-0.5 rounded text-indigo-100">Score: {s.score}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {s.reasons.map((r, j) => (
                          <span key={j} className="text-xs text-indigo-100 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-300" /> {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {badPicks.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-500">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="text-lg font-bold">Avoid Picking</h2>
              </div>
              <div className="flex flex-col gap-3">
                {badPicks.map((s, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{s.name}</span>
                    <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded">Heavily Countered</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Selection Modal Overlay */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setActiveSlot(null)}>
          <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-neutral-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search heroes..." 
                className="flex-1 bg-transparent border-none outline-none text-neutral-800 dark:text-neutral-100"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setActiveSlot(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredHeroes.map(hero => {
                const isPicked = alliedTeam.includes(hero.name) || enemyTeam.includes(hero.name);
                return (
                  <div 
                    key={hero.name}
                    onClick={() => !isPicked && handleSelectHero(hero.name)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      isPicked 
                        ? "opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800"
                        : "cursor-pointer border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-500">
                      {hero.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm text-center text-neutral-800 dark:text-neutral-200">{hero.name}</span>
                  </div>
                );
              })}
              {filteredHeroes.length === 0 && (
                <div className="col-span-full py-10 text-center text-neutral-500">
                  No heroes found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
