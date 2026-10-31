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

  -- Detailed Learner Profile
  CREATE TABLE IF NOT EXISTS learner_profile (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Học viên',
    current_hsk INTEGER DEFAULT 1,
    target_hsk INTEGER DEFAULT 3,
    learning_goals_json TEXT,
    learning_style TEXT DEFAULT 'visual_interactive',
    speed_preference TEXT DEFAULT 'normal',
    strengths_json TEXT,
    weaknesses_json TEXT,
    total_study_minutes INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Vocabulary Memory: Track every taught word, mastery level, and review frequency
  CREATE TABLE IF NOT EXISTS vocabulary_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    simplified TEXT NOT NULL UNIQUE,
    traditional TEXT,
    pinyin TEXT NOT NULL,
    meaning_vi TEXT NOT NULL,
    word_type TEXT DEFAULT 'danh từ',
    hsk_level INTEGER DEFAULT 1,
    examples_json TEXT,
    first_taught_at INTEGER NOT NULL,
    last_reviewed_at INTEGER,
    review_count INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'introduced',
    source_session_id TEXT,
    notes TEXT
  );

  -- Grammar Memory: Track every taught grammar rule, formula, common mistakes, mastery
  CREATE TABLE IF NOT EXISTS grammar_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL UNIQUE,
    formula TEXT NOT NULL,
    meaning_vi TEXT NOT NULL,
    usage_notes TEXT,
    hsk_level INTEGER DEFAULT 1,
    examples_json TEXT,
    common_mistakes_json TEXT,
    first_taught_at INTEGER NOT NULL,
    last_reviewed_at INTEGER,
    review_count INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'introduced',
    notes TEXT
  );

  -- Learning Errors: Persistent error ledger prioritizing unsolved mistakes
  CREATE TABLE IF NOT EXISTS learning_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT NOT NULL,
    title TEXT NOT NULL,
    user_sentence TEXT NOT NULL,
    corrected_sentence TEXT NOT NULL,
    explanation_vi TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    last_occurred_at INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    resolved_at INTEGER
  );

  -- Generated Lessons: Lessons created by AI with anti-duplication tracking
  CREATE TABLE IF NOT EXISTS generated_lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    lesson_type TEXT NOT NULL,
    hsk_level INTEGER NOT NULL,
    estimated_minutes INTEGER DEFAULT 15,
    recommendation_reason TEXT NOT NULL,
    objectives_json TEXT NOT NULL,
    knowledge_points_json TEXT NOT NULL,
    explanation_vi TEXT NOT NULL,
    content_json TEXT NOT NULL,
    exercises_json TEXT NOT NULL,
    quiz_json TEXT,
    status TEXT DEFAULT 'unstarted',
    score INTEGER,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  );

  -- Conversation Analyses: Periodic analysis and knowledge gap reports
  CREATE TABLE IF NOT EXISTS conversation_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    summary_vi TEXT NOT NULL,
    topics_json TEXT NOT NULL,
    new_vocab_taught_json TEXT NOT NULL,
    grammar_taught_json TEXT NOT NULL,
    correct_expressions_json TEXT NOT NULL,
    mistakes_detected_json TEXT NOT NULL,
    knowledge_gaps_json TEXT NOT NULL,
    recommended_next_step TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_vocab_mastery ON vocabulary_memory(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_vocab_hsk ON vocabulary_memory(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_grammar_mastery ON grammar_memory(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_errors_status ON learning_errors(status);
  CREATE INDEX IF NOT EXISTS idx_lessons_status ON generated_lessons(status);
`);

// Seed default learner profile if empty
const existingProfile = db.prepare('SELECT id FROM learner_profile WHERE id = ?').get('default');
if (!existingProfile) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO learner_profile (id, name, current_hsk, target_hsk, learning_goals_json, learning_style, speed_preference, strengths_json, weaknesses_json, total_study_minutes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'default',
    'Tôi (Học viên tiếng Trung)',
    1,
    3,
    JSON.stringify(['Giao tiếp tự tin khi đi du lịch và đặt món', 'Đạt HSK 3 trong vòng 6 tháng', 'Phát âm chuẩn thanh điệu']),
    'visual_interactive',
    'normal',
    JSON.stringify(['Nhớ mặt chữ Hán nhanh', 'Từ vựng chào hỏi cơ bản']),
    JSON.stringify(['Hay quên cách dùng trợ từ 的, 得, 地', 'Nhầm lẫn 怎么 (zenme) và 为什么 (weishenme)']),
    120,
    now,
    now
  );
}

// Seed initial vocabulary memory if empty
const vocabCount = (db.prepare('SELECT COUNT(*) as count FROM vocabulary_memory').get() as any).count;
if (vocabCount === 0) {
  const now = Date.now();
  const insertVocab = db.prepare(`
    INSERT OR IGNORE INTO vocabulary_memory (simplified, traditional, pinyin, meaning_vi, word_type, hsk_level, examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level, source_session_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVocab.run('你好', '你好', 'nǐ hǎo', 'Xin chào', 'đại từ/thán từ', 1, JSON.stringify(['你好！很高兴认识你。(Chào bạn! Rất vui được quen biết bạn.)']), now - 86400000 * 5, now, 4, 'mastered', 'seed', 'Lời chào hỏi cơ bản nhất');
  insertVocab.run('谢谢', '謝謝', 'xièxie', 'Cảm ơn', 'động từ', 1, JSON.stringify(['谢谢你的帮助。(Cảm ơn sự giúp đỡ của bạn.)']), now - 86400000 * 5, now, 3, 'mastered', 'seed', '');
  insertVocab.run('怎么', '怎麼', 'zěnme', 'Như thế nào, làm sao', 'đại từ nghi vấn', 1, JSON.stringify(['这个汉字怎么读？(Chữ Hán này đọc như thế nào?)', '你怎么去学校？(Bạn đi học bằng cách nào?)']), now - 86400000 * 2, now - 86400000, 2, 'needs_review', 'seed', 'Hay nhầm với 为什么 khi hỏi nguyên nhân');
  insertVocab.run('为什么', '為什麼', 'wèishénme', 'Tại sao, vì sao', 'đại từ nghi vấn', 2, JSON.stringify(['你为什么不吃？(Tại sao bạn không ăn?)']), now - 86400000 * 2, now - 86400000, 1, 'learning', 'seed', 'Hỏi lý do / nguyên nhân');
  insertVocab.run('点餐', '點餐', 'diǎn cān', 'Gọi món, gọi thức ăn', 'động từ', 2, JSON.stringify(['服务员，我们要点餐。(Phục vụ ơi, chúng tôi muốn gọi món.)']), now - 86400000, now, 1, 'introduced', 'seed', 'Chủ đề nhà hàng');
}

// Seed initial grammar memory if empty
const grammarCount = (db.prepare('SELECT COUNT(*) as count FROM grammar_memory').get() as any).count;
if (grammarCount === 0) {
  const now = Date.now();
  const insertGrammar = db.prepare(`
    INSERT OR IGNORE INTO grammar_memory (pattern_name, formula, meaning_vi, usage_notes, hsk_level, examples_json, common_mistakes_json, first_taught_at, last_reviewed_at, review_count, mastery_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGrammar.run(
    'Cấu trúc câu hỏi với 怎么 (Phương thức hành động)',
    'Chủ ngữ + 怎么 + Động từ + (Tân ngữ)?',
    'Làm thế nào để thực hiện một hành động (phương thức, cách thức)',
    'Dùng để hỏi về cách thực hiện một việc gì đó (ví dụ: đi bằng gì, làm cách nào, viết ra sao). Khác với 为什么 (hỏi nguyên nhân).',
    1,
    JSON.stringify(['你今天怎么去公司？(Hôm nay bạn đi đến công ty bằng cách nào?)', '这个中文怎么说？(Cái này tiếng Trung nói thế nào?)']),
    JSON.stringify(['Dùng nhầm 怎么 để hỏi lý do như "你今天怎么不去？" (vẫn có thể dùng nhưng mang sắc thái ngạc nhiên, trách móc chứ không phải hỏi lý do đơn thuần như 为什么).']),
    now - 86400000 * 3,
    now - 86400000,
    2,
    'learning',
    'Cần luyện thêm phân biệt 怎么 và 为什么'
  );

  insertGrammar.run(
    'Câu chữ 是 (Câu phán đoán)',
    'Chủ ngữ + 是 + Danh từ/Cụm danh từ',
    'A là B (Khẳng định tính chất, thân phận, nghề nghiệp)',
    'Phủ định dùng 不是. Không dùng 是 trước tính từ (sai: 我是很高 ✗ -> 我很高 ✓).',
    1,
    JSON.stringify(['我是越南人。(Tôi là người Việt Nam.)', '这是我的书。(Đây là sách của tôi.)']),
    JSON.stringify(['Đặt 是 trước tính từ (vd: 我是很累 ✗).']),
    now - 86400000 * 7,
    now,
    4,
    'mastered',
    'Đã nắm rất vững'
  );
}

// Seed initial learning errors if empty
const errorCount = (db.prepare('SELECT COUNT(*) as count FROM learning_errors').get() as any).count;
if (errorCount === 0) {
  const now = Date.now();
  const insertError = db.prepare(`
    INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertError.run(
    'grammar',
    'Nhầm lẫn giữa 怎么 và 为什么 khi hỏi nguyên nhân',
    '你昨天怎么没来学校？我想知道怎么。',
    '你昨天为什么没来学校？我想知道为什么。',
    'Khi hỏi nguyên nhân "tại sao / vì sao", cần dùng 为什么 (wèishénme). 怎么 (zěnme) chủ yếu dùng hỏi phương thức "bằng cách nào, như thế nào".',
    2,
    now - 86400000,
    'pending',
    null
  );

  insertError.run(
    'word_order',
    'Sai vị trí từ chỉ thời gian trong câu tiếng Trung',
    '我去学校八点。',
    '我八点去学校。/ 八点我去学校。',
    'Trong tiếng Trung, từ chỉ thời gian phải đứng trước động từ (sau chủ ngữ hoặc ở đầu câu), không được đặt ở cuối câu như tiếng Việt.',
    1,
    now - 86400000 * 2,
    'in_progress',
    null
  );
}

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
