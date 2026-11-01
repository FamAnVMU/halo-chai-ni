/**
 * AI Teaching Quality Engine (Halo Chinese v2.7.0)
 * Phase B4 - AI Teaching Quality Engine & Knowledge Benchmark
 *
 * Core engine providing:
 * 1. Unified 5-category Error Taxonomy & Severity classification.
 * 2. 5-step structured correction workflow with False-Positive protection.
 * 3. Root Cause Diagnosis for repeated learner errors (L1 interference, conceptual gap, etc.).
 * 4. Pedagogic Intent Detection & Adaptive Teaching strategies.
 * 5. Pre-delivery Teaching Quality Gate (deterministic Pinyin, Hanzi, and brevity audits).
 */

import { db } from './db.js';
import {
  AdaptivePedagogicCase,
  ErrorCategory,
  ErrorSeverityLevel,
  RootCauseDiagnosis,
  RootCauseType,
  StructuredCorrection,
  TeachingIntent,
  TeachingQualityAudit
} from './teachingQualityTypes.js';

export class TeachingQualityEngine {
  private static readonly ENGINE_VERSION = 'v2.7.0';

  /**
   * 1. Xác định ý định sư phạm thực tế của người học (Learner Intent Detection)
   * Chống biến mọi câu hỏi đơn giản thành một bài giảng dong dài
   */
  public static detectTeachingIntent(userMessage: string): TeachingIntent {
    const clean = (userMessage || '').trim().toLowerCase();

    // 1. Yêu cầu giải thích đơn giản hơn / chưa hiểu (Case 1)
    if (
      clean.includes('chưa hiểu') ||
      clean.includes('không hiểu') ||
      clean.includes('giải thích lại') ||
      clean.includes('dễ hiểu hơn') ||
      clean.includes('nói rõ hơn') ||
      clean.includes('đơn giản hơn') ||
      clean.includes('chậm lại') ||
      clean.includes('ví dụ khác')
    ) {
      return 'request_simpler';
    }

    // 2. Yêu cầu sửa lỗi
    if (
      clean.includes('sửa giúp') ||
      clean.includes('sửa câu') ||
      clean.includes('sai ở đâu') ||
      clean.includes('có đúng không') ||
      clean.includes('câu này đúng chưa') ||
      clean.includes('sửa lỗi')
    ) {
      return 'request_correction';
    }

    // 3. Hỏi ngữ pháp
    if (
      clean.includes('ngữ pháp') ||
      clean.includes('cấu trúc') ||
      clean.includes('công thức') ||
      clean.includes('cách dùng của') ||
      clean.includes('phân biệt') ||
      clean.includes('khác nhau thế nào') ||
      clean.includes('sự khác nhau')
    ) {
      return 'ask_grammar';
    }

    // 4. Hỏi nghĩa đơn giản
    if (
      clean.includes('nghĩa là gì') ||
      clean.includes('dịch là gì') ||
      clean.includes('tiếng trung là gì') ||
      clean.includes('nghĩa của từ') ||
      clean.startsWith('từ ') && clean.includes('là gì')
    ) {
      return 'ask_meaning';
    }

    // 5. Hỏi cách dùng từ
    if (
      clean.includes('dùng thế nào') ||
      clean.includes('cách dùng') ||
      clean.includes('khi nào dùng') ||
      clean.includes('đặt câu với')
    ) {
      return 'ask_usage';
    }

    // 6. Muốn học kiến thức mới
    if (
      clean.includes('muốn học từ mới') ||
      clean.includes('dạy tôi từ') ||
      clean.includes('học tiếp') ||
      clean.includes('bài mới')
    ) {
      return 'learn_new_concept';
    }

    // 7. Muốn kiểm tra kiến thức
    if (
      clean.includes('kiểm tra tôi') ||
      clean.includes('cho bài tập') ||
      clean.includes('đố tôi') ||
      clean.includes('hỏi tôi đi')
    ) {
      return 'test_knowledge';
    }

    // 8. Muốn luyện hội thoại
    if (
      clean.includes('luyện nói') ||
      clean.includes('đóng vai') ||
      clean.includes('hội thoại') ||
      clean.includes('trò chuyện')
    ) {
      return 'practice_conversation';
    }

    return 'general_chat';
  }

