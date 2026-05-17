// Ported from Google Apps Script to vanilla JS

export function computeStats(games, HERO_ROLES) {
  const result = {
    totalGames: games.length,
    wins: 0,
    loses: 0,
    winRate: '0.0%',
    players: {},
    heroes: {},
    comps: { duo: {}, trio: {}, quad: {}, full: {} }
  };

  if (games.length === 0) return result;

  games.forEach(game => {
    const isWin = game.result === 'Win';
    if (isWin) result.wins++;
    else result.loses++;

    const gameHeroes = [];

    // Process players in this game
    game.players.forEach(p => {
      const pName = p.player_name.trim();
      const hName = p.hero_name.trim();
      
      if (!pName || !hName) return;
      gameHeroes.push(hName);

      // Player Stats
      if (!result.players[pName]) {
        result.players[pName] = { name: pName, games: 0, win: 0, lose: 0, heroes: {} };
      }
      const pStat = result.players[pName];
      pStat.games++;
      if (isWin) pStat.win++; else pStat.lose++;
      
      if (!pStat.heroes[hName]) pStat.heroes[hName] = { games: 0, win: 0 };
      pStat.heroes[hName].games++;
      if (isWin) pStat.heroes[hName].win++;

      // Hero Pool Stats
      if (!result.heroes[hName]) {
        result.heroes[hName] = { name: hName, role: HERO_ROLES[hName] || 'Unknown', games: 0, win: 0, lose: 0, players: {} };
      }
      const hStat = result.heroes[hName];
      hStat.games++;
      if (isWin) hStat.win++; else hStat.lose++;
      
      if (!hStat.players[pName]) hStat.players[pName] = { games: 0, win: 0 };
      hStat.players[pName].games++;
      if (isWin) hStat.players[pName].win++;
    });

    // Comps Analysis
    gameHeroes.sort();
    const len = gameHeroes.length;

    // Duos
    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 1; j < len; j++) {
        const key = `${gameHeroes[i]} + ${gameHeroes[j]}`;
        if (!result.comps.duo[key]) result.comps.duo[key] = { key, heroes: [gameHeroes[i], gameHeroes[j]], games: 0, win: 0, lose: 0 };
        result.comps.duo[key].games++;
        if (isWin) result.comps.duo[key].win++; else result.comps.duo[key].lose++;
      }
    }

    // Trios
    for (let i = 0; i < len - 2; i++) {
      for (let j = i + 1; j < len - 1; j++) {
        for (let k = j + 1; k < len; k++) {
          const key = `${gameHeroes[i]} + ${gameHeroes[j]} + ${gameHeroes[k]}`;
          if (!result.comps.trio[key]) result.comps.trio[key] = { key, heroes: [gameHeroes[i], gameHeroes[j], gameHeroes[k]], games: 0, win: 0, lose: 0 };
          result.comps.trio[key].games++;
          if (isWin) result.comps.trio[key].win++; else result.comps.trio[key].lose++;
        }
      }
    }

    // Quads
    for (let i = 0; i < len - 3; i++) {
      for (let j = i + 1; j < len - 2; j++) {
        for (let k = j + 1; k < len - 1; k++) {
          for (let l = k + 1; l < len; l++) {
            const key = `${gameHeroes[i]} + ${gameHeroes[j]} + ${gameHeroes[k]} + ${gameHeroes[l]}`;
            if (!result.comps.quad[key]) result.comps.quad[key] = { key, heroes: [gameHeroes[i], gameHeroes[j], gameHeroes[k], gameHeroes[l]], games: 0, win: 0, lose: 0 };
            result.comps.quad[key].games++;
            if (isWin) result.comps.quad[key].win++; else result.comps.quad[key].lose++;
          }
        }
      }
    }

    // Full Draft
    if (len === 5) {
      const key = gameHeroes.join(' + ');
      if (!result.comps.full[key]) result.comps.full[key] = { key, heroes: gameHeroes, games: 0, win: 0, lose: 0 };
      result.comps.full[key].games++;
      if (isWin) result.comps.full[key].win++; else result.comps.full[key].lose++;
    }
  });

  result.winRate = ((result.wins / result.totalGames) * 100).toFixed(1) + '%';
  return result;
}

export function formatWinRate(win, total) {
  if (total === 0) return '0.0%';
  return ((win / total) * 100).toFixed(1) + '%';
}
