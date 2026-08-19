import { llm } from './groq';
import { saveUserMemory } from './memory';

// ============================================================
// HIRARA GITHUB ENGINE
// Read repositories, analyze READMEs, explain code & architectures
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

// ── 1. List User Repositories ─────────────────────────────────
export async function listUserRepositories(
  username = getDefaultGitHubUsername()
): Promise<GitHubRepoSummary[]> {
  try {
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=15`;
    const res = await fetch(url, {
      headers: getGitHubHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`[GitHub API] Error ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((r: any) => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description || 'Tiada penerangan ringkas',
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
  } catch (err: any) {
    console.error('[GitHub API] listUserRepositories error:', err);
    return [];
  }
}

// ── 2. Get Repository Details (README, Tree, Commits) ─────────
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
  try {
    const cleanRepo = repoName.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^[^\/]+\//, '');
    const headers = getGitHubHeaders();

    // 1. Fetch Repo Info
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${cleanRepo}`, { headers });
    if (!repoRes.ok) return null;
    const repoData = await repoRes.json();

    // 2. Fetch README
    let readmeContent = '';
    const readmeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${cleanRepo}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
    }

    // 3. Fetch Recent 5 Commits
    const commitsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${cleanRepo}/commits?per_page=5`, {
      headers,
    });
    const recentCommits: string[] = [];
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

    return {
      name: repoData.name,
      description: repoData.description || 'Tiada penerangan',
      language: repoData.language || 'Code',
      readme: readmeContent.slice(0, 4000), // Cap for context limit
      recentCommits,
      url: repoData.html_url,
    };
  } catch (err: any) {
    console.error('[GitHub API] getRepositoryDetails error:', err);
    return null;
  }
}

// ── 3. Explain Repository with Hirara AI ───────────────────────
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
- Bahasa Utama: ${details.language}
- Penerangan: ${details.description}
- URL: ${details.url}

KANDUNGAN README & DOKUMENTASI PROJEK:
${details.readme || '(Tiada fail README.md dalam repository ini)'}

5 COMMIT TERKINI:
${details.recentCommits.join('\n') || '- Tiada rekod commit baru'}

PANDUAN PENERANGAN:
1. Terangkan apa fungsi projek ini dibuat, apa masalah yang ia selesaikan, dan teknologi/framework yang digunakan.
2. Gunakan Bahasa Melayu yang santai dan bersahaja (Gunakan '${tagSaya}' untuk diri sendiri dan '${tagAwak}' untuk pengguna).
3. Formatkan penerangan dengan kemas (boleh gunakan bullet points atau tajuk ringkas).
4. Elakkan terlalu teknikal sampai pening, terangkan macam kawan borak tentang projek yang cool!
5. Jangan buat andaian palsu, rujuk maklumat README di atas.`;

  const question = userQuestion || `Tolong terangkan pasal projek ${details.name} ni secara ringkas dan apa fungsinya.`;

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
