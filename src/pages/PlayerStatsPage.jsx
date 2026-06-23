import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { computePlayerStats, computeSynergyMatrix } from '../utils/statsEngine';

const PlayerStatsPage = () => {
  const { games, players, loading } = useData();

  const stats = useMemo(() => computePlayerStats(games), [games]);
  const synergy = useMemo(() => computeSynergyMatrix(games, players), [games, players]);

  if (loading) return <div className="text-center py-20">Loading stats...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-outfit mb-1">Player Statistics</h2>
        <p className="text-gray-400">Individual performance and synergy breakdown.</p>
      </div>

      {/* Leaderboard Table */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-outfit">Roster Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg3 text-gray-400 text-sm border-b border-gray-700">
                <th className="p-4 font-semibold rounded-tl-lg">Player</th>
                <th className="p-4 font-semibold">Games</th>
                <th className="p-4 font-semibold">W - L</th>
                <th className="p-4 font-semibold">Win Rate</th>
                <th className="p-4 font-semibold">Avg Time</th>
                <th className="p-4 font-semibold">Most Picked</th>
                <th className="p-4 font-semibold rounded-tr-lg">Best Hero</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stats.map((p, i) => (
                <tr key={p.name} className="hover:bg-bg3/50 transition-colors">
                  <td className="p-4 font-bold text-accent">{p.name}</td>
                  <td className="p-4">{p.stats.games}</td>
                  <td className="p-4">{p.stats.wins} - {p.losses}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${p.wr >= 60 ? 'text-win' : p.wr >= 50 ? 'text-gold' : 'text-lose'}`}>
                        {Math.round(p.wr)}%
                      </span>
                      <div className="w-24 h-1.5 bg-gray-800 rounded-full hidden sm:block">
                         <div 
                           className={`h-1.5 rounded-full ${p.wr >= 60 ? 'bg-win' : p.wr >= 50 ? 'bg-gold' : 'bg-lose'}`} 
                           style={{ width: `${p.wr}%` }}
                         ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-blue-400">{Math.round(p.avgTime)}m</td>
                  <td className="p-4">
                    {p.mostPicked !== '-' ? (
                      <div>
                        <div className="font-semibold">{p.mostPicked}</div>
                        <div className="text-xs text-gray-400">{p.mostPickedCount} picks</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-4">
                    {p.bestHero !== '-' ? (
                      <div>
                        <div className="font-semibold">{p.bestHero}</div>
                        <div className={`text-xs ${p.bestHeroWR >= 50 ? 'text-win' : 'text-lose'}`}>{p.bestHeroWR}% WR</div>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synergy Matrix */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-outfit">Synergy Matrix (Win% Together)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 bg-bg3 border border-gray-700"></th>
                {players.map(p => (
                  <th key={p} className="p-2 bg-bg3 border border-gray-700 font-semibold">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {synergy.map((row) => (
                <tr key={row.player}>
                  <td className="p-2 bg-bg3 border border-gray-700 font-semibold text-left">{row.player}</td>
                  {players.map(p2 => {
                    const data = row.partners[p2];
                    if (!data) {
                      return <td key={p2} className="p-2 border border-gray-800 bg-bg2 text-gray-600">-</td>;
                    }
                    const { wr, games } = data;
                    const bgClass = wr >= 60 ? 'bg-win/20 text-win' : wr >= 50 ? 'bg-gold/20 text-gold' : 'bg-lose/20 text-lose';
                    return (
                      <td key={p2} className={`p-2 border border-gray-800 font-bold ${bgClass}`}>
                        {wr}% <span className="text-[10px] opacity-70 font-normal">({games})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPage;
