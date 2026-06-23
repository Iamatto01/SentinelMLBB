import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { computeAnalytics } from '../utils/statsEngine';
import { StatCard } from '../components/shared/UIComponents';

const DashboardPage = () => {
  const { games, loading } = useData();
  const navigate = useNavigate();

  const analytics = useMemo(() => {
    return computeAnalytics(games);
  }, [games]);

  if (loading) {
    return <div className="text-center py-20">Loading dashboard...</div>;
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-20 card max-w-2xl mx-auto mt-10">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold mb-2">No Games Yet!</h2>
        <p className="text-gray-400 mb-6">Start tracking your MLBB journey by adding your first game or uploading a post-match screenshot.</p>
        <div className="flex justify-center gap-4">
          <button className="btn-primary" onClick={() => navigate('/log')}>Add Game Log</button>
          <button className="btn-secondary" onClick={() => navigate('/ocr')}>Upload Screenshot</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold font-outfit mb-1">Squad Dashboard</h2>
          <p className="text-gray-400">Welcome back. Here is your latest performance overview.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => navigate('/log')}>Add Game Log</button>
          <button className="btn-primary" onClick={() => navigate('/ocr')}>Upload Screenshot</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Games" 
          value={analytics.totalGames} 
          icon="🎮" 
          color="blue"
        />
        <StatCard 
          title="Overall Win Rate" 
          value={`${analytics.overallWR}%`} 
          subtitle={`${analytics.totalW}W - ${analytics.totalL}L`}
          icon="🏆" 
          color={analytics.overallWR >= 50 ? 'win' : 'lose'}
        />
        <StatCard 
          title="Current Streak" 
          value={analytics.curStreak || "-"} 
          icon="🔥" 
          color={analytics.curStreak?.includes('W') ? 'win' : 'lose'}
        />
        <StatCard 
          title="Avg Match Duration" 
          value={`${analytics.avgDur}m`} 
          icon="⏱️" 
          color="gold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="text-xl font-bold mb-4 font-outfit">Recent Match History</h3>
          <div className="space-y-3">
            {games.slice(-5).reverse().map((game, i) => (
              <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${game.result === 'Win' ? 'bg-[#1a4731]/30 border-win/20' : 'bg-[#4a1a1a]/30 border-lose/20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${game.result === 'Win' ? 'bg-win/20 text-win' : 'bg-lose/20 text-lose'}`}>
                    {game.result === 'Win' ? 'W' : 'L'}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{game.mode}</div>
                    <div className="text-sm text-gray-400">{game.date} • {game.duration} min</div>
                  </div>
                </div>
                <div className="hidden md:flex flex-wrap gap-2 max-w-sm justify-end">
                  {game.heroes.filter(Boolean).map((h, j) => (
                    <div key={j} className="text-xs bg-bg3 px-2 py-1 rounded-md border border-gray-700">
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4 font-outfit">Modes Breakdown</h3>
          <div className="space-y-4">
            {analytics.modes.map((m, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{m.mode} ({m.games})</span>
                  <span className={m.wr >= 50 ? 'text-win' : 'text-lose'}>{m.wr}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${m.wr >= 50 ? 'bg-win' : 'bg-lose'}`} 
                    style={{ width: `${m.wr}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
