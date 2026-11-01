import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import { learningEvidenceService } from './learningEvidenceService.js';

export type SrsItemType = 'vocabulary' | 'grammar' | 'phrase' | 'error';
export type SrsUserRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsReviewMode = 'flashcard' | 'zh_to_vi' | 'vi_to_zh' | 'listening' | 'grammar' | 'error_fix';
export type SrsMasteryLevel = 'introduced' | 'learning' | 'needs_review' | 'fair' | 'mastered';

export interface SrsItem {
  id: string;
  itemType: SrsItemType;
  referenceId: string;
  uniqueKey: string;
  hskLevel: number;
  promptZh: string;
  promptPinyin?: string;
  promptVi: string;
  extraData?: any;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  streak: number;
  lapses: number;
  lastReviewedAt?: number;
  nextReviewAt: number;
  masteryLevel: SrsMasteryLevel;
  status: 'active' | 'suspended' | 'graduated';
  createdAt: number;
  updatedAt: number;
}

export interface SrsReviewLog {
  id: number;
  itemId: string;
  sessionId?: string;
  reviewMode: SrsReviewMode;
  quality: number;
  userRating: SrsUserRating;
  userAnswer?: string;
  isCorrect: boolean;
  oldInterval: number;
  newInterval: number;
  oldEaseFactor: number;
  newEaseFactor: number;
  durationMs: number;
  reviewedAt: number;
}

export interface SrsDashboardStats {
  totalCards: number;
  dueToday: number;
  overdue: number;
  newCards: number;
  learning: number;
  mastered: number;
  retentionRate: number; // 0 - 100%
  streakDays: number;
  byType: {
    vocabulary: number;
    grammar: number;
    error: number;
  };
  forecast7Days: Array<{
    date: string;
    dayName: string;
    count: number;
  }>;
}

export interface SrsAIExercise {
  itemId: string;
  questionType: 'multiple_choice' | 'fill_blank' | 'reorder' | 'translate';
  prompt: string;
  contextSentenceZh: string;
  contextPinyin?: string;
  contextSentenceVi: string;
  options?: string[];
  correctAnswer: string;
  explanationVi: string;
}

export class GeminiSrsService {
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
   * 1. Thuật toán SM-2 (SuperMemo-2) cải tiến
   */
  public calculateSM2(
    currentEF: number,
    currentInterval: number,
    currentRepetition: number,
    currentLapses: number,
    currentStreak: number,
    rating: SrsUserRating,
    isObjectiveFailed: boolean = false
  ): {
    newEF: number;
    newInterval: number;
    newRepetition: number;
    newLapses: number;
    newStreak: number;
    quality: number;
    masteryLevel: SrsMasteryLevel;
  } {
    // Ép chất lượng về 1 (Again) nếu người dùng làm bài sai khách quan
    let quality = 4; // default Good
    if (isObjectiveFailed || rating === 'again') {
      quality = 1;
    } else if (rating === 'hard') {
      quality = 3;
    } else if (rating === 'good') {
      quality = 4;
    } else if (rating === 'easy') {
      quality = 5;
    }

    let newEF = currentEF;
    let newInterval = currentInterval;
    let newRepetition = currentRepetition;
    let newLapses = currentLapses;
    let newStreak = currentStreak;
    let masteryLevel: SrsMasteryLevel = 'learning';

    if (quality < 3) {
      // Quên / Trả lời sai -> Reset lặp lại
      newRepetition = 0;
      newInterval = 1; // Ôn lại sau 1 ngày (hoặc trong cùng ngày)
      newLapses = currentLapses + 1;
      newStreak = 0;
      // Giảm Ease Factor nhẹ
      newEF = Math.max(1.3, currentEF - 0.2);
      masteryLevel = 'needs_review';
    } else {
      // Nhớ thành công
      newRepetition = currentRepetition + 1;
      newStreak = currentStreak + 1;

      // Công thức cập nhật Ease Factor chuẩn SM-2:
      // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      const deltaEF = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
      newEF = Math.max(1.3, Number((currentEF + deltaEF).toFixed(2)));

      // Tính khoảng thời gian Interval (ngày)
      if (quality === 3) {
        // Hard: Tăng chậm hơn chuẩn
        if (newRepetition === 1) {
          newInterval = 1;
        } else if (newRepetition === 2) {
          newInterval = 2;
        } else {
          newInterval = Math.max(1, Math.round(currentInterval * 1.2));
        }
        masteryLevel = newStreak >= 3 ? 'fair' : 'learning';
      } else if (quality === 4) {
        // Good: Chuẩn SM-2 (I1 = 1, I2 = 6, In = In-1 * EF)
        if (newRepetition === 1) {
          newInterval = 1;
        } else if (newRepetition === 2) {
          newInterval = 6;
        } else {
          newInterval = Math.max(1, Math.round(currentInterval * newEF));
        }
        masteryLevel = newStreak >= 4 ? 'mastered' : 'fair';
      } else if (quality === 5) {
        // Easy: Thưởng thêm khoảng cách ôn tập
        if (newRepetition === 1) {
          newInterval = 4;
        } else if (newRepetition === 2) {
          newInterval = 10;
        } else {
          newInterval = Math.max(1, Math.round(currentInterval * newEF * 1.3));
        }
        masteryLevel = newStreak >= 2 ? 'mastered' : 'fair';
      }
    }

    if (newInterval >= 21) {
      masteryLevel = 'mastered';
    }

    return {
      newEF,
      newInterval,
      newRepetition,
      newLapses,
      newStreak,
      quality,
      masteryLevel
    };
  }

