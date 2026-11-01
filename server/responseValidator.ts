/**
 * Response Validator (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 *
 * Validates, cleanses and verifies outputs from Gemini models before
 * returning to client or persisting to SQLite / Unified Learning Memory.
 */

import { AITaskId, OutputFormat } from './aiOrchestratorTypes.js';

export interface ValidationResult<T = any> {
  isValid: boolean;
  sanitizedData?: T;
  rawText: string;
  errors: string[];
}

export class ResponseValidator {
  /**
   * Validate raw response based on Task ID and Expected Format
   */
  public static validate<T = any>(
    taskId: AITaskId,
    rawText: string,
    outputFormat: OutputFormat
  ): ValidationResult<T> {
    const errors: string[] = [];
    const trimmed = (rawText || '').trim();

    if (!trimmed) {
      return {
        isValid: false,
        rawText,
        errors: ['Phản hồi từ mô hình AI rỗng (Empty response)']
      };
    }

    if (outputFormat === 'text') {
      return {
        isValid: true,
        sanitizedData: trimmed as unknown as T,
        rawText: trimmed,
        errors: []
      };
    }

    if (outputFormat === 'json') {
      let parsed: any = null;
      try {
        parsed = this.parseJsonSafely(trimmed);
      } catch (err: any) {
        return {
          isValid: false,
          rawText: trimmed,
          errors: [`Lỗi phân tích cú pháp JSON: ${err.message}`]
        };
      }

      // Check task-specific schema rules
      const schemaErrors = this.validateTaskSchema(taskId, parsed);
      if (schemaErrors.length > 0) {
        return {
          isValid: false,
          sanitizedData: parsed,
          rawText: trimmed,
          errors: schemaErrors
        };
      }

      return {
        isValid: true,
        sanitizedData: parsed,
        rawText: trimmed,
        errors: []
      };
    }

    // Default passthrough for other formats
    return {
      isValid: true,
      sanitizedData: trimmed as unknown as T,
      rawText: trimmed,
      errors: []
    };
  }

  /**
   * Safely parse JSON from raw text, stripping any markdown wrappers or preamble
   */
  public static parseJsonSafely(raw: string): any {
    let clean = raw.trim();

    // Strip markdown fences ```json ... ``` or ``` ... ```
    if (clean.startsWith('```')) {
      const firstLineEnd = clean.indexOf('\n');
      if (firstLineEnd !== -1) {
        clean = clean.slice(firstLineEnd + 1);
      }
      if (clean.endsWith('```')) {
        clean = clean.slice(0, clean.lastIndexOf('```')).trim();
      }
    }

    // If still surrounded by other text, find first '{' or '[' and last '}' or ']'
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      const isObject = clean[startIdx] === '{';
      const endChar = isObject ? '}' : ']';
      const lastIdx = clean.lastIndexOf(endChar);
      if (lastIdx > startIdx) {
        clean = clean.substring(startIdx, lastIdx + 1);
      }
    }

    return JSON.parse(clean);
  }

  /**
   * Validate task-specific required fields and constraints
   */
  private static validateTaskSchema(taskId: AITaskId, data: any): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return ['Dữ liệu phản hồi không phải là JSON Object hoặc Array hợp lệ.'];
    }

    switch (taskId) {
      case 'AI_TUTOR_CHAT': {
        if (!data.replyZh || typeof data.replyZh !== 'string' || !data.replyZh.trim()) {
          errors.push('Thiếu trường bắt buộc "replyZh" (câu trả lời tiếng Trung).');
        }
        if (data.replyPinyin === undefined || typeof data.replyPinyin !== 'string') {
          errors.push('Thiếu trường bắt buộc "replyPinyin".');
        }
        if (data.replyVi === undefined || typeof data.replyVi !== 'string') {
          errors.push('Thiếu trường bắt buộc "replyVi" (bản dịch tiếng Việt).');
        }
        if (data.hasCorrection && !data.correction) {
          errors.push('Đánh dấu hasCorrection=true nhưng thiếu chi tiết "correction".');
        }
        if (data.correction) {
          if (!data.correction.original || !data.correction.corrected) {
            errors.push('Khối correction thiếu thông tin original hoặc corrected.');
          }
          // Chuẩn hóa cờ phân biệt sửa lỗi vs đề xuất nâng cao (Phase B3)
          if (data.correction.isGenuineError === undefined) {
            data.correction.isGenuineError = data.correction.severity !== 'style';
          }
          if (data.correction.isPolishing === undefined) {
            data.correction.isPolishing = data.correction.severity === 'style';
          }
          if (!Array.isArray(data.correction.alternativeExpressions)) {
            data.correction.alternativeExpressions = [];
          }
        }
        break;
      }

      case 'EXPLAIN_GRAMMAR': {
        if (!data.patternName) errors.push('Thiếu "patternName".');
        if (!data.formula) errors.push('Thiếu "formula".');
        if (!data.meaningVi) errors.push('Thiếu "meaningVi".');
        break;
      }

      case 'EXPLAIN_VOCABULARY': {
        if (!data.simplified) errors.push('Thiếu "simplified".');
        if (!data.meaningVi) errors.push('Thiếu "meaningVi".');
        break;
      }

      case 'COMPARE_WORDS': {
        if (!data.wordA || !data.wordB) errors.push('Thiếu wordA hoặc wordB trong so sánh.');
        if (!data.summaryVi) errors.push('Thiếu "summaryVi".');
        break;
      }

      case 'ANALYZE_CONVERSATION': {
        if (typeof data.overallScore !== 'number' || data.overallScore < 0 || data.overallScore > 100) {
          errors.push('Điểm "overallScore" phải là số trong khoảng 0-100.');
        }
        if (!Array.isArray(data.vocabAnalysis)) {
          errors.push('"vocabAnalysis" phải là một mảng.');
        }
        if (!Array.isArray(data.grammarAnalysis)) {
          errors.push('"grammarAnalysis" phải là một mảng.');
        }
        if (!Array.isArray(data.detectedErrors)) {
          errors.push('"detectedErrors" phải là một mảng.');
        }
        break;
      }

      case 'GENERATE_LESSON': {
        if (!data.title) errors.push('Thiếu "title" bài học.');
        if (!Array.isArray(data.dialogue) && !Array.isArray(data.vocabulary)) {
          errors.push('Bài học phải có ít nhất dialogue hoặc vocabulary.');
        }
        break;
      }

      case 'GENERATE_ROADMAP': {
        if (!data.roadmapTitle) errors.push('Thiếu "roadmapTitle".');
        if (!Array.isArray(data.stages) || data.stages.length === 0) {
          errors.push('Lộ trình phải có ít nhất 1 giai đoạn (stages).');
        }
        break;
      }

      case 'ASSESS_PLACEMENT_TEST': {
        if (typeof data.assignedHskLevel !== 'number' || data.assignedHskLevel < 1 || data.assignedHskLevel > 6) {
          errors.push('Cấp độ "assignedHskLevel" phải từ 1 đến 6.');
        }
        break;
      }

      case 'ANALYZE_PRONUNCIATION': {
        if (typeof data.accuracyScore !== 'number') {
          errors.push('Thiếu điểm số "accuracyScore".');
        }
        break;
      }

      case 'EVALUATE_READING_COMPREHENSION': {
        if (typeof data.isCorrect !== 'boolean') {
          errors.push('Thiếu cờ boolean "isCorrect".');
        }
        break;
      }

      case 'EVALUATE_SHADOWING': {
        if (typeof data.fluencyScore !== 'number') {
          errors.push('Thiếu điểm "fluencyScore".');
        }
        break;
      }
    }

    return errors;
  }
}
