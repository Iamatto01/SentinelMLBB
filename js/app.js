import { api } from './api.js';
import { HEROES, HERO_ROLES } from './heroes.js';
import { computeStats, formatWinRate } from './stats.js';
import { renderDashboardCharts } from './charts.js';

let currentUser = null;
let currentGames = [];
let cachedStats = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  const userJson = localStorage.getItem('user');
  if (!userJson) {
    window.location.href = './index.html';
    return;
  }
  
  currentUser = JSON.parse(userJson);
  document.getElementById('user-name-display').textContent = currentUser.name;
  
  if (currentUser.role === 'admin') {
    document.getElementById('nav-admin').style.display = 'flex';
  }

  await loadGames();
  switchTab('dashboard');
});

// ── GLOBAL UI HANDLERS ──
window.logout = () => {
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  window.location.href = './index.html';
};

window.switchTab = (tabId) => {
  // Update Nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Update Content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');

  // Mobile sidebar close
  document.getElementById('sidebar').classList.remove('open');

  // Tab Specific Renders
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'gamelog') renderGameLog();
  if (tabId === 'playerstats') renderPlayerStats();
  if (tabId === 'heropool') renderHeroPool();
  if (tabId === 'teamcomps') renderTeamComps();
  if (tabId === 'admin' && currentUser.role === 'admin') loadAdminUsers();
};

window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
};

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── DATA LOADING ──
async function loadGames() {
  try {
    const res = await api.getGames();
    if (res.ok) {
      currentGames = res.games;
      cachedStats = computeStats(currentGames, HERO_ROLES);
    }
  } catch (err) {
    showToast('Failed to load games: ' + err.message, 'error');
  }
}

// ── RENDER: DASHBOARD ──
function renderDashboard() {
  if (!cachedStats) return;

  const quickStats = document.getElementById('dash-quick-stats');
  quickStats.innerHTML = `
    <div class="stat-card stat-total">
      <div class="stat-value">${cachedStats.totalGames}</div>
      <div class="stat-label">Total Games</div>
    </div>
    <div class="stat-card stat-win">
      <div class="stat-value">${cachedStats.wins}</div>
      <div class="stat-label">Total Wins</div>
    </div>
    <div class="stat-card stat-lose">
      <div class="stat-value">${cachedStats.loses}</div>
      <div class="stat-label">Total Loses</div>
    </div>
    <div class="stat-card stat-wr">
      <div class="stat-value">${cachedStats.winRate}</div>
      <div class="stat-label">Overall Win Rate</div>
    </div>
  `;

  renderDashboardCharts(currentGames, HERO_ROLES);
}