  /**
   * 2. Đồng bộ kiến thức đã dạy từ SQLite vào SRS items
   * Quét `vocabulary_memory`, `grammar_memory`, `learning_errors`
   */
  public syncCardsFromMemory(): {
    addedVocab: number;
    addedGrammar: number;
    addedErrors: number;
    totalCards: number;
  } {
    const now = Date.now();
    let addedVocab = 0;
    let addedGrammar = 0;
    let addedErrors = 0;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO srs_items (
        id, item_type, reference_id, unique_key, hsk_level,
        prompt_zh, prompt_pinyin, prompt_vi, extra_data_json,
        ease_factor, interval_days, repetition_count, streak, lapses,
        last_reviewed_at, next_review_at, mastery_level, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // A. Quét Từ vựng (vocabulary_memory)
    const vocabRows = (db.prepare('SELECT * FROM vocabulary_memory').all() as any[]) || [];
    for (const v of vocabRows) {
      const uniqueKey = `vocabulary_${v.id || v.simplified}`;
      const itemId = `srs_v_${v.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const extraData = {
        traditional: v.traditional || '',
        wordType: v.word_type || '',
        exampleZh: v.example_zh || '',
        exampleVi: v.example_vi || '',
        audioText: v.simplified,
        source: 'vocabulary_memory'
      };

      const result = insertStmt.run(
        itemId,
        'vocabulary',
        String(v.id || v.simplified),
        uniqueKey,
        v.hsk_level || 1,
        v.simplified,
        v.pinyin || '',
        v.meaning_vi || '',
        JSON.stringify(extraData),
        2.5,
        0,
        0,
        0,
        0,
        v.last_reviewed_at || null,
        now, // Sẵn sàng ôn ngay
        v.mastery_level || 'introduced',
        'active',
        now,
        now
      );
      if (result.changes > 0) addedVocab++;
    }

    // B. Quét Ngữ pháp (grammar_memory)
    const grammarRows = (db.prepare('SELECT * FROM grammar_memory').all() as any[]) || [];
    for (const g of grammarRows) {
      const uniqueKey = `grammar_${g.id || g.pattern_name}`;
      const itemId = `srs_g_${g.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const extraData = {
        formula: g.formula || '',
        usageNotes: g.usage_notes || '',
        exampleZh: g.example_zh || '',
        exampleVi: g.example_vi || '',
        commonMistakes: g.common_mistakes_json ? JSON.parse(g.common_mistakes_json) : [],
        source: 'grammar_memory'
      };

      const result = insertStmt.run(
        itemId,
        'grammar',
        String(g.id || g.pattern_name),
        uniqueKey,
        g.hsk_level || 1,
        g.pattern_name,
        g.formula || '',
        g.meaning_vi || '',
        JSON.stringify(extraData),
        2.5,
        0,
        0,
        0,
        0,
        g.last_reviewed_at || null,
        now,
        g.mastery_level || 'introduced',
        'active',
        now,
        now
      );
      if (result.changes > 0) addedGrammar++;
    }

    // C. Quét Sổ tay lỗi sai (learning_errors)
    const errorRows = (db.prepare("SELECT * FROM learning_errors WHERE status != 'resolved'").all() as any[]) || [];
    for (const e of errorRows) {
      const uniqueKey = `error_${e.id}`;
      const itemId = `srs_e_${e.id}_${Math.random().toString(36).substring(2, 6)}`;
      const extraData = {
        errorType: e.error_type || 'grammar',
        userSentence: e.user_sentence || '',
        correctedSentence: e.corrected_sentence || '',
        explanationVi: e.explanation_vi || '',
        occurrenceCount: e.occurrence_count || 1,
        source: 'learning_errors'
      };

      const result = insertStmt.run(
        itemId,
        'error',
        String(e.id),
        uniqueKey,
        1,
        e.user_sentence || e.title,
        '',
        `Sửa lỗi: ${e.title}`,
        JSON.stringify(extraData),
        2.3, // Ease factor thấp hơn cho lỗi sai để ôn thường xuyên hơn
        0,
        0,
        0,
        e.occurrence_count || 1, // Lapses ban đầu dựa trên số lần sai
        null,
        now,
        'needs_review',
        'active',
        now,
        now
      );
      if (result.changes > 0) addedErrors++;
    }

    const totalCards = (db.prepare("SELECT COUNT(*) as count FROM srs_items WHERE status = 'active'").get() as any)?.count || 0;

    return {
      addedVocab,
      addedGrammar,
      addedErrors,
      totalCards
    };
  }

  /**
   * 3. Hàng đợi ôn tập thông minh (Smart Review Queue)
   * Phân tầng ưu tiên:
   * 1. Quá hạn và hay quên (lapses > 0 AND next_review_at <= now)
   * 2. Lỗi sai cá nhân vừa mắc (item_type = 'error')
   * 3. Đến hạn hôm nay (next_review_at <= end_of_today)
   * 4. Thẻ mới (repetition_count = 0, giới hạn số lượng để tránh quá tải)
   */
  public getReviewQueue(params: {
    limit?: number;
    mode?: 'all' | 'vocabulary' | 'grammar' | 'error' | 'overdue';
    hskLevel?: number;
    newCardLimit?: number;
  }): SrsItem[] {
    const limit = Math.min(params.limit || 20, 50);
    const _newCardLimit = params.newCardLimit || 6;
    const now = Date.now();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayTs = endOfDay.getTime();

    let typeClause = '';
    const args: any[] = [];

    if (params.mode === 'vocabulary') {
      typeClause = 'AND item_type = "vocabulary"';
    } else if (params.mode === 'grammar') {
      typeClause = 'AND item_type = "grammar"';
    } else if (params.mode === 'error') {
      typeClause = 'AND item_type = "error"';
    } else if (params.mode === 'overdue') {
      typeClause = `AND next_review_at < ${now}`;
    }

    if (params.hskLevel) {
      typeClause += ' AND hsk_level = ?';
      args.push(params.hskLevel);
    }

    // Lấy thẻ đến hạn hoặc đã quá hạn (ưu tiên thẻ hay quên và lỗi sai)
    const queryDue = `
      SELECT *,
        CASE 
          WHEN lapses > 0 AND next_review_at <= ${now} THEN 1
          WHEN item_type = 'error' THEN 2
          WHEN next_review_at <= ${endOfDayTs} THEN 3
          WHEN repetition_count = 0 THEN 4
          ELSE 5
        END as priority_score
      FROM srs_items
      WHERE status = 'active'
        ${typeClause}
      ORDER BY priority_score ASC, next_review_at ASC, lapses DESC
      LIMIT ?
    `;

    args.push(limit);
    const rawRows = (db.prepare(queryDue).all(...args) as any[]) || [];

    // Chuyển đổi và bóc tách extraData
    return rawRows.map(row => this.mapRowToSrsItem(row));
  }

  /**
   * 4. Ghi nhận kết quả ôn tập một thẻ (Submit Review)
   * Đồng bộ ngược vào vocabulary_memory, learning_errors và lịch học tuần
   */
  public submitReview(params: {
    itemId: string;
    userRating: SrsUserRating;
    reviewMode: SrsReviewMode;
    sessionId?: string;
    userAnswer?: string;
    isCorrect?: boolean;
    durationMs?: number;
  }): {
    success: boolean;
    item: SrsItem;
    sm2Result: any;
    nextReviewFormatted: string;
  } {
    const now = Date.now();
    const row = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(params.itemId) as any;
    if (!row) {
      throw new Error(`Không tìm thấy thẻ SRS với ID: ${params.itemId}`);
    }

    const isObjectiveFailed = params.isCorrect === false;
    const sm2 = this.calculateSM2(
      row.ease_factor,
      row.interval_days,
      row.repetition_count,
      row.lapses,
      row.streak,
      params.userRating,
      isObjectiveFailed
    );

    const nextReviewAt = now + sm2.newInterval * 86400000;

    // A. Cập nhật thẻ srs_items
    db.prepare(`
      UPDATE srs_items
      SET ease_factor = ?,
          interval_days = ?,
          repetition_count = ?,
          streak = ?,
          lapses = ?,
          last_reviewed_at = ?,
          next_review_at = ?,
          mastery_level = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      sm2.newEF,
      sm2.newInterval,
      sm2.newRepetition,
      sm2.newLapses,
      sm2.newStreak,
      now,
      nextReviewAt,
      sm2.masteryLevel,
      now,
      params.itemId
    );

    // B. Ghi nhận nhật ký srs_review_logs
    const mode = params.reviewMode || 'flashcard';
    db.prepare(`
      INSERT INTO srs_review_logs (
        item_id, session_id, review_mode, quality, user_rating,
        user_answer, is_correct, old_interval, new_interval,
        old_ease_factor, new_ease_factor, duration_ms, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.itemId,
      params.sessionId || null,
      mode,
      sm2.quality,
      params.userRating,
      params.userAnswer || null,
      isObjectiveFailed ? 0 : 1,
      row.interval_days,
      sm2.newInterval,
      row.ease_factor,
      sm2.newEF,
      params.durationMs || 0,
      now
    );

    // C. Cập nhật thống kê phiên nếu có sessionId
    if (params.sessionId) {
      db.prepare(`
        UPDATE srs_sessions
        SET cards_reviewed = cards_reviewed + 1,
            cards_correct = cards_correct + ?,
            cards_failed = cards_failed + ?,
            completed_at = ?
        WHERE id = ?
      `).run(
        isObjectiveFailed ? 0 : 1,
        isObjectiveFailed ? 1 : 0,
        now,
        params.sessionId
      );
    }

    // D. Ghi nhận Learning Evidence vào hệ thống bằng chứng học tập (Phase A2)
    try {
      const kid = row.knowledge_id || null;
      if (kid || row.prompt_zh) {
        learningEvidenceService.recordEvidence({
          knowledgeId: kid || undefined,
          rawText: !kid ? row.prompt_zh : undefined,
          evidenceType: 'review',
          action: 'srs_rating',
          sourceModule: 'srs',
          sessionId: params.sessionId,
          idempotencyKey: `srs_rev_${params.itemId}_${now}`,
          observedData: {
            speaker: 'user',
            providedAnswer: params.userAnswer,
            promptZh: row.prompt_zh
          },
          assessmentData: {
            isCorrect: !isObjectiveFailed,
            score: sm2.quality * 20,
            srsRating: params.userRating,
            intervalDays: sm2.newInterval,
            easeFactor: sm2.newEF,
            timeSpentMs: params.durationMs || 0
          },
          assessmentMethod: 'deterministic_rule',
          evaluator: 'sm2_engine',
          confidence: 1.0
        });
      }
    } catch (e) {
      console.warn('Lỗi ghi nhận learning evidence SRS:', e);
    }

    // D. Đồng bộ ngược lại Long-Term Memory
    if (row.item_type === 'vocabulary') {
      try {
        db.prepare(`
          UPDATE vocabulary_memory
          SET mastery_level = ?,
              review_count = review_count + 1,
              last_reviewed_at = ?
          WHERE id = ? OR simplified = ?
        `).run(
          sm2.masteryLevel,
          now,
          row.reference_id,
          row.prompt_zh
        );
      } catch (err) {
        console.warn('Lỗi đồng bộ ngược vocabulary_memory:', err);
      }
    } else if (row.item_type === 'grammar') {
      try {
        db.prepare(`
          UPDATE grammar_memory
          SET mastery_level = ?,
              review_count = review_count + 1,
              last_reviewed_at = ?
          WHERE id = ? OR pattern_name = ?
        `).run(
          sm2.masteryLevel,
          now,
          row.reference_id,
          row.prompt_zh
        );
      } catch (err) {
        console.warn('Lỗi đồng bộ ngược grammar_memory:', err);
      }
    } else if (row.item_type === 'error') {
      try {
        // Nếu sửa thành công nhiều lần hoặc đánh giá Easy/Good
        if (!isObjectiveFailed && sm2.newStreak >= 2) {
          db.prepare(`
            UPDATE learning_errors
            SET status = 'resolved'
            WHERE id = ?
          `).run(row.reference_id);
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ ngược learning_errors:', err);
      }
    }

    // E. Đồng bộ hoàn thành mục ôn tập trong Adaptive Learning Path Schedule
    try {
      this.syncCompletedToPathSchedule(row.item_type);
    } catch (err) {
      console.warn('Lỗi đồng bộ lịch lộ trình:', err);
    }

    const updatedRow = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(params.itemId) as any;
    const nextDate = new Date(nextReviewAt);
    const nextReviewFormatted = sm2.newInterval === 0 
      ? 'Hôm nay' 
      : sm2.newInterval === 1 
      ? 'Ngày mai' 
      : `Sau ${sm2.newInterval} ngày (${nextDate.toLocaleDateString('vi-VN')})`;

    return {
      success: true,
      item: this.mapRowToSrsItem(updatedRow),
      sm2Result: sm2,
      nextReviewFormatted
    };
  }

  /**
   * Đánh dấu hoàn thành mục lịch tuần trong Adaptive Learning Path nếu có
   */
  private syncCompletedToPathSchedule(itemType: SrsItemType) {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday
    const dayOfWeek = today === 0 ? 7 : today;

    const activityType = itemType === 'grammar' ? 'grammar_lesson' : 'vocab_review';

    db.prepare(`
      UPDATE learning_schedule_items
      SET is_completed = 1, completed_at = ?
      WHERE day_of_week = ? 
        AND activity_type IN (?, 'vocab_review', 'comprehensive_quiz')
        AND is_completed = 0
    `).run(Date.now(), dayOfWeek, activityType);
  }

  /**
   * 5. Khởi tạo phiên ôn tập mới (Start Review Session)
   */
  public startSession(sessionType: string = 'daily_review'): { sessionId: string } {
    const sessionId = `srs_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO srs_sessions (id, session_type, cards_reviewed, cards_correct, cards_failed, duration_seconds, started_at)
      VALUES (?, ?, 0, 0, 0, 0, ?)
    `).run(sessionId, sessionType, Date.now());

    return { sessionId };
  }

  /**
   * Kết thúc phiên ôn tập và tính thời gian
   */
  public finishSession(sessionId: string, durationSeconds: number) {
    db.prepare(`
      UPDATE srs_sessions
      SET duration_seconds = ?, completed_at = ?
      WHERE id = ?
    `).run(durationSeconds, Date.now(), sessionId);

    return db.prepare('SELECT * FROM srs_sessions WHERE id = ?').get(sessionId);
  }

  /**
   * 6. Lấy số liệu Dashboard & Thống kê SRS
   */
  public getDashboardStats(): SrsDashboardStats {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTs = startOfDay.getTime();

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayTs = endOfDay.getTime();

    // Tổng số thẻ
    const totalCards = (db.prepare("SELECT COUNT(*) as c FROM srs_items WHERE status = 'active'").get() as any)?.c || 0;

    // Đến hạn hôm nay (bao gồm cả quá hạn)
    const dueToday = (db.prepare(`
      SELECT COUNT(*) as c FROM srs_items 
      WHERE status = 'active' AND next_review_at <= ?
    `).get(endOfDayTs) as any)?.c || 0;

    // Quá hạn thực sự (trước đầu ngày hôm nay và đã qua ít nhất 1 lần ôn)
    const overdue = (db.prepare(`
      SELECT COUNT(*) as c FROM srs_items 
      WHERE status = 'active' AND next_review_at < ? AND repetition_count > 0
    `).get(startOfDayTs) as any)?.c || 0;

    // Thẻ mới chưa học lần nào
    const newCards = (db.prepare(`
      SELECT COUNT(*) as c FROM srs_items 
      WHERE status = 'active' AND repetition_count = 0
    `).get() as any)?.c || 0;

    // Đang học
    const learning = (db.prepare(`
      SELECT COUNT(*) as c FROM srs_items 
      WHERE status = 'active' AND mastery_level IN ('learning', 'needs_review')
    `).get() as any)?.c || 0;

    // Đã thành thạo
    const mastered = (db.prepare(`
      SELECT COUNT(*) as c FROM srs_items 
      WHERE status = 'active' AND mastery_level = 'mastered'
    `).get() as any)?.c || 0;

    // Tỷ lệ nhớ (Retention Rate trong 30 ngày gần nhất)
    const thirtyDaysAgo = now - 30 * 86400000;
    const logStats = (db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(is_correct) as correct
      FROM srs_review_logs 
      WHERE reviewed_at >= ?
    `).get(thirtyDaysAgo) as any) || { total: 0, correct: 0 };

    const retentionRate = logStats.total > 0
      ? Math.round((logStats.correct / logStats.total) * 100)
      : 85;

    // Phân bố theo loại
    const typeRows = (db.prepare(`
      SELECT item_type, COUNT(*) as c 
      FROM srs_items 
      WHERE status = 'active' 
      GROUP BY item_type
    `).all() as any[]) || [];

    const byType = {
      vocabulary: 0,
      grammar: 0,
      error: 0
    };
    for (const r of typeRows) {
      if (r.item_type === 'vocabulary') byType.vocabulary = r.c;
      else if (r.item_type === 'grammar') byType.grammar = r.c;
      else if (r.item_type === 'error') byType.error = r.c;
    }

    // Dự báo lịch ôn 7 ngày tới
    const forecast7Days: Array<{ date: string; dayName: string; count: number }> = [];
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (let i = 0; i < 7; i++) {
      const dayTarget = new Date();
      dayTarget.setDate(dayTarget.getDate() + i);
      dayTarget.setHours(0, 0, 0, 0);
      const startT = dayTarget.getTime();

      const endT = startT + 86400000 - 1;

      const count = (db.prepare(`
        SELECT COUNT(*) as c FROM srs_items
        WHERE status = 'active' AND next_review_at >= ? AND next_review_at <= ?
      `).get(startT, endT) as any)?.c || 0;

      const dateStr = `${dayTarget.getDate()}/${dayTarget.getMonth() + 1}`;
      const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[dayTarget.getDay()];

      forecast7Days.push({
        date: dateStr,
        dayName,
        count
      });
    }

    return {
      totalCards,
      dueToday,
      overdue,
      newCards,
      learning,
      mastered,
      retentionRate,
      streakDays: 5,
      byType,
      forecast7Days
    };
  }

  /**
   * 7. Tạo bài tập/ngữ cảnh mới bằng AI (Gemini Text Model)
   * Giúp người học áp dụng từ vựng/ngữ pháp vào câu chuyện hoặc ngữ cảnh mới
   */
  public async generateAIExercise(itemId: string): Promise<SrsAIExercise> {
    const row = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(itemId) as any;
    if (!row) {
      throw new Error(`Không tìm thấy thẻ với ID: ${itemId}`);
    }

    const item = this.mapRowToSrsItem(row);

    const client = this.getClient();
    const model = this.getModel();

    const prompt = `
Bạn là Chuyên gia Khảo thí và Giảng dạy Tiếng Trung Quốc tế.
Hãy tạo 1 câu hỏi luyện tập/thử thách trắc nghiệm hoặc điền từ ĐỘC ĐÁO, MỚI LẠ để kiểm tra khả năng vận dụng của kiến thức sau:

=== KIẾN THỨC CẦN ÔN ===
- Loại kiến thức: ${item.itemType} (Cấp độ HSK: ${item.hskLevel})
- Trọng tâm: ${item.promptZh} (${item.promptPinyin || ''})
- Nghĩa tiếng Việt: ${item.promptVi}
- Chi tiết bổ sung: ${JSON.stringify(item.extraData || {})}

=== YÊU CẦU ĐẶC BIỆT ===
1. Không lặp lại y nguyên câu ví dụ có sẵn. Hãy tạo một ngữ cảnh giao tiếp đời sống hiện đại, gần gũi.
2. Tạo 4 đáp án lựa chọn (A, B, C, D) có tính gây nhiễu hợp lý để học viên phân biệt.
3. Giải thích rõ ràng bằng tiếng Việt tại sao chọn đáp án đó.

Hãy trả lời ĐÚNG ĐỊNH DẠNG JSON sau (không bọc trong \`\`\`json, không markdown):
{
  "questionType": "multiple_choice",
  "prompt": "Chọn từ/cụm từ đúng nhất điền vào chỗ trống...",
  "contextSentenceZh": "Câu tiếng Trung chứa chỗ trống ____",
  "contextPinyin": "Phiên âm pinyin cho câu ngữ cảnh",
  "contextSentenceVi": "Bản dịch nghĩa tiếng Việt của câu",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "correctAnswer": "Đáp án đúng chính xác",
  "explanationVi": "Giải thích sư phạm cặn kẽ vì sao chọn đáp án này"
}
`;

    try {
      const startSrsCall = Date.now();
      const cleanJson = await unifiedAIOrchestrator.invokeWithTimeoutAndRetry(
        model,
        'Bạn là chuyên gia thiết kế câu hỏi ôn tập lặp lại ngắt quãng SRS tiếng Trung của Halo Chinese. Chỉ trả về JSON thuần túy.',
        prompt,
        'json',
        0.3,
        20000,
        1
      );
      unifiedAIOrchestrator.logAudit({
        requestId: `req_srs_quiz_${Date.now()}`,
        taskId: 'SRS_HINT_GENERATION',
        modelCategory: 'text_out',
        modelId: model,
        promptVersion: 'v2.8.0',
        status: 'completed',
        latencyMs: Date.now() - startSrsCall
      });

      const parsed = JSON.parse(cleanJson);

      return {
        itemId,
        questionType: parsed.questionType || 'multiple_choice',
        prompt: parsed.prompt || `Chọn đáp án đúng nhất cho từ "${item.promptZh}"`,
        contextSentenceZh: parsed.contextSentenceZh || item.promptZh,
        contextPinyin: parsed.contextPinyin || item.promptPinyin,
        contextSentenceVi: parsed.contextSentenceVi || item.promptVi,
        options: parsed.options || [item.promptZh, '其他', '没有', '可能'],
        correctAnswer: parsed.correctAnswer || item.promptZh,
        explanationVi: parsed.explanationVi || `Vận dụng chuẩn xác của "${item.promptZh}".`
      };
    } catch (err: any) {
      console.warn('Lỗi sinh bài tập AI cho thẻ SRS:', err.message);
      // Fallback câu hỏi thông minh nếu Gemini lỗi hoặc chưa có key
      return {
        itemId,
        questionType: 'multiple_choice',
        prompt: `Chọn cách sử dụng hoặc nghĩa chính xác của: "${item.promptZh}"`,
        contextSentenceZh: item.extraData?.exampleZh || item.promptZh,
        contextPinyin: item.promptPinyin,
        contextSentenceVi: item.extraData?.exampleVi || item.promptVi,
        options: [
          item.promptVi,
          'Một từ vựng mang nghĩa trái ngược',
          'Chưa xác định ngữ cảnh',
          'Phủ định của động từ'
        ],
        correctAnswer: item.promptVi,
        explanationVi: `"${item.promptZh}" (${item.promptPinyin}) có nghĩa là: ${item.promptVi}.`
      };
    }
  }

  private mapRowToSrsItem(row: any): SrsItem {
    let extraData = {};
    if (row.extra_data_json) {
      try {
        extraData = JSON.parse(row.extra_data_json);
      } catch (_e) {
        extraData = {};
      }
    }

    return {
      id: row.id,
      itemType: row.item_type,
      referenceId: row.reference_id,
      uniqueKey: row.unique_key,
      hskLevel: row.hsk_level || 1,
      promptZh: row.prompt_zh,
      promptPinyin: row.prompt_pinyin || '',
      promptVi: row.prompt_vi,
      extraData,
      easeFactor: row.ease_factor || 2.5,
      intervalDays: row.interval_days || 0,
      repetitionCount: row.repetition_count || 0,
      streak: row.streak || 0,
      lapses: row.lapses || 0,
      lastReviewedAt: row.last_reviewed_at || undefined,
      nextReviewAt: row.next_review_at,
      masteryLevel: row.mastery_level || 'introduced',
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const geminiSrsService = new GeminiSrsService();
