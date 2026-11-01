import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import { learningEvidenceService } from './learningEvidenceService.js';
import {
  SEED_READING_PASSAGES,
  ReadingPassageItem,
  ReadingSentenceItem,
  ReadingComprehensionQuestion,
} from '../src/data/seedReading.js';

export interface GenerateReadingOptions {
  level?: string; // 'beginner' | 'hsk1' | 'hsk2' | 'hsk3' | 'hsk4' | 'hsk5' | 'hsk6' | 'advanced'
  hskLevel?: number;
  topic?: string;
  genre?: string;
  targetLength?: 'short' | 'medium' | 'long'; // short ~80 words, medium ~150 words, long ~250 words
  userInterests?: string[];
}

export interface ReadingFilterParams {
  level?: string;
  hskLevel?: number;
  topic?: string;
  genre?: string;
  search?: string;
  status?: 'all' | 'favorites' | 'completed' | 'in_progress';
  page?: number;
  limit?: number;
}

export interface ReadingSessionInput {
  passageId: string;
  mode: 'intensive' | 'extensive' | 'blind_listening';
  timeSpentSeconds: number;
  answers: Array<{
    questionId: string;
    questionType: string;
    userAnswer: string;
    isCorrect?: boolean;
  }>;
  lookedUpWords?: string[];
  savedWords?: string[];
  grammarInspected?: string[];
  aiTutorQueries?: string[];
}

export class GeminiReadingService {
  constructor() {
    this.ensureSeedPassages();
  }

  /**
   * Khởi tạo các bài đọc mẫu chuẩn HSK vào SQLite nếu bảng còn rỗng
   */
  public ensureSeedPassages(): void {
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM reading_passages').get() as any;
      if (countRow?.count === 0) {
        const now = Date.now();
        const insertPassageStmt = db.prepare(`
          INSERT OR IGNORE INTO reading_passages (
            id, title_zh, title_pinyin, title_vi, level, hsk_level, standard_version,
            topic, genre, difficulty_rating, word_count, estimated_reading_minutes,
            full_content_zh, full_content_pinyin, full_content_vi, paragraphs_json,
            vocabulary_focus_json, grammar_focus_json, comprehension_questions_json,
            learning_objectives_json, source, content_version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertSentenceStmt = db.prepare(`
          INSERT OR IGNORE INTO reading_passage_sentences (
            id, passage_id, sentence_index, paragraph_index, sentence_zh,
            sentence_pinyin, sentence_vi, grammar_notes_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const p of SEED_READING_PASSAGES) {
          insertPassageStmt.run(
            p.id,
            p.titleZh,
            p.titlePinyin,
            p.titleVi,
            p.level,
            p.hskLevel,
            p.standardVersion,
            p.topic,
            p.genre,
            p.difficultyRating,
            p.wordCount,
            p.estimatedReadingMinutes,
            p.fullContentZh,
            p.fullContentPinyin,
            p.fullContentVi,
            JSON.stringify(p.paragraphs),
            JSON.stringify(p.vocabularyFocus),
            JSON.stringify(p.grammarFocus),
            JSON.stringify(p.comprehensionQuestions),
            JSON.stringify(p.learningObjectives),
            p.source || 'curated_standard',
            p.contentVersion || 1,
            now,
            now
          );

          if (p.sentences && p.sentences.length > 0) {
            for (const s of p.sentences) {
              insertSentenceStmt.run(
                s.id || `${p.id}_s${s.sentenceIndex}`,
                p.id,
                s.sentenceIndex,
                s.paragraphIndex || 0,
                s.sentenceZh,
                s.sentencePinyin,
                s.sentenceVi,
                s.grammarNotes ? JSON.stringify(s.grammarNotes) : null
              );
            }
          }
        }
        console.log(`[GeminiReadingService] Đã khởi tạo ${SEED_READING_PASSAGES.length} bài đọc mẫu vào SQLite.`);
      }
    } catch (err) {
      console.error('[GeminiReadingService] Lỗi khi khởi tạo seed reading passages:', err);
    }
  }

