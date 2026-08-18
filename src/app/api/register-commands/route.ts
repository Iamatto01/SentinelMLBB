import { NextResponse } from 'next/server';

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
        description: 'Ask Sentinel AI (DeepSeek Flash) for MLBB coaching or meta advice',
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
              { name: 'Gemini 2.0 Flash Lite (Free) - Fast', value: 'google/gemini-2.0-flash-lite-preview-02-05:free' },
              { name: 'Llama 3.3 70B (Free) - High Intelligence', value: 'meta-llama/llama-3.3-70b-instruct:free' },
              { name: 'DeepSeek R1 (Free) - Reasoning', value: 'deepseek/deepseek-r1:free' },
              { name: 'Qwen 2.5 72B (Free) - Balanced', value: 'qwen/qwen-2.5-72b-instruct:free' },
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

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

    if (!token || !clientId) {
      return NextResponse.json(
        { error: 'Missing DISCORD_BOT_TOKEN or NEXT_PUBLIC_DISCORD_CLIENT_ID' },
        { status: 500 }
      );
    }

    // Pure fetch — tak payah discord.js (elak native dependencies)
    // First, get existing commands to preserve Entry Point
    const getResponse = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
      },
    });

    let existingCommands: any[] = [];
    if (getResponse.ok) {
      existingCommands = await getResponse.json();
    }

    // Preserve Entry Point command if exists
    const entryPoint = existingCommands.find((c: any) => c.type === 4); // type 4 = ENTRY_POINT
    const commandsToRegister = entryPoint ? [entryPoint, ...commands] : commands;

    const response = await fetch(`https://discord.com/api/v10/applications/${clientId}/commands`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${token}`,
      },
      body: JSON.stringify(commandsToRegister),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Discord API error:', error);
      return NextResponse.json(
        { error: `Discord API error: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Global slash commands registered successfully! Boleh guna di mana-mana server dalam ~1 jam.',
      commands: result.map((c: any) => `/${c.name}`),
      count: result.length
    });
  } catch (error: any) {
    console.error('Register commands error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register commands' },
      { status: 500 }
    );
  }
}
