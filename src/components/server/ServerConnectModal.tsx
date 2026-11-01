import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { connectionManager, type ConnectionTestResult, type ConnectionState } from '../../utils/connectionManager';
import { syncEngine } from '../../utils/syncEngine';

interface ServerConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedOffline?: () => void;
  onOpenSyncSettings?: () => void;
}

export const ServerConnectModal: React.FC<ServerConnectModalProps> = ({
  isOpen,
  onClose,
  onProceedOffline,
  onOpenSyncSettings,
}) => {
  const currentConfig = connectionManager.getServerConfig();
  const [host, setHost] = useState(currentConfig.host || 'localhost');
  const [port, setPort] = useState(currentConfig.port || '3001');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(connectionManager.getState());
  const [deviceId] = useState(connectionManager.getDeviceId());

  useEffect(() => {
    if (isOpen) {
      const cfg = connectionManager.getServerConfig();
      setHost(cfg.host || 'localhost');
      setPort(cfg.port || '3001');
      setConnectionState(connectionManager.getState());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await connectionManager.testConnection(host, port);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: err.message || 'Lỗi kiểm tra kết nối',
        code: 'NETWORK_ERROR',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsConnecting(true);
    setTestResult(null);
    try {
      connectionManager.setServerConfig(host, port);
      const test = await connectionManager.testConnection(host, port);
      setTestResult(test);

      if (test.success) {
        connectionManager.switchToOnline();
        await connectionManager.checkConnection();
        // Hẹn giờ kích hoạt đồng bộ
        syncEngine.schedulePush(1000);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleChooseOffline = () => {
    connectionManager.switchToOffline();
    if (onProceedOffline) {
      onProceedOffline();
    }
    onClose();
  };

  const handleClearServer = () => {
    connectionManager.clearServerConfig();
    setHost('localhost');
    setPort('3001');
    setTestResult(null);
    setConnectionState(connectionManager.getState());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A2418] w-full max-w-lg rounded-3xl shadow-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between bg-[#F6FAF2] dark:bg-[#151D14]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Kết Nối Máy Chủ (Server)
              </h2>
              <p className="text-[11px] text-[#647560] dark:text-[#889B84]">
                Đồng bộ tiến độ học tập đa thiết bị và xác thực tài khoản
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="touch-target w-8 h-8 rounded-full flex items-center justify-center text-[#647560] hover:text-[#263326] dark:hover:text-white"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Offline Mode Recommendation Banner */}
          <div className="p-4 rounded-2xl bg-[#EAF5D5]/60 dark:bg-[#202D1D]/70 border border-[#D7EDB5] dark:border-[#355A26] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#263326] dark:text-[#EAF5D5]">
                  Chế độ Học Cục bộ (Offline)
                </h4>
                <p className="text-[11px] text-[#647560] dark:text-[#889B84] mt-0.5">
                  Không cần Server. Toàn bộ từ vựng, ngữ pháp, flashcard SRS và bài đọc lưu trữ an toàn trên máy.
                </p>
              </div>
            </div>
            <button
              onClick={handleChooseOffline}
              type="button"
              className="touch-target w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-[#1A2418] hover:bg-[#F6FAF2] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-bold text-[#263326] dark:text-[#EAF5D5] shadow-xs shrink-0 transition-all text-center"
            >
              Học Offline Ngay
            </button>
          </div>

          {/* Server Config Inputs */}
          <div className="space-y-3 bg-[#F6FAF2] dark:bg-[#151D14] p-4 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="text-xs font-bold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#355A26] dark:text-[#A3D635]" />
              <span>Cấu hình Địa chỉ Máy Chủ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#647560] dark:text-[#889B84] mb-1">
                  Địa chỉ Server (IP hoặc Domain)
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Ví dụ: 192.168.1.100 hoặc api.domain.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5] focus:outline-none focus:border-[#A3D635]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#647560] dark:text-[#889B84] mb-1">
                  Cổng (Port)
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3001"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5] focus:outline-none focus:border-[#A3D635]"
                />
              </div>
            </div>

            <div className="text-[11px] text-[#647560] dark:text-[#889B84]">
              Đường dẫn đầy đủ: <code className="font-mono text-[#355A26] dark:text-[#A3D635]">http://{host.trim()}:{port.trim()}</code>
            </div>

            {/* Test connection result display */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.success ? 'Kiểm tra thành công!' : 'Kết nối thất bại'}
                  </div>
                  <div className="text-[11px] mt-0.5">{testResult.message}</div>
                  {testResult.serverVersion && (
                    <div className="text-[10px] mt-1 font-mono opacity-80">
                      Phiên bản Server: {testResult.serverVersion} • Độ trễ: {testResult.latencyMs}ms
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isConnecting}
                className="touch-target flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#1A2418] hover:bg-[#EAF5D5] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-amber-500' : 'text-amber-600'}`} />
                <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={isTesting || isConnecting}
                className="touch-target flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#A3D635] text-[#263326] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs disabled:opacity-50"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Đang kết nối...' : 'Lưu & Kết Nối Server'}</span>
              </button>
            </div>
          </div>

          {/* Device and Sync Link */}
          <div className="flex items-center justify-between text-[11px] text-[#647560] dark:text-[#889B84] pt-1 px-1">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mã thiết bị: <code className="font-mono text-[10px]">{deviceId}</code></span>
            </div>

            {onOpenSyncSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSyncSettings();
                }}
                className="font-semibold text-[#355A26] dark:text-[#A3D635] hover:underline flex items-center gap-1"
              >
                <span>Cài đặt đồng bộ chi tiết</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E3EBDD] dark:border-[#2D3A2C] bg-[#F6FAF2] dark:bg-[#151D14] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClearServer}
            className="text-[11px] text-[#647560] hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            Đặt lại mặc định
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
