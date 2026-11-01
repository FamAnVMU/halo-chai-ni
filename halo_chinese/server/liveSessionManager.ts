/**
 * Gemini Live Session Manager (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 *
 * Dedicated realtime lifecycle manager for Gemini Live API WebSocket sessions.
 * Decoupled from the regular Text-out request-response flow to prevent latency,
 * yet integrated with Unified Learning Memory for context handoff and post-session sync.
 */

import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { aiTutorEngine } from './aiTutorEngine.js';
import { unifiedLearningMemoryService } from './unifiedLearningMemoryService.js';
import { LiveSessionState } from './aiOrchestratorTypes.js';
import type { WebSocket } from 'ws';

export class LiveSessionManager {
  private activeSessions: Map<string, {
    state: LiveSessionState;
    clientWs: WebSocket;
    liveSession?: any;
    pingTimer?: NodeJS.Timeout;
  }> = new Map();

  /**
   * Resolve configured Live API Model from server settings
   */
  public getLiveModel(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_model') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  }

  /**
   * Resolve configured Live Voice
   */
  public getLiveVoice(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_voice') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_LIVE_VOICE || 'Aoede';
  }

  /**
   * Resolve configured Live API Key
   */
  public getLiveApiKey(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_live_api_key') as { value: string } | undefined;
    const key = row?.value || process.env.GEMINI_LIVE_API_KEY || '';
    if (key) return key;
    // Fallback to text key if unified key is configured
    const textRow = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_api_key') as { value: string } | undefined;
    return textRow?.value || process.env.GEMINI_TEXT_API_KEY || '';
  }

  /**
   * Check if a session is currently active
   */
  public hasActiveSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return !!session && session.state.status === 'active';
  }

  /**
   * Get active session state
   */
  public getSessionState(sessionId: string): LiveSessionState | undefined {
    return this.activeSessions.get(sessionId)?.state;
  }

