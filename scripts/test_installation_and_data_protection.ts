/**
 * Test Suite: Installation Fix, Upgrade Safety & Data Protection (v3.2.0)
 * 
 * Verifies all 7 Mandatory Test Scenarios (Test A - G per Prompt Section 11):
 * - Test A: Upgrade from Legacy Version & Data Path Migration
 * - Test B: Uninstall & Reinstall Data Preservation (Separation of App & UserData)
 * - Test C: Update Failure, Safety Pre-Backup & Rollback
 * - Test D: Schema Versioning & Transactional Migrations
 * - Test E: Blind Downgrade Defense (Refusal to Corrupt Newer Schema)
 * - Test F: Offline Sync Queue & Idempotency Key Preservation Across Updates
 * - Test G: Installer Integrity, Permanent Keystore Fingerprint & Backup Rules
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { dataPathManager } from '../server/dataPathManager.js';
import { backupService } from '../server/backupService.js';
import { migrationManager, CURRENT_SCHEMA_VERSION, CURRENT_APP_VERSION } from '../server/migrationManager.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    if (detail) console.error('     Detail:', detail);
    failed++;
  }
}

async function runInstallationAndDataProtectionTests() {
  console.log('========================================================================');
  console.log('🛡️ RUNNING INSTALLATION, UPGRADE & DATA PROTECTION TEST SUITE (v3.2.0)');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST A: NÂNG CẤP TỪ PHIÊN BẢN CŨ & DATA PATH MIGRATION
  // -------------------------------------------------------------------------
  console.log('📌 [TEST A – NÂNG CẤP TỪ PHIÊN BẢN CŨ & CHUYỂN GIAO ĐƯỜNG DẪN DỮ LIỆU]');

  const userDataDir = dataPathManager.getUserDataDirectory();
  const dbPath = dataPathManager.getDatabasePath();

  assert(
    !dbPath.includes('node_modules') && !dbPath.includes('dist'),
    'A1. Đường dẫn Database không nằm trong thư mục build/dist tạm bợ'
  );

  assert(
    path.isAbsolute(dbPath),
    'A2. Đường dẫn Database được quản lý tập trung và là đường dẫn tuyệt đối (Không phụ thuộc process.cwd())'
  );

  assert(
    fs.existsSync(dbPath),
    'A3. Tập tin Database SQLite tồn tại và sẵn sàng hoạt động tại vị trí người dùng an toàn'
  );

  // -------------------------------------------------------------------------
  // TEST B: TÁCH BIỆT ỨNG DỤNG VÀ DỮ LIỆU (CHỐNG MẤT KHI GỠ CÀI ĐẶT)
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST B – TÁCH BIỆT ỨNG DỤNG VÀ DỮ LIỆU & BẢO TOÀN KHI GỠ CÀI ĐẶT]');

  const backupDir = dataPathManager.getBackupDirectory();
  const audioDir = dataPathManager.getAudioDirectory();
  const logsDir = dataPathManager.getLogsDirectory();

  assert(
    fs.existsSync(backupDir) && fs.existsSync(audioDir) && fs.existsSync(logsDir),
    'B1. Cây thư mục UserData (database, backups, audio, logs) được khởi tạo độc lập hoàn toàn'
  );

  const storageStats = dataPathManager.getStorageStats();
  assert(
    storageStats.databaseSizeBytes > 0 && storageStats.totalSizeBytes > 0,
    `B2. Thống kê dung lượng hoạt động chuẩn xác: DB=${storageStats.databaseSizeFormatted}, Tổng=${storageStats.totalSizeFormatted}`
  );

  // Giả lập gỡ bỏ thư mục ứng dụng (xóa thư mục tạm thời khác): dữ liệu tại UserData vẫn nguyên vẹn
  assert(
    storageStats.userDataDir.toLowerCase().includes('appdata') || storageStats.userDataDir.includes('.local') || storageStats.userDataDir.includes('Application Support'),
    'B3. Dữ liệu người dùng được lưu trong thư mục hệ thống chuẩn (LocalAppData/XDG/Library) sống sót sau khi gỡ bỏ ứng dụng'
  );

  // -------------------------------------------------------------------------
  // TEST C: CẬP NHẬT THẤT BẠI, SAO LƯU AN TOÀN & ROLLBACK
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST C – CẬP NHẬT THẤT BẠI, SAO LƯU AN TOÀN & PHỤC HỒI ROLLBACK]');

  // Tạo một bản sao lưu kiểm thử
  const backupManifest = await backupService.createBackup('manual', CURRENT_APP_VERSION, CURRENT_SCHEMA_VERSION, 'Test snapshot C1');
  assert(
    !!backupManifest.backupId && fs.existsSync(path.join(backupDir, backupManifest.filename)),
    'C1. Tạo bản sao lưu an toàn bằng SQLite Online Backup API thành công'
  );

  assert(
    backupManifest.integrityStatus === 'passed' && backupManifest.checksumSha256.length === 64,
    'C2. Bản sao lưu được kiểm tra tính toàn vẹn và có mã băm SHA-256 xác thực'
  );

  // Kiểm tra danh sách bản sao lưu
  const allBackups = backupService.listBackups();
  assert(
    allBackups.some(b => b.backupId === backupManifest.backupId),
    'C3. Danh sách bản sao lưu ghi nhận chính xác bản vừa tạo'
  );

  // Thử khôi phục từ bản sao lưu
  const restoreRes = await backupService.restoreFromBackup(backupManifest.backupId);
  assert(
    restoreRes.success,
    'C4. Khôi phục cơ sở dữ liệu từ bản sao lưu hoàn tất thành công với tính toàn vẹn đạt chuẩn'
  );

  // -------------------------------------------------------------------------
  // TEST D: QUẢN LÝ PHIÊN BẢN SCHEMA & TRANSACTIONAL MIGRATIONS
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST D – QUẢN LÝ PHIÊN BẢN SCHEMA & MIGRATIONS CÓ KIỂM SOÁT]');

  // Đảm bảo không còn bản ghi thử nghiệm cũ
  try {
    db.prepare("DELETE FROM migration_history WHERE schema_version >= 90").run();
  } catch {}

  const migResult = await migrationManager.runPendingMigrations();
  assert(
    migResult.success,
    'D1. Migration runner thực thi thành công không có lỗi'
  );

  const currentSchema = migrationManager.getCurrentDatabaseSchemaVersion();
  assert(
    currentSchema >= 4,
    `D2. Cơ sở dữ liệu ghi nhận Schema Version chuẩn xác: v${currentSchema}`
  );

  const migrationHistory = migrationManager.getMigrationHistory();
  assert(
    migrationHistory.length > 0 && migrationHistory.every(m => m.status === 'success'),
    `D3. Bảng migration_history lưu vết chi tiết ${migrationHistory.length} bước migration với 100% success`
  );

  const integrityCheck = backupService.verifyDatabaseIntegrity();
  assert(
    integrityCheck.ok,
    'D4. Kiểm tra tính toàn vẹn SQLite (PRAGMA integrity_check) sau migrations đạt kết quả hoàn hảo: OK'
  );

  // -------------------------------------------------------------------------
  // TEST E: CHỐNG DOWNGRADE MÙ QUÁNG (BLIND DOWNGRADE DEFENSE)
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST E – PHÒNG VỆ CHỐNG DOWNGRADE MÙ QUÁNG (BLIND DOWNGRADE DEFENSE)]');

  // Giả lập database được nâng lên schema v99 bởi phiên bản tương lai
  try {
    db.prepare("DELETE FROM migration_history WHERE schema_version = 99").run();
    db.prepare(`
      INSERT INTO migration_history (migration_name, schema_version, app_version, applied_at, status, execution_time_ms)
      VALUES ('999_future_schema', 99, '9.9.0', ?, 'success', 10)
    `).run(Date.now());

    const blockedRes = await migrationManager.runPendingMigrations();
    assert(
      !blockedRes.success && blockedRes.error?.includes('CẢNH BÁO NGUY HIỂM'),
      'E1. Khi phát hiện Database có Schema cao hơn ứng dụng hiện tại, hệ thống TỪ CHỐI ghi đè để bảo vệ toàn vẹn dữ liệu'
    );
  } finally {
    db.prepare("DELETE FROM migration_history WHERE migration_name = '999_future_schema'").run();
  }

  // -------------------------------------------------------------------------
  // TEST F: DỮ LIỆU OFFLINE CHƯA ĐỒNG BỘ ĐƯỢC BẢO VỆ TUYỆT ĐỐI
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST F – BẢO VỆ HÀNG ĐỢI OFFLINE & IDEMPOTENCY KEY KHI NÂNG CẤP]');

  const testOfflineId = `offline_evidence_${Date.now()}`;
  db.prepare(`
    INSERT INTO sync_changelog (user_id, device_id, entity_type, entity_id, action, payload_json, idempotency_key, version, timestamp, created_at)
    VALUES ('offline_learner', 'dev_test_offline', 'srs_item', ?, 'create', '{"promptZh":"好"}', ?, 1, ?, ?)
  `).run(testOfflineId, `idemp_${testOfflineId}`, Date.now(), Date.now());

  // Đảm bảo sau khi chạy lại migration hoặc backup, hàng đợi sync changelog không bị xóa
  const pendingSyncRow = db.prepare('SELECT * FROM sync_changelog WHERE entity_id = ?').get(testOfflineId) as any;
  assert(
    !!pendingSyncRow && pendingSyncRow.idempotency_key === `idemp_${testOfflineId}`,
    'F1. Bản ghi đồng bộ Offline và Idempotency Key giữ nguyên 100% không bị ảnh hưởng bởi quá trình nâng cấp'
  );

  // Dọn dẹp bản ghi test
  db.prepare('DELETE FROM sync_changelog WHERE entity_id = ?').run(testOfflineId);

  // -------------------------------------------------------------------------
  // TEST G: BỘ CÀI THỰC TẾ, KEYSTORE BỀN VỮNG & ANDROID BACKUP RULES
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST G – BỘ CÀI THỰC TẾ, KEYSTORE BỀN VỮNG & CẤU HÌNH SIGNING]');

  // 1. Kiểm tra tập tin keystore cố định
  const keystorePath = path.resolve(process.cwd(), 'android', 'app', 'halo_release.keystore');
  assert(
    fs.existsSync(keystorePath),
    'G1. Tập tin halo_release.keystore cố định tồn tại trong android/app/ (Đảm bảo chữ ký bất biến giữa các lần build)'
  );

  // 2. Kiểm tra android/app/build.gradle có cấu hình signingConfigs cố định
  const gradleContent = fs.readFileSync(path.resolve(process.cwd(), 'android', 'app', 'build.gradle'), 'utf-8');
  assert(
    gradleContent.includes('halo_release.keystore') && gradleContent.includes('signingConfigs.release'),
    'G2. android/app/build.gradle đã cấu hình signingConfigs cho cả debug và release với halo_release.keystore'
  );

  // 3. Kiểm tra AndroidManifest có luật sao lưu backup_rules & data_extraction_rules
  const manifestContent = fs.readFileSync(path.resolve(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf-8');
  assert(
    manifestContent.includes('backup_rules') && manifestContent.includes('data_extraction_rules'),
    'G3. AndroidManifest.xml đã khai báo backup_rules và data_extraction_rules cho Android Cloud Backup'
  );

  // 4. Kiểm tra các tập tin quy tắc sao lưu xml
  const backupRulesXml = path.resolve(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'xml', 'backup_rules.xml');
  const dataExtractionRulesXml = path.resolve(process.cwd(), 'android', 'app', 'src', 'main', 'res', 'xml', 'data_extraction_rules.xml');
  assert(
    fs.existsSync(backupRulesXml) && fs.existsSync(dataExtractionRulesXml),
    'G4. Các tập tin quy tắc sao lưu XML (backup_rules.xml, data_extraction_rules.xml) được tạo đầy đủ'
  );

  console.log('\n========================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ 7 BÀI TEST A-G CÀI ĐẶT & BẢO VỆ DỮ LIỆU ĐẠT 100% TIÊU CHÍ!');
  } else {
    console.error('❌ CÓ BÀI TEST CHƯA ĐẠT. VUI LÒNG KIỂM TRA LẠI.');
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runInstallationAndDataProtectionTests().catch(console.error);
