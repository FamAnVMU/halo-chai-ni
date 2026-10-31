import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

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

  public async chat(
    message: string,
    history: Array<{ sender: 'user' | 'assistant'; text: string }>,
    mode: string,
    hskLevel: number,
    scenario?: string
  ): Promise<{
    replyZh: string;
    replyPinyin: string;
    replyVi: string;
    correction?: {
      original: string;
      corrected: string;
      explanationVi: string;
      grammarPoint?: string;
      naturalSuggestion?: string;
    };
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Backend chưa có API Key. Vui lòng cấu hình Gemini Text API Key tại trang Cài đặt.');
    }

    const model = this.getModel();
    const client = this.getClient(apiKey);

    // Retrieve learner memory from SQLite
    const memoryRow = db.prepare('SELECT * FROM learner_memory WHERE id = ?').get('default') as any;
    const weaknesses = memoryRow?.weaknesses_json ? JSON.parse(memoryRow.weaknesses_json) : [];
    const mispronounced = memoryRow?.mispronounced_json ? JSON.parse(memoryRow.mispronounced_json) : [];
    const strugglingGrammar = memoryRow?.struggling_grammar_json ? JSON.parse(memoryRow.struggling_grammar_json) : [];

    const systemPrompt = `
Bạn là "Lão Sư AI" (老师) - Giáo viên dạy tiếng Trung cá nhân tận tâm, kiên nhẫn, thân thiện dành riêng cho người Việt Nam.
Trình độ người học: HSK ${hskLevel}.
Chế độ học tập hiện tại: ${mode} ${scenario ? `(Tình huống đóng vai: ${scenario})` : ''}.

Thông tin bộ nhớ người học (từ SQLite Database):
- Điểm yếu cần chú ý: ${weaknesses.join(', ') || 'Chưa có'}
- Từ hay phát âm sai: ${mispronounced.join(', ') || 'Chưa có'}
- Ngữ pháp đang học: ${strugglingGrammar.join(', ') || 'Chưa có'}
- Ghi chú: ${memoryRow?.notes || ''}

QUY TẮC BẮT BUỘC:
1. Luôn sử dụng tiếng Trung phù hợp với cấp độ HSK ${hskLevel} của người học. Đừng dùng từ quá cao siêu hoặc văn phong quá hàn lâm trừ khi ở cấp cao.
2. Kiểm tra câu tiếng Trung của người học. Nếu người học viết/nói có lỗi ngữ pháp, sai từ, hoặc diễn đạt chưa tự nhiên:
   - Hãy chỉ ra lỗi và sửa cho người học.
3. Trả về câu trả lời dưới định dạng JSON DUY NHẤT theo schema sau:
{
  "replyZh": "Câu phản hồi bằng tiếng Trung",
  "replyPinyin": "Phiên âm Pinyin có dấu thanh điệu đầy đủ cho replyZh",
  "replyVi": "Bản dịch hoặc lời giải thích, hướng dẫn bằng tiếng Việt",
  "hasCorrection": true hoặc false,
  "correction": {
    "original": "Câu gốc của người học",
    "corrected": "Câu tiếng Trung chuẩn xác",
    "explanationVi": "Giải thích chi tiết tại sao sai và cấu trúc ngữ pháp liên quan bằng tiếng Việt",
    "grammarPoint": "Tên điểm ngữ pháp liên quan (nếu có)",
    "naturalSuggestion": "Cách nói tự nhiên hơn của người bản xứ (nếu có)"
  }
}
LƯU Ý: Không thêm bất kỳ văn bản nào ngoài khối JSON hợp lệ.
`;

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
      return {
        replyZh: parsed.replyZh || '很好！',
        replyPinyin: parsed.replyPinyin || 'Hěn hǎo!',
        replyVi: parsed.replyVi || 'Rất tốt!',
        correction: parsed.hasCorrection ? parsed.correction : undefined
      };
    } catch {
      return {
        replyZh: raw,
        replyPinyin: '',
        replyVi: ''
      };
    }
  }
}

export const geminiTextService = new GeminiTextService();
