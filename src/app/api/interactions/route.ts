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
            // Return a placeholder for now - Groq deferred messaging needs more architecture
            return NextResponse.json({
              type: 4,
              data: { content: `*Consulting Sentinel AI... Please check the web dashboard chat for full responses while I configure deferred messaging!*` }
            });
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
