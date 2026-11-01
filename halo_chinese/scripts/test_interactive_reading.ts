import { db } from '../server/db.js';
import { geminiReadingService } from '../server/geminiReadingService.js';
import { SEED_READING_PASSAGES } from '../src/data/seedReading.js';

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, message: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runReadingAudit() {
  console.log('========================================================================');
  console.log('       INTERACTIVE CHINESE READING SYSTEM COMPREHENSIVE AUDIT           ');
  console.log('========================================================================');

  // [1] Khởi tạo dữ liệu seed và schema bảng
  console.log('\n[1] Kiểm tra Database Schema & Seed Passages Initialization:');
  geminiReadingService.ensureSeedPassages();

  const passageCountRow = db.prepare('SELECT COUNT(*) as count FROM reading_passages').get() as any;
  assert(passageCountRow.count >= SEED_READING_PASSAGES.length, `Đã nạp ít nhất ${SEED_READING_PASSAGES.length} bài đọc mẫu vào SQLite (hiện có: ${passageCountRow.count})`);

  const sentenceCountRow = db.prepare('SELECT COUNT(*) as count FROM reading_passage_sentences').get() as any;
  assert(sentenceCountRow.count > 0, `Đã phân đoạn và lưu các câu văn vào reading_passage_sentences (hiện có: ${sentenceCountRow.count})`);

  // [2] Thư viện bài đọc: Phân trang & Tìm kiếm
  console.log('\n[2] Kiểm tra Mở Thư Viện Bài Đọc & Phân Trang:');
  const allPassages = geminiReadingService.getPassages({ page: 1, limit: 10 });
  assert(allPassages.total >= 5, `Tổng số bài đọc hợp lệ: ${allPassages.total}`);
  assert(allPassages.passages.length > 0, `Lấy danh sách bài đọc trang 1 thành công (${allPassages.passages.length} bài)`);
  assert(typeof allPassages.passages[0].titleZh === 'string', `Mỗi bài đọc đều có tiêu đề chữ Hán: "${allPassages.passages[0].titleZh}"`);

  // [3] Lọc bài theo trình độ (Level Filtering)
  console.log('\n[3] Kiểm tra Lọc Bài Đọc Theo Trình Độ (HSK 1 - 5):');
  const hsk1List = geminiReadingService.getPassages({ level: 'hsk1' });
  assert(hsk1List.passages.every((p) => p.hskLevel === 1), `Tất cả bài trong bộ lọc HSK 1 đều có hsk_level = 1`);

  const hsk3List = geminiReadingService.getPassages({ level: 'hsk3' });
  assert(hsk3List.passages.every((p) => p.hskLevel === 3), `Tất cả bài trong bộ lọc HSK 3 đều có hsk_level = 3`);

  // [4] Lọc bài theo chủ đề (Topic Filtering)
  console.log('\n[4] Kiểm tra Lọc Bài Đọc Theo Chủ Đề:');
  const foodList = geminiReadingService.getPassages({ topic: 'food' });
  assert(foodList.passages.length > 0, `Tìm thấy bài đọc chủ đề ẩm thực food (${foodList.passages[0].titleZh})`);
  assert(foodList.passages[0].topic === 'food', 'Bài đọc lọc đúng trường topic = food');

  // [5] Tìm kiếm bài đọc bằng chữ Hán, Pinyin hoặc tiếng Việt
  console.log('\n[5] Kiểm tra Tìm Kiếm Bài Đọc Đa Dạng:');
  const searchZh = geminiReadingService.getPassages({ search: '朋友' });
  assert(searchZh.passages.length > 0, `Tìm kiếm theo chữ Hán "朋友" thành công`);

  const searchPinyin = geminiReadingService.getPassages({ search: 'Zhōngqiūjié' });
  assert(searchPinyin.passages.length > 0, `Tìm kiếm theo Pinyin "Zhōngqiūjié" thành công`);

  const searchVi = geminiReadingService.getPassages({ search: 'Trung Thu' });
  assert(searchVi.passages.length > 0, `Tìm kiếm theo tiếng Việt "Trung Thu" thành công`);

  // [6] Chi tiết bài đọc & Phân đoạn câu (Sentence Segmentation)
  console.log('\n[6] Kiểm tra Chi Tiết Bài Đọc & Phân Đoạn Câu Văn:');
  const detail = geminiReadingService.getPassageById('reading_hsk1_friend');
  assert(detail.id === 'reading_hsk1_friend', 'Lấy đúng ID bài đọc HSK 1');
  assert(detail.sentences.length >= 4, `Bài đọc đã được chia thành các câu đơn vị (${detail.sentences.length} câu)`);
  assert(detail.sentences[0].sentenceZh.length > 0, 'Câu văn có chữ Hán đầy đủ');
  assert(detail.sentences[0].sentencePinyin.length > 0, 'Câu văn có Pinyin đầy đủ');
  assert(detail.sentences[0].sentenceVi.length > 0, 'Câu văn có bản dịch tiếng Việt tương ứng');

  // [7] Bật / Tắt Bookmark Yêu Thích & Ghi Chú
  console.log('\n[7] Kiểm tra Đánh Dấu Yêu Thích & Ghi Chú Bài Đọc:');
  const bm1 = geminiReadingService.toggleBookmark('reading_hsk1_friend', true, 'Bài đọc rất hay về bạn bè');
  assert(bm1.isFavorite === true, 'Đã bật cờ yêu thích bài đọc');
  assert(bm1.notes === 'Bài đọc rất hay về bạn bè', 'Đã lưu ghi chú cá nhân thành công');

  const checkPassageFav = geminiReadingService.getPassageById('reading_hsk1_friend');
  assert(checkPassageFav.isFavorite === true, 'Chi tiết bài đọc phản ánh đúng trạng thái yêu thích');
  assert(checkPassageFav.personalNotes === 'Bài đọc rất hay về bạn bè', 'Chi tiết bài đọc trả về đúng ghi chú');

  // [8] Phân tích ngữ pháp chuyên sâu cho câu văn
  console.log('\n[8] Kiểm tra Giải Thích Ngữ Pháp Câu Văn Bằng AI:');
  const grammarRes = await geminiReadingService.explainSentenceOrGrammar({
    passageId: 'reading_hsk1_friend',
    sentenceZh: '我们常常一起去图书馆看书，一起喝茶。',
    sentencePinyin: 'Wǒmen chángcháng yìqǐ qù túshūguǎn kàn shū, yìqǐ hē chá.',
    sentenceVi: 'Chúng tôi thường cùng nhau đến thư viện đọc sách, cùng nhau uống trà.',
    contextPassage: detail.fullContentZh,
  });
  assert(typeof grammarRes.keyGrammarPoint === 'string' && grammarRes.keyGrammarPoint.length > 0, `Điểm ngữ pháp then chốt: ${grammarRes.keyGrammarPoint}`);
  assert(typeof grammarRes.detailedExplanationVi === 'string', 'Có lời giải thích ngữ pháp chi tiết bằng tiếng Việt');

  // [9] Đánh giá câu hỏi đọc hiểu (Trắc nghiệm & Tự do)
  console.log('\n[9] Kiểm tra Đánh Giá Câu Trả Lời Đọc Hiểu:');
  // Trắc nghiệm đúng
  const q1Eval = await geminiReadingService.evaluateComprehensionAnswer({
    passageId: 'reading_hsk1_friend',
    questionId: 'q_hsk1_friend_1',
    questionText: '李明今年多大？',
    questionType: 'single_choice',
    expectedAnswer: 1,
    citationText: '他是中国人，今年二十岁。',
    userAnswer: 1,
  });
  assert(q1Eval.isCorrect === true, 'Chấm trắc nghiệm: Học viên chọn đáp án 1 (20 tuổi) -> ĐÚNG (100%)');
  assert(q1Eval.citationText.includes('二十岁'), 'Phản hồi kèm trích dẫn căn cứ trong bài');

  // Trắc nghiệm sai
  const q1EvalWrong = await geminiReadingService.evaluateComprehensionAnswer({
    passageId: 'reading_hsk1_friend',
    questionId: 'q_hsk1_friend_1',
    questionText: '李明今年多大？',
    questionType: 'single_choice',
    expectedAnswer: 1,
    citationText: '他是中国人，今年二十岁。',
    userAnswer: 0,
  });
  assert(q1EvalWrong.isCorrect === false, 'Chấm trắc nghiệm: Học viên chọn đáp án 0 (18 tuổi) -> SAI');

  // Câu hỏi tự do (Free-text)
  const q3Eval = await geminiReadingService.evaluateComprehensionAnswer({
    passageId: 'reading_hsk1_friend',
    questionId: 'q_hsk1_friend_3',
    questionText: 'Hai người bạn thường làm những việc gì cùng nhau tại thư viện?',
    questionType: 'free_text_vi',
    expectedAnswer: 'Đọc sách và uống trà',
    citationText: '我们常常一起去图书馆看书，一起喝茶。',
    userAnswer: 'Họ cùng đọc sách xem sách và uống trà với nhau',
  });
  assert(q3Eval.isCorrect === true, `Chấm câu hỏi tự luận mềm dẻo bằng AI: Học viên trả lời tương đương -> ĐÚNG (${q3Eval.scorePercent}%)`);

  // [10] Cầu nối chuyển câu sang Shadowing (1-Click Bridge to Shadowing)
  console.log('\n[10] Kiểm tra Cầu Nối Chuyển Câu Sang Shadowing Practice:');
  const shadowBridge = geminiReadingService.syncSentenceToShadowing('reading_hsk1_friend', 3);
  assert(shadowBridge.success === true, 'Tạo bài tập Shadowing từ câu bài đọc thành công');
  assert(shadowBridge.shadowingLessonId.startsWith('shadowing_from_read_'), `ID bài Shadowing: ${shadowBridge.shadowingLessonId}`);

  // Kiểm tra bảng shadowing_lessons trong SQLite
  const shadowLesson = db.prepare('SELECT * FROM shadowing_lessons WHERE id = ?').get(shadowBridge.shadowingLessonId) as any;
  assert(shadowLesson !== undefined, 'Bài Shadowing đã được ghi trực tiếp vào SQLite shadowing_lessons');
  assert(shadowLesson.full_zh === '我们常常一起去图书馆看书，一起喝茶。', 'Nội dung câu tiếng Trung đồng bộ nguyên vẹn');

  // [11] Lưu từ vựng từ bài đọc vào Bộ nhớ & Hàng đợi SRS (SM-2)
  console.log('\n[11] Kiểm tra Đồng Bộ Từ Vựng Vào Bộ Nhớ Học Tập & SRS:');
  const syncWord = geminiReadingService.syncWordToMemoryAndSrs('图书馆', 'túshūguǎn', 'thư viện', 2);
  assert(syncWord.success === true, 'Đồng bộ từ "图书馆" thành công');

  const vocabMem = db.prepare('SELECT * FROM vocabulary_memory WHERE simplified = ?').get('图书馆') as any;
  assert(vocabMem !== undefined, 'Từ đã được ghi nhận trong vocabulary_memory');

  const srsItem = db.prepare('SELECT * FROM srs_items WHERE id = ?').get('srs_read_图书馆') as any;
  assert(srsItem !== undefined, 'Thẻ ôn tập đã được thêm vào srs_items theo chuẩn SuperMemo SM-2');
  assert(srsItem.ease_factor === 2.5, 'Khởi tạo Ease Factor chuẩn SM-2 = 2.5');

  // [12] Lưu phiên đọc (Reading Session & Analytics)
  console.log('\n[12] Kiểm tra Ghi Nhận Phiên Đọc & Cập Nhật Tiến Độ:');
  const sessionResult = await geminiReadingService.submitReadingSession({
    passageId: 'reading_hsk1_friend',
    mode: 'intensive',
    timeSpentSeconds: 90,
    answers: [
      { questionId: 'q_hsk1_friend_1', questionType: 'single_choice', userAnswer: '1', isCorrect: true },
      { questionId: 'q_hsk1_friend_2', questionType: 'true_false', userAnswer: '1', isCorrect: true },
      { questionId: 'q_hsk1_friend_3', questionType: 'free_text_vi', userAnswer: 'Đọc sách uống trà', isCorrect: true },
    ],
    lookedUpWords: ['图书馆', '常常'],
    savedWords: ['图书馆'],
  });

  assert(sessionResult.scorePercent === 100, 'Điểm số đọc hiểu đạt 100%');
  assert(sessionResult.readingSpeedWpm > 0, `Tốc độ đọc tính toán: ${sessionResult.readingSpeedWpm} từ/phút (WPM)`);
  assert(sessionResult.recommendation.length > 0, 'Có đề xuất sư phạm tiếp theo sau khi đọc');

  // Kiểm tra lưu trong SQLite reading_sessions
  const sessRow = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(sessionResult.sessionId) as any;
  assert(sessRow !== undefined, 'Phiên đọc được lưu vĩnh viễn trong SQLite reading_sessions');
  assert(sessRow.passage_id === 'reading_hsk1_friend', 'Ghi đúng passage_id');

  // [13] Thống kê luyện đọc tổng thể (Reading Analytics)
  console.log('\n[13] Kiểm tra Thống Kê Tổng Thể Luyện Đọc:');
  const statsRes = geminiReadingService.getReadingStats();
  assert(statsRes.totalPassages >= 5, `Tổng số bài đọc: ${statsRes.totalPassages}`);
  assert(statsRes.totalSessions >= 1, `Tổng số phiên học đọc: ${statsRes.totalSessions}`);
  assert(statsRes.averageComprehensionScore > 0, `Điểm hiểu trung bình: ${statsRes.averageComprehensionScore}%`);

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks} / ${totalChecks} (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  console.log(`FAILED: ${totalChecks - passedChecks} / ${totalChecks}`);
  if (passedChecks === totalChecks) {
    console.log('AUDIT VERDICT: INTERACTIVE CHINESE READING SYSTEM READY FOR PRODUCTION');
  } else {
    console.log('AUDIT VERDICT: SOME CHECKS FAILED');
  }
  console.log('========================================================================\n');
}

runReadingAudit().catch((err) => {
  console.error('Audit exception:', err);
  process.exit(1);
});
