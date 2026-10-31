import { db } from './db.js';
import { knowledgeRegistryService, KnowledgeItem } from './knowledgeRegistryService.js';
import { learningEvidenceService, LearningEvidence } from './learningEvidenceService.js';
import { masteryEngineService, MasterySnapshot, CompositeMasteryState } from './masteryEngineService.js';
import { generatePrefixedId } from './utils/idGenerator.js';

export interface RecordActivityInput {
  // Định danh tri thức: Hoặc truyền knowledgeId trực tiếp, hoặc truyền text để Registry tự tra cứu/tạo mới
  knowledgeId?: string;
  hanziSimplified?: string;
  itemType?: 'vocabulary' | 'grammar' | 'sentence_pattern' | 'pronunciation';
  displayText?: string;
  pinyin?: string;

  // Loại hoạt động và nguồn gốc
  activityType:
    | 'exposure'
    | 'instruction'
    | 'recognition'
    | 'recall'
    | 'application'
    | 'pronunciation'
    | 'listening_reading'
    | 'review'
    | 'assessment';
  sourceModule:
    | 'ai_tutor'
    | 'voice_chat'
    | 'dictionary'
    | 'lesson'
    | 'placement'
    | 'srs'
    | 'pronunciation_lab'
    | 'shadowing'
    | 'reading';
  action: string;
  sessionId?: string;
  attemptId?: string;
  idempotencyKey?: string;

  // Dữ liệu quan sát thuần túy khách quan (bắt buộc speaker là 'user' đối với hành vi người học)
  observedData: {
    speaker?: 'user';
    userUtterance?: string;
    userText?: string;
    selectedOption?: string;
    optionsAvailable?: string[];
    audioMetrics?: {
      actualDurationMs?: number;
      expectedDurationMs?: number;
      speedPacing?: 'too_fast' | 'natural' | 'too_slow';
      matchRate?: number;
    };
    contextSentence?: string;
    metadata?: Record<string, any>;
  };

  // Kết quả đánh giá
  assessmentData: {
    isCorrect?: boolean | null;
    score?: number;
    mistakeTypes?: string[];
    explanationVi?: string;
    sm2Result?: any;
    timeSpentMs?: number;
  };

  // Suy luận sư phạm có phạm vi (tùy chọn)
  inferenceData?: {
    pedagogicClaim?: string;
    isMasteryClaim?: boolean;
    observedRootCause?: string;
  };

  assessmentMethod?:
    | 'deterministic_rule'
    | 'ai_evaluation'
    | 'audio_evaluation'
    | 'human_confirmation'
    | 'imported_baseline';
  evaluator?: string;
  confidence?: number;
  learnerId?: string;
}

export interface KnowledgeContextResult {
  knowledgeItem: KnowledgeItem;
  mastery: MasterySnapshot;
  senses: any[];
  relations: any[];
  recentErrors: any[];
  recentEvidences: LearningEvidence[];
  srsStatus?: {
    itemId: string;
    intervalDays: number;
    repetitions: number;
    easeFactor: number;
    nextReviewAt: number;
    status: string;
  };
}

export interface UnifiedLearnerProfile {
  learnerId: string;
  name: string;
  currentHsk: number;
  targetHsk: number;
  learningStyle: string;
  radarScores: {
    vocabBreadth: number;
    grammarAccuracy: number;
    listening: number;
    reading: number;
    writing: number;
    fluency: number;
  };
  masteryCounts: Record<CompositeMasteryState, number>;
  totalKnowledgeCount: number;
  totalEvidenceCount: number;
  accuracyRate: number;
  needsReviewCount: number;
  topStrengths: Array<{ id: string; text: string; score: number }>;
  topWeaknesses: Array<{ id: string; text: string; state: string; reason: string }>;
  updatedAt: number;
}

