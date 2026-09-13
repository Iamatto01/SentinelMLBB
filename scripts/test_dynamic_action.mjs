import { extractDiscordActionCode, executeDynamicDiscordAction } from '../src/lib/dynamic-actions';

const sampleLLMResponse = \
Boleh, saya bantu buatkan tag untuk semua ahli tanpa sebarang rank sekarang!

\\\discord-action
const mockRoles = ['Member', 'Squad Tag'];
log('Found roles:', mockRoles.join(', '));
return 'Berjaya sediakan tag untuk ' + mockRoles.length + ' role!';
\\\

Harap ini membantu! ✨
\;

const { code, explanationText } = extractDiscordActionCode(sampleLLMResponse);
console.log('Extracted code exists:', Boolean(code));
console.log('Explanation text:', explanationText.trim());

async function runTest() {
  const mockContext = {
    guild: {
      ownerId: '1103825075809030186',
      name: 'Test Server',
    },
    channel: { id: '123' },
    author: { id: '1103825075809030186', username: 'testuser' },
    member: { permissions: { has: () => true } },
    botMember: null,
    client: {},
    message: {},
  };

  const res = await executeDynamicDiscordAction(code, mockContext);
  console.log('Execution success:', res.success);
  console.log('Execution result:', res.result);
  console.log('Execution logs:', res.output);
  console.log('Duration:', res.durationMs + 'ms');
}

runTest().catch(console.error);
