import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { ALL_HEROES } from '@/data/heroes-data';
import groq from '@/lib/groq';

export async function POST(req: Request) {
  try {
    // Verify Discord signature
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const body = await req.text();

    if (!signature || !timestamp) {
      return new NextResponse('Invalid request', { status: 401 });
    }

    const pubKey = (process.env.DISCORD_PUBLIC_KEY || '').trim();

    // IMPORTANT: verifyKey in discord-interactions v4 is async (returns Promise)
    const isVerified = await verifyKey(body, signature, timestamp, pubKey);

    if (!isVerified) {
      console.error('Invalid signature check failed. Ensure DISCORD_PUBLIC_KEY is correct.');
      return new NextResponse('Invalid request signature', { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('Incoming Interaction:', JSON.stringify(data, null, 2));

    // Type 1: PING (Discord verification)
    if (data.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // Type 2: APPLICATION_COMMAND
    if (data.type === 2) {
      const { name, options } = data.data;

      if (name === 'sentinel') {
        const subCommand = options?.[0];

        if (!subCommand) {
          return NextResponse.json({
            type: 4,
            data: { content: 'Please provide a sub-command (e.g. `/sentinel launch`)' },
          });
        }

        switch (subCommand.name) {
          case 'launch':
            return NextResponse.json({
              type: 4,
              data: {
                content: '🚀 Launching Sentinel MLBB...',
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        label: 'Open Dashboard',
                        style: 5,
                        url: 'https://sentinel-mlbb.vercel.app/dashboard',
                      },
                    ],
                  },
                ],
              },
            });

          case 'hero': {
            const heroQuery = subCommand.options?.[0]?.value?.toLowerCase();
            const hero = ALL_HEROES.find((h) => h.name.toLowerCase().includes(heroQuery));
            if (!hero) {
              return NextResponse.json({
                type: 4,
                data: { content: `Hero **${heroQuery}** not found.` },
              });
            }
            return NextResponse.json({
              type: 4,
              data: {
                embeds: [
                  {
                    title: hero.name,
                    description: hero.description,
                    color: 0x3498db,
                    fields: [
                      { name: 'Role', value: hero.role.join(', '), inline: true },
                      { name: 'Specialty', value: hero.specialty, inline: true },
                      { name: 'Difficulty', value: `${hero.difficulty}/3`, inline: true },
                      { name: 'Playstyle', value: hero.tags.join(', '), inline: false },
                    ],
                    thumbnail: { url: hero.image },
                  },
                ],
              },
            });
          }

          case 'draft':
            return NextResponse.json({
              type: 4,
              data: {
                content: '**Drafting Tips:**\n1. Pick your core heroes first.\n2. Ensure you have proper CC and synergy.\n3. Adjust based on enemy counter-picks!',
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        label: 'Open Draft Simulator',
                        style: 5,
                        url: 'https://sentinel-mlbb.vercel.app/dashboard/draft',
                      },
                    ],
                  },
                ],
              },
            });

          case 'ask': {
            const query = subCommand.options?.[0]?.value || "";
            const userId = data.member?.user?.id || data.user?.id || "unknown_user";
            
            try {
              const { db } = await import('@/lib/db');
              const activeModel = await (groq as any).getActiveModel();
              
              // Initialize chat history table if not exists
              await db.execute(`
                CREATE TABLE IF NOT EXISTS discord_chat_history (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  role TEXT,
                  content TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);
              
              // Fetch history for this user
              const historyRes = await db.execute({
                sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 6",
                args: [userId]
              });
              
              const pastMessages = historyRes.rows.reverse().map(r => ({
                role: r.role as 'user' | 'assistant',
                content: r.content as string
              }));
              
              const systemPrompt = `You are "Sentinel AI", an elite Mobile Legends: Bang Bang (MLBB) coaching and personal assistant.
Your job is to provide concise, highly strategic, and accurate drafting and gameplay advice, and remember the conversation context.
You have a tool called 'query_database' to execute read-only SQL queries on the user's MLBB database to analyze stats dynamically.
The database has these tables:
- users(id, name)
- games(id, date, mode, result)
- game_players(id, game_id, slot, player_name, hero_name). slot <= 5 is ally, slot > 5 is enemy.

Keep your answer concise (Discord limits messages to 2000 chars), formatting neatly with markdown. Be extremely helpful, friendly, and act as their personal assistant!`;

              const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...pastMessages,
                { role: 'user', content: query }
              ];

              let chatCompletion = await groq.chat.completions.create({
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

              if (responseMessage?.tool_calls) {
                messages.push(responseMessage);
                
                for (const toolCall of responseMessage.tool_calls) {
                  if (toolCall.function?.name === 'query_database') {
                    try {
                      const args = JSON.parse(toolCall.function.arguments || '{}');
                      const sqlQuery = (args.query || '').trim();
                      let resultStr = "";
                      
                      if (sqlQuery.toUpperCase().match(/^(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)/)) {
                        resultStr = "Error: Only SELECT queries are allowed.";
                      } else {
                        const dbRes = await db.execute(sqlQuery);
                        resultStr = JSON.stringify(dbRes.rows);
                      }
                      
                      messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "query_database",
                        content: resultStr
                      });
                    } catch (err: any) {
                      messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "query_database",
                        content: "DB Error: " + err.message
                      });
                    }
                  }
                }
                
                // Second call with tool results
                chatCompletion = await groq.chat.completions.create({
                  messages,
                  model: activeModel,
                  temperature: 0.7,
                  max_tokens: 1000,
                });
              }

              const finalResponse = chatCompletion.choices[0]?.message?.content || 'I could not generate a response.';

              // Save to DB asynchronously
              db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', query] }).catch(console.error);
              db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] }).catch(console.error);

              return NextResponse.json({
                type: 4,
                data: { content: finalResponse }
              });
              
            } catch (error: any) {
              console.error('Groq/DB Error in Discord Ask:', error);
              return NextResponse.json({
                type: 4,
                data: { content: `*I encountered an error while consulting the database or AI. Please try again!*` }
              });
            }
          }

          case 'model': {
            try {
              const selectOption = subCommand.options?.find((o: any) => o.name === 'select')?.value;

              if (selectOption) {
                await (groq as any).setActiveModel(selectOption);
                return NextResponse.json({
                  type: 4,
                  data: {
                    content: `✅ **Model successfully updated!**\nSentinel AI is now using: \`${selectOption}\``
                  }
                });
              } else {
                const currentModel = await (groq as any).getActiveModel();
                
                return NextResponse.json({
                  type: 4,
                  data: {
                    embeds: [
                      {
                        title: '⚙️ Sentinel AI — Model Configuration & Limits',
                        description: `Current Active Model: \`${currentModel}\`\n\nYou can switch models using \`/sentinel model select <model_id>\``,
                        color: 0x9b59b6,
                        fields: [
                          {
                            name: '📊 Active Model Limits',
                            value: currentModel === 'llama-3.3-70b-versatile'
                              ? '**Llama 3.3 70B (Versatile)**\n• Free Tier: **1,000 TPM** / 30 RPM\n• Paid Tier: **300,000 TPM** / 1,000 RPM\n*(High intelligence, low free limits)*'
                              : currentModel === 'llama-3.1-8b-instant'
                              ? '**Llama 3.1 8B (Instant)**\n• Free Tier: **6,000 TPM** / 30 RPM\n• Paid Tier: **250,000 TPM** / 1,000 RPM\n*(Very fast, high free-tier limits)*'
                              : currentModel === 'gemma2-9b-it'
                              ? '**Gemma 2 9B (Google)**\n• Free Tier: **6,000 TPM** / 30 RPM\n• Paid Tier: **250,000 TPM** / 1,000 RPM\n*(Balanced)*'
                              : currentModel === 'llama-3.2-3b-preview'
                              ? '**Llama 3.2 3B (Preview)**\n• Free Tier: **6,000 TPM** / 30 RPM\n• Paid Tier: **250,000 TPM** / 1,000 RPM\n*(Super lightweight & fast)*'
                              : `**${currentModel}**\n• Limits vary depending on Groq Cloud configuration.`,
                            inline: false
                          },
                          {
                            name: '💡 Rate Limits Tip',
                            value: 'If you frequently receive rate-limit warnings or "Error 429", choose \`llama-3.1-8b-instant\` or \`llama-3.2-3b-preview\`. They have 6x higher token-per-minute (TPM) allowance on the free tier compared to Llama 3.3 70B!',
                            inline: false
                          }
                        ]
                      }
                    ]
                  }
                });
              }
            } catch (error: any) {
              console.error('Groq model configuration error:', error);
              return NextResponse.json({
                type: 4,
                data: { content: `❌ Failed to retrieve or configure the model. Error: ${error.message || error}` }
              });
            }
          }

          case 'addgame': {
            try {
              const { db } = await import('@/lib/db');
              const result = subCommand.options?.find((o: any) => o.name === 'result')?.value || 'Win';
              const hero = subCommand.options?.find((o: any) => o.name === 'hero')?.value || 'Unknown';
              const duration = subCommand.options?.find((o: any) => o.name === 'duration')?.value || 0;
              const notes = subCommand.options?.find((o: any) => o.name === 'notes')?.value || '';
              
              const playerName = data.member?.user?.username || data.user?.username || 'me';

              // 1. Insert into games table (default user_id = 1)
              const gameRes = await db.execute({
                sql: "INSERT INTO games (user_id, date, mode, duration, result, notes) VALUES (1, datetime('now'), 'Ranked', ?, ?, ?) RETURNING id",
                args: [duration, result, notes]
              });
              
              const gameId = gameRes.rows[0].id;
              
              // 2. Insert into game_players table (slot 1)
              await db.execute({
                sql: "INSERT INTO game_players (game_id, slot, player_name, hero_name) VALUES (?, 1, ?, ?)",
                args: [gameId, playerName, hero]
              });
              
              return NextResponse.json({
                type: 4,
                data: {
                  content: `✅ **Game Successfully Recorded!**`,
                  embeds: [
                    {
                      title: 'Match Details',
                      color: result === 'Win' ? 0x2ecc71 : 0xe74c3c,
                      fields: [
                        { name: 'Game ID', value: `${gameId}`, inline: true },
                        { name: 'Result', value: result, inline: true },
                        { name: 'Duration', value: `${duration} mins`, inline: true },
                        { name: 'Hero', value: hero, inline: true },
                        { name: 'Player', value: playerName, inline: true },
                        { name: 'Notes', value: notes || 'None', inline: false },
                      ]
                    }
                  ]
                }
              });
            } catch (err: any) {
              console.error('AddGame Error:', err);
              return NextResponse.json({
                type: 4,
                data: { content: `❌ Failed to record game. Error: ${err.message}` }
              });
            }
          }

          case 'help':
            return NextResponse.json({
              type: 4,
              data: {
                embeds: [
                  {
                    title: '🛡️ Sentinel MLBB — Commands',
                    description: 'Your AI-powered MLBB coaching assistant.',
                    color: 0xf59e0b,
                    fields: [
                      { name: '`/sentinel launch`', value: 'Open the Sentinel MLBB Dashboard', inline: false },
                      { name: '`/sentinel hero <name>`', value: 'Get detailed info about a hero', inline: false },
                      { name: '`/sentinel draft`', value: 'Get drafting tips & open the draft simulator', inline: false },
                      { name: '`/sentinel ask <question>`', value: 'Ask Sentinel AI for coaching advice', inline: false },
                      { name: '`/sentinel addgame`', value: 'Record a new MLBB game into the database', inline: false },
                      { name: '`/sentinel model [select]`', value: 'View or select the AI model used by Sentinel', inline: false },
                      { name: '`/sentinel help`', value: 'Show this help message', inline: false },
                    ],
                  },
                ],
              },
            });

          default:
            return NextResponse.json({
              type: 4,
              data: { content: `Unknown sub-command \`${subCommand.name}\`. Use \`/sentinel help\` to see available commands.` },
            });
        }
      }
    }

    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Interaction handler error:', error);
    // Always return a valid response so Discord doesn't show "did not respond"
    return NextResponse.json({
      type: 4,
      data: { content: '❌ An error occurred processing this command. Please try again.' },
    });
  }
}
