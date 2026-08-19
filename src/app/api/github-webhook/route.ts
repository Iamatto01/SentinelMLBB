import { NextResponse } from 'next/server';

// ============================================================
// GITHUB WEBHOOK RECEIVER FOR HIRARA
// Receives GitHub events (push, PR, issues, star) and notifies Discord
// ============================================================

async function sendToDiscord(content: string, embed?: any) {
  // Option A: Via Discord Webhook URL (if user sets DISCORD_WEBHOOK_URL)
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          embeds: embed ? [embed] : undefined,
        }),
      });
      return;
    } catch (e) {
      console.error('[Webhook] Failed sending via webhook URL:', e);
    }
  }

  // Option B: Via Bot Token to specified Channel ID
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.GITHUB_DISCORD_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;

  if (botToken && channelId) {
    try {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          embeds: embed ? [embed] : undefined,
        }),
      });
    } catch (err) {
      console.error('[Webhook] Failed sending to Discord channel:', err);
    }
  }
}

export async function POST(req: Request) {
  try {
    const eventType = req.headers.get('x-github-event') || 'unknown';
    const payload = await req.json();

    console.log(`[GitHub Webhook] Received event: ${eventType}`);

    const repoName = payload.repository?.name || 'GitHub Repo';
    const repoUrl = payload.repository?.html_url || '';
    const sender = payload.sender?.login || 'Seseorang';

    // ── 1. PING EVENT (Webhook Test) ───────────────────────────
    if (eventType === 'ping') {
      const msg = `🎉 **GitHub Webhook Berjaya Disambungkan!**\n> Hirara kini sedia menerima notifikasi update daripada repository **[${repoName}](${repoUrl})**! ✨`;
      await sendToDiscord(msg);
      return NextResponse.json({ ok: true, message: 'Ping handled' });
    }

    // ── 2. PUSH EVENT ──────────────────────────────────────────
    if (eventType === 'push') {
      const branch = (payload.ref || '').replace('refs/heads/', '');
      const commits = payload.commits || [];
      const commitCount = commits.length;

      if (commitCount === 0) {
        return NextResponse.json({ ok: true, message: 'No commits in push' });
      }

      let commitListText = '';
      commits.slice(0, 5).forEach((c: any) => {
        const shortId = (c.id || '').substring(0, 7);
        const firstLine = (c.message || '').split('\n')[0];
        commitListText += `• [\`${shortId}\`](${c.url}) ${firstLine} — *${c.author?.name || sender}*\n`;
      });

      if (commitCount > 5) {
        commitListText += `*...dan ${commitCount - 5} lagi commit.*\n`;
      }

      const embed = {
        color: 0x2ea44f, // GitHub Green
        title: `🚀 Push Baru ke [${repoName}:${branch}]`,
        url: payload.compare || repoUrl,
        description: commitListText,
        footer: {
          text: `Ditolak oleh ${sender} • Hirara GitHub Sentinel`,
        },
        timestamp: new Date().toISOString(),
      };

      const msg = `🔔 **Update GitHub: ${sender} baru sahaja push ${commitCount} commit ke \`${repoName}:${branch}\`!**`;
      await sendToDiscord(msg, embed);
      return NextResponse.json({ ok: true, event: 'push' });
    }

    // ── 3. PULL REQUEST EVENT ──────────────────────────────────
    if (eventType === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;
      const prTitle = pr?.title || 'Pull Request';
      const prUrl = pr?.html_url || repoUrl;

      const embed = {
        color: action === 'opened' ? 0x2188ff : 0x6f42c1,
        title: `🔀 PR #${pr?.number}: ${prTitle} (${action.toUpperCase()})`,
        url: prUrl,
        description: pr?.body ? pr.body.slice(0, 300) : 'Tiada penerangan PR.',
        footer: {
          text: `Oleh ${pr?.user?.login || sender} kat ${repoName}`,
        },
        timestamp: new Date().toISOString(),
      };

      const msg = `📢 **Pull Request baru kat [${repoName}](${repoUrl}):** #${pr?.number} *"${prTitle}"* (${action}) oleh **${pr?.user?.login}**!`;
      await sendToDiscord(msg, embed);
      return NextResponse.json({ ok: true, event: 'pull_request' });
    }

    // ── 4. ISSUES EVENT ────────────────────────────────────────
    if (eventType === 'issues') {
      const action = payload.action;
      const issue = payload.issue;

      const embed = {
        color: action === 'opened' ? 0xd73a49 : 0x28a745,
        title: `📋 Isu #${issue?.number}: ${issue?.title} (${action})`,
        url: issue?.html_url || repoUrl,
        description: issue?.body ? issue.body.slice(0, 300) : 'Tiada perincian isu.',
        footer: { text: `Oleh ${issue?.user?.login || sender}` },
        timestamp: new Date().toISOString(),
      };

      const msg = `⚠️ **Isu GitHub (${action}) kat [${repoName}](${repoUrl}):** #${issue?.number} *"${issue?.title}"*`;
      await sendToDiscord(msg, embed);
      return NextResponse.json({ ok: true, event: 'issues' });
    }

    // ── 5. STAR / WATCH EVENT ──────────────────────────────────
    if (eventType === 'watch' || eventType === 'star') {
      const msg = `⭐ **Woohoo! ${sender} baru sahaja bagi Star pada repository [${repoName}](${repoUrl})!** Mantap! 🎉`;
      await sendToDiscord(msg);
      return NextResponse.json({ ok: true, event: 'star' });
    }

    return NextResponse.json({ ok: true, message: `Event ${eventType} received` });
  } catch (err: any) {
    console.error('[GitHub Webhook Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Hirara GitHub Webhook Endpoint is active. Set your Webhook Payload URL to this path.',
  });
}
