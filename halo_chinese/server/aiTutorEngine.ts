import { db } from './db.js';

export type KnowledgeMasteryStage =
  | 'unexposed'     // 1. Chưa từng tiếp xúc
  | 'exposed'       // 2. Đã tiếp xúc nhưng chưa được giải thích
  | 'taught'        // 3. Đã được AI giảng dạy
  | 'understood'    // 4. Đã hiểu qua giải thích
  | 'practicing'    // 5. Đã thực hành nhưng chưa ổn định
  | 'autonomous'    // 6. Có thể vận dụng độc lập
  | 'mastered';     // 7. Đã thành thạo qua nhiều tình huống

export type ErrorSeverity =
  | 'critical'      // Làm thay đổi hoàn toàn ý nghĩa
  | 'grammar'       // Vi phạm cấu trúc ngữ pháp cơ bản
  | 'lexical'       // Dùng từ chưa đúng ngữ cảnh
  | 'naturalness'   // Đúng ngữ pháp nhưng chưa tự nhiên (văn nói người bản xứ)
  | 'minor';        // Lỗi nhỏ không cản trở thông điệp

export type PedagogicIntent =
  | 'ask_explanation'  // Yêu cầu giải thích ngữ pháp / từ vựng
  | 'request_simpler'   // Người học chưa hiểu, yêu cầu giải thích lại hoặc dễ hơn
  | 'compare_words'     // Yêu cầu phân biệt 2 từ hoặc cấu trúc dễ nhầm
  | 'roleplay'          // Đang trong tình huống đóng vai
  | 'drill_practice'    // Yêu cầu bài tập vận dụng ngay
  | 'free_chat';        // Trò chuyện giao lưu tự do

export interface Competency6D {
  vocabBreadth: number;       // Vốn từ vựng (0 - 100)
  grammarAccuracy: number;    // Khả năng dùng ngữ pháp (0 - 100)
  listening: number;          // Khả năng nghe hiểu (0 - 100)
  reading: number;            // Khả năng đọc hiểu (0 - 100)
  writing: number;            // Khả năng viết và đặt câu (0 - 100)
  fluency: number;            // Độ lưu loát và phản xạ (0 - 100)
  overallHsk: number;         // Cấp độ HSK ước lượng
  targetHsk: number;          // Mục tiêu
}

export interface EvidenceRecord {
  id: string;
  targetType: 'vocabulary' | 'grammar' | 'pronunciation' | 'communication' | 'habit';
  targetKey: string;
  claimSummary: string;
  evidenceQuote: string;
  sourceActivity: string;
  sourceSessionId?: string;
  observationCount: number;
  confidenceScore: number;
  masteryStage: KnowledgeMasteryStage;
  status: 'active' | 'undetermined' | 'resolved';
  lastObservedAt: number;
}

export interface ContrastivePair {
  key: string;
  wordA: string;
  wordB: string;
  pinyinA: string;
  pinyinB: string;
  distinctionSummaryVi: string;
  contrastExamples: Array<{
    scenarioVi: string;
    zhA: string;
    pinyinA: string;
    meaningA: string;
    zhB: string;
    pinyinB: string;
    meaningB: string;
    analysisVi: string;
  }>;
  commonPitfallsVi: string;
}

/**
 * Kho dữ liệu chuẩn mực các cặp ngữ pháp & từ vựng tiếng Trung dễ nhầm lẫn nhất
 * Dùng cho phương pháp giảng dạy đối chiếu (Contrastive Teaching)
 */
