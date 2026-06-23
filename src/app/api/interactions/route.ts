import { NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { ALL_HEROES } from '@/data/heroes-data';

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
            
            try {
              const { db } = await import('@/lib/db');
              const groq = (await import('@/lib/groq')).default;
              
              // Fetch system stats from DB (Allies are slot <= 5)
              const mostPlayedRes = await db.execute("SELECT player_name, COUNT(*) as games, SUM(CASE WHEN result = 'Win' THEN 1 ELSE 0 END) as wins FROM game_players JOIN games ON game_players.game_id = games.id WHERE slot <= 5 AND player_name != '' GROUP BY player_name ORDER BY games DESC LIMIT 10");
              
              const mostUsedHeroesRes = await db.execute("SELECT hero_name, COUNT(*) as picks FROM game_players WHERE slot <= 5 AND hero_name != '' GROUP BY hero_name ORDER BY picks DESC LIMIT 10");
              
              let contextStats = "Current Squad Stats:\n";
              contextStats += "- Top Players (Matches, Wins):\n" + mostPlayedRes.rows.map(r => `  * ${r.player_name}: ${r.games} matches, ${r.wins} wins`).join('\n') + "\n";
              contextStats += "- Most Used Heroes:\n" + mostUsedHeroesRes.rows.map(r => `  * ${r.hero_name}: ${r.picks} picks`).join('\n');
              
              const systemPrompt = `You are "Sentinel AI", an elite Mobile Legends: Bang Bang (MLBB) coaching assistant.
Your job is to provide concise, highly strategic, and accurate drafting and gameplay advice.

Here is the current system database of our squad's games:
${contextStats}

User asked: ${query}

Keep your answer concise (Discord limits messages to 2000 chars), formatting neatly with markdown. Be helpful and friendly!`;

              const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 500,
              });

              const responseContent = chatCompletion.choices[0]?.message?.content || 'I could not generate a response.';

              return NextResponse.json({
                type: 4,
                data: { content: responseContent }
              });
              
            } catch (error: any) {
              console.error('Groq/DB Error in Discord Ask:', error);
              return NextResponse.json({
                type: 4,
                data: { content: `*I encountered an error while consulting the database or AI. Please try again!*` }
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
