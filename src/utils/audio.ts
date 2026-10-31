// Audio synthesis and Web Speech API utilities

class AudioService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private chineseVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize zh-CN voices
    const zh = voices.find(v => v.lang === 'zh-CN' || v.lang.startsWith('zh'));
    if (zh) {
      this.chineseVoice = zh;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices().filter(v => v.lang.startsWith('zh'));
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onEnd?: () => void;
      onError?: (e: any) => void;
    }
  ) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this environment');
      options?.onEnd?.();
      return;
    }

    // Cancel any previous speaking to prevent overlapping audio
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || 'zh-CN';
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    if (this.chineseVoice) {
      utterance.voice = this.chineseVoice;
    }

    utterance.onend = () => {
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      options?.onError?.(e);
      options?.onEnd?.();
    };

    this.synth.speak(utterance);
  }

  // Pure Web Audio API Sound Effects (no external mp3 files needed)
  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public playCorrectSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      // Arpeggio pleasant chime: C5 -> G5
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio sound effect failed:', e);
    }
  }

  public playWrongSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(164.81, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio sound effect failed:', e);
    }
  }

  public playCelebrationChime() {
    try {
      const ctx = this.getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + idx * 0.1;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (e) {
      console.warn('Celebration chime failed:', e);
    }
  }
}

export const audioService = new AudioService();
