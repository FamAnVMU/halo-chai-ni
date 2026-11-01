/**
 * Halo Chinese - Database Backup & Recovery Service
 * Quản lý sao lưu an toàn (SQLite Online Backup API), kiểm tra tính toàn vẹn (PRAGMA integrity_check),
 * xoay vòng snapshot và phục hồi dữ liệu người dùng khi cập nhật phiên bản hoặc gặp sự cố.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from './db';
import { dataPathManager } from './dataPathManager';

export interface BackupManifest {
  backupId: string;
  filename: string;
  createdAt: number;
  createdAtIso: string;
  appVersion: string;
  schemaVersion: number;
  databaseSizeBytes: number;
  checksumSha256: string;
  integrityStatus: string;
  triggerReason: 'pre_migration' | 'manual' | 'scheduled' | 'pre_restore';
  notes?: string;
}

export class BackupService {
  private static instance: BackupService;
  private readonly maxBackupsToKeep = 10;

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Tính mã băm SHA-256 của file để xác thực tính toàn vẹn
   */
  public calculateChecksum(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Kiểm tra tính toàn vẹn của Database SQLite bằng PRAGMA integrity_check
   */
  public verifyDatabaseIntegrity(): { ok: boolean; details: string[] } {
    try {
      const rows = db.pragma('integrity_check') as any[];
      if (Array.isArray(rows) && rows.length > 0 && rows[0].integrity_check === 'ok') {
        return { ok: true, details: ['ok'] };
      }
      return { ok: false, details: rows.map(r => String(r.integrity_check || r)) };
    } catch (err: any) {
      return { ok: false, details: [err.message] };
    }
  }

  /**
   * Tạo bản sao lưu an toàn sử dụng SQLite Online Backup API
   */
  public async createBackup(
    reason: 'pre_migration' | 'manual' | 'scheduled' | 'pre_restore' = 'manual',
    appVersion = '3.2.0',
    schemaVersion = 4,
    notes?: string
  ): Promise<BackupManifest> {
    const backupDir = dataPathManager.getBackupDirectory();
    fs.mkdirSync(backupDir, { recursive: true });

    // Kiểm tra tính toàn vẹn trước khi sao lưu
    const integrityBefore = this.verifyDatabaseIntegrity();
    const integrityStatus = integrityBefore.ok ? 'passed' : 'corrupted';

    const timestamp = Date.now();
    const backupId = `backup_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const backupFilename = `${backupId}.db`;
    const targetFilePath = path.join(backupDir, backupFilename);
    const manifestPath = path.join(backupDir, `${backupId}.manifest.json`);

    // Thực thi SQLite Online Backup an toàn (xử lý đúng WAL mode)
    await db.backup(targetFilePath);

    // Tính kích thước và SHA-256 checksum
    const stat = fs.statSync(targetFilePath);
    const checksum = this.calculateChecksum(targetFilePath);

    const manifest: BackupManifest = {
      backupId,
      filename: backupFilename,
      createdAt: timestamp,
      createdAtIso: new Date(timestamp).toISOString(),
      appVersion,
      schemaVersion,
      databaseSizeBytes: stat.size,
      checksumSha256: checksum,
      integrityStatus,
      triggerReason: reason,
      notes: notes || `Sao lưu ${reason}`
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Tự động xoay vòng xóa các bản sao lưu cũ vượt quá số lượng tối đa
    this.rotateBackups();

    return manifest;
  }

  /**
   * Lấy danh sách các bản sao lưu hiện có
   */
  public listBackups(): BackupManifest[] {
    const backupDir = dataPathManager.getBackupDirectory();
    if (!fs.existsSync(backupDir)) return [];

    const files = fs.readdirSync(backupDir);
    const manifests: BackupManifest[] = [];

    for (const f of files) {
      if (f.endsWith('.manifest.json')) {
        try {
          const content = fs.readFileSync(path.join(backupDir, f), 'utf-8');
          const parsed = JSON.parse(content) as BackupManifest;
          manifests.push(parsed);
        } catch {
          // ignore corrupted manifest
        }
      }
    }

    // Sắp xếp bản sao lưu mới nhất lên đầu
    manifests.sort((a, b) => b.createdAt - a.createdAt);
    return manifests;
  }

  /**
   * Khôi phục Database từ một bản sao lưu cụ thể
   */
  public async restoreFromBackup(backupId: string): Promise<{ success: boolean; message: string; error?: string }> {
    const backupDir = dataPathManager.getBackupDirectory();
    const dbPath = dataPathManager.getDatabasePath();
    const backupFilePath = path.join(backupDir, `${backupId}.db`);
    const manifestPath = path.join(backupDir, `${backupId}.manifest.json`);

    if (!fs.existsSync(backupFilePath)) {
      return { success: false, message: 'Tập tin sao lưu không tồn tại', error: 'BACKUP_NOT_FOUND' };
    }

    // 1. Kiểm tra checksum file sao lưu so với manifest
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as BackupManifest;
        const currentChecksum = this.calculateChecksum(backupFilePath);
        if (manifest.checksumSha256 && manifest.checksumSha256 !== currentChecksum) {
          return {
            success: false,
            message: 'Bản sao lưu bị sai lệch mã băm kiểm tra (Checksum Mismatch). Hủy thao tác để đảm bảo an toàn.',
            error: 'CHECKSUM_MISMATCH'
          };
        }
      } catch (err: any) {
        console.warn('[BackupService] Không thể đọc manifest:', err.message);
      }
    }

    // 2. TẠO BẢN SAO LƯU DỰ PHÒNG CỦA TRẠNG THÁI HIỆN TẠI (Safety Rollback)
    try {
      await this.createBackup('pre_restore', '3.2.0', 4, `Sao lưu an toàn trước khi khôi phục bản ${backupId}`);
    } catch (e: any) {
      console.warn('[BackupService] Cảnh báo tạo pre-restore backup:', e.message);
    }

    // 3. Tiến hành khôi phục an toàn bằng SQLite Online Backup API từ file backup
    try {
      const Database = (await import('better-sqlite3')).default;
      const backupDb = new Database(backupFilePath, { readonly: true });
      await backupDb.backup(dbPath);
      backupDb.close();

      // Kiểm tra tính toàn vẹn sau khi khôi phục
      const integrityAfter = this.verifyDatabaseIntegrity();
      if (!integrityAfter.ok) {
        throw new Error(`Database sau khôi phục không vượt qua kiểm tra toàn vẹn: ${integrityAfter.details.join(', ')}`);
      }

      return {
        success: true,
        message: `Khôi phục thành công từ bản sao lưu ${backupId}. Tính toàn vẹn SQLite: OK.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Lỗi khôi phục cơ sở dữ liệu: ${err.message}`,
        error: err.message
      };
    }
  }

  /**
   * Xoay vòng các bản sao lưu cũ, chỉ giữ lại số lượng bản gần nhất
   */
  private rotateBackups(): void {
    try {
      const backups = this.listBackups();
      if (backups.length > this.maxBackupsToKeep) {
        const toDelete = backups.slice(this.maxBackupsToKeep);
        const backupDir = dataPathManager.getBackupDirectory();

        for (const b of toDelete) {
          const dbFile = path.join(backupDir, b.filename);
          const manifestFile = path.join(backupDir, `${b.backupId}.manifest.json`);
          if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
          if (fs.existsSync(manifestFile)) fs.unlinkSync(manifestFile);
        }
      }
    } catch (err: any) {
      console.error('[BackupService] Lỗi xoay vòng sao lưu:', err.message);
    }
  }
}

export const backupService = BackupService.getInstance();
