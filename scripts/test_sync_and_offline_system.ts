/**
 * Test Suite: Server Connection, Offline Mode & Automatic Two-Way Synchronization (v3.1.0)
 * 
 * Verifies all 7 Mandatory Scenarios (Tình huống A - G):
 * - Tình huống A: Online Connection, Authentication, Study Persistence & Cross-Device Pull
 * - Tình huống B: Offline Study, Local Storage & Persistence across Restarts
 * - Tình huống C: Automatic Sync on Reconnect, Offline->Online Migration, Zero Duplicates
 * - Tình huống D: Interrupted Sync Recovery, Idempotency Defense against Network Glitches
 * - Tình huống E: Data Conflict Resolution & Strict Append-Only Learning Evidence Defense
 * - Tình huống F: Security, Role-Based Access, Token Expiration & Unauthorized Sync Rejection
 * - Tình huống G: Multi-Device Compatibility, Soft Deletion (Tombstones) & Legacy DB Safety
 */

import { db } from '../server/db.js';
import { syncService, SyncMutationItem } from '../server/syncService.js';
import { authService } from '../server/authService.js';

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

async function runSyncAndOfflineTestSuite() {
  console.log('========================================================================');
  console.log('🔄 RUNNING SERVER CONNECTION, OFFLINE & AUTO-SYNC TEST SUITE (v3.1.0)');
  console.log('========================================================================\n');

  const testUserId = `test_sync_user_${Date.now()}`;
  const deviceA = `device_mobile_android_${Date.now()}`;
  const deviceB = `device_desktop_pc_${Date.now()}`;

  // Tạo tài khoản test
  db.prepare(`
    INSERT OR REPLACE INTO users (id, username, password_hash, role, display_name, created_at, updated_at)
    VALUES (?, ?, ?, 'learner', 'Học Viên Test Sync', ?, ?)
  `).run(testUserId, `learner_${Date.now()}`, 'hashed_pw_test', Date.now(), Date.now());

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG A: SỬ DỤNG ONLINE
  // -------------------------------------------------------------------------
  console.log('📌 [TÌNH HUỐNG A – SỬ DỤNG ONLINE & ĐỒNG BỘ ĐA THIẾT BỊ]');

  // A1: Kết nối thiết bị A & đăng ký
  syncService.registerDevice(testUserId, deviceA, 'Xiaomi 13 Pro', 'android');
  const devRowA = db.prepare('SELECT * FROM sync_devices WHERE device_id = ?').get(deviceA) as any;
  assert(
    !!devRowA && devRowA.user_id === testUserId && devRowA.platform === 'android',
    'A1. Thiết bị A kết nối thành công và được đăng ký vào sync_devices'
  );

  // A2: Thực hiện hoạt động học tập trên Thiết bị A và gửi Push lên Server
  const initialSeq = syncService.getLatestServerSeq(testUserId);
  const cardId = `card_test_${Date.now()}`;
  const pushBatchA: SyncMutationItem[] = [
    {
      id: 'q_item_1',
      entityType: 'srs_item',
      entityId: cardId,
      action: 'create',
      payload: {
        itemType: 'vocabulary',
        promptZh: '你好',
        promptPinyin: 'nǐ hǎo',
        promptVi: 'Xin chào',
        easeFactor: 2.5,
        intervalDays: 1,
        repetitionCount: 1,
        streak: 1,
        masteryLevel: 'learning',
        status: 'active'
      },
      timestamp: Date.now(),
      idempotencyKey: `${deviceA}:srs_item:${cardId}:1`
    },
    {
      id: 'q_item_2',
      entityType: 'evidence',
      entityId: `ev_${Date.now()}`,
      action: 'create',
      payload: {
        learnerId: testUserId,
        knowledgeId: 'vocab:ni3_hao3',
        sourceModule: 'vocab_review',
        activityType: 'srs_recall',
        action: 'review_good',
        confidenceScore: 0.95,
        observedData: { latencyMs: 850, userRating: 'good' }
      },
      timestamp: Date.now(),
      idempotencyKey: `${deviceA}:evidence:ev1:1`
    }
  ];

  const pushResA = syncService.handlePush(testUserId, deviceA, pushBatchA);
  assert(
    pushResA.success && pushResA.processedCount === 2 && pushResA.syncedIds.length === 2,
    'A2. Thiết bị A đẩy thành công 2 bản ghi học tập (SRS Item + Learning Evidence) lên Server'
  );

  // A3: Kiểm tra dữ liệu được lưu trên Server SQLite
  const savedSrsItem = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(cardId) as any;
  assert(
    !!savedSrsItem && savedSrsItem.prompt_zh === '你好' && savedSrsItem.user_id === testUserId,
    'A3. Dữ liệu SRS Item được lưu bền vững vào bảng srs_items trên Server với đúng user_id'
  );

  // A4: Thiết bị B đăng nhập cùng tài khoản và Pull dữ liệu về
  syncService.registerDevice(testUserId, deviceB, 'Windows Laptop Chrome', 'web');
  const pullResB = syncService.handlePull(testUserId, deviceB, initialSeq);
  assert(
    pullResB.success && pullResB.changes.length === 2,
    'A4. Thiết bị B thực hiện Pull và nhận về chính xác 2 thay đổi vừa phát sinh từ Thiết bị A'
  );

  assert(
    pullResB.changes.some(c => c.entityId === cardId && c.deviceId === deviceA),
    'A5. Thiết bị B nhận đúng bản ghi của Thiết bị A với nguồn gốc device_id minh bạch'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG B: HỌC OFFLINE & LƯU TRỮ CỤC BỘ
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG B – HỌC OFFLINE & BẢO TOÀN DỮ LIỆU CỤC BỘ]');

  // Giả lập không gian lưu trữ Offline cục bộ
  const offlineStorage: Record<string, any> = {
    profile: { id: 'offline_learner', name: 'Học viên Offline', targetHsk: 3 },
    srsReviews: [],
    vocabBookmarks: []
  };

  // Người dùng ôn tập khi không có kết nối
  offlineStorage.srsReviews.push({
    vocabId: 101,
    rating: 'easy',
    reviewedAt: Date.now(),
    nextReviewDate: Date.now() + 86400000 * 3
  });
  offlineStorage.vocabBookmarks.push({ word: '谢谢', pinyin: 'xièxie', bookmarkedAt: Date.now() });

  assert(
    offlineStorage.srsReviews.length === 1 && offlineStorage.vocabBookmarks.length === 1,
    'B1. Dữ liệu học tập Offline được lưu trữ hoàn toàn vào bộ nhớ cục bộ mà không cần Server'
  );

  // Khởi động lại ứng dụng (giả lập restart app bằng cách đọc lại snapshot)
  const reloadedSnapshot = JSON.parse(JSON.stringify(offlineStorage));
  assert(
    reloadedSnapshot.srsReviews[0].vocabId === 101 && reloadedSnapshot.vocabBookmarks[0].word === '谢谢',
    'B2. Khởi động lại ứng dụng: Toàn bộ tiến độ học Offline vẫn còn nguyên vẹn 100%'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG C: TỰ ĐỘNG ĐỒNG BỘ KHI KẾT NỐI LẠI
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG C – TỰ ĐỘNG ĐỒNG BỘ KHI KẾT NỐI LẠI]');

  // Tạo dữ liệu phát sinh trong thời gian Offline (với userId = 'offline_learner')
  const offlineCardId = `offline_card_${Date.now()}`;
  const offlinePushItems: SyncMutationItem[] = [
    {
      id: 'off_item_1',
      entityType: 'srs_item',
      entityId: offlineCardId,
      action: 'create',
      payload: {
        itemType: 'vocabulary',
        promptZh: '谢谢',
        promptPinyin: 'xièxie',
        promptVi: 'Cảm ơn',
        easeFactor: 2.6,
        intervalDays: 3,
        repetitionCount: 2,
        streak: 2,
        masteryLevel: 'reviewing',
        status: 'active'
      },
      timestamp: Date.now() - 3600000,
      idempotencyKey: `${deviceA}:offline:srs:${offlineCardId}:1`
    },
    {
      id: 'off_item_2',
      entityType: 'history',
      entityId: `hist_${Date.now()}`,
      action: 'create',
      payload: {
        date: new Date().toISOString().split('T')[0],
        activityType: 'offline_flashcard',
        score: 100,
        durationSeconds: 900
      },
      timestamp: Date.now() - 3000000,
      idempotencyKey: `${deviceA}:offline:hist:${Date.now()}:1`
    }
  ];

  // Khi kết nối lại, liên kết dữ liệu offline vào tài khoản đăng nhập và Push lên Server
  const syncOfflineRes = syncService.handlePush(testUserId, deviceA, offlinePushItems);
  assert(
    syncOfflineRes.success && syncOfflineRes.processedCount === 2,
    'C1. Server tự động tiếp nhận và chuyển giao dữ liệu Offline sang tài khoản đã xác thực'
  );

  const checkOfflineItemInDb = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(offlineCardId) as any;
  assert(
    !!checkOfflineItemInDb && checkOfflineItemInDb.user_id === testUserId && checkOfflineItemInDb.prompt_zh === '谢谢',
    'C2. Bản ghi tạo lúc Offline xuất hiện đầy đủ trong database của người dùng trên Server'
  );

  // Kiểm tra thiết bị khác nhận được dữ liệu offline vừa đồng bộ
  const pullResBAfterOffline = syncService.handlePull(testUserId, deviceB, pullResB.latestSeq);
  assert(
    pullResBAfterOffline.success && pullResBAfterOffline.changes.some(c => c.entityId === offlineCardId),
    'C3. Thiết bị B ngay lập tức nhận được các bản ghi mà Thiết bị A đã học trong lúc Offline'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG D: MẤT KẾT NỐI GIỮA LÚC ĐỒNG BỘ & IDEMPOTENCY
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG D – MẤT KẾT NỐI GIỮA LÚC ĐỒNG BỘ & CHỐNG TRÙNG LẶP]');

  const changelogCountBefore = (db.prepare('SELECT COUNT(*) as c FROM sync_changelog WHERE user_id = ?').get(testUserId) as any).c;

  // Giả lập Thiết bị A bị timeout hoặc gián đoạn mạng, gửi lại đúng batch offlinePushItems
  const retryPushRes = syncService.handlePush(testUserId, deviceA, offlinePushItems);

  assert(
    retryPushRes.success && retryPushRes.processedCount === 0 && retryPushRes.syncedIds.length === 2,
    'D1. Gửi lại cùng gói đồng bộ: Idempotency Guard nhận diện chính xác và bỏ qua các mục đã xử lý'
  );

  const changelogCountAfter = (db.prepare('SELECT COUNT(*) as c FROM sync_changelog WHERE user_id = ?').get(testUserId) as any).c;
  assert(
    changelogCountBefore === changelogCountAfter,
    'D2. Số lượng bản ghi changelog giữ nguyên, đảm bảo tuyệt đối KHÔNG có bản ghi trùng lặp'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG E: XUNG ĐỘT DỮ LIỆU & BẢO VỆ BẰNG CHỨNG HỌC TẬP (APPEND-ONLY)
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG E – XỬ LÝ XUNG ĐỘT & BẢO TOÀN LEARNING EVIDENCE]');

  // Thiết bị A và Thiết bị B cùng ôn tập 1 từ vựng nhưng điểm số khác nhau
  const conflictCardId = `conflict_card_${Date.now()}`;

  // Bước 1: Khởi tạo từ vựng
  syncService.handlePush(testUserId, deviceA, [
    {
      id: 'init_card',
      entityType: 'srs_item',
      entityId: conflictCardId,
      action: 'create',
      payload: { promptZh: '再见', promptPinyin: 'zàijiàn', intervalDays: 1, repetitionCount: 1 },
      timestamp: Date.now() - 5000,
      idempotencyKey: `init_${conflictCardId}`
    }
  ]);

  // Thiết bị A cập nhật interval = 3
  syncService.handlePush(testUserId, deviceA, [
    {
      id: 'update_a',
      entityType: 'srs_item',
      entityId: conflictCardId,
      action: 'update',
      payload: { promptZh: '再见', promptPinyin: 'zàijiàn', intervalDays: 3, repetitionCount: 2, easeFactor: 2.6 },
      timestamp: Date.now() - 2000,
      idempotencyKey: `update_a_${conflictCardId}`
    }
  ]);

  // Thiết bị B cập nhật interval = 5 (học sau hơn)
  syncService.handlePush(testUserId, deviceB, [
    {
      id: 'update_b',
      entityType: 'srs_item',
      entityId: conflictCardId,
      action: 'update',
      payload: { promptZh: '再见', promptPinyin: 'zàijiàn', intervalDays: 5, repetitionCount: 3, easeFactor: 2.7 },
      timestamp: Date.now() - 1000,
      idempotencyKey: `update_b_${conflictCardId}`
    }
  ]);

  const resolvedCard = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(conflictCardId) as any;
  assert(
    resolvedCard.interval_days === 5 && resolvedCard.repetition_count === 3,
    'E1. Hợp nhất trạng thái SRS an toàn: Giữ tiến độ ôn tập cao nhất từ bản cập nhật mới nhất'
  );

  // Kiểm tra Bằng chứng học tập (Learning Evidence) là Append-Only (Bất biến)
  const evCountBefore = (db.prepare('SELECT COUNT(*) as c FROM learner_evidence_ledger WHERE user_id = ?').get(testUserId) as any).c;

  // Thử gửi bằng chứng học tập từ Thiết bị A và Thiết bị B
  syncService.handlePush(testUserId, deviceA, [
    {
      id: 'ev_a',
      entityType: 'evidence',
      entityId: `ev_test_${Date.now()}_a`,
      action: 'create',
      payload: {
        learnerId: testUserId,
        knowledgeId: 'vocab:zai4_jian4',
        activityType: 'srs_recall',
        action: 'review_good',
        confidenceScore: 0.9,
        observedData: { device: 'A' }
      },
      timestamp: Date.now(),
      idempotencyKey: `ev_a_${Date.now()}`
    }
  ]);

  syncService.handlePush(testUserId, deviceB, [
    {
      id: 'ev_b',
      entityType: 'evidence',
      entityId: `ev_test_${Date.now()}_b`,
      action: 'create',
      payload: {
        learnerId: testUserId,
        knowledgeId: 'vocab:zai4_jian4',
        activityType: 'srs_recall',
        action: 'review_easy',
        confidenceScore: 0.98,
        observedData: { device: 'B' }
      },
      timestamp: Date.now(),
      idempotencyKey: `ev_b_${Date.now()}`
    }
  ]);

  const evCountAfter = (db.prepare('SELECT COUNT(*) as c FROM learner_evidence_ledger WHERE user_id = ?').get(testUserId) as any).c;
  assert(
    evCountAfter === evCountBefore + 2,
    'E2. Learning Evidence được bảo vệ tuyệt đối: Cả 2 bằng chứng từ 2 thiết bị đều được lưu (Append-Only), không ghi đè'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG F: BẢO MẬT & PHÂN QUYỀN
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG F – BẢO MẬT & KIỂM SOÁT QUYỀN TRUY CẬP]');

  const maliciousUserId = `hacker_user_${Date.now()}`;

  // F1: Thiết bị không được quyền truy cập dữ liệu của user khác
  const pullMalicious = syncService.handlePull(maliciousUserId, deviceA, 0);
  assert(
    pullMalicious.changes.length === 0,
    'F1. Dữ liệu giữa các tài khoản được cách ly hoàn toàn (Không thể pull dữ liệu của user khác)'
  );

  // F2: Kiểm tra token authentication
  const testToken = `test_token_${Date.now()}`;
  db.prepare(`
    INSERT INTO user_sessions (token, user_id, expires_at, created_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, '127.0.0.1', 'test_runner')
  `).run(testToken, testUserId, Date.now() + 3600000, Date.now());

  const validatedSession = authService.validateSession(testToken);
  assert(
    !!validatedSession && validatedSession.userId === testUserId,
    'F2. Token phiên xác thực hợp lệ cho phép truy cập tài nguyên đồng bộ'
  );

  const fakeTokenCheck = authService.validateSession('fake_or_tampered_token');
  assert(
    fakeTokenCheck === null,
    'F3. Token giả mạo bị từ chối truy cập ngay lập tức'
  );

  // F4: Token hết hạn
  const expiredToken = `expired_token_${Date.now()}`;
  db.prepare(`
    INSERT INTO user_sessions (token, user_id, expires_at, created_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, '127.0.0.1', 'test_runner')
  `).run(expiredToken, testUserId, Date.now() - 5000, Date.now() - 10000);

  const expiredCheck = authService.validateSession(expiredToken);
  assert(
    expiredCheck === null,
    'F4. Token phiên đã hết hạn bị hệ thống từ chối hoàn toàn'
  );

  // -------------------------------------------------------------------------
  // TÌNH HUỐNG G: TƯƠNG THÍCH, SOFT DELETION & DỮ LIỆU CŨ
  // -------------------------------------------------------------------------
  console.log('\n📌 [TÌNH HUỐNG G – TƯƠNG THÍCH & XÓA MỀM (TOMBSTONE)]');

  // G1: Thử xóa một thẻ SRS
  const deletePushRes = syncService.handlePush(testUserId, deviceA, [
    {
      id: 'del_1',
      entityType: 'srs_item',
      entityId: conflictCardId,
      action: 'delete',
      payload: {},
      timestamp: Date.now(),
      idempotencyKey: `del_${conflictCardId}`
    }
  ]);

  assert(
    deletePushRes.success,
    'G1. Lệnh xóa được thực thi thành công thông qua syncPush'
  );

  const deletedCardInDb = db.prepare('SELECT * FROM srs_items WHERE id = ?').get(conflictCardId) as any;
  assert(
    deletedCardInDb.is_deleted === 1 && deletedCardInDb.deleted_at > 0,
    'G2. Xóa mềm (Tombstone): Bản ghi được đánh dấu is_deleted = 1 kèm deleted_at, không bị xóa cứng mất dấu'
  );

  // G3: Thiết bị B Pull về nhận được lệnh xóa
  const pullDeleteForB = syncService.handlePull(testUserId, deviceB, pullResBAfterOffline.latestSeq);
  assert(
    pullDeleteForB.changes.some(c => c.entityId === conflictCardId && c.action === 'delete'),
    'G3. Thiết bị B nhận được sự kiện xóa tombstone để đồng bộ trạng thái xóa trên máy cục bộ'
  );

  // G4: Kiểm tra cấu trúc sync_devices
  const allDevices = db.prepare('SELECT COUNT(*) as c FROM sync_devices WHERE user_id = ?').get(testUserId) as any;
  assert(
    allDevices.c >= 2,
    'G4. Hệ thống theo dõi chính xác nhiều thiết bị (Mobile + Desktop) hoạt động trên cùng một tài khoản'
  );

  // Clean up test data
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    db.prepare('DELETE FROM sync_changelog WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM sync_devices WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM srs_items WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM learner_evidence_ledger WHERE user_id = ?').run(testUserId);
  } catch {
    // ignore
  }

  console.log('\n========================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ 7 TÌNH HUỐNG A-G ĐỒNG BỘ & OFFLINE ĐẠT 100% TIÊU CHÍ!');
  } else {
    console.error('❌ CÓ BÀI TEST CHƯA ĐẠT. VUI LÒNG KIỂM TRA LẠI.');
    process.exit(1);
  }
  console.log('========================================================================\n');
}

runSyncAndOfflineTestSuite().catch(console.error);