export const CONTRASTIVE_KNOWLEDGE_BASE: Record<string, ContrastivePair> = {
  'le_vs_guo': {
    key: 'le_vs_guo',
    wordA: '了',
    wordB: '过',
    pinyinA: 'le',
    pinyinB: 'guo',
    distinctionSummaryVi: '了 nhấn mạnh hành động ĐÃ HOÀN THÀNH hoặc TRẠNG THÁI MỚI XUẤT HIỆN. 过 nhấn mạnh TỪNG CÓ TRẢI NGHIỆM trong quá khứ (giờ không còn tiếp diễn).',
    contrastExamples: [
      {
        scenarioVi: 'Nói về việc ăn cơm trưa',
        zhA: '我吃了午饭。',
        pinyinA: 'Wǒ chī le wǔfàn.',
        meaningA: 'Tôi đã ăn cơm trưa rồi. (Hiện tại no rồi, hành động ăn vừa hoàn thành)',
        zhB: '我吃过北京烤鸭。',
        pinyinB: 'Wǒ chī guo Běijīng kǎoyā.',
        meaningB: 'Tôi từng ăn vịt quay Bắc Kinh. (Kể về trải nghiệm trong đời, không quan tâm vừa ăn xong hay không)',
        analysisVi: 'Dùng 了 khi muốn báo hiệu việc đã làm xong để làm việc tiếp. Dùng 过 để khoe trải nghiệm "đã từng kinh qua".'
      }
    ],
    commonPitfallsVi: 'Người Việt hay dịch cả hai là "rồi", dẫn đến nhầm: "我吃过饭了" có thể kết hợp nhưng ý nghĩa là vừa có trải nghiệm vừa hoàn thành.'
  },
  'xiang_vs_yao': {
    key: 'xiang_vs_yao',
    wordA: '想',
    wordB: '要',
    pinyinA: 'xiǎng',
    pinyinB: 'yào',
    distinctionSummaryVi: '想 thể hiện MONG MUỐN, NGUYỆN VỌNG trong suy nghĩ (chưa chắc đã thực hiện ngay). 要 thể hiện Ý ĐỊNH DỨT KHOÁT, KẾ HOẠCH CỤ THỂ hoặc YÊU CẦU bắt buộc.',
    contrastExamples: [
      {
        scenarioVi: 'Mua sắm và dự định du lịch',
        zhA: '我想去中国旅游。',
        pinyinA: 'Wǒ xiǎng qù Zhōngguó lǚyóu.',
        meaningA: 'Tôi muốn đi Trung Quốc du lịch. (Ước muốn trong tâm trí)',
        zhB: '我下个月要去中国出差。',
        pinyinB: 'Wǒ xià gè yuè yào qù Zhōngguó chūchāi.',
        meaningB: 'Tháng sau tôi phải/sẽ đi Trung Quốc công tác. (Kế hoạch chắc chắn 100%)',
        analysisVi: 'Khi vào quán gọi món: "我要一杯咖啡" (Tôi lấy 1 cốc cà phê - dứt khoát), không nói "我想一杯咖啡" vì sau 想 thường là động từ.'
      }
    ],
    commonPitfallsVi: 'Trong giao tiếp lịch sự, khi hỏi đối phương có thể dùng 想 (您想喝点什么？), khi ra quyết định đặt món dùng 要.'
  },
  'zai_vs_you': {
    key: 'zai_vs_you',
    wordA: '再',
    wordB: '又',
    pinyinA: 'zài',
    pinyinB: 'yòu',
    distinctionSummaryVi: '再 dùng cho hành động LẶP LẠI TRONG TƯƠNG LAI (chưa xảy ra). 又 dùng cho hành động ĐÃ LẶP LẠI TRONG QUÁ KHỨ (đã xảy ra rồi hoặc mang sắc thái ngán ngẩm).',
    contrastExamples: [
      {
        scenarioVi: 'Đến thăm một người bạn',
        zhA: '欢迎下次再来！',
        pinyinA: 'Huānyíng xià cì zài lái!',
        meaningA: 'Hoan nghênh lần sau lại đến nhé! (Hành động lặp lại ở tương lai)',
        zhB: '他昨天来了，今天又来了。',
        pinyinB: 'Tā zuótiān lái le, jīntiān yòu lái le.',
        meaningB: 'Hôm qua anh ấy đến rồi, hôm nay lại đến nữa. (Đã xảy ra thực tế)',
        analysisVi: '再 biểu thị sự lặp lại chưa diễn ra: "请再说一遍" (Xin nói lại một lần). 又 biểu thị sự lặp lại đã xong.'
      }
    ],
    commonPitfallsVi: 'Người Việt hay nói nhầm "他明天又去" -> Sai, phải nói là "他明天再去".'
  },
  'zenme_vs_weishenme': {
    key: 'zenme_vs_weishenme',
    wordA: '怎么',
    wordB: '为什么',
    pinyinA: 'zěnme',
    pinyinB: 'wèishénme',
    distinctionSummaryVi: '怎么 hỏi PHƯƠNG THỨC ("làm thế nào") hoặc sự ngạc nhiên ("sao mà"). 为什么 hỏi NGUYÊN NHÂN, LÝ DO thuần túy ("tại sao / vì cớ gì").',
    contrastExamples: [
      {
        scenarioVi: 'Hỏi về việc đi lại và lý do vắng mặt',
        zhA: '你怎么去学校？',
        pinyinA: 'Nǐ zěnme qù xuéxiào?',
        meaningA: 'Bạn đi đến trường bằng cách nào? (Hỏi phương tiện: đi xe bus hay xe đạp)',
        zhB: '你为什么不去学校？',
        pinyinB: 'Nǐ wèishénme bù qù xuéxiào?',
        meaningB: 'Tại sao bạn không đi học? (Hỏi lý do: vì bị ốm hay bận)',
        analysisVi: 'Khi hỏi lý do kèm sự bất ngờ khó hiểu, người Trung cũng có thể dùng 怎么 (vd: 你怎么还不走？- Sao bạn vẫn chưa đi thế?), nhưng khi hỏi lý do nghiêm túc để trả lời "bởi vì..." (因为...) thì phải dùng 为什么.'
      }
    ],
    commonPitfallsVi: 'Khi trả lời câu hỏi 为什么 có thể dùng 因为... để giải thích. Không dùng 因为 để trả lời 怎么.'
  },
  'hui_vs_neng_vs_keyi': {
    key: 'hui_vs_neng_vs_keyi',
    wordA: '会',
    wordB: '能 / 可以',
    pinyinA: 'huì',
    pinyinB: 'néng / kěyǐ',
    distinctionSummaryVi: '会: KỸ NĂNG CÓ ĐƯỢC QUA HỌC HỎI LUYỆN TẬP. 能: NĂNG LỰC THỂ CHẤT, KHẢ NĂNG TỰ NHIÊN hoặc ĐIỀU KIỆN CHO PHÉP. 可以: SỰ CHO PHÉP về mặt lễ nghi/pháp lý hoặc MỨC ĐỘ KHẢ THI.',
    contrastExamples: [
      {
        scenarioVi: 'Nói về việc biết bơi và uống rượu',
        zhA: '我会游泳。',
        pinyinA: 'Wǒ huì yóuyǒng.',
        meaningA: 'Tôi biết bơi. (Do tôi đã học bơi)',
        zhB: '我今天感冒了，不能去游泳。',
        pinyinB: 'Wǒ jīntiān gǎnmào le, bù néng qù yóuyǒng.',
        meaningB: 'Hôm nay tôi bị cảm rồi, không thể đi bơi được. (Vẫn biết bơi nhưng điều kiện sức khỏe không cho phép)',
        analysisVi: '会 = Biết làm do có học. 能 = Có thể làm được trong hoàn cảnh này. 可以 = Được phép làm (vd: 这里可以抽烟吗？- Ở đây được hút thuốc không?).'
      }
    ],
    commonPitfallsVi: 'Biết nói tiếng Trung dùng 会 (我会说汉语). Khi xin phép: "我能进来吗？" hoặc "我可以进来吗？" đều được.'
  }
};

