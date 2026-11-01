import assert from 'assert';
import { db } from '../server/db.js';
import { authService } from '../server/authService.js';
import { syncService } from '../server/syncService.js';
import { dataPathManager } from '../server/dataPathManager.js';
import { backupService } from '../server/backupService.js';
import { migrationManager } from '../server/migrationManager.js';
import { getRubySegments } from '../src/utils/pinyin.js';

console.log('========================================================================');
console.log('🔍 RUNNING COMPREHENSIVE SYSTEM LOGIC AUDIT & VERIFICATION SUITE');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Authentication Security - Change Password Verification
// -----------------------------------------------------------------------------
console.log('📌 [TEST 1 - BẢO MẬT XÁC THỰC & ĐỔI MẬT KHẨU]');
const testSecurityUserId = 'test_security_user_diag';
db.prepare('DELETE FROM users WHERE id = ?').run(testSecurityUserId);
const initialTestHash = authService.hashPassword('InitialPass123@');
db.prepare(`
  INSERT INTO users (id, username, password_hash, role, display_name, must_change_password, status, created_at, updated_at)
  VALUES (?, 'test_security_diag', ?, 'learner', 'Test Security User', 0, 'active', ?, ?)
`).run(testSecurityUserId, initialTestHash, Date.now(), Date.now());

// 1.1: Omitted oldPassword must be rejected
let blockedWithoutOld = false;
try {
  authService.changePassword({
    userId: testSecurityUserId,
    newPassword: 'testNewPassword123@',
    isForced: false
  });
} catch (e: any) {
  blockedWithoutOld = true;
  assert(e.message.includes('Vui lòng nhập mật khẩu hiện tại'), 'Error message must specify old password requirement');
}
assert(blockedWithoutOld, 'Security check: Changing password without current password must be rejected');
console.log('  ✅ [PASS] 1.1 Từ chối đổi mật khẩu khi không cung cấp mật khẩu cũ (Chống vượt quyền bảo mật)');

// 1.2: Incorrect oldPassword must be rejected
let blockedWrongOld = false;
try {
  authService.changePassword({
    userId: testSecurityUserId,
    oldPassword: 'wrong_password_xyz',
    newPassword: 'testNewPassword123@',
    isForced: false
  });
} catch (e: any) {
  blockedWrongOld = true;
  assert(e.message.includes('Mật khẩu hiện tại không chính xác'), 'Error message must specify incorrect password');
}
assert(blockedWrongOld, 'Security check: Incorrect old password must be rejected');
console.log('  ✅ [PASS] 1.2 Từ chối đổi mật khẩu khi mật khẩu cũ không chính xác');

// 1.3: Correct oldPassword succeeds
const changeRes = authService.changePassword({
  userId: testSecurityUserId,
  oldPassword: 'InitialPass123@',
  newPassword: 'BrandNewPass123@',
  isForced: false
});
assert(changeRes.success, 'Valid password change must succeed');
console.log('  ✅ [PASS] 1.3 Đổi mật khẩu thành công khi xác thực mật khẩu hiện tại chính xác');

// Clean up test user
db.prepare('DELETE FROM users WHERE id = ?').run(testSecurityUserId);

// Ensure admin is in clean bootstrap state
authService.changePassword({
  userId: 'admin',
  newPassword: '123456a@B',
  isForced: true
});
db.prepare('UPDATE users SET must_change_password = 1 WHERE username = ?').run('admin');

// -----------------------------------------------------------------------------
// TEST 2: Sync Engine Robustness & Parameter Interoperability
// -----------------------------------------------------------------------------
console.log('\n📌 [TEST 2 - ĐỒNG BỘ HAI CHIỀU & TƯƠNG THÍCH THAM SỐ]');
const testUserId = 'admin';
const testDeviceId = 'test_diag_device_1';

// 2.1: Pull with sinceSeq handles zero and positive sequence numbers
const pullRes = syncService.handlePull(testUserId, testDeviceId, 0, 10);
assert(pullRes.success, 'handlePull must succeed');
console.log('  ✅ [PASS] 2.1 handlePull thực thi thành công và trả về cấu trúc SyncPullResult chuẩn');

