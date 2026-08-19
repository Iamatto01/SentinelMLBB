import { llm } from './groq';
import { saveUserMemory } from './memory';

// ============================================================
// HIRARA GITHUB ENGINE
// Read repositories, analyze READMEs, explain code & architectures
// With raw.githubusercontent fallback for rate-limit resilience
// ============================================================

const GITHUB_API_BASE = 'https://api.github.com';

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Hirara-Bot',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim().length > 0) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}

export function getDefaultGitHubUsername(): string {
  return process.env.GITHUB_USERNAME || 'Iamatto01';
}

export interface GitHubRepoSummary {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated_at: string;
  html_url: string;
  is_private: boolean;
}

// ── Fallback Known Repositories for Iamatto01 ──────────────────
const FALLBACK_REPOS: GitHubRepoSummary[] = [
  {
    name: 'SentinelMLBB',
    full_name: 'Iamatto01/SentinelMLBB',
    description: 'AI Companion (Hirara) Discord Bot with long-term memory, reminders & Next.js dashboard',
    language: 'TypeScript / Next.js',
    stars: 1,
    forks: 0,
    updated_at: 'Terkini',
    html_url: 'https://github.com/Iamatto01/SentinelMLBB',
    is_private: false,
  },
  {
    name: 'SentinelAPI',
    full_name: 'Iamatto01/SentinelAPI',
    description: 'Backend API service with payment integration & bot handlers',
    language: 'JavaScript / Node.js',
    stars: 1,
    forks: 0,
    updated_at: 'Terkini',
    html_url: 'https://github.com/Iamatto01/SentinelAPI',
    is_private: false,
  },
];

// ── 1. List User Repositories ─────────────────────────────────
export async function listUserRepositories(
  username = getDefaultGitHubUsername()
): Promise<GitHubRepoSummary[]> {
  const token = process.env.GITHUB_TOKEN;
  try {
    // If token exists, fetch authenticated user's own repos (includes private & public)
    const url = token
      ? `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&affiliation=owner`
      : `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;

    const res = await fetch(url, {
      headers: getGitHubHeaders(),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          name: r.name,
          full_name: r.full_name,
          description: r.description || null,
          language: r.language || 'Pelbagai',
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          updated_at: new Date(r.updated_at).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          html_url: r.html_url,
          is_private: r.private || false,
        }));
      }
    } else {
      console.warn(`[GitHub API] List repos status ${res.status}, using fallback catalog.`);
    }
  } catch (err: any) {
    console.error('[GitHub API] listUserRepositories error:', err);
  }

  // Return fallback known repositories if API is rate-limited without a token
  return FALLBACK_REPOS;
}

// ── Real Repositories Summary Context for AI Prompts ──────────
let _cachedReposSummary: { text: string; timestamp: number } | null = null;

export async function getGitHubReposContext(username = getDefaultGitHubUsername()): Promise<string> {
  const now = Date.now();
  if (_cachedReposSummary && now - _cachedReposSummary.timestamp < 300000) {
    return _cachedReposSummary.text;
  }

  const repos = await listUserRepositories(username);
  if (repos.length === 0) return '';

  const list = repos
    .map((r) => `- ${r.name} (${r.language}${r.description ? `: ${r.description}` : ''})`)
    .join('\n');

  const text = `PROJEK / REPOSITORY GITHUB SEBENAR MILIK ${username.toUpperCase()}:\n${list}`;
  _cachedReposSummary = { text, timestamp: now };
  return text;
}

// ── 2. Fetch Raw README (Rate-Limit Immune) ───────────────────
async function fetchRawReadme(owner: string, repo: string): Promise<string> {
  const branches = ['main', 'master'];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Hirara-Bot' } });
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      // try next branch
    }
  }
  return '';
}

// ── 3. Get Repository Details (README, Tree, Commits) ─────────
export async function getRepositoryDetails(
  owner = getDefaultGitHubUsername(),
  repoName: string
): Promise<{
  name: string;
  description: string;
  language: string;
  readme: string;
  recentCommits: string[];
  url: string;
} | null> {
  const cleanRepo = repoName.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^[^\/]+\//, '');
  const headers = getGitHubHeaders();

  let description = '';
  let language = 'JavaScript / TypeScript';
  let htmlUrl = `https://github.com/${owner}/${cleanRepo}`;
  const recentCommits: string[] = [];

  // Try GitHub API
  try {
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${cleanRepo}`, { headers });
    if (repoRes.ok) {
      const repoData = await repoRes.json();
      description = repoData.description || '';
      language = repoData.language || language;
      htmlUrl = repoData.html_url || htmlUrl;
    }

    const commitsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${cleanRepo}/commits?per_page=5`, {
      headers,
    });
    if (commitsRes.ok) {
      const commitsData = await commitsRes.json();
      if (Array.isArray(commitsData)) {
        for (const c of commitsData) {
          const msg = c.commit?.message?.split('\n')[0] || '';
          const author = c.commit?.author?.name || 'Dev';
          recentCommits.push(`- ${msg} (oleh ${author})`);
        }
      }
    }
  } catch (err) {
    console.warn('[GitHub API] Fetching details via API warning:', err);
  }

  // Fetch README via raw.githubusercontent (immune to API rate limits)
  let readmeContent = await fetchRawReadme(owner, cleanRepo);

  // Fallback: If local workspace contains the project
  if (!readmeContent && cleanRepo.toLowerCase().includes('sentinelmlbb')) {
    readmeContent = 'SentinelMLBB — AI Personal Companion (Hirara) with long-term memory, smart reminder scheduler, and Next.js fullstack dashboard.';
  } else if (!readmeContent && cleanRepo.toLowerCase().includes('sentinelapi')) {
    readmeContent = 'SentinelAPI — Backend payment & bot interaction gateway for Sentinel ecosystem.';
  }

  return {
    name: cleanRepo,
    description: description || 'Projek GitHub oleh ' + owner,
    language,
    readme: readmeContent.slice(0, 4000),
    recentCommits,
    url: htmlUrl,
  };
}

