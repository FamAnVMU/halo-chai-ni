import { db } from './db.js';
import { generatePrefixedId } from './utils/idGenerator.js';
import { knowledgeRegistryService } from './knowledgeRegistryService.js';
import { masteryEngineService } from './masteryEngineService.js';
import crypto from 'crypto';

export type EvidenceType =
  | 'exposure' // Tiếp xúc: tra từ, xem bài, đọc đoạn văn
  | 'instruction' // Được giảng dạy: AI giải thích, hoàn thành bài giảng
  | 'recognition' // Nhận diện: trắc nghiệm, nhận diện pinyin/nghĩa
  | 'recall' // Ghi nhớ chủ động: tự nhớ nghĩa, tự viết chữ Hán, không gợi ý
  | 'application' // Vận dụng: tự đặt câu, dùng trong hội thoại, tình huống mới
  | 'pronunciation' // Phát âm: âm thanh thật, pinyin, thanh điệu, ngữ điệu
  | 'listening_reading' // Nghe và đọc: nghe hiểu, đọc hiểu, suy luận
  | 'review'; // Ôn tập: SRS SM-2, ôn tập định kỳ

export type AssessmentMethod =
  | 'deterministic_rule' // Chấm theo đáp án/quy tắc cứng (trắc nghiệm, SRS math)
  | 'ai_evaluation' // AI chấm tự luận, hội thoại mở, ngữ pháp
  | 'audio_evaluation' // Hệ thống đánh giá âm học thực tế (acoustic pacing, duration, ASR)
  | 'human_confirmation' // Người dùng tự đánh giá/xác nhận
  | 'imported_baseline'; // Dữ liệu kiểm tra đầu vào (placement test)

export type SourceModule =
  | 'ai_tutor'
  | 'voice_chat'
  | 'dictionary'
  | 'lesson'
  | 'placement'
  | 'srs'
  | 'pronunciation_lab'
  | 'shadowing'
  | 'reading';

export interface ObservedData {
  userUtterance?: string; // Lời nói / câu văn thực tế của người học
  userText?: string;
  selectedOption?: string;
  providedAnswer?: string;
  optionsAvailable?: string[];
  contextSentence?: string;
  charCount?: number;
  audioMetrics?: {
    actualDurationMs: number;
    expectedDurationMs: number;
    durationRatio?: number;
    speedPacing?: 'too_fast' | 'natural' | 'too_slow';
    audioFilePath?: string;
  };
  promptZh?: string;
  pinyinExpected?: string;
  pinyinSpoken?: string;
  speaker: 'user'; // BẮT BUỘC là 'user' - Tuyệt đối không lưu lời AI nói
  hintUsed?: boolean;
  metadata?: Record<string, any>;
}

export interface AssessmentData {
  isCorrect?: boolean | null; // null đối với exposure/instruction thuần túy
  score?: number | null; // 0 - 100
  matchRate?: number | null;
  acousticAccuracy?: 'excellent' | 'good' | 'fair' | 'poor' | null;
  mistakeTypes?: string[];
  timeSpentMs?: number | null;
  hintUsed?: boolean;
  srsRating?: 'again' | 'hard' | 'good' | 'easy' | null;
  intervalDays?: number | null;
  easeFactor?: number | null;
  charMatches?: Array<{ char: string; pinyin: string; status: 'correct' | 'substituted' | 'omitted' }>;
  feedbackVi?: string;
}

export interface InferenceData {
  pedagogicClaim?: string;
  knowledgeSubtopic?: string;
  scopeOfApplication?: string; // Phạm vi ngữ cảnh áp dụng cụ thể
  isMasteryClaim?: boolean; // Mặc định false (chống AI tự gán mastery)
  confidenceScore?: number;
}

export interface RecordEvidenceInput {
  knowledgeId?: string; // Knowledge ID (nếu chưa có, truyền rawText để tự resolve)
  rawText?: string; // Chữ Hán / cấu trúc để tự tra hoặc tạo qua Knowledge Registry
  evidenceType: EvidenceType;
  action: string; // e.g. 'dictionary_lookup', 'srs_review', 'chat_utterance', 'pronunciation_trial'
  sourceModule: SourceModule;
  sessionId?: string;
  attemptId?: string;
  idempotencyKey?: string;
  observedData: ObservedData;
  assessmentData: AssessmentData;
  inferenceData?: InferenceData;
  assessmentMethod: AssessmentMethod;
  evaluator: string; // e.g. 'sm2_engine', 'acoustic_analyzer', 'gemini_text', 'placement_grader'
  confidence?: number;
}

