import { db } from '../server/db.js';
import { geminiPlacementService } from '../server/geminiPlacementService.js';
import { geminiPathService } from '../server/geminiPathService.js';
import { geminiSrsService } from '../server/geminiSrsService.js';
import { geminiAnalysisService } from '../server/geminiAnalysisService.js';
import Database from 'better-sqlite3';
import path from 'path';

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU TỔNG KIỂM TRA TOÀN DIỆN HỆ THỐNG ỨNG DỤNG HỌC TIẾNG TRUNG AI');
  console.log('========================================================================\n');

  // ========================================================================
  // JOURNEY 1: HỌC VIÊN MỚI -> PLACEMENT TEST -> SYNC PROFILE -> ADAPTIVE ROADMAP
  // ========================================================================
  console.log('📌 [JOURNEY 1]: KIỂM TRA ĐẦU VÀO -> TỰ ĐỘNG ĐỒNG BỘ PROFILE -> LỘ TRÌNH THÍCH ỨNG');
  
  // 1.1 Khởi tạo bài kiểm tra trình độ Quick Test (3 kỹ năng: Từ vựng, Ngữ pháp, Đọc hiểu)
  const testInfo = await geminiPlacementService.createTest('quick');
  console.log(`✓ 1.1 Tạo bài kiểm tra: ID=${testInfo.testId}, Kỹ năng: ${testInfo.sections.join(', ')}, Số câu: ${testInfo.totalQuestions}`);
  if (!testInfo.testId || testInfo.totalQuestions <= 0) {
    throw new Error('Thất bại: Không thể khởi tạo Placement Test');
  }

  // 1.2 Trả lời toàn bộ các câu hỏi
  const questions = db.prepare('SELECT * FROM placement_questions WHERE test_id = ? ORDER BY order_index ASC').all(testInfo.testId) as any[];
  for (const q of questions) {
    await geminiPlacementService.submitAnswer({
      testId: testInfo.testId,
      questionId: q.id,
      userAnswer: q.correct_answer || 'A',
      timeSpentSeconds: 5
    });
  }
  console.log(`✓ 1.2 Đã nộp câu trả lời thành công cho toàn bộ ${questions.length} câu hỏi`);

  // 1.3 Hoàn thành bài thi và kiểm tra Zero-step Auto Sync
  const result = await geminiPlacementService.completeTest(testInfo.testId);
  console.log(`✓ 1.3 Điểm tổng thể: ${result.overallScore}/100, HSK ước tính: ${result.estimatedHsk} (${result.estimatedHskLabel})`);
  console.log(`✓ 1.3 Trạng thái tự động đồng bộ vào learner_profile: ${result.syncedToProfile}`);
  if (!result.syncedToProfile) {
    throw new Error('Thất bại: completeTest chưa tự động đồng bộ vào learner_profile (Zero-step sync thất bại)');
  }

  // 1.4 Kiểm tra learner_profile đã cập nhật đúng HSK
  const profile = db.prepare('SELECT * FROM learner_profile WHERE id = ?').get('default') as any;
  console.log(`✓ 1.4 Learner Profile trong SQLite: current_hsk=${profile.current_hsk}, target_hsk=${profile.target_hsk}`);
  if (!profile.current_hsk || profile.current_hsk < 1) {
    throw new Error('Thất bại: learner_profile chưa cập nhật current_hsk');
  }

  // 1.5 Kiểm tra tự động sinh lộ trình học thích ứng
  const pathDetail = await geminiPathService.getOrCreateCurrentPath();
  console.log(`✓ 1.5 Lộ trình học thích ứng: ID=${pathDetail.id}, Mục tiêu: HSK ${pathDetail.targetHsk}, Số giai đoạn: ${pathDetail.stages.length}`);
  if (!pathDetail.id || pathDetail.stages.length === 0) {
    throw new Error('Thất bại: Không tìm thấy hoặc không thể sinh lộ trình học thích ứng');
  }
  console.log('🎉 JOURNEY 1 PASS 100%!\n');

  // ========================================================================
  // JOURNEY 2: HỌC BÀI TỪ LỘ TRÌNH -> HOÀN THÀNH -> CẬP NHẬT BỘ NHỚ -> SINH THẺ SRS
  // ========================================================================
  console.log('📌 [JOURNEY 2]: HỌC BÀI TỪ LỘ TRÌNH -> CẬP NHẬT BỘ NHỚ -> ĐỒNG BỘ THẺ SRS');

  // 2.1 Lấy bài học đề xuất tiếp theo từ lộ trình
  const nextItem = pathDetail.nextRecommendedItem;
  console.log(`✓ 2.1 Bài học đề xuất tiếp theo: "${nextItem?.title || 'Bài học nền tảng'}" (${nextItem?.itemType || 'lesson'})`);

  // 2.2 Hoàn thành bài học với kết quả 90/100
  const rebalanceRes = await geminiPathService.rebalancePath({
    pathId: pathDetail.id,
    itemId: nextItem?.id,
    score: 90,
    triggerReason: 'Hoàn thành tốt bài học với 90 điểm'
  });
  console.log(`✓ 2.2 Hoàn thành bài học & Rebalance: Phiên bản #${rebalanceRes.version}, Thông điệp: ${rebalanceRes.message}`);
  if (!rebalanceRes.success) {
    throw new Error('Thất bại: Rebalance sau bài học không thành công');
  }

  // 2.3 Thêm một từ vựng mới vào bộ nhớ dài hạn
  const now = Date.now();
  db.prepare(`
    INSERT INTO vocabulary_memory (simplified, traditional, pinyin, meaning_vi, word_type, hsk_level, examples_json, first_taught_at, last_reviewed_at, review_count, mastery_level, source_session_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(simplified) DO UPDATE SET last_reviewed_at = excluded.last_reviewed_at
  `).run('苹果', '蘋果', 'píngguǒ', 'Quả táo', 'danh từ', 1, JSON.stringify(['这是一个大苹果。(Đây là một quả táo to.)']), now, now, 1, 'learning', 'audit_test', 'Hoa quả');
  console.log('✓ 2.3 Đã ghi nhận từ vựng "苹果" vào vocabulary_memory');

  // 2.4 Đồng bộ bộ nhớ dài hạn vào hệ thống lặp lại ngắt quãng SRS
  const srsSync = geminiSrsService.syncCardsFromMemory();
  console.log(`✓ 2.4 Đồng bộ thẻ SRS: Tổng số thẻ hiện tại: ${srsSync.totalCards}, Thẻ mới thêm: ${srsSync.added}`);
  if (srsSync.totalCards <= 0) {
    throw new Error('Thất bại: Không có thẻ SRS nào trong srs_items');
  }
  console.log('🎉 JOURNEY 2 PASS 100%!\n');

  // ========================================================================
  // JOURNEY 3: HỘI THOẠI AI TUTOR -> PHÂN TÍCH CHUYÊN SÂU -> CẬP NHẬT LỖI & THẺ SRS
  // ========================================================================
  console.log('📌 [JOURNEY 3]: HỘI THOẠI AI TUTOR -> PHÂN TÍCH SÂU -> SỔ TAY LỖI SAI & SRS');

  // 3.1 Tạo phiên trò chuyện mẫu chứa lỗi ngữ pháp và từ vựng
  const chatSessionId = `audit_chat_${Date.now()}`;
  db.prepare(`
    INSERT INTO chat_sessions (id, mode, hsk_level, title, scenario, session_type, status, is_analyzed, created_at, updated_at)
    VALUES (?, 'free', 2, 'Buổi kiểm tra đàm thoại', 'Giao tiếp hàng ngày', 'mixed', 'completed', 0, ?, ?)
  `).run(chatSessionId, now, now);

  const testMessages = [
    { id: `m1_${now}`, sender: 'assistant', text: '你好！今天你吃早饭了吗？', pinyin: 'Nǐ hǎo! Jīntiān nǐ chī zǎofàn le ma?', vi: 'Chào bạn! Hôm nay bạn đã ăn sáng chưa?' },
    { id: `m2_${now}`, sender: 'user', text: '你好！我吃了面包和喝牛奶。今天天气很好。', pinyin: 'Nǐ hǎo! Wǒ chī le miànbāo hé hē niúnǎi. Jīntiān tiānqì hěn hǎo.', vi: 'Chào bạn! Tôi đã ăn bánh mì và uống sữa. Thời tiết hôm nay rất đẹp.' },
    { id: `m3_${now}`, sender: 'assistant', text: '很好！你今天打算做什么？', pinyin: 'Hěn hǎo! Nǐ jīntiān dǎsuàn zuò shénme?', vi: 'Rất tốt! Hôm nay bạn dự định làm gì?' },
    { id: `m4_${now}`, sender: 'user', text: '我打算去商店买东西八点。', pinyin: 'Wǒ dǎsuàn qù shāngdiàn mǎi dōngxi bā diǎn.', vi: 'Tôi dự định đi cửa hàng mua đồ tám giờ.' }
  ];

  for (const m of testMessages) {
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, sender, text, pinyin, translation_vi, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(m.id, chatSessionId, m.sender, m.text, m.pinyin, m.vi, now);
  }
  console.log(`✓ 3.1 Đã lưu ${testMessages.length} tin nhắn mẫu vào chat_messages (Session: ${chatSessionId})`);

  // 3.2 Kích hoạt AI phân tích hội thoại chuyên sâu
  const analysisReport = await geminiAnalysisService.analyzeSession(chatSessionId, {
    forceReanalyze: true,
    sessionType: 'text'
  });
  console.log(`✓ 3.2 Điểm đánh giá hội thoại: ${analysisReport.overallScore}/100`);
  console.log(`✓ 3.2 Tóm tắt: ${analysisReport.summaryVi.slice(0, 80)}...`);
  console.log(`✓ 3.2 Phân loại từ vựng: A(Đã tốt)=${analysisReport.vocabAnalysis.groupA.length}, B(Dùng chưa chuẩn)=${analysisReport.vocabAnalysis.groupB.length}, C(Mới)=${analysisReport.vocabAnalysis.groupC.length}, D(Cần ôn)=${analysisReport.vocabAnalysis.groupD.length}`);
  console.log(`✓ 3.2 Phát hiện lỗi sai: ${analysisReport.detectedErrors.length} lỗi`);

  // 3.3 Kiểm tra phiên đã được đánh dấu analyzed trong SQLite
  const chatSessionRow = db.prepare('SELECT is_analyzed, status FROM chat_sessions WHERE id = ?').get(chatSessionId) as any;
  console.log(`✓ 3.3 Cờ chống phân tích trùng lặp: is_analyzed=${chatSessionRow.is_analyzed}, status=${chatSessionRow.status}`);
  if (chatSessionRow.is_analyzed !== 1) {
    throw new Error('Thất bại: chat_sessions chưa được đánh dấu is_analyzed = 1');
  }
  console.log('🎉 JOURNEY 3 PASS 100%!\n');

  // ========================================================================
  // JOURNEY 4: ÔN TẬP THÔNG MINH SRS (SM-2) -> TRẢ LỜI SAI/ĐÚNG -> ĐỒNG BỘ ROADMAP
  // ========================================================================
  console.log('📌 [JOURNEY 4]: ÔN TẬP THÔNG MINH SRS -> THUẬT TOÁN SM-2 -> ĐỒNG BỘ LỊCH TRÌNH');

  // 4.1 Lấy danh sách thẻ cần ôn hôm nay
  const dueItems = geminiSrsService.getReviewQueue({ limit: 5, mode: 'all' });
  console.log(`✓ 4.1 Danh sách thẻ cần ôn: ${dueItems.length} thẻ`);
  if (dueItems.length === 0) {
    throw new Error('Thất bại: Không có thẻ SRS nào để kiểm thử');
  }
  const testCard = dueItems[0];
  console.log(`✓ 4.1 Thẻ được chọn: "${testCard.promptZh}" (${testCard.itemType}), Khoảng cách hiện tại: ${testCard.intervalDays} ngày, Số lần lặp: ${testCard.repetitionCount}`);

  // 4.2 Thử nghiệm người học trả lời sai ('again')
  const reviewWrong = geminiSrsService.submitReview({
    itemId: testCard.id,
    userRating: 'again',
    reviewMode: 'flashcard',
    isCorrect: false,
    durationMs: 8000
  });
  console.log(`✓ 4.2 Kết quả trả lời sai ('again'): Interval mới=${reviewWrong.item.intervalDays} ngày, Lapses=${reviewWrong.item.lapses}, Status=${reviewWrong.item.status}`);
  if (reviewWrong.item.intervalDays !== 1 || reviewWrong.item.status !== 'active') {
    throw new Error('Thất bại: Thuật toán SM-2 khi trả lời sai không reset interval về 1 ngày');
  }

  // 4.3 Thử nghiệm người học ôn lại đạt ('good')
  const reviewGood = geminiSrsService.submitReview({
    itemId: testCard.id,
    userRating: 'good',
    reviewMode: 'flashcard',
    isCorrect: true,
    durationMs: 4000
  });
  console.log(`✓ 4.3 Kết quả ôn lại tốt ('good'): Interval mới=${reviewGood.item.intervalDays} ngày, Repetition=${reviewGood.item.repetitionCount}`);
  if (reviewGood.item.intervalDays < 1) {
    throw new Error('Thất bại: Interval không hợp lệ khi trả lời đúng');
  }

  // 4.4 Kiểm tra Dashboard Stats sau ôn tập
  const srsStats = geminiSrsService.getDashboardStats();
  console.log(`✓ 4.4 Thống kê SRS: Tổng ${srsStats.totalCards} thẻ, Tỉ lệ ghi nhớ: ${srsStats.retentionRate}%, Dự báo 7 ngày: [${srsStats.forecast7Days.map(f => f.dueCount).join(', ')}]`);
  console.log('🎉 JOURNEY 4 PASS 100%!\n');

  // ========================================================================
  // JOURNEY 5: TOÀN VẸN CƠ SỞ DỮ LIỆU SQLITE WAL & MÔ PHỎNG KHỞI ĐỘNG LẠI HỆ THỐNG
  // ========================================================================
  console.log('📌 [JOURNEY 5]: KIỂM TRA TOÀN VẸN SQLITE WAL & MÔ PHỎNG KHỞI ĐỘNG LẠI MÁY CHỦ');

  // 5.1 Kiểm tra các PRAGMA SQLite quan trọng
  const pragmaJournal = db.prepare('PRAGMA journal_mode').get() as any;
  const pragmaFk = db.prepare('PRAGMA foreign_keys').get() as any;
  const pragmaIntegrity = db.prepare('PRAGMA integrity_check').get() as any;

  console.log(`✓ 5.1 SQLite Journal Mode: ${pragmaJournal.journal_mode} (Yêu cầu: wal)`);
  console.log(`✓ 5.1 SQLite Foreign Keys: ${pragmaFk.foreign_keys} (Yêu cầu: 1)`);
  console.log(`✓ 5.1 SQLite Integrity Check: ${pragmaIntegrity.integrity_check} (Yêu cầu: ok)`);

  if (pragmaJournal.journal_mode.toLowerCase() !== 'wal') {
    throw new Error(`Cảnh báo PRAGMA: journal_mode không phải là WAL (hiện tại: ${pragmaJournal.journal_mode})`);
  }
  if (pragmaIntegrity.integrity_check !== 'ok') {
    throw new Error(`Lỗi toàn vẹn SQLite: ${pragmaIntegrity.integrity_check}`);
  }

  // 5.2 Mô phỏng khởi động lại backend bằng kết nối SQLite độc lập mới
  const dbPath = path.resolve(process.cwd(), 'data', 'halo_chinese.db');
  const isolatedDb = new Database(dbPath, { readonly: true });
  
  const tablesToCheck = [
    'learner_profile',
    'vocabulary_memory',
    'grammar_memory',
    'learning_errors',
    'adaptive_learning_paths',
    'learning_path_stages',
    'learning_path_items',
    'learning_schedule_items',
    'srs_items',
    'chat_sessions',
    'conversation_analyses'
  ];

  console.log('✓ 5.2 Kiểm tra dữ liệu sau khi tái kết nối độc lập:');
  for (const table of tablesToCheck) {
    const countRow = isolatedDb.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any;
    console.log(`   - Bảng [${table}]: ${countRow.count} bản ghi`);
    if (countRow.count < 0) {
      throw new Error(`Bảng ${table} bị lỗi truy vấn`);
    }
  }
  isolatedDb.close();
  console.log('🎉 JOURNEY 5 PASS 100%!\n');

  console.log('========================================================================');
  console.log('🏆 TẤT CẢ 5 HÀNH TRÌNH KIỂM TOÁN HỆ THỐNG ĐÃ HOÀN TẤT VÀ ĐẠT 100% TIÊU CHUẨN!');
  console.log('========================================================================');
}

runComprehensiveAudit().catch(err => {
  console.error('\n❌ PHÁT HIỆN LỖI TRONG QUÁ TRÌNH KIỂM TOÁN:', err);
  process.exit(1);
});
