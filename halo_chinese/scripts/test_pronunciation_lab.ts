import { db } from '../server/db';
import { geminiPronunciationService } from '../server/geminiPronunciationService';
import {
  INITIALS_DATA,
  FINALS_DATA,
  TONES_DATA,
  TONE_SANDHI_RULES,
  MINIMAL_PAIRS_DATA,
  PINYIN_SYLLABLES_DATA,
  WORD_PRACTICE_DATA,
  SENTENCE_PRACTICE_DATA,
  ASSESSMENT_QUESTIONS_DATA
} from '../src/data/seedPronunciation';

async function runPronunciationLabAudit() {
  console.log('========================================================================');
  console.log('🎙️ BẮT ĐẦU KIỂM TOÁN HỆ THỐNG PHÒNG LUYỆN PHÁT ÂM TIẾNG TRUNG THÔNG MINH');
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
  // TEST 1: KIỂM TRA DỮ LIỆU SEED CỦA 10 CHẾ ĐỘ PHÒNG LUYỆN
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 1]: KIỂM TRA TOÀN VẸN DỮ LIỆU SEED SYLLABUS');
  assert(INITIALS_DATA.length === 21, `21 Thanh mẫu đạt chuẩn (Hiện có: ${INITIALS_DATA.length})`);
  assert(FINALS_DATA.length === 36, `36 Vận mẫu đạt chuẩn (Hiện có: ${FINALS_DATA.length})`);
  assert(TONES_DATA.length >= 4, `Đủ 4 thanh điệu chính và thanh nhẹ (Hiện có: ${TONES_DATA.length})`);
  assert(TONE_SANDHI_RULES.length === 4, `4 Quy tắc biến điệu trọng yếu (Hiện có: ${TONE_SANDHI_RULES.length})`);
  assert(MINIMAL_PAIRS_DATA.length === 10, `10 Cặp âm dễ nhầm của người Việt (Hiện có: ${MINIMAL_PAIRS_DATA.length})`);
  assert(PINYIN_SYLLABLES_DATA.length >= 10, `Dữ liệu ghép âm tiết Pinyin cơ bản (Hiện có: ${PINYIN_SYLLABLES_DATA.length})`);
  assert(WORD_PRACTICE_DATA.length >= 8, `Từ vựng HSK trọng tâm (Hiện có: ${WORD_PRACTICE_DATA.length})`);
  assert(SENTENCE_PRACTICE_DATA.length >= 4, `Câu hoàn chỉnh có ngắt nghỉ (Hiện có: ${SENTENCE_PRACTICE_DATA.length})`);
  assert(ASSESSMENT_QUESTIONS_DATA.length === 5, `Bộ đề kiểm tra chẩn đoán 5 câu (Hiện có: ${ASSESSMENT_QUESTIONS_DATA.length})`);
  console.log('🎉 PHẦN 1 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 2: KIỂM TRA BẢNG CƠ SỞ DỮ LIỆU SQLITE
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 2]: KIỂM TRA CẤU TRÚC BẢNG DỮ LIỆU SQLITE');
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name IN ('pronunciation_records', 'pronunciation_weaknesses')
  `).all() as any[];
  assert(tableCheck.length === 2, `Cả 2 bảng phát âm (pronunciation_records, pronunciation_weaknesses) đã tồn tại`);

  const indexes = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('pronunciation_records', 'pronunciation_weaknesses')
  `).all() as any[];
  assert(indexes.length >= 3, `Đầy đủ 3 chỉ mục tối ưu truy vấn (idx_pronounce_user_mode, idx_pronounce_created, idx_pronounce_weak_sound)`);
  console.log('🎉 PHẦN 2 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 3: ĐÁNH GIÁ PHÁT ÂM 3 LỚP (ACOUSTIC + ASR + PEDAGOGICAL AI)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 3]: ĐÁNH GIÁ PHÁT ÂM 3 LỚP TRUNG THỰC');
  // Scenario A: Phát âm chuẩn hoàn hảo
  const evalGood = await geminiPronunciationService.evaluate({
    targetText: '苹果',
    targetPinyin: 'píngguǒ',
    targetType: 'word',
    mode: 'words',
    spokenTranscript: '苹果',
    audioDurationMs: 1100,
    expectedDurationMs: 1000
  });

  assert(evalGood.score >= 80, `Điểm số bài phát âm tốt đạt >= 80 (Thực tế: ${evalGood.score})`);
  assert(evalGood.isMatch === true, `isMatch phải là true khi khớp từ`);
  assert(evalGood.audioMetrics.speedPacing === 'natural', `Nhịp điệu tự nhiên (speedPacing: ${evalGood.audioMetrics.speedPacing})`);
  assert(evalGood.wordAnalysis.every(w => w.status === 'correct'), `Tất cả ký tự đều đúng status 'correct'`);
  assert(typeof evalGood.toneFeedbackVi === 'string' && evalGood.toneFeedbackVi.length > 0, `Có nhận xét thanh điệu tiếng Việt`);
  assert(typeof evalGood.phoneticFeedbackVi === 'string' && evalGood.phoneticFeedbackVi.length > 0, `Có hướng dẫn khẩu hình & luồng hơi`);

  // Scenario B: Phát âm lệch / thay thế âm
  const evalFlawed = await geminiPronunciationService.evaluate({
    targetText: '知道',
    targetPinyin: 'zhīdào',
    targetType: 'contrast_pair',
    mode: 'minimal_pairs',
    spokenTranscript: '自到', // Lỗi thẳng lưỡi z thay vì uốn lưỡi zh
    audioDurationMs: 2500, // Đọc quá chậm
    expectedDurationMs: 1000
  });

  assert(evalFlawed.isMatch === false, `isMatch là false khi phát âm lệch`);
  assert(evalFlawed.audioMetrics.speedPacing === 'too_slow', `Nhận diện chính xác tốc độ quá chậm (too_slow)`);
  assert(evalFlawed.score < 80, `Điểm số phản ánh đúng độ sai lệch (Điểm: ${evalFlawed.score})`);
  assert(evalFlawed.wordAnalysis.some(w => w.status === 'substituted'), `Phát hiện ký tự bị thay thế (substituted)`);
  console.log('🎉 PHẦN 3 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 4: LIÊN THÔNG VÀ LƯU TRỮ VÀO BỘ NHỚ LỖI SAI & ĐIỂM YẾU
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 4]: ĐỒNG BỘ ĐIỂM YẾU VÀO SQLITE & SỔ TAY LỖI SAI');
  const weaknessRow = db.prepare(`
    SELECT * FROM pronunciation_weaknesses WHERE sound_key = ?
  `).get('zh') as any;

  assert(Boolean(weaknessRow), `Tự động tạo bản ghi điểm yếu cho âm 'zh' trong pronunciation_weaknesses`);
  assert(weaknessRow.error_count >= 1, `Ghi nhận số lần mắc lỗi (error_count: ${weaknessRow.error_count})`);

  // Kiểm tra liên thông sang learning_errors
  const errorRow = db.prepare(`
    SELECT * FROM learning_errors WHERE error_type = 'pronunciation' AND corrected_sentence LIKE '%知道%'
  `).get() as any;
  assert(Boolean(errorRow), `Tự động đồng bộ lỗi phát âm vào bảng learning_errors chung của ứng dụng`);
  console.log('🎉 PHẦN 4 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 5: THỐNG KÊ DASHBOARD & LỊCH SỬ LUYỆN TẬP
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 5]: DASHBOARD THỐNG KÊ & LỊCH SỬ PHÁT ÂM');
  const stats = geminiPronunciationService.getStats();
  assert(stats.totalPractices >= 2, `Thống kê tổng lượt luyện tập (totalPractices: ${stats.totalPractices})`);
  assert(stats.accuracyAverage > 0, `Độ chuẩn trung bình tính chính xác (accuracyAverage: ${stats.accuracyAverage}%)`);
  assert(stats.strugglingSoundsCount >= 1, `Có danh sách âm yếu cần cải thiện (strugglingSoundsCount: ${stats.strugglingSoundsCount})`);

  const history = geminiPronunciationService.getHistory(5);
  assert(history.length >= 2, `Lấy được danh sách lịch sử gần nhất (Số bản ghi: ${history.length})`);
  assert(history[0].id.startsWith('pr_'), `ID bản ghi phát âm chuẩn định dạng 'pr_'`);

  // Xóa thử 1 bản ghi lịch sử
  const recordToDelete = history[0].id;
  const deleteSuccess = geminiPronunciationService.deleteRecord(recordToDelete);
  assert(deleteSuccess === true, `Xóa bản ghi lịch sử thành công`);
  console.log('🎉 PHẦN 5 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 6: AI SINH BÀI LUYỆN CÁ NHÂN HÓA TỪ ĐIỂM YẾU
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 6]: AI SINH BÀI LUYỆN CÁ NHÂN HÓA TỪ ĐIỂM YẾU');
  const personalized = await geminiPronunciationService.generatePersonalizedDrills('default');
  assert(personalized.success === true, `Sinh bài luyện cá nhân hóa thành công`);
  assert(personalized.drills.length >= 3, `Số bài luyện cá nhân hóa đạt >= 3 (Thực tế: ${personalized.drills.length})`);
  assert(personalized.focusAreas.length > 0, `Có danh sách trọng tâm luyện tập`);
  console.log(`✓ Trọng tâm phát âm được cá nhân hóa: ${personalized.focusAreas.join(', ')}`);
  console.log('🎉 PHẦN 6 PASS 100%!\n');

  console.log('========================================================================');
  console.log(`🏆 TẤT CẢ ${passedTests}/${totalTests} BÀI KIỂM TOÁN PHÒNG LUYỆN PHÁT ÂM ĐÃ HOÀN TẤT THÀNH CÔNG 100%!`);
  console.log('========================================================================');
}

runPronunciationLabAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
