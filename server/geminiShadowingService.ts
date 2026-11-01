import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import { SEED_SHADOWING_LESSONS, ShadowingLessonItem } from '../src/data/seedShadowing.js';

export interface ShadowingEvaluationInput {
  lessonId: string;
  chunkId?: string;
  targetText: string;
  targetPinyin: string;
  mode: 'echo' | 'delayed' | 'simultaneous' | 'listen_repeat' | 'full_passage' | 'no_subtitle';
  practiceStep: number; // 1-6
  spokenTranscript: string;
  audioDurationMs: number;
  expectedDurationMs?: number;
  speedUsed: number;
}

export interface ShadowingEvaluationResult {
  recordId: string;
  lessonId: string;
  chunkId?: string;
  targetText: string;
  targetPinyin: string;
  spokenTranscript: string;
  score: number; // 0 - 100
  fluencyScore: number;
  accuracyScore: number;
  isMatch: boolean;
  accuracyGrade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  audioMetrics: {
    durationMs: number;
    expectedDurationMs: number;
    durationRatio: number;
    speedPacing: 'too_fast' | 'natural' | 'too_slow';
    durationAssessment: string;
  };
  chunkAnalysis: Array<{
    char: string;
    pinyin: string;
    status: 'correct' | 'substituted' | 'omitted';
    spokenChar?: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  flaggedSounds: string[]; // e.g. ['zh', 'ch', 'tone_3'] -> for 1-click jump to Pronunciation Lab
  feedbackVi: string;
  fluencyTipsVi: string;
}

export class GeminiShadowingService {
  constructor() {
    this.ensureSeedLessons();
  }

  /**
   * Đảm bảo các bài học seed cho 7 cấp độ được khởi tạo trong SQLite
   */
  public ensureSeedLessons(): void {
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM shadowing_lessons').get() as any;
      if (countRow?.count === 0) {
        const now = Date.now();
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO shadowing_lessons (
            id, title, level, hsk_level, topic, difficulty, recommended_speed,
            full_zh, full_pinyin, full_vi, dialogue_roles_json, chunks_json,
            comprehension_questions_json, source, target_weaknesses_json,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const lesson of SEED_SHADOWING_LESSONS) {
          insertStmt.run(
            lesson.id,
            lesson.title,
            lesson.level,
            lesson.hskLevel,
            lesson.topic,
            lesson.difficulty,
            lesson.recommendedSpeed,
            lesson.fullZh,
            lesson.fullPinyin,
            lesson.fullVi,
            lesson.dialogueRoles ? JSON.stringify(lesson.dialogueRoles) : null,
            JSON.stringify(lesson.chunks),
            JSON.stringify(lesson.comprehensionQuestions),
            'seed',
            JSON.stringify(lesson.targetWeaknesses),
            now,
            now
          );
        }
      }
    } catch (err) {
      console.warn('Seed shadowing lessons notice:', err);
    }
  }