export interface LearningEvidence {
  id: string;
  knowledgeId: string;
  evidenceType: EvidenceType;
  action: string;
  sourceModule: SourceModule;
  sessionId?: string;
  attemptId?: string;
  idempotencyKey?: string;
  observedData: ObservedData;
  assessmentData: AssessmentData;
  inferenceData?: InferenceData;
  assessmentMethod: AssessmentMethod;
  evaluator: string;
  confidence: number;
  status: 'valid' | 'invalidated' | 'corrected';
  correctionReason?: string;
  schemaVersion: number;
  createdAt: number;
}

export interface EvidenceStatistics {
  totalEvidences: number;
  validEvidences: number;
  invalidatedEvidences: number;
  byType: Record<EvidenceType, number>;
  bySource: Record<SourceModule, number>;
  byMethod: Record<AssessmentMethod, number>;
  distinctKnowledgeTracked: number;
  accuracyRate: number; // Tỉ lệ trả lời đúng trên các evidence có chấm điểm (0-100%)
}

/**
 * Service Quản Lý Bằng Chứng Học Tập (Learning Evidence System)
 * Lưu trữ append-only, chống trùng lặp, bảo đảm mọi đánh giá đều có bằng chứng gốc
 */
export class LearningEvidenceService {
  /**
   * Tạo Idempotency Key tự động nếu caller không truyền
   */
  public generateIdempotencyKey(
    sourceModule: SourceModule,
    action: string,
    knowledgeId: string,
    sessionId?: string,
    attemptId?: string,
    observedPayload?: any
  ): string {
    const raw = `${sourceModule}_${action}_${knowledgeId}_${sessionId || ''}_${attemptId || ''}_${JSON.stringify(observedPayload || '')}`;
    return 'idem_' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
  }

