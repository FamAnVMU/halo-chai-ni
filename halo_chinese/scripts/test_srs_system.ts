import { geminiSrsService } from '../server/geminiSrsService.js';
import { db } from '../server/db.js';

async function runSrsTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG ÔN TẬP THÔNG MINH SRS');
  console.log('====================================================\n');

  // Test 1: Đồng bộ thẻ từ bộ nhớ
  console.log('--- TEST 1: SYNC CARDS FROM LONG-TERM MEMORY ---');
  const syncResult = geminiSrsService.syncCardsFromMemory();
  console.log('Kết quả đồng bộ:', syncResult);
  if (syncResult.totalCards <= 0) {
    throw new Error('Không có thẻ SRS nào được đồng bộ!');
  }
  console.log('✅ TEST 1 PASS: Đã đồng bộ thành công vào srs_items\n');

  // Test 2: Thống kê Dashboard
  console.log('--- TEST 2: DASHBOARD STATS ---');
  const stats = geminiSrsService.getDashboardStats();
  console.log('Stats:', {
    totalCards: stats.totalCards,
    dueToday: stats.dueToday,
    overdue: stats.overdue,
    newCards: stats.newCards,
    learning: stats.learning,
    mastered: stats.mastered,
    retentionRate: `${stats.retentionRate}%`,
    byType: stats.byType,
    forecastDaysCount: stats.forecast7Days.length
  });
  if (stats.totalCards <= 0 || stats.forecast7Days.length !== 7) {
    throw new Error('Lỗi dữ liệu thống kê Dashboard!');
  }
  console.log('✅ TEST 2 PASS: Dashboard stats tính toán chuẩn xác\n');

  // Test 3: Thuật toán SM-2 (SuperMemo-2)
  console.log('--- TEST 3: SM-2 MATHEMATICAL FORMULAS ---');
  
  // 3a. Good first review
  const sm2Good1 = geminiSrsService.calculateSM2(2.5, 0, 0, 0, 0, 'good', false);
  console.log('Good 1st review:', sm2Good1);
  if (sm2Good1.newInterval !== 1 || sm2Good1.newRepetition !== 1) {
    throw new Error('SM-2 Good 1st review sai interval!');
  }

  // 3b. Good second review
  const sm2Good2 = geminiSrsService.calculateSM2(sm2Good1.newEF, sm2Good1.newInterval, sm2Good1.newRepetition, sm2Good1.newLapses, sm2Good1.newStreak, 'good', false);
  console.log('Good 2nd review:', sm2Good2);
  if (sm2Good2.newInterval !== 6 || sm2Good2.newRepetition !== 2) {
    throw new Error('SM-2 Good 2nd review sai interval!');
  }

  // 3c. Good third review (In = In-1 * EF)
  const sm2Good3 = geminiSrsService.calculateSM2(sm2Good2.newEF, sm2Good2.newInterval, sm2Good2.newRepetition, sm2Good2.newLapses, sm2Good2.newStreak, 'good', false);
  console.log('Good 3rd review:', sm2Good3);
  if (sm2Good3.newInterval < 14) {
    throw new Error('SM-2 Good 3rd review sai interval!');
  }

  // 3d. Again review (reset to 1 day, lapses + 1, EF drops)
  const sm2Again = geminiSrsService.calculateSM2(2.5, 15, 3, 0, 3, 'again', false);
  console.log('Again review:', sm2Again);
  if (sm2Again.newRepetition !== 0 || sm2Again.newInterval !== 1 || sm2Again.newLapses !== 1 || sm2Again.newStreak !== 0) {
    throw new Error('SM-2 Again review không reset đúng!');
  }

  // 3e. Objective failure (isObjectiveFailed = true)
  const sm2ObjFail = geminiSrsService.calculateSM2(2.5, 15, 3, 0, 3, 'good', true);
  console.log('Objective fail review (forced again):', sm2ObjFail);
  if (sm2ObjFail.quality !== 1 || sm2ObjFail.newRepetition !== 0) {
    throw new Error('Objective failure không khóa chất lượng về 1!');
  }
  console.log('✅ TEST 3 PASS: Thuật toán SM-2 tính toán chuẩn xác và khách quan\n');

  // Test 4: Hàng đợi ôn tập thông minh (Priority Queue)
  console.log('--- TEST 4: REVIEW PRIORITY QUEUE ---');
  const queue = geminiSrsService.getReviewQueue({ limit: 10, mode: 'all' });
  console.log(`Lấy ${queue.length} thẻ từ hàng đợi. Thẻ đầu tiên:`, {
    id: queue[0]?.id,
    type: queue[0]?.itemType,
    promptZh: queue[0]?.promptZh,
    promptVi: queue[0]?.promptVi,
    lapses: queue[0]?.lapses,
    interval: queue[0]?.intervalDays
  });
  if (queue.length === 0) {
    throw new Error('Hàng đợi ôn tập không trả về thẻ!');
  }
  console.log('✅ TEST 4 PASS: Hàng đợi ưu tiên hoạt động tốt\n');

  // Test 5: Thực hiện gửi bài ôn tập (Submit Review)
  console.log('--- TEST 5: SUBMIT REVIEW & AUDIT TRAIL ---');
  const testCard = queue[0];
  const sess = geminiSrsService.startSession('test_run');
  console.log('Bắt đầu session:', sess.sessionId);

  const reviewResult = geminiSrsService.submitReview({
    itemId: testCard.id,
    userRating: 'good',
    reviewMode: 'flashcard',
    sessionId: sess.sessionId,
    isCorrect: true,
    durationMs: 4500
  });

  console.log('Kết quả submit review:', {
    success: reviewResult.success,
    itemId: reviewResult.item.id,
    newInterval: reviewResult.item.intervalDays,
    streak: reviewResult.item.streak,
    nextReviewFormatted: reviewResult.nextReviewFormatted
  });

  if (!reviewResult.success || reviewResult.item.intervalDays <= 0) {
    throw new Error('Gửi đánh giá SRS thất bại!');
  }

  // Kiểm tra nhật ký srs_review_logs
  const logRow = db.prepare('SELECT * FROM srs_review_logs WHERE item_id = ? ORDER BY id DESC LIMIT 1').get(testCard.id) as any;
  console.log('Log đã ghi vào SQLite:', {
    logId: logRow?.id,
    mode: logRow?.review_mode,
    quality: logRow?.quality,
    newInterval: logRow?.new_interval
  });
  if (!logRow || logRow.new_interval !== reviewResult.item.intervalDays) {
    throw new Error('Nhật ký srs_review_logs ghi nhận sai lệch!');
  }

  const finishedSess = geminiSrsService.finishSession(sess.sessionId, 12);
  console.log('Session hoàn thành:', finishedSess);
  console.log('✅ TEST 5 PASS: Đánh giá thẻ, nhật ký audit và kết thúc phiên hoàn tất\n');

  // Test 6: AI Exercise Fallback / Generation
  console.log('--- TEST 6: AI CONTEXT CHALLENGE GENERATOR ---');
  const aiExercise = await geminiSrsService.generateAIExercise(testCard.id);
  console.log('AI Exercise:', {
    itemId: aiExercise.itemId,
    type: aiExercise.questionType,
    prompt: aiExercise.prompt,
    contextZh: aiExercise.contextSentenceZh,
    correctAnswer: aiExercise.correctAnswer,
    optionsCount: aiExercise.options?.length
  });
  if (!aiExercise.prompt || !aiExercise.correctAnswer) {
    throw new Error('Sinh bài tập ngữ cảnh thất bại!');
  }
  console.log('✅ TEST 6 PASS: AI Context Challenge hoạt động tốt\n');

  console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ SRS ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
}

runSrsTests().catch(err => {
  console.error('❌ LỖI KIỂM THỬ SRS:', err);
  process.exit(1);
});
