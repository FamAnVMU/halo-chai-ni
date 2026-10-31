const BACKEND_BASE = 'http://localhost:3001';

export interface BackendHealth {
  status: string;
  uptime: number;
  database: string;
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
  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getKeyConfig(): Promise<BackendKeyConfig | null> {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/settings/keys`);
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
      const res = await fetch(`${BACKEND_BASE}/api/settings/keys`, {
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
      const res = await fetch(`${BACKEND_BASE}/api/settings/test-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (localhost:3001): ${e.message}` };
    }
  }

  public async testLiveApi(apiKey?: string, model?: string) {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/settings/test-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (localhost:3001): ${e.message}` };
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
    const res = await fetch(`${BACKEND_BASE}/api/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  public async getLearnerMemory() {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/memory`);
      return await res.json();
    } catch {
      return null;
    }
  }

  public async updateLearnerMemory(data: any) {
    const res = await fetch(`${BACKEND_BASE}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }
}

export const backendClient = new LocalBackendClient();