  /**
   * 1. Ghi nhận một Bằng chứng Học tập (Record Evidence)
   * Tuân thủ Append-Only, kiểm tra Idempotency, không ghi đè lịch sử
   */
  public recordEvidence(input: RecordEvidenceInput): {
    evidence: LearningEvidence;
    isDuplicate: boolean;
  } {
    // 1. Kiểm tra an toàn: Người đánh giá KHÔNG ĐƯỢC tính câu AI nói là hành động của người học
    if (input.observedData.speaker !== 'user') {
      throw new Error('Chỉ ghi nhận bằng chứng cho hành động của người học (speaker phải là "user").');
    }

    // 2. Xác định Knowledge ID hợp lệ thông qua Knowledge Registry
    let targetKid = input.knowledgeId;
    if (!targetKid && input.rawText) {
      const clean = input.rawText.trim();
      // Tìm trong Knowledge Items
      const found = db.prepare(`
        SELECT id FROM knowledge_items
        WHERE hanzi_simplified = ? OR display_text = ? OR canonical_key LIKE ?
        LIMIT 1
      `).get(clean, clean, `%${clean}%`) as any;

      if (found) {
        targetKid = found.id;
      } else {
        // Tạo mục mới trong Knowledge Registry nếu chưa có
        const created = knowledgeRegistryService.findOrCreateKnowledge({
          itemType: 'vocabulary',
          displayText: clean,
          hanziSimplified: clean,
          source: input.sourceModule,
          initialSense: {
            meaningVi: `Khái niệm từ ${input.sourceModule}: ${clean}`
          }
        });
        targetKid = created.item.id;
      }
    }

    if (!targetKid) {
      throw new Error('Mỗi bằng chứng học tập bắt buộc phải liên kết với một Knowledge ID hợp lệ.');
    }

    // 3. Cơ chế Idempotency chống ghi nhận trùng lặp do mạng hoặc nhấn lặp
    const idempotencyKey =
      input.idempotencyKey ||
      this.generateIdempotencyKey(
        input.sourceModule,
        input.action,
        targetKid,
        input.sessionId,
        input.attemptId,
        input.observedData
      );

    const existingRow = db.prepare('SELECT * FROM learning_evidences WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (existingRow) {
      // Trả về bản ghi đã ghi nhận trước đó (Idempotent response)
      return {
        evidence: this.mapRowToEvidence(existingRow),
        isDuplicate: true
      };
    }

    const now = Date.now();
    const evidenceId = generatePrefixedId('EVI', now);
    const confidence = input.confidence !== undefined ? Math.max(0, Math.min(1.0, input.confidence)) : 1.0;

    // 4. Lưu vào SQLite (Append-Only)
    db.prepare(`
      INSERT INTO learning_evidences (
        id, knowledge_id, evidence_type, action, source_module, session_id, attempt_id,
        idempotency_key, observed_data_json, assessment_data_json, inference_data_json,
        assessment_method, evaluator, confidence, status, correction_reason,
        schema_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      evidenceId,
      targetKid,
      input.evidenceType,
      input.action,
      input.sourceModule,
      input.sessionId || null,
      input.attemptId || null,
      idempotencyKey,
      JSON.stringify(input.observedData),
      JSON.stringify(input.assessmentData),
      input.inferenceData ? JSON.stringify(input.inferenceData) : null,
      input.assessmentMethod,
      input.evaluator,
      confidence,
      'valid',
      null,
      1,
      now
    );

    // 5. Đồng bộ cập nhật bảng tổng kết learner_evidence_ledger (cho AI Tutor Prompts)
    try {
      const existingLedger = db.prepare(`
        SELECT * FROM learner_evidence_ledger WHERE target_key = ? OR knowledge_id = ? LIMIT 1
      `).get(targetKid, targetKid) as any;

      const quote = input.observedData.userUtterance || input.observedData.userText || input.action;
      const claim = input.inferenceData?.pedagogicClaim || `${input.action}: ${input.assessmentData.isCorrect ? 'Đạt' : 'Cần chú ý'}`;

      if (existingLedger) {
        db.prepare(`
          UPDATE learner_evidence_ledger SET
            observation_count = observation_count + 1,
            evidence_quote = ?,
            confidence_score = MIN(0.99, confidence_score + 0.05),
            last_observed_at = ?,
            knowledge_id = ?
          WHERE id = ?
        `).run(quote, now, targetKid, existingLedger.id);
      } else {
        const ledgerId = `ev_sync_${now}_${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO learner_evidence_ledger (
            id, target_type, target_key, claim_summary, evidence_quote, source_activity,
            source_session_id, observation_count, confidence_score, mastery_stage,
            status, last_observed_at, created_at, knowledge_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          ledgerId,
          input.evidenceType === 'pronunciation' ? 'pronunciation' : 'vocabulary',
          targetKid,
          claim,
          quote,
          input.sourceModule,
          input.sessionId || null,
          1,
          confidence,
          input.assessmentData.isCorrect ? 'practicing' : 'struggling',
          'active',
          now,
          now,
          targetKid
        );
      }
    } catch {
      // Không chặn luồng chính nếu đồng bộ ledger phụ gặp lỗi nhẹ
    }

    const createdRow = db.prepare('SELECT * FROM learning_evidences WHERE id = ?').get(evidenceId) as any;
    const mappedEvidence = this.mapRowToEvidence(createdRow);

    // 6. Tự động tính toán & cập nhật Mastery Snapshot chính thức qua Mastery Engine
    try {
      masteryEngineService.updateMasteryFromEvidence(evidenceId, targetKid);
    } catch (mErr) {
      console.warn('Lỗi cập nhật Mastery Snapshot từ evidence:', mErr);
    }

    return {
      evidence: mappedEvidence,
      isDuplicate: false
    };
  }

  /**
   * 2. Lấy danh sách bằng chứng theo Knowledge ID
   */
  public getEvidenceByKnowledge(
    knowledgeId: string,
    options: { limit?: number; offset?: number; type?: EvidenceType; includeInvalidated?: boolean } = {}
  ): LearningEvidence[] {
    let sql = 'SELECT * FROM learning_evidences WHERE knowledge_id = ?';
    const args: any[] = [knowledgeId];

    if (!options.includeInvalidated) {
      sql += " AND status = 'valid'";
    }

    if (options.type) {
      sql += ' AND evidence_type = ?';
      args.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      args.push(options.limit);
      if (options.offset) {
        sql += ' OFFSET ?';
        args.push(options.offset);
      }
    }

    const rows = db.prepare(sql).all(...args) as any[];
    return rows.map(r => this.mapRowToEvidence(r));
  }

  /**
   * 3. Lấy bằng chứng theo Phiên học (Session ID)
   */
  public getEvidenceBySession(sessionId: string): LearningEvidence[] {
    const rows = db.prepare(`
      SELECT * FROM learning_evidences
      WHERE session_id = ? AND status = 'valid'
      ORDER BY created_at ASC
    `).all(sessionId) as any[];

    return rows.map(r => this.mapRowToEvidence(r));
  }

