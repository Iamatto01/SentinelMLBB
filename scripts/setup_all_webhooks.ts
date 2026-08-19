import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ============================================================
// AUTO-SETUP GITHUB WEBHOOKS FOR ALL REPOSITORIES
// Uses 1 GITHUB_TOKEN to register webhook across all your repos
// ============================================================

async function setupAllWebhooks() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME || 'Iamatto01';
  const webhookUrl = process.env.WEBHOOK_PAYLOAD_URL || 'http://192.168.68.132:3005/api/github-webhook';

  if (!token) {
    console.error('❌ Ralat: Sila masukkan GITHUB_TOKEN dalam fail .env.local terlebih dahulu!');
    console.log('💡 Cara dapatkan token: Buka GitHub -> Settings -> Developer settings -> Personal access tokens (classic) -> tick "repo" dan "admin:repo_hook".');
    process.exit(1);
  }

  console.log(`🐙 Menyemak semua repository untuk akaun: ${username}...`);

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token.trim()}`,
    'User-Agent': 'Hirara-Bot',
  };

  // 1. Fetch all repositories
  const res = await fetch(`https://api.github.com/user/repos?per_page=100&affiliation=owner`, { headers });
  if (!res.ok) {
    console.error(`❌ Gagal mengambil senarai repo: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const repos = await res.json();
  console.log(`📦 Dijumpai ${repos.length} repository.\n`);

  for (const r of repos) {
    const repoName = r.name;
    const owner = r.owner?.login || username;

    try {
      // 2. Check if webhook already exists
      const hooksRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/hooks`, { headers });
      if (hooksRes.ok) {
        const hooks = await hooksRes.json();
        const exists = hooks.some((h: any) => h.config?.url === webhookUrl);
        if (exists) {
          console.log(`⏭️  [${repoName}] Webhook sudah wujud, skip.`);
          continue;
        }
      }

      // 3. Create webhook
      const createRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/hooks`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'web',
          active: true,
          events: ['push', 'pull_request', 'issues', 'watch', 'star', 'release'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            insecure_ssl: '1',
          },
        }),
      });

      if (createRes.ok) {
        console.log(`✅ [${repoName}] Webhook berjaya dipasang!`);
      } else {
        const err = await createRes.json();
        console.log(`⚠️ [${repoName}] Gagal pasang webhook: ${err.message || JSON.stringify(err)}`);
      }
    } catch (e: any) {
      console.error(`❌ [${repoName}] Error:`, e.message);
    }
  }

  console.log('\n🎉 Selesai! Semua repository anda kini disambungkan ke Hirara Webhook!');
}

setupAllWebhooks().catch(console.error);
