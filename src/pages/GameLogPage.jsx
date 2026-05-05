import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { HEROES } from '../data/heroes';

const GameLogPage = () => {
  const { games, loading, addGame, updateGame, players } = useData();
  const { user } = useAuth();
  const [filterMode, setFilterMode] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [heroSearch, setHeroSearch] = useState(Array(5).fill(''));
  const [newGame, setNewGame] = useState({
    mode: 'Ranked',
    result: 'Win',
    duration: 15,
    notes: '',
    pairs: Array(5).fill(null).map(() => ({ player: '', hero: '' }))
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading && games.length === 0) return <div className="text-center py-20">Loading games...</div>;

  const filteredGames = filterMode === 'All' 
    ? games 
    : games.filter(g => g.mode === filterMode);

  const handlePairChange = (index, field, value) => {
    const updatedPairs = newGame.pairs.map((p, i) => i === index ? { ...p, [field]: value } : p);
    setNewGame({ ...newGame, pairs: updatedPairs });
    if (field === 'hero') {
      const newSearch = [...heroSearch];
      newSearch[index] = value;
      setHeroSearch(newSearch);
    }
  };

  const selectHero = (index, heroName) => {
    const updatedPairs = newGame.pairs.map((p, i) => i === index ? { ...p, hero: heroName } : p);
    setNewGame({ ...newGame, pairs: updatedPairs });
    const newSearch = [...heroSearch];
    newSearch[index] = '';
    setHeroSearch(newSearch);
  };

  const getFilteredHeroes = (idx) => {
    const search = heroSearch[idx]?.toLowerCase() || '';
    if (!search) return [];
    const selected = newGame.pairs.map(p => p.hero).filter(Boolean);
    return HEROES.filter(h => h.toLowerCase().includes(search) && !selected.includes(h)).slice(0, 6);
  };

  const openAddModal = () => {
    setEditingGame(null);
    setNewGame({
      mode: 'Ranked', result: 'Win', duration: 15, notes: '',
      pairs: Array(5).fill(null).map(() => ({ player: '', hero: '' }))
    });
    setHeroSearch(Array(5).fill(''));
    setIsModalOpen(true);
  };

  const openEditModal = (game) => {
    setEditingGame(game);
    const pairs = [];
    for (let i = 0; i < 5; i++) {
      pairs.push({
        player: game.players?.[i] || '',
        hero: game.heroes?.[i] || ''
      });
    }
    setNewGame({
      mode: game.mode || 'Ranked',
      result: game.result || 'Win',
      duration: game.duration || 0,
      notes: game.notes || '',
      pairs
    });
    setHeroSearch(Array(5).fill(''));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (editingGame) {
      await updateGame(editingGame.num, newGame);
    } else {
      await addGame(newGame);
    }
    setIsSubmitting(false);
    setIsModalOpen(false);
    setEditingGame(null);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold font-outfit mb-1">Game Log</h2>
          <p className="text-gray-400">View and manage your squad's match history.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">+ Add New Game</button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-6 flex-wrap">
          {['All', 'Ranked', 'Classic', 'Custom', 'Tour'].map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filterMode === mode 
                  ? 'bg-accent text-white' 
                  : 'bg-bg3 text-gray-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg3 text-gray-400 text-sm border-b border-gray-700">
                <th className="p-4 font-semibold rounded-tl-lg">#</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Mode</th>
                <th className="p-4 font-semibold">Result</th>
                <th className="p-4 font-semibold">Duration</th>
                <th className="p-4 font-semibold">Lineup</th>
                <th className="p-4 font-semibold">Notes</th>
                <th className="p-4 font-semibold rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredGames.slice().reverse().map((game) => (
                <tr key={game.num} className="hover:bg-bg3/50 transition-colors">
                  <td className="p-4 text-gray-400">{game.num}</td>
                  <td className="p-4">{game.date}</td>
                  <td className="p-4">{game.mode}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      game.result === 'Win' ? 'bg-win/20 text-win' : 'bg-lose/20 text-lose'
                    }`}>
                      {game.result}
                    </span>
                  </td>
                  <td className="p-4">{game.duration}m</td>
                  <td className="p-4">
                    <div className="flex -space-x-2">
                      {(game.heroes || []).map((hero, i) => (
                        <div key={i} title={`${(game.players || [])[i] || ''}: ${hero}`} className="w-8 h-8 rounded-full bg-bg3 border border-gray-600 flex items-center justify-center text-[10px] overflow-hidden relative group cursor-pointer">
                           <span className="truncate w-full text-center px-1">{hero.substring(0,3)}</span>
                           <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                             {((game.players || [])[i] || '').substring(0,2)}
                           </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-400 max-w-[200px] truncate">{game.notes}</td>
                  <td className="p-4">
                    <button onClick={() => openEditModal(game)} className="text-accent hover:text-accent-hover transition-colors text-sm font-semibold">Edit</button>
                  </td>
                </tr>
              ))}
              {filteredGames.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No games found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT GAME MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-bg2 border border-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 font-outfit">
              {editingGame ? `Edit Game #${editingGame.num}` : 'Add New Game'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mode</label>
                  <select className="input-field" value={newGame.mode} onChange={e => setNewGame({...newGame, mode: e.target.value})}>
                    <option value="Ranked">Ranked</option>
                    <option value="Classic">Classic</option>
                    <option value="Custom">Custom</option>
                    <option value="Tour">Tour</option>
                    <option value="MCL">MCL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Result</label>
                  <select className="input-field" value={newGame.result} onChange={e => setNewGame({...newGame, result: e.target.value})}>
                    <option value="Win">Win</option>
                    <option value="Lose">Lose</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration (min)</label>
                  <input type="number" className="input-field" value={newGame.duration} onChange={e => setNewGame({...newGame, duration: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea 
                  className="input-field resize-none" 
                  rows="2"
                  placeholder="e.g. Lord steal by Chou, enemy AFK..."
                  value={newGame.notes}
                  onChange={e => setNewGame({...newGame, notes: e.target.value})}
                />
              </div>

              <div>
                <h4 className="text-xs text-gray-400 mb-3">Lineup (5 Players)</h4>
                <div className="space-y-3">
                  {newGame.pairs.map((pair, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      {/* PLAYER DROPDOWN */}
                      <select
                        className="input-field py-2 text-sm flex-1"
                        value={pair.player}
                        onChange={(e) => handlePairChange(idx, 'player', e.target.value)}
                      >
                        <option value="">Player {idx+1}</option>
                        {players.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      
                      {/* HERO SEARCH + AUTOCOMPLETE */}
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="Search hero..." 
                          className="input-field py-2 text-sm w-full"
                          value={pair.hero || heroSearch[idx]}
                          onChange={(e) => {
                            handlePairChange(idx, 'hero', '');
                            const ns = [...heroSearch];
                            ns[idx] = e.target.value;
                            setHeroSearch(ns);
                          }}
                          onFocus={() => {
                            if (pair.hero) {
                              const ns = [...heroSearch];
                              ns[idx] = pair.hero;
                              setHeroSearch(ns);
                              handlePairChange(idx, 'hero', '');
                            }
                          }}
                        />
                        {getFilteredHeroes(idx).length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-bg3 border border-gray-700 rounded-lg z-10 max-h-40 overflow-y-auto shadow-xl">
                            {getFilteredHeroes(idx).map(h => (
                              <button
                                key={h}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/20 hover:text-white transition-colors"
                                onClick={() => selectHero(idx, h)}
                              >
                                {h}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : editingGame ? 'Update Game' : 'Save Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLogPage;
