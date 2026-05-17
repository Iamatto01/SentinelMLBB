const fs = require('fs');
const { createClient } = require('@libsql/client');

// Read .dev.vars
const env = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const client = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_TOKEN
});

async function migrate() {
  console.log("Starting migration...");
  
  // Get admin user ID (assuming it's user 1 or we fetch it)
  const userRes = await client.execute({ sql: "SELECT id FROM users WHERE email = 'admin@sentinel.com'", args: [] });
  if (userRes.rows.length === 0) {
    console.error("Admin user not found. Run registration first.");
    return;
  }
  const userId = userRes.rows[0].id;
  console.log(`Using admin user_id: ${userId}`);

  // Read CSV
  const csv = fs.readFileSync('../../SentinelMLBB - muhammadsaifudinmj - 🎮 Game Log.csv', 'utf8');
  const lines = csv.split('\n').filter(l => l.trim().length > 0);
  
  // Skip headers (first 3 lines in this specific file)
  const dataLines = lines.slice(3);

  for (const line of dataLines) {
    // Basic CSV parse (split by comma, ignoring commas in quotes isn't strictly needed here if no notes have commas, but let's be careful)
    const cols = line.split(',');
    if (cols.length < 15) continue;

    const gameNum = parseInt(cols[0], 10);
    const date = cols[1];
    const mode = cols[2];
    const duration = parseInt(cols[3], 10) || 0;
    
    // Players (4-5, 6-7, 8-9, 10-11, 12-13)
    const p1Name = cols[4]; const h1Name = cols[5];
    const p2Name = cols[6]; const h2Name = cols[7];
    const p3Name = cols[8]; const h3Name = cols[9];
    const p4Name = cols[10]; const h4Name = cols[11];
    const p5Name = cols[12]; const h5Name = cols[13];
    
    const result = cols[14];
    
    console.log(`Inserting Game #${gameNum}...`);
    
    const gameRes = await client.execute({
      sql: `INSERT INTO games (user_id, game_num, date, mode, result, duration) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [userId, gameNum, date, mode, result, duration]
    });
    
    const gameId = gameRes.rows[0].id;

    const players = [
      { p: p1Name, h: h1Name },
      { p: p2Name, h: h2Name },
      { p: p3Name, h: h3Name },
      { p: p4Name, h: h4Name },
      { p: p5Name, h: h5Name }
    ];

    let slot = 0;
    for (const player of players) {
      if (player.p && player.p.trim() !== '') {
        await client.execute({
          sql: `INSERT INTO game_players (game_id, player_name, hero_name, slot) VALUES (?, ?, ?, ?)`,
          args: [gameId, player.p, player.h, slot]
        });
      }
      slot++;
    }
  }

  console.log("Migration Complete! Uploaded " + dataLines.length + " games.");
}

migrate().catch(console.error);
