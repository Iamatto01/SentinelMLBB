import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { computeHeroPool } from '../utils/statsEngine';
import { RoleBadge } from '../components/shared/UIComponents';

const HeroPoolPage = () => {
  const { games, loading } = useData();
  const [filterRole, setFilterRole] = useState('All');

  const heroes = useMemo(() => computeHeroPool(games), [games]);

  if (loading) return <div className="text-center py-20">Loading heroes...</div>;

  const filteredHeroes = filterRole === 'All' 
    ? heroes 
    : heroes.filter(h => h.role === filterRole);

  const maxPicks = Math.max(...heroes.map(h => h.picks), 1);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-outfit mb-1">Hero Pool</h2>
        <p className="text-gray-400">Analysis of all heroes picked across your squad's matches.</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-6">
          {['All', 'Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'].map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filterRole === role 
                  ? 'bg-accent text-white' 
                  : 'bg-bg3 text-gray-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg3 text-gray-400 text-sm border-b border-gray-700">
                <th className="p-4 font-semibold rounded-tl-lg">Hero</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Total Picks</th>
                <th className="p-4 font-semibold">W - L</th>
                <th className="p-4 font-semibold">Win Rate</th>
                <th className="p-4 font-semibold w-1/4 rounded-tr-lg">Pick Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredHeroes.map((h, i) => (
                <tr key={h.hero} className="hover:bg-bg3/50 transition-colors">
                  <td className="p-4 font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs overflow-hidden">
                      {h.hero.substring(0,2).toUpperCase()}
                    </div>
                    {h.hero}
                  </td>
                  <td className="p-4">
                    <RoleBadge role={h.role} />
                  </td>
                  <td className="p-4 font-semibold">{h.picks}</td>
                  <td className="p-4">{h.wins} - {h.losses}</td>
                  <td className="p-4">
                    <span className={`font-bold ${h.wr >= 60 ? 'text-win' : h.wr >= 50 ? 'text-gold' : 'text-lose'}`}>
                      {Math.round(h.wr)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full">
                        <div 
                          className="h-2 rounded-full bg-blue-500" 
                          style={{ width: `${(h.picks / maxPicks) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{h.picks}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHeroes.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No heroes found for this role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HeroPoolPage;
