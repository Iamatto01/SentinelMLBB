import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'sentinel.db');
  }
  return path.join(process.cwd(), 'data', 'sentinel.db');
}

interface DbAdapter {
  execute(sql: string, args?: any[] | Record<string, any>): Promise<{ rows: any[] }>;
  /** Persist any pending buffered writes. No-op for adapters that write through. */
  flush?(): void;
}

let _adapterPromise: Promise<DbAdapter> | null = null;

// Buffered adapters register a flush hook here so pending writes are never lost on shutdown.
const _flushHooks: Array<() => void> = [];
let _flushHooksRegistered = false;

function registerFlushHook(fn: () => void): void {
  _flushHooks.push(fn);
  if (_flushHooksRegistered || typeof process.on !== 'function') return;
  _flushHooksRegistered = true;
  const runAll = () => {
    for (const hook of _flushHooks) hook();
  };
  process.on('exit', runAll);
  process.on('beforeExit', runAll);
}

async function initAdapter(): Promise<DbAdapter> {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.warn('[DB] mkdir warning (read-only filesystem or tmp):', e);
  }

  // 1. Try better-sqlite3 (if native binary supported)
  try {
    const { default: BetterSqlite } = await import('better-sqlite3');
    const d = new BetterSqlite(dbPath);
    d.pragma('journal_mode = WAL');
    d.pragma('foreign_keys = ON');
    
    return {
      async execute(sql: string, args?: any[] | Record<string, any>) {
        const isRead = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
        const stmt = d.prepare(sql);
        if (isRead) {
          const rows = args ? (Array.isArray(args) ? stmt.all(...args) : stmt.all(args)) : stmt.all();
          return { rows: rows as any[] };
        } else {
          if (args) Array.isArray(args) ? stmt.run(...args) : stmt.run(args);
          else stmt.run();
          return { rows: [] };
        }
      }
    };
  } catch (e: any) {
    console.warn('[DB] better-sqlite3 unavailable or blocked by policy. Falling back to sql.js (pure JS):', e?.message || e);
  }

  // 2. Fallback to sql.js (pure JS / WebAssembly)
  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs();
  let fileBuffer: Buffer | undefined;
  try {
    if (fs.existsSync(dbPath)) {
      fileBuffer = fs.readFileSync(dbPath);
    }
  } catch (e) {
    console.warn('[DB] Reading dbPath failed:', e);
  }
  const d = new SQL.Database(fileBuffer);

  // sql.js keeps the entire database in memory and has no incremental write path: export()
  // serializes the whole DB and writeFileSync rewrites the whole file. Doing that per statement
  // makes any bulk insert loop O(rows x DB size) of disk work. Instead we mark the DB dirty and
  // flush once, either after a short debounce or before the process exits.
  const FLUSH_DEBOUNCE_MS = 250;
  let dirty = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!dirty) return;
    dirty = false;
    try {
      fs.writeFileSync(dbPath, Buffer.from(d.export()));
    } catch (err) {
      console.warn('[DB] Could not save sql.js DB to disk (read-only environment):', err);
    }
  }

  registerFlushHook(flush);

  return {
    flush,
    async execute(sql: string, args?: any[] | Record<string, any>) {
      const isRead = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
      
      let bindParams: any = undefined;
      if (args) {
        if (Array.isArray(args)) {
          bindParams = args;
        } else if (typeof args === 'object') {
          bindParams = {};
          for (const [k, v] of Object.entries(args)) {
            const paramKey = k.startsWith(':') || k.startsWith('$') || k.startsWith('@') ? k : `:${k}`;
            bindParams[paramKey] = v;
          }
        }
      }

      if (isRead) {
        const stmt = d.prepare(sql);
        if (bindParams) stmt.bind(bindParams);
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return { rows };
      } else {
        d.run(sql, bindParams);
        dirty = true;
        if (!flushTimer) {
          flushTimer = setTimeout(flush, FLUSH_DEBOUNCE_MS);
          // Don't let a pending flush keep the process alive.
          flushTimer.unref?.();
        }
        return { rows: [] };
      }
    }
  };
}

function getAdapter(): Promise<DbAdapter> {
  if (!_adapterPromise) {
    _adapterPromise = initAdapter();
  }
  return _adapterPromise;
}

export const db = {
  async execute(sqlOrConfig: string | { sql: string; args?: Record<string, any> | any[] }): Promise<{ rows: any[] }> {
    let sql: string;
    let args: any[] | Record<string, any> | undefined;

    if (typeof sqlOrConfig === 'string') {
      sql = sqlOrConfig;
      args = undefined;
    } else {
      sql = sqlOrConfig.sql;
      args = sqlOrConfig.args;
    }

    const adapter = await getAdapter();
    return adapter.execute(sql, args);
  },

  /** Force any buffered writes to disk immediately. */
  async flush(): Promise<void> {
    const adapter = await getAdapter();
    adapter.flush?.();
  }
};
