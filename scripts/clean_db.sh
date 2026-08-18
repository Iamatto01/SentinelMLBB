#!/bin/bash
sqlite3 /home/kali/SentinelMLBB/data/sentinel.db "DELETE FROM system_settings WHERE key='active_model';"
pm2 restart sentinel-bot sentinel-mlbb
