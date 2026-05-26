import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client/web';

const app = new Hono();

// ═══════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════
app.use('*', cors({ origin: '*', allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'], allowHeaders: ['Content-Type','Authorization'] }));

function getDB(env) {
  return createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
}

// ── Password Hashing (PBKDF2 via Web Crypto) ──
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hash = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt); combined.set(hash, salt.length);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password, stored) {
  const enc = new TextEncoder();
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const storedHash = combined.slice(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hash = new Uint8Array(bits);
  if (hash.length !== storedHash.length) return false;
  for (let i = 0; i < hash.length; i++) { if (hash[i] !== storedHash[i]) return false; }
  return true;
}

// ── JWT (HMAC-SHA256 via Web Crypto) ──
async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now()/1000) + 86400*30 })).replace(/=/g, '');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.${sigStr}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

// ── Auth Middleware ──
async function authMiddleware(c, next) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyJWT(auth.slice(7), c.env.JWT_SECRET);
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401);
  c.set('user', payload);
  await next();
}

// ═══════════════════════════════════════════
//  DB INIT
// ═══════════════════════════════════════════
app.post('/api/init', async (c) => {
  const db = getDB(c.env);
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_num INTEGER,
      date TEXT,
      mode TEXT DEFAULT 'Ranked',
      duration INTEGER DEFAULT 0,
      result TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      slot INTEGER NOT NULL,
      player_name TEXT,
      hero_name TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
    CREATE INDEX IF NOT EXISTS idx_gp_game ON game_players(game_id);
  `);
  return c.json({ ok: true, message: 'Database initialized' });
});

// ═══════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════
app.post('/api/register', async (c) => {
  const { email, password, name } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'Email, password and name required' }, 400);
  if (password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400);

  const db = getDB(c.env);
  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email.toLowerCase()] });
  if (existing.rows.length > 0) return c.json({ error: 'Email already registered' }, 409);

  const hashed = await hashPassword(password);
  const isFirst = await db.execute('SELECT COUNT(*) as cnt FROM users');
  const isAdmin = isFirst.rows[0].cnt === 0; // First user becomes admin

  await db.execute({
    sql: 'INSERT INTO users (email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?)',
    args: [email.toLowerCase(), hashed, name, isAdmin ? 'admin' : 'user', isAdmin ? 1 : 0]
  });

  return c.json({ ok: true, message: isAdmin ? 'Admin account created! You can login now.' : 'Account created! Pending activation by admin.' });
});

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const db = getDB(c.env);
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] });
  if (result.rows.length === 0) return c.json({ error: 'Invalid credentials' }, 401);

  const user = result.rows[0];
  const valid = await verifyPassword(password, user.password);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
  if (!user.is_active) return c.json({ error: 'Account pending activation. Contact admin.' }, 403);

  const token = await signJWT({ id: user.id, email: user.email, name: user.name, role: user.role }, c.env.JWT_SECRET);
  return c.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/me', authMiddleware, (c) => {
  return c.json({ ok: true, user: c.get('user') });
});

// ═══════════════════════════════════════════
//  GAME CRUD
// ═══════════════════════════════════════════
app.get('/api/games', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDB(c.env);
  const games = await db.execute({ sql: 'SELECT * FROM games WHERE user_id = ? ORDER BY game_num ASC', args: [user.id] });
  const gameIds = games.rows.map(g => g.id);

  let players = { rows: [] };
  if (gameIds.length > 0) {
    const placeholders = gameIds.map(() => '?').join(',');
    players = await db.execute({ sql: `SELECT * FROM game_players WHERE game_id IN (${placeholders}) ORDER BY slot ASC`, args: gameIds });
  }

  const playerMap = {};
  players.rows.forEach(p => {
    if (!playerMap[p.game_id]) playerMap[p.game_id] = [];
    playerMap[p.game_id].push(p);
  });

  const result = games.rows.map(g => ({
    ...g,
    players: (playerMap[g.id] || [])
  }));

  return c.json({ ok: true, games: result });
});

app.post('/api/games', authMiddleware, async (c) => {
  const user = c.get('user');
  const { game_num, date, mode, duration, result, notes, players } = await c.req.json();
  const db = getDB(c.env);

  const res = await db.execute({
    sql: 'INSERT INTO games (user_id, game_num, date, mode, duration, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [user.id, game_num, date, mode || 'Ranked', duration || 0, result, notes || '']
  });

  const gameId = Number(res.lastInsertRowid);
  if (players && players.length > 0) {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.player_name || p.hero_name) {
        await db.execute({
          sql: 'INSERT INTO game_players (game_id, slot, player_name, hero_name) VALUES (?, ?, ?, ?)',
          args: [gameId, i + 1, p.player_name || '', p.hero_name || '']
        });
      }
    }
  }
  return c.json({ ok: true, id: gameId });
});

app.post('/api/games/bulk', authMiddleware, async (c) => {
  const user = c.get('user');
  const { games } = await c.req.json();
  if (!games || !games.length) return c.json({ error: 'No games provided' }, 400);

  const db = getDB(c.env);
  let count = 0;

  for (const g of games) {
    const res = await db.execute({
      sql: 'INSERT INTO games (user_id, game_num, date, mode, duration, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [user.id, g.game_num, g.date, g.mode || 'Ranked', g.duration || 0, g.result, g.notes || '']
    });
    const gameId = Number(res.lastInsertRowid);
    if (g.players && g.players.length > 0) {
      for (let i = 0; i < g.players.length; i++) {
        const p = g.players[i];
        if (p.player_name || p.hero_name) {
          await db.execute({
            sql: 'INSERT INTO game_players (game_id, slot, player_name, hero_name) VALUES (?, ?, ?, ?)',
            args: [gameId, i + 1, p.player_name || '', p.hero_name || '']
          });
        }
      }
    }
    count++;
  }
  return c.json({ ok: true, imported: count });
});

app.put('/api/games/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const gameId = parseInt(c.req.param('id'));
  const { game_num, date, mode, duration, result, notes, players } = await c.req.json();
  const db = getDB(c.env);

  // Verify ownership
  const check = await db.execute({ sql: 'SELECT id FROM games WHERE id = ? AND user_id = ?', args: [gameId, user.id] });
  if (check.rows.length === 0) return c.json({ error: 'Game not found' }, 404);

  await db.execute({
    sql: 'UPDATE games SET game_num=?, date=?, mode=?, duration=?, result=?, notes=? WHERE id=?',
    args: [game_num, date, mode, duration || 0, result, notes || '', gameId]
  });

  // Replace players
  await db.execute({ sql: 'DELETE FROM game_players WHERE game_id = ?', args: [gameId] });
  if (players && players.length > 0) {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.player_name || p.hero_name) {
        await db.execute({
          sql: 'INSERT INTO game_players (game_id, slot, player_name, hero_name) VALUES (?, ?, ?, ?)',
          args: [gameId, i + 1, p.player_name || '', p.hero_name || '']
        });
      }
    }
  }
  return c.json({ ok: true });
});

app.delete('/api/games/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const gameId = parseInt(c.req.param('id'));
  const db = getDB(c.env);

  const check = await db.execute({ sql: 'SELECT id FROM games WHERE id = ? AND user_id = ?', args: [gameId, user.id] });
  if (check.rows.length === 0) return c.json({ error: 'Game not found' }, 404);

  await db.execute({ sql: 'DELETE FROM game_players WHERE game_id = ?', args: [gameId] });
  await db.execute({ sql: 'DELETE FROM games WHERE id = ?', args: [gameId] });
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════════
app.get('/api/admin/users', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const db = getDB(c.env);
  const result = await db.execute('SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC');
  return c.json({ ok: true, users: result.rows });
});

app.put('/api/admin/users/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const userId = parseInt(c.req.param('id'));
  const { is_active } = await c.req.json();
  const db = getDB(c.env);

  await db.execute({ sql: 'UPDATE users SET is_active = ? WHERE id = ?', args: [is_active ? 1 : 0, userId] });
  return c.json({ ok: true });
});

app.delete('/api/admin/users/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const userId = parseInt(c.req.param('id'));
  if (userId === user.id) return c.json({ error: 'Cannot delete yourself' }, 400);
  const db = getDB(c.env);

  // Delete all user data
  const userGames = await db.execute({ sql: 'SELECT id FROM games WHERE user_id = ?', args: [userId] });
  for (const g of userGames.rows) {
    await db.execute({ sql: 'DELETE FROM game_players WHERE game_id = ?', args: [g.id] });
  }
  await db.execute({ sql: 'DELETE FROM games WHERE user_id = ?', args: [userId] });
  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] });
  return c.json({ ok: true });
});



// ═══════════════════════════════════════════
//  MLBB PUBLIC API PROXY (mlbb.rone.dev)
// ═══════════════════════════════════════════
const MLBB_API = 'https://mlbb.rone.dev/api';
const mlbbCache = new Map(); // { key: { data, ts } }
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key) {
  const entry = mlbbCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  mlbbCache.set(key, { data, ts: Date.now() });
  // Evict old entries if cache grows too large
  if (mlbbCache.size > 200) {
    const oldest = [...mlbbCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) mlbbCache.delete(oldest[0]);
  }
}

// List all heroes (with images, relations)
app.get('/api/mlbb/heroes', async (c) => {
  const cacheKey = 'heroes-list';
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes?size=200&order=asc`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch MLBB heroes', details: String(err) }, 502);
  }
});

