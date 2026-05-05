import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';

const PlayersManagePage = () => {
  const { players, addPlayer } = useData();
  const [newPlayer, setNewPlayer] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (newPlayer.trim() && !players.includes(newPlayer.trim())) {
      addPlayer(newPlayer.trim());
      setNewPlayer('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-outfit mb-1">Roster Management</h2>
        <p className="text-gray-400">Manage players available in the squad.</p>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-outfit">Add New Player</h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Enter player IGN" 
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            className="input-field flex-1"
            maxLength={20}
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={!newPlayer.trim()}>
            Add Player
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-outfit">Current Roster ({players.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(p => (
            <div key={p} className="bg-bg3 border border-gray-700 p-4 rounded-xl flex items-center justify-between group transition-colors hover:border-accent/50 hover:bg-accent/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                  {p.substring(0, 1).toUpperCase()}
                </div>
                <span className="font-semibold text-lg">{p}</span>
              </div>
              <button className="text-gray-500 hover:text-lose transition-colors opacity-0 group-hover:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayersManagePage;
