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
        description: 'Ask Sentinel AI any general question (General AI Assistant)',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'question',
            description: 'Your question for the AI assistant',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'askmlbb',
        description: 'Ask Sentinel AI specifically for MLBB coaching, counters, or meta advice',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'question',
            description: 'Your MLBB question for the AI coach',
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
              { name: 'Auto (DeepSeek Flash)', value: 'auto' },
              { name: 'DeepSeek V3', value: 'deepseek-v3' },
              { name: 'DeepSeek R1', value: 'deepseek-r1' },
              { name: 'Qwen 2.5 72B', value: 'qwen-2.5-72b' },
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

    const validGuildId = guildId && guildId.trim().length > 0 ? guildId.trim() : null;

    const route = validGuildId
      ? Routes.applicationGuildCommands(clientId, validGuildId)
      : Routes.applicationCommands(clientId);

    const existing = (await rest.get(route)) as any[];
    const entryPoints = existing.filter(c => c.type === 4);
    
    console.log(`Found ${entryPoints.length} existing Primary Entry Point command(s).`);

    await rest.put(route, { body: [...commands, ...entryPoints] });

    console.log(validGuildId
      ? `Successfully registered GUILD commands for server ${validGuildId}.`
      : 'Successfully registered GLOBAL commands (boleh guna di mana-mana server, ambil ~1 jam untuk muncul).'
    );
  } catch (error) {
    console.error(error);
  }
})();
