import { db } from './db.js';
import { generatePrefixedId } from './utils/idGenerator.js';
import { LearningEvidence } from './learningEvidenceService.js';

export type CompositeMasteryState =
  | 'UNKNOWN'
  | 'UNSEEN'
  | 'EXPOSED'
  | 'LEARNING'
  | 'UNSTABLE'
  | 'FAMILIAR'
  | 'MASTERED';

export interface MasteryDimensionScore {
  score: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  evidenceCount: number;
  successCount: number;
  failureCount: number;
  lastEvaluatedAt: number | null;
  status: 'unassessed' | 'developing' | 'competent' | 'mastered' | 'struggling';
  details?: Record<string, any>;
}

export interface MasteryDimensions {
  recognition: MasteryDimensionScore;
  recall: MasteryDimensionScore;
  application: MasteryDimensionScore;
  retention: MasteryDimensionScore;
  pronunciation?: MasteryDimensionScore;
  listeningComprehension?: MasteryDimensionScore;
  readingComprehension?: MasteryDimensionScore;
  writingAccuracy?: MasteryDimensionScore;
}

export interface ContradictionDetail {
  type: 'recognition_application_gap' | 'high_recall_low_retention' | 'erratic_results';
  description: string;
  detectedAt: number;
  severity: 'high' | 'medium' | 'low';
}

export interface MasterySnapshot {
  id: string; // SNP_...
  knowledgeId: string;
  learnerId: string;
  compositeState: CompositeMasteryState;
  overallConfidence: number; // 0.0 - 1.0
  recognitionScore: number;
  recognitionConfidence: number;
  recallScore: number;
  recallConfidence: number;
  applicationScore: number;
  applicationConfidence: number;
  retentionScore: number;
  retentionConfidence: number;
  pronunciationScore: number | null;
  pronunciationConfidence: number | null;
  dimensions: MasteryDimensions;
  evidenceCount: number;
  successCount: number;
  failureCount: number;
  firstEvidenceAt: number | null;
  lastEvidenceAt: number | null;
  lastCalculatedAt: number;
  everMastered: boolean;
  needsReview: boolean;
  decayFactor: number;
  reasoningSummary: string;
  contradictions: ContradictionDetail[];
  algorithmVersion: string;
}

export interface MasteryHistoryEntry {
  id: string; // MSH_...
  knowledgeId: string;
  learnerId: string;
  previousState: CompositeMasteryState | null;
  newState: CompositeMasteryState;
  triggerEvidenceId: string | null;
  triggerAction: string | null;
  reason: string;
  dimensionsSummary: Record<string, any>;
  createdAt: number;
}

export interface MasteryRuleConfig {
  evidenceWeights: Record<string, number>;
  masteryThresholds: {
    min_evidence_count_mastered: number;
    min_confidence_mastered: number;
    min_recognition_score: number;
    min_recall_score: number;
    min_application_score: number;
    min_retention_score: number;
    min_familiar_score: number;
    min_confidence_familiar: number;
  };
  contradictionThresholds: {
    recognition_high_threshold: number;
    application_low_threshold: number;
    min_application_fails: number;
  };
  retentionDecayParams: {
    base_half_life_days: number;
    needs_review_threshold: number;
  };
}

export class MasteryEngineService {
  private static instance: MasteryEngineService;
  private readonly algorithmVersion = '2.2.0';

  private constructor() {}

  public static getInstance(): MasteryEngineService {
    if (!MasteryEngineService.instance) {
      MasteryEngineService.instance = new MasteryEngineService();
    }
    return MasteryEngineService.instance;
  }

  /**
   * Lấy cấu hình quy tắc đánh giá từ database (có fallback mặc định minh bạch)
   */
  public getRuleConfig(): MasteryRuleConfig {
    try {
      const rows = db.prepare('SELECT rule_key, value_json FROM mastery_evaluation_rules').all() as any[];
      const configMap: Record<string, any> = {};
      for (const r of rows) {
        try {
          configMap[r.rule_key] = JSON.parse(r.value_json);
        } catch {
          // ignore parse error
        }
      }

      return {
        evidenceWeights: configMap['evidence_weights'] || {
          exposure: 0.1,
          instruction: 0.2,
          recognition: 0.5,
          recall: 0.8,
          application: 1.0,
          pronunciation: 0.8,
          listening_reading: 0.7,
          review: 0.9
        },
        masteryThresholds: configMap['mastery_thresholds'] || {
          min_evidence_count_mastered: 3,
          min_confidence_mastered: 0.75,
          min_recognition_score: 80,
          min_recall_score: 75,
          min_application_score: 70,
          min_retention_score: 70,
          min_familiar_score: 65,
          min_confidence_familiar: 0.5
        },
        contradictionThresholds: configMap['contradiction_thresholds'] || {
          recognition_high_threshold: 80,
          application_low_threshold: 45,
          min_application_fails: 2
        },
        retentionDecayParams: configMap['retention_decay_params'] || {
          base_half_life_days: 14,
          needs_review_threshold: 60
        }
      };
    } catch {
      return {
        evidenceWeights: {
          exposure: 0.1,
          instruction: 0.2,
          recognition: 0.5,
          recall: 0.8,
          application: 1.0,
          pronunciation: 0.8,
          listening_reading: 0.7,
          review: 0.9
        },
        masteryThresholds: {
          min_evidence_count_mastered: 3,
          min_confidence_mastered: 0.75,
          min_recognition_score: 80,
          min_recall_score: 75,
          min_application_score: 70,
          min_retention_score: 70,
          min_familiar_score: 65,
          min_confidence_familiar: 0.5
        },
        contradictionThresholds: {
          recognition_high_threshold: 80,
          application_low_threshold: 45,
          min_application_fails: 2
        },
        retentionDecayParams: {
          base_half_life_days: 14,
          needs_review_threshold: 60
        }
      };
    }
  }

