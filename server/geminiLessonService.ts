import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';

export interface GeneratedLesson {
  id: string;
  title: string;
  lessonType: 'new' | 'review' | 'reinforce' | 'advanced' | 'error_correction';
  hskLevel: number;
  estimatedMinutes: number;
  recommendationReason: string;
  objectives: string[];
  knowledgePoints: string[];
  explanationVi: string;
  content: {
    vocabulary: Array<{
      simplified: string;
      pinyin: string;
      meaningVi: string;
      wordType: string;
      exampleZh: string;
      examplePinyin: string;
      exampleVi: string;
    }>;
    grammar: Array<{
      patternName: string;
      formula: string;
      meaningVi: string;
      explanation: string;
      goodExample: string;
      badExample?: string;
    }>;
    dialogue: Array<{
      speaker: string;
      zh: string;
      pinyin: string;
      vi: string;
    }>;
  };
  exercises: Array<{
    id: string;
    type: 'quiz' | 'fill_blank' | 'reorder' | 'translate';
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
    hint?: string;
  }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
  status: 'unstarted' | 'in_progress' | 'completed';
  score?: number;
  createdAt: number;
  completedAt?: number;
}

export class GeminiLessonService {
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
   * 1. Analyze Conversation: extracts new taught knowledge, mistakes, gaps, and suggests next lesson
   */
  public async analyzeSession(sessionId: string): Promise<any> {
    const messages = db.prepare(`
      SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC
    `).all(sessionId) as any[];

    if (!messages || messages.length === 0) {
      throw new Error('Chưa có tin nhắn nào trong phiên hội thoại này để phân tích.');
    }

    const conversationText = messages
      .map(m => `${m.sender === 'user' ? 'Học viên' : 'Giáo viên AI'}: ${m.text} ${m.translation_vi ? `(${m.translation_vi})` : ''}`)
      .join('\n');

    // Retrieve current learner context from SQLite
    const profile = (db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any) || {};
    const existingVocab = (db.prepare('SELECT simplified, mastery_level FROM vocabulary_memory').all() as any[]) || [];
    const existingGrammar = (db.prepare('SELECT pattern_name, mastery_level FROM grammar_memory').all() as any[]) || [];
    const pendingErrors = (db.prepare("SELECT title, user_sentence, corrected_sentence FROM learning_errors WHERE status != 'resolved' LIMIT 5").all() as any[]) || [];

    const prompt = `
Bạn là Trưởng bộ môn Sư phạm Tiếng Trung & Chuyên gia Phân tích Tiến trình Học viên.
Nhiệm vụ: Phân tích sâu cuộc hội thoại vừa diễn ra giữa Giáo viên AI và Học viên để cập nhật BỘ NHỚ HỌC TẬP DÀI HẠN và ĐỀ XUẤT BÀI HỌC CÁ NHÂN HÓA.

=== THÔNG TIN NGƯỜI HỌC ===
- Cấp độ HSK hiện tại: HSK ${profile.current_hsk || 1} (Mục tiêu: HSK ${profile.target_hsk || 3})
- Điểm yếu đã biết: ${profile.weaknesses_json || 'Chưa có'}
- Lỗi sai đang theo dõi: ${JSON.stringify(pendingErrors)}
- Từ vựng đã có trong bộ nhớ: ${existingVocab.map(v => `${v.simplified}(${v.mastery_level})`).slice(0, 30).join(', ')}
- Ngữ pháp đã có trong bộ nhớ: ${existingGrammar.map(g => `${g.pattern_name}`).join(', ')}

=== NỘI DUNG CUỘC TRÒ CHUYỆN ===
${conversationText}

=== QUY TẮC PHÂN TÍCH NGHIÊM NGẶT ===
1. CHỈ trích xuất vào "newVocabTaught" những từ vựng mà Giáo viên AI THỰC SỰ ĐÃ GIẢNG GIẢI / GIỚI THIỆU / HƯỚNG DẪN trong buổi này. Không tính các từ học viên đã biết từ trước hoặc từ xuất hiện tình cờ mà không được dạy.
2. Phân tích chi tiết câu sai của học viên vào "mistakesDetected" (gồm câu gốc sai, câu sửa đúng, và giải thích sư phạm tiếng Việt).
3. Đánh giá "knowledgeGaps" (những lỗ hổng ngữ pháp hoặc diễn đạt cần được học hoặc củng cố).
4. Đề xuất bài học tiếp theo: xác định rõ loại bài ('reinforce' nếu củng cố lỗi sai vừa gặp, 'review' nếu ôn tập, 'new' nếu bài mới, 'advanced' nếu nâng cao).

Hãy trả lời HOÀN TOÀN bằng định dạng JSON thuần túy (không markdown, không bọc trong \`\`\`json):
{
  "summaryVi": "Tóm tắt ngắn gọn buổi học và tương tác...",
  "topics": ["Chủ đề 1", "Chủ đề 2"],
  "newVocabTaught": [
    {
      "simplified": "Chữ Hán",
      "traditional": "Chữ Phồn thể",
      "pinyin": "pinyin có dấu",
      "meaningVi": "nghĩa tiếng Việt",
      "wordType": "danh từ/động từ/tính từ",
      "exampleZh": "Câu ví dụ tiếng Trung",
      "exampleVi": "Nghĩa câu ví dụ"
    }
  ],
  "grammarTaught": [
    {
      "patternName": "Tên cấu trúc ngữ pháp",
      "formula": "Công thức ngữ pháp",
      "meaningVi": "Ý nghĩa tiếng Việt",
      "usageNotes": "Cách sử dụng và lưu ý",
      "exampleZh": "Ví dụ tiếng Trung",
      "exampleVi": "Nghĩa ví dụ"
    }
  ],
  "mistakesDetected": [
    {
      "errorType": "vocabulary/word_order/particle/grammar/pronunciation",
      "title": "Tên lỗi ngắn gọn",
      "userSentence": "Câu học viên nói sai",
      "correctedSentence": "Câu sửa đúng chuẩn",
      "explanationVi": "Giải thích cặn kẽ tại sao sai và cách khắc phục"
    }
  ],
  "correctExpressions": ["Câu nói hay học viên đã dùng đúng"],
  "knowledgeGaps": ["Điểm còn yếu 1", "Điểm còn yếu 2"],
  "suggestedLesson": {
    "topic": "Tên chủ đề bài học đề xuất",
    "lessonType": "reinforce/review/new/advanced/error_correction",
    "recommendationReason": "Lý do AI đề xuất bài này dựa trên hội thoại vừa rồi",
    "hskLevel": ${profile.current_hsk || 1}
  }
}
`;

    const client = this.getClient();
    const res = await client.models.generateContent({
      model: this.getModel(),
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = res.text?.trim() || '{}';
    let analysis: any;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      analysis = JSON.parse(clean);
    }

    const now = Date.now();

    // 1. Update Vocabulary Memory (Persistent SQLite)
    const insertVocab = db.prepare(`
      INSERT INTO vocabulary_memory (simplified, traditional, pinyin, meaning_vi, word_type, hsk_level, examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level, source_session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'introduced', ?)
      ON CONFLICT(simplified) DO UPDATE SET
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = vocabulary_memory.review_count + 1,
        meaning_vi = COALESCE(excluded.meaning_vi, vocabulary_memory.meaning_vi)
    `);

    for (const v of analysis.newVocabTaught || []) {
      if (v.simplified) {
        insertVocab.run(
          v.simplified,
          v.traditional || v.simplified,
          v.pinyin || '',
          v.meaningVi || '',
          v.wordType || 'từ vựng',
          profile.current_hsk || 1,
          JSON.stringify([`${v.exampleZh || ''} (${v.exampleVi || ''})`]),
          now,
          now,
          sessionId
        );
      }
    }

    // 2. Update Grammar Memory
    const insertGrammar = db.prepare(`
      INSERT INTO grammar_memory (pattern_name, formula, meaning_vi, usage_notes, hsk_level, examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'introduced')
      ON CONFLICT(pattern_name) DO UPDATE SET
        last_reviewed_at = excluded.last_reviewed_at,
        review_count = grammar_memory.review_count + 1
    `);

    for (const g of analysis.grammarTaught || []) {
      if (g.patternName) {
        insertGrammar.run(
          g.patternName,
          g.formula || '',
          g.meaningVi || '',
          g.usageNotes || '',
          profile.current_hsk || 1,
          JSON.stringify([`${g.exampleZh || ''} (${g.exampleVi || ''})`]),
          now,
          now
        );
      }
    }

    // 3. Update Learning Errors
    const insertError = db.prepare(`
      INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status)
      VALUES (?, ?, ?, ?, ?, 1, ?, 'pending')
    `);

    for (const err of analysis.mistakesDetected || []) {
      if (err.title && err.userSentence) {
        // Check if existing error with similar title
        const existing = db.prepare('SELECT id, occurrence_count FROM learning_errors WHERE title = ?').get(err.title) as any;
        if (existing) {
          db.prepare("UPDATE learning_errors SET occurrence_count = occurrence_count + 1, last_occurred_at = ?, status = 'pending' WHERE id = ?")
            .run(now, existing.id);
        } else {
          insertError.run(
            err.errorType || 'grammar',
            err.title,
            err.userSentence,
            err.correctedSentence || '',
            err.explanationVi || '',
            now
          );
        }
      }
    }

    // 4. Save Conversation Analysis
    db.prepare(`
      INSERT INTO conversation_analyses (session_id, summary_vi, topics_json, new_vocab_taught_json, grammar_taught_json, correct_expressions_json, mistakes_detected_json, knowledge_gaps_json, recommended_next_step, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      analysis.summaryVi || '',
      JSON.stringify(analysis.topics || []),
      JSON.stringify(analysis.newVocabTaught || []),
      JSON.stringify(analysis.grammarTaught || []),
      JSON.stringify(analysis.correctExpressions || []),
      JSON.stringify(analysis.mistakesDetected || []),
      JSON.stringify(analysis.knowledgeGaps || []),
      analysis.suggestedLesson?.recommendationReason || '',
      now
    );

    return {
      success: true,
      data: analysis
    };
  }

  /**
   * 2. Generate Personalized Lesson with Anti-Duplication Engine
   */
  public async generateLesson(options: {
    topic?: string;
    lessonType?: 'new' | 'review' | 'reinforce' | 'advanced' | 'error_correction';
    hskLevel?: number;
    customRequest?: string;
    sessionId?: string;
  }): Promise<GeneratedLesson> {
    const profile = (db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any) || {};
    const hsk = options.hskLevel || profile.current_hsk || 1;

    // Check existing lessons for anti-duplication
    const existingLessons = db.prepare('SELECT id, title, lesson_type, recommendation_reason FROM generated_lessons ORDER BY created_at DESC LIMIT 10').all() as any[];
    const recentErrors = db.prepare("SELECT title, user_sentence, corrected_sentence, explanation_vi FROM learning_errors WHERE status != 'resolved' ORDER BY last_occurred_at DESC LIMIT 3").all() as any[];
    const needsReviewVocab = db.prepare("SELECT simplified, pinyin, meaning_vi FROM vocabulary_memory WHERE mastery_level = 'needs_review' OR mastery_level = 'learning' LIMIT 6").all() as any[];

    // Determine actual lesson type with Anti-Duplication check
    let resolvedLessonType = options.lessonType || 'new';
    let targetTopic = options.topic || '';

    if (targetTopic) {
      // Check if this topic was already taught
      const isDuplicate = existingLessons.some(l => l.title.toLowerCase().includes(targetTopic.toLowerCase()));
      if (isDuplicate) {
        if (resolvedLessonType === 'new') {
          // Anti-duplication transformation: convert to reinforcement or review
          resolvedLessonType = 'reinforce';
        }
      }
    } else if (recentErrors.length > 0 && Math.random() > 0.4) {
      // Prioritize unresolved errors
      resolvedLessonType = 'reinforce';
      targetTopic = `Khắc phục lỗi: ${recentErrors[0].title}`;
    }

    const prompt = `
Bạn là Giảng viên Cao cấp biên soạn giáo trình tiếng Trung cá nhân hóa.
Nhiệm vụ: Tạo một BÀI HỌC TOÀN DIỆN VÀ TƯƠNG TÁC CAO dành riêng cho học viên dựa trên hồ sơ học tập và cơ chế chống trùng lặp.

=== HỒ SƠ HỌC VIÊN ===
- Trình độ: HSK ${hsk}
- Mục tiêu: HSK ${profile.target_hsk || 3}
- Loại bài học cần tạo: ${resolvedLessonType.toUpperCase()} (new = bài mới, reinforce = củng cố lỗi sai, review = ôn tập củng cố, advanced = nâng cao, error_correction = sửa lỗi)
- Chủ đề ưu tiên: ${targetTopic || 'Tự động chọn theo điểm yếu cần cải thiện nhất'}
- Yêu cầu đặc biệt từ người học: ${options.customRequest || 'Không có'}

=== DỮ LIỆU BỘ NHỚ CẦN KẾ THỪA & CHỐNG TRÙNG LẶP ===
- Các bài học AI ĐÃ TẠO GẦN ĐÂY: ${existingLessons.map(l => `"${l.title}" (${l.lesson_type})`).join('; ') || 'Chưa có'}
- Lỗi sai học viên đang gặp: ${JSON.stringify(recentErrors)}
- Từ vựng đang cần ôn: ${needsReviewVocab.map(v => `${v.simplified} [${v.pinyin}]: ${v.meaning_vi}`).join(', ') || 'Chưa có'}

=== YÊU CẦU BÀI HỌC ===
1. TIÊU ĐỀ: Đặt tên sinh động, nêu rõ trọng tâm ngữ pháp/giao tiếp (ví dụ: "Làm Chủ Cấu Trúc 怎么 vs 为什么 Khi Đi Nhà Hàng").
2. LÝ DO ĐỀ XUẤT: Giải thích vì sao bài này quan trọng với học viên ở thời điểm hiện tại.
3. GIẢI THÍCH SƯ PHẠM: Viết bằng tiếng Việt dễ hiểu, phân tích chi tiết mẹo phân biệt của người bản xứ và các bẫy người Việt hay mắc phải.
4. TỪ VỰNG MỤC TIÊU: 4 - 6 từ trọng tâm với chữ Hán, Pinyin chuẩn, nghĩa tiếng Việt, và ví dụ.
5. NGỮ PHÁP MỤC TIÊU: 1 - 2 cấu trúc then chốt với công thức rõ ràng, ví dụ đúng và cảnh báo câu sai.
6. HỘI THOẠI MINH HỌA: Đoạn hội thoại 4 - 6 lượt lời giữa A và B thực tế đời sống.
7. BÀI TẬP TƯƠNG TÁC: Tạo đúng 4 BÀI TẬP thuộc các dạng:
   - "quiz": Trắc nghiệm 4 lựa chọn (options: ["A...", "B...", "C...", "D..."], answer: "chính xác lựa chọn đúng").
   - "fill_blank": Điền từ còn thiếu vào câu (question: "... có dấu ___ ...", options: 4 từ gợi ý, answer: "từ đúng").
   - "reorder": Sắp xếp các cụm từ xáo trộn thành câu đúng (question: "cho các từ ngăn cách bởi dấu /", answer: "câu hoàn chỉnh").
   - "translate": Dịch câu tiếng Việt sang tiếng Trung hoặc ngược lại.
8. BÀI KIỂM TRA CUỐI BÀI (QUIZ): 2 câu hỏi kiểm tra độ hiểu sâu (options: 4 lựa chọn, answer, explanation).

Trả về định dạng JSON thuần túy (không markdown, không bọc trong \`\`\`json):
{
  "title": "Tiêu đề bài học",
  "lessonType": "${resolvedLessonType}",
  "hskLevel": ${hsk},
  "estimatedMinutes": 15,
  "recommendationReason": "Lý do AI đề xuất bài này...",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"],
  "knowledgePoints": ["Điểm kiến thức 1", "Điểm kiến thức 2"],
  "explanationVi": "Phần giảng giải ngữ pháp chi tiết bằng tiếng Việt...",
  "content": {
    "vocabulary": [
      {
        "simplified": "汉字",
        "pinyin": "hànzì",
        "meaningVi": "chữ Hán",
        "wordType": "danh từ",
        "exampleZh": "Câu ví dụ",
        "examplePinyin": "Câu ví dụ pinyin",
        "exampleVi": "Nghĩa câu ví dụ"
      }
    ],
    "grammar": [
      {
        "patternName": "Tên cấu trúc",
        "formula": "Công thức",
        "meaningVi": "Ý nghĩa",
        "explanation": "Giải thích chi tiết",
        "goodExample": "Ví dụ đúng",
        "badExample": "Ví dụ sai thường gặp"
      }
    ],
    "dialogue": [
      { "speaker": "A", "zh": "你好！", "pinyin": "Nǐ hǎo!", "vi": "Chào bạn!" },
      { "speaker": "B", "zh": "你好！很高兴认识你。", "pinyin": "Nǐ hǎo! Hěn gāoxìng rènshí nǐ.", "vi": "Chào bạn! Rất vui được quen bạn." }
    ]
  },
  "exercises": [
    {
      "id": "ex_1",
      "type": "quiz",
      "question": "Câu hỏi trắc nghiệm?",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "answer": "Đáp án đúng",
      "explanation": "Giải thích vì sao đúng/sai",
      "hint": "Gợi ý"
    },
    {
      "id": "ex_2",
      "type": "fill_blank",
      "question": "Câu có chỗ trống ___ cần điền",
      "options": ["từ A", "từ B", "từ C", "từ D"],
      "answer": "từ đúng",
      "explanation": "Giải thích...",
      "hint": "Gợi ý"
    },
    {
      "id": "ex_3",
      "type": "reorder",
      "question": "Sắp xếp: từ 1 / từ 2 / từ 3 / từ 4",
      "options": ["từ 1", "từ 2", "từ 3", "từ 4"],
      "answer": "từ 1 từ 2 từ 3 từ 4",
      "explanation": "Giải thích cấu trúc ngữ pháp...",
      "hint": "Nhớ vị trí thời gian trước động từ"
    },
    {
      "id": "ex_4",
      "type": "translate",
      "question": "Dịch sang tiếng Trung: Bạn đi bằng cách nào?",
      "options": ["你为什么去？", "你怎么去？", "你去哪里？", "你什么时候去？"],
      "answer": "你怎么去？",
      "explanation": "Hỏi phương thức dùng 怎么...",
      "hint": "Dùng đại từ 怎么"
    }
  ],
  "quiz": [
    {
      "id": "q_1",
      "question": "Câu hỏi kiểm tra cuối bài 1?",
      "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
      "answer": "Lựa chọn đúng",
      "explanation": "Giải thích chi tiết"
    },
    {
      "id": "q_2",
      "question": "Câu hỏi kiểm tra cuối bài 2?",
      "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
      "answer": "Lựa chọn đúng",
      "explanation": "Giải thích chi tiết"
    }
  ]
}
`;

    const client = this.getClient();
    const res = await client.models.generateContent({
      model: this.getModel(),
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = res.text?.trim() || '{}';
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      data = JSON.parse(clean);
    }

    const lessonId = `lesson_${Date.now()}`;
    const now = Date.now();

    const lesson: GeneratedLesson = {
      id: lessonId,
      title: data.title || 'Bài học tiếng Trung cá nhân hóa',
      lessonType: (data.lessonType as any) || resolvedLessonType,
      hskLevel: data.hskLevel || hsk,
      estimatedMinutes: data.estimatedMinutes || 15,
      recommendationReason: data.recommendationReason || 'Bài học được tạo dựa trên phân tích tiến độ cá nhân của bạn.',
      objectives: data.objectives || [],
      knowledgePoints: data.knowledgePoints || [],
      explanationVi: data.explanationVi || '',
      content: data.content || { vocabulary: [], grammar: [], dialogue: [] },
      exercises: data.exercises || [],
      quiz: data.quiz || [],
      status: 'unstarted',
      createdAt: now
    };

    // Save into SQLite
    db.prepare(`
      INSERT INTO generated_lessons (
        id, title, lesson_type, hsk_level, estimated_minutes, recommendation_reason,
        objectives_json, knowledge_points_json, explanation_vi, content_json,
        exercises_json, quiz_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unstarted', ?)
    `).run(
      lesson.id,
      lesson.title,
      lesson.lessonType,
      lesson.hskLevel,
      lesson.estimatedMinutes,
      lesson.recommendationReason,
      JSON.stringify(lesson.objectives),
      JSON.stringify(lesson.knowledgePoints),
      lesson.explanationVi,
      JSON.stringify(lesson.content),
      JSON.stringify(lesson.exercises),
      JSON.stringify(lesson.quiz),
      now
    );

    return lesson;
  }

  /**
   * 3. Complete Lesson: Grades user submissions, updates mastery, and resolves related mistakes
   */
  public async completeLesson(lessonId: string, submission: { userAnswers: Record<string, string>; timeSpentSeconds?: number }): Promise<any> {
    const row = db.prepare('SELECT * FROM generated_lessons WHERE id = ?').get(lessonId) as any;
    if (!row) {
      throw new Error(`Không tìm thấy bài học có mã ${lessonId}`);
    }

    const exercises = JSON.parse(row.exercises_json || '[]');
    const quiz = JSON.parse(row.quiz_json || '[]');
    const content = JSON.parse(row.content_json || '{}');
    const allQuestions = [...exercises, ...quiz];

    let correctCount = 0;
    const gradingDetails: Array<{ id: string; question: string; userAnswer: string; correctAnswer: string; isCorrect: boolean; explanation: string }> = [];

    for (const q of allQuestions) {
      const userAns = (submission.userAnswers[q.id] || '').trim().toLowerCase();
      const correctAns = (q.answer || '').trim().toLowerCase();

      // Check match
      const isCorrect = userAns === correctAns || userAns.includes(correctAns) || (correctAns.length > 2 && userAns.replace(/\s+/g, '') === correctAns.replace(/\s+/g, ''));
      if (isCorrect) correctCount++;

      gradingDetails.push({
        id: q.id,
        question: q.question,
        userAnswer: submission.userAnswers[q.id] || '(Chưa làm)',
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation || ''
      });
    }

    const totalQuestions = allQuestions.length || 1;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const now = Date.now();
    const passed = score >= 70;

    // Update lesson status in SQLite
    db.prepare(`
      UPDATE generated_lessons
      SET status = 'completed', score = ?, completed_at = ?
      WHERE id = ?
    `).run(score, now, lessonId);

    // Update learner profile total study time
    const minutesAdded = Math.max(1, Math.round((submission.timeSpentSeconds || 600) / 60));
    db.prepare(`
      UPDATE learner_profile
      SET total_study_minutes = total_study_minutes + ?, updated_at = ?
      WHERE id = 'default'
    `).run(minutesAdded, now);

    // POST-LESSON MEMORY SYNCHRONIZATION
    // 1. Vocabulary Mastery
    if (content.vocabulary && Array.isArray(content.vocabulary)) {
      const updateVocabMastery = db.prepare(`
        UPDATE vocabulary_memory
        SET review_count = review_count + 1,
            last_reviewed_at = ?,
            mastery_level = CASE
              WHEN ? >= 85 THEN 'mastered'
              WHEN ? >= 70 THEN 'fair'
              ELSE 'needs_review'
            END
        WHERE simplified = ?
      `);

      for (const v of content.vocabulary) {
        if (v.simplified) {
          updateVocabMastery.run(now, score, score, v.simplified);
        }
      }
    }

    // 2. Grammar Mastery
    if (content.grammar && Array.isArray(content.grammar)) {
      const updateGrammarMastery = db.prepare(`
        UPDATE grammar_memory
        SET review_count = review_count + 1,
            last_reviewed_at = ?,
            mastery_level = CASE
              WHEN ? >= 80 THEN 'mastered'
              WHEN ? >= 60 THEN 'fair'
              ELSE 'learning'
            END
        WHERE pattern_name = ?
      `);

      for (const g of content.grammar) {
        if (g.patternName) {
          updateGrammarMastery.run(now, score, score, g.patternName);
        }
      }
    }

    // 3. Mark related errors as resolved if score is high
    if (score >= 80 && row.lesson_type === 'reinforce') {
      db.prepare(`
        UPDATE learning_errors
        SET status = 'resolved', resolved_at = ?
        WHERE status != 'resolved' AND last_occurred_at <= ?
      `).run(now, now);
    }

    return {
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      gradingDetails,
      feedbackVi: score >= 85
        ? 'Xuất sắc! Bạn đã nắm rất vững kiến thức bài học này và hoàn thành xuất sắc các bài tập.'
        : score >= 70
        ? 'Khá tốt! Bạn đã hiểu phần lớn nội dung, chỉ cần chú ý thêm một số điểm giải thích ở câu làm sai.'
        : 'Cần cố gắng thêm! Bạn nên xem lại phần giải thích ngữ pháp và làm lại bài kiểm tra để củng cố.'
    };
  }

  /**
   * 4. Simplify Lesson: Generates a clearer, easier explanation version
   */
  public async simplifyLesson(lessonId: string): Promise<string> {
    const row = db.prepare('SELECT title, explanation_vi, content_json FROM generated_lessons WHERE id = ?').get(lessonId) as any;
    if (!row) throw new Error('Không tìm thấy bài học.');

    const prompt = `
Bạn là giáo viên dạy tiếng Trung chuyên đơn giản hóa kiến thức khó cho người mới bắt đầu.
Dưới đây là phần giải thích bài học "${row.title}":
${row.explanation_vi}

Nhiệm vụ: Viết lại phần giải thích trên theo cách:
1. Đơn giản, ngắn gọn, dễ hiểu hơn nữa.
2. Dùng phép so sánh gần gũi với tiếng Việt.
3. Chia thành từng bước 1-2-3 dễ nhớ.
4. Có ví dụ minh họa trực quan.
`;

    const client = this.getClient();
    const res = await client.models.generateContent({
      model: this.getModel(),
      contents: prompt
    });

    const simplifiedText = res.text?.trim() || '';
    db.prepare('UPDATE generated_lessons SET explanation_vi = ? WHERE id = ?').run(simplifiedText, lessonId);
    return simplifiedText;
  }
}

export const geminiLessonService = new GeminiLessonService();