  /**
   * Initialize and bridge a realtime Live voice session with client WebSocket
   */
  public async startOrJoinSession(
    clientWs: WebSocket,
    params: {
      sessionId?: string;
      learnerId?: string;
      hskLevel?: number;
      mode?: string;
      scenario?: string;
      voiceName?: string;
    }
  ): Promise<void> {
    const sessionId = params.sessionId || `voice_sess_${Date.now()}`;
    const learnerId = params.learnerId || 'default';
    const apiKey = this.getLiveApiKey();

    if (!apiKey) {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          code: 'AUTHENTICATION_ERROR',
          message: 'Backend chưa cấu hình Gemini API Key cho Voice Chat.'
        }));
        clientWs.close();
      }
      return;
    }

    // Reuse existing live connection if already active
    if (this.hasActiveSession(sessionId)) {
      const existing = this.activeSessions.get(sessionId)!;
      existing.clientWs = clientWs;
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'ready',
          sessionId,
          reconnected: true,
          message: 'Kết nối lại phiên Voice Chat đang hoạt động thành công.'
        }));
      }
      return;
    }

    const model = this.getLiveModel();
    const voice = params.voiceName || this.getLiveVoice();
    const hskLevel = params.hskLevel || 1;
    const mode = params.mode || 'free';
    const scenario = params.scenario || '';

    // 1. Prepare concise context handoff from Unified Learning Memory
    const profile = unifiedLearningMemoryService.getLearnerProfile(learnerId);
    const weaknesses = unifiedLearningMemoryService.getLearningWeaknesses(learnerId, 2);
    const recentErrors = weaknesses.map(w => w.title);

    let recentTopic = scenario;
    if (!recentTopic) {
      const lastSession = db.prepare('SELECT title, scenario FROM chat_sessions ORDER BY updated_at DESC LIMIT 1').get() as any;
      if (lastSession) {
        recentTopic = lastSession.scenario || lastSession.title || '';
      }
    }

    const systemInstruction = aiTutorEngine.buildVoiceSystemPrompt({
      hskLevel: profile?.current_hsk || hskLevel,
      mode,
      scenario,
      recentTopic,
      recentErrors
    });

    const state: LiveSessionState = {
      sessionId,
      status: 'connecting',
      modelId: model,
      voiceName: voice,
      mode,
      hskLevel,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      userTurnCount: 0,
      modelTurnCount: 0,
      accumulatedUserTranscript: '',
      accumulatedAiTranscript: ''
    };

    this.activeSessions.set(sessionId, { state, clientWs });

    try {
      const ai = new GoogleGenAI({ apiKey });
      let liveSessionInstance: any = null;

      liveSessionInstance = await ai.live.connect({
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
            state.status = 'active';
            state.lastActiveAt = Date.now();
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'ready',
                sessionId,
                model,
                voice,
                message: 'Kết nối Gemini Live API thành công!'
              }));
            }
          },

          onmessage: (response: any) => {
            state.lastActiveAt = Date.now();
            if (clientWs.readyState !== clientWs.OPEN) return;

            const content = response.serverContent;
            if (!content) return;

            // Stream PCM audio chunk directly to client (minimal latency)
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData) {
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
              state.accumulatedUserTranscript += ' ' + content.inputTranscription.text;
              clientWs.send(JSON.stringify({
                type: 'user_transcription',
                text: content.inputTranscription.text
              }));
            }
            if (content.outputTranscription?.text) {
              state.accumulatedAiTranscript += ' ' + content.outputTranscription.text;
              clientWs.send(JSON.stringify({
                type: 'ai_transcription',
                text: content.outputTranscription.text
              }));
            }

            // Interruption / barge-in
            if (content.interrupted) {
              state.status = 'interrupted';
              clientWs.send(JSON.stringify({
                type: 'interrupted'
              }));
            }

            // Turn completed
            if (content.turnComplete) {
              state.status = 'active';
              state.modelTurnCount++;
              clientWs.send(JSON.stringify({
                type: 'turn_complete'
              }));
            }
          },

          onerror: (err: any) => {
            state.status = 'error';
            console.error(`[LiveSessionManager] Session ${sessionId} error:`, err?.message || err);
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                code: 'LIVE_SESSION_ERROR',
                message: `Lỗi kết nối Gemini Live API: ${err?.message || 'Không rõ nguyên nhân'}`
              }));
            }
          },

          onclose: () => {
            state.status = 'closed';
            this.handleSessionEnded(sessionId, learnerId);
          }
        }
      });

      // Update reference with connected instance
      const entry = this.activeSessions.get(sessionId);
      if (entry) {
        entry.liveSession = liveSessionInstance;
      }

      // Handle incoming messages from browser client
      clientWs.on('message', async (data: any) => {
        state.lastActiveAt = Date.now();
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'audio_chunk' && msg.data) {
            // Forward user's mic PCM audio chunk straight to Gemini Live
            if (liveSessionInstance?.sendRealtimeInput) {
              liveSessionInstance.sendRealtimeInput({
                mediaChunks: [{
                  mimeType: msg.mimeType || 'audio/pcm;rate=16000',
                  data: msg.data
                }]
              });
            }
          } else if (msg.type === 'text_input' && msg.text) {
            state.userTurnCount++;
            state.accumulatedUserTranscript += ' ' + msg.text;
            if (liveSessionInstance?.sendRealtimeInput) {
              liveSessionInstance.sendRealtimeInput({ text: msg.text });
            }
          } else if (msg.type === 'end_session') {
            this.terminateSession(sessionId);
          }
        } catch (parseErr) {
          console.warn('[LiveSessionManager] Client message parse error:', parseErr);
        }
      });

      clientWs.on('close', () => {
        this.terminateSession(sessionId);
      });

    } catch (err: any) {
      state.status = 'error';
      console.error('[LiveSessionManager] Start session failed:', err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          code: 'LIVE_SESSION_ERROR',
          message: `Không thể kết nối Live API: ${err.message}`
        }));
        clientWs.close();
      }
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Terminate and clean up a live session
   */
  public terminateSession(sessionId: string): void {
    const entry = this.activeSessions.get(sessionId);
    if (!entry) return;

    entry.state.status = 'closing';
    if (entry.liveSession?.close) {
      try {
        entry.liveSession.close();
      } catch (_e) {}
    }

    if (entry.clientWs.readyState === entry.clientWs.OPEN) {
      try {
        entry.clientWs.send(JSON.stringify({
          type: 'session_ended',
          sessionId
        }));
        entry.clientWs.close();
      } catch (_e) {}
    }

    this.handleSessionEnded(sessionId, 'default');
    this.activeSessions.delete(sessionId);
  }

  /**
   * Process post-session sync to Unified Learning Memory
   */
  private handleSessionEnded(sessionId: string, learnerId: string): void {
    const entry = this.activeSessions.get(sessionId);
    if (!entry) return;

    const { state } = entry;
    const durationSeconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));

    // Save session record to chat_sessions
    try {
      const now = Date.now();
      const sessionMode = state.mode || 'free';
      const sessionHsk = state.hskLevel || 1;

      db.prepare(`
        INSERT INTO chat_sessions (id, mode, hsk_level, title, scenario, session_type, status, duration_seconds, message_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'voice', 'completed', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = 'completed',
          duration_seconds = ?,
          message_count = ?,
          updated_at = ?
      `).run(
        sessionId,
        sessionMode,
        sessionHsk,
        `Voice Chat (${new Date().toLocaleTimeString('vi-VN')})`,
        'Live Voice Session',
        durationSeconds,
        state.userTurnCount + state.modelTurnCount,
        now,
        now,
        durationSeconds,
        state.userTurnCount + state.modelTurnCount,
        now
      );

      // Lưu chi tiết transcript vào chat_messages để luồng Text Chat có thể tiếp tục ngữ cảnh
      if (state.accumulatedUserTranscript.trim().length > 0) {
        db.prepare(`
          INSERT INTO chat_messages (id, session_id, sender, text, is_audio, created_at)
          VALUES (?, ?, 'user', ?, 1, ?)
        `).run(`msg_voice_u_${sessionId}`, sessionId, state.accumulatedUserTranscript.trim(), now);
      }
      if (state.accumulatedAiTranscript.trim().length > 0) {
        db.prepare(`
          INSERT INTO chat_messages (id, session_id, sender, text, is_audio, created_at)
          VALUES (?, ?, 'assistant', ?, 1, ?)
        `).run(`msg_voice_a_${sessionId}`, sessionId, state.accumulatedAiTranscript.trim(), now);
      }

      // If user had meaningful speech, log a learning activity to Unified Memory
      if (state.accumulatedUserTranscript.trim().length > 3) {
        const textSample = state.accumulatedUserTranscript.slice(0, 30).trim();
        unifiedLearningMemoryService.recordLearningActivity({
          sourceModule: 'voice_chat',
          activityType: 'application',
          action: 'speak',
          learnerId,
          sessionId,
          displayText: textSample,
          hanziSimplified: textSample,
          itemType: 'sentence_pattern',
          observedData: {
            speaker: 'user',
            userUtterance: state.accumulatedUserTranscript.slice(0, 200),
            metadata: {
              durationSeconds,
              userTurns: state.userTurnCount,
              modelTurns: state.modelTurnCount
            }
          },
          assessmentData: {
            isCorrect: true,
            score: 0.95
          }
        });
      }
    } catch (saveErr) {
      console.warn('[LiveSessionManager] Post-session save notice:', saveErr);
    }
  }

  /**
   * Active sessions count
   */
  public getActiveCount(): number {
    return this.activeSessions.size;
  }
}

export const liveSessionManager = new LiveSessionManager();
