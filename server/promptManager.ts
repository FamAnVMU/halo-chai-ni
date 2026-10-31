/**
 * Prompt Manager (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 *
 * Centralized, versioned prompt repository with modular templates,
 * pedagogical guidelines, and task-specific instructions.
 */

import { AITaskId } from './aiOrchestratorTypes.js';

export interface PromptBuildResult {
  systemInstruction: string;
  userPrompt?: string;
  promptVersion: string;
}

export class PromptManager {
  private static readonly PROMPT_VERSION = 'v2.4.0';

  /**
   * Nguyên tắc sư phạm cốt lõi áp dụng chung cho mọi tác vụ giảng dạy tiếng Trung
   */
  private static readonly CORE_PEDAGOGIC_RULES = `
QUY TẮC CỐT LÕI (MANDATORY PEDAGOGIC RULES):
1. Chuẩn mực ngôn ngữ: Sử dụng tiếng Trung Giản thể (Simplified Chinese) chuẩn Quan thoại Bắc Kinh.
2. Phiên âm Pinyin: Phải có dấu thanh điệu chuẩn quốc tế (ā, á, ǎ, à). Riêng khinh thanh (thanh nhẹ) giữ nguyên không dấu (như: le, de, ba, ma).
3. Dịch nghĩa tiếng Việt: Phải tự nhiên, thuần Việt, đúng ngữ cảnh, không dịch thô cứng kiểu "word-by-word".
4. Sư phạm kiên nhẫn & tích cực: Khích lệ học viên, sửa lỗi nhẹ nhàng, giải thích nguyên nhân gốc rễ thay vì chỉ bảo "sai rồi".
5. Phân loại mức độ lỗi chính xác:
   - critical: Làm thay đổi hoàn toàn ý nghĩa câu hoặc gây hiểu lầm nghiêm trọng.
   - grammar: Sai cấu trúc ngữ pháp cơ bản (ví dụ: bổ ngữ, trợ từ, trật tự từ).
   - lexical: Dùng từ chưa chuẩn ngữ cảnh người bản xứ.
   - naturalness: Đúng ngữ pháp nhưng người bản xứ không nói thế.
   - minor: Lỗi nhỏ không cản trở thông điệp.
6. Chống suy diễn: Tuyệt đối không tự bịa đặt kiến thức hoặc phán đoán người học đã thành thạo khi chưa có bằng chứng rõ ràng.
`;

  /**
   * Xây dựng prompt tập trung theo Task ID và tham số ngữ cảnh
   */
  public static buildPrompt(taskId: AITaskId, params: any = {}): PromptBuildResult {
    switch (taskId) {
      case 'AI_TUTOR_CHAT':
        return this.buildAITutorChatPrompt(params);

      case 'EXPLAIN_GRAMMAR':
        return this.buildExplainGrammarPrompt(params);

      case 'EXPLAIN_VOCABULARY':
        return this.buildExplainVocabularyPrompt(params);

      case 'COMPARE_WORDS':
        return this.buildCompareWordsPrompt(params);

      case 'ANALYZE_SENTENCE':
        return this.buildAnalyzeSentencePrompt(params);

      case 'ANALYZE_CONVERSATION':
        return this.buildAnalyzeConversationPrompt(params);

      case 'GENERATE_LESSON':
        return this.buildGenerateLessonPrompt(params);

      case 'GENERATE_ROADMAP':
        return this.buildGenerateRoadmapPrompt(params);

      case 'ASSESS_PLACEMENT_TEST':
        return this.buildPlacementAssessmentPrompt(params);

      case 'ANALYZE_PRONUNCIATION':
        return this.buildAnalyzePronunciationPrompt(params);

      case 'EVALUATE_READING_COMPREHENSION':
        return this.buildReadingComprehensionPrompt(params);

      case 'EXPLAIN_READING_PARAGRAPH':
        return this.buildExplainReadingParagraphPrompt(params);

      case 'EVALUATE_SHADOWING':
        return this.buildEvaluateShadowingPrompt(params);

      case 'SRS_HINT_GENERATION':
        return this.buildSrsHintPrompt(params);

      case 'TEST_API_KEY':
        return {
          systemInstruction: 'Bạn là trợ lý kiểm tra kết nối API. Chỉ trả lời ngắn gọn: "Kết nối thành công".',
          userPrompt: 'Kiểm tra kết nối.',
          promptVersion: this.PROMPT_VERSION
        };

      case 'VOICE_CHAT_LIVE':
        return this.buildVoiceChatLivePrompt(params);

      default:
        return {
          systemInstruction: `Bạn là trợ lý giảng dạy tiếng Trung thông minh Halo Chinese.\n${this.CORE_PEDAGOGIC_RULES}`,
          userPrompt: typeof params === 'string' ? params : JSON.stringify(params),
          promptVersion: this.PROMPT_VERSION
        };
    }
  }

