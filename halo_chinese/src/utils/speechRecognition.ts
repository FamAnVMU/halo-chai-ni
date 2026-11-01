// Speech-to-Text (STT) and Pronunciation evaluation helper

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.lang = 'zh-CN';
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close stream tracks immediately after check
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      return false;
    } catch (e) {
      console.error('Microphone permission check failed:', e);
      return false;
    }
  }

  public startListening(
    onResult: (payload: SpeechRecognitionResultPayload) => void,
    onEnd: () => void,
    onError: (err: any) => void
  ) {
    if (!this.recognition) {
      onError(new Error('Trình duyệt không hỗ trợ Web Speech API nhận diện giọng nói.'));
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0.9;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
          confidence = res[0].confidence || 0.95;
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      onResult({
        transcript: finalTranscript || interimTranscript,
        isFinal: Boolean(finalTranscript),
        confidence,
      });
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      this.isListening = false;
      onError(e);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  // Calculate pronunciation similarity between student speech and target
  public evaluatePronunciation(
    studentText: string,
    targetText: string
  ): {
    score: number; // 0 - 100
    isMatch: boolean;
    feedbackVi: string;
  } {
    const cleanStudent = studentText.trim().replace(/[.,?!，。？！\s]/g, '');
    const cleanTarget = targetText.trim().replace(/[.,?!，。？！\s]/g, '');

    if (!cleanStudent) {
      return {
        score: 0,
        isMatch: false,
        feedbackVi: 'Hệ thống chưa nghe rõ giọng của bạn. Vui lòng thử nói to hơn hoặc lại gần micro.',
      };
    }

    if (cleanStudent === cleanTarget) {
      return {
        score: 100,
        isMatch: true,
        feedbackVi: 'Tuyệt vời! Phát âm của bạn rất chuẩn xác và rõ ràng!',
      };
    }

    // Levenshtein distance
    const distance = this.levenshtein(cleanStudent, cleanTarget);
    const maxLen = Math.max(cleanStudent.length, cleanTarget.length);
    const similarity = Math.max(0, 1 - distance / maxLen);
    const score = Math.round(similarity * 100);

    let feedbackVi = '';
    if (score >= 80) {
      feedbackVi = `Rất tốt (Điểm: ${score}/100)! Bạn phát âm tương đối chính xác. Chú ý giữ chuẩn thanh điệu.`;
    } else if (score >= 50) {
      feedbackVi = `Tạm được (Điểm: ${score}/100). Nhận diện được: "${cleanStudent}", câu mẫu là: "${cleanTarget}". Hãy nghe lại và thử lại nhé!`;
    } else {
      feedbackVi = `Cần cố gắng (Điểm: ${score}/100). Bạn nói: "${cleanStudent}". Hãy đọc chậm từng âm theo phiên âm Pinyin.`;
    }

    return {
      score,
      isMatch: score >= 75,
      feedbackVi,
    };
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

export const speechService = new SpeechService();