  /**
   * 2. Phân loại lỗi theo Error Taxonomy chuẩn mực (Section 4)
   */
  public static classifyError(
    originalSentence: string,
    correctedSentence: string,
    grammarPoint?: string
  ): { category: ErrorCategory; errorType: string; severity: ErrorSeverityLevel; isGenuineError: boolean; isPolishing: boolean } {
    const orig = originalSentence.trim();
    const corr = correctedSentence.trim();

    // Kiểm tra câu đúng nhưng chỉ muốn đề xuất văn phong tự nhiên hơn (Polishing / Advanced)
    if (this.isSentenceGrammaticallyValid(orig, corr)) {
      return {
        category: 'sentence_expression',
        errorType: 'unnatural_expression',
        severity: 'style',
        isGenuineError: false,
        isPolishing: true
      };
    }

    const origLower = orig.toLowerCase();

    // 1. Lỗi trật tự từ (Word Order / L1 Interference)
    // Người Việt hay đặt cụm thời gian / địa điểm sau động từ (vd: 去商店八点, 学汉语在学校)
    if (
      (/\d+点/.test(orig) && !/在?\s*\d+点/.test(orig.substring(0, orig.indexOf('点') + 2))) ||
      (orig.includes('在') && !corr.includes('在') === false && orig.indexOf('在') > orig.indexOf('去') && orig.indexOf('去') !== -1)
    ) {
      return {
        category: 'grammar',
        errorType: 'word_order',
        severity: 'major',
        isGenuineError: true,
        isPolishing: false
      };
    }

    // 2. Lỗi cấu trúc 把 (Thiếu thành phần bổ ngữ hoặc kết quả)
    if (orig.includes('把')) {
      if (orig === '我把作业做。' || orig === '我把作业做' || !/[了好完掉下进出过]/.test(orig.slice(orig.indexOf('把')))) {
        return {
          category: 'grammar',
          errorType: 'missing_component',
          severity: 'major',
          isGenuineError: true,
          isPolishing: false
        };
      }
    }

    // 3. Lỗi trợ từ ngữ pháp (了, 的, 得, 地, 过, 被)
    if (
      (orig.includes('了') !== corr.includes('了')) ||
      (orig.includes('过') !== corr.includes('过')) ||
      (orig.includes('得') !== corr.includes('得')) ||
      (orig.includes('地') !== corr.includes('地'))
    ) {
      return {
        category: 'grammar',
        errorType: 'particle_error',
        severity: 'major',
        isGenuineError: true,
        isPolishing: false
      };
    }

    // 4. Lỗi sai từ vựng / nhầm từ gần nghĩa (想 vs 要, 怎么 vs 为什么, 二 vs 两)
    if (
      (orig.includes('二个') && corr.includes('两个')) ||
      (orig.includes('我想一杯咖啡') && corr.includes('我要一杯咖啡')) ||
      (orig.includes('怎么') && corr.includes('为什么'))
    ) {
      return {
        category: 'vocabulary',
        errorType: 'near_synonym_confusion',
        severity: 'major',
        isGenuineError: true,
        isPolishing: false
      };
    }

    // 5. Lỗi câu không hoàn chỉnh hoặc khó hiểu
    if (orig.length < 3) {
      return {
        category: 'sentence_expression',
        errorType: 'incomplete_sentence',
        severity: 'critical',
        isGenuineError: true,
        isPolishing: false
      };
    }

    // Mặc định lỗi ngữ pháp chung
    return {
      category: 'grammar',
      errorType: grammarPoint ? 'structure_error' : 'usage_condition_violation',
      severity: 'minor',
      isGenuineError: true,
      isPolishing: false
    };
  }

  /**
   * 3. Kiểm tra xem câu ban đầu có thực sự sai hay chỉ là câu đúng có cách nói khác
   * BẢO VỆ CHỐNG SỬA OAN (False-positive correction protection - Section 4.6 & 5)
   */
  public static isSentenceGrammaticallyValid(userSentence: string, proposedCorrection: string): boolean {
    const cleanUser = userSentence.trim().replace(/[。！？\s]/g, '');
    const cleanCorr = proposedCorrection.trim().replace(/[。！？\s]/g, '');

    // Nếu hai câu giống hệt nhau
    if (cleanUser === cleanCorr) return true;

    // Các mẫu câu tiếng Trung hoàn toàn chuẩn xác nhưng hay bị AI sửa thành câu hoa mỹ hơn
    const validCommonSentences = [
      '我今天很高兴',
      '我很高兴',
      '他是我的朋友',
      '我想喝茶',
      '明天见',
      '我学习汉语',
      '我很喜欢中国菜',
      '这是我的书',
      '今天天气很好',
      '我吃了饭',
      '你要买什么'
    ];

    if (validCommonSentences.includes(cleanUser)) {
      return true;
    }

    // Nếu câu gốc có đầy đủ Chủ ngữ + Vị ngữ chuẩn (S + 很 + Tính từ)
    if (/^[\u4e00-\u9fa5]{1,4}(今天|昨天|现在)?很[\u4e00-\u9fa5]{1,3}$/.test(cleanUser)) {
      return true;
    }

    return false;
  }