  /**
   * Lấy danh sách các bài luyện Shadowing theo bộ lọc
   */
  public getLessons(filters?: { level?: number; hskLevel?: number; topic?: string }): ShadowingLessonItem[] {
    this.ensureSeedLessons();

    let query = 'SELECT * FROM shadowing_lessons WHERE 1=1';
    const params: any[] = [];

    if (filters?.level) {
      query += ' AND level = ?';
      params.push(filters.level);
    }
    if (filters?.hskLevel) {
      query += ' AND hsk_level = ?';
      params.push(filters.hskLevel);
    }
    if (filters?.topic) {
      query += ' AND topic LIKE ?';
      params.push(`%${filters.topic}%`);
    }

    query += ' ORDER BY level ASC, hsk_level ASC, created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      title: r.title,
      level: r.level,
      levelName: `Cấp độ ${r.level}`,
      hskLevel: r.hsk_level,
      topic: r.topic,
      difficulty: r.difficulty,
      recommendedSpeed: r.recommended_speed,
      fullZh: r.full_zh,
      fullPinyin: r.full_pinyin,
      fullVi: r.full_vi,
      dialogueRoles: r.dialogue_roles_json ? JSON.parse(r.dialogue_roles_json) : undefined,
      chunks: JSON.parse(r.chunks_json || '[]'),
      comprehensionQuestions: JSON.parse(r.comprehension_questions_json || '[]'),
      targetWeaknesses: JSON.parse(r.target_weaknesses_json || '[]'),
      tipsVi: `Luyện nhại ở mức độ ${r.level} với tốc độ khuyến nghị ${r.recommended_speed}x.`
    }));
  }

  /**
   * Lấy chi tiết bài luyện Shadowing theo ID
   */
  public getLessonById(id: string): ShadowingLessonItem | null {
    this.ensureSeedLessons();

    const row = db.prepare('SELECT * FROM shadowing_lessons WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      level: row.level,
      levelName: `Cấp độ ${row.level}`,
      hskLevel: row.hsk_level,
      topic: row.topic,
      difficulty: row.difficulty,
      recommendedSpeed: row.recommended_speed,
      fullZh: row.full_zh,
      fullPinyin: row.full_pinyin,
      fullVi: row.full_vi,
      dialogueRoles: row.dialogue_roles_json ? JSON.parse(row.dialogue_roles_json) : undefined,
      chunks: JSON.parse(row.chunks_json || '[]'),
      comprehensionQuestions: JSON.parse(row.comprehension_questions_json || '[]'),
      targetWeaknesses: JSON.parse(row.target_weaknesses_json || '[]'),
      tipsVi: `Luyện nhại theo mẫu với tốc độ chuẩn ${row.recommended_speed}x.`
    };
  }

  /**
   * Đánh giá trung thực 3 lớp cho buổi luyện Shadowing:
   * 1. Âm học thời lượng & nhịp điệu (Acoustic Duration & Pacing)
   * 2. Nhận diện phiên âm ASR & độ liền mạch
   * 3. Nhận xét sư phạm AI & Phát hiện điểm yếu cần luyện tại Phòng phát âm
   */
  public async evaluate(input: ShadowingEvaluationInput): Promise<ShadowingEvaluationResult> {
    const now = Date.now();
    const recordId = `sh_rec_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const cleanTarget = input.targetText.trim().replace(/[.,?!，。？！\s]/g, '');
    const cleanSpoken = (input.spokenTranscript || '').trim().replace(/[.,?!，。？！\s]/g, '');

    // 1. Phân tích âm học thời lượng thực tế (Acoustic Metrics)
    const charCount = Math.max(1, cleanTarget.length);
    const speedFactor = input.speedUsed || 1.0;
    const baseDuration = (charCount * 380 + 200) / speedFactor;
    const expectedDurationMs = input.expectedDurationMs || Math.round(baseDuration);
    const actualDurationMs = Math.max(150, input.audioDurationMs);
    const durationRatio = actualDurationMs / Math.max(100, expectedDurationMs);

    let speedPacing: 'too_fast' | 'natural' | 'too_slow' = 'natural';
    let durationAssessment = 'Nhịp điệu Shadowing tự nhiên, thời lượng nói ăn khớp với câu mẫu.';

    if (durationRatio < 0.65) {
      speedPacing = 'too_fast';
      durationAssessment = 'Nói hơi vội hoặc nuốt chữ, hãy ngân đủ nguyên âm và nhả chữ rõ ràng hơn.';
    } else if (durationRatio > 1.6) {
      speedPacing = 'too_slow';
      durationAssessment = 'Tốc độ hơi chậm hoặc có chỗ ngập ngừng giữa các cụm nghĩa, hãy bắt nhịp nhanh hơn.';
    }

    // 2. So khớp ký tự & độ chuẩn xác phiên âm ASR
    const chunkAnalysis: ShadowingEvaluationResult['chunkAnalysis'] = [];
    let matchCharsCount = 0;

    for (let i = 0; i < cleanTarget.length; i++) {
      const targetChar = cleanTarget[i];
      const spokenChar = cleanSpoken[i];

      if (spokenChar === targetChar) {
        matchCharsCount++;
        chunkAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'correct',
          spokenChar
        });
      } else if (spokenChar) {
        chunkAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'substituted',
          spokenChar
        });
      } else {
        chunkAnalysis.push({
          char: targetChar,
          pinyin: '',
          status: 'omitted'
        });
      }
    }

    const accuracyScore = Math.round((matchCharsCount / Math.max(1, cleanTarget.length)) * 100);

    // Tính điểm lưu loát (Fluency) dựa trên tỷ lệ nhịp điệu và độ dài
    let fluencyScore = 100;
    if (speedPacing === 'too_fast' || speedPacing === 'too_slow') {
      const dev = Math.abs(durationRatio - 1.0);
      fluencyScore = Math.max(40, Math.round(100 - dev * 45));
    }
    if (!cleanSpoken) {
      fluencyScore = 20;
    }

    const overallScore = Math.round(accuracyScore * 0.65 + fluencyScore * 0.35);
    const isMatch = accuracyScore >= 75 && speedPacing === 'natural';

    let accuracyGrade: ShadowingEvaluationResult['accuracyGrade'] = 'needs_improvement';
    if (overallScore >= 85) accuracyGrade = 'excellent';
    else if (overallScore >= 70) accuracyGrade = 'good';
    else if (overallScore >= 50) accuracyGrade = 'fair';

    // 3. Nhận diện các âm có thể gặp lỗi (để tạo cầu nối sang Phòng luyện phát âm)
    const flaggedSounds: string[] = [];
    const pinyinLower = input.targetPinyin.toLowerCase();
    const phoneticKeyPairs: Array<{ key: string; name: string }> = [
      { key: 'zh', name: 'Âm uốn lưỡi zh' },
      { key: 'ch', name: 'Âm uốn lưỡi bật hơi ch' },
      { key: 'sh', name: 'Âm uốn lưỡi sh' },
      { key: 'z', name: 'Âm thẳng lưỡi z' },
      { key: 'c', name: 'Âm thẳng lưỡi bật hơi c' },
      { key: 's', name: 'Âm răng trước s' },
      { key: 'j', name: 'Âm mặt lưỡi j' },
      { key: 'q', name: 'Âm mặt lưỡi bật hơi q' },
      { key: 'x', name: 'Âm mặt lưỡi x' },
      { key: 'ü', name: 'Nguyên âm tròn môi ü' },
      { key: 'er', name: 'Vận mẫu uốn lưỡi er' }
    ];

    for (const item of phoneticKeyPairs) {
      if (pinyinLower.includes(item.key) && overallScore < 80) {
        flaggedSounds.push(item.key);
      }
    }

    // 4. Nhận xét sư phạm bằng Gemini AI hoặc bộ quy tắc chuẩn mực
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    let feedbackVi = '';
    let fluencyTipsVi = '';

    const apiKey = geminiTextService.getApiKey();
    if (apiKey && cleanSpoken && overallScore < 95) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia sư phạm tiếng Trung hỗ trợ học viên luyện nói nhại (Shadowing Practice).
Hãy phân tích kết quả nói nhại của học viên:
- Câu mẫu: "${input.targetText}" (${input.targetPinyin})
- Học viên nói: "${input.spokenTranscript}"
- Chế độ luyện: ${input.mode} (Tốc độ: ${input.speedUsed}x)
- Điểm chuẩn xác ký tự: ${accuracyScore}/100, Điểm lưu loát nhịp điệu: ${fluencyScore}/100
- Thời lượng nói: ${actualDurationMs}ms (Chuẩn: ~${expectedDurationMs}ms)

Xuất JSON:
{
  "feedbackVi": "Nhận xét khách quan, ngắn gọn (1-2 câu) về độ chuẩn âm và nhịp ngắt ý群",
  "fluencyTipsVi": "Lời khuyên kỹ thuật cải thiện phản xạ và giữ hơi",
  "strengths": ["Điểm làm tốt 1"],
  "weaknesses": ["Điểm cần khắc phục 1"]
}`;

        const startShadowCall = Date.now();
        const targetModel = geminiTextService.getModel();
        const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
          targetModel,
          'Bạn là chuyên gia phân tích ngữ điệu Shadowing tiếng Trung của Halo Chinese. Chỉ trả về JSON thuần túy.',
          prompt,
          'json',
          0.3,
          20000,
          1
        );
        unifiedAIOrchestrator.logAudit({
          requestId: `req_shadow_eval_${Date.now()}`,
          taskId: 'EVALUATE_SHADOWING',
          modelCategory: 'text_out',
          modelId: targetModel,
          promptVersion: 'v2.8.0',
          status: 'completed',
          latencyMs: Date.now() - startShadowCall
        });

        if (cleanJson) {
          const parsed = JSON.parse(cleanJson);
          feedbackVi = parsed.feedbackVi || '';
          fluencyTipsVi = parsed.fluencyTipsVi || '';
          if (Array.isArray(parsed.strengths)) strengths.push(...parsed.strengths);
          if (Array.isArray(parsed.weaknesses)) weaknesses.push(...parsed.weaknesses);
        }
      } catch (err) {
        console.warn('AI Shadowing feedback notice:', err);
      }
    }

    // Fallback chuẩn mực nếu AI offline hoặc không có API key
    if (!feedbackVi) {
      if (overallScore >= 85) {
        feedbackVi = 'Khả năng bắt nhịp và nhại theo mẫu rất tốt! Ngữ điệu tự nhiên, không bị khựng giữa chừng.';
        fluencyTipsVi = 'Hãy thử thách ở tốc độ nhanh hơn (1.25x hoặc 1.5x) hoặc chuyển sang chế độ Ẩn phụ đề (No Subtitle).';
        strengths.push('Nhịp điệu hòa quyện với âm thanh bản xứ', 'Phát âm rõ ràng các âm tiết chính');
      } else if (!cleanSpoken) {
        feedbackVi = 'Hệ thống chưa nhận diện được giọng nói rõ ràng. Hãy kiểm tra lại micro hoặc nói to hơn.';
        fluencyTipsVi = 'Nghe lại câu mẫu ở tốc độ 0.75x trước, sau đó bấm ghi âm và nói ngay theo nhịp.';
        weaknesses.push('Cần tăng âm lượng và đọc gần microphone hơn');
      } else {
        feedbackVi = `Hệ thống ghi nhận bạn đã nói: "${cleanSpoken}". Chú ý giữ hơi đều đặn ở các chỗ ngắt ý群.`;
        fluencyTipsVi = 'Tập trung nhại theo giai điệu lên xuống của câu trước, đừng để việc nhìn chữ làm chậm phản xạ.';
        strengths.push('Đã hoàn thành lượt nói nhại đúng thời gian');
        weaknesses.push(`Có ${cleanTarget.length - matchCharsCount} ký tự chưa khớp với câu mẫu`);
      }
    }

    // 5. Lưu vào bảng SQLite `shadowing_practice_records`
    db.prepare(`
      INSERT INTO shadowing_practice_records (
        id, lesson_id, user_id, mode, practice_step,
        completed_chunks_count, total_chunks_count, speed_used,
        user_audio_duration_ms, score, fluency_score, accuracy_score,
        transcript, strengths_json, weaknesses_json, flagged_sounds_json,
        evaluation_feedback_vi, created_at
      ) VALUES (?, ?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      input.lessonId,
      input.mode,
      input.practiceStep,
      matchCharsCount,
      cleanTarget.length,
      input.speedUsed,
      actualDurationMs,
      overallScore,
      fluencyScore,
      accuracyScore,
      cleanSpoken,
      JSON.stringify(strengths),
      JSON.stringify(weaknesses),
      JSON.stringify(flaggedSounds),
      feedbackVi,
      now
    );

    // 6. Liên thông điểm yếu sang `pronunciation_weaknesses` nếu có flagged sounds
    if (flaggedSounds.length > 0 && overallScore < 75) {
      for (const soundKey of flaggedSounds) {
        try {
          const existing = db.prepare('SELECT id, error_count, practice_count FROM pronunciation_weaknesses WHERE sound_key = ?').get(soundKey) as any;
          if (existing) {
            db.prepare(`
              UPDATE pronunciation_weaknesses
              SET error_count = error_count + 1, practice_count = practice_count + 1, last_practiced_at = ?
              WHERE id = ?
            `).run(now, existing.id);
          } else {
            db.prepare(`
              INSERT INTO pronunciation_weaknesses (
                user_id, sound_key, sound_category, title, error_count, practice_count, mastery_level, last_practiced_at, created_at
              ) VALUES ('default', ?, 'initial', ?, 1, 1, 'struggling', ?, ?)
            `).run(soundKey, `Âm yếu phát hiện từ Shadowing (${soundKey})`, now, now);
          }
        } catch {}
      }
    }

    return {
      recordId,
      lessonId: input.lessonId,
      chunkId: input.chunkId,
      targetText: input.targetText,
      targetPinyin: input.targetPinyin,
      spokenTranscript: cleanSpoken,
      score: overallScore,
      fluencyScore,
      accuracyScore,
      isMatch,
      accuracyGrade,
      audioMetrics: {
        durationMs: actualDurationMs,
        expectedDurationMs,
        durationRatio: Math.round(durationRatio * 100) / 100,
        speedPacing,
        durationAssessment
      },
      chunkAnalysis,
      strengths,
      weaknesses,
      flaggedSounds,
      feedbackVi,
      fluencyTipsVi
    };
  }

  /**
   * AI tự động tạo bài Shadowing cá nhân hóa dựa trên điểm yếu và hồ sơ học viên
   */
  public async generatePersonalizedLesson(profileId: string = 'default'): Promise<{
    success: boolean;
    lesson: ShadowingLessonItem;
    message: string;
  }> {
    // 1. Kiểm tra điểm yếu từ SQLite
    const weaknessRows = db.prepare(`
      SELECT sound_key, title, error_count FROM pronunciation_weaknesses
      WHERE mastery_level IN ('struggling', 'learning')
      ORDER BY error_count DESC LIMIT 5
    `).all() as any[];

    const profileRow = db.prepare('SELECT current_hsk, target_hsk FROM learner_profile WHERE id = ?').get(profileId) as any;
    const currentHsk = profileRow?.current_hsk || 2;

    const weakSoundNames = weaknessRows.map(r => r.sound_key);
    const targetSounds = weakSoundNames.length > 0 ? weakSoundNames.slice(0, 3) : ['zh', 'ch', 'tone_3'];

    const now = Date.now();
    const lessonId = `sh_ai_${now}_${Math.random().toString(36).substring(2, 6)}`;

    const apiKey = geminiTextService.getApiKey();
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia thiết kế giáo trình nói nhại tiếng Trung (Chinese Shadowing).
Hãy tạo một bài luyện Shadowing cá nhân hóa dành riêng cho học viên:
- Trình độ: HSK ${currentHsk}
- Điểm yếu phát âm cần rèn luyện: ${targetSounds.join(', ')} (Đặc biệt chú ý âm uốn lưỡi, biến điệu hoặc thanh điệu)
- Yêu cầu: Ngắt câu thành các cụm ý nghĩa (meaningful thought groups / 意群) tự nhiên, không ngắt đôi từ vựng.

Yêu cầu xuất JSON format:
{
  "title": "Tiêu đề bài học tiếng Việt hấp dẫn",
  "level": 4,
  "topic": "Chủ đề bài học",
  "difficulty": "medium",
  "recommendedSpeed": 1.0,
  "fullZh": "Nội dung tiếng Trung hoàn chỉnh (chữ Hán giản thể, khoảng 30-50 chữ)",
  "fullPinyin": "Pinyin có dấu đầy đủ tương ứng",
  "fullVi": "Dịch nghĩa tiếng Việt chuẩn",
  "chunks": [
    {
      "id": "c1",
      "chunkZh": "Cụm ý nghĩa 1",
      "chunkPinyin": "Pinyin cụm 1",
      "chunkVi": "Nghĩa tiếng Việt cụm 1",
      "phoneticNotes": "Lưu ý phát âm cho cụm này",
      "orderIndex": 1
    }
  ],
  "comprehensionQuestions": [
    {
      "id": "q1",
      "questionVi": "Câu hỏi kiểm tra hiểu nội dung?",
      "options": ["Đáp án đúng", "Đáp án sai 1", "Đáp án sai 2", "Đáp án sai 3"],
      "answer": "Đáp án đúng",
      "explanationVi": "Giải thích chi tiết"
    }
  ]
}`;

        const startShadowCall = Date.now();
        const targetModel = geminiTextService.getModel();
        const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
          targetModel,
          'Bạn là chuyên gia thiết kế giáo trình Shadowing tiếng Trung của Halo Chinese. Chỉ trả về JSON thuần túy.',
          prompt,
          'json',
          0.3,
          25000,
          1
        );
        unifiedAIOrchestrator.logAudit({
          requestId: `req_shadow_gen_${Date.now()}`,
          taskId: 'GENERATE_SHADOWING_PASSAGE',
          modelCategory: 'text_out',
          modelId: targetModel,
          promptVersion: 'v2.8.0',
          status: 'completed',
          latencyMs: Date.now() - startShadowCall
        });

        if (cleanJson) {
          const parsed = JSON.parse(cleanJson);
          const newLesson: ShadowingLessonItem = {
            id: lessonId,
            title: parsed.title || `Luyện Nhại Chuyên Biệt (${targetSounds.join('/')})`,
            level: (parsed.level as any) || 4,
            levelName: `Cấp độ ${parsed.level || 4}`,
            hskLevel: currentHsk,
            topic: parsed.topic || 'Giao tiếp cá nhân hóa',
            difficulty: parsed.difficulty || 'medium',
            recommendedSpeed: parsed.recommendedSpeed || 1.0,
            fullZh: parsed.fullZh,
            fullPinyin: parsed.fullPinyin,
            fullVi: parsed.fullVi,
            chunks: parsed.chunks || [],
            comprehensionQuestions: parsed.comprehensionQuestions || [],
            targetWeaknesses: targetSounds,
            tipsVi: `Bài luyện AI được sinh dựa trên điểm yếu: ${targetSounds.join(', ')}.`
          };

          // Lưu vào SQLite
          db.prepare(`
            INSERT INTO shadowing_lessons (
              id, title, level, hsk_level, topic, difficulty, recommended_speed,
              full_zh, full_pinyin, full_vi, dialogue_roles_json, chunks_json,
              comprehension_questions_json, source, target_weaknesses_json,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_personalized', ?, ?, ?)
          `).run(
            newLesson.id,
            newLesson.title,
            newLesson.level,
            newLesson.hskLevel,
            newLesson.topic,
            newLesson.difficulty,
            newLesson.recommendedSpeed,
            newLesson.fullZh,
            newLesson.fullPinyin,
            newLesson.fullVi,
            null,
            JSON.stringify(newLesson.chunks),
            JSON.stringify(newLesson.comprehensionQuestions),
            JSON.stringify(newLesson.targetWeaknesses),
            now,
            now
          );

          return {
            success: true,
            lesson: newLesson,
            message: `AI đã tạo thành công bài luyện Shadowing cá nhân hóa khắc phục nhóm âm: ${targetSounds.join(', ')}!`
          };
        }
      } catch (err) {
        console.warn('AI generate Shadowing lesson notice:', err);
      }
    }

    // Fallback bài học template chất lượng cao
    const fallbackLesson: ShadowingLessonItem = {
      id: lessonId,
      title: `Luyện Nhại Âm Uốn Lưỡi zh/ch & Biến Điệu Thanh 3`,
      level: 4,
      levelName: 'Cấp độ 4: Luyện câu dài',
      hskLevel: currentHsk,
      topic: 'Học tập & Giao tiếp',
      difficulty: 'medium',
      recommendedSpeed: 1.0,
      fullZh: '我知道在图书馆里看中国小说非常有意思，所以我想请你明天和我一起去。',
      fullPinyin: 'Wǒ zhīdào zài túshūguǎn lǐ kàn Zhōngguó xiǎoshuō fēicháng yǒu yìsi, suǒyǐ wǒ xiǎng qǐng nǐ míngtiān hé wǒ yìqǐ qù.',
      fullVi: 'Tôi biết rằng đọc tiểu thuyết Trung Quốc ở trong thư viện rất thú vị, vì thế tôi muốn mời bạn ngày mai cùng đi với tôi.',
      chunks: [
        { id: 'c1', chunkZh: '我知道在图书馆里', chunkPinyin: 'Wǒ zhīdào zài túshūguǎn lǐ', chunkVi: 'Tôi biết rằng ở trong thư viện', phoneticNotes: 'zhīdào uốn lưỡi zh, túshūguǎn có sh uốn lưỡi', orderIndex: 1 },
        { id: 'c2', chunkZh: '看中国小说', chunkPinyin: 'kàn Zhōngguó xiǎoshuō', chunkVi: 'đọc tiểu thuyết Trung Quốc', phoneticNotes: 'Zhōng uốn lưỡi, xiǎoshuō kết hợp thanh 3 và uốn lưỡi', orderIndex: 2 },
        { id: 'c3', chunkZh: '非常有意思，', chunkPinyin: 'fēicháng yǒu yìsi,', chunkVi: 'rất là thú vị,', phoneticNotes: 'cháng uốn lưỡi thanh 2, yìsi đọc thanh nhẹ cuối', orderIndex: 3 },
        { id: 'c4', chunkZh: '所以我想请你', chunkPinyin: 'suǒyǐ wǒ xiǎng qǐng nǐ', chunkVi: 'cho nên tôi muốn mời bạn', phoneticNotes: 'Chuỗi thanh 3: suǒyǐ wǒ xiǎng qǐng nǐ ➔ chú ý biến điệu', orderIndex: 4 },
        { id: 'c5', chunkZh: '明天和我一起去。', chunkPinyin: 'míngtiān hé wǒ yìqǐ qù.', chunkVi: 'ngày mai cùng tôi đi đến đó.', phoneticNotes: 'yìqǐ: chữ yī biến thành thanh 4, qù tròn môi bật hơi', orderIndex: 5 }
      ],
      comprehensionQuestions: [
        {
          id: 'q1',
          questionVi: 'Người nói rủ bạn làm việc gì vào ngày mai?',
          options: ['Cùng đến thư viện đọc tiểu thuyết', 'Đi xem phim rạp', 'Đi nhà hàng ăn trưa', 'Đi mua sắm ở siêu thị'],
          answer: 'Cùng đến thư viện đọc tiểu thuyết',
          explanationVi: 'Câu nêu: "想请你明天和我一起去 [图书馆看中国小说]".'
        }
      ],
      targetWeaknesses: ['zh', 'ch', 'sh', 'tone_3'],
      tipsVi: 'Tập trung nhại theo các âm uốn lưỡi zh/ch/sh và chuỗi biến điệu thanh 3.'
    };

    db.prepare(`
      INSERT INTO shadowing_lessons (
        id, title, level, hsk_level, topic, difficulty, recommended_speed,
        full_zh, full_pinyin, full_vi, dialogue_roles_json, chunks_json,
        comprehension_questions_json, source, target_weaknesses_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_personalized', ?, ?, ?)
    `).run(
      fallbackLesson.id,
      fallbackLesson.title,
      fallbackLesson.level,
      fallbackLesson.hskLevel,
      fallbackLesson.topic,
      fallbackLesson.difficulty,
      fallbackLesson.recommendedSpeed,
      fallbackLesson.fullZh,
      fallbackLesson.fullPinyin,
      fallbackLesson.fullVi,
      null,
      JSON.stringify(fallbackLesson.chunks),
      JSON.stringify(fallbackLesson.comprehensionQuestions),
      JSON.stringify(fallbackLesson.targetWeaknesses),
      now,
      now
    );

    return {
      success: true,
      lesson: fallbackLesson,
      message: 'Đã chuẩn bị bài luyện Shadowing cá nhân hóa tập trung vào âm uốn lưỡi và biến điệu!'
    };
  }

  /**
   * Đồng bộ một cụm hoặc câu Shadowing quan trọng vào hàng đợi Spaced Repetition (SRS)
   */
  public syncToSrs(params: {
    lessonId: string;
    chunkId?: string;
    zh: string;
    pinyin: string;
    vi: string;
  }): { success: boolean; srsId: string; message: string } {
    const now = Date.now();
    const srsId = `srs_sh_${now}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const existing = db.prepare(`
        SELECT id FROM srs_items WHERE reference_id = ? OR prompt_zh = ?
      `).get(params.chunkId || params.zh, params.zh) as any;

      if (existing) {
        return {
          success: true,
          srsId: existing.id,
          message: 'Cụm câu này đã tồn tại trong hàng đợi ôn tập thông minh SRS.'
        };
      }

      const uniqueKey = `shadowing_${params.chunkId || params.lessonId}_${encodeURIComponent(params.zh.slice(0, 8))}`;

      db.prepare(`
        INSERT INTO srs_items (
          id, item_type, reference_id, unique_key, hsk_level,
          prompt_zh, prompt_pinyin, prompt_vi, extra_data_json,
          ease_factor, interval_days, repetition_count, streak, lapses,
          next_review_at, mastery_level, status, created_at, updated_at
        ) VALUES (?, 'phrase', ?, ?, 2, ?, ?, ?, ?, 2.5, 1, 1, 1, 0, ?, 'learning', 'active', ?, ?)
      `).run(
        srsId,
        params.chunkId || params.lessonId,
        uniqueKey,
        params.zh,
        params.pinyin,
        params.vi,
        JSON.stringify({ source: 'shadowing', lessonId: params.lessonId }),
        now + 86400000,
        now,
        now
      );

      return {
        success: true,
        srsId,
        message: 'Đã thêm cụm câu Shadowing vào hệ thống ôn tập thông minh SRS (SM-2)!'
      };
    } catch (err: any) {
      console.warn('Sync shadowing to SRS note:', err);
      return { success: false, srsId: '', message: err.message };
    }
  }

  /**
   * Thống kê tiến độ luyện Shadowing
   */
  public getStats(userId: string = 'default'): {
    totalSessions: number;
    averageScore: number;
    averageFluency: number;
    averageAccuracy: number;
    practicedLevelsCount: number;
    totalAudioSeconds: number;
    recentSessions: any[];
  } {
    const totalRow = db.prepare(`
      SELECT 
        COUNT(*) as count,
        AVG(score) as avg_score,
        AVG(fluency_score) as avg_fluency,
        AVG(accuracy_score) as avg_accuracy,
        SUM(user_audio_duration_ms) as total_duration
      FROM shadowing_practice_records
      WHERE user_id = ?
    `).get(userId) as any;

    const levelsRow = db.prepare(`
      SELECT COUNT(DISTINCT l.level) as count
      FROM shadowing_practice_records r
      JOIN shadowing_lessons l ON r.lesson_id = l.id
      WHERE r.user_id = ?
    `).get(userId) as any;

    const recent = this.getHistory(5);

    return {
      totalSessions: totalRow?.count || 0,
      averageScore: Math.round(totalRow?.avg_score || 0),
      averageFluency: Math.round(totalRow?.avg_fluency || 0),
      averageAccuracy: Math.round(totalRow?.avg_accuracy || 0),
      practicedLevelsCount: levelsRow?.count || 0,
      totalAudioSeconds: Math.round((totalRow?.total_duration || 0) / 1000),
      recentSessions: recent
    };
  }

  /**
   * Lấy lịch sử luyện Shadowing gần nhất
   */
  public getHistory(limit: number = 20): any[] {
    const rows = db.prepare(`
      SELECT r.*, l.title as lesson_title, l.level as lesson_level
      FROM shadowing_practice_records r
      LEFT JOIN shadowing_lessons l ON r.lesson_id = l.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      lessonId: r.lesson_id,
      lessonTitle: r.lesson_title || 'Bài luyện Shadowing',
      lessonLevel: r.lesson_level || 1,
      mode: r.mode,
      practiceStep: r.practice_step,
      score: r.score,
      fluencyScore: r.fluency_score,
      accuracyScore: r.accuracy_score,
      transcript: r.transcript,
      durationMs: r.user_audio_duration_ms,
      speedUsed: r.speed_used,
      strengths: r.strengths_json ? JSON.parse(r.strengths_json) : [],
      weaknesses: r.weaknesses_json ? JSON.parse(r.weaknesses_json) : [],
      flaggedSounds: r.flagged_sounds_json ? JSON.parse(r.flagged_sounds_json) : [],
      feedbackVi: r.evaluation_feedback_vi,
      createdAt: r.created_at
    }));
  }
}

export const geminiShadowingService = new GeminiShadowingService();
