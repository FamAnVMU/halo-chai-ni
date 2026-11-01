/**
 * Teaching Quality Engine Types (Halo Chinese v2.6.0)
 * Phase B3 - AI Teaching Quality Engine
 *
 * Defines unified error taxonomy, root cause diagnosis structures,
 * pedagogical intents, 5-step structured correction, and pre-delivery quality audits.
 */

export type ErrorCategory =
  | 'vocabulary'
  | 'grammar'
  | 'sentence_expression'
  | 'communication'
  | 'pronunciation';

export type VocabularyErrorType =
  | 'meaning_error'            // Sai nghĩa
  | 'wrong_choice'             // Chọn sai từ
  | 'near_synonym_confusion'   // Nhầm từ gần nghĩa
  | 'context_mismatch'         // Dùng từ không đúng ngữ cảnh
  | 'unnatural_collocation';   // Kết hợp từ không tự nhiên

export type GrammarErrorType =
  | 'word_order'                // Sai trật tự từ
  | 'particle_error'            // Sai trợ từ (了, 的, 得, 地, 把, 被, 过...)
  | 'structure_error'           // Sai cấu trúc
  | 'missing_component'         // Thiếu thành phần
  | 'redundant_component'       // Thừa thành phần
  | 'usage_condition_violation';// Sử dụng sai điều kiện ngữ pháp

export type SentenceExpressionErrorType =
  | 'incomplete_sentence'       // Câu không hoàn chỉnh
  | 'unclear_sentence'          // Câu khó hiểu
  | 'unnatural_expression'      // Câu không tự nhiên
  | 'inappropriate_register';   // Cách diễn đạt không phù hợp tình huống (ngữ vực/văn phong)

export type CommunicationErrorType =
  | 'misunderstood_question'    // Không hiểu câu hỏi
  | 'off_topic'                 // Trả lời lệch chủ đề
  | 'conversation_stagnation'   // Không duy trì được hội thoại
  | 'under_competence_simplification' // Sử dụng câu quá đơn giản khi đã có đủ năng lực
  | 'expression_struggle';      // Không biết cách diễn đạt ý muốn nói

export type PronunciationErrorType =
  | 'tone_contour'              // Sai cao độ thanh điệu (chỉ khi có dữ liệu âm thanh)
  | 'initial_consonant'         // Sai phụ âm đầu (zh/z, ch/c, sh/s)
  | 'final_vowel'               // Sai nguyên âm/vần
  | 'tone_sandhi';              // Sai quy tắc biến điệu (tam thanh, biến điệu 不/一)

export type ErrorSeverityLevel =
  | 'critical'   // Làm thay đổi hoặc phá vỡ ý nghĩa
  | 'major'      // Sai ngữ pháp hoặc sử dụng từ đáng kể
  | 'minor'      // Chưa tự nhiên nhưng vẫn hiểu được
  | 'style';     // Có thể cải thiện cách diễn đạt nhưng không phải lỗi thực sự

export type TeachingIntent =
  | 'ask_meaning'             // Hỏi nghĩa từ/cụm từ
  | 'ask_usage'               // Hỏi cách dùng từ
  | 'ask_grammar'             // Hỏi ngữ pháp
  | 'request_correction'      // Nhờ sửa lỗi
  | 'learn_new_concept'       // Muốn học kiến thức mới
  | 'practice_conversation'   // Muốn luyện giao tiếp / phản xạ
  | 'test_knowledge'          // Muốn kiểm tra kiến thức
  | 'request_simpler'         // Muốn nghe giải thích đơn giản hơn (chưa hiểu)
  | 'general_chat';           // Trò chuyện tự nhiên

export type AdaptivePedagogicCase =
  | 'case_1_not_understood'           // Người học chưa hiểu -> Đổi ví dụ, đổi cách giải thích, so sánh, chia nhỏ
  | 'case_2_theory_ok_practice_fail'  // Hiểu lý thuyết nhưng làm sai -> Chỉ ra đúng bước sai, cho tình huống mới
  | 'case_3_already_mastered'         // Đã thành thạo -> Không dạy lại, đưa ví dụ nâng cao/mở rộng
  | 'case_4_correct_but_uncertain';   // Đúng nhưng chưa chắc -> Đổi ngữ cảnh kiểm tra lại, chưa vội đánh dấu thành thạo

export type RootCauseType =
  | 'conceptual_gap'               // Chưa hiểu chức năng cốt lõi
  | 'confusion_between_uses'       // Nhầm lẫn giữa 2 cách dùng
  | 'l1_interference'              // Chuyển di tiêu cực từ tiếng mẹ đẻ (tiếng Việt)
  | 'rule_known_application_gap'   // Hiểu quy tắc nhưng không biết vận dụng
  | 'context_limited_error';       // Chỉ mắc lỗi trong một loại ngữ cảnh cụ thể

export interface RootCauseDiagnosis {
  id: string;
  learnerId: string;
  conceptKey: string;
  conceptName: string;
  symptom: string;
  suspectedCause: RootCauseType;
  causeExplanationVi: string;
  evidenceIds: string[];
  observationCount: number;
  confidence: number;             // 0.0 - 1.0
  isVerified: boolean;
  verificationPrompt: {
    promptZh: string;
    promptVi: string;
    expectedCriteria: string;
  };
  remedyPlanVi: string;
  createdAt: number;
  updatedAt: number;
}

export interface StructuredCorrection {
  originalText: string;
  correctedText: string;
  errorCategory: ErrorCategory;
  errorType: string;
  severity: ErrorSeverityLevel;
  isGenuineError: boolean;         // true: Sai thực sự; false: Đúng nhưng đề xuất nâng cao
  isPolishing: boolean;            // true: Đề xuất cách nói hay hơn/tự nhiên hơn, không bắt lỗi
  explanationVi: string;
  alternativeExpressions: string[]; // Các cách diễn đạt đúng khác nếu có
  grammarPoint?: string;
  rootCauseHypothesis?: string;
  needsPractice: boolean;          // true nếu là lỗi quan trọng cần người học tự thử lại
  microCheck?: {
    needVerification: boolean;
    exerciseZh: string;
    exerciseVi: string;
  };
}

export interface TeachingQualityAudit {
  passed: boolean;
  score: number;                   // 0 - 100
  pinyinStandardized: boolean;     // Có dấu thanh điệu chuẩn quốc tế
  hanziSimplified: boolean;        // Đúng chữ Hán giản thể
  toneStandardized: boolean;       // Không dùng số thay dấu (e.g. ni3 hao3)
  directAnswerDelivered: boolean;  // Trả lời trực tiếp câu hỏi, không nói vòng vo
  notOverteaching: boolean;        // Không nhồi nhét bài tập/bài giảng dài khi không cần thiết
  levelAppropriate: boolean;       // Phù hợp trình độ / mastery
  noFalsePositive: boolean;        // Không sửa câu đúng thành sai
  issues: string[];
  remediation?: string;
}