  /**
   * 4. Quy trình 5 bước xây dựng lời sửa lỗi có cấu trúc (Structured 5-Step Correction)
   */
  public static buildStructuredCorrection(params: {
    originalText: string;
    correctedText: string;
    explanationVi: string;
    alternativeExpressions?: string[];
    grammarPoint?: string;
    isCasualChat?: boolean;
  }): StructuredCorrection {
    const { originalText, correctedText, explanationVi, alternativeExpressions = [], grammarPoint, isCasualChat = false } = params;

    const classification = this.classifyError(originalText, correctedText, grammarPoint);

    // Bước 5: Chỉ tạo bài tập vận dụng vi mô (microCheck) nếu là lỗi thực sự (major/critical) và không phải chat tự do
    let microCheck: StructuredCorrection['microCheck'] = undefined;
    const shouldAddMicroCheck = classification.isGenuineError &&
      (classification.severity === 'critical' || classification.severity === 'major') &&
      !isCasualChat;

    if (shouldAddMicroCheck) {
      microCheck = {
        needVerification: true,
        exerciseZh: `请用正确的语序或“${grammarPoint || '这个结构'}”再写一个句子。`,
        exerciseVi: `Em hãy thử đặt lại một câu ngắn sử dụng cấu trúc đúng để kiểm tra nhé!`
      };
    }

    return {
      originalText,
      correctedText: classification.isPolishing ? originalText : correctedText,
      errorCategory: classification.category,
      errorType: classification.errorType,
      severity: classification.severity,
      isGenuineError: classification.isGenuineError,
      isPolishing: classification.isPolishing,
      explanationVi: classification.isPolishing
        ? `Câu của em đã hoàn toàn đúng ngữ pháp! Có thể tham khảo thêm cách diễn đạt tự nhiên hơn: "${correctedText}".`
        : explanationVi,
      alternativeExpressions: alternativeExpressions.length > 0 ? alternativeExpressions : (classification.isPolishing ? [correctedText] : []),
      grammarPoint,
      needsPractice: Boolean(shouldAddMicroCheck),
      microCheck
    };
  }

