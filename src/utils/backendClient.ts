import type {
  SrsDashboardStats,
  SrsItem,
  SrsUserRating,
  SrsReviewMode,
  SrsSubmitReviewResult,
  SrsAIExercise,
  ConversationAnalysisReport,
  RecentAnalysisSummary
} from '../types';

export interface BackendHealth {
  status: string;
  uptime: number;
  database: string;
  localIps?: string[];
}

export interface BackendKeyConfig {
  textConfig: {
    hasKey: boolean;
    keyPreview: string;
    model: string;
    supportedModels: string[];
  };
  liveConfig: {
    hasKey: boolean;
    keyPreview: string;
    model: string;
    voice: string;
    supportedModels: string[];
    supportedVoices: string[];
  };
}

export class LocalBackendClient {
  public getServerHost(): string {
    return localStorage.getItem('halo_server_host') || 'localhost:3001';
  }

  public setServerHost(host: string) {
    let clean = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!clean.includes(':')) {
      clean = `${clean}:3001`;
    }
    localStorage.setItem('halo_server_host', clean);
  }

  public getBaseUrl(): string {
    const host = this.getServerHost();
    return `http://${host}`;
  }

  public getWsUrl(): string {
    const host = this.getServerHost();
    return `ws://${host}`;
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getHealthData(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/health`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public async getKeyConfig(): Promise<BackendKeyConfig | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/keys`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public async saveKeys(params: {
    textApiKey?: string;
    textModel?: string;
    liveApiKey?: string;
    liveModel?: string;
    liveVoice?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối Local Backend: ${e.message}` };
    }
  }

  public async testTextApi(apiKey?: string, model?: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (${this.getBaseUrl()}): ${e.message}` };
    }
  }

  public async testLiveApi(apiKey?: string, model?: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (${this.getBaseUrl()}): ${e.message}` };
    }
  }

  public async getVoiceSample(voice?: string): Promise<{
    success: boolean;
    sampleText: string;
    pinyin: string;
    vi: string;
    voice: string;
    audioBase64?: string;
    source: 'gemini_live' | 'fallback_tts';
  }> {
    try {
      const q = voice ? `?voice=${encodeURIComponent(voice)}` : '';
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-voice-sample${q}`);
      if (res.ok) return await res.json();
      return {
        success: false,
        sampleText: '你好！欢迎使用哈罗中文，发音测试正常。',
        pinyin: 'Nǐ hǎo! Huānyíng shǐyòng Hāluó zhōngwén, fāyīn cèshì zhèngcháng.',
        vi: 'Xin chào! Chào mừng bạn đến với Halo Chinese, phát âm thử nghiệm bình thường.',
        voice: voice || 'Aoede',
        source: 'fallback_tts'
      };
    } catch {
      return {
        success: false,
        sampleText: '你好！欢迎使用哈罗中文，发音测试正常。',
        pinyin: 'Nǐ hǎo! Huānyíng shǐyòng Hāluó zhōngwén, fāyīn cèshì zhèngcháng.',
        vi: 'Xin chào! Chào mừng bạn đến với Halo Chinese, phát âm thử nghiệm bình thường.',
        voice: voice || 'Aoede',
        source: 'fallback_tts'
      };
    }
  }

  public async sendTutorMessage(params: {
    message: string;
    history: any[];
    mode: string;
    hskLevel: number;
    scenario?: string;
    sessionId?: string;
  }) {
    const res = await fetch(`${this.getBaseUrl()}/api/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  public async getLearnerMemory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/memory`);
      return await res.json();
    } catch {
      return null;
    }
  }

  public async updateLearnerMemory(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  // ==================== ADVANCED STRUCTURED MEMORY ====================
  public async getFullMemory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/memory/all`);
      if (res.ok) return await res.json();
      return { success: false, error: 'Không thể tải bộ nhớ học tập' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async updateProfile(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async saveVocabulary(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteVocabulary(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/vocabulary/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  public async saveGrammar(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteGrammar(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/grammar/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  public async saveError(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteError(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/errors/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  // ==================== AI LESSON & CONVERSATION ANALYSIS ====================
  public async analyzeSession(sessionId = 'session_default') {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/analyze-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    return await res.json();
  }

  public async getAnalyses() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/ai/analyses`);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async getGeneratedLessons(filter?: { status?: string; type?: string }) {
    try {
      const params = new URLSearchParams();
      if (filter?.status) params.append('status', filter.status);
      if (filter?.type) params.append('type', filter.type);
      const url = `${this.getBaseUrl()}/api/ai/lessons${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async getGeneratedLesson(id: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${id}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateLesson(params: {
    topic?: string;
    lessonType?: 'new' | 'review' | 'reinforce' | 'advanced' | 'error_correction';
    hskLevel?: number;
    customRequest?: string;
    sessionId?: string;
  }) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/generate-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  public async completeLesson(lessonId: string, submission: { userAnswers: Record<string, string>; timeSpentSeconds?: number }) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    return await res.json();
  }

  public async simplifyLesson(lessonId: string) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${lessonId}/simplify`, {
      method: 'POST'
    });
    return await res.json();
  }

  public async deleteGeneratedLesson(id: string) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  // ==================== AI PLACEMENT TEST ====================
  public async startPlacementTest(testType: 'full' | 'quick' = 'full') {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getActivePlacementTest() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/active`);
      if (res.ok) return await res.json();
      return { success: false, data: null };
    } catch {
      return { success: false, data: null };
    }
  }

  public async getPlacementProgress(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/${testId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async submitPlacementAnswer(params: {
    testId: string;
    questionId: string;
    userAnswer: string;
    durationIncrementSeconds?: number;
  }) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async skipPlacementSection(testId: string, section: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/skip-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, section })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async completePlacementTest(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPlacementResult(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/results/${testId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPlacementHistory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/history/all`);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async syncPlacementResult(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/sync-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== ADAPTIVE LEARNING PATH ====================

  public async getCurrentPath() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/current`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateAdaptivePath(params: {
    forceNew?: boolean;
    targetHsk?: number;
    targetTimelineMonths?: number;
    dailyMinutes?: number;
    daysPerWeek?: number;
    learningFocus?: string;
  } = {}) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async rebalancePath(params: {
    reason?: string;
    newHskEstimate?: number;
    trigger?: 'lesson_completed' | 'test_completed' | 'manual';
    score?: number;
  } = {}) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async updatePathGoals(params: {
    targetHsk?: number;
    targetTimelineMonths?: number;
    dailyMinutes?: number;
    daysPerWeek?: number;
    learningFocus?: string;
  }) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/update-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async lockPathStage(stageId: string, isLocked: boolean) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/lock-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, isLocked })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async rescheduleScheduleItem(scheduleId: string, newDayOfWeek: number) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/reschedule-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, newDayOfWeek })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async completeScheduleItem(scheduleId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/complete-schedule-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async startPathItem(itemId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/item/${itemId}/start`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPathVersions(pathId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/versions/${pathId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async restorePathVersion(versionId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/restore-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== SMART REVIEW SYSTEM (SRS) ====================

  public async getSrsDashboard(): Promise<{ success: boolean; data?: SrsDashboardStats; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/dashboard`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getSrsQueue(params?: {
    limit?: number;
    mode?: string;
    hskLevel?: number;
  }): Promise<{ success: boolean; data?: SrsItem[]; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.mode) query.set('mode', params.mode);
      if (params?.hskLevel) query.set('hskLevel', String(params.hskLevel));

      const res = await fetch(`${this.getBaseUrl()}/api/srs/queue?${query.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncSrsCards(): Promise<{
    success: boolean;
    data?: { addedVocab: number; addedGrammar: number; addedErrors: number; totalCards: number };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/sync`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async startSrsSession(sessionType: string = 'daily_review'): Promise<{
    success: boolean;
    data?: { sessionId: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async finishSrsSession(sessionId: string, durationSeconds: number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/session/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, durationSeconds })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async submitSrsReview(params: {
    itemId: string;
    userRating: SrsUserRating;
    reviewMode: SrsReviewMode;
    sessionId?: string;
    userAnswer?: string;
    isCorrect?: boolean;
    durationMs?: number;
  }): Promise<{
    success: boolean;
    data?: SrsSubmitReviewResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateSrsAIExercise(itemId: string): Promise<{
    success: boolean;
    data?: SrsAIExercise;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/ai-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== AI CONVERSATION ANALYSIS ====================

  public async analyzeConversationSession(
    sessionId: string,
    options?: { force?: boolean; sessionType?: 'text' | 'voice' | 'mixed' }
  ): Promise<{
    success: boolean;
    data?: ConversationAnalysisReport;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {})
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getAnalysisReport(sessionId: string): Promise<{
    success: boolean;
    data?: ConversationAnalysisReport;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/session/${sessionId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getRecentAnalyses(limit: number = 10): Promise<{
    success: boolean;
    data?: RecentAnalysisSummary[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/recent?limit=${limit}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async saveChatMessage(params: {
    sessionId: string;
    sender: 'user' | 'assistant';
    text: string;
    pinyin?: string;
    translationVi?: string;
    isAudio?: boolean;
    correctionJson?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/save-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const backendClient = new LocalBackendClient();
