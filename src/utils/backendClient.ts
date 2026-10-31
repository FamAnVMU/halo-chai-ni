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
}

export const backendClient = new LocalBackendClient();
