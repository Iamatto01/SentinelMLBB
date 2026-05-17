let winRateChart = null;
let roleChart = null;

const chartColors = {
  bg: '#0a0a1a',
  surface: 'rgba(26, 26, 58, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#7f8c8d',
  win: '#2ecc71',
  lose: '#e74c3c',
  roles: {
    'Tank': '#3498db',
    'Fighter': '#e67e22',
    'Assassin': '#9b59b6',
    'Mage': '#1abc9c',
    'Marksman': '#f1c40f',
    'Support': '#2ecc71'
  }
};

export function renderDashboardCharts(games, heroRoles) {
  // 1. Win Rate Trend (Last 20 games)
  const recentGames = [...games].sort((a, b) => a.game_num - b.game_num).slice(-20);
  
  const labels = recentGames.map(g => `#${g.game_num}`);
  let cumulativeWins = 0;
  
  const wrData = recentGames.map((g, idx) => {
    if (g.result === 'Win') cumulativeWins++;
    return ((cumulativeWins / (idx + 1)) * 100).toFixed(1);
  });

  const ctxWr = document.getElementById('chart-winrate');
  if (ctxWr) {
    if (winRateChart) winRateChart.destroy();
    winRateChart = new Chart(ctxWr, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Win Rate %',
          data: wrData,
          borderColor: chartColors.win,
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: recentGames.map(g => g.result === 'Win' ? chartColors.win : chartColors.lose),
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, grid: { color: chartColors.border }, ticks: { color: chartColors.text } },
          x: { grid: { display: false }, ticks: { color: chartColors.text } }
        }
      }
    });
  }

  // 2. Role Distribution
  const roleCounts = { Tank: 0, Fighter: 0, Assassin: 0, Mage: 0, Marksman: 0, Support: 0, Unknown: 0 };
  let totalHeroes = 0;

  games.forEach(g => {
    g.players.forEach(p => {
      const role = heroRoles[p.hero_name] || 'Unknown';
      if (roleCounts[role] !== undefined) roleCounts[role]++;
      else roleCounts.Unknown++;
      totalHeroes++;
    });
  });

  const rLabels = [];
  const rData = [];
  const rColors = [];

  for (const [role, count] of Object.entries(roleCounts)) {
    if (count > 0 && role !== 'Unknown') {
      rLabels.push(role);
      rData.push(count);
      rColors.push(chartColors.roles[role] || '#fff');
    }
  }

  const ctxRole = document.getElementById('chart-roles');
  if (ctxRole) {
    if (roleChart) roleChart.destroy();
    roleChart = new Chart(ctxRole, {
      type: 'doughnut',
      data: {
        labels: rLabels,
        datasets: [{
          data: rData,
          backgroundColor: rColors,
          borderWidth: 1,
          borderColor: chartColors.bg
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: chartColors.text, boxWidth: 12 } }
        },
        cutout: '70%'
      }
    });
  }
}
