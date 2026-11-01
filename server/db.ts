import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'halo_chinese.db');
export const db = new Database(dbPath);

// Enable WAL mode & performance optimizations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

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

  -- Learner Evidence Ledger: Track evidence-based observations with confidence ratings & 7-stage taxonomy
  CREATE TABLE IF NOT EXISTS learner_evidence_ledger (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL, -- 'vocabulary', 'grammar', 'pronunciation', 'communication', 'habit'
    target_key TEXT NOT NULL, -- e.g. "word_苹果", "grammar_把", "pronunciation_tone_3"
    claim_summary TEXT NOT NULL, -- Description of observation
    evidence_quote TEXT NOT NULL, -- Real user utterance or quote
    source_activity TEXT NOT NULL, -- 'text_chat', 'voice_chat', 'placement', 'srs', 'reading', 'shadowing'
    source_session_id TEXT,
    observation_count INTEGER DEFAULT 1,
    confidence_score REAL DEFAULT 0.8, -- 0.0 - 1.0
    mastery_stage TEXT DEFAULT 'practicing', -- 'unexposed', 'exposed', 'taught', 'understood', 'practicing', 'autonomous', 'mastered'
    status TEXT DEFAULT 'active', -- 'active', 'undetermined', 'resolved'
    last_observed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_evidence_target ON learner_evidence_ledger(target_key, target_type);
  CREATE INDEX IF NOT EXISTS idx_evidence_status ON learner_evidence_ledger(status);

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

  -- ==================== PLACEMENT TEST TABLES ====================
  -- Placement Assessments (Test Sessions)
  CREATE TABLE IF NOT EXISTS placement_assessments (
    id TEXT PRIMARY KEY,
    test_type TEXT NOT NULL, -- 'full' (6 skills) or 'quick' (3 core skills)
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    current_section TEXT NOT NULL, -- 'vocabulary', 'grammar', 'reading', 'listening', 'writing', 'communication'
    current_question_index INTEGER DEFAULT 0,
    adaptive_level INTEGER DEFAULT 1,
    skipped_sections_json TEXT DEFAULT '[]',
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    duration_seconds INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Placement Questions (Items in test)
  CREATE TABLE IF NOT EXISTS placement_questions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    skill TEXT NOT NULL, -- 'vocabulary', 'grammar', 'reading', 'listening', 'writing', 'communication'
    question_type TEXT NOT NULL, -- 'multiple_choice', 'fill_in_blank', 'reorder', 'reading_comprehension', 'listening_comprehension', 'writing_translation', 'dialogue_response'
    hsk_level INTEGER NOT NULL,
    topic TEXT,
    prompt TEXT NOT NULL,
    passage TEXT,
    audio_text TEXT,
    options_json TEXT,
    correct_answer TEXT NOT NULL,
    explanation_vi TEXT NOT NULL,
    criteria_json TEXT,
    order_index INTEGER NOT NULL,
    weight REAL DEFAULT 1.0,
    FOREIGN KEY(test_id) REFERENCES placement_assessments(id) ON DELETE CASCADE
  );

  -- Placement Answers (User responses & evaluations)
  CREATE TABLE IF NOT EXISTS placement_answers (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct INTEGER,
    score REAL,
    ai_feedback TEXT,
    answered_at INTEGER NOT NULL,
    FOREIGN KEY(test_id) REFERENCES placement_assessments(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES placement_questions(id) ON DELETE CASCADE
  );

  -- Placement Results (Final comprehensive report)
  CREATE TABLE IF NOT EXISTS placement_results (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL UNIQUE,
    overall_score REAL NOT NULL,
    estimated_hsk REAL NOT NULL,
    confidence_level TEXT NOT NULL, -- 'high', 'medium', 'provisional'
    skill_scores_json TEXT NOT NULL,
    strengths_json TEXT NOT NULL,
    weaknesses_json TEXT NOT NULL,
    knowledge_breakdown_json TEXT NOT NULL,
    recommendations_json TEXT NOT NULL,
    synced_to_profile INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(test_id) REFERENCES placement_assessments(id) ON DELETE CASCADE
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_vocab_mastery ON vocabulary_memory(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_vocab_hsk ON vocabulary_memory(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_grammar_mastery ON grammar_memory(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_errors_status ON learning_errors(status);
  CREATE INDEX IF NOT EXISTS idx_lessons_status ON generated_lessons(status);
  CREATE INDEX IF NOT EXISTS idx_placement_assessments_status ON placement_assessments(status);
  CREATE INDEX IF NOT EXISTS idx_placement_questions_test ON placement_questions(test_id);
  CREATE INDEX IF NOT EXISTS idx_placement_answers_test ON placement_answers(test_id);
  CREATE INDEX IF NOT EXISTS idx_placement_results_test ON placement_results(test_id);

  -- ==================== ADAPTIVE LEARNING PATH TABLES ====================
  -- Core Path Configuration
  CREATE TABLE IF NOT EXISTS adaptive_learning_paths (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    title TEXT NOT NULL,
    current_hsk INTEGER NOT NULL DEFAULT 1,
    target_hsk INTEGER NOT NULL DEFAULT 3,
    primary_goal TEXT DEFAULT 'hsk_exam', -- 'hsk_exam', 'daily_communication', 'business_work', 'travel_study'
    daily_minutes INTEGER DEFAULT 30,
    days_per_week INTEGER DEFAULT 5,
    target_completion_date TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
    current_stage_id TEXT,
    progress_percent REAL DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Learning Stages (Giai đoạn lộ trình)
  CREATE TABLE IF NOT EXISTS learning_path_stages (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    stage_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description_vi TEXT NOT NULL,
    stage_type TEXT NOT NULL, -- 'foundation_reinforce', 'expansion', 'application', 'mastery_review'
    status TEXT DEFAULT 'locked', -- 'locked', 'unlocked', 'in_progress', 'completed'
    is_locked_by_user INTEGER DEFAULT 0,
    progress_percent REAL DEFAULT 0,
    order_index INTEGER NOT NULL,
    FOREIGN KEY(path_id) REFERENCES adaptive_learning_paths(id) ON DELETE CASCADE
  );

  -- Learning Items (Bài học & Hoạt động cụ thể trong giai đoạn)
  CREATE TABLE IF NOT EXISTS learning_path_items (
    id TEXT PRIMARY KEY,
    stage_id TEXT NOT NULL,
    path_id TEXT NOT NULL,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'lesson', 'review_srs', 'error_remediation', 'practice_drill', 'checkpoint_exam'
    hsk_level INTEGER NOT NULL,
    estimated_minutes INTEGER DEFAULT 25,
    recommendation_reason TEXT NOT NULL,
    prerequisites_json TEXT, -- array of prerequisite descriptions or item ids
    target_knowledge_json TEXT, -- array of vocab/grammar tags
    lesson_id TEXT, -- link to generated_lessons if created
    status TEXT DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'needs_review', 'completed'
    score INTEGER,
    order_index INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY(stage_id) REFERENCES learning_path_stages(id) ON DELETE CASCADE,
    FOREIGN KEY(path_id) REFERENCES adaptive_learning_paths(id) ON DELETE CASCADE
  );

  -- Milestones (Cột mốc tiến bộ)
  CREATE TABLE IF NOT EXISTS learning_path_milestones (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description_vi TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'topic_complete', 'vocab_mastery', 'grammar_mastery', 'stage_complete', 'score_target', 'exam_pass'
    required_criteria_json TEXT NOT NULL,
    progress_percent REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'achieved'
    achieved_at INTEGER,
    order_index INTEGER NOT NULL,
    FOREIGN KEY(path_id) REFERENCES adaptive_learning_paths(id) ON DELETE CASCADE
  );

  -- Learning Schedule (Lịch học thông minh theo ngày/tuần)
  CREATE TABLE IF NOT EXISTS learning_schedule_items (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    item_id TEXT,
    day_of_week INTEGER NOT NULL, -- 1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ nhật
    scheduled_date TEXT, -- YYYY-MM-DD
    activity_title TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'vocab_review', 'grammar_lesson', 'listening_drill', 'conversation_tutor', 'reading_writing', 'comprehensive_quiz'
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    reason TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at INTEGER,
    FOREIGN KEY(path_id) REFERENCES adaptive_learning_paths(id) ON DELETE CASCADE
  );

  -- Path Version History (Lưu lịch sử điều chỉnh của AI)
  CREATE TABLE IF NOT EXISTS learning_path_versions (
    id TEXT PRIMARY KEY,
    path_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    trigger_reason TEXT NOT NULL,
    changes_summary TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(path_id) REFERENCES adaptive_learning_paths(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_path_user ON adaptive_learning_paths(user_id);
  CREATE INDEX IF NOT EXISTS idx_stages_path ON learning_path_stages(path_id);
  CREATE INDEX IF NOT EXISTS idx_items_stage ON learning_path_items(stage_id);
  CREATE INDEX IF NOT EXISTS idx_items_path_order ON learning_path_items(path_id, order_index);
  CREATE INDEX IF NOT EXISTS idx_items_stage_order ON learning_path_items(stage_id, order_index);
  CREATE INDEX IF NOT EXISTS idx_items_status ON learning_path_items(status);
  CREATE INDEX IF NOT EXISTS idx_milestones_path ON learning_path_milestones(path_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_path ON learning_schedule_items(path_id);
  CREATE INDEX IF NOT EXISTS idx_schedule_day ON learning_schedule_items(day_of_week);
  CREATE INDEX IF NOT EXISTS idx_path_versions ON learning_path_versions(path_id);
  CREATE INDEX IF NOT EXISTS idx_versions_path_num ON learning_path_versions(path_id, version_number);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

  -- ==================== SMART REVIEW & SPACED REPETITION (SM-2) ====================
  -- Core SRS Cards linked directly to vocabulary_memory, grammar_memory, or learning_errors
  CREATE TABLE IF NOT EXISTS srs_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL, -- 'vocabulary', 'grammar', 'phrase', 'error'
    reference_id TEXT NOT NULL, -- id in vocabulary_memory, grammar_memory, or learning_errors
    unique_key TEXT UNIQUE NOT NULL, -- e.g. "vocabulary_12" to prevent duplicate cards
    hsk_level INTEGER DEFAULT 1,
    prompt_zh TEXT NOT NULL, -- Hanzi or sentence
    prompt_pinyin TEXT, -- Pinyin
    prompt_vi TEXT NOT NULL, -- Vietnamese translation / meaning
    extra_data_json TEXT, -- examples, audio text, formula, contrast notes, etc.
    ease_factor REAL DEFAULT 2.5, -- SM-2 Ease Factor (min 1.3)
    interval_days INTEGER DEFAULT 0, -- Current interval in days
    repetition_count INTEGER DEFAULT 0, -- Consecutive successful reviews (n)
    streak INTEGER DEFAULT 0, -- Consecutive correct answers
    lapses INTEGER DEFAULT 0, -- Number of times forgotten / failed
    last_reviewed_at INTEGER,
    next_review_at INTEGER NOT NULL, -- Timestamp when card is due
    mastery_level TEXT DEFAULT 'introduced', -- 'introduced', 'learning', 'needs_review', 'fair', 'mastered'
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'graduated'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- SRS Review Attempt Logs: Audit trail of every single review attempt
  CREATE TABLE IF NOT EXISTS srs_review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    session_id TEXT,
    review_mode TEXT NOT NULL, -- 'flashcard', 'zh_to_vi', 'vi_to_zh', 'listening', 'grammar', 'error_fix'
    quality INTEGER NOT NULL, -- 0-5 SM-2 rating
    user_rating TEXT NOT NULL, -- 'again', 'hard', 'good', 'easy'
    user_answer TEXT,
    is_correct INTEGER DEFAULT 1,
    old_interval INTEGER,
    new_interval INTEGER,
    old_ease_factor REAL,
    new_ease_factor REAL,
    duration_ms INTEGER DEFAULT 0,
    reviewed_at INTEGER NOT NULL,
    FOREIGN KEY(item_id) REFERENCES srs_items(id) ON DELETE CASCADE
  );

  -- SRS Sessions: Track daily review sessions and retention rates
  CREATE TABLE IF NOT EXISTS srs_sessions (
    id TEXT PRIMARY KEY,
    session_type TEXT DEFAULT 'daily_review',
    cards_reviewed INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    cards_failed INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    started_at INTEGER NOT NULL,
    completed_at INTEGER
  );

  -- ==================== CHINESE PRONUNCIATION LAB TABLES ====================
  -- Pronunciation Practice Records
  CREATE TABLE IF NOT EXISTS pronunciation_records (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    target_text TEXT NOT NULL,
    target_pinyin TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'initial', 'final', 'tone', 'syllable', 'word', 'sentence', 'contrast_pair', 'custom'
    mode TEXT NOT NULL, -- 'pinyin', 'tones', 'initials', 'finals', 'syllables', 'words', 'sentences', 'minimal_pairs', 'assessment', 'free_ai'
    spoken_transcript TEXT,
    score REAL DEFAULT 0,
    is_match INTEGER DEFAULT 0,
    audio_duration_ms INTEGER DEFAULT 0,
    audio_metrics_json TEXT, -- duration, energy, pitch note, etc.
    word_analysis_json TEXT, -- character by character analysis
    tone_feedback_vi TEXT,
    phonetic_feedback_vi TEXT,
    strengths_json TEXT,
    improvements_json TEXT,
    practice_tip_vi TEXT,
    created_at INTEGER NOT NULL
  );

  -- Pronunciation Weaknesses (Track specific sounds student struggles with: e.g. zh, z, ch, c, tone 3, tone 4)
  CREATE TABLE IF NOT EXISTS pronunciation_weaknesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default',
    sound_key TEXT NOT NULL UNIQUE, -- e.g. 'initial_zh', 'initial_z', 'tone_3', 'tone_4', 'pair_zh_z'
    sound_category TEXT NOT NULL, -- 'initial', 'final', 'tone', 'sandhi', 'pair'
    title TEXT NOT NULL,
    error_count INTEGER DEFAULT 1,
    practice_count INTEGER DEFAULT 1,
    mastery_level TEXT DEFAULT 'struggling', -- 'struggling', 'learning', 'good', 'mastered'
    last_practiced_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pronounce_user_mode ON pronunciation_records(user_id, mode);
  CREATE INDEX IF NOT EXISTS idx_pronounce_created ON pronunciation_records(created_at);
  CREATE INDEX IF NOT EXISTS idx_pronounce_weak_sound ON pronunciation_weaknesses(sound_key);

  -- Shadowing Lessons (7 Levels, dialogue/monologue, segmented meaningful chunks / 意群)
  CREATE TABLE IF NOT EXISTS shadowing_lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    level INTEGER DEFAULT 1, -- 1: Single words, 2: Phrases, 3: Short sentences, 4: Long sentences, 5: Dialogue, 6: Monologue, 7: Natural speed
    hsk_level INTEGER DEFAULT 1,
    topic TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    recommended_speed REAL DEFAULT 1.0,
    full_zh TEXT NOT NULL,
    full_pinyin TEXT NOT NULL,
    full_vi TEXT NOT NULL,
    dialogue_roles_json TEXT,
    chunks_json TEXT NOT NULL,
    comprehension_questions_json TEXT,
    source TEXT DEFAULT 'seed', -- 'seed', 'ai_personalized', 'custom'
    target_weaknesses_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Shadowing Practice Records
  CREATE TABLE IF NOT EXISTS shadowing_practice_records (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    user_id TEXT DEFAULT 'default',
    mode TEXT NOT NULL, -- 'echo', 'delayed', 'simultaneous', 'listen_repeat', 'full_passage', 'no_subtitle'
    practice_step INTEGER NOT NULL, -- 1-6
    completed_chunks_count INTEGER DEFAULT 0,
    total_chunks_count INTEGER DEFAULT 0,
    speed_used REAL DEFAULT 1.0,
    user_audio_duration_ms INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    fluency_score REAL DEFAULT 0,
    accuracy_score REAL DEFAULT 0,
    transcript TEXT,
    strengths_json TEXT,
    weaknesses_json TEXT,
    flagged_sounds_json TEXT,
    evaluation_feedback_vi TEXT,
    created_at INTEGER NOT NULL
  );

  -- ==================== AI CHINESE DICTIONARY TABLES ====================
  -- Core Dictionary Entries: Standardized HSK & Curated Dictionary Database
  CREATE TABLE IF NOT EXISTS dictionary_entries (
    id TEXT PRIMARY KEY,
    simplified TEXT NOT NULL UNIQUE,
    traditional TEXT,
    pinyin TEXT NOT NULL,
    pinyin_clean TEXT NOT NULL, -- normalized tone-agnostic lowercase pinyin e.g. "xuexi"
    meaning_vi TEXT NOT NULL,
    word_type TEXT DEFAULT 'danh từ',
    hsk_level INTEGER DEFAULT 1,
    radical TEXT,
    stroke_count INTEGER DEFAULT 1,
    character_decomposition TEXT,
    measure_words TEXT,
    synonyms_json TEXT, -- array of strings e.g. ["念书", "求学"]
    antonyms_json TEXT, -- array of strings
    confusing_words_json TEXT, -- array of objects or strings e.g. ["学习 vs 练习", "看 vs 观看"]
    collocations_json TEXT, -- array of strings e.g. ["努力学习", "学习方法"]
    senses_json TEXT, -- detailed senses / nuances
    examples_json TEXT, -- array of { zh, pinyin, vi, context }
    source TEXT DEFAULT 'standard_hsk_cedict', -- 'standard_hsk_cedict', 'gemini_ai_verified', 'user_custom'
    version TEXT DEFAULT '1.0',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Dictionary Lookup History
  CREATE TABLE IF NOT EXISTS dictionary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default',
    query TEXT NOT NULL,
    query_type TEXT NOT NULL, -- 'chinese', 'pinyin', 'vietnamese', 'context'
    result_entry_id TEXT,
    context_sentence TEXT,
    created_at INTEGER NOT NULL
  );

  -- Dictionary Personal Notes & Favorites (Linked directly to vocabulary_memory and srs_items)
  CREATE TABLE IF NOT EXISTS dictionary_personal_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    entry_id TEXT NOT NULL UNIQUE,
    vocab_memory_id INTEGER,
    srs_item_id TEXT,
    is_favorite INTEGER DEFAULT 0,
    personal_note TEXT,
    tags_json TEXT,
    lookup_count INTEGER DEFAULT 1,
    last_looked_up_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_dict_simplified ON dictionary_entries(simplified);
  CREATE INDEX IF NOT EXISTS idx_dict_pinyin_clean ON dictionary_entries(pinyin_clean);
  CREATE INDEX IF NOT EXISTS idx_dict_hsk ON dictionary_entries(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_dict_meaning ON dictionary_entries(meaning_vi);
  CREATE INDEX IF NOT EXISTS idx_dict_history_created ON dictionary_history(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dict_notes_entry ON dictionary_personal_notes(entry_id);

  -- ========================================================================
  -- INTERACTIVE CHINESE READING SYSTEM (v1.11.0)
  -- ========================================================================

  -- Reading Passages (Standard curated library + AI-generated personalized passages)
  CREATE TABLE IF NOT EXISTS reading_passages (
    id TEXT PRIMARY KEY,
    title_zh TEXT NOT NULL,
    title_pinyin TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    level TEXT NOT NULL, -- 'beginner', 'hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6', 'advanced'
    hsk_level INTEGER DEFAULT 1,
    standard_version TEXT DEFAULT 'HSK 3.0 / HSK 2.0 Tham chiếu',
    topic TEXT NOT NULL, -- 'daily_life', 'family', 'school', 'work', 'shopping', 'travel', 'food', 'culture', 'history', 'science', 'technology', 'society', 'idioms_stories', 'short_story'
    genre TEXT NOT NULL, -- 'short_passage', 'dialogue', 'story', 'simple_article', 'narrative', 'diary', 'academic'
    difficulty_rating REAL DEFAULT 1.0,
    word_count INTEGER NOT NULL,
    estimated_reading_minutes INTEGER DEFAULT 3,
    full_content_zh TEXT NOT NULL,
    full_content_pinyin TEXT NOT NULL,
    full_content_vi TEXT NOT NULL,
    paragraphs_json TEXT, -- array of strings (paragraphs)
    vocabulary_focus_json TEXT, -- array of { simplified, pinyin, meaningVi, hskLevel, isNewWord }
    grammar_focus_json TEXT, -- array of { pattern, formula, explanationVi, exampleSentence }
    comprehension_questions_json TEXT, -- array of { id, type, question, options, answer, explanationVi, citationText }
    learning_objectives_json TEXT, -- array of strings
    source TEXT DEFAULT 'curated_standard', -- 'curated_standard', 'gemini_ai_personalized'
    content_version INTEGER DEFAULT 1,
    is_favorite INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    last_read_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Segmented Sentences for Audio Sync & Grammar Analysis
  CREATE TABLE IF NOT EXISTS reading_passage_sentences (
    id TEXT PRIMARY KEY,
    passage_id TEXT NOT NULL,
    sentence_index INTEGER NOT NULL,
    paragraph_index INTEGER DEFAULT 0,
    sentence_zh TEXT NOT NULL,
    sentence_pinyin TEXT NOT NULL,
    sentence_vi TEXT NOT NULL,
    grammar_notes_json TEXT,
    audio_timing_json TEXT,
    FOREIGN KEY(passage_id) REFERENCES reading_passages(id) ON DELETE CASCADE
  );

  -- Reading Learning Sessions & Progress Analytics
  CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    passage_id TEXT NOT NULL,
    mode TEXT DEFAULT 'intensive', -- 'intensive', 'extensive', 'blind_listening'
    time_spent_seconds INTEGER DEFAULT 0,
    reading_speed_wpm REAL DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    score_percent INTEGER DEFAULT 0,
    looked_up_words_json TEXT,
    saved_words_json TEXT,
    grammar_inspected_json TEXT,
    ai_tutor_queries_json TEXT,
    comprehension_summary_json TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY(passage_id) REFERENCES reading_passages(id) ON DELETE CASCADE
  );

  -- Reading Comprehension Answers & AI Evaluation
  CREATE TABLE IF NOT EXISTS reading_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    passage_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL, -- 0 or 1
    ai_feedback_vi TEXT,
    citation_text TEXT,
    score_awarded REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES reading_sessions(id) ON DELETE CASCADE
  );

  -- Reading Bookmarks, Favorites & Reading Progress
  CREATE TABLE IF NOT EXISTS reading_bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    passage_id TEXT NOT NULL UNIQUE,
    is_favorite INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    last_read_sentence_index INTEGER DEFAULT 0,
    personal_notes TEXT,
    status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(passage_id) REFERENCES reading_passages(id) ON DELETE CASCADE
  );

  -- ========================================================================
  -- KNOWLEDGE REGISTRY (HỆ THỐNG ĐỊNH DANH VÀ QUẢN LÝ KIẾN THỨC THỐNG NHẤT)
  -- ========================================================================

  -- 1. Knowledge Items (Đơn vị kiến thức định danh duy nhất)
  CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL, -- 'vocabulary', 'grammar', 'sentence_pattern', 'pronunciation', 'reading_concept', 'listening_concept'
    canonical_key TEXT NOT NULL, -- e.g. 'voc_xuexi', 'gra_le_completed', 'pro_initial_zh'
    display_text TEXT NOT NULL, -- '学习', 'Cấu trúc 了 (Hoàn thành)', 'zh'
    hanzi_simplified TEXT,
    hanzi_traditional TEXT,
    pinyin TEXT,
    pinyin_clean TEXT,
    hsk_level INTEGER DEFAULT 1,
    hsk_version TEXT DEFAULT '3.0',
    difficulty_score REAL DEFAULT 1.0,
    category TEXT, -- 'noun', 'aspect_particle', 'initial', 'final', 'tone_sandhi'
    formula TEXT, -- cho grammar / pattern
    communicative_goal TEXT, -- cho pattern
    usage_conditions TEXT,
    tags_json TEXT, -- json array: ["giao tiếp", "hàng ngày"]
    common_mistakes_json TEXT,
    metadata_json TEXT, -- radical, stroke_count, decomposition
    status TEXT DEFAULT 'active', -- 'active', 'archived', 'needs_review'
    source TEXT DEFAULT 'system',
    version INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ki_type ON knowledge_items(item_type);
  CREATE INDEX IF NOT EXISTS idx_ki_canonical ON knowledge_items(canonical_key);
  CREATE INDEX IF NOT EXISTS idx_ki_simplified ON knowledge_items(hanzi_simplified);
  CREATE INDEX IF NOT EXISTS idx_ki_pinyin_clean ON knowledge_items(pinyin_clean);
  CREATE INDEX IF NOT EXISTS idx_ki_hsk ON knowledge_items(hsk_level);
  CREATE INDEX IF NOT EXISTS idx_ki_status ON knowledge_items(status);

  -- 2. Knowledge Senses (Phân biệt từ vựng và từng tầng nghĩa / cách dùng)
  CREATE TABLE IF NOT EXISTS knowledge_senses (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    sense_index INTEGER NOT NULL DEFAULT 1,
    word_type TEXT,
    meaning_vi TEXT NOT NULL,
    meaning_en TEXT,
    context_description TEXT,
    register TEXT, -- 'khẩu ngữ', 'trang trọng', 'văn viết'
    measure_words TEXT,
    examples_json TEXT, -- [{zh, pinyin, vi, context}]
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ks_knowledge_id ON knowledge_senses(knowledge_id);

  -- 3. Knowledge Relations (Mạng lưới quan hệ chuẩn hóa giữa các tri thức)
  CREATE TABLE IF NOT EXISTS knowledge_relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL, -- 'similar', 'opposite', 'synonym', 'near_synonym', 'example_of', 'prerequisite', 'advanced_of', 'confused_with', 'topic_related'
    weight REAL DEFAULT 1.0,
    notes TEXT,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(source_id, target_id, relation_type)
  );

  CREATE INDEX IF NOT EXISTS idx_kr_source ON knowledge_relations(source_id);
  CREATE INDEX IF NOT EXISTS idx_kr_target ON knowledge_relations(target_id);
  CREATE INDEX IF NOT EXISTS idx_kr_type ON knowledge_relations(relation_type);

  -- 4. Knowledge Aliases (Phiên âm, từ đồng nghĩa tra cứu, phồn thể, cách gọi khác)
  CREATE TABLE IF NOT EXISTS knowledge_aliases (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_type TEXT NOT NULL, -- 'pinyin_clean', 'pinyin_tone', 'vietnamese_query', 'traditional', 'common_typo', 'alternate_spelling'
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ka_alias ON knowledge_aliases(alias);
  CREATE INDEX IF NOT EXISTS idx_ka_kid ON knowledge_aliases(knowledge_id);

  -- 5. Knowledge Legacy Mapping (Cầu nối truy vết 100% ID cũ sang Knowledge ID mới)
  CREATE TABLE IF NOT EXISTS knowledge_legacy_mapping (
    legacy_table TEXT NOT NULL,
    legacy_id TEXT NOT NULL,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    legacy_key TEXT,
    migrated_at INTEGER NOT NULL,
    PRIMARY KEY (legacy_table, legacy_id)
  );

  CREATE INDEX IF NOT EXISTS idx_klm_kid ON knowledge_legacy_mapping(knowledge_id);

  -- 6. Knowledge Dedup Candidates (Danh sách nghi ngờ trùng lặp chờ xác minh)
  CREATE TABLE IF NOT EXISTS knowledge_dedup_candidates (
    id TEXT PRIMARY KEY,
    primary_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id),
    candidate_knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id),
    similarity_score REAL NOT NULL,
    match_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'merged', 'rejected', 'verified_distinct'
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  );

  -- ========================================================================
  -- LEARNING EVIDENCE SYSTEM (HỆ THỐNG GHI NHẬN BẰNG CHỨNG HỌC TẬP THỰC TẾ)
  -- ========================================================================

  -- 1. Learning Evidences (Bằng chứng học tập bất biến Append-Only)
  CREATE TABLE IF NOT EXISTS learning_evidences (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE RESTRICT,
    evidence_type TEXT NOT NULL, -- 'exposure', 'instruction', 'recognition', 'recall', 'application', 'pronunciation', 'listening_reading', 'review'
    action TEXT NOT NULL, -- 'dictionary_lookup', 'lesson_view', 'lesson_exercise', 'srs_review', 'chat_utterance', 'pronunciation_trial', 'shadowing_repeat', 'reading_question_answer'
    source_module TEXT NOT NULL, -- 'ai_tutor', 'voice_chat', 'dictionary', 'lesson', 'placement', 'srs', 'pronunciation_lab', 'shadowing', 'reading'
    session_id TEXT,
    attempt_id TEXT,
    idempotency_key TEXT UNIQUE,
    observed_data_json TEXT NOT NULL, -- Dữ liệu quan sát thực tế (lời nói, văn bản, lựa chọn, âm học)
    assessment_data_json TEXT NOT NULL, -- Kết quả chấm/đánh giá (đúng/sai, điểm, match rate, lỗi)
    inference_data_json TEXT, -- Giả thuyết sư phạm / phạm vi áp dụng (không gán bừa mastery)
    assessment_method TEXT NOT NULL, -- 'deterministic_rule', 'ai_evaluation', 'audio_evaluation', 'human_confirmation', 'imported_baseline'
    evaluator TEXT NOT NULL, -- 'sm2_engine', 'acoustic_analyzer', 'gemini_text', 'placement_grader', 'reading_grader', 'user_self_report'
    confidence REAL NOT NULL DEFAULT 1.0, -- Mức độ tin cậy của đánh giá (0.0 - 1.0)
    status TEXT NOT NULL DEFAULT 'valid', -- 'valid', 'invalidated', 'corrected'
    correction_reason TEXT,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_evi_knowledge ON learning_evidences(knowledge_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_evi_type ON learning_evidences(evidence_type, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_evi_source ON learning_evidences(source_module, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_evi_session ON learning_evidences(session_id);
  CREATE INDEX IF NOT EXISTS idx_evi_idempotency ON learning_evidences(idempotency_key);
  CREATE INDEX IF NOT EXISTS idx_evi_status ON learning_evidences(status);

  -- 2. Evidence Sources (Lưu vết phiên học và siêu dữ liệu môi trường)
  CREATE TABLE IF NOT EXISTS evidence_sources (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    source_module TEXT NOT NULL,
    user_id TEXT DEFAULT 'default',
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    item_count INTEGER DEFAULT 0,
    metadata_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_evsrc_session ON evidence_sources(session_id);

  -- 3. Evidence Corrections (Nhật ký đính chính / vô hiệu hóa bằng chứng)
  CREATE TABLE IF NOT EXISTS evidence_corrections (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL REFERENCES learning_evidences(id) ON DELETE CASCADE,
    correction_type TEXT NOT NULL, -- 'invalidate', 'score_rectification', 'label_correction'
    previous_data_json TEXT NOT NULL,
    new_data_json TEXT,
    reason TEXT NOT NULL,
    corrected_by TEXT NOT NULL, -- 'user', 'system_audit', 'admin'
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_evcor_evidence ON evidence_corrections(evidence_id);

  -- 4. Evidence Relations (Liên kết chuỗi bằng chứng: sai -> sửa, thử lại, dẫn xuất)
  CREATE TABLE IF NOT EXISTS evidence_relations (
    id TEXT PRIMARY KEY,
    source_evidence_id TEXT NOT NULL REFERENCES learning_evidences(id) ON DELETE CASCADE,
    target_evidence_id TEXT NOT NULL REFERENCES learning_evidences(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL, -- 'remedies_error', 'retry_of', 'subsequent_review', 'derived_from'
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_evrel_source ON evidence_relations(source_evidence_id);
  CREATE INDEX IF NOT EXISTS idx_evrel_target ON evidence_relations(target_evidence_id);

  -- ========================================================================
  -- MASTERY ENGINE SYSTEM (HỆ THỐNG ĐÁNH GIÁ MỨC ĐỘ THÀNH THẠO KIẾN THỨC)
  -- ========================================================================

  -- 1. Mastery Snapshots (Ảnh chụp trạng thái thành thạo hiện tại của từng kiến thức)
  CREATE TABLE IF NOT EXISTS mastery_snapshots (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL DEFAULT 'default',
    composite_state TEXT NOT NULL, -- 'UNKNOWN', 'UNSEEN', 'EXPOSED', 'LEARNING', 'UNSTABLE', 'FAMILIAR', 'MASTERED'
    overall_confidence REAL NOT NULL DEFAULT 0.0,
    recognition_score REAL NOT NULL DEFAULT 0.0,
    recognition_confidence REAL NOT NULL DEFAULT 0.0,
    recall_score REAL NOT NULL DEFAULT 0.0,
    recall_confidence REAL NOT NULL DEFAULT 0.0,
    application_score REAL NOT NULL DEFAULT 0.0,
    application_confidence REAL NOT NULL DEFAULT 0.0,
    retention_score REAL NOT NULL DEFAULT 0.0,
    retention_confidence REAL NOT NULL DEFAULT 0.0,
    pronunciation_score REAL,
    pronunciation_confidence REAL,
    dimensions_json TEXT NOT NULL, -- Chi tiết đa chiều: scores, confidences, counts, dates
    evidence_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    first_evidence_at INTEGER,
    last_evidence_at INTEGER,
    last_calculated_at INTEGER NOT NULL,
    ever_mastered INTEGER NOT NULL DEFAULT 0, -- 1 nếu từng đạt MASTERED trong quá khứ
    needs_review INTEGER NOT NULL DEFAULT 0, -- 1 nếu độ duy trì retention suy giảm cần ôn tập
    decay_factor REAL NOT NULL DEFAULT 1.0,
    reasoning_summary TEXT NOT NULL, -- Giải thích sư phạm rõ ràng vì sao đạt trạng thái này
    contradictions_json TEXT, -- Phát hiện mâu thuẫn giữa các chiều (ví dụ: recognition cao nhưng application thấp)
    algorithm_version TEXT NOT NULL DEFAULT '2.2.0',
    UNIQUE (knowledge_id, learner_id)
  );

  CREATE INDEX IF NOT EXISTS idx_msnp_knowledge ON mastery_snapshots(knowledge_id, learner_id);
  CREATE INDEX IF NOT EXISTS idx_msnp_state ON mastery_snapshots(composite_state);
  CREATE INDEX IF NOT EXISTS idx_msnp_needs_review ON mastery_snapshots(needs_review);
  CREATE INDEX IF NOT EXISTS idx_msnp_calculated ON mastery_snapshots(last_calculated_at);

  -- 2. Mastery History (Lịch sử chuyển đổi trạng thái thành thạo khi có biến động)
  CREATE TABLE IF NOT EXISTS mastery_history (
    id TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL DEFAULT 'default',
    previous_state TEXT,
    new_state TEXT NOT NULL,
    trigger_evidence_id TEXT REFERENCES learning_evidences(id) ON DELETE SET NULL,
    trigger_action TEXT,
    reason TEXT NOT NULL,
    dimensions_summary_json TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_mshist_knowledge ON mastery_history(knowledge_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_mshist_learner ON mastery_history(learner_id, created_at DESC);

  -- 3. Mastery Evaluation Rules (Cấu hình bộ quy tắc trọng số và ngưỡng đánh giá)
  CREATE TABLE IF NOT EXISTS mastery_evaluation_rules (
    rule_key TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- 'weights', 'thresholds', 'contradiction', 'decay'
    value_json TEXT NOT NULL,
    description_vi TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 4. AI Request Logs (Bảng truy vết siêu dữ liệu yêu cầu AI Orchestrator - Không lưu API key hoặc dữ liệu nhạy cảm)
  CREATE TABLE IF NOT EXISTS ai_request_logs (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    model_category TEXT NOT NULL, -- 'text_out' | 'live'
    model_id TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    context_version TEXT,
    status TEXT NOT NULL, -- 'pending' | 'completed' | 'failed' | 'timeout' | 'rejected'
    latency_ms INTEGER,
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,
    error_code TEXT,
    error_message TEXT,
    idempotency_key TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ai_req_task ON ai_request_logs(task_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_req_idempotency ON ai_request_logs(idempotency_key);
  CREATE INDEX IF NOT EXISTS idx_ai_req_status ON ai_request_logs(status);

  -- 5. Session Pedagogic Summaries (Bản tóm tắt sư phạm có cấu trúc theo từng phiên học - Requirement 7)
  CREATE TABLE IF NOT EXISTS session_pedagogic_summaries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    learner_id TEXT NOT NULL DEFAULT 'default',
    topic TEXT NOT NULL,
    taught_knowledge_json TEXT NOT NULL DEFAULT '[]',     -- AI đã dạy
    practiced_knowledge_json TEXT NOT NULL DEFAULT '[]',  -- Người học đã thực hành
    mastered_knowledge_json TEXT NOT NULL DEFAULT '[]',   -- Người học đã thành thạo
    key_errors_json TEXT NOT NULL DEFAULT '[]',           -- Lỗi quan trọng
    assessment_summary_vi TEXT NOT NULL,
    next_focus_vi TEXT NOT NULL,
    summary_version TEXT NOT NULL DEFAULT 'v1',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sess_sum_learner ON session_pedagogic_summaries(learner_id, created_at DESC);

  -- 6. Context Retrieval Traces (Bảng truy vết minh bạch quá trình trích xuất và tối ưu Context - Requirement 11)
  CREATE TABLE IF NOT EXISTS context_retrieval_traces (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    learner_id TEXT NOT NULL DEFAULT 'default',
    context_profile TEXT NOT NULL,
    retrieved_sources_json TEXT NOT NULL,
    knowledge_ids_used_json TEXT NOT NULL,
    evidence_ids_used_json TEXT NOT NULL,
    pruned_items_json TEXT NOT NULL,
    ranking_scores_json TEXT,
    estimated_tokens INTEGER NOT NULL,
    context_version TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ctx_trace_req ON context_retrieval_traces(request_id);
  CREATE INDEX IF NOT EXISTS idx_ctx_trace_task ON context_retrieval_traces(task_id, created_at DESC);

  -- 7. Teaching Root Cause Diagnoses (Chẩn đoán nguyên nhân gốc rễ lỗi lặp lại - Phase B3)
  CREATE TABLE IF NOT EXISTS teaching_root_cause_diagnoses (
    id TEXT PRIMARY KEY,
    learner_id TEXT NOT NULL DEFAULT 'default',
    concept_key TEXT NOT NULL,
    concept_name TEXT NOT NULL,
    symptom TEXT NOT NULL,
    suspected_cause TEXT NOT NULL,
    cause_explanation_vi TEXT NOT NULL,
    evidence_ids_json TEXT NOT NULL DEFAULT '[]',
    observation_count INTEGER NOT NULL DEFAULT 1,
    confidence REAL NOT NULL DEFAULT 0.7,
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_prompt_json TEXT NOT NULL,
    remedy_plan_vi TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trcd_learner ON teaching_root_cause_diagnoses(learner_id, concept_key);
  CREATE INDEX IF NOT EXISTS idx_trcd_verified ON teaching_root_cause_diagnoses(is_verified);

  CREATE INDEX IF NOT EXISTS idx_reading_level ON reading_passages(level, hsk_level);
  CREATE INDEX IF NOT EXISTS idx_reading_topic ON reading_passages(topic);
  CREATE INDEX IF NOT EXISTS idx_reading_genre ON reading_passages(genre);
  CREATE INDEX IF NOT EXISTS idx_reading_source ON reading_passages(source);
  CREATE INDEX IF NOT EXISTS idx_reading_sentences_passage ON reading_passage_sentences(passage_id, sentence_index);
  CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON reading_sessions(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reading_bookmarks_passage ON reading_bookmarks(passage_id);

  CREATE INDEX IF NOT EXISTS idx_shadowing_level ON shadowing_lessons(level, hsk_level);
  CREATE INDEX IF NOT EXISTS idx_shadowing_records_lesson ON shadowing_practice_records(lesson_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_shadowing_records_created ON shadowing_practice_records(created_at);

  CREATE INDEX IF NOT EXISTS idx_srs_next_review ON srs_items(next_review_at, status);
  CREATE INDEX IF NOT EXISTS idx_srs_type_ref ON srs_items(item_type, reference_id);
  CREATE INDEX IF NOT EXISTS idx_srs_lapses ON srs_items(lapses);
  CREATE INDEX IF NOT EXISTS idx_srs_mastery ON srs_items(mastery_level);
  CREATE INDEX IF NOT EXISTS idx_srs_logs_item ON srs_review_logs(item_id, reviewed_at);
  CREATE INDEX IF NOT EXISTS idx_srs_logs_time ON srs_review_logs(reviewed_at);
`);

// Safe column migrations for Conversation Analysis System
function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const exists = pragma.some((col: any) => col.name === column);
    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (e) {
    console.warn(`Could not add column ${column} to ${table}:`, e);
  }
}

// chat_sessions additions
addColumnIfNotExists('chat_sessions', 'session_type', "TEXT DEFAULT 'text'");
addColumnIfNotExists('chat_sessions', 'status', "TEXT DEFAULT 'active'");
addColumnIfNotExists('chat_sessions', 'is_analyzed', "INTEGER DEFAULT 0");
addColumnIfNotExists('chat_sessions', 'duration_seconds', "INTEGER DEFAULT 0");
addColumnIfNotExists('chat_sessions', 'message_count', "INTEGER DEFAULT 0");
addColumnIfNotExists('chat_sessions', 'last_analyzed_at', "INTEGER");

// AI Tutor Intelligence upgrades & 6D competency profile
addColumnIfNotExists('learner_profile', 'vocab_breadth_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'grammar_accuracy_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'listening_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'reading_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'writing_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'fluency_score', "INTEGER DEFAULT 50");
addColumnIfNotExists('learner_profile', 'pedagogic_notes_json', "TEXT DEFAULT '[]'");

// 7-stage mastery lifecycle & evidence tracking
addColumnIfNotExists('vocabulary_memory', 'mastery_stage', "TEXT DEFAULT 'introduced'");
addColumnIfNotExists('vocabulary_memory', 'evidence_count', "INTEGER DEFAULT 1");
addColumnIfNotExists('grammar_memory', 'mastery_stage', "TEXT DEFAULT 'introduced'");
addColumnIfNotExists('grammar_memory', 'evidence_count', "INTEGER DEFAULT 1");

// conversation_analyses rich additions
addColumnIfNotExists('conversation_analyses', 'session_type', "TEXT DEFAULT 'text'");
addColumnIfNotExists('conversation_analyses', 'vocab_analysis_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'grammar_analysis_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'detected_errors_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'communication_assessment_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'mastery_updates_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'srs_sync_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'path_recommendations_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'suggested_lesson_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'sentence_breakdown_json', "TEXT");
addColumnIfNotExists('conversation_analyses', 'overall_score', "INTEGER DEFAULT 80");
addColumnIfNotExists('conversation_analyses', 'confidence_score', "REAL DEFAULT 0.9");
addColumnIfNotExists('conversation_analyses', 'schema_version', "INTEGER DEFAULT 2");

// Knowledge Registry backward-compatible linkages
addColumnIfNotExists('vocabulary_memory', 'knowledge_id', "TEXT");
addColumnIfNotExists('grammar_memory', 'knowledge_id', "TEXT");
addColumnIfNotExists('dictionary_entries', 'knowledge_id', "TEXT");
addColumnIfNotExists('srs_items', 'knowledge_id', "TEXT");
addColumnIfNotExists('learning_errors', 'knowledge_id', "TEXT");
addColumnIfNotExists('learner_evidence_ledger', 'knowledge_id', "TEXT");
addColumnIfNotExists('pronunciation_weaknesses', 'knowledge_id', "TEXT");

// Create indexes after columns exist
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_analysis_session ON conversation_analyses(session_id);
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_analyzed ON chat_sessions(is_analyzed, status);
  CREATE INDEX IF NOT EXISTS idx_vocab_knowledge_id ON vocabulary_memory(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_grammar_knowledge_id ON grammar_memory(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_dict_knowledge_id ON dictionary_entries(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_srs_knowledge_id ON srs_items(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_errors_knowledge_id ON learning_errors(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_ledger_knowledge_id ON learner_evidence_ledger(knowledge_id);
  CREATE INDEX IF NOT EXISTS idx_weakness_knowledge_id ON pronunciation_weaknesses(knowledge_id);
`);

// Optimize SQLite Query Planner
db.pragma('optimize');

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

// Seed initial learner evidence ledger if empty
const evidenceCount = (db.prepare('SELECT COUNT(*) as count FROM learner_evidence_ledger').get() as any).count;
if (evidenceCount === 0) {
  const now = Date.now();
  const insertEvidence = db.prepare(`
    INSERT INTO learner_evidence_ledger (
      id, target_type, target_key, claim_summary, evidence_quote, source_activity,
      source_session_id, observation_count, confidence_score, mastery_stage, status,
      last_observed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvidence.run(
    'ev_seed_1',
    'grammar',
    'grammar_把',
    'Đã học quy tắc câu chữ 把 nhưng thường quên tân ngữ xác định hoặc bỏ sót kết quả sau động từ',
    '我把书看。(Đúng phải là: 我把书看完了。)',
    'text_chat',
    'session_init',
    2,
    0.85,
    'practicing',
    'active',
    now - 86400000,
    now - 86400000
  );

  insertEvidence.run(
    'ev_seed_2',
    'vocabulary',
    'word_苹果',
    'Vận dụng tự nhiên từ vựng quả táo trong ngữ cảnh mua sắm và ăn uống',
    '老板，这个苹果一斤多少钱？',
    'text_chat',
    'session_init',
    3,
    0.95,
    'mastered',
    'active',
    now - 86400000 * 2,
    now - 86400000 * 2
  );
}

// Seed default Mastery Evaluation Rules if empty
const ruleCount = (db.prepare('SELECT COUNT(*) as count FROM mastery_evaluation_rules').get() as any).count;
if (ruleCount === 0) {
  const now = Date.now();
  const insertRule = db.prepare(`
    INSERT INTO mastery_evaluation_rules (rule_key, category, value_json, description_vi, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRule.run(
    'evidence_weights',
    'weights',
    JSON.stringify({
      exposure: 0.1,
      instruction: 0.2,
      recognition: 0.5,
      recall: 0.8,
      application: 1.0,
      pronunciation: 0.8,
      listening_reading: 0.7,
      review: 0.9
    }),
    'Trọng số độ tin cậy và giá trị sư phạm của từng loại bằng chứng trong tính toán năng lực',
    now
  );

  insertRule.run(
    'mastery_thresholds',
    'thresholds',
    JSON.stringify({
      min_evidence_count_mastered: 3,
      min_confidence_mastered: 0.75,
      min_recognition_score: 80,
      min_recall_score: 75,
      min_application_score: 70,
      min_retention_score: 70,
      min_familiar_score: 65,
      min_confidence_familiar: 0.5
    }),
    'Ngưỡng điểm số và độ tin cậy tối thiểu để thăng cấp trạng thái thành thạo',
    now
  );

  insertRule.run(
    'contradiction_thresholds',
    'contradiction',
    JSON.stringify({
      recognition_high_threshold: 80,
      application_low_threshold: 45,
      min_application_fails: 2
    }),
    'Ngưỡng phát hiện mâu thuẫn giữa nhận diện thụ động và vận dụng chủ động (chống ảo tưởng thành thạo)',
    now
  );

  insertRule.run(
    'retention_decay_params',
    'decay',
    JSON.stringify({
      base_half_life_days: 14,
      needs_review_threshold: 60
    }),
    'Tham số suy giảm trí nhớ tự nhiên theo thời gian dựa trên đường cong Ebbinghaus',
    now
  );
}
