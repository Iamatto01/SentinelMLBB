import { NextResponse } from 'next/server';
import groq from '@/lib/groq';
import { ALL_HEROES } from '@/data/heroes-data';

// Helper to format hero data context for the AI
function getHeroContext() {
  return ALL_HEROES.map(h => 
    `${h.name}: Role=${h.role.join('/')}, Difficulty=${h.difficulty}/3, Tags=${h.tags.join(',')}, Timing=${h.timing.join(',')}, Strategy=${h.strategy.join(',')}, Specialty=${h.specialty}`
  ).join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const systemPrompt = `You are "Sentinel AI", an elite Mobile Legends: Bang Bang (MLBB) coaching assistant.
Your job is to provide concise, highly strategic, and accurate drafting and gameplay advice.

Here is the current database of heroes and their attributes in our system:
${getHeroContext()}

When answering questions:
1. Always reference the hero attributes above if relevant.
2. If asked about a hero not in the list, just mention you only have data on the currently tracked heroes.
3. Keep responses concise and formatted neatly with markdown.
4. Don't use overly long paragraphs. Bullet points are great.
5. If someone asks for a counter-pick, suggest heroes with strategies/tags that naturally counter the enemy's specialty (e.g., CC counters high mobility).
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || 'I could not generate a response.';

    return NextResponse.json({ role: 'assistant', content: responseContent });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
