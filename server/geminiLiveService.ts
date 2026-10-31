import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { geminiAnalysisService } from './geminiAnalysisService.js';
import type { WebSocket } from 'ws';

export class GeminiLiveService {
  public getApiKey(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_api_key') as { value: string } | undefined;
    const key = row?.value || process.env.GEMINI_LIVE_API_KEY || '';
    if (key) return key;
    // Fallback to text API key if single key used
    const textRow = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_api_key') as { value: string } | undefined;
    return textRow?.value || process.env.GEMINI_TEXT_API_KEY || '';
  }

  public getModel(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_model') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  }

  public getVoice(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_voice') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_LIVE_VOICE || 'Aoede';
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
    const sessionId = sessionParams.sessionId || `voice_sess_${Date.now()}`;
    let userTranscriptBuffer = '';
    let aiTranscriptBuffer = '';
    const apiKey = this.getApiKey();
    if (!apiKey) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Backend chưa cấu hình Gemini API Key cho Voice Chat.'
      }));
      clientWs.close();
      return;
    }

    const model = this.getModel();
    const voice = sessionParams.voiceName || this.getVoice();
    const hskLevel = sessionParams.hskLevel || 1;
    const mode = sessionParams.mode || 'free';
    const scenario = sessionParams.scenario || '';

    const systemInstruction = `
Bạn là "Lão Sư AI" (老师) - Giáo viên bản xứ tiếng Trung kiên nhẫn, trò chuyện trực tiếp 2 chiều bằng giọng nói với người học Việt Nam.
Trình độ người học: HSK ${hskLevel}.
Chế độ: ${mode} ${scenario ? `(Tình huống: ${scenario})` : ''}.
Quy tắc:
1. Phát âm tiếng Trung chuẩn xác, tốc độ vừa phải cho trình độ HSK ${hskLevel}.
2. Thỉnh thoảng giải thích nghĩa hoặc nhắc từ vựng bằng tiếng Việt ngắn gọn khi người học bối rối hoặc sai lỗi.
3. Câu nói tự nhiên, thân thiện, khuyến khích học viên nói tiếng Trung.
4. Khi học viên nói câu chưa chuẩn, hãy sửa nhẹ nhàng trong câu trả lời tiếp theo.
`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      let liveSession: any = null;

      liveSession = await ai.live.connect({
        model,
        config: {
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'ready',
                model,
                voice,
                message: 'Kết nối Gemini Live API thành công!'
              }));
            }
          },
          onmessage: (response: any) => {
            if (clientWs.readyState !== clientWs.OPEN) return;

            const content = response.serverContent;
            if (!content) return;

            // Audio chunks from Gemini Live
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData) {
                  // Base64 PCM 24kHz audio from Gemini
                  clientWs.send(JSON.stringify({
                    type: 'audio_chunk',
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                  }));
                }
              }
            }

            // Real-time transcriptions
            if (content.inputTranscription?.text) {
              userTranscriptBuffer += ' ' + content.inputTranscription.text;
              clientWs.send(JSON.stringify({
                type: 'user_transcription',
                text: content.inputTranscription.text
              }));
            }
            if (content.outputTranscription?.text) {
              aiTranscriptBuffer += ' ' + content.outputTranscription.text;
              clientWs.send(JSON.stringify({
                type: 'ai_transcription',
                text: content.outputTranscription.text
              }));
            }

            // Server barge-in / Interrupted signal
            if (content.interrupted) {
              clientWs.send(JSON.stringify({
                type: 'interrupted'
              }));
            }

            // Turn complete - Persist conversation turns to SQLite for AI Conversation Analysis
            if (content.turnComplete) {
              if (userTranscriptBuffer.trim()) {
                geminiAnalysisService.saveMessage({
                  sessionId,
                  sender: 'user',
                  text: userTranscriptBuffer.trim(),
                  isAudio: true
                });
                userTranscriptBuffer = '';
              }
              if (aiTranscriptBuffer.trim()) {
                geminiAnalysisService.saveMessage({
                  sessionId,
                  sender: 'assistant',
                  text: aiTranscriptBuffer.trim(),
                  isAudio: true
                });
                aiTranscriptBuffer = '';
              }

              clientWs.send(JSON.stringify({
                type: 'turn_complete'
              }));
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live API bridge error:', err);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: `Lỗi Live API: ${err?.message || 'Sự cố kết nối'}`
              }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'closed',
                message: 'Phiên Live API đã kết thúc.'
              }));
            }
          }
        }
      });

      // Handle messages from browser client
      clientWs.on('message', async (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'audio_input') {
            // Client sending PCM 16kHz audio chunk
            if (liveSession) {
              await liveSession.sendRealtimeInput({
                audio: {
                  data: msg.data, // base64
                  mimeType: msg.mimeType || 'audio/pcm;rate=16000'
                }
              });
            }
          } else if (msg.type === 'text_input') {
            // Client sending text
            if (liveSession) {
              await liveSession.sendRealtimeInput({ text: msg.text });
            }
          } else if (msg.type === 'interrupt') {
            // Client signals user started talking, client stops playback
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          }
        } catch (e) {
          console.error('Client message parse error:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          if (userTranscriptBuffer.trim()) {
            geminiAnalysisService.saveMessage({
              sessionId,
              sender: 'user',
              text: userTranscriptBuffer.trim(),
              isAudio: true
            });
            userTranscriptBuffer = '';
          }
          if (aiTranscriptBuffer.trim()) {
            geminiAnalysisService.saveMessage({
              sessionId,
              sender: 'assistant',
              text: aiTranscriptBuffer.trim(),
              isAudio: true
            });
            aiTranscriptBuffer = '';
          }
          if (liveSession && (liveSession as any).close) {
            (liveSession as any).close();
          }
        } catch {}
      });

    } catch (err: any) {
      console.error('Failed to initialize live bridge:', err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Không thể kết nối Live API: ${err?.message || String(err)}`
        }));
        clientWs.close();
      }
    }
  }
}

export const geminiLiveService = new GeminiLiveService();