// 2.2: Conflict resolution with corrupted client_payload_json doesn't crash server
const conflictId = `conf_diag_${Date.now()}`;
db.prepare(`
  INSERT INTO sync_conflicts (id, user_id, device_id, entity_type, entity_id, client_payload_json, server_payload_json, conflict_reason, status, created_at)
  VALUES (?, ?, ?, 'srs_item', 'test_item_999', 'INVALID_JSON_CORRUPTED', '{}', 'Test corrupted payload', 'pending', ?)
`).run(conflictId, testUserId, testDeviceId, Date.now());

const resolveRes = syncService.resolveConflict(conflictId, 'client');
assert(resolveRes, 'resolveConflict must handle invalid JSON gracefully without throwing uncaught exceptions');
console.log('  ✅ [PASS] 2.2 resolveConflict xử lý an toàn chuỗi JSON hỏng, không làm sập tiến trình');

// Clean up test conflict
db.prepare('DELETE FROM sync_conflicts WHERE id = ?').run(conflictId);

// 2.3: getConflicts query runs with SQL single quotes 'pending'
const conflicts = syncService.getConflicts(testUserId);
assert(Array.isArray(conflicts), 'getConflicts must return an array');
console.log('  ✅ [PASS] 2.3 getConflicts thực thi truy vấn SQL chuẩn xác với single quote literals');

// -----------------------------------------------------------------------------
// TEST 3: Data Path Manager & Byte Formatting Boundaries
// -----------------------------------------------------------------------------
console.log('\n📌 [TEST 3 - ĐỊNH DẠNG DUNG LƯỢNG & BIÊN GIÁ TRỊ]');
const stats = dataPathManager.getStorageStats();
assert(typeof stats.totalSizeFormatted === 'string' && stats.totalSizeFormatted.length > 0, 'Formatted size must be valid string');
assert(!stats.totalSizeFormatted.includes('NaN'), 'Formatted size must never contain NaN');
assert(!stats.totalSizeFormatted.includes('undefined'), 'Formatted size must never contain undefined');
console.log(`  ✅ [PASS] 3.1 Thống kê dung lượng định dạng chuẩn: ${stats.totalSizeFormatted} (Không có NaN/undefined)`);

// -----------------------------------------------------------------------------
// TEST 4: Pinyin Ruby Character Alignment
// -----------------------------------------------------------------------------
console.log('\n📌 [TEST 4 - CĂN KHỚP NGỮ ÂM PINYIN RUBY DISPLAY]');
const sampleMixedText = '你好, world 123! 我在北京学中文。';
const rubySegments = getRubySegments(sampleMixedText);
assert.strictEqual(rubySegments.length, Array.from(sampleMixedText).length, 'Ruby segments count must exactly match character count');

const zhChars = rubySegments.filter(s => s.isChinese);
assert(zhChars.length > 0, 'Must extract Chinese characters');
assert(zhChars.every(s => s.pinyin.length > 0), 'All Chinese characters in ruby display must have valid Pinyin');
console.log(`  ✅ [PASS] 4.1 Căn khớp 1:1 giữa chuỗi ký tự hỗn hợp (${rubySegments.length} chars) và Pinyin Ruby`);

// -----------------------------------------------------------------------------
// TEST 5: Database Integrity Check
// -----------------------------------------------------------------------------
console.log('\n📌 [TEST 5 - TOÀN VẸN CƠ SỞ DỮ LIỆU SQLITE]');
const integrity = backupService.verifyDatabaseIntegrity();
assert(integrity.ok, 'SQLite integrity check must pass');
console.log('  ✅ [PASS] 5.1 SQLite PRAGMA integrity_check: OK');

console.log('\n========================================================================');
console.log('🎉 TẤT CẢ CÁC BÀI TEST KIỂM TRA LOGIC HỆ THỐNG ĐÃ HOÀN TẤT VÀ PASS 100%!');
console.log('========================================================================\n');
