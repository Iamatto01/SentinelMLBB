#!/bin/bash
# ============================================================
# Reset database to fresh Hirara AI Brain
# ============================================================

DB_FILE="/home/kali/SentinelMLBB/data/sentinel.db"

echo "🌸 Resetting database for Hirara AI Brain..."

sqlite3 "$DB_FILE" "
-- Drop old legacy MLBB tables
DROP TABLE IF EXISTS mlbb_game_logs;
DROP TABLE IF EXISTS squad_members;
DROP TABLE IF EXISTS squad_games;
DROP TABLE IF EXISTS squad_events;
DROP TABLE IF EXISTS squad_schedules;
DROP TABLE IF EXISTS discord_chat_history;
DROP TABLE IF EXISTS user_memories;
DROP TABLE IF EXISTS user_reminders;
DROP TABLE IF EXISTS conversation_memory;
DROP TABLE IF EXISTS system_settings;

-- Create fresh Hirara schema
CREATE TABLE IF NOT EXISTS hirara_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  importance INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, memory_key)
);

CREATE TABLE IF NOT EXISTS hirara_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT,
  channel_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hirara_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  remind_at_ms INTEGER NOT NULL,
  reminder_text TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hirara_user_profiles (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  pronoun TEXT DEFAULT 'kau',
  personality_notes TEXT,
  chat_count INTEGER DEFAULT 0,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);
"

echo "✅ Hirara fresh database initialized successfully!"
