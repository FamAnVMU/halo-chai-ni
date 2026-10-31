import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { aiTutorEngine, PedagogicIntent, ContrastivePair } from './aiTutorEngine.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';

export interface AITutorResponse {
  replyZh: string;
  replyPinyin: string;
  replyVi: string;
  pedagogicFocus?: string;
  intentDetected?: PedagogicIntent;
  hasCorrection?: boolean;
  correction?: {
    severity?: 'critical' | 'grammar' | 'lexical' | 'naturalness' | 'minor';
    original: string;
    corrected: string;
    explanationVi: string;
    grammarPoint?: string;
    naturalSuggestion?: string;
  };
  microCheckPrompt?: {
    needVerification: boolean;
    exerciseZh?: string;
    exerciseVi?: string;
  };
}

export class GeminiTextService {
  private getClient(customKey?: string) {
    const key = customKey || this.getApiKey();
    if (!key) {
      throw new Error('Chưa cấu hình Gemini Text API Key ở backend.');
    }
    return new GoogleGenAI({ apiKey: key });
  }

  public getApiKey(): string {
    return unifiedAIOrchestrator.getTextApiKey();
  }

  public getModel(): string {
    return unifiedAIOrchestrator.getTextModel();
  }

  public async testApiKey(apiKey: string, model: string): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      const client = new GoogleGenAI({ apiKey });
      const targetModel = model || this.getModel();
      const res = await client.models.generateContent({
        model: targetModel,
        contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng 2 từ: "Kết nối thành công"' }] }]
      });

      const reply = res.text?.trim() || '';
      return {
        success: true,
        message: `Kết nối thành công tới mô hình ${targetModel}!`,
        latencyMs: Date.now() - start,
        details: { sampleReply: reply }
      };
    } catch (err: any) {
      const classified = unifiedAIOrchestrator.classifyError(err);
      return {
        success: false,
        message: `${classified.messageVi} (${classified.code})`,
        latencyMs: Date.now() - start
      };
    }
  }

  /**
   * AI Tutor Chat được điều phối qua Unified AI Orchestrator (Task: AI_TUTOR_CHAT):
   * 1. Nhận diện ý định sư phạm (Pedagogic Intent)
   * 2. Truy xuất ngữ cảnh & bằng chứng chọn lọc từ Unified Learning Memory
   * 3. Phân tích đối chiếu từ gần nghĩa (Contrastive Teaching)
   * 4. Giảng dạy theo từng bước và giải thích thích ứng khi học viên chưa hiểu
   * 5. Sửa lỗi có tính giáo dục & phân cấp độ nghiêm trọng
   * 6. Kiểm định cấu trúc phản hồi (Response Validator)
   * 7. Tự động ghi nhận bằng chứng học tập vào Unified Learning Memory
   */
  public async chat(
    message: string,
    history: Array<{ sender: 'user' | 'assistant'; text: string }>,
    mode: string,
    hskLevel: number,
    scenario?: string,
    options?: {
      overrideIntent?: PedagogicIntent;
      sessionId?: string;
    }
  ): Promise<AITutorResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Backend chưa có API Key. Vui lòng cấu hình Gemini Text API Key tại trang Cài đặt.');
    }

    // 1. Nhận diện ý định của người học
    const intent: PedagogicIntent = options?.overrideIntent || aiTutorEngine.detectPedagogicIntent(message, mode);

    // 2. Tìm kiếm cặp từ đối chiếu nếu người học hỏi so sánh
    const contrastPair: ContrastivePair | null = (intent === 'compare_words' || message.includes('khác gì') || message.includes('phân biệt'))
      ? aiTutorEngine.findMatchingContrastPair(message)
      : null;

    // 3. Thực thi qua Unified AI Orchestrator
    const orchestratorRes = await unifiedAIOrchestrator.executeTask<any, any>({
      taskId: 'AI_TUTOR_CHAT',
      sessionId: options?.sessionId,
      hskLevel,
      input: {
        message,
        history,
        mode,
        scenario,
        contrastPair,
        intent
      }
    });

    if (orchestratorRes.success && orchestratorRes.data) {
      const parsed = orchestratorRes.data;
      return {
        replyZh: parsed.replyZh || '很好！',
        replyPinyin: parsed.replyPinyin || 'Hěn hǎo!',
        replyVi: parsed.replyVi || 'Rất tốt!',
        pedagogicFocus: parsed.pedagogicFocus || (contrastPair ? `${contrastPair.wordA} vs ${contrastPair.wordB}` : undefined),
        intentDetected: intent,
        hasCorrection: !!parsed.hasCorrection,
        correction: parsed.hasCorrection ? parsed.correction : undefined,
        microCheckPrompt: parsed.microCheckPrompt?.needVerification ? parsed.microCheckPrompt : undefined
      };
    }

    // Fallback nếu có lỗi từ AI Orchestrator
    const errVi = orchestratorRes.error?.messageVi || 'Tôi đã nhận được tin nhắn của bạn. Hãy tiếp tục nói tiếng Trung nhé!';
    return {
      replyZh: orchestratorRes.rawText || '你好！请继续跟我说中文。',
      replyPinyin: 'Nǐ hǎo! Qǐng jìxù gēn wǒ shuō zhōngwén.',
      replyVi: errVi,
      intentDetected: intent
    };
  }
}

export const geminiTextService = new GeminiTextService();
