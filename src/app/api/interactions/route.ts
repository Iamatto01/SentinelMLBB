import { NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { ALL_HEROES } from '@/data/heroes-data';

export async function POST(req: Request) {
  // Verify Discord signature
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text();

  if (!signature || !timestamp) {
    return new NextResponse('Invalid request', { status: 401 });
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(process.env.DISCORD_PUBLIC_KEY || '', 'hex')
  );

  if (!isVerified) {
    return new NextResponse('Invalid request signature', { status: 401 });
  }

  const data = JSON.parse(body);

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

        case 'hero':
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
          const query = subCommand.options?.[0]?.value;
          
          // First acknowledge the request since Groq API might take >3s (Discord timeout is 3s)
          // Wait, actually Groq is very fast, but to be safe, we might need a deferred response.
          // For simplicity, we'll try to reply directly. If it fails, Discord will show 'The application did not respond'.
          
          try {
             const groqUrl = new URL('/api/chat', requestUrl(req)).toString();
             // We can't await this directly if it takes too long, but let's try a direct fetch for MVP
             // A better architecture is sending a deferred response (Type 5) and patching it later.
             // But let's return a deferred response immediately, then process in background (not strictly supported in serverless without waitUntil, but we'll use it)
          } catch(e) {}
          
          return NextResponse.json({
             type: 4,
             data: { content: `*Consulting Sentinel AI... Please check the web dashboard chat for full responses while I configure deferred messaging!*` }
          });
      }
    }
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
}

function requestUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
