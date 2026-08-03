import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { ALL_HEROES } from '@/data/heroes-data';
import llm from '@/lib/groq';

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

          case 'ask':
          case 'askmlbb': {
            const query = subCommand.options?.[0]?.value || "";
            const userId = data.member?.user?.id || data.user?.id || "unknown_user";

            try {
              const { db } = await import('@/lib/db');
              const activeModel = await llm.getActiveModel();
              
              await db.execute(`
                CREATE TABLE IF NOT EXISTS discord_chat_history (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT, role TEXT, content TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);
              
              const historyRes = await db.execute({
                sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 6",
                args: [userId]
              });
              
              const pastMessages = historyRes.rows.reverse().map(r => ({
                role: r.role as 'user' | 'assistant',
                content: r.content as string
              }));

              const userName = data.member?.user?.username || data.user?.username || 'member';
              const isMlbbMode = subCommand.name === 'askmlbb';
              
              const systemPrompt = isMlbbMode
                ? `You are "Sentinel", a close squad member and personal MLBB coach/assistant to ${userName} in this server.
Your Persona:
- Talk like a knowledgeable, friendly, and witty squad member / personal assistant ("geng", "bro", "member").
- Provide concise, highly strategic, and accurate MLBB drafting, hero counter pick, and gameplay advice.
- Blend casual Bahasa Melayu / English naturally. Keep responses concise (under 2000 chars) with neat markdown.`
                : `You are "Sentinel", a close squad member and dedicated personal assistant to ${userName} in this server.
Your Persona:
- Talk like a loyal, friendly, and witty squad member / personal assistant ("geng", "bro", "member").
- Be supportive, highly intelligent, and ready to assist ${userName} with anything (casual chat, server questions, advice, coding, or games).
- Blend casual Bahasa Melayu / English naturally depending on how ${userName} speaks to you.
- Keep responses concise (under 2000 chars), formatted neatly with markdown.`;

              const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...pastMessages,
                { role: 'user', content: query }
              ];

              let chatCompletion = await llm.chat.completions.create({
                messages,
                model: activeModel,
                temperature: 0.7,
                max_tokens: 1000,
              });

              const finalResponse = chatCompletion.choices[0]?.message?.content
                || chatCompletion.choices[0]?.message?.reasoning_content
                || 'I could not generate a response.';

              db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', query] }).catch(console.error);
              db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] }).catch(console.error);

              return NextResponse.json({
                type: 4,
                data: { content: finalResponse }
              });
            } catch (error: any) {
              console.error('LLM/DB Error in Discord Ask:', error);
              return NextResponse.json({
                type: 4,
                data: { content: `*I encountered an error while consulting the database or AI: ${error.message || error}*` }
              });
            }
          }

          case 'model': {
            try {
              const selectOption = subCommand.options?.find((o: any) => o.name === 'select')?.value;

              if (selectOption) {
                await llm.setActiveModel(selectOption);
                return NextResponse.json({
                  type: 4,
                  data: {
                    content: `✅ **Model successfully updated!**\nSentinel AI is now using: \`${selectOption}\``
                  }
                });
              } else {
                const currentModel = await llm.getActiveModel();
                
                return NextResponse.json({
                  type: 4,
                  data: {
                    embeds: [
                      {
                        title: '⚙️ Sentinel AI — Model Configuration',
                        description: `Current Active Model: \`${currentModel}\`\n\nYou can switch models using \`/sentinel model select <model_id>\``,
                        color: 0x9b59b6,
                        fields: [
                          {
                            name: '📊 Available Models',
                            value: '• `auto` — DeepSeek Flash (default)\n• `deepseek-v3` — DeepSeek V3\n• `deepseek-r1` — DeepSeek R1\n• `qwen-2.5-72b` — Qwen 2.5 72B\n\nPowered by your mini server at `bandelbanget.xyz`',
                            inline: false
                          },
                          {
                            name: '💡 Fallback',
                            value: 'If mini server is down, automatically falls back to Groq API.',
                            inline: false
                          }
                        ]
                      }
                    ]
                  }
                });
              }
            } catch (error: any) {
              console.error('LLM model configuration error:', error);
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
