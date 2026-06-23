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
        name: 'model',
        description: 'Manage or view the active AI model and limits',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'select',
            description: 'Select a new AI model',
            type: 3, // STRING
            required: false,
            choices: [
              { name: 'Llama 3.1 8B (Instant) - High Limits', value: 'llama-3.1-8b-instant' },
              { name: 'Llama 3.3 70B (Versatile) - High Intelligence', value: 'llama-3.3-70b-versatile' },
              { name: 'Gemma 2 9B (Google) - Balanced', value: 'gemma2-9b-it' },
              { name: 'Llama 3.2 3B (Preview) - Lightweight', value: 'llama-3.2-3b-preview' },
            ],
          },
        ],
      },
      {
        name: 'addgame',
        description: 'Record a new MLBB game match into the database',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'result',
            description: 'Match result (Win or Loss)',
            type: 3, // STRING
            required: true,
            choices: [
              { name: 'Win', value: 'Win' },
              { name: 'Loss', value: 'Loss' }
            ]
          },
          {
            name: 'hero',
            description: 'The hero you played',
            type: 3, // STRING
            required: true
          },
          {
            name: 'duration',
            description: 'Game duration in minutes',
            type: 4, // INTEGER
            required: true
          },
          {
            name: 'notes',
            description: 'Optional notes about the game',
            type: 3, // STRING
            required: false
          }
        ]
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
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_BOT_TOKEN or NEXT_PUBLIC_DISCORD_CLIENT_ID in .env.local");
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    await rest.put(route, { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
