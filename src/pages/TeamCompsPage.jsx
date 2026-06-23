import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { computeTeamComps } from '../utils/statsEngine';

const TeamCompsPage = () => {
  const { games, loading } = useData();

  const comps = useMemo(() => computeTeamComps(games), [games]);

  if (loading) return <div className="text-center py-20">Loading comps...</div>;

  const renderCompRow = (comp, i, isWin) => (
    <div key={i} className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
      isWin ? 'bg-[#1a4731]/20 border-win/20' : 'bg-[#4a1a1a]/20 border-lose/20'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-2xl ${
          isWin ? 'bg-win/20 text-win' : 'bg-lose/20 text-lose'
        }`}>
          #{i + 1}
        </div>
        <div>
          <div className="flex flex-wrap gap-2 mb-1">
            {comp.heroes.map((h, j) => (
              <div key={j} className="px-3 py-1 bg-bg3 border border-gray-600 rounded-md text-sm font-semibold">
                {h}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400">
            Players: <span className="text-gray-300">{comp.players[0]}</span> {comp.players.length > 1 && `(+${comp.players.length - 1} more games)`}
          </div>
        </div>
      </div>
      
      <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 lg:gap-1 pl-16 lg:pl-0 border-t lg:border-t-0 border-gray-700 pt-3 lg:pt-0">
        <div className="text-center lg:text-right">
          <span className="text-gray-400 text-xs block mb-1">Times Played</span>
          <span className={`text-2xl font-bold font-outfit ${isWin ? 'text-win' : 'text-lose'}`}>
            {comp.count}x
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="mb-4">
        <h2 className="text-3xl font-bold font-outfit mb-1">Team Compositions</h2>
        <p className="text-gray-400">Discover which 5-hero lineups yield the best (and worst) results.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="card space-y-6 border-win/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏆</span>
            <h3 className="text-2xl font-bold font-outfit text-win">Winning Compositions</h3>
          </div>
          <div className="space-y-4">
            {comps.win.length > 0 ? (
              comps.win.map((c, i) => renderCompRow(c, i, true))
            ) : (
              <div className="p-8 text-center text-gray-500 bg-bg3/50 rounded-xl border border-gray-700 border-dashed">
                No winning compositions found.
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-6 border-lose/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💀</span>
            <h3 className="text-2xl font-bold font-outfit text-lose">Losing Compositions</h3>
          </div>
          <div className="space-y-4">
            {comps.lose.length > 0 ? (
              comps.lose.map((c, i) => renderCompRow(c, i, false))
            ) : (
              <div className="p-8 text-center text-gray-500 bg-bg3/50 rounded-xl border border-gray-700 border-dashed">
                No losing compositions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCompsPage;
