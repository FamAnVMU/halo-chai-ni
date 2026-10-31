/**
 * Conversation Summarizer (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 *
 * Generates and persists structured pedagogic summaries for previous learning sessions,
 * strictly distinguishing: Taught vs Practiced vs Mastered.
 */

import { db } from './db.js';
import { SessionPedagogicSummary } from './contextRetrievalTypes.js';

export class ConversationSummarizer {
  private static readonly SUMMARY_VERSION = 'v2.5.0';

  /**
   * Tóm tắt một phiên học và lưu vào SQLite bảng session_pedagogic_summaries
   */
  public static summarizeAndSaveSession(params: {
    sessionId: string;
    learnerId?: string;
    topic: string;
    taughtKnowledge?: Array<{ id?: string; text: string; type: string }>;
    practicedKnowledge?: Array<{ id?: string; text: string; isCorrect: boolean }>;
    masteredKnowledge?: Array<{ id?: string; text: string }>;
    keyErrors?: Array<{ text: string; errorType: string; explanation: string }>;
    assessmentSummaryVi: string;
    nextFocusVi: string;
  }): SessionPedagogicSummary {
    const learnerId = params.learnerId || 'default';
    const now = Date.now();
    const id = `sum_${params.sessionId}_${now}`;

    const summary: SessionPedagogicSummary = {
      id,
      sessionId: params.sessionId,
      learnerId,
      topic: params.topic || 'Hội thoại tiếng Trung',
      taughtKnowledge: params.taughtKnowledge || [],
      practicedKnowledge: params.practicedKnowledge || [],
      masteredKnowledge: params.masteredKnowledge || [],
      keyErrors: params.keyErrors || [],
      assessmentSummaryVi: params.assessmentSummaryVi || 'Phiên học đã hoàn thành.',
      nextFocusVi: params.nextFocusVi || 'Tiếp tục luyện tập đàm thoại.',
      summaryVersion: this.SUMMARY_VERSION,
      createdAt: now
    };

    try {
      db.prepare(`
        INSERT INTO session_pedagogic_summaries (
          id, session_id, learner_id, topic, taught_knowledge_json,
          practiced_knowledge_json, mastered_knowledge_json, key_errors_json,
          assessment_summary_vi, next_focus_vi, summary_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          topic = excluded.topic,
          taught_knowledge_json = excluded.taught_knowledge_json,
          practiced_knowledge_json = excluded.practiced_knowledge_json,
          mastered_knowledge_json = excluded.mastered_knowledge_json,
          key_errors_json = excluded.key_errors_json,
          assessment_summary_vi = excluded.assessment_summary_vi,
          next_focus_vi = excluded.next_focus_vi,
          updated_at = excluded.updated_at
      `).run(
        summary.id,
        summary.sessionId,
        summary.learnerId,
        summary.topic,
        JSON.stringify(summary.taughtKnowledge),
        JSON.stringify(summary.practicedKnowledge),
        JSON.stringify(summary.masteredKnowledge),
        JSON.stringify(summary.keyErrors),
        summary.assessmentSummaryVi,
        summary.nextFocusVi,
        summary.summaryVersion,
        now,
        now
      );
    } catch (err) {
      console.warn('[ConversationSummarizer] Summary insert warning:', err);
    }

    return summary;
  }

  /**
   * Lấy các bản tóm tắt phiên học gần nhất của học viên
   */
  public static getRecentSummaries(learnerId: string = 'default', limit: number = 3): SessionPedagogicSummary[] {
    try {
      const rows = db.prepare(`
        SELECT * FROM session_pedagogic_summaries
        WHERE learner_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(learnerId, limit) as any[];

      return rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        learnerId: r.learner_id,
        topic: r.topic,
        taughtKnowledge: JSON.parse(r.taught_knowledge_json || '[]'),
        practicedKnowledge: JSON.parse(r.practiced_knowledge_json || '[]'),
        masteredKnowledge: JSON.parse(r.mastered_knowledge_json || '[]'),
        keyErrors: JSON.parse(r.key_errors_json || '[]'),
        assessmentSummaryVi: r.assessment_summary_vi,
        nextFocusVi: r.next_focus_vi,
        summaryVersion: r.summary_version,
        createdAt: r.created_at
      }));
    } catch (_e) {
      return [];
    }
  }

  /**
   * Định dạng tóm tắt các phiên trước thành văn bản cô đọng cho AI prompt
   */
  public static formatSummariesForPrompt(summaries: SessionPedagogicSummary[]): string {
    if (!summaries || summaries.length === 0) return '';

    const lines: string[] = ['BẢN TÓM TẮT CÁC PHIÊN HỌC TRƯỚC (SESSION SUMMARIES):'];
    for (const s of summaries) {
      const taughtStr = s.taughtKnowledge.map(k => k.text).join(', ') || 'Không có';
      const practicedStr = s.practicedKnowledge.map(k => k.text).join(', ') || 'Không có';
      const masteredStr = s.masteredKnowledge.map(k => k.text).join(', ') || 'Chưa ghi nhận';
      const errorsStr = s.keyErrors.map(e => `${e.text} (${e.errorType})`).join(', ') || 'Không có lỗi lớn';

      lines.push(`- Chủ đề: "${s.topic}"`);
      lines.push(`  + AI đã giảng dạy: ${taughtStr}`);
      lines.push(`  + Học viên đã thực hành: ${practicedStr}`);
      lines.push(`  + Thực sự thành thạo: ${masteredStr}`);
      lines.push(`  + Lỗi cần lưu ý: ${errorsStr}`);
      lines.push(`  + Đánh giá: ${s.assessmentSummaryVi}`);
      lines.push(`  + Trọng tâm tiếp theo: ${s.nextFocusVi}`);
    }

    return lines.join('\n');
  }
}
