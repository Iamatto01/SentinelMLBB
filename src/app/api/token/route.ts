import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Exchange the code for an access token using Discord's OAuth2 endpoint
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to exchange token with Discord:', errorData);
      return NextResponse.json(
        { error: 'Failed to exchange token' },
        { status: response.status }
      );
    }

    const { access_token } = await response.json();

    // Return only the access_token back to the client
    return NextResponse.json({ access_token });
  } catch (error) {
    console.error('API /token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
