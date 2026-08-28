import { REST, Routes } from 'discord.js';

// Setup environment variables manually if not using a bundler
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const commands = [
  {
    name: 'sentinel',
    description: '🛡️ Sentinel MLBB AI Assistant & Pro Gaming Tools',
    options: [
      {
        name: 'hero',
        description: '🔍 Dapatkan info terperinci hero, counter-pick, skill & build',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'name',
            description: 'Nama hero (taip untuk carian auto-lengkap)',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
        ],
      },
      {
        name: 'draft',
        description: '🎯 Pembantu drafting pintar, cadangan pick/ban & counter lawan',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'meta',
        description: '🔥 Senarai hero meta terkini, ban priority & top tier mengikut role',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'stats',
        description: '📊 Lihat statistik perlawanan squad/pemain, winrate & rekod game',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'user',
            description: 'Tag pemain (pilihan, lalai: diri sendiri)',
            type: 6, // USER
            required: false,
          },
        ],
      },
      {
        name: 'addgame',
        description: '🎮 Rekod perlawanan MLBB baru ke dalam pangkalan data',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'result',
            description: 'Keputusan perlawanan (Win / Loss)',
            type: 3, // STRING
            required: true,
            choices: [
              { name: '🏆 Win (Menang)', value: 'Win' },
              { name: '💀 Loss (Kalah)', value: 'Loss' },
            ],
          },
          {
            name: 'hero',
            description: 'Hero yang anda mainkan',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: 'duration',
            description: 'Tempoh perlawanan (dalam minit)',
            type: 4, // INTEGER
            required: true,
          },
          {
            name: 'notes',
            description: 'Nota tambahan (MVP, item, squad, dll)',
            type: 3, // STRING
            required: false,
          },
        ],
      },
      {
        name: 'ask',
        description: '💬 Tanya Sentinel AI sebarang soalan peribadi atau am',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'question',
            description: 'Soalan anda',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'askmlbb',
        description: '⚔️ Tanya AI Coach khusus untuk strategi MLBB, counter-pick & gameplay',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'question',
            description: 'Soalan strategi atau counter hero MLBB',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'model',
        description: '⚙️ Urus atau tukar model AI pintar yang digunakan oleh Sentinel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'select',
            description: 'Pilih model AI',
            type: 3, // STRING
            required: false,
            choices: [
              { name: '🚀 Auto (Gemma 4 31B Flash)', value: 'auto' },
              { name: '🧠 DeepSeek V3 (Reasoning)', value: 'deepseek-v3' },
              { name: '⚡ Qwen 2.5 72B (Versatile)', value: 'qwen-2.5-72b' },
              { name: '🎯 Nemotron 3.5 Lightning', value: 'nvidia/nemotron-3.5-lightning:free' },
            ],
          },
        ],
      },
      {
        name: 'launch',
        description: '🚀 Buka Web Dashboard Aktiviti Sentinel MLBB',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'help',
        description: '📖 Paparkan panduan lengkap semua arahan Sentinel',
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
