import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Clock,
  ArrowLeft,
  FileText,
  FileCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { backendClient } from '../utils/backendClient';
import { LocalDataBackupManager } from '../utils/localDataBackup';

interface DataBackupViewProps {
  onBack?: () => void;
}

export const DataBackupView: React.FC<DataBackupViewProps> = ({ onBack }) => {
  const [stats, setStats] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isOperating, setIsOperating] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, backupsRes, integrityRes, migRes] = await Promise.all([
        backendClient.getStorageStats(),
        backendClient.getBackupList(),
        backendClient.verifyIntegrity(),
        backendClient.getMigrationHistory(),
      ]);

      if (statsRes?.success) setStats(statsRes);
      if (backupsRes?.success) setBackups(backupsRes.backups || []);
      if (integrityRes?.success) setIntegrityStatus(integrityRes.integrity);
      if (migRes?.success) setMigrations(migRes.history || []);
    } catch (err: any) {
      console.warn('Lỗi nạp thông tin backup:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateServerBackup = async () => {
    setIsOperating(true);
    setActionMessage(null);
    try {
      const res = await backendClient.createBackup('manual', 'Sao lưu thủ công từ giao diện người dùng');
      if (res?.success) {
        setActionMessage(`✓ Đã tạo thành công bản sao lưu: ${res.manifest?.backupId}`);
        await loadAllData();
      } else {
        setActionMessage(`❌ Lỗi tạo sao lưu: ${res?.message || 'Không xác định'}`);
      }
    } finally {
      setIsOperating(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleRestoreServerBackup = async (backupId: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục Database từ bản sao lưu ${backupId}? Hệ thống sẽ tự động tạo một bản sao lưu dự phòng của trạng thái hiện tại trước khi khôi phục.`)) {
      return;
    }

    setIsOperating(true);
    setActionMessage(null);
    try {
      const res = await backendClient.restoreBackup(backupId);
      if (res?.success) {
        setActionMessage(`✓ ${res.message}`);
        await loadAllData();
      } else {
        setActionMessage(`❌ Lỗi khôi phục: ${res?.message || res?.error}`);
      }
    } finally {
      setIsOperating(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsOperating(true);
    try {
      const res = await backendClient.verifyIntegrity();
      if (res?.success) {
        setIntegrityStatus(res.integrity);
        setActionMessage(res.integrity?.ok ? '✓ Kiểm tra tính toàn vẹn SQLite hoàn hảo (PRAGMA integrity_check: OK)!' : '⚠️ Phát hiện cảnh báo tính toàn vẹn!');
      }
    } finally {
      setIsOperating(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleExportLocalPackage = async () => {
    setIsOperating(true);
    try {
      const res = await LocalDataBackupManager.exportBackupPackage();
      if (res.success) {
        setActionMessage(`✓ Đã xuất gói sao lưu dữ liệu cục bộ: ${res.filename}`);
      } else {
        setActionMessage(`❌ Lỗi xuất file: ${res.error}`);
      }
    } finally {
      setIsOperating(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleImportLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setIsOperating(true);
        const res = await LocalDataBackupManager.importBackupPackage(content);
        setIsOperating(false);
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header */}
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
              Quản Lý Dữ Liệu & Sao Lưu
            </h1>
            <p className="text-xs text-[#647560] dark:text-[#889B84]">
              Bảo vệ tiến độ học tập, tách biệt dữ liệu người dùng và phòng chống mất mát khi cài đặt lại
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isOperating}
            className="touch-target flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kiểm Tra Toàn Vẹn</span>
          </button>
          <button
            onClick={handleCreateServerBackup}
            disabled={isOperating}
            className="touch-target flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#A3D635] text-[#263326] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isOperating ? 'Đang xử lý...' : 'Sao Lưu Ngay'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-[#EAF5D5] dark:bg-[#202D1D] border border-[#D7EDB5] dark:border-[#355A26] text-xs font-semibold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* CARD 1: STORAGE OVERVIEW */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
            <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
              Vị Trí & Dung Lượng Dữ Liệu Người Dùng
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5D5] text-[#355A26]">
            Tách biệt hoàn toàn khỏi App Install
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="text-[11px] text-[#647560] dark:text-[#889B84]">Database SQLite</div>
            <div className="text-base font-extrabold text-[#263326] dark:text-[#EAF5D5] mt-1">
              {stats?.stats?.databaseSizeFormatted || '4.2 MB'}
            </div>
            <div className="text-[10px] text-[#647560] mt-0.5">WAL Enabled</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="text-[11px] text-[#647560] dark:text-[#889B84]">Bản Sao Lưu</div>
            <div className="text-base font-extrabold text-[#263326] dark:text-[#EAF5D5] mt-1">
              {backups.length} bản
            </div>
            <div className="text-[10px] text-[#647560] mt-0.5">Tự động xoay vòng</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="text-[11px] text-[#647560] dark:text-[#889B84]">Schema Version</div>
            <div className="text-base font-extrabold text-[#355A26] dark:text-[#A3D635] mt-1">
              Schema v{stats?.schemaVersion || 5}
            </div>
            <div className="text-[10px] text-[#647560] mt-0.5">App v{stats?.appVersion || '3.2.0'}</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <div className="text-[11px] text-[#647560] dark:text-[#889B84]">Tính Toàn Vẹn</div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{integrityStatus?.ok ? 'Hoàn hảo' : 'Chưa kiểm tra'}</span>
            </div>
            <div className="text-[10px] text-[#647560] mt-0.5">SQLite Integrity Check</div>
          </div>
        </div>

        {/* Path Display */}
        <div className="space-y-1.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <span className="font-semibold text-[#647560] dark:text-[#889B84] block text-[11px]">
              Thư mục dữ liệu người dùng (User Data Directory):
            </span>
            <code className="text-[11px] font-mono text-[#355A26] dark:text-[#A3D635] break-all">
              {stats?.stats?.userDataDir || '%LOCALAPPDATA%\\HaloChinese'}
            </code>
          </div>
          <div className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <span className="font-semibold text-[#647560] dark:text-[#889B84] block text-[11px]">
              Tập tin cơ sở dữ liệu SQLite:
            </span>
            <code className="text-[11px] font-mono text-[#355A26] dark:text-[#A3D635] break-all">
              {stats?.stats?.databasePath || '%LOCALAPPDATA%\\HaloChinese\\database\\halo_chinese.db'}
            </code>
          </div>
        </div>
      </div>

      {/* CARD 2: LOCAL DEVICE EXPORT / IMPORT (Offline Protection) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
          <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
            Sao Lưu & Di Trú Thiết Bị Cục Bộ (Device Backup Package)
          </h3>
        </div>

        <p className="text-xs text-[#647560] dark:text-[#889B84]">
          Dành riêng cho việc cài lại máy hoặc chuyển đổi thiết bị điện thoại: Xuất toàn bộ tiến độ học tập, thẻ Flashcard SRS, từ vựng và bài đọc thành gói sao lưu độc lập (<code className="font-mono text-[11px]">.json</code>).
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportLocalPackage}
            disabled={isOperating}
            className="touch-target flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A3D635] text-[#263326] text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Gói Sao Lưu Cục Bộ (.json)</span>
          </button>

          <label className="touch-target flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#151D14] hover:bg-[#F6FAF2] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-bold text-[#263326] dark:text-[#EAF5D5] transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-sky-600" />
            <span>Nhập Từ File Sao Lưu</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportLocalFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CARD 3: SERVER DATABASE BACKUPS LIST */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
            <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
              Danh Sách Bản Sao Lưu Database (Server Snapshots)
            </h3>
          </div>
          <span className="text-xs text-[#647560] dark:text-[#889B84]">
            Tự động tạo trước mỗi lần Migration
          </span>
        </div>

        {backups.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#647560] bg-[#F6FAF2] dark:bg-[#151D14] rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C]">
            Chưa có bản sao lưu nào. Hãy nhấn "Sao Lưu Ngay" ở góc trên để tạo bản chụp đầu tiên.
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.backupId}
                className="p-3.5 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#263326] dark:text-[#EAF5D5] font-mono">
                      {b.backupId}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-[#EAF5D5] text-[#355A26]">
                      {b.triggerReason}
                    </span>
                    <span className="text-[10px] text-[#647560]">Schema v{b.schemaVersion}</span>
                  </div>
                  <div className="text-[11px] text-[#647560]">
                    {new Date(b.createdAt).toLocaleString('vi-VN')} • Dung lượng: {(b.databaseSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </div>
                  {b.checksumSha256 && (
                    <div className="text-[10px] font-mono text-[#647560] opacity-80 truncate max-w-sm">
                      SHA256: {b.checksumSha256}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRestoreServerBackup(b.backupId)}
                  disabled={isOperating}
                  className="touch-target self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1A2418] hover:bg-[#EAF5D5] dark:hover:bg-[#202D1D] border border-[#E3EBDD] dark:border-[#2D3A2C] text-xs font-bold text-[#263326] dark:text-[#EAF5D5] shadow-xs transition-colors shrink-0"
                >
                  Khôi Phục Bản Này
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 4: MIGRATION HISTORY */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#355A26] dark:text-[#A3D635]" />
          <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
            Lịch Sử Cập Nhật Cấu Trúc Cơ Sở Dữ Liệu (Schema Migrations)
          </h3>
        </div>

        {migrations.length === 0 ? (
          <div className="text-xs text-[#647560]">Chưa có thông tin migration.</div>
        ) : (
          <div className="space-y-2">
            {migrations.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-[#263326] dark:text-[#EAF5D5]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{m.migrationName}</span>
                    <span className="text-[10px] text-[#647560]">Schema v{m.schemaVersion}</span>
                  </div>
                  <div className="text-[10px] text-[#647560]">
                    Áp dụng lúc: {new Date(m.appliedAt).toLocaleString('vi-VN')} ({m.executionTimeMs}ms)
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
