import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { aiTutorEngine, PedagogicIntent, ContrastivePair } from './aiTutorEngine.js';

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
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_api_key') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_TEXT_API_KEY || '';
  }

  public getModel(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_model') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite';
  }

  public async testApiKey(apiKey: string, model: string): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const start = Date.now();
    try {
      const client = this.getClient(apiKey);
      const res = await client.models.generateContent({
        model: model || this.getModel(),
        contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng 2 từ: "Kết nối thành công"' }] }]
      });

      const reply = res.text?.trim() || '';
      return {
        success: true,
        message: `Kết nối thành công tới mô hình ${model || this.getModel()}!`,
        latencyMs: Date.now() - start,
        details: { sampleReply: reply }
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      let classification = 'Lỗi không xác định';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('403') || errMsg.includes('unregistered') || errMsg.includes('401')) {
        classification = 'Lỗi xác thực: API Key không hợp lệ hoặc chưa được kích hoạt.';
      } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        classification = 'Lỗi giới hạn: Hết quota (Rate limit / Quota exceeded).';
      } else if (errMsg.includes('NOT_FOUND') || errMsg.includes('model')) {
        classification = `Lỗi mô hình: Mô hình ${model} không tồn tại hoặc tài khoản không có quyền truy cập.`;
      } else if (errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('network')) {
        classification = 'Lỗi kết nối mạng: Không thể kết nối tới máy chủ Google Gemini.';
      }

      return {
        success: false,
        message: `${classification} (${errMsg})`,
        latencyMs: Date.now() - start
      };
    }
  }

  /**
   * AI Tutor Chat với trí thông minh sư phạm nâng cao:
   * 1. Nhận diện ý định sư phạm (Pedagogic Intent)
   * 2. Truy xuất ngữ cảnh & bằng chứng chọn lọc (Selective Context)
   * 3. Phân tích đối chiếu từ gần nghĩa (Contrastive Teaching)
   * 4. Giảng dạy theo từng bước và giải thích thích ứng khi học viên chưa hiểu
   * 5. Sửa lỗi có tính giáo dục & phân cấp độ nghiêm trọng
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

    const model = this.getModel();
    const client = this.getClient(apiKey);

    // 1. Nhận diện ý định của người học
    const intent: PedagogicIntent = options?.overrideIntent || aiTutorEngine.detectPedagogicIntent(message, mode);

    // 2. Tìm kiếm cặp từ đối chiếu nếu người học hỏi so sánh
    const contrastPair: ContrastivePair | null = (intent === 'compare_words' || message.includes('khác gì') || message.includes('phân biệt'))
      ? aiTutorEngine.findMatchingContrastPair(message)
      : null;

    // 3. Truy xuất ngữ cảnh chọn lọc & bằng chứng thực tế
    const selectiveContext = aiTutorEngine.retrieveSelectiveContext(message, hskLevel);

    // 4. Xây dựng System Instruction sư phạm thích ứng
    const systemPrompt = aiTutorEngine.buildPedagogicSystemPrompt({
      intent,
      mode,
      hskLevel,
      scenario,
      selectiveContext,
      contrastPair
    });

    // 5. Chuẩn bị ngữ cảnh hội thoại gần nhất (tối đa 8 lượt để tránh quá tải token)
    const contents: any[] = [];
    const recent = history.slice(-8);
    for (const h of recent) {
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const raw = response.text || '';
    try {
      const parsed = JSON.parse(raw);
      const resData: AITutorResponse = {
        replyZh: parsed.replyZh || '很好！',
        replyPinyin: parsed.replyPinyin || 'Hěn hǎo!',
        replyVi: parsed.replyVi || 'Rất tốt!',
        pedagogicFocus: parsed.pedagogicFocus || (contrastPair ? `${contrastPair.wordA} vs ${contrastPair.wordB}` : undefined),
        intentDetected: intent,
        hasCorrection: !!parsed.hasCorrection,
        correction: parsed.hasCorrection ? parsed.correction : undefined,
        microCheckPrompt: parsed.microCheckPrompt?.needVerification ? parsed.microCheckPrompt : undefined
      };

      // Tự động ghi nhận bằng chứng vào SQLite Evidence Ledger nếu phát hiện lỗi thực tế
      if (resData.hasCorrection && resData.correction) {
        try {
          aiTutorEngine.recordEvidence({
            targetType: resData.correction.grammarPoint ? 'grammar' : 'vocabulary',
            targetKey: resData.correction.grammarPoint || `phrase_${resData.correction.original.slice(0, 10)}`,
            claimSummary: resData.correction.explanationVi.slice(0, 100),
            evidenceQuote: resData.correction.original,
            sourceActivity: 'text_chat',
            sourceSessionId: options?.sessionId || 'default',
            confidenceScore: 0.85,
            masteryStage: 'practicing'
          });
        } catch (_evErr) {
          // Non-blocking
        }
      }

      return resData;
    } catch {
      return {
        replyZh: raw,
        replyPinyin: '',
        replyVi: '',
        intentDetected: intent
      };
    }
  }
}

export const geminiTextService = new GeminiTextService();