  /**
   * 4. Lấy bằng chứng theo Phân hệ Nguồn (Source Module)
   */
  public getEvidenceBySource(
    sourceModule: SourceModule,
    options: { limit?: number; offset?: number } = {}
  ): LearningEvidence[] {
    let sql = "SELECT * FROM learning_evidences WHERE source_module = ? AND status = 'valid' ORDER BY created_at DESC";
    const args: any[] = [sourceModule];

    if (options.limit) {
      sql += ' LIMIT ?';
      args.push(options.limit);
      if (options.offset) {
        sql += ' OFFSET ?';
        args.push(options.offset);
      }
    }

    const rows = db.prepare(sql).all(...args) as any[];
    return rows.map(r => this.mapRowToEvidence(r));
  }

  /**
   * 5. Lấy danh sách bằng chứng gần đây nhất
   */
  public getRecentEvidence(limit: number = 50, filterType?: EvidenceType): LearningEvidence[] {
    let sql = "SELECT * FROM learning_evidences WHERE status = 'valid'";
    const args: any[] = [];

    if (filterType) {
      sql += ' AND evidence_type = ?';
      args.push(filterType);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(limit);

    const rows = db.prepare(sql).all(...args) as any[];
    return rows.map(r => this.mapRowToEvidence(r));
  }

  /**
   * 6. Vô hiệu hóa một bằng chứng (Invalidate Evidence - Append Only)
   * Không xóa dữ liệu trong DB, ghi nhật ký vào evidence_corrections
   */
  public invalidateEvidence(evidenceId: string, reason: string, correctedBy: string = 'user'): boolean {
    const row = db.prepare('SELECT * FROM learning_evidences WHERE id = ?').get(evidenceId) as any;
    if (!row) {
      throw new Error(`Evidence với ID [${evidenceId}] không tồn tại.`);
    }

    const now = Date.now();
    const corId = generatePrefixedId('COR', now);

    const tx = db.transaction(() => {
      // 1. Cập nhật trạng thái evidence
      db.prepare(`
        UPDATE learning_evidences
        SET status = 'invalidated', correction_reason = ?
        WHERE id = ?
      `).run(reason, evidenceId);

      // 2. Ghi nhật ký vào evidence_corrections
      db.prepare(`
        INSERT INTO evidence_corrections (
          id, evidence_id, correction_type, previous_data_json, new_data_json,
          reason, corrected_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        corId,
        evidenceId,
        'invalidate',
        JSON.stringify(row),
        JSON.stringify({ status: 'invalidated', correction_reason: reason }),
        reason,
        correctedBy,
        now
      );
    });

    tx();
    return true;
  }

  /**
   * 7. Thiết lập liên kết chuỗi giữa 2 bằng chứng (ví dụ: Lần sửa lỗi remedies_error)
   */
  public linkRelatedEvidences(
    sourceEvidenceId: string,
    targetEvidenceId: string,
    relationType: 'remedies_error' | 'retry_of' | 'subsequent_review' | 'derived_from'
  ): boolean {
    const now = Date.now();
    const id = generatePrefixedId('EVR', now);
    const res = db.prepare(`
      INSERT INTO evidence_relations (id, source_evidence_id, target_evidence_id, relation_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sourceEvidenceId, targetEvidenceId, relationType, now);
    return res.changes > 0;
  }

  /**
   * 8. Trích xuất Timeline tiến trình học tập của một kiến thức
   */
  public getEvidenceTimeline(knowledgeId: string): Array<{
    id: string;
    date: string;
    timestamp: number;
    evidenceType: EvidenceType;
    action: string;
    sourceModule: SourceModule;
    isCorrect?: boolean | null;
    score?: number | null;
    summary: string;
  }> {
    const evidences = this.getEvidenceByKnowledge(knowledgeId, { limit: 100, includeInvalidated: false });
    return evidences.map(e => {
      let summary = e.action;
      if (e.observedData.userUtterance) {
        summary = `Phát ngôn: "${e.observedData.userUtterance}"`;
      } else if (e.observedData.providedAnswer) {
        summary = `Trả lời: "${e.observedData.providedAnswer}"`;
      } else if (e.assessmentData.srsRating) {
        summary = `Đánh giá SRS: ${e.assessmentData.srsRating}`;
      } else if (e.observedData.audioMetrics) {
        summary = `Luyện phát âm: ${e.observedData.audioMetrics.actualDurationMs}ms (${e.assessmentData.acousticAccuracy || 'đã ghi'})`;
      }

      return {
        id: e.id,
        date: new Date(e.createdAt).toLocaleString('vi-VN'),
        timestamp: e.createdAt,
        evidenceType: e.evidenceType,
        action: e.action,
        sourceModule: e.sourceModule,
        isCorrect: e.assessmentData.isCorrect,
        score: e.assessmentData.score,
        summary
      };
    });
  }

  /**
   * 9. Lấy thống kê toàn cảnh về hệ thống Learning Evidence
   */
  public getEvidenceStatistics(): EvidenceStatistics {
    const totalEvidences = (db.prepare('SELECT COUNT(*) as count FROM learning_evidences').get() as any).count;
    const validEvidences = (db.prepare("SELECT COUNT(*) as count FROM learning_evidences WHERE status = 'valid'").get() as any).count;
    const invalidatedEvidences = totalEvidences - validEvidences;

    const byTypeRows = db.prepare("SELECT evidence_type, COUNT(*) as count FROM learning_evidences WHERE status = 'valid' GROUP BY evidence_type").all() as any[];
    const byType: Record<EvidenceType, number> = {
      exposure: 0,
      instruction: 0,
      recognition: 0,
      recall: 0,
      application: 0,
      pronunciation: 0,
      listening_reading: 0,
      review: 0
    };
    for (const r of byTypeRows) {
      if (r.evidence_type in byType) {
        byType[r.evidence_type as EvidenceType] = r.count;
      }
    }

    const bySourceRows = db.prepare("SELECT source_module, COUNT(*) as count FROM learning_evidences WHERE status = 'valid' GROUP BY source_module").all() as any[];
    const bySource: Record<SourceModule, number> = {
      ai_tutor: 0,
      voice_chat: 0,
      dictionary: 0,
      lesson: 0,
      placement: 0,
      srs: 0,
      pronunciation_lab: 0,
      shadowing: 0,
      reading: 0
    };
    for (const r of bySourceRows) {
      if (r.source_module in bySource) {
        bySource[r.source_module as SourceModule] = r.count;
      }
    }

    const byMethodRows = db.prepare("SELECT assessment_method, COUNT(*) as count FROM learning_evidences WHERE status = 'valid' GROUP BY assessment_method").all() as any[];
    const byMethod: Record<AssessmentMethod, number> = {
      deterministic_rule: 0,
      ai_evaluation: 0,
      audio_evaluation: 0,
      human_confirmation: 0,
      imported_baseline: 0
    };
    for (const r of byMethodRows) {
      if (r.assessment_method in byMethod) {
        byMethod[r.assessment_method as AssessmentMethod] = r.count;
      }
    }

    const distinctKnowledgeTracked = (db.prepare("SELECT COUNT(DISTINCT knowledge_id) as count FROM learning_evidences WHERE status = 'valid'").get() as any).count;

    // Tính tỉ lệ trả lời đúng
    const evaluatedRows = db.prepare(`
      SELECT 
        SUM(CASE WHEN json_extract(assessment_data_json, '$.isCorrect') = 1 THEN 1 ELSE 0 END) as correctCount,
        COUNT(*) as totalTested
      FROM learning_evidences
      WHERE status = 'valid' AND json_extract(assessment_data_json, '$.isCorrect') IS NOT NULL
    `).get() as any;

    const accuracyRate = evaluatedRows.totalTested > 0
      ? Math.round((evaluatedRows.correctCount / evaluatedRows.totalTested) * 100)
      : 100;

    return {
      totalEvidences,
      validEvidences,
      invalidatedEvidences,
      byType,
      bySource,
      byMethod,
      distinctKnowledgeTracked,
      accuracyRate
    };
  }

  /**
   * Helper mapping row SQLite sang interface LearningEvidence
   */
  private mapRowToEvidence(row: any): LearningEvidence {
    return {
      id: row.id,
      knowledgeId: row.knowledge_id,
      evidenceType: row.evidence_type,
      action: row.action,
      sourceModule: row.source_module,
      sessionId: row.session_id || undefined,
      attemptId: row.attempt_id || undefined,
      idempotencyKey: row.idempotency_key || undefined,
      observedData: JSON.parse(row.observed_data_json),
      assessmentData: JSON.parse(row.assessment_data_json),
      inferenceData: row.inference_data_json ? JSON.parse(row.inference_data_json) : undefined,
      assessmentMethod: row.assessment_method,
      evaluator: row.evaluator,
      confidence: row.confidence,
      status: row.status,
      correctionReason: row.correction_reason || undefined,
      schemaVersion: row.schema_version,
      createdAt: row.created_at
    };
  }
}

export const learningEvidenceService = new LearningEvidenceService();
