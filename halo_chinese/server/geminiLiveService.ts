import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiAnalysisService } from './geminiAnalysisService.js';
import { aiTutorEngine } from './aiTutorEngine.js';
import { liveSessionManager } from './liveSessionManager.js';
import { unifiedAIOrchestrator } from './unifiedAIOrchestrator.js';
import type { WebSocket } from 'ws';

export class GeminiLiveService {
  public getApiKey(): string {
    return liveSessionManager.getLiveApiKey();
  }

  public getModel(): string {
    return liveSessionManager.getLiveModel();
  }

  public getVoice(): string {
    return liveSessionManager.getLiveVoice();
  }

  private voiceSampleCache: Map<string, string> = new Map();

  /**
   * Sinh âm thanh mẫu 24kHz từ Gemini Live API cho các prebuilt voices (Aoede, Puck, Charon, Kore, Fenrir)
   */
  public async generateVoiceSample(voiceName: string = 'Aoede'): Promise<{
    success: boolean;
    sampleText: string;
    pinyin: string;
    vi: string;
    voice: string;
    audioBase64?: string;
    source: 'gemini_live' | 'fallback_tts';
  }> {
    const sampleText = '你好！欢迎使用哈罗中文，发音测试正常。';
    const pinyin = 'Nǐ hǎo! Huānyíng shǐyòng Hāluó zhōngwén, fāyīn cèshì zhèngcháng.';
    const vi = 'Xin chào! Chào mừng bạn đến với Halo Chinese, phát âm thử nghiệm bình thường.';

    if (this.voiceSampleCache.has(voiceName)) {
      return {
        success: true,
        sampleText,
        pinyin,
        vi,
        voice: voiceName,
        audioBase64: this.voiceSampleCache.get(voiceName),
        source: 'gemini_live'
      };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: true,
        sampleText,
        pinyin,
        vi,
        voice: voiceName,
        source: 'fallback_tts'
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const targetModel = this.getModel();
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        let isDone = false;
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        }, 5000);

        ai.live.connect({
          model: targetModel,
          config: {
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            },
            systemInstruction: {
              parts: [{ text: 'Bạn là giáo viên tiếng Trung. Hãy phát âm đúng một câu chào ngắn: "你好！欢迎使用哈罗中文。"' }]
            }
          },
          callbacks: {
            onmessage: (msg: any) => {
              const content = msg?.serverContent;
              if (content?.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                  if (part.inlineData?.data) {
                    chunks.push(Buffer.from(part.inlineData.data, 'base64'));
                  }
                }
              }
              if (content?.turnComplete) {
                if (!isDone) {
                  isDone = true;
                  clearTimeout(timer);
                  resolve();
                }
              }
            },
            onerror: (err) => {
              if (!isDone) {
                isDone = true;
                clearTimeout(timer);
                reject(err);
              }
            },
            onclose: () => {
              if (!isDone) {
                isDone = true;
                clearTimeout(timer);
                resolve();
              }
            }
          }
        }).then(session => {
          session.sendRealtimeInput({ text: 'Phát âm mẫu câu' });
        }).catch(err => {
          if (!isDone) {
            isDone = true;
            clearTimeout(timer);
            reject(err);
          }
        });
      });

      if (chunks.length > 0) {
        const audioBase64 = Buffer.concat(chunks).toString('base64');
        this.voiceSampleCache.set(voiceName, audioBase64);
        return {
          success: true,
          sampleText,
          pinyin,
          vi,
          voice: voiceName,
          audioBase64,
          source: 'gemini_live'
        };
      }
    } catch (e) {
      console.warn('Gemini Live voice sample notice:', e);
    }

    return {
      success: true,
      sampleText,
      pinyin,
      vi,
      voice: voiceName,
      source: 'fallback_tts'
    };
  }

  /**
   * Test Live API connectivity by establishing a test session and immediately closing
   */
  public async testLiveApi(apiKey: string, model: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || this.getApiKey() });
      if (!apiKey && !this.getApiKey()) {
        return {
          success: false,
          message: 'Chưa nhập Live API Key.',
          latencyMs: 0
        };
      }

      // Connect test session
      const targetModel = model || this.getModel();
      const session = await ai.live.connect({
        model: targetModel,
        config: {
          responseModalities: ['audio'],
          systemInstruction: {
            parts: [{ text: 'You are a test assistant. Say nothing.' }]
          }
        },
        callbacks: {
          onopen: () => {},
          onmessage: () => {},
          onerror: (err) => {
            console.error('Test Live session error:', err);
          },
          onclose: () => {}
        }
      });

      // Send a quick ping or text
      await session.sendRealtimeInput({ text: 'ping' });

      // Cleanly close
      if ((session as any).close) {
        (session as any).close();
      }

      return {
        success: true,
        message: `Khởi tạo phiên Gemini Live API thành công với model ${targetModel}!`,
        latencyMs: Date.now() - start
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      let classification = 'Lỗi kết nối Live API';
      if (errMsg.includes('403') || errMsg.includes('API_KEY') || errMsg.includes('unregistered')) {
        classification = 'Lỗi xác thực: API Key không có quyền truy cập Live API.';
      } else if (errMsg.includes('NOT_FOUND') || errMsg.includes('model')) {
        classification = `Lỗi model: Model ${model} không hỗ trợ Live API hoặc không tồn tại.`;
      }
      return {
        success: false,
        message: `${classification} (${errMsg})`,
        latencyMs: Date.now() - start
      };
    }
  }

  /**
   * Handle bidirectional Live voice bridge between browser client WebSocket and Gemini Live WebSocket
   * Delegated to LiveSessionManager for optimal lifecycle, audio streaming and memory sync.
   */
  public async handleClientBridge(
    clientWs: WebSocket,
    sessionParams: {
      sessionId?: string;
      hskLevel?: number;
      mode?: string;
      scenario?: string;
      voiceName?: string;
    }
  ) {
    return liveSessionManager.startOrJoinSession(clientWs, sessionParams);
  }
}

export const geminiLiveService = new GeminiLiveService();
