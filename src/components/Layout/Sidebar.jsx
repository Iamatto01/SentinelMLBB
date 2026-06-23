import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', adminOnly: false },
  { path: '/log', label: 'Game Log', icon: '🎮', adminOnly: false },
  { path: '/ocr', label: 'OCR Upload', icon: '📷', adminOnly: false },
  { path: '/players', label: 'Player Stats', icon: '👥', adminOnly: false },
  { path: '/heroes', label: 'Hero Pool', icon: '🦸‍♂️', adminOnly: false },
  { path: '/comps', label: 'Team Comps', icon: '🧩', adminOnly: false },
  { path: '/manage', label: 'Roster', icon: '📋', adminOnly: false },
  { path: '/admin', label: 'Admin Portal', icon: '👑', adminOnly: true },
  { path: '/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 glass h-[calc(100vh-72px)] sticky top-[72px] hidden md:flex flex-col py-6 px-4">
      <div className="flex flex-col gap-2">
        {navItems.filter(item => !item.adminOnly || user?.role === 'admin').map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-accent/20 border border-accent/50 text-white font-semibold' 
                  : 'text-gray-400 hover:bg-bg3 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto pt-6 border-t border-gray-800">
        <div className="bg-bg2 p-4 rounded-xl text-sm">
          <p className="text-gray-400 mb-2">Need help?</p>
          <a href="#" className="text-accent hover:underline font-semibold">Read Documentation</a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
