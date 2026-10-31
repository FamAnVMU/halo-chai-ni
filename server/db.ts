import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'halo_chinese.db');
export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  -- Settings & API Keys (Server-side stored only)
  CREATE TABLE IF NOT EXISTS server_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Chat sessions
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    hsk_level INTEGER NOT NULL,
    title TEXT NOT NULL,
    scenario TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Chat messages
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    pinyin TEXT,
    translation_vi TEXT,
    correction_json TEXT,
    is_audio INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  );

  -- AI Learner Profile & Long-term memory
  CREATE TABLE IF NOT EXISTS learner_memory (
    id TEXT PRIMARY KEY,
    weaknesses_json TEXT,
    mispronounced_json TEXT,
    mastered_grammar_json TEXT,
    struggling_grammar_json TEXT,
    notes TEXT,
    updated_at INTEGER NOT NULL
  );

  -- Activity & Learning Stats
  CREATE TABLE IF NOT EXISTS learning_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    score INTEGER,
    duration_seconds INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

// Seed default learner memory if empty
const existingMemory = db.prepare('SELECT id FROM learner_memory WHERE id = ?').get('default');
if (!existingMemory) {
  db.prepare(`
    INSERT INTO learner_memory (id, weaknesses_json, mispronounced_json, mastered_grammar_json, struggling_grammar_json, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'default',
    JSON.stringify(['Phân biệt thanh điệu 2 và thanh điệu 3', 'Phát âm nhóm âm mặt lưỡi j, q, x']),
    JSON.stringify(['去 (qù)', '吃 (chī)', '学 (xué)']),
    JSON.stringify(['Câu chữ 是 (shì)', 'Cấu trúc câu hỏi với 吗 (ma)']),
    JSON.stringify(['Cấu trúc câu chữ 把 (bǎ)', 'Bổ ngữ kết quả / phương hướng']),
    'Người học ưu tiên giao tiếp đời sống, chuẩn bị cho HSK 3.',
    Date.now()
  );
}
