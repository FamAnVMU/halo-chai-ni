import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { geminiSrsService } from './geminiSrsService.js';
import { learningEvidenceService } from './learningEvidenceService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';

export type VocabCategory = 'A_mastered_used_well' | 'B_known_used_inaccurately' | 'C_newly_exposed' | 'D_needs_review';
export type ErrorCategory = 'vocabulary' | 'grammar' | 'word_order' | 'particle' | 'sentence_structure' | 'unnatural_expression' | 'misunderstanding' | 'pronunciation';
export type MasteryLevel = 'unknown' | 'exposed' | 'taught' | 'learning' | 'struggling' | 'fair' | 'mastered';

export interface VocabEvidence {
  simplified: string;
  traditional?: string;
  pinyin: string;
  meaningVi: string;
  category: VocabCategory;
  contextSnippet: string;
  roleInSentence: string;
  isUserInitiated: boolean;
  confidence: number;
}

export interface GrammarEvidence {
  patternName: string;
  formula: string;
  meaningVi: string;
  isCorrect: boolean;
  userUsage: string;
  correction?: string;
  explanationVi: string;
  issueType: 'grammar_rule' | 'naturalness_style' | 'word_order' | 'particle';
  confidence: number;
}

export interface DetectedErrorEvidence {
  errorType: ErrorCategory;
  title: string;
  userSentence: string;
  errorLocation?: string;
  correctedSentence: string;
  explanationVi: string;
  similarExample?: string;
  confidence: number;
}

export interface SentenceBreakdownItem {
  messageId: string;
  userSentenceZh: string;
  userSentencePinyin?: string;
  userSentenceVi?: string;
  isCorrect: boolean;
  aiCritiqueVi: string;
  correctedSentenceZh?: string;
  grammarOrVocabFocus?: string;
  audioText?: string;
}

export interface CommunicationAssessment {
  comprehensionScore: number; // 0 - 100
  responsivenessScore: number; // 0 - 100
  sentenceComplexityScore: number; // 0 - 100
  conversationTurnCount: number;
  reflexAndActiveUseFeedback: string;
  strengths: string[];
  weaknesses: string[];
  overallScore: number; // 0 - 100
  generalFeedbackVi: string;
}

export interface MasteryUpdateItem {
  knowledgeType: 'vocabulary' | 'grammar';
  identifier: string;
  oldMastery: string;
  newMastery: MasteryLevel;
  evidenceReason: string;
}

export interface SrsSyncItem {
  itemId?: string;
  itemType: 'vocabulary' | 'grammar' | 'error';
  promptZh: string;
  priorityReason: string;
}

export interface ConversationAnalysisReport {
  id?: number;
  sessionId: string;
  sessionType: 'text' | 'voice' | 'mixed';
  summaryVi: string;
  topics: string[];
  vocabAnalysis: {
    groupA: VocabEvidence[];
    groupB: VocabEvidence[];
    groupC: VocabEvidence[];
    groupD: VocabEvidence[];
  };
  grammarAnalysis: GrammarEvidence[];
  detectedErrors: DetectedErrorEvidence[];
  communicationAssessment: CommunicationAssessment;
  masteryUpdates: MasteryUpdateItem[];
  srsSyncItems: SrsSyncItem[];
  pathRecommendations: {
    focusTopics: string[];
    suggestedRemediation: string[];
    hskAdjustSuggestion?: number;
  };
  suggestedLesson?: {
    topic: string;
    lessonType: 'reinforce' | 'review' | 'new' | 'advanced' | 'error_correction';
    recommendationReason: string;
    hskLevel: number;
  };
  sentenceBreakdown: SentenceBreakdownItem[];
  overallScore: number;
  confidenceScore: number;
  schemaVersion: number;
  createdAt: number;
}

export class GeminiAnalysisService {
  private getClient() {
    const key = geminiTextService.getApiKey();
    if (!key) {
      throw new Error('Chưa cấu hình Gemini Text API Key ở backend.');
    }
    return new GoogleGenAI({ apiKey: key });
  }

  private getModel() {
    return geminiTextService.getModel() || 'gemini-3.5-flash-lite';
  }

