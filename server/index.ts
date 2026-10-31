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
      supportedModels: ['gemini-3.8-live', 'gemini-3.8-live-extended-thinking'],
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
app.get('/api/settings/test-voice-sample', (req, res) => {
  res.json({
    sampleText: '你好！欢迎使用中文学习应用，发音测试正常。',
    pinyin: 'Nǐ hǎo! Huānyíng shǐyòng zhōngwén xuéxí yìngyòng, fāyīn cèshì zhèngcháng.',
    vi: 'Xin chào! Chào mừng bạn đến với ứng dụng học tiếng Trung, phát âm thử nghiệm bình thường.',
    voice: geminiLiveService.getVoice()
  });
});

// ==================== AI TUTOR TEXT CHAT ====================
app.post('/api/tutor/chat', async (req, res) => {
  const { message, history = [], mode = 'free', hskLevel = 1, scenario, sessionId = 'default' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
  }

  try {
    const aiResponse = await geminiTextService.chat(message, history, mode, hskLevel, scenario);

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

// ==================== LIVE API WEBSOCKET BRIDGE ====================
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const hskLevel = parseInt(url.searchParams.get('hskLevel') || '1', 10);
  const mode = url.searchParams.get('mode') || 'free';
  const scenario = url.searchParams.get('scenario') || '';
  const voiceName = url.searchParams.get('voice') || '';

  geminiLiveService.handleClientBridge(ws, {
    hskLevel,
    mode,
    scenario,
    voiceName
  });
});

// Start Server on 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
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
