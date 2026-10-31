import { backendClient } from './backendClient';
import type {
  AIChatMessage,
  AIChatMode,
  PostSessionReport,
  HSKLevel,
} from '../types';

export interface AIServiceResponse {
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
}

export class AIService {
  // Test connection to API provider via Backend Local
  public async testConnection(provider: string, apiKey: string, model: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const isBackendAlive = await backendClient.checkHealth();
    if (isBackendAlive) {
      const res = await backendClient.testTextApi(apiKey, model);
      return {
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs || 0
      };
    }

    return {
      success: false,
      message: 'Không thể kết nối tới Local Backend (http://localhost:3001). Vui lòng đảm bảo backend đang chạy.',
      latencyMs: 0
    };
  }

  // Send message to AI Tutor via Local Backend
  public async sendMessage(
    userMessage: string,
    history: AIChatMessage[],
    mode: AIChatMode,
    hskLevel: HSKLevel,
    roleplayScenario?: string
  ): Promise<AIServiceResponse> {
    try {
      const isBackendAlive = await backendClient.checkHealth();
      if (isBackendAlive) {
        const res = await backendClient.sendTutorMessage({
          message: userMessage,
          history: history.map(h => ({ sender: h.sender, text: h.text })),
          mode,
          hskLevel,
          scenario: roleplayScenario
        });

        if (res.success && res.data) {
          return res.data;
        }
      }
    } catch (e) {
      console.warn('Backend request failed, falling back to local offline processor:', e);
    }

    // Intelligent built-in fallback response when backend is temporarily offline
    return this.generateSmartFallback(userMessage, mode, hskLevel, roleplayScenario);
  }

  // Generate detailed Post-Session Summary Report
  public async generatePostSessionReport(
    sessionHistory: AIChatMessage[],
    hskLevel: HSKLevel
  ): Promise<PostSessionReport> {
    try {
      const isBackendAlive = await backendClient.checkHealth();
      if (isBackendAlive) {
        const prompt = `
Phân tích buổi học tiếng Trung HSK ${hskLevel} sau và trả về báo cáo JSON:
${sessionHistory.map(m => `${m.sender}: ${m.text}`).join('\n')}
SCHEMA:
{
  "topic": "Chủ đề",
  "newWords": [{"zh": "từ", "pinyin": "pinyin", "vi": "nghĩa"}],
  "grammarPoints": ["ngữ pháp"],
  "mistakesMade": [{"original": "câu sai", "corrected": "câu sửa", "explanation": "giải thích"}],
  "strengths": ["điểm mạnh"],
  "weaknesses": ["điểm yếu"],
  "nextStepRecommendation": "lời khuyên"
}
`;
        const res = await backendClient.sendTutorMessage({
          message: prompt,
          history: [],
          mode: 'report',
          hskLevel
        });

        if (res.success && res.data) {
          try {
            return JSON.parse(res.data.replyZh);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Backend report error:', e);
    }

    return {
      topic: 'Giao tiếp thực hành tiếng Trung cơ bản',
      newWords: [
        { zh: '认识', pinyin: 'rènshí', vi: 'Quen biết, nhận biết' },
        { zh: '高兴', pinyin: 'gāoxìng', vi: 'Vui vẻ, phấn khởi' },
      ],
      grammarPoints: ['Cấu trúc câu hỏi với trợ từ 吗 (ma)', 'Đại từ nghi vấn 什么 (shénme)'],
      mistakesMade: [],
      strengths: ['Tự tin phản hồi bằng tiếng Trung', 'Nắm được cấu trúc câu cơ bản'],
      weaknesses: ['Cần chú ý thêm về thanh điệu và sự khác biệt giữa thanh 2 và thanh 3'],
      nextStepRecommendation: 'Tiếp tục luyện tập phản xạ giao tiếp và ôn tập từ vựng bằng Flashcard SRS.',
    };
  }

  private generateSmartFallback(
    message: string,
    _mode: AIChatMode,
    _hskLevel: HSKLevel,
    scenario?: string
  ): AIServiceResponse {
    const lower = message.toLowerCase();

    if (lower.includes('chào') || lower.includes('ni hao') || lower.includes('你好')) {
      return {
        replyZh: '你好！很高兴和你练习中文。今天你想聊些什么呢？',
        replyPinyin: 'Nǐ hǎo! Hěn gāoxìng hé nǐ liànxí zhōngwén. Jīntiān nǐ xiǎng liáo xiē shénme ne?',
        replyVi: 'Xin chào! Rất vui được cùng bạn luyện tập tiếng Trung. Hôm nay bạn muốn trò chuyện về chủ đề gì nào?',
      };
    }

    if (scenario === 'restaurant' || lower.includes('món') || lower.includes('ăn') || lower.includes('cài')) {
      return {
        replyZh: '您好！欢迎光临我们饭店。请问您几位？今天想吃点儿什么菜？',
        replyPinyin: 'Nín hǎo! Huānyíng guānglín wǒmen fàndiàn. Qǐngwèn nín jǐ wèi? Jīntiān xiǎng chī diǎnr shénme cài?',
        replyVi: 'Xin chào quý khách! Hoan nghênh đến nhà hàng của chúng tôi. Xin hỏi quý khách có mấy người ạ? Hôm nay quý khách muốn dùng món gì?',
      };
    }

    return {
      replyZh: '我明白了！你的中文越来越流利了。请继续告诉我，你平时喜欢做什么？',
      replyPinyin: 'Wǒ míngbai le! Nǐ de zhōngwén yuè lái yuè liúlì le. Qǐng jìxù gàosù wǒ, nǐ píngshí xǐhuan zuò shénme?',
      replyVi: 'Tôi hiểu rồi! Tiếng Trung của bạn ngày càng lưu loát hơn đấy. Hãy tiếp tục kể cho tôi nghe, bình thường bạn thích làm gì?',
    };
  }
}

export const aiService = new AIService();
