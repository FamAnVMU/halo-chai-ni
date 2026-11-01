import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Trash2,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Smartphone,
  Check,
} from 'lucide-react';
import { connectionManager, type ConnectionState, type ConnectionTestResult } from '../utils/connectionManager';
import { syncEngine, type SyncEngineStatus } from '../utils/syncEngine';
import { backendClient } from '../utils/backendClient';
import { db, type ClientSyncQueueItem } from '../db';

interface SyncSettingsViewProps {
  onBack?: () => void;
}

export const SyncSettingsView: React.FC<SyncSettingsViewProps> = ({ onBack }) => {
  const currentCfg = connectionManager.getServerConfig();
  const [host, setHost] = useState(currentCfg.host || 'localhost');
  const [port, setPort] = useState(currentCfg.port || '3001');
  const [connState, setConnState] = useState<ConnectionState>(connectionManager.getState());
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: 0,
    lastPulledSeq: 0,
    deviceId: connectionManager.getDeviceId(),
  });
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<ClientSyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState({ srsCount: 0, vocabCount: 0, historyCount: 0 });
  const [activeTab, setActiveTab] = useState<'server' | 'queue' | 'conflicts'>('server');

  // Nạp dữ liệu ban đầu
  useEffect(() => {
    const unsubConn = connectionManager.subscribe(setConnState);
    const unsubSync = syncEngine.subscribe(setSyncStatus);

    loadQueue();
    loadDbStats();
    loadConflicts();

    return () => {
      unsubConn();
      unsubSync();
    };
  }, []);

  const loadQueue = async () => {
    const items = await syncEngine.getQueueItems(50);
    setQueueItems(items);
  };

  const loadDbStats = async () => {
    try {
      const srsCount = await db.srsCards.count();
      const vocabCount = await db.vocabularies.count();
      const historyCount = await db.syncQueue.count();
      setDbStats({ srsCount, vocabCount, historyCount });
    } catch {
      // ignore
    }
  };

  const loadConflicts = async () => {
    try {
      const res = await backendClient.getSyncConflicts();
      if (res && res.success && Array.isArray(res.conflicts)) {
        setConflicts(res.conflicts);
      }
    } catch {
      // ignore
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await connectionManager.testConnection(host, port);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    connectionManager.setServerConfig(host, port);
    const res = await connectionManager.testConnection(host, port);
    setTestResult(res);
    if (res.success) {
      connectionManager.switchToOnline();
      await connectionManager.checkConnection();
      setSyncMessage('Đã lưu cấu hình và kết nối Server thành công!');
      setTimeout(() => setSyncMessage(null), 3500);
    }
  };

  const handleToggleMode = () => {
    if (connectionManager.getMode() === 'offline') {
      connectionManager.switchToOnline();
      setSyncMessage('Đã chuyển sang chế độ Online (Kết nối Server)');
    } else {
      connectionManager.switchToOffline();
      setSyncMessage('Đã chuyển sang chế độ Offline (Học cục bộ an toàn)');
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleManualSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncEngine.syncAll();
      if (res.success) {
        setSyncMessage(`Đồng bộ hoàn tất: Đã đẩy ${res.pushed} bản ghi, nhận về ${res.pulled} cập nhật.`);
      } else {
        setSyncMessage(`Lỗi đồng bộ: ${res.error || 'Không xác định'}`);
      }
      await loadQueue();
      await loadDbStats();
      await loadConflicts();
    } catch (e: any) {
      setSyncMessage(`Lỗi: ${e.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm('Bạn có chắc chắn muốn dọn dẹp hàng đợi đồng bộ cục bộ?')) {
      await syncEngine.clearQueue();
      await loadQueue();
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'server_wins' | 'client_wins') => {
    try {
      await backendClient.resolveSyncConflict(conflictId, resolution);
      await loadConflicts();
      setSyncMessage(`Đã xử lý xung đột theo phương án: ${resolution}`);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err: any) {
      setSyncMessage(`Lỗi xử lý xung đột: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E3EBDD] dark:border-[#2D3A2C]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="touch-target w-9 h-9 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-center text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] transition-colors"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#263326] dark:text-[#EAF5D5] tracking-tight">
              Kết Nối Server & Đồng Bộ Dữ Liệu
            </h1>
            <p className="text-xs text-[#647560] dark:text-[#889B84]">
              Quản lý phiên học Online / Offline và luồng đồng bộ hai chiều tự động
            </p>
          </div>
        </div>

        {/* Online / Offline Switch Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToggleMode}
            type="button"
            className={`touch-target flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs ${
              connectionManager.getMode() === 'offline'
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-[#A3D635] text-[#263326] hover:brightness-105'
            }`}
          >
            {connectionManager.getMode() === 'offline' ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Chế độ: Offline (Nhấn đổi sang Online)</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span>Chế độ: Online (Nhấn đổi sang Offline)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Message Alert */}
      {syncMessage && (
        <div className="p-3.5 rounded-2xl bg-[#EAF5D5] dark:bg-[#202D1D] border border-[#D7EDB5] dark:border-[#355A26] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C]">
          <div className="text-[11px] font-semibold text-[#647560] dark:text-[#889B84]">Trạng Thái Mạng</div>
          <div className="text-sm font-extrabold text-[#263326] dark:text-[#EAF5D5] mt-1 capitalize flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connState === 'offline_mode'
                  ? 'bg-amber-500'
                  : connState === 'connected' || connState === 'authenticated' || connState === 'synced'
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>{connState.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C]">
          <div className="text-[11px] font-semibold text-[#647560] dark:text-[#889B84]">Chờ Đồng Bộ</div>
          <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {syncStatus.pendingCount} bản ghi
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C]">
          <div className="text-[11px] font-semibold text-[#647560] dark:text-[#889B84]">Seq Kéo Mới Nhất</div>
          <div className="text-base font-extrabold text-[#263326] dark:text-[#EAF5D5] mt-1 font-mono">
            #{syncStatus.lastPulledSeq}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C]">
          <div className="text-[11px] font-semibold text-[#647560] dark:text-[#889B84]">Lần Đồng Bộ Cuối</div>
          <div className="text-xs font-bold text-[#647560] dark:text-[#889B84] mt-1.5">
            {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleTimeString('vi-VN') : 'Chưa có'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E3EBDD] dark:border-[#2D3A2C] gap-2">
        <button
          onClick={() => setActiveTab('server')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'server'
              ? 'border-[#A3D635] text-[#263326] dark:text-[#EAF5D5]'
              : 'border-transparent text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]'
          }`}
        >
          Cấu Hình Server
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'border-[#A3D635] text-[#263326] dark:text-[#EAF5D5]'
              : 'border-transparent text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]'
          }`}
        >
          <span>Hàng Đợi Cục Bộ</span>
          {syncStatus.pendingCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white">
              {syncStatus.pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'border-[#A3D635] text-[#263326] dark:text-[#EAF5D5]'
              : 'border-transparent text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]'
          }`}
        >
          <span>Xung Đột Đồng Bộ</span>
          {conflicts.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white">
              {conflicts.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: SERVER CONFIG */}
      {activeTab === 'server' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
              <span>Thiết Lập Máy Chủ Trung Tâm</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#647560] dark:text-[#889B84] mb-1">
                  Địa chỉ Server (IP hoặc Domain)
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost hoặc 192.168.1.100"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5] focus:outline-none focus:border-[#A3D635]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#647560] dark:text-[#889B84] mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3001"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5] focus:outline-none focus:border-[#A3D635]"
                />
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.serverVersion && (
                    <div className="text-[10px] mt-1 font-mono opacity-80">
                      Version: {testResult.serverVersion} • Độ trễ: {testResult.latencyMs}ms
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="touch-target px-4 py-2 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] hover:bg-[#EAF5D5] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-bold text-[#263326] dark:text-[#EAF5D5] transition-colors"
              >
                {isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối'}
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="touch-target px-4 py-2 rounded-xl bg-[#A3D635] text-[#263326] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs"
              >
                Lưu & Kết Nối Ngay
              </button>

              <button
                type="button"
                onClick={handleManualSyncAll}
                disabled={isSyncing}
                className="touch-target ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#355A26] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Hai Chiều Ngay'}</span>
              </button>
            </div>
          </div>

          {/* Local Storage & Device Info */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
              <span>Dữ Liệu Bộ Nhớ Thiết Bị (Dexie & SQLite)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
                <div className="text-[#647560] dark:text-[#889B84]">Thẻ Flashcard SRS Cục Bộ</div>
                <div className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] mt-1">{dbStats.srsCount} thẻ</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
                <div className="text-[#647560] dark:text-[#889B84]">Kho Từ Vựng Offline</div>
                <div className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] mt-1">{dbStats.vocabCount} mục</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
                <div className="text-[#647560] dark:text-[#889B84]">Mã Thiết Bị (Device ID)</div>
                <div className="text-[11px] font-mono text-[#355A26] dark:text-[#A3D635] mt-1 truncate">
                  {syncStatus.deviceId}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#647560] dark:text-[#889B84]">
              Hiển thị {queueItems.length} sự kiện thay đổi gần nhất trong bộ đệm Dexie
            </div>
            {queueItems.length > 0 && (
              <button
                onClick={handleClearQueue}
                type="button"
                className="flex items-center gap-1 text-xs text-rose-600 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hàng đợi</span>
              </button>
            )}
          </div>

          {queueItems.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#1A2418] rounded-3xl border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs text-[#647560]">
              Hàng đợi trống! Tất cả dữ liệu học tập đã được đồng bộ an toàn lên máy chủ.
            </div>
          ) : (
            <div className="space-y-2">
              {queueItems.map((item) => (
                <div
                  key={item.clientQueueId}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#263326] dark:text-[#EAF5D5] uppercase">
                        {item.entityType}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-[#EAF5D5] text-[#355A26]">
                        {item.action}
                      </span>
                      <span className="text-[10px] text-[#647560]">ID: {item.entityId}</span>
                    </div>
                    <div className="text-[10px] text-[#647560] font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN')} • User: {item.userId}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                      item.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONFLICTS */}
      {activeTab === 'conflicts' && (
        <div className="space-y-3">
          {conflicts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#1A2418] rounded-3xl border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs text-[#647560]">
              Tuyệt vời! Không có xung đột dữ liệu nào phát sinh giữa các thiết bị.
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1A2418] border border-amber-200 dark:border-amber-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      Xung đột: {conf.entity_type} ({conf.entity_id})
                    </span>
                    <span className="text-[11px] text-[#647560]">
                      Lý do: {conf.conflict_reason}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleResolveConflict(conf.id, 'client_wins')}
                      className="px-3 py-1.5 rounded-xl bg-[#A3D635] text-[#263326] font-bold hover:brightness-105 text-xs"
                    >
                      Dùng dữ liệu của thiết bị này
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conf.id, 'server_wins')}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] font-semibold text-xs"
                    >
                      Dùng dữ liệu trên Server
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