export class AITutorEngine {
  /**
   * 1. Lấy hồ sơ năng lực 6 chiều từ SQLite
   */
  public getCompetencyProfile(): Competency6D {
    const row = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any;
    if (!row) {
      return {
        vocabBreadth: 50,
        grammarAccuracy: 50,
        listening: 50,
        reading: 50,
        writing: 50,
        fluency: 50,
        overallHsk: 1,
        targetHsk: 3
      };
    }

    return {
      vocabBreadth: row.vocab_breadth_score ?? 50,
      grammarAccuracy: row.grammar_accuracy_score ?? 50,
      listening: row.listening_score ?? 50,
      reading: row.reading_score ?? 50,
      writing: row.writing_score ?? 50,
      fluency: row.fluency_score ?? 50,
      overallHsk: row.current_hsk ?? 1,
      targetHsk: row.target_hsk ?? 3
    };
  }

  /**
   * Cập nhật chỉ số năng lực 6 chiều có căn cứ
   */
  public updateCompetency(updates: Partial<Competency6D>) {
    const current = this.getCompetencyProfile();
    const next = { ...current, ...updates };

    db.prepare(`
      UPDATE learner_profile
      SET vocab_breadth_score = ?,
          grammar_accuracy_score = ?,
          listening_score = ?,
          reading_score = ?,
          writing_score = ?,
          fluency_score = ?,
          current_hsk = ?,
          target_hsk = ?,
          updated_at = ?
      WHERE id = 'default'
    `).run(
      Math.min(100, Math.max(0, next.vocabBreadth)),
      Math.min(100, Math.max(0, next.grammarAccuracy)),
      Math.min(100, Math.max(0, next.listening)),
      Math.min(100, Math.max(0, next.reading)),
      Math.min(100, Math.max(0, next.writing)),
      Math.min(100, Math.max(0, next.fluency)),
      next.overallHsk,
      next.targetHsk,
      Date.now()
    );
  }

