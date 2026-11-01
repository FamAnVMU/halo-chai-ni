/**
 * Halo Chinese - Connection Manager
 * Quản lý trạng thái kết nối Server, phát hiện Online/Offline,
 * lưu trữ cấu hình Host/Port và điều phối trạng thái mạng toàn ứng dụng.
 */

export type ConnectionState =
  | 'not_configured'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'disconnected'
  | 'unreachable'
  | 'incompatible_version'
  | 'syncing'
  | 'synced'
  | 'sync_error'
  | 'offline_mode';

export interface ServerConfig {
  host: string;
  port: string;
  baseUrl: string;
  wsUrl: string;
  isConfigured: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  serverVersion?: string;
  serverTime?: number;
  error?: string;
  code?: 'NETWORK_ERROR' | 'TIMEOUT' | 'INCOMPATIBLE_VERSION' | 'INVALID_CONFIG' | 'OK';
}

class ConnectionManager {
  private state: ConnectionState = 'not_configured';
  private listeners = new Set<(state: ConnectionState) => void>();
  private checkInterval: any = null;
  private backoffDelayMs = 2000;
  private maxBackoffMs = 30000;

  constructor() {
    this.initNetworkListeners();
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.getMode() === 'online') {
        this.checkConnection();
      }
    });

    window.addEventListener('offline', () => {
      if (this.getMode() === 'online') {
        this.setState('disconnected');
      }
    });
  }

  /**
   * Sinh hoặc lấy Device ID duy nhất bền vững của thiết bị này
   */
  public getDeviceId(): string {
    if (typeof window === 'undefined') return 'server_or_node_device';
    let id = localStorage.getItem('halo_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('halo_device_id', id);
    }
    return id;
  }

  /**
   * Lấy chế độ hoạt động: 'online' | 'offline'
   */
  public getMode(): 'online' | 'offline' {
    if (typeof window === 'undefined') return 'online';
    const saved = localStorage.getItem('halo_network_mode');
    return saved === 'offline' ? 'offline' : 'online';
  }

  /**
   * Đặt chế độ hoạt động
   */
  public setMode(mode: 'online' | 'offline') {
    if (typeof window === 'undefined') return;
    localStorage.setItem('halo_network_mode', mode);
    if (mode === 'offline') {
      this.setState('offline_mode');
    } else {
      this.checkConnection();
    }
  }

  /**
   * Chuyển nhanh sang chế độ Offline (Học offline tức thì)
   */
  public switchToOffline() {
    this.setMode('offline');
  }

  /**
   * Chuyển sang chế độ Online và kiểm tra kết nối
   */
  public switchToOnline() {
    this.setMode('online');
  }

  /**
   * Lấy cấu hình Server hiện tại
   */
  public getServerConfig(): ServerConfig {
    if (typeof window === 'undefined') {
      return {
        host: 'localhost',
        port: '3001',
        baseUrl: 'http://localhost:3001',
        wsUrl: 'ws://localhost:3001',
        isConfigured: true,
      };
    }

    const savedHost = localStorage.getItem('halo_server_host');
    const savedPort = localStorage.getItem('halo_server_port') || '3001';

    let host = savedHost;
    let port = savedPort;
    let isConfigured = !!savedHost;

    if (!host) {
      // Tự động suy luận nếu chạy trên Web Browser
      if (window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        host = window.location.hostname;
        port = window.location.port || '3001';
      } else {
        host = 'localhost';
        port = '3001';
      }
    }

    const rawHost = host || '';
    const isSecure = rawHost.startsWith('https://') || rawHost.includes('trycloudflare.com');
    let cleanHost = rawHost.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let cleanPort = port.trim();

    // Nếu là tên miền Cloudflare hoặc domain HTTPS, mặc định không ép port 3001
    if (isSecure && (cleanPort === '3001' || cleanPort === '443' || cleanPort === '')) {
      cleanPort = '';
    } else if (!isSecure && !cleanPort) {
      cleanPort = '3001';
    }

    if (cleanHost.includes(':')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0];
      cleanPort = parts[1] || cleanPort;
    }

    const scheme = isSecure ? 'https' : 'http';
    const wsScheme = isSecure ? 'wss' : 'ws';
    const baseUrl = cleanPort ? `${scheme}://${cleanHost}:${cleanPort}` : `${scheme}://${cleanHost}`;
    const wsUrl = cleanPort ? `${wsScheme}://${cleanHost}:${cleanPort}` : `${wsScheme}://${cleanHost}`;

    return { host: cleanHost, port: cleanPort, baseUrl, wsUrl, isConfigured };
  }

  /**
   * Lưu cấu hình Server
   */
  public setServerConfig(rawHost: string, rawPort: string) {
    if (typeof window === 'undefined') return;
    let host = rawHost.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let port = rawPort.trim();

    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parts[1] || port;
    }

    if (!port) port = '3001';

    localStorage.setItem('halo_server_host', host);
    localStorage.setItem('halo_server_port', port);

    // Cập nhật lại key tương thích cũ
    localStorage.setItem('halo_old_host_legacy', `${host}:${port}`);
  }

  /**
   * Xóa cấu hình Server
   */
  public clearServerConfig() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('halo_server_host');
    localStorage.removeItem('halo_server_port');
    this.setState('not_configured');
  }

  /**
   * Lấy Base URL để gọi API
   */
  public getBaseUrl(): string {
    return this.getServerConfig().baseUrl;
  }

  /**
   * Lấy WebSocket URL
   */
  public getWsUrl(): string {
    const config = this.getServerConfig();
    const token = typeof window !== 'undefined' ? localStorage.getItem('halo_auth_token') : null;
    return token ? `${config.wsUrl}?token=${encodeURIComponent(token)}` : config.wsUrl;
  }

  /**
   * Lấy trạng thái hiện tại
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Cập nhật trạng thái và thông báo cho các listener
   */
  public setState(next: ConnectionState) {
    if (this.state !== next) {
      this.state = next;
      this.notifyListeners();
    }
  }

  /**
   * Đăng ký nhận thông báo thay đổi trạng thái
   */
  public subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Lỗi listener connectionManager:', err);
      }
    }
  }

  /**
   * Kiểm tra kết nối đến một máy chủ cụ thể (chưa lưu hoặc đã lưu)
   */
  public async testConnection(customHost?: string, customPort?: string): Promise<ConnectionTestResult> {
    let host = customHost;
    let port = customPort;

    if (!host) {
      const cfg = this.getServerConfig();
      host = cfg.host;
      port = cfg.port;
    }

    if (!host) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Địa chỉ Server chưa được cấu hình',
        code: 'INVALID_CONFIG'
      };
    }

    const rawHost = host || '';
    const isSecure = rawHost.startsWith('https://') || rawHost.includes('trycloudflare.com');
    let cleanHost = rawHost.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let cleanPort = port ? port.trim() : '';

    if (isSecure && (cleanPort === '3001' || cleanPort === '443' || cleanPort === '')) {
      cleanPort = '';
    } else if (!isSecure && !cleanPort) {
      cleanPort = '3001';
    }

    if (cleanHost.includes(':')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0];
      cleanPort = parts[1] || cleanPort;
    }

    const scheme = isSecure ? 'https' : 'http';
    const targetUrl = cleanPort ? `${scheme}://${cleanHost}:${cleanPort}` : `${scheme}://${cleanHost}`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      // 1. Thử gọi endpoint kiểm tra kết nối chuyên dụng /api/server/test
      let res: Response;
      try {
        res = await fetch(`${targetUrl}/api/server/test`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
      } catch (fetchErr: any) {
        // Fallback sang /api/health nếu /api/server/test không có
        res = await fetch(`${targetUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
      }

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          message: `Server trả lời mã lỗi HTTP ${res.status}`,
          code: 'NETWORK_ERROR'
        };
      }

      const data = await res.json();

      // Kiểm tra tính tương thích phiên bản API
      const version = data.version || '3.1.0';
      const apiVersion = data.apiVersion || 'v1';

      if (apiVersion && !apiVersion.startsWith('v1')) {
        return {
          success: false,
          latencyMs,
          message: `Phiên bản API (${apiVersion}) không tương thích với ứng dụng (Yêu cầu v1)`,
          serverVersion: version,
          code: 'INCOMPATIBLE_VERSION'
        };
      }

      return {
        success: true,
        latencyMs,
        message: `Kết nối thành công (${latencyMs}ms)`,
        serverVersion: version,
        serverTime: data.serverTime || Date.now(),
        code: 'OK'
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      if (err.name === 'AbortError') {
        return {
          success: false,
          latencyMs,
          message: 'Hết thời gian chờ phản hồi (Quá 6 giây). Vui lòng kiểm tra lại IP/Port.',
          code: 'TIMEOUT'
        };
      }
      return {
        success: false,
        latencyMs,
        message: `Không thể kết nối đến ${targetUrl}. Hãy kiểm tra xem Backend đã khởi động và chung mạng LAN hay chưa.`,
        error: err.message,
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Kiểm tra nhanh tình trạng kết nối Server hiện tại
   */
  public async checkConnection(): Promise<boolean> {
    if (this.getMode() === 'offline') {
      this.setState('offline_mode');
      return false;
    }

    const cfg = this.getServerConfig();
    if (!cfg.isConfigured && !localStorage.getItem('halo_server_host')) {
      this.setState('not_configured');
      return false;
    }

    this.setState('connecting');
    const result = await this.testConnection(cfg.host, cfg.port);

    if (result.success) {
      const token = localStorage.getItem('halo_auth_token');
      if (token) {
        this.setState('authenticated');
      } else {
        this.setState('connected');
      }
      this.backoffDelayMs = 2000; // Reset backoff
      return true;
    } else {
      if (result.code === 'INCOMPATIBLE_VERSION') {
        this.setState('incompatible_version');
      } else {
        this.setState('unreachable');
      }
      return false;
    }
  }

  /**
   * Kiểm tra khi khởi động ứng dụng (Non-blocking)
   */
  public async initiateStartupCheck(): Promise<{ ok: boolean; state: ConnectionState }> {
    if (this.getMode() === 'offline') {
      this.setState('offline_mode');
      return { ok: true, state: 'offline_mode' };
    }

    const isConnected = await this.checkConnection();
    return { ok: isConnected, state: this.state };
  }

  /**
   * Bắt đầu vòng lặp thăm dò kiểm tra kết nối định kỳ (Health check loop)
   */
  public startHealthCheck(intervalMs = 30000) {
    this.stopHealthCheck();
    this.checkInterval = setInterval(() => {
      if (this.getMode() === 'online') {
        this.checkConnection();
      }
    }, intervalMs);
  }

  public stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const connectionManager = new ConnectionManager();
