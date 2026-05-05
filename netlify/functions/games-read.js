const { getDoc } = require('./utils/sheetsClient');
const { verifyAuth } = require('./utils/authMiddleware');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    // 1. Verify user token
    const user = await verifyAuth(event);
    
    // 2. Get user's Sheet ID (In a real app, query the master sheet or database)
    // For this prototype, we'll extract it from a custom header if provided, or use a default test sheet if available
    const sheetId = event.headers['x-sheet-id'];
    
    if (!sheetId || sheetId === 'mock_sheet_id_123') {
       return {
         statusCode: 200,
         body: JSON.stringify([
           { num: 1, date: "2026-05-01", mode: "Ranked", duration: 18, result: "Win", players: ["Aliff", "Bob", "Charlie", "Danish", "Ezra"], heroes: ["Tigreal", "Ling", "Kagura", "Beatrix", "Mathilda"], notes: "Mock Game" }
         ])
       };
    }

    // 3. Connect to sheet
    const doc = await getDoc(sheetId);
    const sheet = doc.sheetsByTitle['🎮 Game Log'];
    
    if (!sheet) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Game Log tab not found in sheet' }) };
    }

    // 4. Fetch rows
    const rows = await sheet.getRows({ offset: 2 }); // Skip header rows (assuming row 3 is headers, so offset 2 skips row 1 and 2)
    
    // 5. Format data
    const games = rows.map(row => {
      return {
        num: row.get('#'),
        date: row.get('Date'),
        mode: row.get('Mode'),
        duration: row.get('Duration'),
        players: [row.get('Player 1'), row.get('Player 2'), row.get('Player 3'), row.get('Player 4'), row.get('Player 5')].filter(Boolean),
        heroes: [row.get('Hero 1'), row.get('Hero 2'), row.get('Hero 3'), row.get('Hero 4'), row.get('Hero 5')].filter(Boolean),
        result: row.get('Result'),
        notes: row.get('Notes')
      };
    }).filter(g => g.result === 'Win' || g.result === 'Lose'); // Only return valid games

    return {
      statusCode: 200,
      body: JSON.stringify(games)
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
