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

    const systemPrompt = `You are "Sentinel AI", an elite Mobile Legends: Bang Bang (MLBB) coaching assistant.
Your job is to provide concise, highly strategic, and accurate drafting and gameplay advice.

${TAG_GLOSSARY}

Here is the compact index of all tracked heroes (Name [Roles] - CC, Timing, Style, Strategy, Specialty):
${getHeroIndex()}
${relevantHeroes}

When answering questions:
1. Reference the hero attributes above when relevant. Use the glossary to interpret tags.
2. If asked about a hero not in the list, say you only have data on currently tracked heroes.
3. Keep responses concise and formatted neatly with markdown. Bullet points are great.
4. For counter-pick requests, reason about CC, timing, and playstyle: e.g. full-cc counters high mobility, early-timing heroes pressure late-scalers, split-pushers need counter-split-push answers.
5. Don't invent heroes or abilities that aren't in the data.`;

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
