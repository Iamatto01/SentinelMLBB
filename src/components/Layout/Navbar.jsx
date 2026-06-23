import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [teamName, setTeamName] = useState(() => localStorage.getItem('sentinel_team') || 'My Squad');
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(teamName);

  const saveTeamName = () => {
    const name = tempName.trim() || 'My Squad';
    setTeamName(name);
    localStorage.setItem('sentinel_team', name);
    setIsEditing(false);
  };

  return (
    <nav className="glass sticky top-0 z-50 w-full px-6 py-4 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-outfit font-bold text-xl shadow-[0_0_15px_rgba(233,69,96,0.5)]">
          S
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sentinel<span className="text-accent">MLBB</span></h1>
      </Link>
      
      <div className="flex items-center gap-6">
        {user && (
          <div className="flex items-center gap-4">
            {/* Team Name - Editable */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTeamName()}
                  className="bg-bg3 border border-accent rounded-lg px-3 py-1 text-sm text-white focus:outline-none w-36"
                  autoFocus
                  maxLength={20}
                />
                <button onClick={saveTeamName} className="text-win text-sm font-bold hover:underline">Save</button>
                <button onClick={() => { setIsEditing(false); setTempName(teamName); }} className="text-gray-500 text-sm hover:underline">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => { setIsEditing(true); setTempName(teamName); }}
                className="flex flex-col items-end group cursor-pointer"
                title="Click to edit team name"
              >
                <span className="text-sm font-semibold group-hover:text-accent transition-colors">{teamName}</span>
                <span className="text-xs text-gray-400">{user.role === 'admin' ? 'Admin' : 'Pro Tier'}</span>
              </button>
            )}
            
            <button 
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors bg-bg3 px-3 py-2 rounded-lg hover:bg-lose/20 hover:text-lose"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