  /**
   * 2. Ghi nhận nhận định có bằng chứng vào `learner_evidence_ledger`
   * Tuân thủ quy tắc 3.3: Mọi nhận định quan trọng phải có căn cứ thực tế
   */
  public recordEvidence(params: {
    targetType: EvidenceRecord['targetType'];
    targetKey: string;
    claimSummary: string;
    evidenceQuote: string;
    sourceActivity: string;
    sourceSessionId?: string;
    confidenceScore?: number;
    masteryStage?: KnowledgeMasteryStage;
  }): EvidenceRecord {
    const now = Date.now();
    const existing = db.prepare(`
      SELECT * FROM learner_evidence_ledger 
      WHERE target_key = ? AND target_type = ?
    `).get(params.targetKey, params.targetType) as any;

    if (existing) {
      const newCount = (existing.observation_count || 1) + 1;
      const newConfidence = Math.min(0.99, (existing.confidence_score || 0.8) + 0.05);
      const stage = params.masteryStage || existing.mastery_stage;
      const status = newConfidence >= 0.6 ? 'active' : 'undetermined';

      db.prepare(`
        UPDATE learner_evidence_ledger
        SET claim_summary = ?,
            evidence_quote = ?,
            observation_count = ?,
            confidence_score = ?,
            mastery_stage = ?,
            status = ?,
            last_observed_at = ?
        WHERE id = ?
      `).run(
        params.claimSummary,
        params.evidenceQuote,
        newCount,
        newConfidence,
        stage,
        status,
        now,
        existing.id
      );

      return {
        id: existing.id,
        targetType: params.targetType,
        targetKey: params.targetKey,
        claimSummary: params.claimSummary,
        evidenceQuote: params.evidenceQuote,
        sourceActivity: params.sourceActivity,
        sourceSessionId: params.sourceSessionId,
        observationCount: newCount,
        confidenceScore: newConfidence,
        masteryStage: stage,
        status,
        lastObservedAt: now
      };
    }

    const id = `ev_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const confidence = params.confidenceScore ?? 0.75;
    const stage = params.masteryStage || 'practicing';
    const status = confidence >= 0.6 ? 'active' : 'undetermined';

    db.prepare(`
      INSERT INTO learner_evidence_ledger (
        id, target_type, target_key, claim_summary, evidence_quote, source_activity,
        source_session_id, observation_count, confidence_score, mastery_stage, status,
        last_observed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.targetType,
      params.targetKey,
      params.claimSummary,
      params.evidenceQuote,
      params.sourceActivity,
      params.sourceSessionId || null,
      confidence,
      stage,
      status,
      now,
      now
    );

    return {
      id,
      targetType: params.targetType,
      targetKey: params.targetKey,
      claimSummary: params.claimSummary,
      evidenceQuote: params.evidenceQuote,
      sourceActivity: params.sourceActivity,
      sourceSessionId: params.sourceSessionId,
      observationCount: 1,
      confidenceScore: confidence,
      masteryStage: stage,
      status,
      lastObservedAt: now
    };
  }