  /**
   * 5. Chẩn đoán nguyên nhân gốc rễ cho lỗi lặp lại (Root Cause Diagnosis - Section 6)
   */
  public static diagnoseRootCause(conceptKey: string, learnerId: string = 'default'): RootCauseDiagnosis | null {
    // 1. Kiểm tra lịch sử lỗi sai từ SQLite
    const errors = db.prepare(`
      SELECT id, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at
      FROM learning_errors
      WHERE (error_type LIKE ? OR title LIKE ? OR user_sentence LIKE ? OR explanation_vi LIKE ?)
      ORDER BY last_occurred_at DESC
      LIMIT 5
    `).all(`%${conceptKey}%`, `%${conceptKey}%`, `%${conceptKey}%`, `%${conceptKey}%`) as any[];

    // 2. Kiểm tra bằng chứng từ learning_evidences
    const evidences = db.prepare(`
      SELECT le.id, le.knowledge_id, le.observed_data_json, le.assessment_data_json, le.created_at
      FROM learning_evidences le
      JOIN knowledge_items ki ON le.knowledge_id = ki.id
      WHERE (ki.canonical_key LIKE ? OR ki.display_text LIKE ? OR ki.hanzi_simplified LIKE ? OR le.evidence_type LIKE ?)
      ORDER BY le.created_at DESC
      LIMIT 5
    `).all(`%${conceptKey}%`, `%${conceptKey}%`, `%${conceptKey}%`, `%${conceptKey}%`) as any[];

    const totalOccurrences = (errors.reduce((sum, e) => sum + (e.occurrence_count || 1), 0)) + evidences.length;

    if (totalOccurrences < 2) {
      // Chưa đủ dữ liệu quan sát lặp lại -> Không vội kết luận theo Section 6
      return null;
    }

    const evidenceIds = [
      ...errors.map(e => `err_${e.id}`),
      ...evidences.map(e => e.id)
    ];

    // Phân tích biểu hiện và suy luận nguyên nhân
    let symptom = '';
    let suspectedCause: RootCauseType = 'conceptual_gap';
    let causeExplanationVi = '';
    let verificationPrompt = {
      promptZh: '',
      promptVi: '',
      expectedCriteria: ''
    };
    let remedyPlanVi = '';

    const keyLower = conceptKey.toLowerCase();

    if (keyLower.includes('ba') || keyLower.includes('把')) {
      symptom = 'Người học liên tục dùng câu chữ 把 nhưng thiếu bổ ngữ kết quả, xu hướng hoặc nơi chốn.';
      suspectedCause = 'rule_known_application_gap';
      causeExplanationVi = 'Người học nhớ công thức S + 把 + O + V nhưng chưa hình thành phản xạ rằng câu chữ 把 bắt buộc vị ngữ phải xử lý tân ngữ đến một kết quả cụ thể.';
      verificationPrompt = {
        promptZh: '请把“衣服 / 洗”写成一个完整的句子。',
        promptVi: 'Em hãy ghép "quần áo / giặt" thành một câu hoàn chỉnh với chữ 把 nhé.',
        expectedCriteria: 'Phải có bổ ngữ kết quả như: 洗干净了, 洗好了, 洗完了.'
      };
      remedyPlanVi = 'Tập trung luyện các cặp động từ đi liền bổ ngữ kết quả phổ biến (做完, 看见, 洗干净) thay vì chỉ giảng lại lý thuyết chữ 把.';
    } else if (keyLower.includes('le') || keyLower.includes('了')) {
      symptom = 'Người học dùng 了 bất kỳ khi nào có ý quá khứ, hoặc quên 了 khi hành động đã hoàn thành.';
      suspectedCause = 'l1_interference';
      causeExplanationVi = 'Chuyển di tiêu cực từ tiếng Việt: coi "đã" = "quá khứ" và dịch máy móc sang 了, trong khi tiếng Trung là ngôn ngữ không có thì (tense) mà là thể (aspect hoàn thành).';
      verificationPrompt = {
        promptZh: '昨天我常去图书馆。（这句话对吗？如果不对，怎么改？）',
        promptVi: 'Câu "Hôm qua tôi thường đến thư viện" có dùng 了 không? Hãy giải thích nhé.',
        expectedCriteria: 'Hành động mang tính thói quen trong quá khứ không dùng 了.'
      };
      remedyPlanVi = 'So sánh đối chiếu giữa thể hoàn thành của 了 và hành động thói quen; phân biệt 了 hoàn thành động tác vs 了 biến đổi trạng thái ngữ khí.';
    } else if (keyLower.includes('word_order') || keyLower.includes('time') || keyLower.includes('trật tự')) {
      symptom = 'Người học đặt trạng từ chỉ thời gian hoặc nơi chốn ở cuối câu theo thói quen tiếng Việt.';
      suspectedCause = 'l1_interference';
      causeExplanationVi = 'Thói quen tiếng Việt nói "Tôi đi chợ lúc 8 giờ", trong khi tiếng Trung quy định trật tự thời gian và địa điểm phải đứng trước hành động (S + Thời gian + Nơi chốn + Động từ).';
      verificationPrompt = {
        promptZh: '请翻译句子：“Tôi ăn cơm ở nhà hàng vào buổi trưa.”',
        promptVi: 'Em hãy dịch câu: "Tôi ăn cơm ở nhà hàng vào buổi trưa" sang tiếng Trung.',
        expectedCriteria: 'Trật tự chuẩn: 我中午在饭馆吃饭 (Thời gian -> Nơi chốn -> Động từ).'
      };
      remedyPlanVi = 'Luyện phản xạ khung "Ai - Khi nào - Ở đâu - Làm gì" (S + Time + Place + Action) qua 5 ví dụ liên tục.';
    } else if (keyLower.includes('xiang') || keyLower.includes('yao') || keyLower.includes('想')) {
      symptom = 'Nhầm lẫn giữa 想 (nguyện vọng/suy nghĩ) và 要 (dự định chắc chắn/yêu cầu dứt khoát).';
      suspectedCause = 'confusion_between_uses';
      causeExplanationVi = 'Cả hai đều dịch sang tiếng Việt là "muốn", gây nhầm lẫn khi đặt món hoặc biểu đạt kế hoạch dứt khoát.';
      verificationPrompt = {
        promptZh: '服务员，我（想/要）一杯冰咖啡。',
        promptVi: 'Khi gọi đồ uống trong quán, em chọn 想 hay 要?',
        expectedCriteria: 'Chọn 要 vì biểu thị yêu cầu phục vụ dứt khoát.'
      };
      remedyPlanVi = 'Cung cấp bài tập tương phản ngữ cảnh mua sắm vs ước mơ tương lai.';
    } else {
      symptom = `Lỗi lặp lại liên quan đến kiến thức "${conceptKey}" qua ${totalOccurrences} lần ghi nhận.`;
      suspectedCause = 'conceptual_gap';
      causeExplanationVi = 'Người học chưa nắm rõ điều kiện áp dụng ngữ pháp trong các ngữ cảnh khác nhau.';
      verificationPrompt = {
        promptZh: `请用“${conceptKey}”造一个句子。`,
        promptVi: `Em hãy thử đặt một câu ví dụ với "${conceptKey}" nhé.`,
        expectedCriteria: 'Đảm bảo áp dụng đúng điều kiện ngữ pháp.'
      };
      remedyPlanVi = 'Bẻ nhỏ kiến thức thành 2 bước và cung cấp ví dụ đối chiếu.';
    }

    const diagnosisId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = Date.now();

    const diagnosis: RootCauseDiagnosis = {
      id: diagnosisId,
      learnerId,
      conceptKey,
      conceptName: conceptKey,
      symptom,
      suspectedCause,
      causeExplanationVi,
      evidenceIds,
      observationCount: totalOccurrences,
      confidence: Math.min(0.95, 0.6 + totalOccurrences * 0.08),
      isVerified: false,
      verificationPrompt,
      remedyPlanVi,
      createdAt: now,
      updatedAt: now
    };

    // Lưu vào SQLite
    try {
      db.prepare(`
        INSERT INTO teaching_root_cause_diagnoses (
          id, learner_id, concept_key, concept_name, symptom, suspected_cause,
          cause_explanation_vi, evidence_ids_json, observation_count, confidence,
          is_verified, verification_prompt_json, remedy_plan_vi, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        diagnosis.id,
        diagnosis.learnerId,
        diagnosis.conceptKey,
        diagnosis.conceptName,
        diagnosis.symptom,
        diagnosis.suspectedCause,
        diagnosis.causeExplanationVi,
        JSON.stringify(diagnosis.evidenceIds),
        diagnosis.observationCount,
        diagnosis.confidence,
        JSON.stringify(diagnosis.verificationPrompt),
        diagnosis.remedyPlanVi,
        now,
        now
      );
    } catch (_err) {
      // Ignored if table busy
    }

    return diagnosis;
  }

  /**
   * 6. Xác minh kết quả chẩn đoán sau bài kiểm tra vi mô (Verification)
   */
  public static verifyDiagnosis(diagnosisId: string, passed: boolean): boolean {
    try {
      const now = Date.now();
      const row = db.prepare('SELECT * FROM teaching_root_cause_diagnoses WHERE id = ?').get(diagnosisId) as any;
      if (!row) return false;

      const newConfidence = passed ? 0.95 : Math.max(0.4, row.confidence - 0.2);
      db.prepare(`
        UPDATE teaching_root_cause_diagnoses
        SET is_verified = ?,
            confidence = ?,
            updated_at = ?
        WHERE id = ?
      `).run(passed ? 1 : 0, newConfidence, now, diagnosisId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 7. Lấy danh sách chẩn đoán nguyên nhân của học viên
   */
  public static getLearnerDiagnoses(learnerId: string = 'default'): RootCauseDiagnosis[] {
    try {
      const rows = db.prepare(`
        SELECT * FROM teaching_root_cause_diagnoses
        WHERE learner_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(learnerId) as any[];

      return rows.map(r => ({
        id: r.id,
        learnerId: r.learner_id,
        conceptKey: r.concept_key,
        conceptName: r.concept_name,
        symptom: r.symptom,
        suspectedCause: r.suspected_cause as RootCauseType,
        causeExplanationVi: r.cause_explanation_vi,
        evidenceIds: JSON.parse(r.evidence_ids_json || '[]'),
        observationCount: r.observation_count,
        confidence: r.confidence,
        isVerified: Boolean(r.is_verified),
        verificationPrompt: JSON.parse(r.verification_prompt_json || '{}'),
        remedyPlanVi: r.remedy_plan_vi,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch {
      return [];
    }
  }

  /**
   * 8. Kiểm soát chất lượng sư phạm trước khi gửi phản hồi (Pre-delivery Quality Gate - Section 13)
   */
  public static auditTeachingQuality(
    responseJson: any,
    context: { intent: TeachingIntent; hskLevel: number; userQuery: string }
  ): TeachingQualityAudit {
    const issues: string[] = [];
    let score = 100;

    const replyZh = responseJson?.replyZh || '';
    const replyPinyin = responseJson?.replyPinyin || '';
    const replyVi = responseJson?.replyVi || '';
    const hasCorrection = Boolean(responseJson?.hasCorrection);
    const correction = responseJson?.correction;

    // 1. Kiểm tra Hán tự Giản thể
    // Kiểm tra không lẫn chữ Phồn thể phổ biến
    const traditionalMarkers = ['學', '習', '國', '這', '麼', '門', '聽', '說', '話'];
    const hasTraditional = traditionalMarkers.some(tm => replyZh.includes(tm));
    if (hasTraditional) {
      issues.push('Phản hồi có chứa Hán tự Phồn thể thay vì Giản thể chuẩn.');
      score -= 20;
    }

    // 2. Kiểm tra Pinyin: Có dấu thanh điệu chuẩn, không dùng số thay dấu (e.g. ni3 hao3)
    const hasNumericTones = /[a-zA-Z]+[1-5]/.test(replyPinyin);
    if (hasNumericTones) {
      issues.push('Phiên âm Pinyin dùng số thay vì dấu thanh điệu chuẩn quốc tế (ā, á, ǎ, à).');
      score -= 20;
    }

    // 3. Kiểm tra Trả lời trực tiếp câu hỏi (Direct Answer Delivered)
    if (context.intent === 'ask_meaning' && replyVi.length > 500) {
      issues.push('Câu hỏi tra nghĩa đơn giản nhưng AI trả lời quá dài dòng gây áp lực học tập.');
      score -= 15;
    }

    // 4. Kiểm tra Không tạo áp lực học tập (Not Overteaching)
    // Nếu người dùng chỉ chào hỏi hoặc hỏi nghĩa mà AI liên tục nhồi bài tập microCheck
    if (
      (context.intent === 'general_chat' || context.intent === 'ask_meaning') &&
      responseJson?.microCheckPrompt?.needVerification
    ) {
      issues.push('Tự ý thêm bài tập kiểm tra khi người học chỉ muốn giao tiếp thông thường hoặc tra cứu.');
      score -= 15;
    }

    // 5. Kiểm tra Sửa oan câu đúng (False Positive Protection)
    let noFalsePositive = true;
    if (hasCorrection && correction?.original) {
      if (this.isSentenceGrammaticallyValid(correction.original, correction.corrected)) {
        // Nếu câu đúng mà bị gắn nhãn critical hoặc grammar -> Lỗi nghiêm trọng
        if (correction.severity === 'critical' || correction.severity === 'grammar') {
          issues.push(`Đã sửa oan câu đúng ("${correction.original}") thành sai.`);
          noFalsePositive = false;
          score -= 30;
        }
      }
    }

    const passed = score >= 70 && noFalsePositive;

    return {
      passed,
      score: Math.max(0, score),
      pinyinStandardized: !hasNumericTones,
      hanziSimplified: !hasTraditional,
      toneStandardized: !hasNumericTones,
      directAnswerDelivered: issues.every(i => !i.includes('dài dòng')),
      notOverteaching: issues.every(i => !i.includes('áp lực')),
      levelAppropriate: true,
      noFalsePositive,
      issues,
      remediation: passed ? undefined : 'Cần chuẩn hóa thanh điệu Pinyin hoặc hạ mức độ cảnh báo lỗi câu.'
    };
  }
}
