import { db } from '../server/db';
import { geminiShadowingService } from '../server/geminiShadowingService';
import { SEED_SHADOWING_LESSONS, SHADOWING_LEVEL_TITLES } from '../src/data/seedShadowing';

async function runShadowingPracticeAudit() {
  console.log('========================================================================');
  console.log('🎧 BẮT ĐẦU KIỂM TOÁN HỆ THỐNG LUYỆN NÓI NHẠI TIẾNG TRUNG (CHINESE SHADOWING)');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`✓ [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // ----------------------------------------------------------------------
  // TEST 1: KIỂM TRA DỮ LIỆU SEED CỦA 7 CẤP ĐỘ SHADOWING
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 1]: KIỂM TRA TOÀN VẸN DỮ LIỆU SEED SHADOWING SYLLABUS');
  assert(SEED_SHADOWING_LESSONS.length >= 7, `Có ít nhất 7 bài mẫu chuẩn (Hiện có: ${SEED_SHADOWING_LESSONS.length})`);

  for (let lvl = 1; lvl <= 7; lvl++) {
    const hasLvl = SEED_SHADOWING_LESSONS.some(l => l.level === lvl);
    assert(hasLvl, `Cấp độ ${lvl} (${SHADOWING_LEVEL_TITLES[lvl as keyof typeof SHADOWING_LEVEL_TITLES]}) có bài seed mẫu`);
  }

  const allHaveChunks = SEED_SHADOWING_LESSONS.every(l => Array.isArray(l.chunks) && l.chunks.length > 0);
  assert(allHaveChunks, `Tất cả bài seed đều có cấu trúc phân tách cụm ý nghĩa (Thought Groups / 意群)`);

  const advancedLessons = SEED_SHADOWING_LESSONS.filter(l => l.level >= 5);
  const allHaveComprehension = advancedLessons.every(l => Array.isArray(l.comprehensionQuestions) && l.comprehensionQuestions.length > 0);
  assert(allHaveComprehension, `Các bài hội thoại và độc thoại (Level 5-7) đều có câu hỏi kiểm tra độ hiểu`);
  console.log('🎉 PHẦN 1 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 2: KIỂM TRA BẢNG CƠ SỞ DỮ LIỆU SQLITE & INDEXES
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 2]: KIỂM TRA CẤU TRÚC BẢNG DỮ LIỆU SQLITE');
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shadowing_lessons', 'shadowing_practice_records')
  `).all() as any[];
  assert(tableCheck.length === 2, `Cả 2 bảng shadowing (shadowing_lessons, shadowing_practice_records) đã tồn tại`);

  const indexes = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('shadowing_lessons', 'shadowing_practice_records')
  `).all() as any[];
  const indexNames = indexes.map(i => i.name);
  assert(indexNames.includes('idx_shadowing_level'), `Có index idx_shadowing_level`);
  assert(indexNames.includes('idx_shadowing_records_lesson'), `Có index idx_shadowing_records_lesson`);
  assert(indexNames.includes('idx_shadowing_records_created'), `Có index idx_shadowing_records_created`);
  console.log('🎉 PHẦN 2 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 3: KIỂM TRA SEED VÀO DATABASE & TRUY VẤN LESSONS
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 3]: KIỂM TRA SEED BÀI HỌC VÀ TRUY VẤN BACKEND');
  geminiShadowingService.ensureSeedLessons();

  const lessonsCount = db.prepare('SELECT count(*) as count FROM shadowing_lessons').get() as { count: number };
  assert(lessonsCount.count >= 7, `Database SQLite đã lưu trữ ít nhất 7 bài học shadowing (Hiện có: ${lessonsCount.count})`);

  const lvl3Lessons = geminiShadowingService.getLessons({ level: 3 });
  assert(lvl3Lessons.length > 0, `Truy vấn lọc theo Level 3 trả về kết quả hợp lệ`);
  assert(lvl3Lessons[0].level === 3, `Bài học lọc chính xác level 3`);

  const lessonDetail = geminiShadowingService.getLessonById(lvl3Lessons[0].id);
  assert(!!lessonDetail, `Truy vấn chi tiết getLessonById thành công`);
  assert(Array.isArray(lessonDetail!.chunks) && lessonDetail!.chunks.length > 0, `Chi tiết bài học parse JSON chunks thành công`);
  console.log('🎉 PHẦN 3 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 4: KIỂM TRA ĐÁNH GIÁ 3 LỚP TRUNG THỰC (HONEST 3-LAYER EVALUATION)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 4]: KIỂM TRA ĐÁNH GIÁ 3 LỚP KHÔNG ĐIỂM ẢO');
  const targetLesson = lvl3Lessons[0];
  const calculatedDuration = targetLesson.fullZh.length * 380;
  
  const evalResult = await geminiShadowingService.evaluate({
    lessonId: targetLesson.id,
    targetText: targetLesson.fullZh,
    targetPinyin: targetLesson.fullPinyin,
    mode: 'delayed',
    practiceStep: 4,
    spokenTranscript: targetLesson.fullZh, // Phát âm chuẩn
    audioDurationMs: Math.round(calculatedDuration * 0.95), // Vừa chuẩn tốc độ
    expectedDurationMs: calculatedDuration,
    speedUsed: 1.0
  });

  assert(typeof evalResult.score === 'number' && evalResult.score >= 0 && evalResult.score <= 100, `Điểm tổng hợp nằm trong dải [0-100]: ${evalResult.score}`);
  assert(evalResult.audioMetrics !== undefined, `Có audioMetrics riêng biệt`);
  assert(evalResult.audioMetrics.speedPacing === 'natural', `Tốc độ 95% khớp -> đánh giá speedPacing là natural`);
  assert(evalResult.feedbackVi.length > 0, `Có lời khuyên sư phạm chi tiết: "${evalResult.feedbackVi}"`);
  assert(typeof evalResult.recordId === 'string' && evalResult.recordId.startsWith('sh_rec_'), `Đã lưu bản ghi luyện tập vào SQLite id=${evalResult.recordId}`);

  // Test một lượt đọc quá nhanh
  const fastEvalResult = await geminiShadowingService.evaluate({
    lessonId: targetLesson.id,
    targetText: targetLesson.fullZh,
    targetPinyin: targetLesson.fullPinyin,
    mode: 'simultaneous',
    practiceStep: 4,
    spokenTranscript: '我去', // Đọc sót
    audioDurationMs: Math.round(calculatedDuration * 0.4), // 40% thời lượng -> quá nhanh
    expectedDurationMs: calculatedDuration,
    speedUsed: 1.0
  });
  assert(fastEvalResult.audioMetrics.speedPacing === 'too_fast', `Thời lượng quá ngắn -> nhận diện chuẩn xác 'too_fast'`);
  assert(fastEvalResult.score < evalResult.score, `Lượt đọc thiếu chữ và quá nhanh nhận điểm thấp hơn (${fastEvalResult.score} < ${evalResult.score})`);
  console.log('🎉 PHẦN 4 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 5: KIỂM TRA ĐỒNG BỘ VÀO BỘ NHỚ SRS (SPACED REPETITION)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 5]: KIỂM TRA LIÊN THÔNG VỚI BỘ NHỚ ÔN TẬP SRS');
  const srsSyncResult = geminiShadowingService.syncToSrs({
    lessonId: targetLesson.id,
    chunkId: targetLesson.chunks[0]?.id,
    zh: targetLesson.chunks[0]?.chunkZh || targetLesson.fullZh,
    pinyin: targetLesson.chunks[0]?.chunkPinyin || targetLesson.fullPinyin,
    vi: targetLesson.chunks[0]?.chunkVi || targetLesson.fullVi
  });
  assert(srsSyncResult.success, `Đồng bộ bài học vào SRS thành công (srsId=${srsSyncResult.srsId})`);

  const srsCheck = db.prepare(`
    SELECT count(*) as c FROM srs_items WHERE prompt_zh LIKE ?
  `).get(`%${targetLesson.chunks[0]?.chunkZh.slice(0, 3)}%`) as { c: number };
  assert(srsCheck.c > 0, `Mục ôn tập đã hiện diện trong bảng srs_items`);
  console.log('🎉 PHẦN 5 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 6: KIỂM TRA THỐNG KÊ & LỊCH SỬ LUYỆN TẬP
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 6]: KIỂM TRA THỐNG KÊ VÀ LỊCH SỬ LUYỆN TẬP');
  const stats = geminiShadowingService.getStats();
  assert(stats.totalSessions >= 2, `Tổng số lượt luyện tập ghi nhận đúng (Hiện có: ${stats.totalSessions})`);
  assert(typeof stats.averageScore === 'number' && stats.averageScore > 0, `Điểm trung bình được tính toán hợp lệ: ${stats.averageScore}`);
  assert(stats.practicedLevelsCount >= 1, `Phân bố theo cấp độ có ghi nhận ít nhất 1 level`);

  const history = geminiShadowingService.getHistory(5);
  assert(history.length >= 2, `Lịch sử trả về ít nhất 2 bản ghi gần nhất`);
  assert(history[0].lessonTitle !== undefined, `Lịch sử có thông tin tiêu đề bài học tham chiếu`);
  console.log('🎉 PHẦN 6 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 7: KIỂM TRA TẠO BÀI HỌC CÁ NHÂN HOÁ BẰNG AI / FALLBACK
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 7]: KIỂM TRA SINH BÀI HỌC CÁ NHÂN HOÁ');
  const genResult = await geminiShadowingService.generatePersonalizedLesson('default');
  assert(genResult.success, `Tạo bài học mới thành công`);
  assert(typeof genResult.lesson?.id === 'string', `Bài học có id hợp lệ: ${genResult.lesson?.id}`);
  assert(Array.isArray(genResult.lesson?.chunks) && genResult.lesson?.chunks.length > 0, `Bài học sinh ra có phân đoạn chunks đầy đủ`);

  // Kiểm tra bài học vừa sinh đã được lưu vào database chưa
  const savedLesson = geminiShadowingService.getLessonById(genResult.lesson.id);
  assert(!!savedLesson, `Bài học cá nhân hoá được lưu vào SQLite shadowing_lessons thành công`);
  console.log('🎉 PHẦN 7 PASS 100%!\n');

  console.log('========================================================================');
  console.log(`🏆 TẤT CẢ ${totalTests}/${totalTests} BÀI TEST KIỂM TOÁN SHADOWING ĐÃ VƯỢT QUA 100%!`);
  console.log('========================================================================\n');
}

runShadowingPracticeAudit().catch(err => {
  console.error('Lỗi kiểm toán:', err);
  process.exit(1);
});
