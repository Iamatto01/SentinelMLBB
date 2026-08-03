#!/bin/bash
set -e

echo "=== 🚀 Setting up SentinelMLBB on Kali Linux (Port 3005) ==="

TARGET_DIR="$HOME/SentinelMLBB"
mkdir -p "$TARGET_DIR"

if [ -f "$HOME/sentinelmlbb-code.tar.gz" ]; then
    echo "[+] Extracting sentinelmlbb-code.tar.gz to $TARGET_DIR..."
    tar -xzf "$HOME/sentinelmlbb-code.tar.gz" -C "$TARGET_DIR"
    rm -f "$HOME/sentinelmlbb-code.tar.gz"
fi

cd "$TARGET_DIR"

echo "[+] Checking Node.js & PM2 installation..."
if ! command -v node &> /dev/null; then
    echo "[+] Installing Node.js & npm..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
fi

if ! command -v pm2 &> /dev/null; then
    echo "[+] Installing PM2..."
    sudo npm install -g pm2
fi

echo "[+] Installing npm packages..."
npm install

echo "[+] Building Next.js production build..."
npm run build

echo "[+] Cleaning old PM2 process and freeing PORT 3005..."
pm2 delete sentinel-mlbb 2>/dev/null || true
sudo fuser -k 3005/tcp 2>/dev/null || true

echo "[+] Starting PM2 service 'sentinel-mlbb' on PORT 3005..."
PORT=3005 pm2 start "npm start" --name "sentinel-mlbb"

echo "[+] Starting PM2 gateway listener 'sentinel-bot' for @mention support..."
pm2 delete sentinel-bot 2>/dev/null || true
pm2 start npx --name "sentinel-bot" -- tsx scripts/bot.ts

pm2 save

echo ""
echo "=========================================================="
echo "🎉 SentinelMLBB setup complete on PORT 3005!"
echo "👉 Access URL: http://192.168.68.132:3005"
echo "=========================================================="