  private getClient() {
    const key = geminiTextService.getApiKey();
    if (!key) {
      throw new Error('Chưa cấu hình Gemini API Key.');
    }
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Lấy danh sách bài đọc có phân trang và bộ lọc
   */
  public getPassages(params: ReadingFilterParams = {}) {
    const {
      level,
      hskLevel,
      topic,
      genre,
      search,
      status = 'all',
      page = 1,
      limit = 20,
    } = params;

    let sql = `
      SELECT p.*,
             COALESCE(b.is_favorite, 0) as is_favorite,
             COALESCE(b.progress_percent, 0) as progress_percent,
             COALESCE(b.status, 'not_started') as reading_status,
             b.last_read_sentence_index
      FROM reading_passages p
      LEFT JOIN reading_bookmarks b ON b.passage_id = p.id AND b.user_id = 'default'
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (level && level !== 'all') {
      sql += ` AND p.level = ?`;
      queryParams.push(level);
    }

    if (hskLevel) {
      sql += ` AND p.hsk_level = ?`;
      queryParams.push(hskLevel);
    }

    if (topic && topic !== 'all') {
      sql += ` AND p.topic = ?`;
      queryParams.push(topic);
    }

    if (genre && genre !== 'all') {
      sql += ` AND p.genre = ?`;
      queryParams.push(genre);
    }

    if (search && search.trim()) {
      sql += ` AND (p.title_zh LIKE ? OR p.title_vi LIKE ? OR p.title_pinyin LIKE ? OR p.full_content_zh LIKE ?)`;
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term, term);
    }

    if (status === 'favorites') {
      sql += ` AND b.is_favorite = 1`;
    } else if (status === 'completed') {
      sql += ` AND b.status = 'completed'`;
    } else if (status === 'in_progress') {
      sql += ` AND b.status = 'in_progress'`;
    }

    // Đếm tổng số bài đọc
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countRow = db.prepare(countSql).get(...queryParams) as any;
    const total = countRow?.total || 0;

    sql += ` ORDER BY p.hsk_level ASC, p.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, (page - 1) * limit);

    const rows = db.prepare(sql).all(...queryParams) as any[];

    const passages = rows.map((r) => this.formatPassageSummary(r));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      passages,
    };
  }

  /**
   * Lấy chi tiết một bài đọc kèm câu văn và câu hỏi đọc hiểu
   */
  public getPassageById(id: string) {
    const row = db
      .prepare(
        `
      SELECT p.*,
             COALESCE(b.is_favorite, 0) as is_favorite,
             COALESCE(b.progress_percent, 0) as progress_percent,
             COALESCE(b.status, 'not_started') as reading_status,
             COALESCE(b.last_read_sentence_index, 0) as last_read_sentence_index,
             b.personal_notes
      FROM reading_passages p
      LEFT JOIN reading_bookmarks b ON b.passage_id = p.id AND b.user_id = 'default'
      WHERE p.id = ?
    `
      )
      .get(id) as any;

    if (!row) {
      throw new Error(`Không tìm thấy bài đọc với ID: ${id}`);
    }

    // Lấy danh sách câu văn đã phân đoạn
    const sentenceRows = db
      .prepare(
        `
      SELECT * FROM reading_passage_sentences
      WHERE passage_id = ?
      ORDER BY sentence_index ASC
    `
      )
      .all(id) as any[];

    const sentences: ReadingSentenceItem[] = sentenceRows.map((s) => ({
      id: s.id,
      sentenceIndex: s.sentence_index,
      paragraphIndex: s.paragraph_index,
      sentenceZh: s.sentence_zh,
      sentencePinyin: s.sentence_pinyin,
      sentenceVi: s.sentence_vi,
      grammarNotes: s.grammar_notes_json ? JSON.parse(s.grammar_notes_json) : [],
    }));

    // Cập nhật lượt đọc
    db.prepare('UPDATE reading_passages SET read_count = read_count + 1, last_read_at = ? WHERE id = ?').run(
      Date.now(),
      id
    );

    return {
      ...this.formatPassageSummary(row),
      fullContentZh: row.full_content_zh,
      fullContentPinyin: row.full_content_pinyin,
      fullContentVi: row.full_content_vi,
      paragraphs: row.paragraphs_json ? JSON.parse(row.paragraphs_json) : [],
      vocabularyFocus: row.vocabulary_focus_json ? JSON.parse(row.vocabulary_focus_json) : [],
      grammarFocus: row.grammar_focus_json ? JSON.parse(row.grammar_focus_json) : [],
      comprehensionQuestions: row.comprehension_questions_json
        ? JSON.parse(row.comprehension_questions_json)
        : [],
      learningObjectives: row.learning_objectives_json ? JSON.parse(row.learning_objectives_json) : [],
      sentences,
      personalNotes: row.personal_notes || '',
    };
  }

  /**
   * AI Tự Động Tạo Bài Đọc Cá Nhân Hóa (Personalized AI Reading Passage Generator)
   */
  public async generatePersonalizedPassage(options: GenerateReadingOptions = {}): Promise<any> {
    const profile = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any;
    const hskLevel = options.hskLevel || profile?.current_hsk || 2;
    const levelStr = options.level || `hsk${hskLevel}`;
    const topic = options.topic || 'daily_life';
    const genre = options.genre || 'short_passage';

    // Thu thập từ vựng đã học và từ vựng cần ôn tập từ bộ nhớ dài hạn
    const knownVocab = db
      .prepare('SELECT simplified, meaning_vi FROM vocabulary_memory WHERE mastery_level IN (?, ?) LIMIT 25')
      .all('mastered', 'introduced') as any[];
    const strugglingVocab = db
      .prepare('SELECT simplified, meaning_vi FROM vocabulary_memory WHERE mastery_level = ? LIMIT 10')
      .all('needs_review') as any[];

    // Thu thập ngữ pháp đang học
    const strugglingGrammar = db
      .prepare('SELECT pattern_name, formula FROM grammar_memory WHERE mastery_level != ? LIMIT 5')
      .all('mastered') as any[];

    // Thu thập lỗi sai gần đây
    const recentErrors = db
      .prepare('SELECT title, corrected_sentence FROM learning_errors WHERE status != ? LIMIT 3')
      .all('resolved') as any[];

    const knownWordsList = knownVocab.map((v) => `${v.simplified} (${v.meaning_vi})`).join(', ');
    const strugglingWordsList = strugglingVocab.map((v) => `${v.simplified} (${v.meaning_vi})`).join(', ');
    const grammarList = strugglingGrammar.map((g) => `${g.pattern_name}: ${g.formula}`).join('; ');
    const errorsList = recentErrors.map((e) => `${e.title} -> ${e.corrected_sentence}`).join('; ');

    const prompt = `
Bạn là chuyên gia sư phạm tiếng Trung quốc tế thiết kế bài đọc hiểu tương tác cá nhân hóa cho học viên người Việt Nam.

Mục tiêu học tập:
- Trình độ: HSK ${hskLevel} (${levelStr}).
- Chủ đề: ${topic}.
- Thể loại: ${genre}.
- Quy tắc kiểm soát độ khó từ vựng: 75% từ vựng quen thuộc đã học, 15% củng cố từ vựng đang học, tối đa 10% từ mới bổ trợ.
- Từ vựng đã biết của học viên: ${knownWordsList || 'từ vựng cơ bản HSK'}.
- Từ vựng học viên hay quên cần củng cố: ${strugglingWordsList || 'không có'}.
- Ngữ pháp cần củng cố: ${grammarList || 'ngữ pháp HSK chuẩn'}.
- Điểm yếu/Lỗi sai học viên hay gặp: ${errorsList || 'không có'}.

YÊU CẦU BẮT BUỘC VỀ NỘI DUNG:
1. Câu văn tiếng Trung phải tự nhiên, chuẩn văn phong Quan thoại (Standard Mandarin), mạch lạc, không gượng ép chắp vá.
2. Pinyin phải chính xác 100% kèm dấu thanh điệu chuẩn.
3. Bản dịch tiếng Việt phải mượt mà, đúng ngữ cảnh bài đọc.
4. Tách bài đọc thành các câu đơn vị (sentences), mỗi câu có Pinyin, bản dịch tiếng Việt và ghi chú ngữ pháp ngắn nếu có.
5. Danh sách từ vựng trọng tâm (vocabularyFocus) gồm 3-5 từ phù hợp trình độ.
6. Cấu trúc ngữ pháp đáng chú ý (grammarFocus) gồm 1-2 cấu trúc quan trọng.
7. Tạo 3 câu hỏi đọc hiểu (comprehensionQuestions):
   - Câu 1: Trắc nghiệm 4 lựa chọn (single_choice), có citationText chỉ rõ câu nào trong bài làm căn cứ.
   - Câu 2: Đúng hoặc Sai (true_false), có citationText.
   - Câu 3: Câu hỏi tự do (free_text_vi hoặc free_text_zh), có câu trả lời mẫu và citationText.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc sau (không markdown, không bọc backtick):
{
  "titleZh": "Tiêu đề tiếng Trung",
  "titlePinyin": "Tiêu đề Pinyin có dấu",
  "titleVi": "Tiêu đề tiếng Việt",
  "topic": "${topic}",
  "genre": "${genre}",
  "difficultyRating": ${hskLevel}.0,
  "wordCount": 120,
  "estimatedReadingMinutes": 3,
  "fullContentZh": "Toàn bộ bài đọc tiếng Trung đầy đủ...",
  "fullContentPinyin": "Toàn bộ Pinyin có dấu...",
  "fullContentVi": "Toàn bộ bản dịch tiếng Việt...",
  "paragraphs": [
    "Đoạn 1...",
    "Đoạn 2..."
  ],
  "sentences": [
    {
      "sentenceIndex": 0,
      "sentenceZh": "Câu tiếng Trung 1",
      "sentencePinyin": "Pinyin câu 1",
      "sentenceVi": "Dịch câu 1",
      "grammarNotes": ["Ghi chú ngữ pháp"]
    }
  ],
  "vocabularyFocus": [
    {
      "simplified": "汉字",
      "pinyin": "hànzì",
      "meaningVi": "chữ Hán",
      "hskLevel": ${hskLevel},
      "isNewWord": false
    }
  ],
  "grammarFocus": [
    {
      "pattern": "Tên cấu trúc",
      "formula": "Công thức",
      "explanationVi": "Giải thích chi tiết",
      "exampleSentence": "Ví dụ minh họa"
    }
  ],
  "comprehensionQuestions": [
    {
      "id": "q1",
      "type": "single_choice",
      "question": "Nội dung câu hỏi?",
      "options": ["A...", "B...", "C...", "D..."],
      "answer": 0,
      "explanationVi": "Giải thích vì sao đáp án đúng",
      "citationText": "Trích dẫn câu gốc trong bài"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "Câu khẳng định đúng hoặc sai?",
      "options": ["Đúng (正确)", "Sai (错误)"],
      "answer": 0,
      "explanationVi": "Giải thích",
      "citationText": "Trích dẫn câu gốc"
    },
    {
      "id": "q3",
      "type": "free_text_vi",
      "question": "Câu hỏi tự do?",
      "answer": "Đáp án tham khảo",
      "explanationVi": "Giải thích",
      "citationText": "Trích dẫn câu gốc"
    }
  ],
  "learningObjectives": [
    "Mục tiêu 1",
    "Mục tiêu 2"
  ]
}
    `.trim();

    try {
      const startReadingCall = Date.now();
      const model = geminiTextService.getModel();
      const rawText = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        model,
        'Bạn là chuyên gia biên soạn ngữ liệu đọc hiểu tiếng Trung chuẩn HSK của Halo Chinese. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.3,
        25000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_reading_gen_${Date.now()}`,
        taskId: 'GENERATE_READING',
        modelCategory: 'text_out',
        modelId: model,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startReadingCall
      });

      const generated = JSON.parse(rawText);

      // Kiểm định chất lượng nội dung trước khi lưu
      if (!generated.fullContentZh || !generated.sentences || generated.sentences.length === 0) {
        throw new Error('Dữ liệu bài đọc sinh ra thiếu nội dung hoặc danh sách câu.');
      }

      const now = Date.now();
      const passageId = `ai_reading_${Date.now()}`;

      // Lưu vào SQLite reading_passages
      db.prepare(`
        INSERT INTO reading_passages (
          id, title_zh, title_pinyin, title_vi, level, hsk_level, standard_version,
          topic, genre, difficulty_rating, word_count, estimated_reading_minutes,
          full_content_zh, full_content_pinyin, full_content_vi, paragraphs_json,
          vocabulary_focus_json, grammar_focus_json, comprehension_questions_json,
          learning_objectives_json, source, content_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        passageId,
        generated.titleZh,
        generated.titlePinyin,
        generated.titleVi,
        levelStr,
        hskLevel,
        `AI Tạo Thích Ứng (HSK ${hskLevel} Chuẩn)`,
        generated.topic || topic,
        generated.genre || genre,
        generated.difficultyRating || Number(hskLevel),
        generated.wordCount || generated.fullContentZh.replace(/[^\u4e00-\u9fa5]/g, '').length,
        generated.estimatedReadingMinutes || 3,
        generated.fullContentZh,
        generated.fullContentPinyin,
        generated.fullContentVi,
        JSON.stringify(generated.paragraphs || [generated.fullContentZh]),
        JSON.stringify(generated.vocabularyFocus || []),
        JSON.stringify(generated.grammarFocus || []),
        JSON.stringify(generated.comprehensionQuestions || []),
        JSON.stringify(generated.learningObjectives || []),
        'gemini_ai_personalized',
        1,
        now,
        now
      );

      // Lưu danh sách câu phân đoạn vào reading_passage_sentences
      const insertSentenceStmt = db.prepare(`
        INSERT INTO reading_passage_sentences (
          id, passage_id, sentence_index, paragraph_index, sentence_zh,
          sentence_pinyin, sentence_vi, grammar_notes_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < generated.sentences.length; i++) {
        const s = generated.sentences[i];
        insertSentenceStmt.run(
          `${passageId}_s${i}`,
          passageId,
          i,
          s.paragraphIndex || 0,
          s.sentenceZh,
          s.sentencePinyin,
          s.sentenceVi,
          s.grammarNotes ? JSON.stringify(s.grammarNotes) : null
        );
      }

      console.log(`[GeminiReadingService] Đã tạo thành công bài đọc cá nhân hóa AI: ${generated.titleZh} (${passageId})`);
      return this.getPassageById(passageId);
    } catch (err: any) {
      console.error('[GeminiReadingService] Lỗi khi tạo bài đọc cá nhân hóa:', err);
      throw new Error(`Không thể tạo bài đọc AI: ${err.message || String(err)}`);
    }
  }

  /**
   * Phân tích ngữ pháp chuyên sâu cho một câu trong ngữ cảnh bài đọc
   */
  public async explainSentenceOrGrammar(params: {
    passageId: string;
    sentenceZh: string;
    sentencePinyin?: string;
    sentenceVi?: string;
    contextPassage?: string;
  }) {
    const { sentenceZh, sentencePinyin, sentenceVi, contextPassage } = params;

    const prompt = `
Bạn là giáo viên tiếng Trung giàu kinh nghiệm. Hãy phân tích ngữ pháp chi tiết cho câu văn sau trong bài đọc:

Câu tiếng Trung: "${sentenceZh}"
${sentencePinyin ? `Pinyin: "${sentencePinyin}"` : ''}
${sentenceVi ? `Bản dịch tiếng Việt: "${sentenceVi}"` : ''}
${contextPassage ? `Ngữ cảnh toàn bài đọc: "${contextPassage.slice(0, 300)}..."` : ''}

Yêu cầu phân tích:
1. Thành phần câu (Chủ ngữ, Vị ngữ, Tân ngữ, Trạng ngữ, Bổ ngữ).
2. Các cấu trúc ngữ pháp then chốt hoặc từ hư tự (như 的, 得, 地, 把, 被, 了...).
3. Sắc thái biểu đạt trong ngữ cảnh cụ thể này.
4. Cho 2 câu ví dụ tương tự có cấu trúc tương đương kèm Pinyin và dịch nghĩa tiếng Việt.

Trả về định dạng JSON DUY NHẤT theo mẫu sau:
{
  "sentenceZh": "${sentenceZh}",
  "components": [
    { "role": "Chủ ngữ", "segment": "...", "pinyin": "...", "explanation": "..." },
    { "role": "Vị ngữ", "segment": "...", "pinyin": "...", "explanation": "..." }
  ],
  "keyGrammarPoint": "Tên điểm ngữ pháp cốt lõi",
  "detailedExplanationVi": "Giải thích chi tiết...",
  "contextualNuanceVi": "Ý nghĩa và sắc thái trong ngữ cảnh bài đọc...",
  "similarExamples": [
    { "zh": "...", "pinyin": "...", "vi": "..." },
    { "zh": "...", "pinyin": "...", "vi": "..." }
  ]
}
    `.trim();

    try {
      const startReadingCall = Date.now();
      const model = geminiTextService.getModel();
      const raw = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        model,
        'Bạn là giám khảo chấm bài đọc hiểu tiếng Trung của Halo Chinese. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.2,
        20000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_reading_eval_${Date.now()}`,
        taskId: 'EVALUATE_READING_COMPREHENSION',
        modelCategory: 'text_out',
        modelId: model,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startReadingCall
      });

      return JSON.parse(raw);
    } catch (err: any) {
      console.error('[GeminiReadingService] Lỗi khi giải thích ngữ pháp câu:', err);
      return {
        sentenceZh,
        components: [],
        keyGrammarPoint: 'Phân tích ngữ pháp cơ bản',
        detailedExplanationVi: `Câu mang ý nghĩa: "${sentenceVi || sentenceZh}". Cấu trúc câu chuẩn tiếng Trung.`,
        contextualNuanceVi: 'Vận dụng tự nhiên trong bài đọc.',
        similarExamples: [],
      };
    }
  }

  /**
   * Hỏi AI Tutor về nội dung bài đọc (Context-aware Reading Tutor)
   */
  public async askReadingTutor(params: {
    passageId: string;
    sentenceZh?: string;
    userQuery: string;
    chatHistory?: Array<{ sender: 'user' | 'ai'; text: string }>;
  }) {
    const { passageId, sentenceZh, userQuery, chatHistory = [] } = params;

    // Lấy ngữ cảnh bài đọc
    const passage = db.prepare('SELECT title_zh, title_vi, full_content_zh, full_content_vi FROM reading_passages WHERE id = ?').get(passageId) as any;

    const historyPrompt = chatHistory
      .slice(-4)
      .map((h) => `${h.sender === 'user' ? 'Học viên' : 'Gia sư'}: ${h.text}`)
      .join('\n');

    const prompt = `
Bạn là Gia sư Tiếng Trung thông minh Halo Chinese, đang đồng hành cùng học viên khi đọc bài đọc sau:

Tiêu đề bài đọc: "${passage?.title_zh || ''}" (${passage?.title_vi || ''})
${sentenceZh ? `Câu học viên đang chọn: "${sentenceZh}"` : ''}
Nội dung bài đọc liên quan: "${(passage?.full_content_zh || '').slice(0, 400)}..."

Lịch sử trò chuyện gần nhất:
${historyPrompt || 'Chưa có'}

Học viên hỏi: "${userQuery}"

Hướng dẫn trả lời:
- Trả lời bằng tiếng Việt thân thiện, dễ hiểu, sư phạm cao.
- Nếu học viên yêu cầu viết lại câu dễ hơn (simplify), hãy đưa ra phiên bản tiếng Trung dùng từ vựng HSK 1-2 kèm Pinyin và dịch nghĩa.
- Nếu học viên hỏi từ vựng hoặc ngữ pháp, hãy giải thích gắn liền với ngữ cảnh bài đọc này.
- Trả lời súc tích, ngắn gọn, có cấu trúc rõ ràng.
    `.trim();

    try {
      const startReadingCall = Date.now();
      const model = geminiTextService.getModel();
      const reply = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        model,
        'Bạn là gia sư đọc hiểu tiếng Trung của Halo Chinese.',
        prompt,
        'text',
        0.3,
        20000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_reading_tutor_${Date.now()}`,
        taskId: 'AI_TUTOR_CHAT',
        modelCategory: 'text_out',
        modelId: model,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startReadingCall
      });

      return {
        reply: reply || 'Rất tiếc, AI chưa thể phản hồi câu hỏi này lúc này.',
      };
    } catch (err: any) {
      console.error('[GeminiReadingService] Lỗi khi trao đổi với AI Tutor:', err);
      return {
        reply: 'Đã xảy ra lỗi khi kết nối tới Gia sư AI. Vui lòng kiểm tra lại kết nối mạng hoặc API key.',
      };
    }
  }

  /**
   * Đánh giá câu trả lời đọc hiểu (Hỗ trợ trắc nghiệm & câu hỏi tự do bằng AI)
   */
  public async evaluateComprehensionAnswer(params: {
    passageId: string;
    questionId: string;
    questionText: string;
    questionType: string;
    expectedAnswer: string | number;
    citationText?: string;
    userAnswer: string | number;
  }) {
    const { questionText, questionType, expectedAnswer, citationText, userAnswer } = params;

    // Nếu là trắc nghiệm chọn đáp án hoặc Đúng/Sai: kiểm tra trực tiếp
    if (questionType === 'single_choice' || questionType === 'true_false' || questionType === 'fill_blank') {
      const isCorrect = Number(userAnswer) === Number(expectedAnswer);
      return {
        isCorrect,
        scorePercent: isCorrect ? 100 : 0,
        feedbackVi: isCorrect
          ? 'Chính xác! Bạn đã nắm rất rõ chi tiết này trong bài.'
          : `Chưa chính xác. Đáp án đúng là lựa chọn số ${Number(expectedAnswer) + 1}.`,
        citationText: citationText || '',
      };
    }

    // Nếu là câu trả lời tự do bằng tiếng Việt hoặc tiếng Trung: Gemini đánh giá mức độ tương đương ngữ nghĩa
    const prompt = `
Bạn là giám khảo chấm bài đọc hiểu tiếng Trung. Đánh giá câu trả lời tự do của học viên:

Câu hỏi: "${questionText}"
Đáp án chuẩn tham khảo: "${expectedAnswer}"
Trích dẫn căn cứ trong bài: "${citationText || ''}"
Câu trả lời của học viên: "${userAnswer}"

Yêu cầu chấm:
- KHÔNG chỉ so khớp chuỗi chữ cứng nhắc. Đánh giá xem học viên có diễn đạt được đúng ý cốt lõi hay không (cho phép diễn đạt bằng các từ ngữ tương đương).
- Nếu đúng hoặc gần đúng, cho điểm 70 - 100%. Nếu thiếu ý hoặc sai lệch, cho điểm tương ứng.
- Đưa ra nhận xét sư phạm ngắn gọn, động viên học viên.

Trả về JSON DUY NHẤT:
{
  "isCorrect": true/false,
  "scorePercent": 85,
  "feedbackVi": "Nhận xét chi tiết bằng tiếng Việt...",
  "citationText": "${citationText || ''}"
}
    `.trim();

    try {
      const startReadingCall = Date.now();
      const model = geminiTextService.getModel();
      const raw = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        model,
        'Bạn là giám khảo chấm bài đọc hiểu tiếng Trung của Halo Chinese. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.2,
        20000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_reading_eval_${Date.now()}`,
        taskId: 'EVALUATE_READING_COMPREHENSION',
        modelCategory: 'text_out',
        modelId: model,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startReadingCall
      });

      return JSON.parse(raw);
    } catch (err: any) {
      console.error('[GeminiReadingService] Lỗi khi chấm câu trả lời tự do:', err);
      // Fallback kiểm tra chuỗi đơn giản
      const isMatch = String(userAnswer).toLowerCase().trim() === String(expectedAnswer).toLowerCase().trim();
      return {
        isCorrect: isMatch,
        scorePercent: isMatch ? 100 : 50,
        feedbackVi: isMatch ? 'Chính xác!' : 'Hệ thống đã ghi nhận câu trả lời của bạn.',
        citationText: citationText || '',
      };
    }
  }

  /**
   * Lưu nhật ký phiên đọc (Reading Session) & Cập nhật tiến độ học tập
   */
  public async submitReadingSession(input: ReadingSessionInput) {
    const {
      passageId,
      mode = 'intensive',
      timeSpentSeconds = 60,
      answers = [],
      lookedUpWords = [],
      savedWords = [],
      grammarInspected = [],
      aiTutorQueries = [],
    } = input;

    const passage = db.prepare('SELECT * FROM reading_passages WHERE id = ?').get(passageId) as any;
    if (!passage) {
      throw new Error(`Không tìm thấy bài đọc ${passageId}`);
    }

    const sessionId = `reading_sess_${Date.now()}`;
    const wordCount = passage.word_count || 100;
    const minutes = Math.max(0.1, timeSpentSeconds / 60);
    const readingSpeedWpm = Math.round(wordCount / minutes);

    let correctCount = 0;
    for (const a of answers) {
      if (a.isCorrect) correctCount++;
    }

    const totalQuestions = answers.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    const now = Date.now();

    // Lưu vào reading_sessions
    db.prepare(`
      INSERT INTO reading_sessions (
        id, user_id, passage_id, mode, time_spent_seconds, reading_speed_wpm,
        questions_attempted, questions_correct, score_percent,
        looked_up_words_json, saved_words_json, grammar_inspected_json,
        ai_tutor_queries_json, comprehension_summary_json, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      'default',
      passageId,
      mode,
      timeSpentSeconds,
      readingSpeedWpm,
      totalQuestions,
      correctCount,
      scorePercent,
      JSON.stringify(lookedUpWords),
      JSON.stringify(savedWords),
      JSON.stringify(grammarInspected),
      JSON.stringify(aiTutorQueries),
      JSON.stringify({
        summary: `Hoàn thành bài đọc ${passage.title_zh} với điểm đọc hiểu ${scorePercent}%. Tốc độ đọc: ${readingSpeedWpm} từ/phút.`,
      }),
      now,
      now
    );

    // Lưu từng câu trả lời vào reading_answers
    const insertAnswerStmt = db.prepare(`
      INSERT INTO reading_answers (
        session_id, passage_id, question_id, question_type, user_answer,
        correct_answer, is_correct, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of answers) {
      insertAnswerStmt.run(
        sessionId,
        passageId,
        a.questionId,
        a.questionType,
        String(a.userAnswer),
        '',
        a.isCorrect ? 1 : 0,
        now
      );
    }

    // Cập nhật trạng thái bookmark: completed
    db.prepare(`
      INSERT INTO reading_bookmarks (id, user_id, passage_id, is_favorite, progress_percent, status, updated_at)
      VALUES (?, ?, ?, 0, 100, 'completed', ?)
      ON CONFLICT(passage_id) DO UPDATE SET
        progress_percent = 100,
        status = 'completed',
        updated_at = excluded.updated_at
    `).run(`bm_${passageId}`, 'default', passageId, now);

    // Đề xuất bài học tiếp theo dựa trên kết quả
    let recommendation = '';
    if (scorePercent >= 80) {
      recommendation = 'Kết quả rất xuất sắc! Bạn đã hiểu sâu sắc nội dung. Hãy thử thách với bài đọc ở cấp độ cao hơn hoặc luyện nói nhại (Shadowing) bài này.';
    } else if (scorePercent >= 60) {
      recommendation = 'Bạn đã nắm được các ý chính. Hãy xem lại các từ mới đã tra cứu và làm lại những câu trả lời chưa chính xác.';
    } else {
      recommendation = 'Nội dung bài đọc có thể hơi khó. Hãy sử dụng chế độ hiển thị Pinyin và Bản dịch, hoặc yêu cầu AI tạo một bài đọc ngắn hơn với ít từ mới hơn.';
    }

    return {
      sessionId,
      passageId,
      scorePercent,
      totalQuestions,
      correctCount,
      timeSpentSeconds,
      readingSpeedWpm,
      recommendation,
      lookedUpWordsCount: lookedUpWords.length,
      savedWordsCount: savedWords.length,
    };
  }

  /**
   * Lưu / Cập nhật đánh dấu yêu thích hoặc ghi chú bài đọc
   */
  public toggleBookmark(passageId: string, isFavorite?: boolean, notes?: string) {
    const now = Date.now();
    const existing = db
      .prepare('SELECT * FROM reading_bookmarks WHERE passage_id = ? AND user_id = ?')
      .get(passageId, 'default') as any;

    if (existing) {
      const newFav = isFavorite !== undefined ? (isFavorite ? 1 : 0) : existing.is_favorite === 1 ? 0 : 1;
      const newNotes = notes !== undefined ? notes : existing.personal_notes;
      db.prepare(`
        UPDATE reading_bookmarks
        SET is_favorite = ?, personal_notes = ?, updated_at = ?
        WHERE passage_id = ? AND user_id = ?
      `).run(newFav, newNotes, now, passageId, 'default');
      return { isFavorite: newFav === 1, notes: newNotes };
    } else {
      const fav = isFavorite ? 1 : 0;
      db.prepare(`
        INSERT INTO reading_bookmarks (id, user_id, passage_id, is_favorite, progress_percent, personal_notes, status, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, 'not_started', ?)
      `).run(`bm_${passageId}`, 'default', passageId, fav, notes || '', now);
      return { isFavorite: fav === 1, notes: notes || '' };
    }
  }

  /**
   * Chuyển một câu từ bài đọc sang bài tập Shadowing chuyên sâu (1-click Bridge to Shadowing)
   */
  public syncSentenceToShadowing(passageId: string, sentenceIndex: number) {
    const s = db
      .prepare(
        `
      SELECT s.*, p.title_zh, p.hsk_level
      FROM reading_passage_sentences s
      JOIN reading_passages p ON p.id = s.passage_id
      WHERE s.passage_id = ? AND s.sentence_index = ?
    `
      )
      .get(passageId, sentenceIndex) as any;

    if (!s) {
      throw new Error(`Không tìm thấy câu số ${sentenceIndex} trong bài đọc ${passageId}`);
    }

    const shadowingLessonId = `shadowing_from_read_${passageId}_${sentenceIndex}`;
    const now = Date.now();

    // Tạo các thought groups / cụm ý nghĩa đơn giản cho câu
    const chunks = [
      {
        id: 'c1',
        chunkIndex: 0,
        textZh: s.sentence_zh,
        pinyin: s.sentence_pinyin,
        meaningVi: s.sentence_vi,
        pauseAfterMs: 400,
      },
    ];

    db.prepare(`
      INSERT OR REPLACE INTO shadowing_lessons (
        id, title, level, hsk_level, topic, difficulty, recommended_speed,
        full_zh, full_pinyin, full_vi, chunks_json, comprehension_questions_json,
        source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      shadowingLessonId,
      `[Bài đọc] ${s.sentence_zh.slice(0, 15)}...`,
      'level3',
      s.hsk_level || 2,
      'daily_life',
      'medium',
      1.0,
      s.sentence_zh,
      s.sentence_pinyin,
      s.sentence_vi,
      JSON.stringify(chunks),
      JSON.stringify([]),
      'reading_bridge',
      now,
      now
    );

    return {
      success: true,
      shadowingLessonId,
      title: `Luyện nói nhại câu trích từ bài đọc: "${s.sentence_zh}"`,
    };
  }

  /**
   * Lưu từ vựng từ bài đọc vào Bộ nhớ dài hạn & Hàng đợi SRS (SM-2)
   */
  public syncWordToMemoryAndSrs(wordZh: string, wordPinyin: string, meaningVi: string, hskLevel: number = 1) {
    const now = Date.now();

    // 1. Lưu vào vocabulary_memory
    const insertVocab = db.prepare(`
      INSERT INTO vocabulary_memory (
        simplified, traditional, pinyin, meaning_vi, word_type, hsk_level,
        examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level, source_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'introduced', 'reading_passage')
      ON CONFLICT(simplified) DO UPDATE SET
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = review_count + 1
    `);
    insertVocab.run(wordZh, wordZh, wordPinyin, meaningVi, 'từ vựng', hskLevel, JSON.stringify([]), now, now);

    // 2. Lưu vào srs_items
    const srsId = `srs_read_${wordZh}`;
    db.prepare(`
      INSERT OR REPLACE INTO srs_items (
        id, item_type, reference_id, unique_key, hsk_level, prompt_zh, prompt_pinyin, prompt_vi,
        ease_factor, interval_days, repetition_count, streak, lapses, next_review_at,
        mastery_level, status, created_at, updated_at
      ) VALUES (?, 'vocabulary', ?, ?, ?, ?, ?, ?, 2.5, 1, 0, 0, 0, ?, 'learning', 'active', ?, ?)
    `).run(
      srsId,
      `vocab_${wordZh}`,
      `vocab_${wordZh}`,
      hskLevel,
      wordZh,
      wordPinyin,
      meaningVi,
      now + 86400000, // Ôn sau 1 ngày
      now,
      now
    );

    // 3. Ghi nhận Learning Evidence vào hệ thống bằng chứng (Phase A2)
    try {
      learningEvidenceService.recordEvidence({
        rawText: wordZh,
        evidenceType: 'recognition',
        action: 'reading_word_save',
        sourceModule: 'reading',
        observedData: {
          speaker: 'user',
          promptZh: wordZh,
          pinyinExpected: wordPinyin,
          userText: wordZh
        },
        assessmentData: {
          isCorrect: true,
          score: 100
        },
        inferenceData: {
          pedagogicClaim: `Người học nhận diện và lưu từ "${wordZh}" từ bài đọc vào hàng đợi ôn tập.`
        },
        assessmentMethod: 'human_confirmation',
        evaluator: 'user_self_report',
        confidence: 0.95
      });
    } catch {}

    return {
      success: true,
      wordZh,
      srsId,
      message: `Đã lưu từ "${wordZh}" vào Bộ nhớ học tập và Lịch ôn tập ngắt quãng (SM-2)!`,
    };
  }

  /**
   * Lấy thống kê tổng quan về việc luyện đọc
   */
  public getReadingStats() {
    const totalPassages = (db.prepare('SELECT COUNT(*) as count FROM reading_passages').get() as any)?.count || 0;
    const completedPassages =
      (db.prepare("SELECT COUNT(*) as count FROM reading_bookmarks WHERE status = 'completed'").get() as any)?.count || 0;
    const favoriteCount =
      (db.prepare('SELECT COUNT(*) as count FROM reading_bookmarks WHERE is_favorite = 1').get() as any)?.count || 0;

    const sessionStats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(time_spent_seconds), 0) as total_seconds,
        COALESCE(AVG(score_percent), 0) as avg_score,
        COALESCE(AVG(reading_speed_wpm), 0) as avg_wpm
      FROM reading_sessions
    `
      )
      .get() as any;

    return {
      totalPassages,
      completedPassages,
      favoriteCount,
      totalSessions: sessionStats.total_sessions || 0,
      totalMinutesRead: Math.round((sessionStats.total_seconds || 0) / 60),
      averageComprehensionScore: Math.round(sessionStats.avg_score || 0),
      averageReadingWpm: Math.round(sessionStats.avg_wpm || 0),
    };
  }

  private formatPassageSummary(row: any) {
    return {
      id: row.id,
      titleZh: row.title_zh,
      titlePinyin: row.title_pinyin,
      titleVi: row.title_vi,
      level: row.level,
      hskLevel: row.hsk_level,
      standardVersion: row.standard_version,
      topic: row.topic,
      genre: row.genre,
      difficultyRating: row.difficulty_rating,
      wordCount: row.word_count,
      estimatedReadingMinutes: row.estimated_reading_minutes,
      source: row.source,
      isFavorite: row.is_favorite === 1,
      progressPercent: row.progress_percent || 0,
      readingStatus: row.reading_status || 'not_started',
      lastReadSentenceIndex: row.last_read_sentence_index || 0,
      readCount: row.read_count || 0,
      createdAt: row.created_at,
    };
  }
}

export const geminiReadingService = new GeminiReadingService();