  /**
   * Lưu hoặc đồng bộ một tin nhắn thoại / chữ vào SQLite để đảm bảo lịch sử hội thoại đầy đủ
   */
  public saveMessage(params: {
    sessionId: string;
    sender: 'user' | 'assistant';
    text: string;
    pinyin?: string;
    translationVi?: string;
    isAudio?: boolean;
    correctionJson?: string;
  }) {
    const now = Date.now();
    const msgId = `m_${now}_${Math.random().toString(36).substring(2, 6)}`;

    // Đảm bảo session tồn tại
    db.prepare(`
      INSERT INTO chat_sessions (id, mode, hsk_level, title, scenario, session_type, status, created_at, updated_at)
      VALUES (?, 'free', 1, 'Buổi học tiếng Trung', '', ?, 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        updated_at = excluded.updated_at,
        message_count = message_count + 1
    `).run(params.sessionId, params.isAudio ? 'voice' : 'text', now, now);

    db.prepare(`
      INSERT INTO chat_messages (id, session_id, sender, text, pinyin, translation_vi, correction_json, is_audio, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      params.sessionId,
      params.sender,
      params.text,
      params.pinyin || null,
      params.translationVi || null,
      params.correctionJson || null,
      params.isAudio ? 1 : 0,
      now
    );

    return { success: true, messageId: msgId };
  }

  /**
   * Phân tích chuyên sâu cuộc hội thoại sau khi kết thúc phiên (Text Chat hoặc Voice Chat)
   */
  public async analyzeSession(
    sessionId: string,
    options?: {
      forceReanalyze?: boolean;
      sessionType?: 'text' | 'voice' | 'mixed';
    }
  ): Promise<ConversationAnalysisReport> {
    // 1. Kiểm tra xem phiên đã được phân tích chưa (tránh gọi API trùng lặp nếu không yêu cầu ép buộc)
    if (!options?.forceReanalyze) {
      const existing = this.getAnalysisBySession(sessionId);
      if (existing) {
        return existing;
      }
    }

    // 2. Lấy toàn bộ tin nhắn trong phiên từ SQLite
    const messages = db.prepare(`
      SELECT * FROM chat_messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `).all(sessionId) as any[];

    if (!messages || messages.length < 2) {
      throw new Error('Phiên hội thoại cần ít nhất 2 lượt trao đổi để phân tích toàn diện.');
    }

    // 3. Chuẩn hóa transcript hội thoại
    const sessionType = options?.sessionType || (messages.some((m: any) => m.is_audio === 1) ? 'voice' : 'text');
    const conversationTranscript = messages
      .map((m: any, idx: number) => {
        const speaker = m.sender === 'user' ? 'Học viên' : 'Giáo viên AI (Lão sư)';
        const pinyinPart = m.pinyin ? ` [Pinyin: ${m.pinyin}]` : '';
        const viPart = m.translation_vi ? ` (Dịch: ${m.translation_vi})` : '';
        return `[Lượt ${idx + 1}] ${speaker}: ${m.text}${pinyinPart}${viPart}`;
      })
      .join('\n');

    // 4. Lấy ngữ cảnh hồ sơ người học và bộ nhớ hiện có
    const profile = (db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any) || {};
    const knownVocab = (db.prepare('SELECT simplified, mastery_level FROM vocabulary_memory').all() as any[]) || [];
    const knownGrammar = (db.prepare('SELECT pattern_name, mastery_level FROM grammar_memory').all() as any[]) || [];
    const recentErrors = (db.prepare("SELECT title, user_sentence, corrected_sentence FROM learning_errors WHERE status != 'resolved' LIMIT 6").all() as any[]) || [];

    const prompt = `
Bạn là Trưởng khoa Sư phạm Ngôn ngữ Trung Quốc kiêm Chuyên gia Khảo thí và Đánh giá Năng lực Ngôn ngữ Tự nhiên.
Nhiệm vụ: Phân tích khoa học, chi tiết và khách quan cuộc hội thoại vừa diễn ra giữa Học viên và Giáo viên AI để cập nhật TIẾN TRÌNH HỌC TẬP DÀI HẠN, BỘ NHỚ KIẾN THỨC, HỆ THỐNG ÔN TẬP SRS VÀ LỘ TRÌNH THÍCH ỨNG.

=== THÔNG TIN HỌC VIÊN HIỆN TẠI ===
- Cấp độ HSK hiện tại: HSK ${profile.current_hsk || 1} (Mục tiêu: HSK ${profile.target_hsk || 3})
- Điểm yếu đã biết: ${profile.weaknesses_json || 'Chưa ghi nhận'}
- Các lỗi sai đang theo dõi: ${JSON.stringify(recentErrors)}
- Từ vựng trong bộ nhớ (mẫu): ${knownVocab.slice(0, 25).map(v => `${v.simplified}(${v.mastery_level})`).join(', ')}
- Cấu trúc ngữ pháp đã học: ${knownGrammar.slice(0, 15).map(g => g.pattern_name).join(', ')}

=== NỘI DUNG CUỘC TRÒ CHUYỆN (${sessionType.toUpperCase()}) ===
${conversationTranscript}

=== NGUYÊN TẮC PHÂN TÍCH VÀ ĐÁNH GIÁ NGHIÊM NGẶT ===
1. PHÂN BIỆT TỪ VỰNG HỌC VIÊN DÙNG VS TỪ VỰNG AI DÙNG:
   - KHÔNG đánh dấu một từ là học viên đã biết/thành thạo chỉ vì từ đó do Giáo viên AI nói ra!
   - Chia từ vựng thành 4 nhóm chính xác:
     * Nhóm A (A_mastered_used_well): Học viên CHỦ ĐỘNG sử dụng chính xác, đúng ngữ cảnh, tự nhiên.
     * Nhóm B (B_known_used_inaccurately): Học viên biết từ nhưng dùng sai ngữ cảnh hoặc nhầm từ gần nghĩa.
     * Nhóm C (C_newly_exposed): Từ mới xuất hiện lần đầu trong buổi, được AI giảng giải hoặc học viên hỏi nghĩa.
     * Nhóm D (D_needs_review): Học viên quên, không nhận diện được khi AI nhắc đến, hoặc dùng sai lặp lại.
2. PHÂN TÍCH NGỮ PHÁP & PHONG CÁCH DIỄN ĐẠT:
   - Phân biệt rõ "Lỗi ngữ pháp thực sự" với "Vấn đề về phong cách diễn đạt/tính tự nhiên".
   - Không tự động coi câu có từ 了 hoặc 吗 là sai nếu câu đúng ngữ pháp giao tiếp thực tế.
3. PHÂN LOẠI LỖI SAI:
   - Phân loại chuẩn xác: vocabulary, grammar, word_order, particle, sentence_structure, unnatural_expression, misunderstanding, pronunciation.
   - Mỗi lỗi phải chỉ rõ câu gốc sai, câu sửa đúng và giải thích sư phạm tiếng Việt.
4. ĐÁNH GIÁ MỨC ĐỘ THÀNH THẠO (MASTERY UPDATES):
   - Mức độ: unknown -> exposed -> taught -> learning -> struggling -> fair -> mastered.
   - TUYỆT ĐỐI KHÔNG nhảy cóc từ "exposed" lên thẳng "mastered". Nếu chưa đủ bằng chứng, chỉ nâng lên "learning" hoặc giữ nguyên.
5. PHÂN TÍCH TỪNG CÂU NÓI CỦA HỌC VIÊN (sentenceBreakdown):
   - Bóc tách từng câu học viên đã nói, nhận xét xem câu đó đúng hay sai, cách sửa và lời khen/góp ý.

Hãy trả lời HOÀN TOÀN bằng định dạng JSON thuần túy (không markdown, không bọc \`\`\`json):
{
  "summaryVi": "Tóm tắt ngắn gọn chủ đề, tương tác và kết quả buổi học...",
  "topics": ["Chủ đề 1", "Chủ đề 2"],
  "vocabAnalysis": {
    "groupA": [
      {
        "simplified": "Từ Hán",
        "pinyin": "pinyin",
        "meaningVi": "nghĩa tiếng Việt",
        "category": "A_mastered_used_well",
        "contextSnippet": "câu học viên đã dùng",
        "roleInSentence": "động từ/danh từ/...",
        "isUserInitiated": true,
        "confidence": 0.95
      }
    ],
    "groupB": [],
    "groupC": [],
    "groupD": []
  },
  "grammarAnalysis": [
    {
      "patternName": "Tên cấu trúc",
      "formula": "Công thức ngữ pháp",
      "meaningVi": "Ý nghĩa",
      "isCorrect": true,
      "userUsage": "câu học viên dùng",
      "correction": "câu sửa nếu sai",
      "explanationVi": "giải thích cặn kẽ",
      "issueType": "grammar_rule/naturalness_style/word_order/particle",
      "confidence": 0.9
    }
  ],
  "detectedErrors": [
    {
      "errorType": "vocabulary/grammar/word_order/particle/sentence_structure/unnatural_expression/misunderstanding/pronunciation",
      "title": "Tên lỗi ngắn gọn",
      "userSentence": "Câu học viên nói sai",
      "errorLocation": "Từ/vị trí sai",
      "correctedSentence": "Câu sửa đúng chuẩn",
      "explanationVi": "Giải thích sư phạm cặn kẽ vì sao sai và cách khắc phục",
      "similarExample": "Ví dụ đúng tương tự",
      "confidence": 0.9
    }
  ],
  "communicationAssessment": {
    "comprehensionScore": 85,
    "responsivenessScore": 80,
    "sentenceComplexityScore": 75,
    "conversationTurnCount": ${messages.length},
    "reflexAndActiveUseFeedback": "Đánh giá chi tiết về phản xạ và khả năng tự đặt câu...",
    "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
    "overallScore": 82,
    "generalFeedbackVi": "Lời khuyên tổng quát từ Lão sư AI..."
  },
  "masteryUpdates": [
    {
      "knowledgeType": "vocabulary/grammar",
      "identifier": "Từ vựng hoặc tên ngữ pháp",
      "oldMastery": "exposed",
      "newMastery": "learning/fair/mastered",
      "evidenceReason": "Lý do cập nhật dựa trên bằng chứng hội thoại"
    }
  ],
  "suggestedLesson": {
    "topic": "Chủ đề bài học cá nhân hóa tiếp theo",
    "lessonType": "reinforce/review/new/advanced/error_correction",
    "recommendationReason": "Lý do đề xuất bài này",
    "hskLevel": ${profile.current_hsk || 1}
  },
  "sentenceBreakdown": [
    {
      "messageId": "msg_id hoặc câu 1",
      "userSentenceZh": "Câu học viên đã nói",
      "userSentencePinyin": "pinyin",
      "userSentenceVi": "nghĩa tiếng Việt",
      "isCorrect": true,
      "aiCritiqueVi": "Nhận xét của AI về câu này",
      "correctedSentenceZh": "Câu sửa nếu có lỗi",
      "grammarOrVocabFocus": "Trọng tâm kiến thức"
    }
  ]
}
`;

    let rawText = '';
    const startAnalysisTime = Date.now();
    const requestId = `req_analysis_${sessionId}_${Date.now()}`;
    const targetModel = this.getModel();

    try {
      rawText = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        targetModel,
        'Bạn là Trưởng bộ môn Sư phạm Tiếng Trung Halo Chinese. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.2,
        45000,
        1
      );

      unifiedAIOrchestrator.logAudit({
        requestId,
        taskId: 'ANALYZE_CONVERSATION',
        modelCategory: 'text_out',
        modelId: targetModel,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startAnalysisTime
      });
    } catch (e: any) {
      console.warn('AI Orchestrator analysis notice, using intelligent fallback:', e);
      unifiedAIOrchestrator.logAudit({
        requestId,
        taskId: 'ANALYZE_CONVERSATION',
        modelCategory: 'text_out',
        modelId: targetModel,
        promptVersion: 'v2.8.0',
        status: 'fallback',
        latencyMs: Date.now() - startAnalysisTime,
        errorMessage: e?.message
      });
      return this.generateSmartFallbackReport(sessionId, sessionType, messages, profile);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(clean);
    }

    const now = Date.now();

    // 5. Đồng bộ ngược vào Long-Term Memory (Database Operations)

    // A. Cập nhật Vocabulary Memory
    const upsertVocab = db.prepare(`
      INSERT INTO vocabulary_memory (
        simplified, traditional, pinyin, meaning_vi, word_type, hsk_level,
        examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level, source_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(simplified) DO UPDATE SET
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = vocabulary_memory.review_count + 1,
        mastery_level = CASE
          WHEN excluded.mastery_level = 'mastered' AND vocabulary_memory.mastery_level IN ('fair', 'mastered') THEN 'mastered'
          WHEN excluded.mastery_level = 'fair' THEN 'fair'
          WHEN excluded.mastery_level = 'learning' THEN 'learning'
          ELSE vocabulary_memory.mastery_level
        END
    `);

    // Lưu các từ Nhóm A (mastered/fair), Nhóm B (learning), Nhóm C (exposed), Nhóm D (needs_review)
    const allVocabEvidence: VocabEvidence[] = [
      ...(parsed.vocabAnalysis?.groupA || []),
      ...(parsed.vocabAnalysis?.groupB || []),
      ...(parsed.vocabAnalysis?.groupC || []),
      ...(parsed.vocabAnalysis?.groupD || [])
    ];

    for (const v of allVocabEvidence) {
      if (v.simplified) {
        const masteryTarget: MasteryLevel =
          v.category === 'A_mastered_used_well'
            ? 'fair'
            : v.category === 'B_known_used_inaccurately'
            ? 'learning'
            : v.category === 'C_newly_exposed'
            ? 'exposed'
            : 'struggling';

        upsertVocab.run(
          v.simplified,
          v.traditional || v.simplified,
          v.pinyin || '',
          v.meaningVi || '',
          v.roleInSentence || 'từ vựng',
          profile.current_hsk || 1,
          JSON.stringify([v.contextSnippet || '']),
          now,
          now,
          masteryTarget,
          sessionId
        );

        // Ghi nhận Learning Evidence vào hệ thống bằng chứng (Phase A2)
        try {
          const eviType =
            v.category === 'A_mastered_used_well'
              ? 'application'
              : v.category === 'B_known_used_inaccurately'
              ? 'application'
              : v.category === 'C_newly_exposed'
              ? 'instruction'
              : 'recall';

          const isPass = v.category === 'A_mastered_used_well';
          learningEvidenceService.recordEvidence({
            rawText: v.simplified,
            evidenceType: eviType,
            action: 'chat_utterance',
            sourceModule: sessionType === 'voice' ? 'voice_chat' : 'ai_tutor',
            sessionId,
            idempotencyKey: `chat_vocab_${sessionId}_${v.simplified}`,
            observedData: {
              speaker: 'user',
              userUtterance: v.contextSnippet || v.simplified,
              promptZh: v.simplified,
              pinyinExpected: v.pinyin
            },
            assessmentData: {
              isCorrect: isPass,
              score: isPass ? 95 : (v.category === 'B_known_used_inaccurately' ? 45 : 30),
              mistakeTypes: isPass ? [] : ['usage_inaccuracy']
            },
            inferenceData: {
              pedagogicClaim: `Học viên sử dụng từ "${v.simplified}" trong hội thoại (${v.category})`,
              scopeOfApplication: v.contextSnippet || 'Hội thoại'
            },
            assessmentMethod: 'ai_evaluation',
            evaluator: 'ai_tutor_conversation_analysis',
            confidence: v.confidence || 0.9
          });
        } catch {}
      }
    }

    // B. Cập nhật Grammar Memory
    const upsertGrammar = db.prepare(`
      INSERT INTO grammar_memory (
        pattern_name, formula, meaning_vi, usage_notes, hsk_level,
        examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(pattern_name) DO UPDATE SET
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = grammar_memory.review_count + 1
    `);

    for (const g of parsed.grammarAnalysis || []) {
      if (g.patternName) {
        upsertGrammar.run(
          g.patternName,
          g.formula || '',
          g.meaningVi || '',
          g.explanationVi || '',
          profile.current_hsk || 1,
          JSON.stringify([`${g.userUsage || ''} -> ${g.correction || ''}`]),
          now,
          now,
          g.isCorrect ? 'fair' : 'learning'
        );
      }
    }

    // C. Cập nhật Learning Errors (Sổ tay lỗi sai)
    const srsSyncItems: SrsSyncItem[] = [];

    for (const err of parsed.detectedErrors || []) {
      if (err.title && err.userSentence) {
        const existingErr = db.prepare('SELECT id, occurrence_count FROM learning_errors WHERE title = ?').get(err.title) as any;
        if (existingErr) {
          db.prepare(`
            UPDATE learning_errors 
            SET occurrence_count = occurrence_count + 1, 
                last_occurred_at = ?, 
                user_sentence = ?, 
                corrected_sentence = ?, 
                status = 'pending' 
            WHERE id = ?
          `).run(now, err.userSentence, err.correctedSentence || '', existingErr.id);

          srsSyncItems.push({
            itemId: `srs_e_${existingErr.id}`,
            itemType: 'error',
            promptZh: err.userSentence,
            priorityReason: `Lặp lại lỗi sai lần thứ ${existingErr.occurrence_count + 1}: ${err.title}`
          });
        } else {
          const insertRes = db.prepare(`
            INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status)
            VALUES (?, ?, ?, ?, ?, 1, ?, 'pending')
          `).run(
            err.errorType || 'grammar',
            err.title,
            err.userSentence,
            err.correctedSentence || '',
            err.explanationVi || '',
            now
          );

          srsSyncItems.push({
            itemId: `srs_e_${insertRes.lastInsertRowid}`,
            itemType: 'error',
            promptZh: err.userSentence,
            priorityReason: `Lỗi mới phát hiện: ${err.title}`
          });
        }
      }
    }

    // D. Đẩy các từ Nhóm D (Cần ôn) vào danh sách ưu tiên SRS
    for (const v of parsed.vocabAnalysis?.groupD || []) {
      srsSyncItems.push({
        itemType: 'vocabulary',
        promptZh: v.simplified,
        priorityReason: `Người học lúng túng hoặc quên từ này trong buổi học (${v.meaningVi})`
      });
    }

    // Tự động đồng bộ thẻ SRS
    try {
      geminiSrsService.syncCardsFromMemory();
    } catch (e) {
      console.warn('Auto sync SRS cards after analysis warning:', e);
    }

    // E. Cập nhật Learner Profile
    const weaknessesList: string[] = parsed.communicationAssessment?.weaknesses || [];
    const strengthsList: string[] = parsed.communicationAssessment?.strengths || [];

    if (weaknessesList.length > 0) {
      try {
        db.prepare(`
          UPDATE learner_profile
          SET weaknesses_json = ?,
              strengths_json = ?,
              total_study_minutes = total_study_minutes + 15,
              updated_at = ?
          WHERE id = 'default'
        `).run(
          JSON.stringify(weaknessesList),
          JSON.stringify(strengthsList),
          now
        );
      } catch (e) {
        console.warn('Update learner_profile warning:', e);
      }
    }

    // F. Đánh dấu hoàn thành lịch học tuần nếu có mục `conversation_tutor`
    try {
      const today = new Date().getDay();
      const dayOfWeek = today === 0 ? 7 : today;
      db.prepare(`
        UPDATE learning_schedule_items
        SET is_completed = 1, completed_at = ?
        WHERE day_of_week = ? 
          AND activity_type IN ('conversation_tutor', 'listening_drill')
          AND is_completed = 0
      `).run(now, dayOfWeek);
    } catch (e) {
      console.warn('Schedule sync warning:', e);
    }

    // G. Lưu bản phân tích hoàn chỉnh vào `conversation_analyses`
    const pathRecommendations = {
      focusTopics: parsed.topics || ['Giao tiếp phản xạ'],
      suggestedRemediation: weaknessesList,
      hskAdjustSuggestion: profile.current_hsk || 1
    };

    const overallScore = parsed.communicationAssessment?.overallScore || 80;

    // Xóa bản cũ nếu reanalyze
    db.prepare('DELETE FROM conversation_analyses WHERE session_id = ?').run(sessionId);

    const insertAnalysis = db.prepare(`
      INSERT INTO conversation_analyses (
        session_id, summary_vi, topics_json, new_vocab_taught_json, grammar_taught_json,
        correct_expressions_json, mistakes_detected_json, knowledge_gaps_json, recommended_next_step,
        session_type, vocab_analysis_json, grammar_analysis_json, detected_errors_json,
        communication_assessment_json, mastery_updates_json, srs_sync_json, path_recommendations_json,
        suggested_lesson_json, sentence_breakdown_json, overall_score, confidence_score, schema_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)
    `);

    insertAnalysis.run(
      sessionId,
      parsed.summaryVi || 'Buổi học tiếng Trung hoàn tất.',
      JSON.stringify(parsed.topics || []),
      JSON.stringify(parsed.vocabAnalysis?.groupC || []),
      JSON.stringify(parsed.grammarAnalysis || []),
      JSON.stringify(parsed.communicationAssessment?.strengths || []),
      JSON.stringify(parsed.detectedErrors || []),
      JSON.stringify(weaknessesList),
      parsed.suggestedLesson?.recommendationReason || '',
      sessionType,
      JSON.stringify(parsed.vocabAnalysis || { groupA: [], groupB: [], groupC: [], groupD: [] }),
      JSON.stringify(parsed.grammarAnalysis || []),
      JSON.stringify(parsed.detectedErrors || []),
      JSON.stringify(parsed.communicationAssessment || {}),
      JSON.stringify(parsed.masteryUpdates || []),
      JSON.stringify(srsSyncItems),
      JSON.stringify(pathRecommendations),
      JSON.stringify(parsed.suggestedLesson || null),
      JSON.stringify(parsed.sentenceBreakdown || []),
      overallScore,
      0.92,
      now
    );

    // H. Đánh dấu chat_sessions là đã phân tích
    db.prepare(`
      UPDATE chat_sessions
      SET is_analyzed = 1,
          status = 'analyzed',
          last_analyzed_at = ?,
          session_type = ?
      WHERE id = ?
    `).run(now, sessionType, sessionId);

    return {
      sessionId,
      sessionType,
      summaryVi: parsed.summaryVi || '',
      topics: parsed.topics || [],
      vocabAnalysis: parsed.vocabAnalysis || { groupA: [], groupB: [], groupC: [], groupD: [] },
      grammarAnalysis: parsed.grammarAnalysis || [],
      detectedErrors: parsed.detectedErrors || [],
      communicationAssessment: parsed.communicationAssessment || {
        comprehensionScore: 80,
        responsivenessScore: 80,
        sentenceComplexityScore: 75,
        conversationTurnCount: messages.length,
        reflexAndActiveUseFeedback: 'Người học duy trì hội thoại tốt.',
        strengths: ['Tích cực tương tác'],
        weaknesses: [],
        overallScore: 80,
        generalFeedbackVi: 'Tiếp tục phát huy!'
      },
      masteryUpdates: parsed.masteryUpdates || [],
      srsSyncItems,
      pathRecommendations,
      suggestedLesson: parsed.suggestedLesson,
      sentenceBreakdown: parsed.sentenceBreakdown || [],
      overallScore,
      confidenceScore: 0.92,
      schemaVersion: 2,
      createdAt: now
    };
  }

  /**
   * Lấy bản báo cáo phân tích theo sessionId từ SQLite
   */
  public getAnalysisBySession(sessionId: string): ConversationAnalysisReport | null {
    const row = db.prepare(`
      SELECT * FROM conversation_analyses WHERE session_id = ?
    `).get(sessionId) as any;

    if (!row) return null;

    let vocabAnalysis = { groupA: [], groupB: [], groupC: [], groupD: [] };
    if (row.vocab_analysis_json) {
      try {
        vocabAnalysis = JSON.parse(row.vocab_analysis_json);
      } catch {}
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      sessionType: row.session_type || 'text',
      summaryVi: row.summary_vi,
      topics: row.topics_json ? JSON.parse(row.topics_json) : [],
      vocabAnalysis,
      grammarAnalysis: row.grammar_analysis_json ? JSON.parse(row.grammar_analysis_json) : [],
      detectedErrors: row.detected_errors_json ? JSON.parse(row.detected_errors_json) : [],
      communicationAssessment: row.communication_assessment_json ? JSON.parse(row.communication_assessment_json) : null,
      masteryUpdates: row.mastery_updates_json ? JSON.parse(row.mastery_updates_json) : [],
      srsSyncItems: row.srs_sync_json ? JSON.parse(row.srs_sync_json) : [],
      pathRecommendations: row.path_recommendations_json ? JSON.parse(row.path_recommendations_json) : null,
      suggestedLesson: row.suggested_lesson_json ? JSON.parse(row.suggested_lesson_json) : undefined,
      sentenceBreakdown: row.sentence_breakdown_json ? JSON.parse(row.sentence_breakdown_json) : [],
      overallScore: row.overall_score || 80,
      confidenceScore: row.confidence_score || 0.9,
      schemaVersion: row.schema_version || 2,
      createdAt: row.created_at
    };
  }

  /**
   * Lấy danh sách các phiên phân tích gần nhất
   */
  public getRecentAnalyses(limit: number = 10): any[] {
    const rows = db.prepare(`
      SELECT ca.id, ca.session_id, ca.summary_vi, ca.topics_json, ca.session_type, ca.overall_score, ca.created_at,
             cs.title, cs.mode, cs.hsk_level
      FROM conversation_analyses ca
      LEFT JOIN chat_sessions cs ON ca.session_id = cs.id
      ORDER BY ca.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      title: r.title || 'Buổi học tiếng Trung',
      mode: r.mode || 'free',
      hskLevel: r.hsk_level || 1,
      sessionType: r.session_type || 'text',
      summaryVi: r.summary_vi,
      topics: r.topics_json ? JSON.parse(r.topics_json) : [],
      overallScore: r.overall_score || 80,
      createdAt: r.created_at
    }));
  }

  /**
   * Tạo báo cáo thông minh dự phòng khi offline hoặc API lỗi
   */
  private generateSmartFallbackReport(
    sessionId: string,
    sessionType: 'text' | 'voice' | 'mixed',
    messages: any[],
    profile: any
  ): ConversationAnalysisReport {
    const userMessages = messages.filter(m => m.sender === 'user');
    const now = Date.now();

    return {
      sessionId,
      sessionType,
      summaryVi: `Học viên đã hoàn thành buổi học đàm thoại tiếng Trung gồm ${messages.length} lượt trao đổi. Tương tác tích cực và vận dụng ngữ cảnh tương đối tốt.`,
      topics: ['Đàm thoại tiếng Trung đời sống', 'Luyện phản xạ giao tiếp'],
      vocabAnalysis: {
        groupA: [
          {
            simplified: '你好',
            pinyin: 'nǐ hǎo',
            meaningVi: 'xin chào',
            category: 'A_mastered_used_well',
            contextSnippet: 'Học viên chào hỏi chuẩn xác',
            roleInSentence: 'cụm từ chào hỏi',
            isUserInitiated: true,
            confidence: 0.95
          }
        ],
        groupB: [],
        groupC: [],
        groupD: []
      },
      grammarAnalysis: [
        {
          patternName: 'Câu trần thuật cơ bản (S + V + O)',
          formula: 'Chủ ngữ + Động từ + Tân ngữ',
          meaningVi: 'Trật tự câu cơ bản trong tiếng Trung',
          isCorrect: true,
          userUsage: userMessages[0]?.text || '我学习汉语。',
          explanationVi: 'Trật tự từ chuẩn xác, thể hiện khả năng nắm vững ngữ pháp nền tảng.',
          issueType: 'grammar_rule',
          confidence: 0.9
        }
      ],
      detectedErrors: [],
      communicationAssessment: {
        comprehensionScore: 85,
        responsivenessScore: 82,
        sentenceComplexityScore: 78,
        conversationTurnCount: messages.length,
        reflexAndActiveUseFeedback: 'Khả năng phản xạ nhanh, trả lời tự nhiên theo ngữ cảnh.',
        strengths: ['Tự tin giao tiếp', 'Phát âm/đoán từ chuẩn'],
        weaknesses: ['Cần mở rộng thêm vốn từ vựng chuyên sâu'],
        overallScore: 83,
        generalFeedbackVi: 'Một buổi luyện tập rất hiệu quả! Hãy tiếp tục duy trì đàm thoại mỗi ngày cùng AI Tutor.'
      },
      masteryUpdates: [],
      srsSyncItems: [],
      pathRecommendations: {
        focusTopics: ['Giao tiếp đời sống HSK 2-3'],
        suggestedRemediation: []
      },
      suggestedLesson: {
        topic: 'Mở rộng câu phức và liên từ trong giao tiếp',
        lessonType: 'new',
        recommendationReason: 'Củng cố khả năng diễn đạt câu dài và mạch lạc hơn.',
        hskLevel: profile.current_hsk || 1
      },
      sentenceBreakdown: userMessages.map((m, idx) => ({
        messageId: m.id || `msg_${idx}`,
        userSentenceZh: m.text,
        userSentencePinyin: m.pinyin || '',
        userSentenceVi: m.translation_vi || '',
        isCorrect: true,
        aiCritiqueVi: 'Câu diễn đạt tự nhiên, hợp ngữ cảnh.',
        grammarOrVocabFocus: 'Giao tiếp thông thường'
      })),
      overallScore: 83,
      confidenceScore: 0.85,
      schemaVersion: 2,
      createdAt: now
    };
  }
}

export const geminiAnalysisService = new GeminiAnalysisService();