// Hero rank statistics (win/pick/ban rates)
app.get('/api/mlbb/heroes/rank', async (c) => {
  const days = c.req.query('days') || '7';
  const rank = c.req.query('rank') || 'all';
  const sortField = c.req.query('sort_field') || 'win_rate';
  const sortOrder = c.req.query('sort_order') || 'desc';
  const cacheKey = `rank-${days}-${rank}-${sortField}-${sortOrder}`;
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes/rank?days=${days}&rank=${rank}&sort_field=${sortField}&sort_order=${sortOrder}&size=200`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch hero rank stats', details: String(err) }, 502);
  }
});

// Hero detail (full info, skills, lore)
app.get('/api/mlbb/heroes/:id', async (c) => {
  const heroId = c.req.param('id');
  const cacheKey = `hero-detail-${heroId}`;
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes/${encodeURIComponent(heroId)}`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch hero detail', details: String(err) }, 502);
  }
});

// Hero counters
app.get('/api/mlbb/heroes/:id/counters', async (c) => {
  const heroId = c.req.param('id');
  const days = c.req.query('days') || '7';
  const rank = c.req.query('rank') || 'all';
  const cacheKey = `counters-${heroId}-${days}-${rank}`;
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes/${encodeURIComponent(heroId)}/counters?days=${days}&rank=${rank}&size=20`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch hero counters', details: String(err) }, 502);
  }
});

// Hero stats (synergies, win rate by duration)
app.get('/api/mlbb/heroes/:id/stats', async (c) => {
  const heroId = c.req.param('id');
  const rank = c.req.query('rank') || 'all';
  const cacheKey = `stats-${heroId}-${rank}`;
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes/${encodeURIComponent(heroId)}/stats?rank=${rank}`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch hero stats', details: String(err) }, 502);
  }
});

// Hero relations (assist, strong, weak)
app.get('/api/mlbb/heroes/:id/relations', async (c) => {
  const heroId = c.req.param('id');
  const cacheKey = `relations-${heroId}`;
  const cached = getCached(cacheKey);
  if (cached) return c.json(cached);

  try {
    const res = await fetch(`${MLBB_API}/heroes/${encodeURIComponent(heroId)}/relations`);
    if (!res.ok) return c.json({ error: 'MLBB API error' }, 502);
    const data = await res.json();
    setCache(cacheKey, data);
    return c.json(data);
  } catch (err) {
    return c.json({ error: 'Failed to fetch hero relations', details: String(err) }, 502);
  }
});

// ═══════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════
app.get('/api/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

export default app;