  /**
   * 3. Lấy danh sách bằng chứng tin cậy (Confidence >= 0.6 và Active)
   */
  public getActiveEvidences(limit: number = 6): EvidenceRecord[] {
    const rows = db.prepare(`
      SELECT * FROM learner_evidence_ledger 
      WHERE status = 'active' AND confidence_score >= 0.6
      ORDER BY last_observed_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      targetType: r.target_type,
      targetKey: r.target_key,
      claimSummary: r.claim_summary,
      evidenceQuote: r.evidence_quote,
      sourceActivity: r.source_activity,
      sourceSessionId: r.source_session_id,
      observationCount: r.observation_count,
      confidenceScore: r.confidence_score,
      masteryStage: r.mastery_stage,
      status: r.status,
      lastObservedAt: r.last_observed_at
    }));
  }

  /**
   * 4. Nhận diện ý định sư phạm của người học (Pedagogic Intent Detection)
   */
  public detectPedagogicIntent(userMessage: string, currentMode: string): PedagogicIntent {
    const text = userMessage.toLowerCase().trim();

    // A. Yêu cầu giải thích lại hoặc giải thích đơn giản hơn
    if (
      text.includes('chưa hiểu') ||
      text.includes('khó hiểu') ||
      text.includes('giải thích lại') ||
      text.includes('nói dễ hơn') ||
      text.includes('ví dụ đơn giản') ||
      text.includes('chưa rõ') ||
      text.includes('bối rối') ||
      text.includes('nghe chưa thông')
    ) {
      return 'request_simpler';
    }

    // B. Yêu cầu phân biệt 2 từ / cấu trúc
    if (
      (text.includes('khác gì') || text.includes('phân biệt') || text.includes('khác nhau') || text.includes('khi nào dùng')) &&
      (text.includes('và') || text.includes('với') || text.includes('hay') || text.includes('vs'))
    ) {
      return 'compare_words';
    }

    // C. Yêu cầu giải thích ngữ pháp hoặc từ vựng
    if (
      text.includes('nghĩa là gì') ||
      text.includes('nghĩa là sao') ||
      text.includes('cách dùng') ||
      text.includes('cấu trúc') ||
      text.includes('tại sao lại dùng') ||
      text.includes('ngữ pháp') ||
      text.startsWith('sao lại') ||
      text.endsWith('là gì?')
    ) {
      return 'ask_explanation';
    }

    // D. Yêu cầu bài tập vận dụng
    if (
      text.includes('cho bài tập') ||
      text.includes('luyện thử') ||
      text.includes('đặt câu thử') ||
      text.includes('kiểm tra em') ||
      text.includes('làm bài tập')
    ) {
      return 'drill_practice';
    }

    // E. Nếu đang ở mode roleplay
    if (currentMode === 'roleplay') {
      return 'roleplay';
    }

    return 'free_chat';
  }

  /**
   * 5. Tìm kiếm cặp đối chiếu nếu phát hiện người học hỏi so sánh
   */
  public findMatchingContrastPair(query: string): ContrastivePair | null {
    const clean = query.toLowerCase();
    for (const key of Object.keys(CONTRASTIVE_KNOWLEDGE_BASE)) {
      const pair = CONTRASTIVE_KNOWLEDGE_BASE[key];
      if (
        (clean.includes(pair.wordA.toLowerCase()) || clean.includes(pair.pinyinA.toLowerCase())) &&
        (clean.includes(pair.wordB.toLowerCase()) || clean.includes(pair.pinyinB.toLowerCase()))
      ) {
        return pair;
      }
    }
    return null;
  }

  /**
   * 6. Truy xuất ngữ cảnh chọn lọc liên quan trực tiếp đến tin nhắn (Selective Context Retrieval)
   * Chống đưa toàn bộ lịch sử thô bạo vào prompt gây quá tải và loãng ngữ cảnh
   */
  public retrieveSelectiveContext(userMessage: string, hskLevel: number) {
    const clean = userMessage.trim();

    // Tìm từ vựng liên quan xuất hiện trong câu của người học
    const relevantVocabRows = db.prepare(`
      SELECT simplified, pinyin, meaning_vi, mastery_level, mastery_stage 
      FROM vocabulary_memory 
      WHERE ? LIKE '%' || simplified || '%'
      LIMIT 4
    `).all(clean) as any[];

    // Tìm ngữ pháp liên quan
    const relevantGrammarRows = db.prepare(`
      SELECT pattern_name, formula, meaning_vi, mastery_level 
      FROM grammar_memory 
      WHERE ? LIKE '%' || pattern_name || '%'
      LIMIT 3
    `).all(clean) as any[];

    // Tìm lỗi sai liên quan chưa được giải quyết
    const relevantErrors = db.prepare(`
      SELECT title, user_sentence, corrected_sentence, explanation_vi 
      FROM learning_errors 
      WHERE status != 'resolved' 
      ORDER BY last_occurred_at DESC 
      LIMIT 3
    `).all() as any[];

    // Bằng chứng đã xác nhận
    const activeEvidences = this.getActiveEvidences(4);

    return {
      relevantVocab: relevantVocabRows,
      relevantGrammar: relevantGrammarRows,
      pendingErrors: relevantErrors,
      evidences: activeEvidences,
      competency: this.getCompetencyProfile()
    };
  }

  /**
   * 7. Tạo bài kiểm tra vi mô (Micro-diagnostic check) để xác minh lỗ hổng trước khi kết luận
   * Tuân thủ quy tắc mục 4: Không kết luận người học yếu chỉ vì 1 lần làm sai
   */
  public generateMicroCheck(concept: string, suspectedGap: string, hskLevel: number) {
    return {
      concept,
      suspectedGap,
      promptZh: `请用“${concept}”写一个简单的句子。`,
      promptVi: `Em hãy thử đặt một câu ngắn sử dụng cấu trúc/từ "${concept}" để chúng ta cùng kiểm tra nhé!`,
      verificationCriteria: `Kiểm tra xem người học có nắm vững ${suspectedGap} hay không.`
    };
  }

  /**
   * 8. Tạo System Instruction chuyên sâu cho AI Tutor (Gemini 3.5 Flash Lite)
   * Tích hợp 5 năng lực: Stepped Pedagogy, Adaptive Explanations, Contrastive Teaching,
   * Educational Error Correction, và Anti-Hallucination Guardrails
   */
  public buildPedagogicSystemPrompt(params: {
    intent: PedagogicIntent;
    mode: string;
    hskLevel: number;
    scenario?: string;
    selectiveContext: ReturnType<AITutorEngine['retrieveSelectiveContext']>;
    contrastPair?: ContrastivePair | null;
  }): string {
    const { intent, mode, hskLevel, scenario, selectiveContext, contrastPair } = params;
    const { competency, relevantVocab, relevantGrammar, pendingErrors, evidences } = selectiveContext;

    let pedagogicDirective = '';

    if (intent === 'request_simpler') {
      pedagogicDirective = `
⭐ CHẾ ĐỘ: GIẢI THÍCH THÍCH ỨNG LẠI (HỌC VIÊN CHƯA HIỂU)
- TUYỆT ĐỐI KHÔNG lặp lại nguyên văn lời giải thích cũ!
- Hãy đổi góc độ tiếp cận:
  1. Dùng một ví dụ đời sống cực kỳ gần gũi với người Việt.
  2. Bẻ nhỏ quy tắc thành 2 bước siêu ngắn (tối đa 2 dòng).
  3. Cung cấp ngay một câu mẫu hoàn chỉnh có Pinyin và dịch nghĩa.
  4. Mời người học thử đặt 1 câu siêu ngắn để kiểm tra độ hiểu.
`;
    } else if (intent === 'compare_words' && contrastPair) {
      pedagogicDirective = `
⭐ CHẾ ĐỘ: PHÂN TÍCH ĐỐI CHIẾU CẶP TỪ DỄ NHẦM ("${contrastPair.wordA}" vs "${contrastPair.wordB}")
- Tóm tắt cốt lõi: ${contrastPair.distinctionSummaryVi}
- Ví dụ đối chiếu cùng ngữ cảnh:
  * ${contrastPair.wordA}: ${contrastPair.contrastExamples[0]?.zhA} (${contrastPair.contrastExamples[0]?.meaningA})
  * ${contrastPair.wordB}: ${contrastPair.contrastExamples[0]?.zhB} (${contrastPair.contrastExamples[0]?.meaningB})
- Phân tích: ${contrastPair.contrastExamples[0]?.analysisVi}
- Lưu ý lỗi người Việt hay mắc: ${contrastPair.commonPitfallsVi}
- Hãy giải thích tự nhiên bằng tiếng Việt và cho học viên 1 bài tập điền chỗ trống ngắn giữa hai từ này.
`;
    } else if (intent === 'ask_explanation') {
      pedagogicDirective = `
⭐ CHẾ ĐỘ: GIẢNG DẠY SƯ PHẠM THEO BƯỚC (STEPPED INSTRUCTION)
1. Giải thích một kiến thức trọng tâm duy nhất (ngắn gọn, dễ hiểu, tránh thuật ngữ hàn lâm).
2. Đưa 1 ví dụ thực tế chuẩn xác kèm Pinyin và dịch nghĩa tiếng Việt.
3. Chỉ ra 1 lỗi mà người Việt hay mắc khi dùng điểm này.
4. Mời học viên thử vận dụng đặt 1 câu ngắn.
`;
    } else if (mode === 'roleplay' || intent === 'roleplay') {
      pedagogicDirective = `
⭐ CHẾ ĐỘ: NHẬP VAI TÌNH HUỐNG THỰC TẾ (${scenario || 'Tình huống đời sống'})
- GIỮ VỮNG 100% VAI TRÒ NHÂN VẬT! Không tự phá vỡ vai để giảng giải ngữ pháp dong dài giữa chừng.
- Phản hồi chân thực theo những gì học viên vừa nói (thương lượng giá, hỏi món, chỉ đường...).
- Nếu học viên nói sai ngữ pháp nhẹ, hãy sửa khéo léo và tự nhiên ngay trong câu thoại tiếp theo của nhân vật, hoặc chỉ ghi nhận vào trường "correction" trong JSON mà không làm gián đoạn câu chuyện.
`;
    } else {
      pedagogicDirective = `
⭐ CHẾ ĐỘ: GIAO TIẾP TỰ NHIÊN & KHƠI GỢI PHẢN XẠ
- Trò chuyện cởi mở, lắng nghe và phát triển chủ đề tiếp theo dựa trên câu trả lời của học viên.
- Không hỏi lại những thông tin học viên vừa cung cấp.
- Giữ câu tiếng Trung ở cấp độ HSK ${hskLevel}, tiếng Việt giải thích phụ trợ.
`;
    }

    return `
Bạn là "Lão Sư AI" (老师) - Giáo viên dạy tiếng Trung cá nhân tận tâm, kiên nhẫn, am hiểu tâm lý người học Việt Nam.
Trình độ người học: HSK ${competency.overallHsk} (Mục tiêu: HSK ${competency.targetHsk}).
Hồ sơ năng lực 6 chiều: Từ vựng=${competency.vocabBreadth}/100, Ngữ pháp=${competency.grammarAccuracy}/100, Giao tiếp=${competency.fluency}/100.

${pedagogicDirective}

=== HỒ SƠ BẰNG CHỨNG THỰC TẾ CỦA HỌC VIÊN (SQLite Evidence Ledger) ===
- Bằng chứng đã xác nhận:
${evidences.map(e => `  • [${e.targetType}] ${e.targetKey}: "${e.claimSummary}" (Căn cứ: "${e.evidenceQuote}", Độ tin cậy: ${Math.round(e.confidenceScore * 100)}%, Giai đoạn: ${e.masteryStage})`).join('\n') || '  • Chưa có bằng chứng tiêu cực nào.'}

- Lỗi sai đang theo dõi:
${pendingErrors.map(e => `  • ${e.title}: Câu sai "${e.user_sentence}" -> Sửa: "${e.corrected_sentence}"`).join('\n') || '  • Không có lỗi tồn đọng.'}

- Từ vựng & Ngữ pháp liên quan trực tiếp:
${relevantVocab.map(v => `  • Từ "${v.simplified}" [${v.pinyin}]: ${v.meaning_vi} (Giai đoạn: ${v.mastery_stage || v.mastery_level})`).join('\n') || ''}
${relevantGrammar.map(g => `  • Ngữ pháp "${g.pattern_name}": ${g.formula}`).join('\n') || ''}

=== NGUYÊN TẮC GIẢNG DẠY & CHỐNG SUY DIỄN (GUARDRAILS) ===
1. TIẾNG TRUNG CHUẨN MỰC: Chữ Hán giản thể chuẩn, Pinyin có đầy đủ dấu thanh điệu (ā á ǎ à), nghĩa tiếng Việt chính xác.
2. SỬA LỖI CÓ TÍNH GIÁO DỤC: Phân biệt rõ:
   - "critical": Lỗi làm đổi nghĩa câu
   - "grammar": Lỗi sai quy tắc ngữ pháp
   - "lexical": Lỗi dùng từ không hợp ngữ cảnh
   - "naturalness": Câu đúng ngữ pháp nhưng người bản xứ không diễn đạt như vậy
   - "minor": Lỗi nhỏ không cản trở giao tiếp
3. KHÔNG BỊA ĐẶT: Không tự ý kết luận người học yếu kém nếu chỉ mới quan sát 1 lần. Mọi nhận định phải căn cứ trên bằng chứng.
4. ĐỊNH DẠNG ĐÁP ỨNG: Trả về JSON DUY NHẤT theo schema sau:
{
  "replyZh": "Câu phản hồi bằng tiếng Trung",
  "replyPinyin": "Phiên âm Pinyin có dấu thanh điệu đầy đủ",
  "replyVi": "Bản dịch hoặc lời giảng giải sư phạm bằng tiếng Việt",
  "pedagogicFocus": "Tên điểm kiến thức trọng tâm vừa xử lý (hoặc null)",
  "hasCorrection": true hoặc false,
  "correction": {
    "severity": "critical" | "grammar" | "lexical" | "naturalness" | "minor",
    "original": "Phần câu chưa chuẩn của học viên",
    "corrected": "Cách sửa chuẩn xác của người bản ngữ",
    "explanationVi": "Giải thích nguyên nhân tại sao sai và cách khắc phục",
    "grammarPoint": "Tên điểm ngữ pháp liên quan",
    "naturalSuggestion": "Cách diễn đạt tự nhiên hơn trong đời sống"
  },
  "microCheckPrompt": {
    "needVerification": true hoặc false,
    "exerciseZh": "Câu hỏi/bài tập vận dụng ngắn (nếu có)",
    "exerciseVi": "Hướng dẫn bài tập bằng tiếng Việt"
  }
}
LƯU Ý: Tuyệt đối không xuất văn bản nào ngoài khối JSON hợp lệ.
`.trim();
  }

  /**
   * 9. Tạo System Instruction ngắn gọn tối ưu cho Gemini Live Voice Chat (gemini-3.8-live)
   * Chuyển giao ngữ cảnh liền mạch từ Text Chat sang Voice Chat mà không gây quá tải token
   */
  public buildVoiceSystemPrompt(params: {
    hskLevel: number;
    mode: string;
    scenario?: string;
    recentTopic?: string;
    recentErrors?: string[];
  }): string {
    const { hskLevel, mode, scenario, recentTopic, recentErrors = [] } = params;
    const competency = this.getCompetencyProfile();

    return `
Bạn là "Lão Sư AI" (老师) - Giáo viên bản xứ Quan thoại Bắc Kinh, đàm thoại song công trực tiếp 2 chiều với người học Việt Nam qua Gemini Live API.
Trình độ người học: HSK ${hskLevel || competency.overallHsk}.
Chế độ học: ${mode} ${scenario ? `(Tình huống đóng vai: "${scenario}")` : ''}.
${recentTopic ? `Chủ đề vừa thảo luận trong bài học: "${recentTopic}".` : ''}
${recentErrors.length > 0 ? `Lỗi học viên hay mắc cần lưu ý nhắc khéo: ${recentErrors.join(', ')}.` : ''}

NGUYÊN TẮC GIỌNG NÓI & PHẢN XẠ:
1. Phát âm chuẩn xác, rõ ràng từng thanh điệu, tốc độ phù hợp với cấp độ HSK ${hskLevel}.
2. Nếu người học ngập ngừng hoặc bối rối, hãy dùng 1 câu tiếng Việt ngắn gọn để động viên và gợi ý từ vựng.
3. Nếu đang trong tình huống đóng vai (${scenario || 'giao tiếp'}): Giữ trọn vẹn vai diễn, phản hồi tự nhiên, không ngắt lời thô bạo.
4. Khuyến khích người học nói trọn vẹn câu tiếng Trung, sửa lỗi một cách tinh tế trong câu đáp từ tiếp theo.
`.trim();
  }
}

export const aiTutorEngine = new AITutorEngine();
