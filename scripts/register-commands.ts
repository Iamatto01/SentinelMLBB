import { REST, Routes } from 'discord.js';

// Setup environment variables manually if not using a bundler
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const commands = [
  {
    name: 'sentinel',
    description: 'Sentinel MLBB AI Assistant and Tools',
    options: [
      {
        name: 'launch',
        description: 'Launch the Sentinel MLBB Dashboard Activity',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'hero',
        description: 'Get information about a specific MLBB hero',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'name',
            description: 'Name of the hero',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'draft',
        description: 'Get drafting tips or launch the draft simulator',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'ask',
        description: 'Ask Sentinel AI (Groq) for MLBB coaching or meta advice',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'question',
            description: 'Your question for the AI coach',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'help',
        description: 'Show all available Sentinel commands',
        type: 1, // SUB_COMMAND
      },
    ],
  },
];

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or NEXT_PUBLIC_DISCORD_CLIENT_ID in .env.local");
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // Use POST to update individually so we don't accidentally delete the Activity Entry Point Command
    for (const command of commands) {
      await rest.post(Routes.applicationCommands(clientId), { body: command });
    }

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
