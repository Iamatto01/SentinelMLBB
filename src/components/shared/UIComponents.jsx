import React from 'react';

export const StatCard = ({ title, value, subtitle, icon, color = 'accent' }) => {
  const colorMap = {
    accent: 'text-accent bg-accent/10 border-accent/20',
    win: 'text-win bg-win/10 border-win/20',
    lose: 'text-lose bg-lose/10 border-lose/20',
    gold: 'text-gold bg-gold/10 border-gold/20',
    blue: 'text-blue bg-blue/10 border-blue/20',
  };
  
  const selectedColor = colorMap[color] || colorMap.accent;

  return (
    <div className={`card flex items-start justify-between border ${selectedColor.split(' ')[2]}`}>
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold font-outfit mb-1">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${selectedColor.split(' ')[0]} ${selectedColor.split(' ')[1]}`}>
        {icon}
      </div>
    </div>
  );
};

export const RoleBadge = ({ role }) => {
  const map = {
    Tank:      'bg-[#1e3a5f] text-[#6db3f8] border-[#2c5282]',
    Fighter:   'bg-[#5f3a1e] text-[#f8a86d] border-[#8a552b]',
    Assassin:  'bg-[#4a1e5f] text-[#c86df8] border-[#6b2c8a]',
    Mage:      'bg-[#1e5f5f] text-[#6df8f8] border-[#2c8a8a]',
    Marksman:  'bg-[#5f5f1e] text-[#f8f86d] border-[#8a8a2c]',
    Support:   'bg-[#1e5f3a] text-[#6df8a8] border-[#2c8a55]'
  };
  
  const styles = map[role] || 'bg-gray-800 text-gray-300 border-gray-600';
  
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${styles}`}>
      {role}
    </span>
  );
};
