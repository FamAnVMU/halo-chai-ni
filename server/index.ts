import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { geminiLiveService } from './geminiLiveService.js';
import { geminiLessonService } from './geminiLessonService.js';
import { geminiPlacementService } from './geminiPlacementService.js';
import { geminiPathService } from './geminiPathService.js';
import { geminiSrsService } from './geminiSrsService.js';
import { geminiAnalysisService } from './geminiAnalysisService.js';
import { geminiPronunciationService } from './geminiPronunciationService.js';
import { geminiShadowingService } from './geminiShadowingService.js';
import { geminiDictionaryService } from './geminiDictionaryService.js';
import { geminiReadingService } from './geminiReadingService.js';
import { aiTutorEngine } from './aiTutorEngine.js';
import { knowledgeRegistryService } from './knowledgeRegistryService.js';
import { learningEvidenceService } from './learningEvidenceService.js';
import { masteryEngineService } from './masteryEngineService.js';
import { unifiedLearningMemoryService } from './unifiedLearningMemoryService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import { TaskRegistry } from './taskRegistry.js';
import { tokenizeChinese } from '../src/data/seedDictionary.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/live' });

app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Helper to get local network IPv4 addresses
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// ==================== HEALTH & STATUS ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: 'connected (SQLite WAL)',
    localIps: getLocalIpAddresses()
  });
});

// ==================== API KEY MANAGEMENT ====================
app.get('/api/settings/keys', (req, res) => {
  const textKey = geminiTextService.getApiKey();
  const liveKey = geminiLiveService.getApiKey();

  res.json({
    textConfig: {
      hasKey: Boolean(textKey),
      keyPreview: textKey ? `${textKey.slice(0, 6)}...${textKey.slice(-4)}` : '',
      model: geminiTextService.getModel(),
      supportedModels: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-4-argon']
    },
    liveConfig: {
      hasKey: Boolean(liveKey),
      keyPreview: liveKey ? `${liveKey.slice(0, 6)}...${liveKey.slice(-4)}` : '',
      model: geminiLiveService.getModel(),
      voice: geminiLiveService.getVoice(),
      supportedModels: ['gemini-3.8-live', 'gemini-3-flash-live', 'gemini-3.8-live-extended-thinking'],
      supportedVoices: ['Aoede', 'Puck', 'Charon', 'Kore', 'Fenrir']
    }
  });
});

// Save or update API Key
app.post('/api/settings/keys', (req, res) => {
  const { textApiKey, textModel, liveApiKey, liveModel, liveVoice } = req.body;
  const now = Date.now();

  const upsert = db.prepare(`
    INSERT INTO server_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  if (textApiKey !== undefined && textApiKey !== '') {
    upsert.run('gemini_text_api_key', textApiKey.trim(), now);
  }
  if (textModel) {
    upsert.run('gemini_text_model', textModel, now);
  }

  if (liveApiKey !== undefined && liveApiKey !== '') {
    upsert.run('gemini_live_api_key', liveApiKey.trim(), now);
  }
  if (liveModel) {
    upsert.run('gemini_live_model', liveModel, now);
  }
  if (liveVoice) {
    upsert.run('gemini_live_voice', liveVoice, now);
  }

  res.json({
    success: true,
    message: 'Cập nhật cấu hình API tại Local Backend thành công!'
  });
});

// Test Text API
app.post('/api/settings/test-text', async (req, res) => {
  const { apiKey, model } = req.body;
  const result = await geminiTextService.testApiKey(apiKey, model);
  res.json(result);
});

// Test Live API
app.post('/api/settings/test-live', async (req, res) => {
  const { apiKey, model } = req.body;
  const result = await geminiLiveService.testLiveApi(apiKey, model);
  res.json(result);
});

// Test Voice Audio Sample
app.get('/api/settings/test-voice-sample', async (req, res) => {
  try {
    const voice = (req.query.voice as string) || geminiLiveService.getVoice();
    const result = await geminiLiveService.generateVoiceSample(voice);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UNIFIED AI ORCHESTRATOR ====================
app.get('/api/ai-orchestrator/status', (req, res) => {
  try {
    const status = unifiedAIOrchestrator.getSystemStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ai-orchestrator/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = unifiedAIOrchestrator.getRecentLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ai-orchestrator/tasks', (req, res) => {
  try {
    const tasks = TaskRegistry.getAllTasks();
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai-orchestrator/execute', async (req, res) => {
  try {
    const { taskId, input, learnerId, hskLevel, idempotencyKey, timeoutMs, sessionId } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Thiếu trường bắt buộc "taskId".' });
    }

    const response = await unifiedAIOrchestrator.executeTask({
      taskId,
      input,
      learnerId,
      hskLevel,
      idempotencyKey,
      timeoutMs,
      sessionId
    });

    if (!response.success && response.error) {
      return res.status(response.error.httpStatus || 500).json(response);
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI TUTOR TEXT CHAT ====================
app.post('/api/tutor/chat', async (req, res) => {
  const { message, history = [], mode = 'free', hskLevel = 1, scenario, sessionId = 'default', overrideIntent } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
  }

  try {
    const aiResponse = await geminiTextService.chat(message, history, mode, hskLevel, scenario, {
      overrideIntent,
      sessionId
    });

    const now = Date.now();
    const userMsgId = `u_${now}`;
    const aiMsgId = `a_${now}`;

    db.prepare(`
      INSERT INTO chat_sessions (id, mode, hsk_level, title, scenario, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
    `).run(sessionId, mode, hskLevel, 'Buổi học tiếng Trung', scenario || '', now, now);

    db.prepare(`
      INSERT INTO chat_messages (id, session_id, sender, text, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userMsgId, sessionId, 'user', message, now);

    db.prepare(`
      INSERT INTO chat_messages (id, session_id, sender, text, pinyin, translation_vi, correction_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiMsgId,
      sessionId,
      'assistant',
      aiResponse.replyZh,
      aiResponse.replyPinyin,
      aiResponse.replyVi,
      aiResponse.correction ? JSON.stringify(aiResponse.correction) : null,
      now
    );

    res.json({
      success: true,
      data: aiResponse
    });
  } catch (err: any) {
    console.error('Tutor chat endpoint error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Lỗi khi gọi Gemini Text Model'
    });
  }
});

// Get AI Tutor 6D Competency & Evidence
app.get('/api/tutor/competency', (_req, res) => {
  try {
    const profile = aiTutorEngine.getCompetencyProfile();
    const evidences = aiTutorEngine.getActiveEvidences(10);
    res.json({
      success: true,
      data: {
        profile,
        evidences
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lookup Contrastive Pair for 2 Confusing Words
app.post('/api/tutor/contrast', (req, res) => {
  try {
    const { wordA, wordB } = req.body;
    const pair = aiTutorEngine.findMatchingContrastPair(`${wordA} ${wordB}`);
    res.json({
      success: true,
      data: pair
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate Micro-Diagnostic Check
app.post('/api/tutor/micro-check', (req, res) => {
  try {
    const { concept, suspectedGap, hskLevel = 1 } = req.body;
    const check = aiTutorEngine.generateMicroCheck(concept, suspectedGap, hskLevel);
    res.json({
      success: true,
      data: check
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Session history from SQLite
app.get('/api/tutor/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC
  `).all(sessionId);

  res.json({
    sessionId,
    messages: messages.map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      pinyin: m.pinyin,
      translationVi: m.translation_vi,
      correction: m.correction_json ? JSON.parse(m.correction_json) : undefined,
      timestamp: m.created_at
    }))
  });
});