  /**
   * Tính toán trạng thái thành thạo thuần túy từ bảng learning_evidences (On-the-fly)
   */
  public calculateMastery(
    knowledgeId: string,
    learnerId: string = 'default',
    now: number = Date.now()
  ): MasterySnapshot {
    // 1. Kiểm tra tồn tại trong Knowledge Registry
    const kItem = db.prepare('SELECT id, item_type, display_text FROM knowledge_items WHERE id = ?').get(knowledgeId) as any;
    if (!kItem) {
      return this.createEmptySnapshot(knowledgeId, learnerId, 'UNKNOWN', 0.0, 'Không tìm thấy định danh tri thức trong Knowledge Registry');
    }

    // 2. Truy xuất bằng chứng hợp lệ
    const rows = db.prepare(`
      SELECT * FROM learning_evidences 
      WHERE knowledge_id = ? AND status = 'valid' 
      ORDER BY created_at ASC
    `).all(knowledgeId) as any[];

    if (!rows || rows.length === 0) {
      return this.createEmptySnapshot(knowledgeId, learnerId, 'UNSEEN', 0.0, `Người học chưa từng tiếp xúc hoặc thực hành tri thức "${kItem.display_text}".`);
    }

    // Parse evidences
    const evidences: LearningEvidence[] = rows.map(r => ({
      id: r.id,
      knowledgeId: r.knowledge_id,
      evidenceType: r.evidence_type,
      action: r.action,
      sourceModule: r.source_module,
      sessionId: r.session_id,
      attemptId: r.attempt_id,
      idempotencyKey: r.idempotency_key,
      observedData: JSON.parse(r.observed_data_json || '{}'),
      assessmentData: JSON.parse(r.assessment_data_json || '{}'),
      inferenceData: r.inference_data_json ? JSON.parse(r.inference_data_json) : undefined,
      assessmentMethod: r.assessment_method,
      evaluator: r.evaluator,
      confidence: r.confidence ?? 1.0,
      status: r.status,
      createdAt: r.created_at
    }));

    // Cấu hình quy tắc
    const rules = this.getRuleConfig();

    // 3. Khởi tạo tính toán đa chiều
    const recEvs = evidences.filter(e => e.evidenceType === 'recognition' || (e.evidenceType === 'listening_reading' && e.assessmentData.score !== undefined));
    const recallEvs = evidences.filter(e => e.evidenceType === 'recall');
    const appEvs = evidences.filter(e => e.evidenceType === 'application');
    const pronunEvs = evidences.filter(e => e.evidenceType === 'pronunciation');
    const reviewEvs = evidences.filter(e => e.evidenceType === 'review');
    const exposureEvs = evidences.filter(e => e.evidenceType === 'exposure');
    const instrEvs = evidences.filter(e => e.evidenceType === 'instruction');

    // Helper tính điểm và độ tin cậy cho 1 chiều
    const calcDimension = (
      evList: LearningEvidence[],
      baseWeight: number,
      targetType: string
    ): MasteryDimensionScore => {
      if (evList.length === 0) {
        return {
          score: 0,
          confidence: 0,
          evidenceCount: 0,
          successCount: 0,
          failureCount: 0,
          lastEvaluatedAt: null,
          status: 'unassessed'
        };
      }

      let totalWeight = 0;
      let weightedScoreSum = 0;
      let successCount = 0;
      let failureCount = 0;
      let lastAt = 0;

      for (const ev of evList) {
        lastAt = Math.max(lastAt, ev.createdAt);
        const score = ev.assessmentData.score ?? (ev.assessmentData.isCorrect === true ? 100 : ev.assessmentData.isCorrect === false ? 0 : 50);

        if (ev.assessmentData.isCorrect === true || score >= 70) {
          successCount++;
        } else if (ev.assessmentData.isCorrect === false || score < 50) {
          failureCount++;
        }

        // Tinh chỉnh trọng số theo mức độ hỗ trợ
        let weight = baseWeight * (ev.confidence ?? 1.0);
        if (ev.observedData?.selectedOption && ev.observedData?.optionsAvailable?.length) {
          // Trắc nghiệm: có gợi ý sẵn đáp án
          weight *= 0.75;
        }

        weightedScoreSum += score * weight;
        totalWeight += weight;
      }

      const avgScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;
      // Độ tin cậy tiệm cận: 1 - exp(-count / 2.5)
      const conf = Math.min(0.99, Number((1 - Math.exp(-evList.length / 2.5)).toFixed(2)));

      let status: MasteryDimensionScore['status'] = 'developing';
      if (avgScore >= 80 && conf >= 0.7) status = 'mastered';
      else if (avgScore >= 65 && conf >= 0.5) status = 'competent';
      else if (failureCount >= 2 && avgScore < 50) status = 'struggling';

      return {
        score: avgScore,
        confidence: conf,
        evidenceCount: evList.length,
        successCount,
        failureCount,
        lastEvaluatedAt: lastAt || null,
        status
      };
    };

    const recognitionDim = calcDimension(recEvs, rules.evidenceWeights.recognition, 'recognition');
    const recallDim = calcDimension(recallEvs, rules.evidenceWeights.recall, 'recall');
    const applicationDim = calcDimension(appEvs, rules.evidenceWeights.application, 'application');
    const pronunDim = calcDimension(pronunEvs, rules.evidenceWeights.pronunciation, 'pronunciation');

    // 4. Chiều Retention (Khả năng duy trì kiến thức qua thời gian)
    const firstEvidenceAt = evidences[0]?.createdAt ?? now;
    const lastEvidenceAt = evidences[evidences.length - 1]?.createdAt ?? now;
    const daysSpan = Math.max(0, (lastEvidenceAt - firstEvidenceAt) / (1000 * 60 * 60 * 24));
    const idleDays = Math.max(0, (now - lastEvidenceAt) / (1000 * 60 * 60 * 24));

    // Điểm duy trì cơ sở dựa trên kết quả ôn tập SRS hoặc số phiên thực hành cách ngày
    let baseRetention = 50;
    if (reviewEvs.length > 0) {
      const lastReview = reviewEvs[reviewEvs.length - 1];
      const sm2Interval = lastReview.assessmentData.sm2Result?.newInterval ?? 1;
      const isGood = lastReview.assessmentData.isCorrect === true;
      baseRetention = isGood ? Math.min(100, 60 + sm2Interval * 5) : 35;
    } else if (daysSpan >= 3 && evidences.length >= 3) {
      baseRetention = 75;
    } else if (evidences.length >= 2) {
      baseRetention = 60;
    }

    // Mô hình phân rã Ebbinghaus tự nhiên
    const halfLife = rules.retentionDecayParams.base_half_life_days * (1 + Math.min(daysSpan, 30) / 10);
    const decayFactor = Number(Math.exp(-0.693 * (idleDays / halfLife)).toFixed(2));
    const retentionScore = Math.max(10, Math.min(100, Math.round(baseRetention * decayFactor)));
    const retentionConf = Math.min(0.95, Number((1 - Math.exp(-(reviewEvs.length + (daysSpan > 0 ? 1 : 0)) / 2.0)).toFixed(2)));
    const lastReviewFail = reviewEvs.length > 0 && reviewEvs[reviewEvs.length - 1].assessmentData.isCorrect === false;
    const needsReview = (retentionScore < rules.retentionDecayParams.needs_review_threshold && evidences.length >= 2) || lastReviewFail;

    const retentionDim: MasteryDimensionScore = {
      score: retentionScore,
      confidence: retentionConf,
      evidenceCount: reviewEvs.length,
      successCount: reviewEvs.filter(r => r.assessmentData.isCorrect === true).length,
      failureCount: reviewEvs.filter(r => r.assessmentData.isCorrect === false).length,
      lastEvaluatedAt: lastEvidenceAt,
      status: retentionScore >= 75 ? 'mastered' : retentionScore >= 60 ? 'competent' : 'struggling',
      details: {
        daysSpan: Number(daysSpan.toFixed(1)),
        idleDays: Number(idleDays.toFixed(1)),
        decayFactor,
        needsReview
      }
    };

    // 5. Kiểm tra phát hiện mâu thuẫn (Contradiction Detection)
    const contradictions: ContradictionDetail[] = [];
    const isHighRec = recognitionDim.evidenceCount > 0 && recognitionDim.score >= rules.contradictionThresholds.recognition_high_threshold;
    const isLowApp = applicationDim.evidenceCount > 0 && (
      applicationDim.score <= rules.contradictionThresholds.application_low_threshold ||
      applicationDim.failureCount >= rules.contradictionThresholds.min_application_fails
    );

    if (isHighRec && isLowApp) {
      contradictions.push({
        type: 'recognition_application_gap',
        description: `Người học nhận diện tốt qua trắc nghiệm (${recognitionDim.score}%), nhưng gặp khó khăn khi tự vận dụng trong câu (${applicationDim.score}%). Không thể xem là thành thạo.`,
        detectedAt: now,
        severity: 'high'
      });
    }

    if (recallDim.score >= 75 && retentionDim.score < 45 && idleDays >= 7) {
      contradictions.push({
        type: 'high_recall_low_retention',
        description: `Từng ghi nhớ tốt (${recallDim.score}%) nhưng đã ${Math.round(idleDays)} ngày chưa thực hành, độ duy trì suy giảm (${retentionDim.score}%).`,
        detectedAt: now,
        severity: 'medium'
      });
    }

    // 6. Kiểm tra trạng thái ever_mastered từ snapshot cũ trong DB
    let everMastered = false;
    try {
      const prev = db.prepare('SELECT ever_mastered FROM mastery_snapshots WHERE knowledge_id = ? AND learner_id = ?').get(knowledgeId, learnerId) as any;
      if (prev && prev.ever_mastered === 1) {
        everMastered = true;
      }
    } catch {
      // ignore
    }

    // 7. Xác định mức độ thành thạo tổng hợp (Composite Mastery State)
    let compositeState: CompositeMasteryState = 'UNKNOWN';
    let reasoningSummary = '';

    const totalPracticeCount = recEvs.length + recallEvs.length + appEvs.length + pronunEvs.length + reviewEvs.length;
    const totalSuccessCount = evidences.filter(e => e.assessmentData.isCorrect === true).length;
    const totalFailureCount = evidences.filter(e => e.assessmentData.isCorrect === false).length;

    // Tính độ tin cậy tổng thể (Overall Confidence)
    // Dựa trên: số lượng bằng chứng, số chiều đã đánh giá, độ phong phú nguồn
    const distinctModules = new Set(evidences.map(e => e.sourceModule)).size;
    const moduleDiversityBonus = Math.min(0.2, distinctModules * 0.05);
    const rawConf = 1 - Math.exp(-evidences.length / 3.0) + moduleDiversityBonus;
    const overallConfidence = Math.min(0.99, Number(rawConf.toFixed(2)));

    // TH 1: Chỉ mới tiếp xúc hoặc xem bài giảng (chưa làm bài tập)
    if (totalPracticeCount === 0) {
      if (instrEvs.length > 0) {
        compositeState = 'EXPOSED';
        reasoningSummary = `Người học đã xem giảng giải/hướng dẫn về "${kItem.display_text}", nhưng chưa có dữ liệu thực hành kiểm chứng.`;
      } else if (exposureEvs.length > 0) {
        compositeState = 'EXPOSED';
        reasoningSummary = `Người học chỉ mới tra cứu từ điển hoặc tiếp xúc thoáng qua "${kItem.display_text}". Chưa bắt đầu học sâu.`;
      } else {
        compositeState = 'UNSEEN';
        reasoningSummary = `Chưa có hoạt động thực hành nào được ghi nhận.`;
      }
    }
    // TH 2: Phát hiện mâu thuẫn nghiêm trọng hoặc sai liên tục
    else if (contradictions.length > 0 && contradictions[0].severity === 'high') {
      compositeState = 'UNSTABLE';
      reasoningSummary = `Kiến thức chưa ổn định do có khoảng cách lớn giữa nhận diện và vận dụng thực tế. Cần tập trung luyện tạo câu và đàm thoại.`;
    } else if (totalFailureCount > totalSuccessCount && totalPracticeCount >= 2) {
      compositeState = 'UNSTABLE';
      reasoningSummary = `Tỷ lệ làm sai chiếm đa số (${totalFailureCount} lỗi sai / ${totalPracticeCount} lần thực hành). Cần xem lại bài giảng và làm bài tập củng cố.`;
    }
    // TH 3: Đang trong giai đoạn học ban đầu
    else if (totalPracticeCount < 3 && !everMastered) {
      compositeState = 'LEARNING';
      reasoningSummary = `Đang trong giai đoạn học ban đầu (${totalPracticeCount} lần thực hành). Đang hình thành nhận diện và ghi nhớ.`;
    }
    // TH 4: Đánh giá tiêu chuẩn MASTERED
    else if (
      totalPracticeCount >= rules.masteryThresholds.min_evidence_count_mastered &&
      overallConfidence >= rules.masteryThresholds.min_confidence_mastered &&
      (recEvs.length === 0 || recognitionDim.score >= rules.masteryThresholds.min_recognition_score) &&
      (recallEvs.length === 0 || recallDim.score >= rules.masteryThresholds.min_recall_score) &&
      (appEvs.length === 0 || applicationDim.score >= rules.masteryThresholds.min_application_score) &&
      retentionScore >= rules.masteryThresholds.min_retention_score &&
      // Phải có ít nhất 1 lần vận dụng thành công HOẶC phát âm/recall xuất sắc
      (applicationDim.successCount >= 1 || (recallDim.successCount >= 2 && recallDim.score >= 85))
    ) {
      compositeState = 'MASTERED';
      everMastered = true;
      reasoningSummary = `Đã đạt mức Thành Thạo toàn diện! Nhận diện (${recognitionDim.score}%), Nhớ lại (${recallDim.score}%), Vận dụng (${applicationDim.score}%) và Độ duy trì (${retentionDim.score}%).`;
    }
    // TH 5: Nắm tương đối (FAMILIAR)
    else if (
      (recognitionDim.score >= rules.masteryThresholds.min_familiar_score || recallDim.score >= rules.masteryThresholds.min_familiar_score) &&
      overallConfidence >= rules.masteryThresholds.min_confidence_familiar
    ) {
      compositeState = 'FAMILIAR';
      if (everMastered && needsReview) {
        reasoningSummary = `Từng đạt Thành Thạo nhưng độ duy trì suy giảm (${retentionScore}%). Cần một phiên ôn tập ngắn để phục hồi.`;
      } else {
        reasoningSummary = `Nắm tương đối vững (${recognitionDim.score}% nhận diện, ${recallDim.score}% nhớ lại), cần thêm bằng chứng vận dụng độc lập trong ngữ cảnh mới.`;
      }
    }
    // TH 6: Mặc định rơi vào LEARNING
    else {
      compositeState = 'LEARNING';
      reasoningSummary = `Đang tích lũy thực hành để củng cố phản xạ tự nhiên.`;
    }

    const dimensions: MasteryDimensions = {
      recognition: recognitionDim,
      recall: recallDim,
      application: applicationDim,
      retention: retentionDim,
      ...(pronunEvs.length > 0 ? { pronunciation: pronunDim } : {})
    };

    return {
      id: generatePrefixedId('SNP', now),
      knowledgeId,
      learnerId,
      compositeState,
      overallConfidence,
      recognitionScore: recognitionDim.score,
      recognitionConfidence: recognitionDim.confidence,
      recallScore: recallDim.score,
      recallConfidence: recallDim.confidence,
      applicationScore: applicationDim.score,
      applicationConfidence: applicationDim.confidence,
      retentionScore: retentionDim.score,
      retentionConfidence: retentionDim.confidence,
      pronunciationScore: pronunEvs.length > 0 ? pronunDim.score : null,
      pronunciationConfidence: pronunEvs.length > 0 ? pronunDim.confidence : null,
      dimensions,
      evidenceCount: evidences.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      firstEvidenceAt,
      lastEvidenceAt,
      lastCalculatedAt: now,
      everMastered,
      needsReview,
      decayFactor,
      reasoningSummary,
      contradictions,
      algorithmVersion: this.algorithmVersion
    };
  }

