/**
 * Halo Chinese - Database Migration & Schema Version Manager
 * Quản lý phiên bản cấu trúc cơ sở dữ liệu SQLite, tự động sao lưu trước khi migration,
 * thực thi migration có kiểm soát trong transaction và bảo vệ dữ liệu chống downgrade mù quáng.
 */

import { db } from './db';
import { backupService } from './backupService';

export const CURRENT_SCHEMA_VERSION = 5;
export const CURRENT_APP_VERSION = '3.2.0';

export interface MigrationRecord {
  id: number;
  migrationName: string;
  schemaVersion: number;
  appVersion: string;
  appliedAt: number;
  status: 'success' | 'failed';
  executionTimeMs: number;
}

export interface MigrationStep {
  name: string;
  targetSchemaVersion: number;
  up: (dbInstance: typeof db) => void;
}

export class MigrationManager {
  private static instance: MigrationManager;

  private constructor() {
    this.initMigrationTable();
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Khởi tạo bảng lưu nhật ký migration nếu chưa có
   */
  private initMigrationTable(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        schema_version INTEGER NOT NULL,
        app_version TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'success', 'failed'
        execution_time_ms INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_migration_schema ON migration_history(schema_version);
    `);
  }

  /**
   * Lấy số phiên bản Schema hiện tại của Database
   */
  public getCurrentDatabaseSchemaVersion(): number {
    try {
      const row = db.prepare("SELECT MAX(schema_version) as maxVersion FROM migration_history WHERE status = 'success'").get() as any;
      return row?.maxVersion || 1;
    } catch {
      return 1;
    }
  }

  /**
   * Lấy toàn bộ lịch sử migrations đã chạy
   */
  public getMigrationHistory(): MigrationRecord[] {
    try {
      const rows = db.prepare('SELECT * FROM migration_history ORDER BY id ASC').all() as any[];
      return rows.map(r => ({
        id: r.id,
        migrationName: r.migration_name,
        schemaVersion: r.schema_version,
        appVersion: r.app_version,
        appliedAt: r.applied_at,
        status: r.status,
        executionTimeMs: r.execution_time_ms,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Danh sách các bước migration tuần tự của hệ thống
   */
  private getMigrationSteps(): MigrationStep[] {
    return [
      {
        name: '001_core_and_auth_schema',
        targetSchemaVersion: 1,
        up: (database) => {
          // Bảng người dùng và phiên đăng nhập
          database.exec(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'learner',
              display_name TEXT NOT NULL,
              must_change_password INTEGER DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'active',
              last_login_at INTEGER,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              expires_at INTEGER NOT NULL,
              created_at INTEGER NOT NULL,
              ip_address TEXT,
              user_agent TEXT
            );
          `);
        }
      },
      {
        name: '002_unified_learning_memory',
        targetSchemaVersion: 2,
        up: (database) => {
          // Bảng tri thức và bằng chứng học tập
          database.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_registry (
              id TEXT PRIMARY KEY,
              category TEXT NOT NULL,
              canonical_key TEXT NOT NULL,
              sub_category TEXT,
              hsk_level INTEGER NOT NULL,
              status TEXT DEFAULT 'active'
            );
            CREATE TABLE IF NOT EXISTS learner_evidence_ledger (
              id TEXT PRIMARY KEY,
              target_type TEXT NOT NULL,
              target_key TEXT NOT NULL,
              claim_summary TEXT NOT NULL,
              evidence_quote TEXT NOT NULL,
              source_activity TEXT NOT NULL,
              source_session_id TEXT,
              observation_count INTEGER DEFAULT 1,
              confidence_score REAL DEFAULT 0.8,
              mastery_stage TEXT DEFAULT 'practicing',
              status TEXT DEFAULT 'active',
              last_observed_at INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            );
          `);
        }
      },
      {
        name: '003_srs_and_placement_system',
        targetSchemaVersion: 3,
        up: (database) => {
          database.exec(`
            CREATE TABLE IF NOT EXISTS srs_items (
              id TEXT PRIMARY KEY,
              item_type TEXT NOT NULL,
              reference_id TEXT NOT NULL,
              unique_key TEXT NOT NULL,
              hsk_level INTEGER NOT NULL,
              prompt_zh TEXT NOT NULL,
              prompt_pinyin TEXT,
              prompt_vi TEXT,
              extra_data_json TEXT,
              ease_factor REAL DEFAULT 2.5,
              interval_days INTEGER DEFAULT 0,
              repetition_count INTEGER DEFAULT 0,
              streak INTEGER DEFAULT 0,
              lapses INTEGER DEFAULT 0,
              last_reviewed_at INTEGER,
              next_review_at INTEGER NOT NULL,
              mastery_level TEXT DEFAULT 'learning',
              status TEXT DEFAULT 'active',
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );
          `);
        }
      },
      {
        name: '004_two_way_sync_and_changelog',
        targetSchemaVersion: 4,
        up: (database) => {
          database.exec(`
            CREATE TABLE IF NOT EXISTS sync_changelog (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              device_id TEXT NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              action TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              idempotency_key TEXT UNIQUE NOT NULL,
              version INTEGER DEFAULT 1,
              timestamp INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sync_devices (
              device_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              device_name TEXT,
              platform TEXT,
              last_sync_seq INTEGER DEFAULT 0,
              last_sync_at INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sync_conflicts (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              device_id TEXT NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id TEXT NOT NULL,
              client_payload_json TEXT NOT NULL,
              server_payload_json TEXT NOT NULL,
              conflict_reason TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              resolution_notes TEXT,
              created_at INTEGER NOT NULL,
              resolved_at INTEGER
            );
          `);
        }
      },
      {
        name: '005_data_protection_and_tombstones',
        targetSchemaVersion: 5,
        up: (database) => {
          const addCol = (table: string, col: string, def: string) => {
            try {
              database.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
            } catch {
              // đã tồn tại
            }
          };

          addCol('srs_items', 'is_deleted', 'INTEGER DEFAULT 0');
          addCol('srs_items', 'deleted_at', 'INTEGER');
          addCol('srs_items', 'user_id', "TEXT DEFAULT 'admin'");
          addCol('vocabulary_memory', 'is_deleted', 'INTEGER DEFAULT 0');
          addCol('vocabulary_memory', 'deleted_at', 'INTEGER');
          addCol('vocabulary_memory', 'user_id', "TEXT DEFAULT 'admin'");
          addCol('grammar_memory', 'is_deleted', 'INTEGER DEFAULT 0');
          addCol('grammar_memory', 'deleted_at', 'INTEGER');
          addCol('grammar_memory', 'user_id', "TEXT DEFAULT 'admin'");
          addCol('learning_errors', 'is_deleted', 'INTEGER DEFAULT 0');
          addCol('learning_errors', 'deleted_at', 'INTEGER');
          addCol('learning_errors', 'user_id', "TEXT DEFAULT 'admin'");
          addCol('learner_evidence_ledger', 'user_id', "TEXT DEFAULT 'admin'");
          addCol('chat_sessions', 'is_deleted', 'INTEGER DEFAULT 0');
          addCol('chat_sessions', 'user_id', "TEXT DEFAULT 'admin'");
        }
      }
    ];
  }

  /**
   * Kiểm tra tính tương thích và thực thi các migrations còn thiếu
   */
  public async runPendingMigrations(): Promise<{
    success: boolean;
    executedCount: number;
    currentVersion: number;
    error?: string;
  }> {
    const dbSchemaVersion = this.getCurrentDatabaseSchemaVersion();

    // 1. KIỂM TRA BẢO VỆ CHỐNG DOWNGRADE MÙ QUÁNG
    // Nếu Database có Schema Version cao hơn phiên bản ứng dụng hiện tại hỗ trợ
    if (dbSchemaVersion > CURRENT_SCHEMA_VERSION) {
      const msg = `CẢNH BÁO NGUY HIỂM: Database đang ở Schema Version v${dbSchemaVersion}, cao hơn phiên bản ứng dụng hỗ trợ (v${CURRENT_SCHEMA_VERSION}). Ứng dụng từ chối ghi đè để bảo vệ toàn vẹn dữ liệu.`;
      console.error(`[MigrationManager] ${msg}`);
      return {
        success: false,
        executedCount: 0,
        currentVersion: dbSchemaVersion,
        error: msg
      };
    }

    const steps = this.getMigrationSteps();
    const appliedNames = new Set(
      (db.prepare("SELECT migration_name FROM migration_history WHERE status = 'success'").all() as any[]).map(
        r => r.migration_name
      )
    );

    const pending = steps.filter(s => !appliedNames.has(s.name));
    if (pending.length === 0) {
      return { success: true, executedCount: 0, currentVersion: dbSchemaVersion };
    }

    console.log(`[MigrationManager] Tìm thấy ${pending.length} bước migration cần thực thi.`);

    // 2. TỰ ĐỘNG TẠO BẢN SAO LƯU TRƯỚC KHI MIGRATION (PRE-MIGRATION BACKUP)
    try {
      console.log('[MigrationManager] Đang tạo bản sao lưu an toàn trước khi migration...');
      await backupService.createBackup('pre_migration', CURRENT_APP_VERSION, dbSchemaVersion, 'Tự động sao lưu trước khi chạy schema migration');
      console.log('[MigrationManager] Bản sao lưu trước migration đã được tạo thành công.');
    } catch (err: any) {
      console.error('[MigrationManager] Không thể tạo backup trước migration:', err.message);
      return {
        success: false,
        executedCount: 0,
        currentVersion: dbSchemaVersion,
        error: `Hủy migration: Không thể tạo bản sao lưu an toàn (${err.message})`
      };
    }

    let executedCount = 0;

    // 3. THỰC THI TỪNG BƯỚC TRONG TRANSACTION
    for (const step of pending) {
      const startTime = performance.now();
      try {
        const runTx = db.transaction(() => {
          step.up(db);
          const duration = Math.round(performance.now() - startTime);
          db.prepare(`
            INSERT INTO migration_history (migration_name, schema_version, app_version, applied_at, status, execution_time_ms)
            VALUES (?, ?, ?, ?, 'success', ?)
            ON CONFLICT(migration_name) DO UPDATE SET
              status = 'success',
              applied_at = excluded.applied_at,
              execution_time_ms = excluded.execution_time_ms
          `).run(step.name, step.targetSchemaVersion, CURRENT_APP_VERSION, Date.now(), duration);
        });

        runTx();
        executedCount++;
        console.log(`[MigrationManager] ✓ Đã áp dụng migration: ${step.name} (Schema v${step.targetSchemaVersion})`);
      } catch (stepErr: any) {
        console.error(`[MigrationManager] ❌ Lỗi migration ${step.name}:`, stepErr.message);
        // Ghi nhận lỗi vào bảng migration_history
        try {
          db.prepare(`
            INSERT INTO migration_history (migration_name, schema_version, app_version, applied_at, status, execution_time_ms)
            VALUES (?, ?, ?, ?, 'failed', 0)
            ON CONFLICT(migration_name) DO UPDATE SET status = 'failed'
          `).run(step.name, step.targetSchemaVersion, CURRENT_APP_VERSION, Date.now());
        } catch {}

        return {
          success: false,
          executedCount,
          currentVersion: this.getCurrentDatabaseSchemaVersion(),
          error: `Thất bại tại migration ${step.name}: ${stepErr.message}`
        };
      }
    }

    // 4. KIỂM TRA TÍNH TOÀN VẸN DATABASE SAU MIGRATION
    const integrityCheck = backupService.verifyDatabaseIntegrity();
    if (!integrityCheck.ok) {
      return {
        success: false,
        executedCount,
        currentVersion: this.getCurrentDatabaseSchemaVersion(),
        error: `Cảnh báo: Tính toàn vẹn SQLite bị lỗi sau migration: ${integrityCheck.details.join(', ')}`
      };
    }

    return {
      success: true,
      executedCount,
      currentVersion: this.getCurrentDatabaseSchemaVersion()
    };
  }
}

export const migrationManager = MigrationManager.getInstance();
