/**
 * Halo Chinese - Data Path Manager
 * Quản lý tập trung toàn bộ đường dẫn dữ liệu người dùng, tách biệt hoàn toàn
 * giữa thư mục cài đặt ứng dụng (program) và thư mục dữ liệu cá nhân (user data).
 * 
 * Đảm bảo:
 * - Dữ liệu không bị xóa khi nâng cấp phiên bản hoặc gỡ cài đặt.
 * - Tự động phát hiện và di chuyển (migration) dữ liệu cũ từ legacy ./data sang LocalAppData.
 * - Độc lập hoàn toàn với process.cwd() và thư mục chạy.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';

export interface StorageStats {
  userDataDir: string;
  databasePath: string;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  backupDir: string;
  backupSizeBytes: number;
  backupCount: number;
  audioDir: string;
  audioSizeBytes: number;
  logsDir: string;
  logsSizeBytes: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  isLegacyMigrated: boolean;
}

export class DataPathManager {
  private static instance: DataPathManager;
  private readonly userDataDir: string;
  private readonly databaseDir: string;
  private readonly databasePath: string;
  private readonly backupDir: string;
  private readonly audioDir: string;
  private readonly attachmentsDir: string;
  private readonly logsDir: string;
  private readonly configDir: string;
  private isMigratedFromLegacy = false;

  private constructor() {
    this.userDataDir = this.resolveUserDataDirectory();
    this.databaseDir = path.join(this.userDataDir, 'database');
    this.databasePath = process.env.DATABASE_PATH || path.join(this.databaseDir, 'halo_chinese.db');
    this.backupDir = path.join(this.userDataDir, 'backups');
    this.audioDir = path.join(this.userDataDir, 'audio');
    this.attachmentsDir = path.join(this.userDataDir, 'attachments');
    this.logsDir = path.join(this.userDataDir, 'logs');
    this.configDir = path.join(this.userDataDir, 'config');

    this.ensureDirectories();
    this.autoMigrateLegacyData();
  }

  public static getInstance(): DataPathManager {
    if (!DataPathManager.instance) {
      DataPathManager.instance = new DataPathManager();
    }
    return DataPathManager.instance;
  }

  /**
   * Xác định thư mục dữ liệu người dùng theo chuẩn hệ điều hành
   */
  private resolveUserDataDirectory(): string {
    // 1. Cho phép cấu hình qua biến môi trường
    if (process.env.HALO_DATA_DIR && process.env.HALO_DATA_DIR.trim()) {
      return path.resolve(process.env.HALO_DATA_DIR.trim());
    }

    const platform = process.platform;
    const home = os.homedir();

    // 2. Windows: %LOCALAPPDATA%\HaloChinese (hoặc %APPDATA%\HaloChinese)
    if (platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
      return path.join(localAppData, 'HaloChinese');
    }

    // 3. macOS: ~/Library/Application Support/HaloChinese
    if (platform === 'darwin') {
      return path.join(home, 'Library', 'Application Support', 'HaloChinese');
    }

    // 4. Linux / Unix: $XDG_DATA_HOME/HaloChinese hoặc ~/.local/share/HaloChinese
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
    return path.join(xdgDataHome, 'HaloChinese');
  }

  /**
   * Khởi tạo cây thư mục người dùng nếu chưa có
   */
  public ensureDirectories(): void {
    const dirs = [
      this.userDataDir,
      this.databaseDir,
      this.backupDir,
      this.audioDir,
      this.attachmentsDir,
      this.logsDir,
      this.configDir,
    ];

    for (const d of dirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }
  }

  /**
   * Tự động kiểm tra và bảo tồn dữ liệu cũ:
   * Nếu Database chưa có ở LocalAppData nhưng có file cũ tại ./data/halo_chinese.db,
   * tự động sao chép an toàn sang thư mục người dùng mới mà không làm mất dữ liệu.
   */
  private autoMigrateLegacyData(): void {
    try {
      // Nếu database đích đã tồn tại thì không cần di chuyển
      if (fs.existsSync(this.databasePath)) {
        return;
      }

      // Kiểm tra vị trí cũ tại thư mục cài đặt ./data/halo_chinese.db
      const legacyPath = path.resolve(process.cwd(), 'data', 'halo_chinese.db');
      if (fs.existsSync(legacyPath)) {
        console.log(`[DataPathManager] Phát hiện Database cũ tại: ${legacyPath}`);
        console.log(`[DataPathManager] Đang chuyển giao an toàn sang vị trí người dùng: ${this.databasePath}`);

        // Đảm bảo thư mục đích tồn tại
        fs.mkdirSync(this.databaseDir, { recursive: true });

        // Copy file chính
        fs.copyFileSync(legacyPath, this.databasePath);

        // Copy file WAL và SHM nếu có
        const legacyWal = `${legacyPath}-wal`;
        const legacyShm = `${legacyPath}-shm`;
        if (fs.existsSync(legacyWal)) {
          fs.copyFileSync(legacyWal, `${this.databasePath}-wal`);
        }
        if (fs.existsSync(legacyShm)) {
          fs.copyFileSync(legacyShm, `${this.databasePath}-shm`);
        }

        this.isMigratedFromLegacy = true;
        console.log('[DataPathManager] Chuyển giao dữ liệu cũ sang UserData thành công 100%!');
      }
    } catch (err: any) {
      console.error('[DataPathManager] Lỗi chuyển giao dữ liệu cũ:', err.message);
    }
  }

  public getUserDataDirectory(): string {
    return this.userDataDir;
  }

  public getDatabaseDirectory(): string {
    return this.databaseDir;
  }

  public getDatabasePath(): string {
    return this.databasePath;
  }

  public getBackupDirectory(): string {
    return this.backupDir;
  }

  public getAudioDirectory(): string {
    return this.audioDir;
  }

  public getAttachmentsDirectory(): string {
    return this.attachmentsDir;
  }

  public getLogsDirectory(): string {
    return this.logsDir;
  }

  public getConfigDirectory(): string {
    return this.configDir;
  }

  public isLegacyDataMigrated(): boolean {
    return this.isMigratedFromLegacy;
  }

  /**
   * Tính toán dung lượng lưu trữ các thành phần
   */
  public getStorageStats(): StorageStats {
    let dbSize = 0;
    try {
      if (fs.existsSync(this.databasePath)) {
        dbSize += fs.statSync(this.databasePath).size;
      }
      if (fs.existsSync(`${this.databasePath}-wal`)) {
        dbSize += fs.statSync(`${this.databasePath}-wal`).size;
      }
    } catch {}

    const getDirSize = (dir: string): { size: number; count: number } => {
      let total = 0;
      let count = 0;
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            const p = path.join(dir, f);
            const stat = fs.statSync(p);
            if (stat.isFile()) {
              total += stat.size;
              count++;
            }
          }
        }
      } catch {}
      return { size: total, count };
    };

    const backups = getDirSize(this.backupDir);
    const audio = getDirSize(this.audioDir);
    const logs = getDirSize(this.logsDir);
    const total = dbSize + backups.size + audio.size + logs.size;

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      userDataDir: this.userDataDir,
      databasePath: this.databasePath,
      databaseSizeBytes: dbSize,
      databaseSizeFormatted: formatBytes(dbSize),
      backupDir: this.backupDir,
      backupSizeBytes: backups.size,
      backupCount: backups.count,
      audioDir: this.audioDir,
      audioSizeBytes: audio.size,
      logsDir: this.logsDir,
      logsSizeBytes: logs.size,
      totalSizeBytes: total,
      totalSizeFormatted: formatBytes(total),
      isLegacyMigrated: this.isMigratedFromLegacy,
    };
  }
}

export const dataPathManager = DataPathManager.getInstance();