// ── RENDER: GAME LOG ──
function renderGameLog() {
  const tbody = document.querySelector('#table-gamelog tbody');
  tbody.innerHTML = '';

  if (currentGames.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">No games logged yet. Add your first match!</td></tr>`;
    return;
  }

  // Show newest first
  const reversed = [...currentGames].reverse();
  
  reversed.forEach(game => {
    const tr = document.createElement('tr');
    
    let pCells = '';
    for (let i = 0; i < 5; i++) {
      const p = game.players[i];
      if (p) {
        const roleClass = `role-${(HERO_ROLES[p.hero_name] || '').toLowerCase()}`;
        pCells += `<td><b>${p.player_name}</b><br><span class="badge ${roleClass}">${p.hero_name}</span></td>`;
      } else {
        pCells += `<td>-</td>`;
      }
    }

    tr.innerHTML = `
      <td>#${game.game_num}</td>
      <td>${game.date || '-'}</td>
      <td><span class="badge badge-ranked">${game.mode}</span></td>
      <td>${game.duration || 0}m</td>
      ${pCells}
      <td><span class="badge badge-${game.result.toLowerCase()}">${game.result}</span></td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteGame(${game.id})">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── RENDER: PLAYER STATS ──
window.renderPlayerStats = () => {
  if (!cachedStats) return;
  const tbody = document.querySelector('#table-playerstats tbody');
  tbody.innerHTML = '';

  const sortVal = document.getElementById('sort-playerstats').value;
  let playersArr = Object.values(cachedStats.players);

  playersArr.sort((a, b) => {
    if (sortVal === 'wr') {
      const aWr = a.games > 0 ? (a.win / a.games) : 0;
      const bWr = b.games > 0 ? (b.win / b.games) : 0;
      return bWr - aWr || b.games - a.games;
    } else if (sortVal === 'games') {
      return b.games - a.games;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  playersArr.forEach(p => {
    const wr = formatWinRate(p.win, p.games);
    
    // Most Picked Hero
    const heroArr = Object.entries(p.heroes).map(([name, data]) => ({ name, ...data }));
    heroArr.sort((a, b) => b.games - a.games);
    const mostPicked = heroArr[0] ? `${heroArr[0].name} (${heroArr[0].games}g)` : '-';

    // Best Hero (Min 3 games)
    const validBest = heroArr.filter(h => h.games >= 3);
    validBest.sort((a, b) => (b.win / b.games) - (a.win / a.games));
    const bestHero = validBest[0] ? `${validBest[0].name} (${formatWinRate(validBest[0].win, validBest[0].games)})` : '-';

    // Flex Score
    const flexScore = Object.keys(p.heroes).length;

    tbody.innerHTML += `
      <tr>
        <td><b>${p.name}</b></td>
        <td>${p.games}</td>
        <td style="color:var(--win)">${p.win}</td>
        <td style="color:var(--lose)">${p.lose}</td>
        <td><div class="wr-bar"><div class="wr-bar-fill ${getWrClass(p.win/p.games)}" style="width:${wr}"></div></div> ${wr}</td>
        <td>${flexScore}</td>
        <td>${mostPicked}</td>
        <td>${bestHero}</td>
      </tr>
    `;
  });
};

// ── RENDER: HERO POOL ──
window.renderHeroPool = () => {
  if (!cachedStats) return;
  const tbody = document.querySelector('#table-heropool tbody');
  tbody.innerHTML = '';

  const sortVal = document.getElementById('sort-heropool').value;
  let heroesArr = Object.values(cachedStats.heroes);

  heroesArr.sort((a, b) => {
    if (sortVal === 'picks') return b.games - a.games || (b.win/b.games) - (a.win/a.games);
    if (sortVal === 'wr') return (b.win/b.games) - (a.win/a.games) || b.games - a.games;
  });

  heroesArr.forEach(h => {
    const wr = formatWinRate(h.win, h.games);
    
    // Best Player
    const playerArr = Object.entries(h.players).map(([name, data]) => ({ name, ...data }));
    playerArr.sort((a, b) => b.games - a.games);
    const bestPlayer = playerArr[0] ? `${playerArr[0].name} (${playerArr[0].games}g)` : '-';

    const roleClass = `role-${h.role.toLowerCase()}`;

    tbody.innerHTML += `
      <tr>
        <td><b>${h.name}</b></td>
        <td><span class="badge ${roleClass}">${h.role}</span></td>
        <td>${h.games}</td>
        <td style="color:var(--win)">${h.win}</td>
        <td style="color:var(--lose)">${h.lose}</td>
        <td><div class="wr-bar"><div class="wr-bar-fill ${getWrClass(h.win/h.games)}" style="width:${wr}"></div></div> ${wr}</td>
        <td>${bestPlayer}</td>
      </tr>
    `;
  });
};

// ── RENDER: TEAM COMPS ──
function renderTeamComps() {
  if (!cachedStats) return;
  
  const renderCompTable = (dataObj, tableId) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    
    let arr = Object.values(dataObj).filter(c => c.games >= 2); // Min 2 games to show combo
    arr.sort((a, b) => b.games - a.games || (b.win/b.games) - (a.win/a.games));
    
    arr.slice(0, 15).forEach(c => {
      const wr = formatWinRate(c.win, c.games);
      const heroesCells = c.heroes.map(h => {
         const roleClass = `role-${(HERO_ROLES[h] || '').toLowerCase()}`;
         return `<td><span class="badge ${roleClass}">${h}</span></td>`;
      }).join('');
      
      tbody.innerHTML += `
        <tr>
          ${heroesCells}
          <td><b>${c.games}</b></td>
          <td style="color:var(--win)">${c.win}</td>
          <td style="color:var(--lose)">${c.lose}</td>
          <td><b>${wr}</b></td>
        </tr>
      `;
    });
  };

  renderCompTable(cachedStats.comps.duo, 'table-comp-duo');
  renderCompTable(cachedStats.comps.trio, 'table-comp-trio');
  renderCompTable(cachedStats.comps.quad, 'table-comp-quad');
  renderCompTable(cachedStats.comps.full, 'table-comp-full');
}

// ── ADMIN ──
async function loadAdminUsers() {
  try {
    const res = await api.getUsers();
    if (res.ok) {
      const tbody = document.querySelector('#table-admin-users tbody');
      tbody.innerHTML = '';
      res.users.forEach(u => {
        const isSelf = u.id === currentUser.id;
        tbody.innerHTML += `
          <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'admin' : 'tour'}">${u.role}</span></td>
            <td><span class="badge badge-${u.is_active ? 'active' : 'pending'}">${u.is_active ? 'Active' : 'Pending'}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
              ${!isSelf ? `
                <button class="btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}" onclick="toggleUser(${u.id}, ${!u.is_active})">
                  ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              ` : '-'}
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.toggleUser = async (id, isActive) => {
  try {
    const res = await api.toggleUserActive(id, isActive);
    if (res.ok) {
      showToast(`User ${isActive ? 'activated' : 'deactivated'}`);
      loadAdminUsers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ── GAME LOGIC ──
function getWrClass(ratio) {
  if (ratio >= 0.6) return 'wr-high';
  if (ratio >= 0.45) return 'wr-mid';
  return 'wr-low';
}

window.showAddGameModal = () => {
  document.getElementById('modal-add-game').style.display = 'flex';
  
  // Setup inputs
  const container = document.getElementById('players-container');
  container.innerHTML = '';
  
  // Use last game players if available
  const lastGame = currentGames[currentGames.length - 1] || null;
  
  // Populate hero datalist
  let datalist = `<datalist id="heroes-list">`;
  HEROES.forEach(h => datalist += `<option value="${h}">`);
  datalist += `</datalist>`;
  container.innerHTML += datalist;

  for (let i = 0; i < 5; i++) {
    const pName = lastGame && lastGame.players[i] ? lastGame.players[i].player_name : '';
    container.innerHTML += `
      <div class="grid-2" style="margin-bottom:10px;">
        <div class="form-group" style="margin-bottom:0;">
           <input type="text" id="p${i}-name" placeholder="Player ${i+1} Name" value="${pName}">
        </div>
        <div class="form-group" style="margin-bottom:0;">
           <input type="text" id="p${i}-hero" list="heroes-list" placeholder="Hero">
        </div>
      </div>
    `;
  }
};

window.closeModal = (id) => {
  document.getElementById(id).style.display = 'none';
  document.getElementById('form-add-game').reset();
};

window.saveGame = async (e) => {
  e.preventDefault();
  
  const nextGameNum = currentGames.length > 0 ? Math.max(...currentGames.map(g => g.game_num)) + 1 : 1;
  const today = new Date().toISOString().split('T')[0];

  const payload = {
    game_num: nextGameNum,
    date: today,
    mode: document.getElementById('game-mode').value,
    result: document.getElementById('game-result').value,
    duration: 15,
    players: []
  };

  for (let i = 0; i < 5; i++) {
    const pName = document.getElementById(`p${i}-name`).value.trim();
    const hName = document.getElementById(`p${i}-hero`).value.trim();
    if (pName || hName) {
      payload.players.push({ player_name: pName, hero_name: hName });
    }
  }

  const btn = document.getElementById('btn-save-game');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await api.addGame(payload);
    if (res.ok) {
      showToast('Game added successfully!');
      closeModal('modal-add-game');
      await loadGames();
      renderGameLog(); // Re-render current tab
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Game';
  }
};

window.deleteGame = async (id) => {
  if (!confirm('Are you sure you want to delete this game?')) return;
  try {
    const res = await api.deleteGame(id);
    if (res.ok) {
      showToast('Game deleted');
      await loadGames();
      renderGameLog();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};