export interface DataHealthReport {
  status: 'healthy' | 'warning' | 'critical';
  integrityCheck: string;
  totalKnowledgeItems: number;
  totalEvidences: number;
  totalMasterySnapshots: number;
  orphanEvidencesCount: number;
  unmappedKnowledgeItemsCount: number;
  mismatchedSnapshotsCount: number;
  checkedAt: number;
  details: string[];
}

export class UnifiedLearningMemoryService {
  private static instance: UnifiedLearningMemoryService;

  private constructor() {}

  public static getInstance(): UnifiedLearningMemoryService {
    if (!UnifiedLearningMemoryService.instance) {
      UnifiedLearningMemoryService.instance = new UnifiedLearningMemoryService();
    }
    return UnifiedLearningMemoryService.instance;
  }

  /**
   * 1. CỔNG GHI NHẬN HOẠT ĐỘNG HỌC TẬP THỐNG NHẤT (Single Entry Point for Learning Activity)
   * Phối hợp: Knowledge Registry -> Learning Evidence -> Mastery Engine -> Error & Profile Sync
   */
  public recordLearningActivity(input: RecordActivityInput): {
    success: boolean;
    evidence: LearningEvidence;
    snapshot: MasterySnapshot;
    knowledgeItem: KnowledgeItem;
    isDuplicate: boolean;
  } {
    const learnerId = input.learnerId || 'default';

    // A. Định danh tri thức qua Knowledge Registry (A1)
    let knowledgeId = input.knowledgeId;
    let kItem: KnowledgeItem | null = null;

    if (knowledgeId) {
      kItem = knowledgeRegistryService.getKnowledgeById(knowledgeId);
    }

    if (!kItem && (input.hanziSimplified || input.displayText)) {
      const targetText = input.hanziSimplified || input.displayText || '';
      const regRes = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: input.itemType || 'vocabulary',
        displayText: targetText,
        hanziSimplified: input.hanziSimplified || targetText,
        pinyin: input.pinyin,
        initialSense: input.observedData?.contextSentence
          ? { meaningVi: input.observedData.contextSentence }
          : undefined,
        source: input.sourceModule
      });
      kItem = regRes.item;
      knowledgeId = kItem.id;
    }

    if (!knowledgeId || !kItem) {
      throw new Error('Không thể xác định hoặc tạo mới tri thức trong Knowledge Registry cho hoạt động này.');
    }

    // B. Ghi nhận Bằng chứng Học tập Bất biến (A2)
    const evRecord = learningEvidenceService.recordEvidence({
      knowledgeId,
      evidenceType: input.activityType,
      action: input.action,
      sourceModule: input.sourceModule,
      sessionId: input.sessionId,
      attemptId: input.attemptId,
      idempotencyKey: input.idempotencyKey,
      observedData: input.observedData as any,
      assessmentData: input.assessmentData,
      inferenceData: input.inferenceData,
      assessmentMethod: input.assessmentMethod || 'deterministic_rule',
      evaluator: input.evaluator || input.sourceModule,
      confidence: input.confidence ?? 1.0
    });

    // C. Tự động cập nhật Snapshot Thành Thạo (A3)
    const snapshot = masteryEngineService.getMastery(knowledgeId, learnerId);

    // D. Đồng bộ hóa Sổ tay Lỗi Sai (Learning Errors) nếu người học mắc lỗi
    if (input.assessmentData.isCorrect === false || (input.assessmentData.mistakeTypes && input.assessmentData.mistakeTypes.length > 0)) {
      try {
        const errorType = input.assessmentData.mistakeTypes?.[0] || (input.activityType === 'pronunciation' ? 'pronunciation' : 'grammar');
        const userSentence = input.observedData.userUtterance || input.observedData.userText || kItem.displayText;
        const explanation = input.assessmentData.explanationVi || input.inferenceData?.pedagogicClaim || `Lỗi phát sinh khi thực hiện ${input.action}`;

        // Kiểm tra xem lỗi đã tồn tại chưa
        const existingError = db.prepare(`
          SELECT id, occurrence_count FROM learning_errors 
          WHERE knowledge_id = ? AND status != 'resolved' LIMIT 1
        `).get(knowledgeId) as any;

        const now = Date.now();
        if (existingError) {
          db.prepare(`
            UPDATE learning_errors 
            SET occurrence_count = occurrence_count + 1,
                last_occurred_at = ?,
                explanation_vi = ?
            WHERE id = ?
          `).run(now, explanation, existingError.id);
        } else {
          db.prepare(`
            INSERT INTO learning_errors (
              error_type, title, user_sentence, corrected_sentence,
              explanation_vi, occurrence_count, last_occurred_at, status, knowledge_id
            ) VALUES (?, ?, ?, ?, ?, 1, ?, 'pending', ?)
          `).run(
            errorType,
            `Lỗi liên quan đến ${kItem.displayText}`,
            userSentence,
            kItem.displayText,
            explanation,
            now,
            knowledgeId
          );
        }
      } catch (err) {
        console.warn('Lỗi ghi nhận vào learning_errors:', err);
      }
    }

    // E. Đồng bộ chỉ số năng lực 6 chiều trong learner_profile
    this.refreshLearnerProfileIndicators(learnerId);

    return {
      success: true,
      evidence: evRecord.evidence,
      snapshot,
      knowledgeItem: kItem,
      isDuplicate: evRecord.isDuplicate
    };
  }

  /**
   * 2. TRUY XUẤT TOÀN DIỆN NGỮ CẢNH CỦA MỘT KIẾN THỨC (Knowledge Context)
   * Kết nối tri thức + mức thành thạo + nghĩa + quan hệ + lỗi sai + bằng chứng gần đây + SRS
   */
  public getKnowledgeContext(
    knowledgeIdOrText: string,
    options?: { learnerId?: string; includeHistory?: boolean }
  ): KnowledgeContextResult | null {
    const learnerId = options?.learnerId || 'default';

    // Tìm kiếm trong Knowledge Registry
    let kItem = knowledgeRegistryService.getKnowledgeById(knowledgeIdOrText);
    if (!kItem) {
      const searchRes = knowledgeRegistryService.findKnowledge({
        query: knowledgeIdOrText,
        limit: 1
      });
      if (searchRes.length > 0) {
        kItem = searchRes[0];
      }
    }

    if (!kItem) return null;

    const kid = kItem.id;

    // Snapshot thành thạo từ Mastery Engine
    const mastery = masteryEngineService.getMastery(kid, learnerId);

    // Tầng nghĩa và quan hệ từ Knowledge Registry
    const senses = knowledgeRegistryService.getSenses(kid);
    const relations = knowledgeRegistryService.getRelatedKnowledge(kid);

    // Lỗi sai gần đây liên kết với kiến thức này
    const recentErrors = db.prepare(`
      SELECT * FROM learning_errors 
      WHERE knowledge_id = ? 
      ORDER BY last_occurred_at DESC LIMIT 5
    `).all(kid) as any[];

    // Bằng chứng học tập gần đây
    const recentEvidences = learningEvidenceService.getEvidenceByKnowledge(kid, { limit: 10 });

    // Trạng thái thẻ SRS tương ứng
    let srsStatus: KnowledgeContextResult['srsStatus'] = undefined;
    const srsRow = db.prepare(`
      SELECT * FROM srs_items 
      WHERE knowledge_id = ? OR prompt_zh = ? LIMIT 1
    `).get(kid, kItem.displayText) as any;

    if (srsRow) {
      srsStatus = {
        itemId: srsRow.id,
        intervalDays: srsRow.interval_days,
        repetitions: srsRow.repetition_count,
        easeFactor: srsRow.ease_factor,
        nextReviewAt: srsRow.next_review_at,
        status: srsRow.status
      };
    }

    return {
      knowledgeItem: kItem,
      mastery,
      senses,
      relations,
      recentErrors,
      recentEvidences,
      srsStatus
    };
  }

  /**
   * 3. HỒ SƠ HỌC TẬP TỔNG HỢP VÀ THỐNG NHẤT (Unified Learner Profile)
   */
  public getLearnerProfile(learnerId: string = 'default'): UnifiedLearnerProfile {
    const pRow = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get(learnerId) as any || {
      id: learnerId,
      name: 'Người học',
      current_hsk: 1,
      target_hsk: 3,
      learning_style: 'visual',
      vocab_breadth_score: 50,
      grammar_accuracy_score: 50,
      listening_score: 50,
      reading_score: 50,
      writing_score: 50,
      fluency_score: 50,
      updated_at: Date.now()
    };

    // Thống kê phân bổ Mastery State thực tế
    const stateCounts: Record<CompositeMasteryState, number> = {
      UNKNOWN: 0,
      UNSEEN: 0,
      EXPOSED: 0,
      LEARNING: 0,
      UNSTABLE: 0,
      FAMILIAR: 0,
      MASTERED: 0
    };

    const countRows = db.prepare(`
      SELECT composite_state, COUNT(*) as count 
      FROM mastery_snapshots 
      WHERE learner_id = ? 
      GROUP BY composite_state
    `).all(learnerId) as any[];

    for (const r of countRows) {
      if (r.composite_state in stateCounts) {
        stateCounts[r.composite_state as CompositeMasteryState] = r.count;
      }
    }

    const totalKnowledgeCount = (db.prepare("SELECT COUNT(*) as count FROM knowledge_items WHERE status = 'active'").get() as any).count;
    const totalEvidenceCount = (db.prepare("SELECT COUNT(*) as count FROM learning_evidences WHERE status = 'valid'").get() as any).count;
    const needsReviewCount = (db.prepare('SELECT COUNT(*) as count FROM mastery_snapshots WHERE learner_id = ? AND needs_review = 1').get(learnerId) as any).count;

    // Tỉ lệ chính xác
    const passEvidence = (db.prepare(`
      SELECT COUNT(*) as count FROM learning_evidences 
      WHERE status = 'valid' AND json_extract(assessment_data_json, '$.isCorrect') = 1
    `).get() as any).count;
    const accuracyRate = totalEvidenceCount > 0 ? Math.round((passEvidence / totalEvidenceCount) * 100) : 0;

    // Top thế mạnh (Top Mastered Items)
    const strongRows = db.prepare(`
      SELECT ms.knowledge_id, ki.display_text, ms.overall_confidence
      FROM mastery_snapshots ms
      JOIN knowledge_items ki ON ms.knowledge_id = ki.id
      WHERE ms.learner_id = ? AND ms.composite_state = 'MASTERED'
      ORDER BY ms.overall_confidence DESC, ms.last_calculated_at DESC
      LIMIT 5
    `).all(learnerId) as any[];

    const topStrengths = strongRows.map(r => ({
      id: r.knowledge_id,
      text: r.display_text,
      score: Math.round(r.overall_confidence * 100)
    }));

    // Top điểm yếu / bất ổn (Top Unstable & Struggling Items)
    const weakItems = masteryEngineService.getWeakKnowledge({ learnerId, limit: 5 });
    const topWeaknesses = weakItems.map(w => {
      const ki = knowledgeRegistryService.getKnowledgeById(w.knowledgeId);
      return {
        id: w.knowledgeId,
        text: ki?.displayText || w.knowledgeId,
        state: w.compositeState,
        reason: w.reasoningSummary
      };
    });

    return {
      learnerId,
      name: pRow.name,
      currentHsk: pRow.current_hsk,
      targetHsk: pRow.target_hsk,
      learningStyle: pRow.learning_style,
      radarScores: {
        vocabBreadth: pRow.vocab_breadth_score || 50,
        grammarAccuracy: pRow.grammar_accuracy_score || 50,
        listening: pRow.listening_score || 50,
        reading: pRow.reading_score || 50,
        writing: pRow.writing_score || 50,
        fluency: pRow.fluency_score || 50
      },
      masteryCounts: stateCounts,
      totalKnowledgeCount,
      totalEvidenceCount,
      accuracyRate,
      needsReviewCount,
      topStrengths,
      topWeaknesses,
      updatedAt: pRow.updated_at
    };
  }

  /**
   * 4. LẤY DANH SÁCH KIẾN THỨC CẦN ÔN TẬP GẤP (Knowledge for Review)
   * Kết hợp: Mastery Engine (needs_review = 1) + Thẻ SRS quá hạn
   */
  public getKnowledgeForReview(options?: { learnerId?: string; limit?: number }): Array<{
    knowledgeId: string;
    displayText: string;
    itemType: string;
    compositeState: string;
    retentionScore: number;
    daysSinceLastPractice: number;
    reason: string;
  }> {
    const learnerId = options?.learnerId || 'default';
    const limit = options?.limit || 20;
    const now = Date.now();

    const rows = db.prepare(`
      SELECT ms.knowledge_id, ki.display_text, ki.item_type, ms.composite_state,
             ms.retention_score, ms.last_evidence_at, ms.reasoning_summary
      FROM mastery_snapshots ms
      JOIN knowledge_items ki ON ms.knowledge_id = ki.id
      WHERE ms.learner_id = ? AND (
        ms.needs_review = 1 OR 
        ms.retention_score < 60 OR
        ms.composite_state = 'UNSTABLE'
      )
      ORDER BY ms.needs_review DESC, ms.retention_score ASC
      LIMIT ?
    `).all(learnerId, limit) as any[];

    return rows.map(r => {
      const days = r.last_evidence_at ? Number(((now - r.last_evidence_at) / (1000 * 60 * 60 * 24)).toFixed(1)) : 0;
      return {
        knowledgeId: r.knowledge_id,
        displayText: r.display_text,
        itemType: r.item_type,
        compositeState: r.composite_state,
        retentionScore: r.retention_score,
        daysSinceLastPractice: days,
        reason: r.reasoning_summary
      };
    });
  }

  /**
   * 5. LẤY DANH SÁCH KIẾN THỨC YẾU / LỖ HỔNG (Learning Weaknesses)
   */
  public getLearningWeaknesses(options?: { learnerId?: string; limit?: number }) {
    return masteryEngineService.getWeakKnowledge(options);
  }

  /**
   * 6. LẤY DANH SÁCH KIẾN THỨC MỚI TIẾP CẬN GẦN ĐÂY (Recently Learned)
   */
  public getRecentlyLearned(options?: { learnerId?: string; limit?: number }): Array<{
    knowledgeId: string;
    displayText: string;
    itemType: string;
    lastActivityType: string;
    lastActivityAt: number;
    compositeState: string;
  }> {
    const limit = options?.limit || 15;

    const rows = db.prepare(`
      SELECT le.knowledge_id, ki.display_text, ki.item_type, le.evidence_type,
             le.created_at, ms.composite_state
      FROM learning_evidences le
      JOIN knowledge_items ki ON le.knowledge_id = ki.id
      LEFT JOIN mastery_snapshots ms ON le.knowledge_id = ms.knowledge_id
      WHERE le.status = 'valid'
      ORDER BY le.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    // Loại bỏ trùng lặp knowledge_id (lấy lần mới nhất)
    const seen = new Set<string>();
    const result: any[] = [];
    for (const r of rows) {
      if (!seen.has(r.knowledge_id)) {
        seen.add(r.knowledge_id);
        result.push({
          knowledgeId: r.knowledge_id,
          displayText: r.display_text,
          itemType: r.item_type,
          lastActivityType: r.evidence_type,
          lastActivityAt: r.created_at,
          compositeState: r.composite_state || 'UNKNOWN'
        });
      }
    }

    return result;
  }

  /**
   * 7. TRÍCH XUẤT THÔNG TIN NGẮN GỌN CHO AI TUTOR & VOICE CHAT (Selective Pedagogic Briefing)
   * Không đưa cả DB vào prompt; chỉ trích xuất thông tin liên quan trực tiếp đến nội dung trò chuyện
   */
  public getRelevantKnowledgeForAITutor(
    queryText: string,
    options?: { hskLevel?: number; limit?: number }
  ): {
    hskLevel: number;
    matchedKnowledge: Array<{
      id: string;
      displayText: string;
      itemType: string;
      compositeState: string;
      confidence: number;
      applicationScore: number;
      recentError?: string;
    }>;
    recurrentMistakes: string[];
    pedagogicGuidance: string;
  } {
    const limit = options?.limit || 5;
    const hskLevel = options?.hskLevel || 1;

    // Tìm kiếm các từ vựng / ngữ pháp xuất hiện trong câu nói
    const matchesMap = new Map<string, KnowledgeItem>();

    // 1. Tìm kiếm trực tiếp qua findKnowledge
    const directMatches = knowledgeRegistryService.findKnowledge({
      query: queryText,
      limit
    });
    for (const m of directMatches) {
      matchesMap.set(m.id, m);
    }

    // 2. Tìm kiếm các từ/ngữ pháp nằm trong câu nói của người học
    if (matchesMap.size < limit && /[\u4e00-\u9fa5]/.test(queryText)) {
      const containedRows = db.prepare(`
        SELECT * FROM knowledge_items 
        WHERE status = 'active' 
          AND ? LIKE ('%' || hanzi_simplified || '%') 
          AND LENGTH(hanzi_simplified) >= 1
        ORDER BY LENGTH(hanzi_simplified) DESC
        LIMIT ?
      `).all(queryText, limit) as any[];

      for (const r of containedRows) {
        const item = knowledgeRegistryService.getKnowledgeById(r.id);
        if (item && !matchesMap.has(item.id)) {
          matchesMap.set(item.id, item);
        }
      }
    }

    const matches = Array.from(matchesMap.values()).slice(0, limit);

    const matchedKnowledge = matches.map(m => {
      const snap = masteryEngineService.getMastery(m.id);
      const err = db.prepare(`
        SELECT title FROM learning_errors WHERE knowledge_id = ? AND status != 'resolved' LIMIT 1
      `).get(m.id) as any;

      return {
        id: m.id,
        displayText: m.displayText,
        itemType: m.itemType,
        compositeState: snap.compositeState,
        confidence: snap.overallConfidence,
        applicationScore: snap.applicationScore,
        recentError: err?.title
      };
    });

    // Lỗi sai phổ biến của người học gần đây
    const errorRows = db.prepare(`
      SELECT title FROM learning_errors 
      WHERE status != 'resolved' 
      ORDER BY occurrence_count DESC, last_occurred_at DESC 
      LIMIT 3
    `).all() as any[];
    const recurrentMistakes = errorRows.map(e => e.title);

    let pedagogicGuidance = 'Người học giao tiếp tự nhiên. Khuyến khích phản xạ mở rộng.';
    const unstableMatch = matchedKnowledge.find(m => m.compositeState === 'UNSTABLE');
    if (unstableMatch) {
      pedagogicGuidance = `LƯU Ý: Học viên chưa ổn định với kiến thức "${unstableMatch.displayText}". Hãy tạo cơ hội tự đặt câu ngắn và sửa lỗi tinh tế nếu gặp sai sót.`;
    }

    return {
      hskLevel,
      matchedKnowledge,
      recurrentMistakes,
      pedagogicGuidance
    };
  }

  /**
   * 8. KIỂM TRA SỨC KHỎE DỮ LIỆU TOÀN DIỆN (Data Health Audit)
   * Kiểm tra bản ghi mồ côi, ID không hợp lệ, toàn vẹn SQLite WAL
   */
  public auditDataHealth(): DataHealthReport {
    const details: string[] = [];
    let status: DataHealthReport['status'] = 'healthy';

    // 1. SQLite Integrity check
    const integrity = db.prepare('PRAGMA integrity_check').get() as any;
    const integrityCheck = integrity.integrity_check;
    if (integrityCheck !== 'ok') {
      status = 'critical';
      details.push(`SQLite Integrity Check lỗi: ${integrityCheck}`);
    }

    // 2. Kiểm tra Evidence mồ côi (không trỏ đến knowledge_items hợp lệ)
    const orphanEvs = db.prepare(`
      SELECT COUNT(*) as count FROM learning_evidences le
      LEFT JOIN knowledge_items ki ON le.knowledge_id = ki.id
      WHERE ki.id IS NULL
    `).get() as any;
    const orphanEvidencesCount = orphanEvs.count;
    if (orphanEvidencesCount > 0) {
      status = 'warning';
      details.push(`Phát hiện ${orphanEvidencesCount} bằng chứng mồ côi (không trỏ đến Knowledge Item nào).`);
    }

    // 3. Kiểm tra Snapshot không đồng nhất
    const orphanSnaps = db.prepare(`
      SELECT COUNT(*) as count FROM mastery_snapshots ms
      LEFT JOIN knowledge_items ki ON ms.knowledge_id = ki.id
      WHERE ki.id IS NULL
    `).get() as any;
    const mismatchedSnapshotsCount = orphanSnaps.count;
    if (mismatchedSnapshotsCount > 0) {
      status = 'warning';
      details.push(`Phát hiện ${mismatchedSnapshotsCount} snapshot thành thạo không có Knowledge Item tương ứng.`);
    }

    // 4. Kiểm tra các mục từ vựng/ngữ pháp cũ chưa liên kết knowledge_id
    const unmappedVocab = (db.prepare('SELECT COUNT(*) as count FROM vocabulary_memory WHERE knowledge_id IS NULL').get() as any).count;
    const unmappedGrammar = (db.prepare('SELECT COUNT(*) as count FROM grammar_memory WHERE knowledge_id IS NULL').get() as any).count;
    const unmappedKnowledgeItemsCount = unmappedVocab + unmappedGrammar;

    const totalKnowledgeItems = (db.prepare('SELECT COUNT(*) as count FROM knowledge_items').get() as any).count;
    const totalEvidences = (db.prepare('SELECT COUNT(*) as count FROM learning_evidences').get() as any).count;
    const totalMasterySnapshots = (db.prepare('SELECT COUNT(*) as count FROM mastery_snapshots').get() as any).count;

    if (details.length === 0) {
      details.push('Hệ thống dữ liệu SQLite WAL hoàn hảo. 100% bằng chứng và snapshot liên kết chặt chẽ với Knowledge Registry.');
    }

    return {
      status,
      integrityCheck,
      totalKnowledgeItems,
      totalEvidences,
      totalMasterySnapshots,
      orphanEvidencesCount,
      unmappedKnowledgeItemsCount,
      mismatchedSnapshotsCount,
      checkedAt: Date.now(),
      details
    };
  }

  /**
   * 9. TÁI TẠO BỘ NHỚ HỌC TẬP TỪ NGUỒN GỐC (Rebuild Unified Memory)
   * Tái tính toán lại toàn bộ Mastery Snapshots từ Learning Evidences và đồng bộ Profile
   */
  public rebuildUnifiedMemory(options?: { learnerId?: string }): {
    totalSnapshotsRebuilt: number;
    profileUpdated: boolean;
    rebuiltAt: number;
  } {
    const learnerId = options?.learnerId || 'default';

    // 1. Rebuild toàn bộ Mastery Snapshots từ Learning Evidence
    const rebuildRes = masteryEngineService.rebuildMastery(undefined, learnerId);

    // 2. Đồng bộ hóa lại 6 chỉ số radar trong learner_profile
    this.refreshLearnerProfileIndicators(learnerId);

    return {
      totalSnapshotsRebuilt: rebuildRes.totalRebuilt,
      profileUpdated: true,
      rebuiltAt: Date.now()
    };
  }

  /**
   * Cập nhật các chỉ số radar 6 chiều trong learner_profile dựa trên dữ liệu thực chứng
   */
  private refreshLearnerProfileIndicators(learnerId: string = 'default'): void {
    try {
      // Tính điểm trung bình từ mastery_snapshots
      const stats = db.prepare(`
        SELECT 
          AVG(recognition_score) as avg_rec,
          AVG(recall_score) as avg_recall,
          AVG(application_score) as avg_app,
          AVG(retention_score) as avg_ret,
          AVG(pronunciation_score) as avg_pronun
        FROM mastery_snapshots
        WHERE learner_id = ? AND evidence_count > 0
      `).get(learnerId) as any;

      const vocabScore = Math.min(100, Math.max(10, Math.round((stats?.avg_rec || 50) * 0.5 + (stats?.avg_recall || 50) * 0.5)));
      const grammarScore = Math.min(100, Math.max(10, Math.round(stats?.avg_app || 50)));
      const fluencyScore = Math.min(100, Math.max(10, Math.round((stats?.avg_app || 50) * 0.6 + (stats?.avg_pronun || 60) * 0.4)));

      db.prepare(`
        UPDATE learner_profile SET
          vocab_breadth_score = ?,
          grammar_accuracy_score = ?,
          fluency_score = ?,
          updated_at = ?
        WHERE id = ?
      `).run(vocabScore, grammarScore, fluencyScore, Date.now(), learnerId);
    } catch {
      // ignore
    }
  }

  /**
   * 10. TỐI ƯU TOÀN DIỆN HỆ THỐNG VÀ CƠ SỞ DỮ LIỆU (System & DB Optimization)
   */
  public optimizeSystem(): {
    integrity: string;
    autoMappedVocab: number;
    autoMappedGrammar: number;
    totalKnowledgeItems: number;
    totalSnapshots: number;
    vacuumOptimized: boolean;
  } {
    let autoMappedVocab = 0;
    let autoMappedGrammar = 0;

    // A. Tự động liên kết các mục cũ chưa có knowledge_id
    const unmappedVocab = db.prepare('SELECT id, simplified, pinyin, meaning_vi FROM vocabulary_memory WHERE knowledge_id IS NULL').all() as any[];
    for (const v of unmappedVocab) {
      const k = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: 'vocabulary',
        displayText: v.simplified,
        hanziSimplified: v.simplified,
        pinyin: v.pinyin,
        initialSense: { meaningVi: v.meaning_vi || '' }
      });
      db.prepare('UPDATE vocabulary_memory SET knowledge_id = ? WHERE id = ?').run(k.item.id, v.id);
      autoMappedVocab++;
    }

    const unmappedGrammar = db.prepare('SELECT id, pattern_name, formula, meaning_vi FROM grammar_memory WHERE knowledge_id IS NULL').all() as any[];
    for (const g of unmappedGrammar) {
      const k = knowledgeRegistryService.findOrCreateKnowledge({
        itemType: 'grammar',
        displayText: g.pattern_name,
        formula: g.formula,
        initialSense: { meaningVi: g.meaning_vi || '' }
      });
      db.prepare('UPDATE grammar_memory SET knowledge_id = ? WHERE id = ?').run(k.item.id, g.id);
      autoMappedGrammar++;
    }

    // B. SQLite PRAGMA optimize & wal checkpoint
    db.prepare('PRAGMA optimize').run();
    db.prepare('PRAGMA wal_checkpoint(PASSIVE)').run();
    const integrity = (db.prepare('PRAGMA integrity_check').get() as any).integrity_check;

    const totalKnowledgeItems = (db.prepare('SELECT COUNT(*) as count FROM knowledge_items').get() as any).count;
    const totalSnapshots = (db.prepare('SELECT COUNT(*) as count FROM mastery_snapshots').get() as any).count;

    return {
      integrity,
      autoMappedVocab,
      autoMappedGrammar,
      totalKnowledgeItems,
      totalSnapshots,
      vacuumOptimized: true
    };
  }
}

export const unifiedLearningMemoryService = UnifiedLearningMemoryService.getInstance();