  /**
   * Lưu snapshot vào database và ghi nhận lịch sử nếu có biến động trạng thái
   */
  public saveSnapshot(snapshot: MasterySnapshot, triggerEvidenceId?: string, triggerAction?: string): void {
    const existing = db.prepare(`
      SELECT id, composite_state FROM mastery_snapshots 
      WHERE knowledge_id = ? AND learner_id = ?
    `).get(snapshot.knowledgeId, snapshot.learnerId) as any;

    const previousState = existing?.composite_state ?? null;
    const hasStateChanged = previousState !== snapshot.compositeState;

    db.transaction(() => {
      // 1. Upsert snapshot
      db.prepare(`
        INSERT INTO mastery_snapshots (
          id, knowledge_id, learner_id, composite_state, overall_confidence,
          recognition_score, recognition_confidence, recall_score, recall_confidence,
          application_score, application_confidence, retention_score, retention_confidence,
          pronunciation_score, pronunciation_confidence, dimensions_json, evidence_count,
          success_count, failure_count, first_evidence_at, last_evidence_at,
          last_calculated_at, ever_mastered, needs_review, decay_factor,
          reasoning_summary, contradictions_json, algorithm_version
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )
        ON CONFLICT(knowledge_id, learner_id) DO UPDATE SET
          composite_state = excluded.composite_state,
          overall_confidence = excluded.overall_confidence,
          recognition_score = excluded.recognition_score,
          recognition_confidence = excluded.recognition_confidence,
          recall_score = excluded.recall_score,
          recall_confidence = excluded.recall_confidence,
          application_score = excluded.application_score,
          application_confidence = excluded.application_confidence,
          retention_score = excluded.retention_score,
          retention_confidence = excluded.retention_confidence,
          pronunciation_score = excluded.pronunciation_score,
          pronunciation_confidence = excluded.pronunciation_confidence,
          dimensions_json = excluded.dimensions_json,
          evidence_count = excluded.evidence_count,
          success_count = excluded.success_count,
          failure_count = excluded.failure_count,
          first_evidence_at = excluded.first_evidence_at,
          last_evidence_at = excluded.last_evidence_at,
          last_calculated_at = excluded.last_calculated_at,
          ever_mastered = excluded.ever_mastered,
          needs_review = excluded.needs_review,
          decay_factor = excluded.decay_factor,
          reasoning_summary = excluded.reasoning_summary,
          contradictions_json = excluded.contradictions_json,
          algorithm_version = excluded.algorithm_version
      `).run(
        snapshot.id,
        snapshot.knowledgeId,
        snapshot.learnerId,
        snapshot.compositeState,
        snapshot.overallConfidence,
        snapshot.recognitionScore,
        snapshot.recognitionConfidence,
        snapshot.recallScore,
        snapshot.recallConfidence,
        snapshot.applicationScore,
        snapshot.applicationConfidence,
        snapshot.retentionScore,
        snapshot.retentionConfidence,
        snapshot.pronunciationScore,
        snapshot.pronunciationConfidence,
        JSON.stringify(snapshot.dimensions),
        snapshot.evidenceCount,
        snapshot.successCount,
        snapshot.failureCount,
        snapshot.firstEvidenceAt,
        snapshot.lastEvidenceAt,
        snapshot.lastCalculatedAt,
        snapshot.everMastered ? 1 : 0,
        snapshot.needsReview ? 1 : 0,
        snapshot.decayFactor,
        snapshot.reasoningSummary,
        JSON.stringify(snapshot.contradictions),
        snapshot.algorithmVersion
      );

      // 2. Nếu trạng thái thay đổi, ghi nhận lịch sử kiểm toán
      if (hasStateChanged) {
        const histId = generatePrefixedId('MSH', snapshot.lastCalculatedAt);
        db.prepare(`
          INSERT INTO mastery_history (
            id, knowledge_id, learner_id, previous_state, new_state,
            trigger_evidence_id, trigger_action, reason, dimensions_summary_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          histId,
          snapshot.knowledgeId,
          snapshot.learnerId,
          previousState,
          snapshot.compositeState,
          triggerEvidenceId || null,
          triggerAction || null,
          snapshot.reasoningSummary,
          JSON.stringify({
            rec: snapshot.recognitionScore,
            rec_conf: snapshot.recognitionConfidence,
            rec_count: snapshot.dimensions.recognition.evidenceCount,
            rec_success: snapshot.dimensions.recognition.successCount,
            rec_failure: snapshot.dimensions.recognition.failureCount,
            rec_last: snapshot.dimensions.recognition.lastEvaluatedAt,
            recall: snapshot.recallScore,
            recall_conf: snapshot.recallConfidence,
            recall_count: snapshot.dimensions.recall.evidenceCount,
            recall_success: snapshot.dimensions.recall.successCount,
            recall_failure: snapshot.dimensions.recall.failureCount,
            recall_last: snapshot.dimensions.recall.lastEvaluatedAt,
            app: snapshot.applicationScore,
            app_conf: snapshot.applicationConfidence,
            app_count: snapshot.dimensions.application.evidenceCount,
            app_success: snapshot.dimensions.application.successCount,
            app_failure: snapshot.dimensions.application.failureCount,
            app_last: snapshot.dimensions.application.lastEvaluatedAt,
            ret: snapshot.retentionScore,
            ret_conf: snapshot.retentionConfidence,
            ret_count: snapshot.dimensions.retention.evidenceCount,
            ret_success: snapshot.dimensions.retention.successCount,
            ret_failure: snapshot.dimensions.retention.failureCount,
            ret_last: snapshot.dimensions.retention.lastEvaluatedAt
          }),
          snapshot.lastCalculatedAt
        );
      }
    })();
  }

  /**
   * Cập nhật snapshot khi có một bằng chứng học tập mới
   */
  public updateMasteryFromEvidence(evidenceId: string, knowledgeId?: string): MasterySnapshot | null {
    try {
      let kid = knowledgeId;
      let action: string | undefined;

      if (!kid) {
        const ev = db.prepare('SELECT knowledge_id, action FROM learning_evidences WHERE id = ?').get(evidenceId) as any;
        if (!ev) return null;
        kid = ev.knowledge_id;
        action = ev.action;
      }

      if (!kid) return null;

      const snapshot = this.calculateMastery(kid, 'default');
      this.saveSnapshot(snapshot, evidenceId, action);
      return snapshot;
    } catch (err) {
      console.error('Lỗi khi updateMasteryFromEvidence:', err);
      return null;
    }
  }

  /**
   * Lấy snapshot thành thạo hiện tại của một kiến thức
   */
  public getMastery(knowledgeId: string, learnerId: string = 'default'): MasterySnapshot {
    const row = db.prepare(`
      SELECT * FROM mastery_snapshots 
      WHERE knowledge_id = ? AND learner_id = ?
    `).get(knowledgeId, learnerId) as any;

    if (!row) {
      // Nếu chưa có snapshot, tính toán ngay và lưu lại
      const fresh = this.calculateMastery(knowledgeId, learnerId);
      this.saveSnapshot(fresh);
      return fresh;
    }

    return {
      id: row.id,
      knowledgeId: row.knowledge_id,
      learnerId: row.learner_id,
      compositeState: row.composite_state,
      overallConfidence: row.overall_confidence,
      recognitionScore: row.recognition_score,
      recognitionConfidence: row.recognition_confidence,
      recallScore: row.recall_score,
      recallConfidence: row.recall_confidence,
      applicationScore: row.application_score,
      applicationConfidence: row.application_confidence,
      retentionScore: row.retention_score,
      retentionConfidence: row.retention_confidence,
      pronunciationScore: row.pronunciation_score,
      pronunciationConfidence: row.pronunciation_confidence,
      dimensions: JSON.parse(row.dimensions_json || '{}'),
      evidenceCount: row.evidence_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      firstEvidenceAt: row.first_evidence_at,
      lastEvidenceAt: row.last_evidence_at,
      lastCalculatedAt: row.last_calculated_at,
      everMastered: row.ever_mastered === 1,
      needsReview: row.needs_review === 1,
      decayFactor: row.decay_factor,
      reasoningSummary: row.reasoning_summary,
      contradictions: JSON.parse(row.contradictions_json || '[]'),
      algorithmVersion: row.algorithm_version
    };
  }

  /**
   * Truy vấn hàng loạt theo danh sách knowledge_id
   */
  public getMasteryByKnowledge(knowledgeIds: string[], learnerId: string = 'default'): Record<string, MasterySnapshot> {
    const result: Record<string, MasterySnapshot> = {};
    for (const kid of knowledgeIds) {
      result[kid] = this.getMastery(kid, learnerId);
    }
    return result;
  }

  /**
   * Lấy danh sách kiến thức yếu (UNSTABLE hoặc application thấp hoặc cần ôn tập)
   */
  public getWeakKnowledge(options?: { learnerId?: string; limit?: number }): MasterySnapshot[] {
    const learnerId = options?.learnerId || 'default';
    const limit = options?.limit || 20;

    const rows = db.prepare(`
      SELECT * FROM mastery_snapshots
      WHERE learner_id = ? AND (
        composite_state = 'UNSTABLE' OR
        needs_review = 1 OR
        (evidence_count > 0 AND application_score < 50 AND application_confidence > 0.3)
      )
      ORDER BY 
        CASE composite_state WHEN 'UNSTABLE' THEN 1 ELSE 2 END,
        needs_review DESC,
        application_score ASC
      LIMIT ?
    `).all(learnerId, limit) as any[];

    return rows.map(r => ({
      id: r.id,
      knowledgeId: r.knowledge_id,
      learnerId: r.learner_id,
      compositeState: r.composite_state,
      overallConfidence: r.overall_confidence,
      recognitionScore: r.recognition_score,
      recognitionConfidence: r.recognition_confidence,
      recallScore: r.recall_score,
      recallConfidence: r.recall_confidence,
      applicationScore: r.application_score,
      applicationConfidence: r.application_confidence,
      retentionScore: r.retention_score,
      retentionConfidence: r.retention_confidence,
      pronunciationScore: r.pronunciation_score,
      pronunciationConfidence: r.pronunciation_confidence,
      dimensions: JSON.parse(r.dimensions_json || '{}'),
      evidenceCount: r.evidence_count,
      successCount: r.success_count,
      failureCount: r.failure_count,
      firstEvidenceAt: r.first_evidence_at,
      lastEvidenceAt: r.last_evidence_at,
      lastCalculatedAt: r.last_calculated_at,
      everMastered: r.ever_mastered === 1,
      needsReview: r.needs_review === 1,
      decayFactor: r.decay_factor,
      reasoningSummary: r.reasoning_summary,
      contradictions: JSON.parse(r.contradictions_json || '[]'),
      algorithmVersion: r.algorithm_version
    }));
  }

  /**
   * Lấy danh sách kiến thức chưa chắc chắn (cần thêm bài kiểm tra/thực hành)
   */
  public getUncertainKnowledge(options?: { learnerId?: string; limit?: number }): MasterySnapshot[] {
    const learnerId = options?.learnerId || 'default';
    const limit = options?.limit || 20;

    const rows = db.prepare(`
      SELECT * FROM mastery_snapshots
      WHERE learner_id = ? AND (
        composite_state IN ('LEARNING', 'EXPOSED') OR
        (evidence_count > 0 AND overall_confidence < 0.5)
      )
      ORDER BY overall_confidence ASC, last_calculated_at DESC
      LIMIT ?
    `).all(learnerId, limit) as any[];

    return rows.map(r => ({
      id: r.id,
      knowledgeId: r.knowledge_id,
      learnerId: r.learner_id,
      compositeState: r.composite_state,
      overallConfidence: r.overall_confidence,
      recognitionScore: r.recognition_score,
      recognitionConfidence: r.recognition_confidence,
      recallScore: r.recall_score,
      recallConfidence: r.recall_confidence,
      applicationScore: r.application_score,
      applicationConfidence: r.application_confidence,
      retentionScore: r.retention_score,
      retentionConfidence: r.retention_confidence,
      pronunciationScore: r.pronunciation_score,
      pronunciationConfidence: r.pronunciation_confidence,
      dimensions: JSON.parse(r.dimensions_json || '{}'),
      evidenceCount: r.evidence_count,
      successCount: r.success_count,
      failureCount: r.failure_count,
      firstEvidenceAt: r.first_evidence_at,
      lastEvidenceAt: r.last_evidence_at,
      lastCalculatedAt: r.last_calculated_at,
      everMastered: r.ever_mastered === 1,
      needsReview: r.needs_review === 1,
      decayFactor: r.decay_factor,
      reasoningSummary: r.reasoning_summary,
      contradictions: JSON.parse(r.contradictions_json || '[]'),
      algorithmVersion: r.algorithm_version
    }));
  }

  /**
   * Lấy lịch sử chuyển đổi trạng thái thành thạo của một kiến thức
   */
  public getMasteryHistory(knowledgeId: string, learnerId: string = 'default'): MasteryHistoryEntry[] {
    const rows = db.prepare(`
      SELECT * FROM mastery_history
      WHERE knowledge_id = ? AND learner_id = ?
      ORDER BY created_at ASC
    `).all(knowledgeId, learnerId) as any[];

    return rows.map(r => ({
      id: r.id,
      knowledgeId: r.knowledge_id,
      learnerId: r.learner_id,
      previousState: r.previous_state,
      newState: r.new_state,
      triggerEvidenceId: r.trigger_evidence_id,
      triggerAction: r.trigger_action,
      reason: r.reason,
      dimensionsSummary: JSON.parse(r.dimensions_summary_json || '{}'),
      createdAt: r.created_at
    }));
  }

  /**
   * Tái tính toán lại toàn bộ snapshot từ bảng gốc learning_evidences (Rebuild từ scratch)
   */
  public rebuildMastery(knowledgeId?: string, learnerId: string = 'default'): { totalRebuilt: number; snapshots: MasterySnapshot[] } {
    let targetIds: string[] = [];

    if (knowledgeId) {
      targetIds = [knowledgeId];
    } else {
      const items = db.prepare('SELECT id FROM knowledge_items').all() as any[];
      targetIds = items.map(i => i.id);
    }

    const rebuilt: MasterySnapshot[] = [];

    db.transaction(() => {
      for (const kid of targetIds) {
        const snap = this.calculateMastery(kid, learnerId);
        this.saveSnapshot(snap, undefined, 'rebuild_mastery');
        rebuilt.push(snap);
      }
    })();

    return {
      totalRebuilt: rebuilt.length,
      snapshots: rebuilt
    };
  }

  private createEmptySnapshot(
    knowledgeId: string,
    learnerId: string,
    state: CompositeMasteryState,
    confidence: number,
    reasoning: string
  ): MasterySnapshot {
    const emptyDim: MasteryDimensionScore = {
      score: 0,
      confidence: 0,
      evidenceCount: 0,
      successCount: 0,
      failureCount: 0,
      lastEvaluatedAt: null,
      status: 'unassessed'
    };

    return {
      id: generatePrefixedId('SNP'),
      knowledgeId,
      learnerId,
      compositeState: state,
      overallConfidence: confidence,
      recognitionScore: 0,
      recognitionConfidence: 0,
      recallScore: 0,
      recallConfidence: 0,
      applicationScore: 0,
      applicationConfidence: 0,
      retentionScore: 0,
      retentionConfidence: 0,
      pronunciationScore: null,
      pronunciationConfidence: null,
      dimensions: {
        recognition: { ...emptyDim },
        recall: { ...emptyDim },
        application: { ...emptyDim },
        retention: { ...emptyDim }
      },
      evidenceCount: 0,
      successCount: 0,
      failureCount: 0,
      firstEvidenceAt: null,
      lastEvidenceAt: null,
      lastCalculatedAt: Date.now(),
      everMastered: false,
      needsReview: false,
      decayFactor: 1.0,
      reasoningSummary: reasoning,
      contradictions: [],
      algorithmVersion: this.algorithmVersion
    };
  }
}

export const masteryEngineService = MasteryEngineService.getInstance();
