import { ALL_HEROES } from '../data/heroes-data';

export interface ScannedPlayer {
  player_name: string;
  hero_name: string;
  team: 'ally' | 'enemy';
  kda?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
  isMvp?: boolean;
}

export interface MatchScanResult {
  success: boolean;
  result: 'Win' | 'Loss';
  mode: string;
  duration: number; // in minutes
  allies: ScannedPlayer[];
  enemies: ScannedPlayer[];
  rawText?: string;
  error?: string;
}

const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'google/gemini-flash-1.5',
  'google/gemini-2.5-flash',
  'meta-llama/llama-3.2-11b-vision-instruct',
];

function normalizeHeroName(rawHero: string): string {
  if (!rawHero) return '';
  const clean = rawHero.trim().toLowerCase();
  
  // Exact or direct match
  const exact = ALL_HEROES.find(h => h.name.toLowerCase() === clean || h.id.toLowerCase() === clean);
  if (exact) return exact.name;

  // Partial match
  const partial = ALL_HEROES.find(h => 
    h.name.toLowerCase().includes(clean) || clean.includes(h.name.toLowerCase())
  );
  if (partial) return partial.name;

  return rawHero.trim();
}

/**
 * Parses an MLBB postgame scoreboard image using AI Vision (OpenRouter).
 * Accepts a data URI or a public image URL.
 */
export async function parseScoreboardWithVision(imageUrlOrDataUri: string): Promise<MatchScanResult> {
  const apiKey = process.env.LLM_API_KEY || '';
  const apiBase = process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured in .env.local');
  }

  const prompt = `You are a Mobile Legends: Bang Bang (MLBB) post-game scoreboard recognition expert.
Analyze this post-game match result screenshot and extract:
1. "result": Did the player's team Win (Victory) or Lose (Defeat)? Return exactly "Win" or "Loss".
2. "mode": Game mode (e.g. "Ranked", "Classic", "Brawl", "Custom", "MCL", "Tournament"). Default to "Ranked" if unsure.
3. "duration": Match duration in minutes as an integer (e.g. 15 if 15:24). If not visible, return 0.
4. "allies": List of 5 friendly players (top or left team / Blue team / Victory side if player won).
5. "enemies": List of 5 enemy players (bottom or right team / Red team / Defeat side).

For each player in allies and enemies, extract:
- "player_name": In-game nickname (IGN). If unreadable, use "Player 1", "Player 2", etc.
- "hero_name": Exact MLBB hero name (e.g., "Tigreal", "Fanny", "Beatrix", "Gusion", "Chou").
- "kda": String format "K/D/A" e.g. "7/2/11" if visible, otherwise "".
- "isMvp": boolean, true if marked as MVP.

Return ONLY a valid, parseable JSON object with no markdown fences, no explanatory text, matching this structure:
{
  "result": "Win",
  "mode": "Ranked",
  "duration": 14,
  "allies": [
    { "player_name": "Atto", "hero_name": "Tigreal", "kda": "3/2/15", "isMvp": true }
  ],
  "enemies": [
    { "player_name": "EnemyCore", "hero_name": "Ling", "kda": "5/4/2", "isMvp": false }
  ]
}`;

  let lastError: Error | null = null;

  for (const model of VISION_MODELS) {
    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrlOrDataUri,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[Vision AI] Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.reasoning_content ||
        '';

      if (!content) continue;

      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[Vision AI] Could not find JSON block from model ${model}:`, content);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const allies: ScannedPlayer[] = (parsed.allies || []).map((p: Record<string, unknown>, idx: number) => ({
        player_name: (String(p.player_name || `Ally ${idx + 1}`)).trim(),
        hero_name: normalizeHeroName(String(p.hero_name || '')),
        team: 'ally' as const,
        kda: typeof p.kda === 'string' ? p.kda : '',
        isMvp: Boolean(p.isMvp),
      }));

      const enemies: ScannedPlayer[] = (parsed.enemies || []).map((p: Record<string, unknown>, idx: number) => ({
        player_name: (String(p.player_name || `Enemy ${idx + 1}`)).trim(),
        hero_name: normalizeHeroName(String(p.hero_name || '')),
        team: 'enemy' as const,
        kda: typeof p.kda === 'string' ? p.kda : '',
        isMvp: Boolean(p.isMvp),
      }));

      return {
        success: true,
        result: parsed.result === 'Loss' ? 'Loss' : 'Win',
        mode: typeof parsed.mode === 'string' ? parsed.mode : 'Ranked',
        duration: Number(parsed.duration) || 0,
        allies,
        enemies,
        rawText: content,
      };
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Vision AI] Error with model ${model}:`, errorObj.message);
      lastError = errorObj;
    }
  }

  throw lastError || new Error('All Vision AI models failed to process image.');
}
