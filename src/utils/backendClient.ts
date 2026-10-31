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
}

export const backendClient = new LocalBackendClient();
