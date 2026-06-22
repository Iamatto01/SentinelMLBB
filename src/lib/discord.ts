import { DiscordSDK } from '@discord/embedded-app-sdk';

// Initialize the Discord SDK.
// Ensure you have NEXT_PUBLIC_DISCORD_CLIENT_ID set in your .env.local
export const discordSdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'dummy-client-id');

let authPromise: Promise<{ access_token: string; user: any }> | null = null;

export async function authenticateDiscord() {
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      await discordSdk.ready();

      // Authorize with Discord Client
      const { code } = await discordSdk.commands.authorize({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'dummy-client-id',
        response_type: 'code',
        state: '',
        prompt: 'none',
        // Provide scopes that your app needs
        scope: ['identify', 'guilds'],
      });

      // Call our Next.js API route to exchange the authorization code for an access token
      // Our API route will use the CLIENT_SECRET to make the actual request to Discord
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const { access_token } = await response.json();

      // Authenticate with the obtained token
      const auth = await discordSdk.commands.authenticate({
        access_token,
      });

      return { access_token, user: auth.user };
    } catch (error) {
      console.error('Failed to authenticate with Discord:', error);
      throw error;
    }
  })();

  return authPromise;
}
