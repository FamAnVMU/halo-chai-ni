/**
 * AudioRecorder Utility for Chinese Pronunciation Lab
 * Handles microphone capture, MediaRecorder audio blob creation,
 * live volume meter, duration tracking, and clean release of audio tracks.
 */

export interface RecordedAudioResult {
  blob: Blob;
  audioUrl: string;
  durationMs: number;
  mimeType: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private startTime: number = 0;
  private timerInterval: any = null;
  private timeoutId: any = null;

  public isRecording: boolean = false;
  public onVolumeChange?: (volume: number) => void; // 0 to 100
  public onDurationChange?: (elapsedSeconds: number) => void;
  public onError?: (err: Error) => void;

  /**
   * Check if browser supports recording
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';
  }

  /**
   * Start recording from microphone with optional maximum duration (default 15s)
   */
  public async startRecording(maxDurationSeconds: number = 15): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt hoặc thiết bị của bạn không hỗ trợ MediaRecorder thu âm.');
    }

    // Stop any ongoing recording
    this.cleanup();

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup live volume analyser
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtxClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createMediaStreamSource(this.audioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.startVolumeMonitoring();
      } catch (audioCtxErr) {
        console.warn('Audio analyser setup note:', audioCtxErr);
      }

      // Pick supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      this.audioChunks = [];
      this.mediaRecorder = selectedMimeType
        ? new MediaRecorder(this.audioStream, { mimeType: selectedMimeType })
        : new MediaRecorder(this.audioStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.isRecording = true;

      // Realtime duration tick
      this.onDurationChange?.(0);
      this.timerInterval = setInterval(() => {
        if (this.isRecording) {
          const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
          this.onDurationChange?.(elapsedSec);
        }
      }, 200);

      // Auto stop timeout
      this.timeoutId = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording().catch(err => console.warn('Auto-stop error:', err));
        }
      }, maxDurationSeconds * 1000);

      this.mediaRecorder.start(100); // 100ms slice
    } catch (err: any) {
      this.cleanup();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Chưa cấp quyền truy cập Microphone. Vui lòng cho phép ứng dụng dùng microphone.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('Không tìm thấy thiết bị Microphone trên máy tính hoặc thiết bị này.');
      }
      throw new Error(`Lỗi khởi tạo thu âm: ${err.message || String(err)}`);
    }
  }

  /**
   * Stop recording and return the recorded audio Blob and URL
   */
  public stopRecording(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        this.cleanup();
        reject(new Error('Chưa bắt đầu ghi âm hoặc ghi âm đã dừng.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const durationMs = Math.max(100, Date.now() - this.startTime);
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        this.cleanup();

        resolve({
          blob,
          audioUrl,
          durationMs,
          mimeType
        });
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Cancel and discard recording immediately
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  /**
   * Clean up all hardware streams, AudioContext, and intervals to avoid mic leaks
   */
  public cleanup(): void {
    this.isRecording = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      this.audioStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
      this.analyser = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.onVolumeChange?.(0);
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

      this.onVolumeChange?.(normalizedVolume);
      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    this.animFrameId = requestAnimationFrame(checkVolume);
  }
}

export const audioRecorder = new AudioRecorder();
