const fs = require('fs');
const { createClient } = require('@libsql/client');

const env = fs.readFileSync('.dev.vars', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const client = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_TOKEN
});

async function run() {
  await client.execute('DELETE FROM game_players');
  await client.execute('DELETE FROM games');
  console.log('Cleaned');
}
run();
