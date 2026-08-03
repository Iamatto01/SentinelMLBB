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
}

let _adapterPromise: Promise<DbAdapter> | null = null;

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
  
  function saveToDisk() {
    try {
      const data = d.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.warn('[DB] Could not save sql.js DB to disk (read-only environment):', err);
    }
  }

  return {
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
        saveToDisk();
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
  }
};
