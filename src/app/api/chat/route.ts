import { NextResponse } from 'next/server';
import llm from '@/lib/groq';
import { ALL_HEROES } from '@/data/heroes-data';

// Glossary so the model understands the Indonesian slang tags used in hero data.
const TAG_GLOSSARY = `
Tag Glossary (Indonesian slang used in hero data):
- Playstyle: "barbar" = aggressive early-game fighter, "semi-barbar" = conditionally aggressive, "situational-barbar" = aggressive only in specific matchups, "playsafe" = scaling/defensive early.
- Strategy: "high-ground" = objective/siege focused, "tebal" = tanky frontline, "healer" = sustain support, "split-push" = side-lane pressure, "counter-split-push" = anti-side-lane.
- CC: "full-cc" = multiple hard CC abilities, "semi-cc" = one CC ability, "no-cc" = no crowd control.
- Timing: "early" = power spike early game, "mid" = mid game, "late" = late game scaling.
`;

// Build a compact hero index (name + key attributes only) to keep the prompt small.
function getHeroIndex() {
  return ALL_HEROES.map(h =>
    `${h.name} [${h.role.join('/')}] - CC:${h.cc}, Timing:${h.timing.join('/')}, Style:${h.tags.join(',')}, Strat:${h.strategy.join(',')}, Specialty:${h.specialty}`
  ).join('\n');
}

// Lightweight RAG: extract hero names mentioned in the user's latest message
// and return their full data so the model has rich context only for relevant heroes.
function getRelevantHeroContext(userText: string): string {
  const text = userText.toLowerCase();
  const matched = ALL_HEROES.filter(h =>
    text.includes(h.name.toLowerCase()) || text.includes(h.id.toLowerCase())
  );
  // If no heroes mentioned, return empty — the model will use the compact index instead.
  if (matched.length === 0) return '';
  return '\n\nDetailed data for heroes mentioned in the question:\n' +
    matched.map(h =>
      `${h.name}: Role=${h.role.join('/')}, CC=${h.cc}, Timing=${h.timing.join('/')}, ` +
      `Style=${h.tags.join(',')}, Strategy=${h.strategy.join(',')}, Specialty=${h.specialty}, ` +
      `Difficulty=${h.difficulty}/3. ${h.description}`
    ).join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const sid = sessionId || 'anonymous';

    // The last user message drives RAG context retrieval.
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const relevantHeroes = lastUserMsg ? getRelevantHeroContext(lastUserMsg.content) : '';

    const systemPrompt = `You are "Sentinel", a friendly general-purpose AI assistant for a gaming community.
You can chat about anything — not just Mobile Legends. Be helpful, concise, and natural.

${TAG_GLOSSARY}

Here is a compact hero index (for MLBB questions only):
${getHeroIndex()}
${relevantHeroes}

Guidelines:
1. Match the user's language — if they speak Malay, reply in casual Malaysian Malay. If English, reply in English.
2. Keep responses short and conversational. No monologues or internal analysis.
3. For MLBB hero questions, use the hero data above. For other topics, just be a helpful assistant.
4. Don't prefix your reply with "Response:" or any labels. Just answer directly.`;

    const activeModel = await llm.getActiveModel();

    // Save ONLY the latest user message to memory (avoid duplicates — the frontend
    // already sends the full conversation history, so we don't re-inject DB memory).
    if (lastUserMsg) {
      llm.saveConversationMemory(sid, 'user', lastUserMsg.content);
    }

    // Send: system + frontend history only. No DB memory re-injection (prevents dupes).
    const chatCompletion = await llm.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      model: activeModel,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseContent = chatCompletion.choices?.[0]?.message?.content
      || chatCompletion.choices?.[0]?.message?.reasoning_content
      || 'I could not generate a response.';

    // Save assistant response to memory for future sessions.
    llm.saveConversationMemory(sid, 'assistant', responseContent);

    return NextResponse.json({ role: 'assistant', content: responseContent, sessionId: sid });
  } catch (error: any) {
    console.error('LLM API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
