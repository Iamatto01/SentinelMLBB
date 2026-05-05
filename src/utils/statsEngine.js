import { HERO_ROLES } from '../data/heroes';

export function computePlayerStats(games, sortMode = 'wr') {
  const stats = {};
  games.forEach(g => {
    g.players.forEach((p, i) => {
      if (!stats[p]) stats[p] = { games: 0, wins: 0, heroes: {}, durations: [] };
      stats[p].games++;
      if (g.result === "Win") stats[p].wins++;
      if (g.duration > 0) stats[p].durations.push(g.duration);
      const h = g.heroes[i];
      if (h) {
        if (!stats[p].heroes[h]) stats[p].heroes[h] = { picks: 0, wins: 0 };
        stats[p].heroes[h].picks++;
        if (g.result === "Win") stats[p].heroes[h].wins++;
      }
    });
  });

  const playerNames = Object.keys(stats);
  return playerNames.map((p, i) => {
    const s = stats[p];
    const wr = s.games > 0 ? (s.wins / s.games) * 100 : 0;
    const avgTime = s.durations.length > 0 ? (s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : 0;
    
    let mostPicked = "-", mostPickedCount = 0;
    let bestHero = "-", bestHeroWR = 0;
    Object.entries(s.heroes).forEach(([hero, data]) => {
      if (data.picks > mostPickedCount) { mostPicked = hero; mostPickedCount = data.picks; }
      if (data.picks >= 2) {
        const hwr = (data.wins / data.picks) * 100;
        if (hwr > bestHeroWR || (hwr === bestHeroWR && data.picks > (s.heroes[bestHero]?.picks || 0))) {
          bestHero = hero; bestHeroWR = Math.round(hwr);
        }
      }
    });
    if (bestHero === "-" && Object.keys(s.heroes).length > 0) {
      const entries = Object.entries(s.heroes);
      entries.sort((a,b) => (b[1].wins/b[1].picks) - (a[1].wins/a[1].picks));
      bestHero = entries[0][0];
      bestHeroWR = Math.round((entries[0][1].wins / entries[0][1].picks) * 100);
    }

    return { 
      name: p, 
      stats: s, 
      wr, 
      losses: s.games - s.wins,
      avgTime,
      mostPicked,
      mostPickedCount,
      bestHero,
      bestHeroWR
    };
  }).sort((a, b) => {
    if (sortMode === "games") return b.stats.games - a.stats.games || b.wr - a.wr;
    if (sortMode === "wins") return b.stats.wins - a.stats.wins || b.stats.games - a.stats.games;
    if (sortMode === "losses") return b.losses - a.losses || b.wr - a.wr;
    if (sortMode === "avgTime") return b.avgTime - a.avgTime || b.stats.games - a.stats.games;
    return b.wr - a.wr || b.stats.games - a.stats.games;
  });
}

export function computeHeroPool(games, sortMode = 'picks') {
  const heroStats = {};
  games.forEach(g => {
    g.heroes.forEach(h => {
      if (!h) return;
      if (!heroStats[h]) heroStats[h] = { picks: 0, wins: 0 };
      heroStats[h].picks++;
      if (g.result === "Win") heroStats[h].wins++;
    });
  });

  return Object.entries(heroStats).map(([hero, data]) => {
    const role = HERO_ROLES[hero] || "?";
    const wr = data.picks > 0 ? (data.wins / data.picks) * 100 : 0;
    const losses = data.picks - data.wins;
    return { hero, role, picks: data.picks, wins: data.wins, losses, wr };
  }).sort((a, b) => {
    if (sortMode === "wins") return b.wins - a.wins || b.picks - a.picks;
    if (sortMode === "losses") return b.losses - a.losses || b.picks - a.picks;
    if (sortMode === "wr") return b.wr - a.wr || b.picks - a.picks;
    return b.picks - a.picks || b.wins - a.wins;
  });
}

export function computeTeamComps(games) {
  const comps = { Win: {}, Lose: {} };
  games.forEach(g => {
    if (g.heroes.filter(Boolean).length !== 5) return;
    const key = [...g.heroes].sort().join(" | ");
    if (!comps[g.result][key]) comps[g.result][key] = { heroes: [...g.heroes].sort(), count: 0, players: [], notes: [] };
    comps[g.result][key].count++;
    comps[g.result][key].players.push(g.players.join(", "));
    if (g.notes) comps[g.result][key].notes.push(g.notes);
  });

  return {
    win: Object.values(comps.Win).sort((a,b) => b.count - a.count),
    lose: Object.values(comps.Lose).sort((a,b) => b.count - a.count)
  };
}

export function computeAnalytics(games) {
  const totalW = games.filter(g => g.result === "Win").length;
  const totalL = games.filter(g => g.result === "Lose").length;
  const overallWR = games.length > 0 ? Math.round((totalW / games.length) * 100) : 0;

  let bestWin = 0, worstLose = 0, curWin = 0, curLose = 0, curStreak = "";
  games.forEach(g => {
    if (g.result === "Win") { curWin++; curLose = 0; if (curWin > bestWin) bestWin = curWin; }
    else { curLose++; curWin = 0; if (curLose > worstLose) worstLose = curLose; }
  });
  if (games.length > 0) {
    const last = games[games.length-1].result;
    curStreak = last === "Win" ? curWin + "W" : curLose + "L";
  }

  const modes = {};
  games.forEach(g => {
    const m = g.mode || "Unknown";
    if (!modes[m]) modes[m] = { games: 0, wins: 0 };
    modes[m].games++;
    if (g.result === "Win") modes[m].wins++;
  });
  
  const durations = games.filter(g => g.duration > 0).map(g => Number(g.duration));
  const avgDur = durations.length > 0 ? Math.round(durations.reduce((a,b)=>a+b,0) / durations.length) : 0;

  const timeline = games.slice(-30).map(g => ({ num: g.num, result: g.result }));

  return {
    totalGames: games.length,
    totalW,
    totalL,
    overallWR,
    bestWin,
    worstLose,
    curStreak,
    modes: Object.entries(modes).map(([mode, data]) => ({
      mode, 
      games: data.games, 
      wins: data.wins, 
      wr: Math.round((data.wins / data.games) * 100)
    })).sort((a,b) => b.games - a.games),
    avgDur,
    timeline
  };
}

export function computeSynergyMatrix(games, playersList) {
  const matrix = [];
  playersList.forEach((p1) => {
    const row = { player: p1, partners: {} };
    playersList.forEach((p2) => {
      if (p1 === p2) return;
      const together = games.filter(g => g.players.includes(p1) && g.players.includes(p2));
      if (together.length === 0) {
        row.partners[p2] = null;
      } else {
        const wins = together.filter(g => g.result === "Win").length;
        row.partners[p2] = {
          games: together.length,
          wins,
          wr: Math.round((wins / together.length) * 100)
        };
      }
    });
    matrix.push(row);
  });
  return matrix;
}
