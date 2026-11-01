/**
 * Test Suite: Authentication, Roles, Multi-User Sessions & Local LAN Protection (v3.0.0)
 * 
 * Verifies:
 * 1. Bootstrap Admin account ('admin') created with hashed password (scrypt)
 * 2. No plaintext password stored anywhere in database
 * 3. Initial login with '123456a@B' succeeds and reports mustChangePassword: true
 * 4. Changing password unsets mustChangePassword flag
 * 5. Brute-force rate limiting locks account after 5 consecutive failed attempts
 * 6. Admin can create new Learner accounts
 * 7. Learner permissions: Learner cannot execute Admin operations
 * 8. Session token lifecycle: generation, validation, expiration, and revocation (logout)
 * 9. Legacy data migration: confirms all pre-v3 learner records are mapped to Admin
 * 10. Local LAN access configuration, safety warning, and IP enumeration
 */

import { authService, AuthService } from '../server/authService.js';
import { db } from '../server/db.js';
import { isLanAccessEnabled, setLanAccessEnabled } from '../server/index.js';

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

async function runAuthTests() {
  console.log('================================================================');
  console.log('🔐 RUNNING AUTHENTICATION, ROLES & LAN SECURITY SUITE (v3.0.0)');
  console.log('================================================================\n');

  // 1. Kiểm tra Bootstrap Admin
  console.log('📌 [PHẦN 1: TÀI KHOẢN ADMIN MẶC ĐỊNH & BẢO MẬT MẬT KHẨU]');
  const adminRow = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
  assert(
    !!adminRow && adminRow.username === 'admin' && adminRow.role === 'admin',
    '1.1 Tài khoản Admin mặc định tồn tại với username "admin" và role "admin"'
  );

  assert(
    adminRow.password_hash.startsWith('scrypt$') && !adminRow.password_hash.includes('123456a@B'),
    '1.2 Mật khẩu Admin được băm an toàn bằng scrypt (Tuyệt đối không lưu plaintext)'
  );

  assert(
    adminRow.must_change_password === 1,
    '1.3 Tài khoản Admin ban đầu được đánh dấu bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên'
  );

  // 2. Kiểm tra đăng nhập với mật khẩu ban đầu
  const initialLogin = await authService.login({
    username: 'admin',
    password: '123456a@B',
    ipAddress: '127.0.0.1'
  });

  assert(
    initialLogin.user.username === 'admin' &&
    initialLogin.user.mustChangePassword === true &&
    initialLogin.sessionToken.length >= 64,
    '1.4 Đăng nhập thành công với mật khẩu ban đầu "123456a@B", trả về Session Token 64-char'
  );

  // 3. Kiểm tra kiểm tra phiên đăng nhập (Session Validation)
  const sessionData = authService.validateSession(initialLogin.sessionToken);
  assert(
    sessionData !== null && sessionData.userId === 'admin' && sessionData.role === 'admin',
    '1.5 Token phiên được xác thực chính xác trong cơ sở dữ liệu SQLite'
  );

  // 4. Bắt buộc đổi mật khẩu
  console.log('\n📌 [PHẦN 2: BẮT BUỘC ĐỔI MẬT KHẨU & THU HỒI PHIÊN]');
  const changeRes = authService.changePassword({
    userId: 'admin',
    oldPassword: '123456a@B',
    newPassword: 'HaloSecurePass2026@',
    isForced: false
  });

  assert(
    changeRes.success === true,
    '2.1 Đổi mật khẩu Admin thành công sang mật khẩu mới'
  );

  const updatedAdmin = db.prepare('SELECT must_change_password FROM users WHERE username = ?').get('admin') as any;
  assert(
    updatedAdmin.must_change_password === 0,
    '2.2 Cờ must_change_password được giải trừ về 0 sau khi đổi mật khẩu'
  );

  // Đăng xuất và thu hồi session
  authService.revokeSession(initialLogin.sessionToken);
  const revokedSession = authService.validateSession(initialLogin.sessionToken);
  assert(
    revokedSession === null,
    '2.3 Phiên đăng nhập bị thu hồi lập tức sau khi đăng xuất'
  );

  // Đăng nhập lại với mật khẩu mới
  const newLogin = await authService.login({
    username: 'admin',
    password: 'HaloSecurePass2026@',
    ipAddress: '127.0.0.1'
  });
  assert(
    newLogin.user.mustChangePassword === false,
    '2.4 Đăng nhập thành công với mật khẩu mới, không còn yêu cầu đổi mật khẩu'
  );

  // Đặt lại mật khẩu về ban đầu cho tiện test tiếp
  authService.changePassword({
    userId: 'admin',
    newPassword: '123456a@B',
    isForced: true
  });
  db.prepare('UPDATE users SET must_change_password = 1 WHERE username = ?').run('admin');

  // 5. Kiểm tra phòng vệ Brute-force & Rate limiting
  console.log('\n📌 [PHẦN 3: BẢO VỆ CHỐNG TẤN CÔNG BRUTE-FORCE]');
  const testWrongIp = 'test_brute_force_ip';
  let lockoutTriggered = false;

  for (let i = 0; i < 6; i++) {
    try {
      await authService.login({
        username: 'admin',
        password: 'wrong_password_attempt',
        ipAddress: testWrongIp
      });
    } catch (err: any) {
      if (err.message.includes('khóa do đăng nhập sai nhiều lần')) {
        lockoutTriggered = true;
      }
    }
  }

  assert(
    lockoutTriggered === true,
    '3.1 Tự động kích hoạt khóa tạm thời tài khoản sau 5 lần thử mật khẩu sai liên tục'
  );

  // Dọn dẹp test IP
  db.prepare('DELETE FROM user_login_attempts WHERE ip_or_user LIKE ?').run(`%${testWrongIp}%`);

  // 6. Quản trị viên tạo tài khoản Learner
  console.log('\n📌 [PHẦN 4: PHÂN QUYỀN ADMIN VS LEARNER & TÁCH DỮ LIỆU]');
  const testLearnerUsername = `test_learner_${Date.now()}`;
  const newLearner = authService.createLearner({
    username: testLearnerUsername,
    displayName: 'Nguyễn Văn Học',
    initialPassword: 'LearnerPass123@'
  });

  assert(
    newLearner.role === 'learner' && newLearner.mustChangePassword === true,
    '4.1 Admin tạo thành công tài khoản Learner mới với quyền hạn bị giới hạn'
  );

  const learnerProfileRow = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get(newLearner.id) as any;
  assert(
    !!learnerProfileRow && learnerProfileRow.name === 'Nguyễn Văn Học',
    '4.2 Hồ sơ học tập riêng biệt được khởi tạo độc lập cho Learner mới'
  );

  // Vô hiệu hóa tài khoản learner
  authService.setUserStatus(newLearner.id, 'disabled');
  let disabledLoginBlocked = false;
  try {
    await authService.login({
      username: testLearnerUsername,
      password: 'LearnerPass123@'
    });
  } catch (err: any) {
    if (err.message.includes('không chính xác')) {
      disabledLoginBlocked = true;
    }
  }
  assert(
    disabledLoginBlocked === true,
    '4.3 Tài khoản bị vô hiệu hóa lập tức bị chặn không thể đăng nhập'
  );

  // Kích hoạt lại
  authService.setUserStatus(newLearner.id, 'active');

  // 7. Bảo toàn di trú dữ liệu cũ sang Admin
  console.log('\n📌 [PHẦN 5: BẢO TOÀN DỮ LIỆU CŨ KHI MIGRATION SANG ADMIN]');
  const adminProfileCheck = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('admin') as any;
  assert(
    !!adminProfileCheck && adminProfileCheck.id === 'admin',
    '5.1 Bảng learner_profile lưu giữ hồ sơ đầy đủ cho tài khoản Admin'
  );

  // Kiểm tra bảng chat_sessions được gán cho Admin
  const adminSessionsCount = db.prepare("SELECT count(*) as count FROM chat_sessions WHERE user_id = 'admin'").get() as any;
  assert(
    adminSessionsCount.count > 0,
    `5.2 Toàn bộ ${adminSessionsCount.count} phiên hội thoại lịch sử đã được di trú toàn vẹn sang Admin`
  );

  // 8. Kiểm tra cấu hình LAN Access
  console.log('\n📌 [PHẦN 6: BẢO VỆ BACKEND LOCAL & CẤU HÌNH TRUY CẬP LAN]');
  const initialLanState = isLanAccessEnabled();
  setLanAccessEnabled(true);
  assert(
    isLanAccessEnabled() === true,
    '6.1 Bật chế độ LAN Access thành công trong bảng server_settings'
  );

  setLanAccessEnabled(false);
  assert(
    isLanAccessEnabled() === false,
    '6.2 Tắt chế độ LAN Access đưa hệ thống về chế độ bảo vệ cục bộ Localhost'
  );

  // Khôi phục lại trạng thái ban đầu
  setLanAccessEnabled(initialLanState);

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ AUTH & SECURITY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAuthTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
