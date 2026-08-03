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
              
              await db.execute(`
                CREATE TABLE IF NOT EXISTS user_memories (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  memory_key TEXT,
                  memory_value TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(user_id, memory_key)
                )
              `);

              const lowerQuery = query.toLowerCase();
              const nickMatch = query.match(/(?:remember my name(?: is|,|\s+)|nama (?:panggilan )?aku|panggil (?:aku|saya)|name is|my name is|panggilan aku)\s+([A-Za-z0-9_-]+)/i);
              if (nickMatch && nickMatch[1]) {
                const nick = nickMatch[1].trim();
                if (nick.length > 1 && !['siapa', 'siapakah', 'apa', 'apakah', 'siapa?', 'apa?'].includes(nick.toLowerCase())) {
                  await db.execute({
                    sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'nickname', ?) ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
                    args: [userId, nick]
                  }).catch(console.error);
                }
              }

              if (lowerQuery.includes('jgn guna bro') || lowerQuery.includes('jangan panggil bro') || lowerQuery.includes('bukan bro') || lowerQuery.includes('jangan guna bro')) {
                await db.execute({
                  sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'forbidden_words', 'bro, kamu') ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
                  args: [userId]
                }).catch(console.error);
              }

              if (lowerQuery.includes('tukar kamu ke kau') || lowerQuery.includes('pakai kau') || lowerQuery.includes('guna kau') || lowerQuery.includes('pakai bahasa melayu')) {
                await db.execute({
                  sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'preferred_pronoun', 'kau') ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
                  args: [userId]
                }).catch(console.error);
              }

              // Fetch saved memories
              const memRes = await db.execute({
                sql: "SELECT memory_key, memory_value FROM user_memories WHERE user_id = ?",
                args: [userId]
              }).catch(() => ({ rows: [] }));

              let savedNickname = '';
              const factList: string[] = [];
              for (const r of memRes.rows) {
                if (r.memory_key === 'nickname') savedNickname = r.memory_value;
                factList.push(`- ${r.memory_key}: ${r.memory_value}`);
              }
              
              const historyRes = await db.execute({
                sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 16",
                args: [userId]
              });
              
              const pastMessages = historyRes.rows.reverse().map(r => ({
                role: r.role as 'user' | 'assistant',
                content: r.content as string
              }));

              await db.execute(`
                CREATE TABLE IF NOT EXISTS user_reminders (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT, channel_id TEXT, remind_at DATETIME,
                  reminder_text TEXT, status TEXT DEFAULT 'pending',
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);

              const userName = data.member?.user?.username || data.user?.username || 'member';
              const displayName = savedNickname || userName;

              // Check Reminder Intent
              const isCheckReminder = /do u have any reminder|any reminder|check reminder|senarai reminder|what are my reminder|ada reminder/i.test(lowerQuery);
              if (isCheckReminder) {
                const activeR = await db.execute({
                  sql: "SELECT remind_at, reminder_text FROM user_reminders WHERE user_id = ? AND status = 'pending' ORDER BY remind_at ASC",
                  args: [userId]
                });
                if (activeR.rows.length === 0) {
                  return NextResponse.json({ type: 4, data: { content: `📋 **${displayName}**, kau tak ada sebarang reminder aktif sekarang!` } });
                }
                let listText = `📋 **${displayName}**, ini senarai reminder kau yang tengah aktif:\n`;
                activeR.rows.forEach((r: any, idx: number) => {
                  listText += `${idx + 1}. 🕒 \`${r.remind_at}\` — **${r.reminder_text}**\n`;
                });
                return NextResponse.json({ type: 4, data: { content: listText } });
              }

              // Set Reminder Intent
              const isSetReminder = /setreminder|ingatkan|remind me|peringatan|set reminder|peringatkan/i.test(query);
              if (isSetReminder) {
                const timeMatch = lowerQuery.match(/(\d{1,2})[\.:](\d{2})\s*(am|pm)?/i) || lowerQuery.match(/(\d{1,2})\s*(am|pm)/i);
                if (timeMatch) {
                  let hours = parseInt(timeMatch[1], 10);
                  const mins = timeMatch[2] && !isNaN(parseInt(timeMatch[2], 10)) ? parseInt(timeMatch[2], 10) : 0;
                  const ampm = (timeMatch[3] || timeMatch[2] || '').toLowerCase();
                  if (ampm === 'pm' && hours < 12) hours += 12;
                  if (ampm === 'am' && hours === 12) hours = 0;

                  const now = new Date();
                  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
                  if (targetDate.getTime() <= now.getTime()) {
                    targetDate.setDate(targetDate.getDate() + 1);
                  }

                  let text = query
                    .replace(/\/setreminder/gi, '')
                    .replace(/ingatkan (?:aku|saya)?/gi, '')
                    .replace(/remind me/gi, '')
                    .replace(/\d{1,2}[\.:]\d{2}\s*(?:am|pm)?/gi, '')
                    .replace(/harini|today|besok|tomorrow/gi, '')
                    .replace(/<@!?\d+>/g, '')
                    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
                    .trim();

                  if (!text) text = 'Peringatan anda';
                  const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
                  const channelId = data.channel_id || '';

                  await db.execute({
                    sql: "INSERT INTO user_reminders (user_id, channel_id, remind_at, reminder_text, status) VALUES (?, ?, ?, ?, 'pending')",
                    args: [userId, channelId, remindAtSql, text]
                  });

                  return NextResponse.json({
                    type: 4,
                    data: { content: `⏰ **Noted, ${displayName}!** Aku dah setkan reminder pada \`${targetDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}\` untuk:\n> **${text}**\n\nNanti aku ping kau kat sini bila sampai masa!` }
                  });
                }
              }
              
              const isMlbbMode = subCommand.name === 'askmlbb';
              const systemPrompt = isMlbbMode
                ? `You are "Sentinel", a close squad member and personal MLBB coach to ${displayName} in this server.

SAVED USER FACTS FOR ${displayName}:
${factList.length > 0 ? factList.join('\n') : '- Primary Nickname: ' + displayName}

CRITICAL RULES:
- ALWAYS address the user as "${displayName}".
- Provide concise, highly strategic, and accurate MLBB drafting, hero counter pick, and gameplay advice.
- Blend casual Bahasa Melayu / English naturally. Keep responses concise (under 2000 chars) with neat markdown.`
                : `You are "Sentinel", a close squad member and dedicated personal assistant to ${displayName} in this server.

SAVED USER FACTS FOR ${displayName}:
${factList.length > 0 ? factList.join('\n') : '- Primary Nickname: ' + displayName}

CRITICAL RULES:
- ALWAYS address the user as "${displayName}" (NEVER forget their nickname!).
- Respect user preferences (e.g. if preferred pronoun is 'kau', use 'kau' / 'aku'. If forbidden word is 'bro', NEVER use 'bro'!).
- Talk like a loyal, friendly, and witty squad member & personal assistant ("geng", "member", "kau", "aku").
- DO NOT pretend or hallucinate non-existent Discord commands (e.g., /createevent, /setreminder). If asked for features not supported yet, answer truthfully in casual BM.
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

              // Await DB writes so serverless/Vercel never kills history inserts before returning
              try {
                await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', query] });
                await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] });
              } catch (e) {
                console.warn('[DB] History insert warning:', e);
              }

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
