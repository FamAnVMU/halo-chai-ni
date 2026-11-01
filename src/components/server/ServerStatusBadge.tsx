import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CloudCheck } from 'lucide-react';
import { connectionManager, type ConnectionState } from '../../utils/connectionManager';
import { syncEngine, type SyncEngineStatus } from '../../utils/syncEngine';

interface ServerStatusBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const ServerStatusBadge: React.FC<ServerStatusBadgeProps> = ({ onClick, className = '' }) => {
  const [state, setState] = useState<ConnectionState>(connectionManager.getState());
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: 0,
    lastPulledSeq: 0,
    deviceId: connectionManager.getDeviceId(),
  });

  useEffect(() => {
    const unsubConn = connectionManager.subscribe((nextState) => {
      setState(nextState);
    });
    const unsubSync = syncEngine.subscribe((nextSync) => {
      setSyncStatus(nextSync);
    });

    return () => {
      unsubConn();
      unsubSync();
    };
  }, []);

  // Xác định màu sắc, nhãn và biểu tượng theo trạng thái
  let dotColor = 'bg-emerald-500';
  let badgeLabel = 'Online';
  let IconComponent = Wifi;
  let isSpinning = false;

  switch (state) {
    case 'offline_mode':
      dotColor = 'bg-amber-500';
      badgeLabel = 'Offline';
      IconComponent = WifiOff;
      break;
    case 'connecting':
    case 'authenticating':
      dotColor = 'bg-sky-400';
      badgeLabel = 'Đang kết nối...';
      IconComponent = RefreshCw;
      isSpinning = true;
      break;
    case 'syncing':
      dotColor = 'bg-sky-500';
      badgeLabel = 'Đang đồng bộ...';
      IconComponent = RefreshCw;
      isSpinning = true;
      break;
    case 'synced':
      dotColor = 'bg-emerald-500';
      badgeLabel = 'Đã đồng bộ';
      IconComponent = CloudCheck;
      break;
    case 'sync_error':
      dotColor = 'bg-rose-500';
      badgeLabel = 'Lỗi đồng bộ';
      IconComponent = AlertCircle;
      break;
    case 'unreachable':
    case 'disconnected':
      dotColor = 'bg-rose-500';
      badgeLabel = 'Mất kết nối';
      IconComponent = WifiOff;
      break;
    case 'not_configured':
      dotColor = 'bg-slate-400';
      badgeLabel = 'Chưa cấu hình';
      IconComponent = WifiOff;
      break;
    case 'incompatible_version':
      dotColor = 'bg-rose-600';
      badgeLabel = 'Lỗi phiên bản';
      IconComponent = AlertCircle;
      break;
    case 'authenticated':
    case 'connected':
    default:
      dotColor = 'bg-emerald-500';
      badgeLabel = 'Online';
      IconComponent = Wifi;
      break;
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={`touch-target flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-[#F6FAF2] hover:bg-[#EAF5D5] dark:bg-[#151D14] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] transition-all cursor-pointer ${className}`}
      title={`Trạng thái: ${badgeLabel}. Nhấn để quản lý kết nối và đồng bộ.`}
      aria-label={`Trạng thái máy chủ: ${badgeLabel}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>

      <IconComponent className={`w-3.5 h-3.5 text-[#647560] dark:text-[#889B84] ${isSpinning ? 'animate-spin' : ''}`} />

      <span className="hidden sm:inline text-xs font-medium text-[#263326] dark:text-[#EAF5D5]">
        {badgeLabel}
      </span>

      {syncStatus.pendingCount > 0 && (
        <span
          className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white"
          title={`${syncStatus.pendingCount} thay đổi đang chờ gửi lên server`}
        >
          {syncStatus.pendingCount}
        </span>
      )}
    </button>
  );
};
