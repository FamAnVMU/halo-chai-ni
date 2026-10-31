/**
 * Gemini Live Client connects to Local Backend WebSocket bridge at ws://localhost:3001/api/live
 * Transmits 16kHz PCM audio from microphone and plays back 24kHz PCM audio from Gemini Live
 */

import { backendClient } from './backendClient';

export class GeminiLiveAudioClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private isSpeaking: boolean = false;
  private nextPlayTime: number = 0;

  // Callbacks
  public onStatusChange?: (status: 'connecting' | 'listening' | 'thinking' | 'speaking' | 'idle') => void;
  public onUserTranscription?: (text: string) => void;
  public onAiTranscription?: (text: string) => void;
  public onError?: (err: string) => void;
  public onTurnComplete?: () => void;
  public onInterrupted?: () => void;

  public async start(options: {
    hskLevel?: number;
    mode?: string;
    scenario?: string;
    voice?: string;
  }) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
    this.nextPlayTime = this.audioCtx.currentTime;

    this.onStatusChange?.('connecting');

    // 1. Get microphone stream (16kHz PCM conversion)
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (e: any) {
      this.onError?.(`Không thể truy cập Microphone: ${e.message}`);
      return;
    }

    // 2. Connect to Local Backend WebSocket Bridge
    const query = new URLSearchParams({
      hskLevel: String(options.hskLevel || 1),
      mode: options.mode || 'free',
      scenario: options.scenario || '',
      voice: options.voice || 'Aoede'
    });

    const wsUrl = `${backendClient.getWsUrl()}/api/live?${query.toString()}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.onStatusChange?.('listening');
      this.startMicStreaming();
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ready') {
          this.onStatusChange?.('listening');
        } else if (msg.type === 'audio_chunk') {
          // Play 24kHz PCM chunk from Gemini Live
          this.playPcmChunk(msg.data);
          this.onStatusChange?.('speaking');
        } else if (msg.type === 'user_transcription') {
          this.onUserTranscription?.(msg.text);
        } else if (msg.type === 'ai_transcription') {
          this.onAiTranscription?.(msg.text);
        } else if (msg.type === 'interrupted') {
          this.handleInterruption();
        } else if (msg.type === 'turn_complete') {
          this.onTurnComplete?.();
          this.onStatusChange?.('listening');
        } else if (msg.type === 'error') {
          this.onError?.(msg.message);
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    this.ws.onerror = (e) => {
      console.error('WS error:', e);
      this.onError?.('Lỗi kết nối tới Local Backend Live WebSocket. Hãy đảm bảo backend (localhost:3001) đang chạy.');
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.onStatusChange?.('idle');
    };
  }

  private startMicStreaming() {
    if (!this.micStream || !this.audioCtx) return;

    // Use input audio context at 16kHz
    const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    const source = inputContext.createMediaStreamSource(this.micStream);
    this.scriptProcessor = inputContext.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);
      // Convert Float32Array to 16-bit PCM little-endian
      const pcm16 = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      this.ws.send(JSON.stringify({
        type: 'audio_input',
        data: base64,
        mimeType: 'audio/pcm;rate=16000'
      }));
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(inputContext.destination);
  }

  // Playback raw 24kHz PCM chunk
  private playPcmChunk(base64Data: string) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = this.audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);

    const startTime = Math.max(this.audioCtx.currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;
  }

  public handleInterruption() {
    this.nextPlayTime = this.audioCtx ? this.audioCtx.currentTime : 0;
    this.onInterrupted?.();
    this.onStatusChange?.('listening');
  }

  public interrupt() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
    this.handleInterruption();
  }

  public stop() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    this.isConnected = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.nextPlayTime = 0;
  }
}
