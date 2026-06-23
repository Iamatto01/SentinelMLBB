import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-outfit mb-1">Settings</h2>
        <p className="text-gray-400">Configure your account and workspace preferences.</p>
      </div>

      <div className="card space-y-6">
        <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
          <span>👤</span> Account Profile
        </h3>
        
        <div className="flex items-center gap-6 p-6 bg-bg3 rounded-xl border border-gray-700">
          <img src={user?.picture || 'https://via.placeholder.com/80'} alt="Profile" className="w-20 h-20 rounded-full border-4 border-bg2 shadow-xl" />
          <div>
            <h4 className="text-2xl font-bold">{user?.name}</h4>
            <p className="text-gray-400">{user?.email}</p>
            <div className="mt-2 inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold rounded-full border border-accent/30">
              PRO TIER
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
          <span>📊</span> Database Connection
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Google Sheet ID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={user?.sheetId || 'Not connected'} 
                className="input-field font-mono text-sm text-gray-500 opacity-70"
              />
              <button className="btn-secondary whitespace-nowrap">Copy ID</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">This is the unique ID of your personal Google Sheet where all your game data is stored.</p>
          </div>
          
          <button className="btn-secondary w-full flex items-center justify-center gap-2 border-green-700/50 hover:bg-green-900/20 hover:border-green-500 text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export All Data as CSV
          </button>
        </div>
      </div>

      <div className="card space-y-6 border-red-900/30">
        <h3 className="text-xl font-bold font-outfit text-lose">Danger Zone</h3>
        <p className="text-sm text-gray-400">Once you delete your account, there is no going back. Please be certain.</p>
        <button className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900/50 rounded-lg hover:bg-red-900/40 hover:text-red-400 transition-colors font-semibold">
          Delete Account & Wipe Data
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
