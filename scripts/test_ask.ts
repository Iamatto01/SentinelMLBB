import fs from 'fs';
import path from 'path';

// Load .env.local
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
envLocal.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2 && !line.startsWith('#')) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

import llm from '../src/lib/groq';
import { db } from '../src/lib/db';

async function testAskFullFlow() {
  console.log('=== Testing Full Discord Ask Flow with Tool Resolution ===');
  try {
    const activeModel = await llm.getActiveModel();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS discord_chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        role TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const query = "Siapa hero counter Fanny?";
    const userId = "test_user_123";

    const historyRes = await db.execute({
      sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 6",
      args: [userId]
    });

    const pastMessages = historyRes.rows.reverse().map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content as string
    }));

    const systemPrompt = `You are Sentinel AI...`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...pastMessages,
      { role: 'user', content: query }
    ];

    console.log('Step 1: First call to LLM...');
    let chatCompletion = await llm.chat.completions.create({
      messages,
      model: activeModel,
      temperature: 0.7,
      max_tokens: 1000,
      tools: [
        {
          type: "function",
          function: {
            name: "query_database",
            description: "Executes a read-only SELECT SQL query on the MLBB SQLite database.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The SQLite SELECT query." }
              },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto"
    });

    const responseMessage = chatCompletion.choices[0]?.message;
    console.log('Step 1 Response:', responseMessage);

    if (responseMessage?.tool_calls) {
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function?.name === 'query_database') {
          try {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const sqlQuery = (args.query || '').trim();
            console.log('Executing tool query:', sqlQuery);
            let resultStr = "";

            if (sqlQuery.toUpperCase().match(/^(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)/)) {
              resultStr = "Error: Only SELECT queries are allowed.";
            } else {
              const dbRes = await db.execute(sqlQuery);
              resultStr = JSON.stringify(dbRes.rows);
            }

            console.log('Tool Query Result:', resultStr);

            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: "query_database",
              content: resultStr
            });
          } catch (err: any) {
            console.error('Tool execution error:', err);
            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: "query_database",
              content: "DB Error: " + err.message
            });
          }
        }
      }

      console.log('Step 2: Second call to LLM with tool result...');
      chatCompletion = await llm.chat.completions.create({
        messages,
        model: activeModel,
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log('Step 2 Final Response:', chatCompletion.choices[0]?.message?.content);
    }
  } catch (e: any) {
    console.error('FULL FLOW ERROR:', e);
  }
}

testAskFullFlow();
