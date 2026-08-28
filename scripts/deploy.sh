#!/bin/bash
# Deploy to Kali server via rsync over SSH
# Usage: ./scripts/deploy.sh

SERVER="kali@192.168.68.132"
REMOTE_PATH="/home/kali/SentinelMLBB"
EXCLUDE="--exclude=node_modules --exclude=.next --exclude=.git --exclude=legacy --exclude=.env.local"

echo "📦 Syncing to $SERVER:$REMOTE_PATH ..."
rsync -avz --delete $EXCLUDE ./ "$SERVER:$REMOTE_PATH"

echo "🚀 Installing deps & building on server..."
ssh "$SERVER" "cd $REMOTE_PATH && npm install && npm run build && pm2 restart sentinelmlbb || pm2 start npm --name sentinelmlbb -- start"

echo "✅ Done!"