// Clear Session history
app.delete('/api/tutor/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  res.json({ success: true, message: 'Đã xóa lịch sử hội thoại.' });
});

// ==================== LEARNER MEMORY & STATS ====================
app.get('/api/memory', (req, res) => {
  const row = db.prepare('SELECT * FROM learner_memory WHERE id = ?').get('default') as any;
  if (!row) {
    return res.json({ id: 'default', weaknesses: [], mispronounced: [], masteredGrammar: [], strugglingGrammar: [], notes: '' });
  }
  res.json({
    id: row.id,
    weaknesses: row.weaknesses_json ? JSON.parse(row.weaknesses_json) : [],
    mispronounced: row.mispronounced_json ? JSON.parse(row.mispronounced_json) : [],
    masteredGrammar: row.mastered_grammar_json ? JSON.parse(row.mastered_grammar_json) : [],
    strugglingGrammar: row.struggling_grammar_json ? JSON.parse(row.struggling_grammar_json) : [],
    notes: row.notes || '',
    updatedAt: row.updated_at
  });
});

app.post('/api/memory', (req, res) => {
  const { weaknesses, mispronounced, masteredGrammar, strugglingGrammar, notes } = req.body;
  const now = Date.now();
  db.prepare(`
    INSERT INTO learner_memory (id, weaknesses_json, mispronounced_json, mastered_grammar_json, struggling_grammar_json, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      weaknesses_json = excluded.weaknesses_json,
      mispronounced_json = excluded.mispronounced_json,
      mastered_grammar_json = excluded.mastered_grammar_json,
      struggling_grammar_json = excluded.struggling_grammar_json,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    'default',
    JSON.stringify(weaknesses || []),
    JSON.stringify(mispronounced || []),
    JSON.stringify(masteredGrammar || []),
    JSON.stringify(strugglingGrammar || []),
    notes || '',
    now
  );
  res.json({ success: true, message: 'Đã cập nhật hồ sơ bộ nhớ học tập.' });
});

// ==================== ADVANCED STRUCTURED MEMORY MANAGEMENT ====================
// Get Full Memory Overview
app.get('/api/memory/all', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any || {};
    const vocabularies = db.prepare('SELECT * FROM vocabulary_memory ORDER BY last_reviewed_at DESC, id DESC').all() as any[];
    const grammar = db.prepare('SELECT * FROM grammar_memory ORDER BY last_reviewed_at DESC, id DESC').all() as any[];
    const errors = db.prepare('SELECT * FROM learning_errors ORDER BY status ASC, last_occurred_at DESC').all() as any[];
    const analyses = db.prepare('SELECT * FROM conversation_analyses ORDER BY created_at DESC LIMIT 10').all() as any[];

    // Parse JSON fields
    const parsedVocab = vocabularies.map(v => ({
      ...v,
      examples: v.examples_json ? JSON.parse(v.examples_json) : []
    }));

    const parsedGrammar = grammar.map(g => ({
      ...g,
      examples: g.examples_json ? JSON.parse(g.examples_json) : [],
      commonMistakes: g.common_mistakes_json ? JSON.parse(g.common_mistakes_json) : []
    }));

    const parsedAnalyses = analyses.map(a => ({
      ...a,
      topics: a.topics_json ? JSON.parse(a.topics_json) : [],
      newVocabTaught: a.new_vocab_taught_json ? JSON.parse(a.new_vocab_taught_json) : [],
      grammarTaught: a.grammar_taught_json ? JSON.parse(a.grammar_taught_json) : [],
      correctExpressions: a.correct_expressions_json ? JSON.parse(a.correct_expressions_json) : [],
      mistakesDetected: a.mistakes_detected_json ? JSON.parse(a.mistakes_detected_json) : [],
      knowledgeGaps: a.knowledge_gaps_json ? JSON.parse(a.knowledge_gaps_json) : []
    }));

    const stats = {
      totalVocab: vocabularies.length,
      masteredVocab: vocabularies.filter(v => v.mastery_level === 'mastered').length,
      needsReviewVocab: vocabularies.filter(v => v.mastery_level === 'needs_review' || v.mastery_level === 'learning').length,
      totalGrammar: grammar.length,
      masteredGrammar: grammar.filter(g => g.mastery_level === 'mastered').length,
      pendingErrors: errors.filter(e => e.status !== 'resolved').length,
      resolvedErrors: errors.filter(e => e.status === 'resolved').length,
      totalStudyMinutes: profile.total_study_minutes || 0
    };

    res.json({
      success: true,
      data: {
        profile: {
          ...profile,
          learningGoals: profile.learning_goals_json ? JSON.parse(profile.learning_goals_json) : [],
          strengths: profile.strengths_json ? JSON.parse(profile.strengths_json) : [],
          weaknesses: profile.weaknesses_json ? JSON.parse(profile.weaknesses_json) : []
        },
        vocabularies: parsedVocab,
        grammar: parsedGrammar,
        errors,
        analyses: parsedAnalyses,
        stats
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Learner Profile
app.post('/api/memory/profile', (req, res) => {
  try {
    const { name, currentHsk, targetHsk, learningGoals, strengths, weaknesses } = req.body;
    const now = Date.now();
    db.prepare(`
      INSERT INTO learner_profile (id, name, current_hsk, target_hsk, learning_goals_json, strengths_json, weaknesses_json, created_at, updated_at)
      VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, learner_profile.name),
        current_hsk = COALESCE(excluded.current_hsk, learner_profile.current_hsk),
        target_hsk = COALESCE(excluded.target_hsk, learner_profile.target_hsk),
        learning_goals_json = COALESCE(excluded.learning_goals_json, learner_profile.learning_goals_json),
        strengths_json = COALESCE(excluded.strengths_json, learner_profile.strengths_json),
        weaknesses_json = COALESCE(excluded.weaknesses_json, learner_profile.weaknesses_json),
        updated_at = excluded.updated_at
    `).run(
      name || 'Học viên',
      currentHsk || 1,
      targetHsk || 3,
      JSON.stringify(learningGoals || []),
      JSON.stringify(strengths || []),
      JSON.stringify(weaknesses || []),
      now,
      now
    );
    res.json({ success: true, message: 'Đã cập nhật hồ sơ người học!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add or edit Vocabulary Memory item
app.post('/api/memory/vocabulary', (req, res) => {
  try {
    const { id, simplified, traditional, pinyin, meaningVi, wordType, hskLevel, masteryLevel, notes } = req.body;
    const now = Date.now();
    if (id) {
      db.prepare(`
        UPDATE vocabulary_memory
        SET simplified = ?, traditional = ?, pinyin = ?, meaning_vi = ?, word_type = ?, hsk_level = ?, mastery_level = ?, notes = ?, last_reviewed_at = ?
        WHERE id = ?
      `).run(simplified, traditional || simplified, pinyin, meaningVi, wordType || 'từ vựng', hskLevel || 1, masteryLevel || 'introduced', notes || '', now, id);
    } else {
      db.prepare(`
        INSERT INTO vocabulary_memory (simplified, traditional, pinyin, meaning_vi, word_type, hsk_level, mastery_level, notes, first_taught_at, last_reviewed_at, review_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(simplified) DO UPDATE SET
          pinyin = excluded.pinyin,
          meaning_vi = excluded.meaning_vi,
          mastery_level = excluded.mastery_level,
          last_reviewed_at = excluded.last_reviewed_at
      `).run(simplified, traditional || simplified, pinyin, meaningVi, wordType || 'từ vựng', hskLevel || 1, masteryLevel || 'introduced', notes || '', now, now);
    }
    res.json({ success: true, message: 'Đã lưu từ vựng vào bộ nhớ học tập!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Vocabulary Memory item
app.delete('/api/memory/vocabulary/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM vocabulary_memory WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa từ vựng khỏi bộ nhớ.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add or edit Grammar Memory item
app.post('/api/memory/grammar', (req, res) => {
  try {
    const { id, patternName, formula, meaningVi, usageNotes, hskLevel, masteryLevel, notes } = req.body;
    const now = Date.now();
    if (id) {
      db.prepare(`
        UPDATE grammar_memory
        SET pattern_name = ?, formula = ?, meaning_vi = ?, usage_notes = ?, hsk_level = ?, mastery_level = ?, notes = ?, last_reviewed_at = ?
        WHERE id = ?
      `).run(patternName, formula, meaningVi, usageNotes || '', hskLevel || 1, masteryLevel || 'introduced', notes || '', now, id);
    } else {
      db.prepare(`
        INSERT INTO grammar_memory (pattern_name, formula, meaning_vi, usage_notes, hsk_level, mastery_level, notes, first_taught_at, last_reviewed_at, review_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(pattern_name) DO UPDATE SET
          formula = excluded.formula,
          meaning_vi = excluded.meaning_vi,
          mastery_level = excluded.mastery_level,
          last_reviewed_at = excluded.last_reviewed_at
      `).run(patternName, formula, meaningVi, usageNotes || '', hskLevel || 1, masteryLevel || 'introduced', notes || '', now, now);
    }
    res.json({ success: true, message: 'Đã lưu cấu trúc ngữ pháp vào bộ nhớ học tập!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Grammar Memory item
app.delete('/api/memory/grammar/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM grammar_memory WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa cấu trúc ngữ pháp khỏi bộ nhớ.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Learning Error (e.g. resolve error or update note)
app.post('/api/memory/errors', (req, res) => {
  try {
    const { id, status, title, userSentence, correctedSentence, explanationVi } = req.body;
    const now = Date.now();
    if (id) {
      db.prepare(`
        UPDATE learning_errors
        SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_at END,
            title = COALESCE(?, title),
            user_sentence = COALESCE(?, user_sentence),
            corrected_sentence = COALESCE(?, corrected_sentence),
            explanation_vi = COALESCE(?, explanation_vi)
        WHERE id = ?
      `).run(status, status, now, title, userSentence, correctedSentence, explanationVi, id);
    } else {
      db.prepare(`
        INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status)
        VALUES ('grammar', ?, ?, ?, ?, 1, ?, 'pending')
      `).run(title, userSentence, correctedSentence, explanationVi, now);
    }
    res.json({ success: true, message: 'Đã cập nhật trạng thái lỗi sai!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Learning Error
app.delete('/api/memory/errors/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM learning_errors WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa lỗi sai khỏi danh sách theo dõi.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI LESSON GENERATION & CONVERSATION ANALYSIS ====================

// Analyze Conversation Session & Update Long-term Memory
app.post('/api/ai/analyze-session', async (req, res) => {
  try {
    const { sessionId = 'session_default' } = req.body;
    const result = await geminiLessonService.analyzeSession(sessionId);
    res.json(result);
  } catch (err: any) {
    console.error('Analyze session error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Conversation Analyses History
app.get('/api/ai/analyses', (req, res) => {
  try {
    const analyses = db.prepare('SELECT * FROM conversation_analyses ORDER BY created_at DESC LIMIT 15').all() as any[];
    res.json({
      success: true,
      data: analyses.map(a => ({
        ...a,
        topics: a.topics_json ? JSON.parse(a.topics_json) : [],
        newVocabTaught: a.new_vocab_taught_json ? JSON.parse(a.new_vocab_taught_json) : [],
        grammarTaught: a.grammar_taught_json ? JSON.parse(a.grammar_taught_json) : [],
        correctExpressions: a.correct_expressions_json ? JSON.parse(a.correct_expressions_json) : [],
        mistakesDetected: a.mistakes_detected_json ? JSON.parse(a.mistakes_detected_json) : [],
        knowledgeGaps: a.knowledge_gaps_json ? JSON.parse(a.knowledge_gaps_json) : []
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate Personalized Lesson
app.post('/api/ai/generate-lesson', async (req, res) => {
  try {
    const { topic, lessonType, hskLevel, customRequest, sessionId } = req.body;
    const lesson = await geminiLessonService.generateLesson({
      topic,
      lessonType,
      hskLevel,
      customRequest,
      sessionId
    });
    res.json({ success: true, data: lesson });
  } catch (err: any) {
    console.error('Generate lesson error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Generated Lessons List
app.get('/api/ai/lessons', (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT * FROM generated_lessons WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND lesson_type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    const parsed = rows.map(r => ({
      id: r.id,
      title: r.title,
      lessonType: r.lesson_type,
      hskLevel: r.hsk_level,
      estimatedMinutes: r.estimated_minutes,
      recommendationReason: r.recommendation_reason,
      objectives: r.objectives_json ? JSON.parse(r.objectives_json) : [],
      knowledgePoints: r.knowledge_points_json ? JSON.parse(r.knowledge_points_json) : [],
      explanationVi: r.explanation_vi,
      content: r.content_json ? JSON.parse(r.content_json) : {},
      exercises: r.exercises_json ? JSON.parse(r.exercises_json) : [],
      quiz: r.quiz_json ? JSON.parse(r.quiz_json) : [],
      status: r.status,
      score: r.score,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Single Generated Lesson Detail
app.get('/api/ai/lessons/:id', (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM generated_lessons WHERE id = ?').get(req.params.id) as any;
    if (!r) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài học' });
    }

    res.json({
      success: true,
      data: {
        id: r.id,
        title: r.title,
        lessonType: r.lesson_type,
        hskLevel: r.hsk_level,
        estimatedMinutes: r.estimated_minutes,
        recommendationReason: r.recommendation_reason,
        objectives: r.objectives_json ? JSON.parse(r.objectives_json) : [],
        knowledgePoints: r.knowledge_points_json ? JSON.parse(r.knowledge_points_json) : [],
        explanationVi: r.explanation_vi,
        content: r.content_json ? JSON.parse(r.content_json) : {},
        exercises: r.exercises_json ? JSON.parse(r.exercises_json) : [],
        quiz: r.quiz_json ? JSON.parse(r.quiz_json) : [],
        status: r.status,
        score: r.score,
        createdAt: r.created_at,
        completedAt: r.completed_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complete Lesson (Submit exercises, auto-grade, sync memory mastery)
app.post('/api/ai/lessons/:id/complete', async (req, res) => {
  try {
    const { userAnswers = {}, timeSpentSeconds = 600 } = req.body;
    const result = await geminiLessonService.completeLesson(req.params.id, {
      userAnswers,
      timeSpentSeconds
    });
    res.json(result);
  } catch (err: any) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simplify Lesson Explanation
app.post('/api/ai/lessons/:id/simplify', async (req, res) => {
  try {
    const simplifiedText = await geminiLessonService.simplifyLesson(req.params.id);
    res.json({ success: true, simplifiedExplanation: simplifiedText });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Generated Lesson
app.delete('/api/ai/lessons/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM generated_lessons WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Đã xóa bài học thành công.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI PLACEMENT TEST (KIỂM TRA TRÌNH ĐỘ ĐẦU VÀO) ====================

// Bắt đầu bài kiểm tra mới
app.post('/api/placement/start', async (req, res) => {
  try {
    const { testType } = req.body;
    const test = await geminiPlacementService.createTest(testType || 'full');
    const progress = await geminiPlacementService.getTestProgress(test.testId);
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy bài kiểm tra dở dang gần nhất
app.get('/api/placement/active', async (req, res) => {
  try {
    const active = await geminiPlacementService.getActiveTest();
    res.json({ success: true, data: active });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy tiến trình bài kiểm tra cụ thể
app.get('/api/placement/:testId', async (req, res) => {
  try {
    const progress = await geminiPlacementService.getTestProgress(req.params.testId);
    if (!progress) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài kiểm tra' });
    }
    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Nộp câu trả lời cho 1 câu hỏi
app.post('/api/placement/answer', async (req, res) => {
  try {
    const { testId, questionId, userAnswer, durationIncrementSeconds } = req.body;
    const result = await geminiPlacementService.submitAnswer({
      testId,
      questionId,
      userAnswer,
      durationIncrementSeconds
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bỏ qua một kỹ năng
app.post('/api/placement/skip-section', async (req, res) => {
  try {
    const { testId, section } = req.body;
    const result = await geminiPlacementService.skipSection(testId, section);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hoàn thành bài kiểm tra & tính toán toàn diện
app.post('/api/placement/complete', async (req, res) => {
  try {
    const { testId } = req.body;
    const report = await geminiPlacementService.completeTest(testId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy kết quả bài kiểm tra
app.get('/api/placement/results/:testId', async (req, res) => {
  try {
    const report = await geminiPlacementService.getTestResult(req.params.testId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Chưa có kết quả cho bài kiểm tra này' });
    }
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy lịch sử các lần kiểm tra
app.get('/api/placement/history/all', async (req, res) => {
  try {
    const history = await geminiPlacementService.getTestHistory();
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đồng bộ kết quả vào Hồ sơ học tập và kích hoạt lộ trình học thích ứng
app.post('/api/placement/sync-profile', async (req, res) => {
  try {
    const { testId } = req.body;
    const syncResult = await geminiPlacementService.syncResultToLearnerProfile(testId);
    
    // Tự động khởi tạo hoặc cập nhật lại lộ trình thích ứng theo kết quả khảo sát
    try {
      await geminiPathService.generateAdaptivePath({
        forceNew: true,
        targetHsk: syncResult.targetHsk
      });
    } catch (e: any) {
      console.warn('Lỗi tự động sinh lộ trình thích ứng sau sync placement:', e.message);
    }

    res.json({ success: true, data: syncResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ADAPTIVE LEARNING PATH ROUTES ====================

// Lấy thông tin chi tiết lộ trình thích ứng hiện tại
app.get('/api/path/current', async (req, res) => {
  try {
    const pathDetail = await geminiPathService.getPathDetail();
    res.json({ success: true, data: pathDetail });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sinh mới hoặc tái tạo lộ trình học thích ứng theo mục tiêu
app.post('/api/path/generate', async (req, res) => {
  try {
    const result = await geminiPathService.generateAdaptivePath(req.body || {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI phân tích và tái cân bằng lộ trình (Dynamic Rebalance)
app.post('/api/path/rebalance', async (req, res) => {
  try {
    const result = await geminiPathService.rebalancePath(req.body || {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật mục tiêu cá nhân (thời hạn, số phút/ngày, số ngày/tuần, HSK đích)
app.post('/api/path/update-goals', async (req, res) => {
  try {
    const result = await geminiPathService.updateGoals(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Khóa hoặc mở khóa một giai đoạn học (Lock stage)
app.post('/api/path/lock-stage', async (req, res) => {
  try {
    const { stageId, isLocked } = req.body;
    if (!stageId) {
      return res.status(400).json({ success: false, error: 'Thiếu stageId' });
    }
    const result = await geminiPathService.lockStage(stageId, Boolean(isLocked));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dời lịch học sang ngày khác trong tuần
app.post('/api/path/reschedule-item', async (req, res) => {
  try {
    const { scheduleId, newDayOfWeek } = req.body;
    if (!scheduleId || newDayOfWeek === undefined) {
      return res.status(400).json({ success: false, error: 'Thiếu scheduleId hoặc newDayOfWeek' });
    }
    const result = await geminiPathService.rescheduleItem(scheduleId, Number(newDayOfWeek));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đánh dấu hoàn thành một mục trong lịch học tuần
app.post('/api/path/complete-schedule-item', async (req, res) => {
  try {
    const { scheduleId } = req.body;
    if (!scheduleId) {
      return res.status(400).json({ success: false, error: 'Thiếu scheduleId' });
    }
    const result = await geminiPathService.completeScheduleItem(scheduleId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bắt đầu học một bài trong lộ trình (Tự động gọi Gemini sinh bài nếu chưa có)
app.post('/api/path/item/:itemId/start', async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await geminiPathService.startPathItem(itemId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xem lịch sử các phiên bản lộ trình
app.get('/api/path/versions/:pathId', async (req, res) => {
  try {
    const versions = await geminiPathService.getVersions(req.params.pathId);
    res.json({ success: true, data: versions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Khôi phục một phiên bản lộ trình trước đó
app.post('/api/path/restore-version', async (req, res) => {
  try {
    const { versionId } = req.body;
    if (!versionId) {
      return res.status(400).json({ success: false, error: 'Thiếu versionId' });
    }
    const result = await geminiPathService.restoreVersion(versionId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SMART REVIEW & SPACED REPETITION (SRS) ====================

// Lấy số liệu thống kê Dashboard SRS
app.get('/api/srs/dashboard', (req, res) => {
  try {
    const stats = geminiSrsService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy danh sách hàng đợi ôn tập thông minh
app.get('/api/srs/queue', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const mode = (req.query.mode as any) || 'all';
    const hskLevel = req.query.hskLevel ? parseInt(req.query.hskLevel as string, 10) : undefined;
    const items = geminiSrsService.getReviewQueue({ limit, mode, hskLevel });
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đồng bộ kiến thức mới từ Long-Term Memory (từ vựng, ngữ pháp, lỗi sai) vào thẻ SRS
app.post('/api/srs/sync', (req, res) => {
  try {
    const result = geminiSrsService.syncCardsFromMemory();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Khởi tạo phiên ôn tập mới
app.post('/api/srs/session/start', (req, res) => {
  try {
    const { sessionType } = req.body;
    const result = geminiSrsService.startSession(sessionType);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kết thúc phiên ôn tập
app.post('/api/srs/session/finish', (req, res) => {
  try {
    const { sessionId, durationSeconds } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Thiếu sessionId' });
    }
    const session = geminiSrsService.finishSession(sessionId, durationSeconds || 0);
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ghi nhận đánh giá ôn tập SM-2 cho một thẻ
app.post('/api/srs/review', (req, res) => {
  try {
    const { itemId, userRating, reviewMode, sessionId, userAnswer, isCorrect, durationMs } = req.body;
    if (!itemId || !userRating || !reviewMode) {
      return res.status(400).json({ success: false, error: 'Thiếu tham số itemId, userRating hoặc reviewMode' });
    }
    const result = geminiSrsService.submitReview({
      itemId,
      userRating,
      reviewMode,
      sessionId,
      userAnswer,
      isCorrect,
      durationMs
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sinh câu đố / bài tập ngữ cảnh mới bằng Gemini AI
app.post('/api/srs/ai-exercise', async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'Thiếu itemId' });
    }
    const exercise = await geminiSrsService.generateAIExercise(itemId);
    res.json({ success: true, data: exercise });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI CONVERSATION ANALYSIS & PROGRESS EVALUATION ====================

// Phân tích cuộc hội thoại chuyên sâu (Text hoặc Voice)
app.post('/api/analysis/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { force, sessionType } = req.body || {};
    const report = await geminiAnalysisService.analyzeSession(sessionId, {
      forceReanalyze: Boolean(force),
      sessionType
    });
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('Analysis session endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy bản báo cáo phân tích theo sessionId
app.get('/api/analysis/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const report = geminiAnalysisService.getAnalysisBySession(sessionId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Chưa có bản phân tích cho phiên này.' });
    }
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy danh sách các phiên phân tích gần nhất
app.get('/api/analysis/recent', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const items = geminiAnalysisService.getRecentAnalyses(limit);
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lưu tin nhắn vào SQLite (hỗ trợ cả client Web Speech hoặc Voice)
app.post('/api/analysis/save-message', (req, res) => {
  try {
    const { sessionId, sender, text, pinyin, translationVi, isAudio, correctionJson } = req.body;
    if (!sessionId || !sender || !text) {
      return res.status(400).json({ success: false, error: 'Thiếu sessionId, sender hoặc text' });
    }
    const result = geminiAnalysisService.saveMessage({
      sessionId,
      sender,
      text,
      pinyin,
      translationVi,
      isAudio: Boolean(isAudio),
      correctionJson: typeof correctionJson === 'object' ? JSON.stringify(correctionJson) : correctionJson
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CHINESE PRONUNCIATION LAB ====================
// Đánh giá phát âm trung thực (3 lớp: Âm học, ASR, Sư phạm AI)
app.post('/api/pronunciation/evaluate', async (req, res) => {
  try {
    const result = await geminiPronunciationService.evaluate(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Pronunciation evaluate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Thống kê tiến bộ phát âm
app.get('/api/pronunciation/stats', (req, res) => {
  try {
    const stats = geminiPronunciationService.getStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lịch sử luyện phát âm
app.get('/api/pronunciation/history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const history = geminiPronunciationService.getHistory(limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa bản ghi lịch sử phát âm
app.delete('/api/pronunciation/history/:id', (req, res) => {
  try {
    const success = geminiPronunciationService.deleteRecord(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI sinh bài luyện phát âm cá nhân hóa từ điểm yếu lưu trong SQLite
app.post('/api/pronunciation/generate-drills', async (req, res) => {
  try {
    const drills = await geminiPronunciationService.generatePersonalizedDrills();
    res.json({ success: true, data: drills });
  } catch (err: any) {
    console.error('Pronunciation generate-drills error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CHINESE SHADOWING PRACTICE ====================
// Lấy danh sách bài luyện Shadowing (hỗ trợ lọc theo cấp độ 1-7, HSK, chủ đề)
app.get('/api/shadowing/lessons', (req, res) => {
  try {
    const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;
    const hskLevel = req.query.hskLevel ? parseInt(req.query.hskLevel as string, 10) : undefined;
    const topic = req.query.topic as string | undefined;

    const lessons = geminiShadowingService.getLessons({ level, hskLevel, topic });
    res.json({ success: true, data: lessons });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy chi tiết bài luyện Shadowing
app.get('/api/shadowing/lessons/:id', (req, res) => {
  try {
    const lesson = geminiShadowingService.getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài luyện Shadowing.' });
    }
    res.json({ success: true, data: lesson });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đánh giá trung thực 3 lớp buổi luyện Shadowing
app.post('/api/shadowing/evaluate', async (req, res) => {
  try {
    const result = await geminiShadowingService.evaluate(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Shadowing evaluate endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI sinh bài luyện Shadowing cá nhân hóa từ điểm yếu lưu trong SQLite
app.post('/api/shadowing/generate', async (req, res) => {
  try {
    const { profileId = 'default' } = req.body;
    const result = await geminiShadowingService.generatePersonalizedLesson(profileId);
    res.json(result);
  } catch (err: any) {
    console.error('Shadowing generate endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đồng bộ cụm/câu Shadowing vào hàng đợi Spaced Repetition (SRS SM-2)
app.post('/api/shadowing/sync-srs', (req, res) => {
  try {
    const result = geminiShadowingService.syncToSrs(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Thống kê tiến độ Shadowing
app.get('/api/shadowing/stats', (req, res) => {
  try {
    const stats = geminiShadowingService.getStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lịch sử luyện Shadowing
app.get('/api/shadowing/history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const history = geminiShadowingService.getHistory(limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI CHINESE DICTIONARY API ====================

// Tra cứu từ điển đa năng (chữ Hán, Pinyin, tiếng Việt)
app.get('/api/dictionary/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const type = req.query.type as any;
    const hskLevel = req.query.hsk ? parseInt(req.query.hsk as string, 10) : undefined;
    const wordType = req.query.wordType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

    const data = await geminiDictionaryService.search({
      query,
      type,
      hskLevel,
      wordType,
      limit
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy chi tiết từ theo ID
app.get('/api/dictionary/entry/:id', (req, res) => {
  try {
    const entry = geminiDictionaryService.getEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mục từ trong từ điển.' });
    }
    res.json({ success: true, data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy chi tiết từ theo chữ Hán
app.get('/api/dictionary/entry-word/:word', (req, res) => {
  try {
    const entry = geminiDictionaryService.getEntryByWord(decodeURIComponent(req.params.word));
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mục từ trong từ điển.' });
    }
    res.json({ success: true, data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tra từ trong ngữ cảnh cụ thể (In-context Lookup)
app.post('/api/dictionary/in-context', async (req, res) => {
  try {
    const { sentence, targetWord } = req.body;
    const data = await geminiDictionaryService.lookupInContext({ sentence, targetWord });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phân biệt các từ gần nghĩa (Confusing Words Comparison)
app.post('/api/dictionary/compare', async (req, res) => {
  try {
    const { words } = req.body;
    const data = await geminiDictionaryService.compareWords(words);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hỏi AI về từ này (AI Vocabulary Consultation)
app.post('/api/dictionary/ask-ai', async (req, res) => {
  try {
    const { word, promptType, userLevel } = req.body;
    const data = await geminiDictionaryService.askAIAboutWord({ word, promptType, userLevel });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lưu ghi chú cá nhân
app.post('/api/dictionary/save-note', (req, res) => {
  try {
    const { entryId, note, tags } = req.body;
    const result = geminiDictionaryService.savePersonalNote({ entryId, note, tags });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Yêu thích / Bỏ yêu thích
app.post('/api/dictionary/favorite', (req, res) => {
  try {
    const { entryId } = req.body;
    const result = geminiDictionaryService.toggleFavorite(entryId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đồng bộ vào Bộ nhớ học tập (vocabulary_memory)
app.post('/api/dictionary/sync-memory', (req, res) => {
  try {
    const { entryId } = req.body;
    const result = geminiDictionaryService.syncToLearnerMemory(entryId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Đồng bộ vào Hàng đợi Ôn tập SRS (SM-2)
app.post('/api/dictionary/sync-srs', (req, res) => {
  try {
    const { entryId } = req.body;
    const result = geminiDictionaryService.syncToSrs(entryId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lịch sử tra cứu
app.get('/api/dictionary/history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const history = geminiDictionaryService.getHistory(limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Danh sách từ đã lưu / yêu thích
app.get('/api/dictionary/favorites', (req, res) => {
  try {
    const favorites = geminiDictionaryService.getFavorites();
    res.json({ success: true, data: favorites });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phân đoạn câu tiếng Trung thành các từ token
app.post('/api/dictionary/segment', (req, res) => {
  try {
    const { text } = req.body;
    const tokens = tokenizeChinese(text || '');
    res.json({ success: true, data: tokens });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================================
// INTERACTIVE CHINESE READING SYSTEM (v1.11.0)
// ========================================================================

// 1. Danh sách bài đọc có phân trang & bộ lọc
app.get('/api/reading/passages', (req, res) => {
  try {
    const { level, hskLevel, topic, genre, search, status, page, limit } = req.query;
    const result = geminiReadingService.getPassages({
      level: level ? String(level) : undefined,
      hskLevel: hskLevel ? parseInt(hskLevel as string, 10) : undefined,
      topic: topic ? String(topic) : undefined,
      genre: genre ? String(genre) : undefined,
      search: search ? String(search) : undefined,
      status: status as any,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Chi tiết bài đọc kèm câu văn và câu hỏi đọc hiểu
app.get('/api/reading/passages/:id', (req, res) => {
  try {
    const passage = geminiReadingService.getPassageById(req.params.id);
    res.json({ success: true, data: passage });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// 3. AI Tự Động Tạo Bài Đọc Cá Nhân Hóa
app.post('/api/reading/generate', async (req, res) => {
  try {
    const options = req.body || {};
    const passage = await geminiReadingService.generatePersonalizedPassage(options);
    res.json({ success: true, data: passage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Phân tích ngữ pháp chuyên sâu cho một câu trong ngữ cảnh
app.post('/api/reading/explain-sentence', async (req, res) => {
  try {
    const { passageId, sentenceZh, sentencePinyin, sentenceVi, contextPassage } = req.body;
    const explanation = await geminiReadingService.explainSentenceOrGrammar({
      passageId,
      sentenceZh,
      sentencePinyin,
      sentenceVi,
      contextPassage,
    });
    res.json({ success: true, data: explanation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Hỏi AI Tutor về bài đọc
app.post('/api/reading/ask-tutor', async (req, res) => {
  try {
    const { passageId, sentenceZh, userQuery, chatHistory } = req.body;
    const result = await geminiReadingService.askReadingTutor({
      passageId,
      sentenceZh,
      userQuery,
      chatHistory,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Đánh giá câu trả lời đọc hiểu (Trắc nghiệm & Tự luận bằng AI)
app.post('/api/reading/evaluate-answer', async (req, res) => {
  try {
    const { passageId, questionId, questionText, questionType, expectedAnswer, citationText, userAnswer } = req.body;
    const result = await geminiReadingService.evaluateComprehensionAnswer({
      passageId,
      questionId,
      questionText,
      questionType,
      expectedAnswer,
      citationText,
      userAnswer,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Ghi nhận phiên đọc hoàn thành (Reading Session & Analytics)
app.post('/api/reading/session', async (req, res) => {
  try {
    const result = await geminiReadingService.submitReadingSession(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Đánh dấu yêu thích / ghi chú bài đọc
app.post('/api/reading/bookmark', (req, res) => {
  try {
    const { passageId, isFavorite, notes } = req.body;
    const result = geminiReadingService.toggleBookmark(passageId, isFavorite, notes);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Cầu nối chuyển câu sang bài tập Shadowing (1-Click Bridge to Shadowing)
app.post('/api/reading/sync-shadowing', (req, res) => {
  try {
    const { passageId, sentenceIndex } = req.body;
    const result = geminiReadingService.syncSentenceToShadowing(passageId, Number(sentenceIndex));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Lưu từ vựng từ bài đọc vào Bộ nhớ học tập & SRS (SM-2)
app.post('/api/reading/sync-word', (req, res) => {
  try {
    const { wordZh, wordPinyin, meaningVi, hskLevel } = req.body;
    const result = geminiReadingService.syncWordToMemoryAndSrs(wordZh, wordPinyin, meaningVi, hskLevel);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Thống kê luyện đọc
app.get('/api/reading/stats', (_req, res) => {
  try {
    const stats = geminiReadingService.getReadingStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================================
// KNOWLEDGE REGISTRY APIS (HỆ THỐNG ĐỊNH DANH KIẾN THỨC THỐNG NHẤT)
// ========================================================================

// 1. Tìm kiếm kiến thức đa tiêu chí (Hán tự, Pinyin, Pinyin sạch, nghĩa tiếng Việt, HSK, loại...)
app.get('/api/knowledge/search', (req, res) => {
  try {
    const { query, itemType, hskLevel, status, category, tag, limit, offset } = req.query;
    const items = knowledgeRegistryService.findKnowledge({
      query: query ? String(query) : undefined,
      itemType: itemType ? (String(itemType) as any) : undefined,
      hskLevel: hskLevel !== undefined ? Number(hskLevel) : undefined,
      status: status ? (String(status) as any) : undefined,
      category: category ? String(category) : undefined,
      tag: tag ? String(tag) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Thống kê kiểm toán Knowledge Registry (Audit Stats & Orphan Check)
app.get('/api/knowledge/audit', (_req, res) => {
  try {
    const stats = knowledgeRegistryService.getRegistryStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Rà soát danh sách nghi ngờ trùng lặp (Dedup Candidates)
app.get('/api/knowledge/dedup/candidates', (_req, res) => {
  try {
    const candidates = knowledgeRegistryService.detectDuplicates();
    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Lấy chi tiết Knowledge Item theo ID (kèm senses, relations, aliases)
app.get('/api/knowledge/:id', (req, res) => {
  try {
    const item = knowledgeRegistryService.getKnowledgeById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: `Không tìm thấy Knowledge item với ID [${req.params.id}]` });
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Tạo mới Knowledge Item
app.post('/api/knowledge', (req, res) => {
  try {
    const created = knowledgeRegistryService.createKnowledge(req.body);
    res.json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Cập nhật Knowledge Item (ID giữ nguyên)
app.put('/api/knowledge/:id', (req, res) => {
  try {
    const updated = knowledgeRegistryService.updateKnowledge(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Tìm hoặc tạo mới (Find or Create với Dedup Guard)
app.post('/api/knowledge/find-or-create', (req, res) => {
  try {
    const result = knowledgeRegistryService.findOrCreateKnowledge(req.body);
    res.json({ success: true, data: result.item, created: result.created, candidateDuplicate: result.candidateDuplicate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Lấy quan hệ tri thức của Item
app.get('/api/knowledge/:id/related', (req, res) => {
  try {
    const { type } = req.query;
    const relations = knowledgeRegistryService.getRelatedKnowledge(req.params.id, type ? (String(type) as any) : undefined);
    res.json({ success: true, data: relations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Thêm quan hệ tri thức giữa 2 Item
app.post('/api/knowledge/:id/relations', (req, res) => {
  try {
    const { targetId, relationType, notes, metadata, bidirectional } = req.body;
    const relation = knowledgeRegistryService.addRelation(
      req.params.id,
      targetId,
      relationType,
      notes,
      metadata,
      bidirectional
    );
    res.json({ success: true, data: relation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Xóa quan hệ tri thức
app.delete('/api/knowledge/relations/:relationId', (req, res) => {
  try {
    const ok = knowledgeRegistryService.removeRelation(req.params.relationId);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Lấy danh sách Senses của Item
app.get('/api/knowledge/:id/senses', (req, res) => {
  try {
    const senses = knowledgeRegistryService.getSenses(req.params.id);
    res.json({ success: true, data: senses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Thêm Sense mới cho Item
app.post('/api/knowledge/:id/senses', (req, res) => {
  try {
    const sense = knowledgeRegistryService.addSense(req.params.id, req.body);
    res.json({ success: true, data: sense });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Hợp nhất hai mục kiến thức trùng lặp (Merge)
app.post('/api/knowledge/merge', (req, res) => {
  try {
    const { sourceId, targetId, reason } = req.body;
    const result = knowledgeRegistryService.mergeKnowledge(sourceId, targetId, reason);
    res.json({ success: true, data: result.targetItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Lưu trữ mềm Knowledge Item (Archive)
app.post('/api/knowledge/:id/archive', (req, res) => {
  try {
    const ok = knowledgeRegistryService.archiveKnowledge(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================================
// LEARNING EVIDENCE SYSTEM APIS (HỆ THỐNG GHI NHẬN BẰNG CHỨNG HỌC TẬP)
// ========================================================================

// 1. Ghi nhận một Bằng chứng học tập mới (Append-Only)
app.post('/api/evidence', (req, res) => {
  try {
    const result = learningEvidenceService.recordEvidence(req.body);
    res.json({ success: true, data: result.evidence, isDuplicate: result.isDuplicate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Thống kê toàn cảnh hệ thống bằng chứng học tập (Audit Stats)
app.get('/api/evidence/stats', (_req, res) => {
  try {
    const stats = learningEvidenceService.getEvidenceStatistics();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Lấy danh sách bằng chứng gần đây
app.get('/api/evidence/recent', (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const filterType = req.query.type ? (String(req.query.type) as any) : undefined;
    const evidences = learningEvidenceService.getRecentEvidence(limit, filterType);
    res.json({ success: true, count: evidences.length, data: evidences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Lấy lịch sử bằng chứng theo Knowledge ID
app.get('/api/evidence/knowledge/:knowledgeId', (req, res) => {
  try {
    const { limit, offset, type, includeInvalidated } = req.query;
    const evidences = learningEvidenceService.getEvidenceByKnowledge(req.params.knowledgeId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      type: type ? (String(type) as any) : undefined,
      includeInvalidated: includeInvalidated === 'true'
    });
    res.json({ success: true, count: evidences.length, data: evidences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Trích xuất Timeline tiến trình học tập của một kiến thức
app.get('/api/evidence/timeline/:knowledgeId', (req, res) => {
  try {
    const timeline = learningEvidenceService.getEvidenceTimeline(req.params.knowledgeId);
    res.json({ success: true, count: timeline.length, data: timeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Lấy bằng chứng theo Phiên học (Session ID)
app.get('/api/evidence/session/:sessionId', (req, res) => {
  try {
    const evidences = learningEvidenceService.getEvidenceBySession(req.params.sessionId);
    res.json({ success: true, count: evidences.length, data: evidences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Lấy bằng chứng theo Module Nguồn
app.get('/api/evidence/source/:sourceModule', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const evidences = learningEvidenceService.getEvidenceBySource(req.params.sourceModule as any, { limit });
    res.json({ success: true, count: evidences.length, data: evidences });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Vô hiệu hóa một bằng chứng (Invalidate Evidence - Không xóa dòng)
app.post('/api/evidence/:id/invalidate', (req, res) => {
  try {
    const { reason, correctedBy } = req.body;
    const ok = learningEvidenceService.invalidateEvidence(req.params.id, reason, correctedBy);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Liên kết quan hệ chuỗi bằng chứng (Error -> Correction, Retry...)
app.post('/api/evidence/link', (req, res) => {
  try {
    const { sourceId, targetId, relationType } = req.body;
    const ok = learningEvidenceService.linkRelatedEvidences(sourceId, targetId, relationType);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MASTERY ENGINE API ENDPOINTS ====================
// 1. Lấy Snapshot thành thạo của một kiến thức (Tính mới nếu chưa có)
app.get('/api/mastery/:knowledgeId', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const snapshot = masteryEngineService.getMastery(req.params.knowledgeId, learnerId);
    res.json({ success: true, data: snapshot });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Lấy Snapshot hàng loạt theo danh sách knowledge_id
app.post('/api/mastery/batch', (req, res) => {
  try {
    const { knowledgeIds, learnerId } = req.body;
    if (!Array.isArray(knowledgeIds)) {
      return res.status(400).json({ success: false, error: 'knowledgeIds phải là mảng chuỗi' });
    }
    const data = masteryEngineService.getMasteryByKnowledge(knowledgeIds, learnerId || 'default');
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Tính toán on-the-fly mức độ thành thạo (Dry run)
app.post('/api/mastery/calculate/:knowledgeId', (req, res) => {
  try {
    const learnerId = req.body.learnerId || 'default';
    const snapshot = masteryEngineService.calculateMastery(req.params.knowledgeId, learnerId);
    res.json({ success: true, data: snapshot });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Lấy danh sách kiến thức yếu cần củng cố
app.get('/api/mastery/weak', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const learnerId = (req.query.learnerId as string) || 'default';
    const items = masteryEngineService.getWeakKnowledge({ learnerId, limit });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Lấy danh sách kiến thức chưa chắc chắn (cần thêm bài kiểm tra/thực hành)
app.get('/api/mastery/uncertain', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const learnerId = (req.query.learnerId as string) || 'default';
    const items = masteryEngineService.getUncertainKnowledge({ learnerId, limit });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Lấy lịch sử chuyển đổi trạng thái thành thạo của một kiến thức
app.get('/api/mastery/history/:knowledgeId', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const history = masteryEngineService.getMasteryHistory(req.params.knowledgeId, learnerId);
    res.json({ success: true, count: history.length, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Tái tính toán lại toàn bộ snapshot từ bảng gốc learning_evidences (Rebuild)
app.post('/api/mastery/rebuild', (req, res) => {
  try {
    const { knowledgeId, learnerId } = req.body;
    const result = masteryEngineService.rebuildMastery(knowledgeId, learnerId || 'default');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Lấy cấu hình các quy tắc và trọng số đánh giá minh bạch
app.get('/api/mastery/rules', (_req, res) => {
  try {
    const rules = masteryEngineService.getRuleConfig();
    res.json({ success: true, data: rules });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UNIFIED LEARNING MEMORY API ENDPOINTS ====================
// 1. Cổng ghi nhận hoạt động học tập duy nhất của toàn hệ thống
app.post('/api/learning-memory/activity', (req, res) => {
  try {
    const result = unifiedLearningMemoryService.recordLearningActivity(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Truy xuất toàn diện ngữ cảnh kiến thức (Tri thức + Mastery + Nghĩa + Lỗi + SRS)
app.get('/api/learning-memory/context/:knowledgeId', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const context = unifiedLearningMemoryService.getKnowledgeContext(req.params.knowledgeId, { learnerId });
    if (!context) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ngữ cảnh tri thức' });
    }
    res.json({ success: true, data: context });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Truy xuất Hồ sơ học tập tổng hợp (Radar 6 chiều, Phân bổ trạng thái, Điểm mạnh/yếu)
app.get('/api/learning-memory/profile', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const profile = unifiedLearningMemoryService.getLearnerProfile(learnerId);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Lấy danh sách kiến thức cần ôn tập gấp (Needs review + Suy giảm retention)
app.get('/api/learning-memory/review', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const items = unifiedLearningMemoryService.getKnowledgeForReview({ learnerId, limit });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Lấy danh sách điểm yếu / mâu thuẫn nhận thức
app.get('/api/learning-memory/weaknesses', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const items = unifiedLearningMemoryService.getLearningWeaknesses({ learnerId, limit });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Lấy danh sách kiến thức mới tiếp cận gần đây
app.get('/api/learning-memory/recent', (req, res) => {
  try {
    const learnerId = (req.query.learnerId as string) || 'default';
    const limit = req.query.limit ? Number(req.query.limit) : 15;
    const items = unifiedLearningMemoryService.getRecentlyLearned({ learnerId, limit });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Briefing sư phạm chọn lọc cho AI Tutor và Voice Chat
app.post('/api/learning-memory/ai-tutor-briefing', (req, res) => {
  try {
    const { queryText, hskLevel, limit } = req.body;
    const briefing = unifiedLearningMemoryService.getRelevantKnowledgeForAITutor(queryText || '', {
      hskLevel,
      limit
    });
    res.json({ success: true, data: briefing });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Kiểm tra sức khỏe dữ liệu và toàn vẹn SQLite WAL
app.get('/api/learning-memory/audit', (_req, res) => {
  try {
    const report = unifiedLearningMemoryService.auditDataHealth();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Khôi phục và tái tạo toàn bộ bộ nhớ học tập từ nguồn gốc
app.post('/api/learning-memory/rebuild', (req, res) => {
  try {
    const learnerId = req.body.learnerId || 'default';
    const result = unifiedLearningMemoryService.rebuildUnifiedMemory({ learnerId });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Tối ưu toàn diện hệ thống và cơ sở dữ liệu SQLite
app.post('/api/learning-memory/optimize', (_req, res) => {
  try {
    const result = unifiedLearningMemoryService.optimizeSystem();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== LIVE API WEBSOCKET BRIDGE ====================
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId') || `voice_${Date.now()}`;
  const hskLevel = parseInt(url.searchParams.get('hskLevel') || '1', 10);
  const mode = url.searchParams.get('mode') || 'free';
  const scenario = url.searchParams.get('scenario') || '';
  const voiceName = url.searchParams.get('voice') || '';

  geminiLiveService.handleClientBridge(ws, {
    sessionId,
    hskLevel,
    mode,
    scenario,
    voiceName
  });
});

// Start Server on 0.0.0.0
server.listen(PORT, HOST, () => {
  const ips = getLocalIpAddresses();
  console.log(`=======================================================`);
  console.log(`🚀 HALO CHINESE LOCAL BACKEND ĐANG CHẠY`);
  console.log(`📡 Máy tính (Localhost): http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 KẾT NỐI TỪ ĐIỆN THOẠI ANDROID (cùng mạng Wi-Fi):`);
    ips.forEach(ip => {
      console.log(`   👉 Địa chỉ máy chủ: http://${ip}:${PORT}`);
    });
  }
  console.log(`🎙️  Live WebSocket: ws://<IP>:${PORT}/api/live`);
  console.log(`📁 SQLite Database: ${path.resolve(process.cwd(), 'data/halo_chinese.db')}`);
  console.log(`=======================================================`);
});