  // --- Các hàm tạo prompt chuyên biệt theo từng task ---

  private static buildAITutorChatPrompt(params: any): PromptBuildResult {
    const { mode = 'free', hskLevel = 1, scenario = '', selectiveContext = '', contrastPair = null } = params;

    let roleInstruction = '';
    if (mode === 'roleplay') {
      roleInstruction = `
BẠN ĐANG TRONG CHẾ ĐỘ NHẬP VAI (ROLEPLAY):
- Tình huống: "${scenario || 'Cuộc trò chuyện thực tế'}"
- QUY TẮC BẮT BUỘC: GIỮ VỮNG 100% VAI TRÒ NHÂN VẬT trong tình huống này. Trò chuyện tự nhiên như người bản xứ.
- Không tự phá vỡ vai để giảng giải ngữ pháp dong dài trừ khi người học hỏi trực tiếp.`;
    } else {
      roleInstruction = `
BẠN LÀ GIÁO VIÊN AI TUTOR TIẾNG TRUNG:
- Cấp độ HSK người học: HSK ${hskLevel}
- Trò chuyện thân thiện, dùng từ vựng phù hợp cấp độ HSK ${hskLevel}.
- Khuyến khích người học đặt câu và trả lời bằng tiếng Trung.`;
    }

    let contrastInstruction = '';
    if (contrastPair) {
      contrastInstruction = `
HỌC VIÊN ĐANG HỎI SO SÁNH 2 TỪ: [${contrastPair.wordA}] (${contrastPair.pinyinA}) vs [${contrastPair.wordB}] (${contrastPair.pinyinB})
Tóm tắt khác biệt: ${contrastPair.distinctionSummaryVi}
Hãy giải thích súc tích, dễ nhớ cho người Việt, đưa 1 ví dụ đối chiếu rõ ràng.`;
    }

    const systemInstruction = `
${roleInstruction}

${this.CORE_PEDAGOGIC_RULES}

NGỮ CẢNH HỌC TẬP CỦA HỌC VIÊN:
${selectiveContext || 'Chưa có ghi chú đặc biệt.'}
${contrastInstruction}

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON SCHEMA):
{
  "replyZh": "Câu trả lời tiếng Trung (Hán tự Giản thể)",
  "replyPinyin": "Phiên âm Pinyin có dấu thanh điệu chuẩn",
  "replyVi": "Bản dịch nghĩa tiếng Việt tự nhiên",
  "pedagogicFocus": "Trọng tâm kiến thức nếu có",
  "hasCorrection": true/false (chỉ true khi học viên dùng sai từ hoặc sai ngữ pháp),
  "correction": {
    "severity": "critical" | "grammar" | "lexical" | "naturalness" | "minor",
    "original": "Đoạn học viên nói sai",
    "corrected": "Cách nói chuẩn xác của người bản xứ",
    "explanationVi": "Giải thích ngắn gọn, dễ hiểu vì sao sửa như vậy",
    "grammarPoint": "Điểm ngữ pháp liên quan nếu có"
  },
  "microCheckPrompt": {
    "needVerification": true/false,
    "exerciseZh": "Câu bài tập nhỏ kiểm tra nhanh nếu vừa sửa lỗi",
    "exerciseVi": "Yêu cầu bài tập bằng tiếng Việt"
  }
}
Chỉ trả về JSON thuần túy, không bọc markdown \`\`\`json.`;

    return {
      systemInstruction,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildExplainGrammarPrompt(params: any): PromptBuildResult {
    const { grammarPoint = '', userSentence = '', hskLevel = 1 } = params;

    const systemInstruction = `
Bạn là chuyên gia sư phạm ngữ pháp tiếng Trung Halo Chinese.
Nhiệm vụ: Giải thích ngữ pháp "${grammarPoint}" cho học viên trình độ HSK ${hskLevel}.

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "patternName": "${grammarPoint}",
  "formula": "Công thức ngữ pháp (Ví dụ: S + 把 + O + V + Bổ ngữ)",
  "meaningVi": "Ý nghĩa diễn đạt trong tiếng Việt",
  "usageNotes": ["Lưu ý quan trọng 1", "Lưu ý quan trọng 2"],
  "examples": [
    { "zh": "Ví dụ tiếng Trung", "pinyin": "Pinyin", "vi": "Dịch nghĩa" }
  ],
  "commonMistakes": [
    { "wrong": "Câu sai người Việt hay mắc", "correct": "Câu đúng", "why": "Giải thích lỗi" }
  ]
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Hãy giải thích ngữ pháp: ${grammarPoint}. ${userSentence ? `Câu của học viên: "${userSentence}"` : ''}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildExplainVocabularyPrompt(params: any): PromptBuildResult {
    const { word = '', contextSentence = '' } = params;

    const systemInstruction = `
Bạn là chuyên gia từ điển & chiết tự chữ Hán Halo Chinese.
Nhiệm vụ: Phân tích sâu từ vựng "${word}".

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "simplified": "${word}",
  "pinyin": "Pinyin chuẩn",
  "meaningVi": "Nghĩa tiếng Việt chính xác",
  "wordType": "Từ loại (danh từ, động từ, tính từ...)",
  "radicals": "Bộ thủ và ý nghĩa tạo hình chữ",
  "mnemonic": "Mẹo ghi nhớ chữ Hán",
  "collocations": ["Cụm từ hay đi kèm 1", "Cụm từ 2"],
  "examples": [
    { "zh": "Câu ví dụ", "pinyin": "Pinyin", "vi": "Dịch tiếng Việt" }
  ]
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Phân tích từ vựng: ${word}. ${contextSentence ? `Trong ngữ cảnh: "${contextSentence}"` : ''}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildCompareWordsPrompt(params: any): PromptBuildResult {
    const { wordA = '', wordB = '' } = params;

    const systemInstruction = `
Bạn là chuyên gia đối chiếu từ vựng ngữ pháp tiếng Trung Halo Chinese.
Nhiệm vụ: So sánh và làm rõ sự khác biệt giữa hai từ [${wordA}] và [${wordB}].

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "wordA": "${wordA}",
  "wordB": "${wordB}",
  "summaryVi": "Tóm tắt sự khác biệt cốt lõi nhất trong 1-2 câu",
  "comparisonTable": [
    { "criteria": "Tiêu chí so sánh", "valA": "Đặc điểm của ${wordA}", "valB": "Đặc điểm của ${wordB}" }
  ],
  "contrastExamples": [
    { "situation": "Ngữ cảnh dùng", "correctWord": "${wordA} hoặc ${wordB}", "sentenceZh": "Câu mẫu", "sentenceVi": "Dịch nghĩa" }
  ],
  "tipForVietnamese": "Mẹo để người Việt không bao giờ bị nhầm lẫn"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `So sánh 2 từ: ${wordA} và ${wordB}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildAnalyzeSentencePrompt(params: any): PromptBuildResult {
    const { sentence = '' } = params;

    const systemInstruction = `
Bạn là chuyên gia phân tích ngữ pháp câu tiếng Trung.
Nhiệm vụ: Mổ xẻ thành phần câu "${sentence}".

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "sentenceZh": "${sentence}",
  "pinyin": "Pinyin toàn câu",
  "meaningVi": "Dịch nghĩa tiếng Việt",
  "components": [
    { "segment": "Từ hoặc cụm từ", "role": "Chủ ngữ / Vị ngữ / Bổ ngữ / Tân ngữ / Trạng ngữ", "explanation": "Giải thích vai trò" }
  ],
  "grammarNotes": ["Điểm ngữ pháp đáng chú ý trong câu"]
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Phân tích câu: ${sentence}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildAnalyzeConversationPrompt(params: any): PromptBuildResult {
    const { conversationText = '', hskLevel = 1 } = params;

    const systemInstruction = `
Bạn là Trưởng bộ môn Sư phạm Tiếng Trung Halo Chinese.
Nhiệm vụ: Phân tích toàn diện phiên hội thoại vừa diễn ra, trích xuất dữ liệu học tập thực tế để cập nhật bộ nhớ học tập dài hạn.

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "overallScore": 85,
  "summaryVi": "Nhận xét tổng quan tiến trình hội thoại của học viên",
  "vocabAnalysis": [
    {
      "simplified": "Từ vựng",
      "pinyin": "Pinyin",
      "meaningVi": "Nghĩa",
      "category": "A_mastered_used_well" | "B_known_used_inaccurately" | "C_newly_exposed" | "D_needs_review",
      "contextSnippet": "Đoạn trích câu người học dùng",
      "confidence": 0.9
    }
  ],
  "grammarAnalysis": [
    {
      "patternName": "Tên cấu trúc",
      "isCorrect": true/false,
      "userUsage": "Câu người học nói",
      "correction": "Câu sửa nếu sai",
      "explanationVi": "Giải thích",
      "confidence": 0.85
    }
  ],
  "detectedErrors": [
    {
      "errorType": "vocabulary" | "grammar" | "word_order" | "particle" | "naturalness",
      "title": "Tên lỗi",
      "userSentence": "Câu của học viên",
      "correctedSentence": "Câu đúng chuẩn",
      "explanationVi": "Nguyên nhân và cách sửa",
      "confidence": 0.9
    }
  ],
  "communicationAssessment": {
    "comprehensionScore": 80,
    "responsivenessScore": 85,
    "fluencyScore": 75,
    "strengths": ["Điểm mạnh 1"],
    "weaknesses": ["Điểm cần cải thiện 1"]
  }
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Hội thoại cần phân tích:\n${conversationText}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildGenerateLessonPrompt(params: any): PromptBuildResult {
    const { title = '', hskLevel = 1, topic = '', targetGaps = [] } = params;

    const systemInstruction = `
Bạn là Giảng viên Thiết kế Bài học Tiếng Trung Halo Chinese.
Nhiệm vụ: Soạn bài học cá nhân hóa trình độ HSK ${hskLevel}, chủ đề: "${topic || title}".
Khắc phục các lỗ hổng kiến thức: ${JSON.stringify(targetGaps)}

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "title": "Tên bài học",
  "hskLevel": ${hskLevel},
  "dialogue": [
    { "speaker": "Nhân vật A", "zh": "Câu tiếng Trung", "pinyin": "Pinyin", "vi": "Dịch nghĩa" }
  ],
  "vocabulary": [
    { "simplified": "Từ", "pinyin": "Pinyin", "meaningVi": "Nghĩa" }
  ],
  "grammarPoints": [
    { "pattern": "Cấu trúc", "explanationVi": "Giải thích", "exampleZh": "Ví dụ", "exampleVi": "Nghĩa" }
  ],
  "exercises": [
    { "questionZh": "Câu hỏi", "questionVi": "Yêu cầu", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanationVi": "Giải thích" }
  ]
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Tạo bài học: ${title || topic}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildGenerateRoadmapPrompt(params: any): PromptBuildResult {
    const { currentHsk = 1, targetHsk = 3, targetMonths = 6, weeklyHours = 5 } = params;

    const systemInstruction = `
Bạn là Cố vấn Lộ trình Học tiếng Trung Halo Chinese.
Nhiệm vụ: Lập lộ trình thích ứng từ HSK ${currentHsk} lên HSK ${targetHsk} trong ${targetMonths} tháng, thời lượng ${weeklyHours} giờ/tuần.

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "roadmapTitle": "Tên lộ trình",
  "overviewVi": "Tổng quan chiến lược",
  "stages": [
    {
      "stageIndex": 1,
      "title": "Tên giai đoạn",
      "targetHsk": ${currentHsk},
      "estimatedWeeks": 4,
      "milestones": ["Mục tiêu 1", "Mục tiêu 2"],
      "focusSkills": ["Nghe", "Nói", "Từ vựng"]
    }
  ]
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Lập lộ trình từ HSK ${currentHsk} lên HSK ${targetHsk}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildPlacementAssessmentPrompt(params: any): PromptBuildResult {
    const { answers = [], totalQuestions = 0 } = params;

    const systemInstruction = `
Bạn là Chuyên gia Đánh giá Khảo sát Năng lực Tiếng Trung Halo Chinese.
Nhiệm vụ: Chấm điểm và xếp cấp độ HSK đầu vào dựa trên danh sách câu trả lời.

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "assignedHskLevel": 1,
  "score": 85,
  "estimatedVocabSize": 300,
  "strengths": ["Điểm mạnh"],
  "weaknesses": ["Điểm yếu"],
  "recommendationsVi": "Lời khuyên học tập phù hợp",
  "skillBreakdown": {
    "vocabulary": 80,
    "grammar": 70,
    "reading": 85,
    "listening": 75
  }
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Dữ liệu bài làm (${answers.length}/${totalQuestions} câu):\n${JSON.stringify(answers)}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildAnalyzePronunciationPrompt(params: any): PromptBuildResult {
    const { targetText = '', recognizedText = '', audioDetails = {} } = params;

    const systemInstruction = `
Bạn là Chuyên gia Âm vị học & Luyện giọng Tiếng Trung Halo Chinese.
Nhiệm vụ: Chẩn đoán lỗi phát âm khi học viên đọc câu "${targetText}".
Nội dung nhận diện được từ giọng nói: "${recognizedText}".

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "accuracyScore": 85,
  "isAcceptable": true/false,
  "detectedToneErrors": [
    { "char": "Chữ", "expectedTone": 1, "utteredTone": 4, "advice": "Hướng dẫn điều chỉnh độ cao thanh điệu" }
  ],
  "mouthShapeGuideVi": "Hướng dẫn khẩu hình miệng và vị trí đặt lưỡi",
  "encouragementVi": "Lời động viên"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Chẩn đoán phát âm: Mẫu [${targetText}] vs Nhận diện [${recognizedText}]`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildReadingComprehensionPrompt(params: any): PromptBuildResult {
    const { passageSnippet = '', questionZh = '', userAnswer = '' } = params;

    const systemInstruction = `
Bạn là Giáo viên Đọc hiểu Tiếng Trung Halo Chinese.
Nhiệm vụ: Chấm câu trả lời đọc hiểu của học viên.

${this.CORE_PEDAGOGIC_RULES}

Đoạn trích: "${passageSnippet}"
Câu hỏi: "${questionZh}"
Câu trả lời của học viên: "${userAnswer}"

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "isCorrect": true/false,
  "score": 90,
  "critiqueVi": "Nhận xét chi tiết câu trả lời",
  "modelAnswerZh": "Câu trả lời mẫu chuẩn xác",
  "modelAnswerVi": "Dịch nghĩa câu mẫu"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Chấm câu trả lời đọc hiểu: "${userAnswer}"`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildExplainReadingParagraphPrompt(params: any): PromptBuildResult {
    const { paragraph = '', learnerQuestion = '' } = params;

    const systemInstruction = `
Bạn là Cố vấn Đọc hiểu Tiếng Trung Halo Chinese.
Nhiệm vụ: Giải thích đoạn văn sau và giải đáp thắc mắc của học viên:
Đoạn văn: "${paragraph}"
Câu hỏi học viên: "${learnerQuestion || 'Hãy giải thích các điểm ngữ pháp và từ vựng đáng chú ý.'}"

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "paragraphZh": "${paragraph}",
  "paragraphVi": "Bản dịch nghĩa toàn đoạn văn",
  "explanationVi": "Giải thích chi tiết thắc mắc",
  "keyGrammar": [
    { "pattern": "Cấu trúc", "explanation": "Ý nghĩa trong đoạn này" }
  ],
  "culturalNotes": "Điểm văn hóa thú vị nếu có"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Giải thích đoạn văn: "${paragraph}"`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildEvaluateShadowingPrompt(params: any): PromptBuildResult {
    const { originalText = '', userText = '', rhythmScore = 80 } = params;

    const systemInstruction = `
Bạn là Huấn luyện viên Luyện nói nhại (Shadowing) Tiếng Trung Halo Chinese.
Nhiệm vụ: Đánh giá lượt luyện nói nhại của học viên.
Câu gốc: "${originalText}"
Câu học viên nói: "${userText}"
Điểm nhịp điệu ước lượng: ${rhythmScore}

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "fluencyScore": 85,
  "accuracyScore": 80,
  "feedbackVi": "Nhận xét về độ trễ, ngữ điệu và ngắt nghỉ tự nhiên",
  "rhythmAdvice": "Lời khuyên để bắt kịp tốc độ người bản xứ"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Đánh giá Shadowing: [${originalText}] vs [${userText}]`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildSrsHintPrompt(params: any): PromptBuildResult {
    const { word = '', pinyin = '', meaningVi = '' } = params;

    const systemInstruction = `
Bạn là Chuyên gia Ghi nhớ Trí nhớ Siêu đẳng (Mnemonic & SRS) Halo Chinese.
Nhiệm vụ: Tạo mẹo nhớ nhanh cho từ [${word}] (${pinyin} - ${meaningVi}).

${this.CORE_PEDAGOGIC_RULES}

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "word": "${word}",
  "mnemonicVi": "Câu chuyện mẹo nhớ chiết tự sinh động, hài hước, dễ thuộc",
  "memoryHook": "Điểm neo cảm xúc hoặc liên tưởng thú vị",
  "shortExampleZh": "Câu ví dụ cực ngắn (dưới 6 chữ)",
  "shortExampleVi": "Nghĩa câu ví dụ"
}
Chỉ trả về JSON thuần túy.`;

    return {
      systemInstruction,
      userPrompt: `Tạo mẹo nhớ cho từ: ${word}`,
      promptVersion: this.PROMPT_VERSION
    };
  }

  private static buildVoiceChatLivePrompt(params: any): PromptBuildResult {
    const { hskLevel = 1, mode = 'free', scenario = '', recentTopic = '', recentErrors = [] } = params;

    const errorNotes = (recentErrors && recentErrors.length > 0)
      ? `Lưu ý học viên hay mắc các lỗi sau để khéo léo giúp củng cố: ${recentErrors.join(', ')}.`
      : '';

    const systemInstruction = `
Bạn là Cô giáo/Thầy giáo tiếng Trung Halo Chinese trong phiên VOICE CHAT THỜI GIAN THỰC (Gemini Live API).
Người học đang giao tiếp bằng giọng nói ở cấp độ HSK ${hskLevel}.

PHONG CÁCH ĐÀM THOẠI BẮT BUỘC:
- Nói tự nhiên, ấm áp, câu ngắn gọn, phát âm rõ ràng, chuẩn tiếng Trung Quan thoại.
- Giữ mỗi lượt nói ngắn (1-2 câu ngắn), sau đó đặt câu hỏi mở để người học phản xạ nói tiếp.
- Không nói tràng giang đại hải. Tránh đọc phiên âm Pinyin qua giọng nói trừ khi người học hỏi.
${scenario ? `- Tình huống đang đóng vai: "${scenario}". Giữ vững tính cách nhân vật.` : ''}
${recentTopic ? `- Chủ đề đang trao đổi: "${recentTopic}".` : ''}
${errorNotes}
`;

    return {
      systemInstruction,
      promptVersion: this.PROMPT_VERSION
    };
  }
}