// ── 4. Explain Repository with Hirara AI ───────────────────────
export async function explainRepositoryWithHirara(
  repoName: string,
  userQuestion?: string,
  owner = getDefaultGitHubUsername(),
  pronoun = 'kau'
): Promise<string> {
  const details = await getRepositoryDetails(owner, repoName);
  if (!details) {
    return `Alamak ${pronoun === 'awak_saya' ? 'awak' : 'weh'}, saya tak jumpa repository **"${repoName}"** kat akaun GitHub **${owner}**. Cuba semak ejaan nama repo tu atau pastikan ia ada kat GitHub!`;
  }

  const tagSaya = pronoun === 'awak_saya' ? 'saya' : 'aku';
  const tagAwak = pronoun === 'awak_saya' ? 'awak' : 'kau';

  const systemPrompt = `Kau adalah "Hirara", kawan borak orang Melayu dan pembantu pintar di Discord.
Tugas kamu adalah menerangkan projek GitHub milik ${owner} iaitu "${details.name}" secara santai, mesra, dan mudah difahami.

MAKLUMAT REPOSITORY DARI GITHUB:
- Nama Projek: ${details.name}
- Bahasa / Teknologi: ${details.language}
- Penerangan: ${details.description}
- URL: ${details.url}

KANDUNGAN README & DOKUMENTASI PROJEK:
${details.readme || '(Tiada fail README.md dalam repository ini)'}

COMMIT TERKINI:
${details.recentCommits.join('\n') || '- Tiada rekod commit baru'}

PANDUAN PENERANGAN:
1. Terangkan apa fungsi projek ini dibuat, apa masalah yang ia selesaikan, dan teknologi/framework yang digunakan.
2. Gunakan Bahasa Melayu yang santai dan bersahaja (Gunakan '${tagSaya}' untuk diri sendiri dan '${tagAwak}' untuk pengguna).
3. Formatkan penerangan dengan kemas (gunakan bullet points atau tajuk ringkas).
4. Elakkan terlalu teknikal sampai pening, terangkan macam kawan borak tentang projek yang cool!
5. Jangan buat andaian palsu, rujuk maklumat dokumentasi di atas.`;

  const question =
    userQuestion || `Tolong terangkan pasal projek ${details.name} ni secara ringkas dan apa fungsinya.`;

  const response = await llm.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    temperature: 0.7,
    max_tokens: 700,
  });

  const replyText =
    response.choices[0]?.message?.content ||
    response.choices[0]?.message?.reasoning ||
    `Projek **${details.name}** adalah projek ${details.language} yang aktif di GitHub (${details.url}).`;

  return replyText;
}
