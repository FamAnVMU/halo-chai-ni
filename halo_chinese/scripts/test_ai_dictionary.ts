import { db } from '../server/db';
import { geminiDictionaryService } from '../server/geminiDictionaryService';
import { tokenizeChinese, normalizePinyin, SEED_DICTIONARY_ENTRIES } from '../src/data/seedDictionary';

async function runAIDictionaryAudit() {
  console.log('========================================================================');
  console.log('📖 BẮT ĐẦU KIỂM TOÁN HỆ THỐNG TỪ ĐIỂN TIẾNG TRUNG THÔNG MINH TÍCH HỢP AI');
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
  // TEST 1: KIỂM TRA BẢNG CƠ SỞ DỮ LIỆU SQLITE & INDEXES
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 1]: KIỂM TRA CẤU TRÚC 3 BẢNG SQLITE & CHỈ MỤC');
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name IN ('dictionary_entries', 'dictionary_history', 'dictionary_personal_notes')
  `).all() as any[];
  assert(tableCheck.length === 3, `Đủ 3 bảng từ điển (dictionary_entries, dictionary_history, dictionary_personal_notes)`);

  const indexes = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('dictionary_entries', 'dictionary_history', 'dictionary_personal_notes')
  `).all() as any[];
  const indexNames = indexes.map(i => i.name);
  assert(indexNames.includes('idx_dict_simplified'), `Có index idx_dict_simplified`);
  assert(indexNames.includes('idx_dict_pinyin_clean'), `Có index idx_dict_pinyin_clean`);
  assert(indexNames.includes('idx_dict_hsk'), `Có index idx_dict_hsk`);
  assert(indexNames.includes('idx_dict_meaning'), `Có index idx_dict_meaning`);
  assert(indexNames.includes('idx_dict_history_created'), `Có index idx_dict_history_created`);
  assert(indexNames.includes('idx_dict_notes_entry'), `Có index idx_dict_notes_entry`);
  console.log('🎉 PHẦN 1 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 2: KIỂM TRA DỮ LIỆU SEED & KHỞI TẠO TỪ ĐIỂN
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 2]: KIỂM TRA DỮ LIỆU SEED VÀ KHỞI TẠO TỪ ĐIỂN');
  assert(SEED_DICTIONARY_ENTRIES.length >= 15, `Dữ liệu seed từ điển có ít nhất 15 từ chuẩn (Hiện có: ${SEED_DICTIONARY_ENTRIES.length})`);
  geminiDictionaryService.ensureSeedDictionary();

  const countRow = db.prepare('SELECT COUNT(*) as c FROM dictionary_entries').get() as { c: number };
  assert(countRow.c >= SEED_DICTIONARY_ENTRIES.length, `SQLite đã lưu trữ ${countRow.c} mục từ điển chuẩn`);
  console.log('🎉 PHẦN 2 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 3: TRA CỨU BẰNG CHỮ HÁN
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 3]: KIỂM TRA TRA CỨU BẰNG CHỮ HÁN');
  const hanziRes = await geminiDictionaryService.search({ query: '学习' });
  assert(hanziRes.results.length > 0, `Tìm kiếm "学习" trả về kết quả hợp lệ`);
  assert(hanziRes.results[0].simplified === '学习', `Mục đầu tiên là chính xác chữ "学习"`);
  assert(hanziRes.results[0].pinyin.includes('xué'), `Pinyin chính xác: ${hanziRes.results[0].pinyin}`);
  assert(hanziRes.results[0].meaningVi.includes('học'), `Nghĩa tiếng Việt chuẩn: "${hanziRes.results[0].meaningVi}"`);
  assert(hanziRes.detectedType === 'chinese', `Tự động nhận diện đúng loại "chinese"`);
  console.log('🎉 PHẦN 3 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 4: TRA CỨU BẰNG PINYIN (CÓ DẤU & KHÔNG DẤU TONE-AGNOSTIC)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 4]: KIỂM TRA TRA CỨU BẰNG PINYIN');
  const pinyinUnaccented = await geminiDictionaryService.search({ query: 'xuexi' });
  assert(pinyinUnaccented.results.length > 0, `Tìm kiếm Pinyin không dấu "xuexi" thành công`);
  assert(pinyinUnaccented.results.some(r => r.simplified === '学习'), `Kết quả chứa từ "学习"`);

  const pinyinAccented = await geminiDictionaryService.search({ query: 'xuéxí' });
  assert(pinyinAccented.results.length > 0, `Tìm kiếm Pinyin có dấu "xuéxí" thành công`);

  // Kiểm tra từ đa âm / đồng âm (ví dụ "kan")
  const pinyinKan = await geminiDictionaryService.search({ query: 'kan' });
  assert(pinyinKan.results.length >= 2, `Tìm Pinyin "kan" trả về cả 看 và 看见 thay vì chỉ 1 từ`);
  console.log('🎉 PHẦN 4 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 5: TRA CỨU BẰNG TIẾNG VIỆT
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 5]: KIỂM TRA TRA CỨU BẰNG TIẾNG VIỆT');
  const viRes = await geminiDictionaryService.search({ query: 'học tập' });
  assert(viRes.results.length > 0, `Tìm nghĩa tiếng Việt "học tập" thành công`);
  assert(viRes.results.some(r => r.simplified === '学习'), `Kết quả tiếng Việt dẫn tới chữ Hán "学习"`);
  assert(viRes.detectedType === 'vietnamese', `Tự động nhận diện chuẩn loại tiếng Việt`);
  console.log('🎉 PHẦN 5 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 6: TRA TỪ TRONG NGỮ CẢNH (IN-CONTEXT LOOKUP)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 6]: KIỂM TRA TRA CỨU THEO NGỮ CẢNH CỤ THỂ');
  const contextRes = await geminiDictionaryService.lookupInContext({
    sentence: '我每天在学校努力学习中文。',
    targetWord: '学习'
  });
  assert(contextRes.targetWord === '学习', `Từ mục tiêu phân tích đúng là "学习"`);
  assert(contextRes.contextualMeaningVi.length > 0, `Có nghĩa ngữ cảnh cụ thể: "${contextRes.contextualMeaningVi}"`);
  assert(contextRes.grammaticalRoleVi.length > 0, `Có xác định vai trò ngữ pháp: "${contextRes.grammaticalRoleVi}"`);
  assert(contextRes.reasonVi.length > 0, `Có lý do giải thích căn cứ chọn nghĩa: "${contextRes.reasonVi}"`);
  console.log('🎉 PHẦN 6 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 7: PHÂN BIỆT TỪ GẦN NGHĨA (CONFUSING WORDS COMPARISON)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 7]: KIỂM TRA PHÂN BIỆT TỪ GẦN NGHĨA');
  const compareRes = await geminiDictionaryService.compareWords(['看', '观看']);
  assert(compareRes.words.length === 2, `So sánh đủ 2 từ`);
  assert(compareRes.comparisonTable.length === 2, `Bảng so sánh có 2 hàng cho 看 và 观看`);
  assert(compareRes.differencesVi.length > 0, `Có nêu rõ điểm khác biệt cốt lõi: "${compareRes.differencesVi.slice(0, 60)}..."`);
  assert(compareRes.commonMistakesVi.length > 0, `Có cảnh báo lỗi sai người Việt hay mắc`);
  console.log('🎉 PHẦN 7 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 8: HỎI AI VỀ TỪ VỰNG (AI VOCABULARY CONSULTATION)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 8]: KIỂM TRA TƯ VẤN SƯ PHẠM TỪ VỰNG VỚI AI');
  const askExplain = await geminiDictionaryService.askAIAboutWord({
    word: '学习',
    promptType: 'simple_explain',
    userLevel: 2
  });
  assert(askExplain.contentVi.length > 0, `Nhận được nội dung giải thích dễ hiểu từ AI`);

  const askQuiz = await geminiDictionaryService.askAIAboutWord({
    word: '学习',
    promptType: 'sentence_quiz',
    userLevel: 2
  });
  assert(!!askQuiz.quizData || askQuiz.contentVi.length > 0, `Tạo bài tập kiểm tra trắc nghiệm thành công`);
  console.log('🎉 PHẦN 8 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 9: LƯU GHI CHÚ CÁ NHÂN & DANH SÁCH YÊU THÍCH
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 9]: KIỂM TRA GHI CHÚ CÁ NHÂN VÀ YÊU THÍCH');
  const noteRes = geminiDictionaryService.savePersonalNote({
    entryId: 'dict_xuexi',
    note: 'Mẹo nhớ: Học phải đi đôi với luyện tập!',
    tags: ['hsk1', 'động từ']
  });
  assert(noteRes.success, `Lưu ghi chú cá nhân thành công`);

  // Đảm bảo từ được yêu thích
  let favList = geminiDictionaryService.getFavorites();
  if (!favList.some(f => f.entryId === 'dict_xuexi')) {
    const favToggle = geminiDictionaryService.toggleFavorite('dict_xuexi');
    assert(favToggle.success, `Toggle yêu thích từ thành công`);
  }
  favList = geminiDictionaryService.getFavorites();
  assert(favList.some(f => f.entryId === 'dict_xuexi'), `Mục từ đã xuất hiện trong danh sách yêu thích`);
  console.log('🎉 PHẦN 9 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 10: ĐỒNG BỘ VÀO BỘ NHỚ HỌC TẬP (VOCABULARY_MEMORY)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 10]: KIỂM TRA ĐỒNG BỘ VÀO BỘ NHỚ HỌC TẬP DÀI HẠN');
  const syncMemRes = geminiDictionaryService.syncToLearnerMemory('dict_xuexi');
  assert(syncMemRes.success, `Đồng bộ vào vocabulary_memory thành công (memoryId=${syncMemRes.memoryId})`);

  const memCheck = db.prepare('SELECT count(*) as c FROM vocabulary_memory WHERE simplified = ?').get('学习') as { c: number };
  assert(memCheck.c === 1, `Từ "学习" hiện diện trong vocabulary_memory duy nhất 1 lần (chống trùng lặp)`);
  console.log('🎉 PHẦN 10 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 11: ĐỒNG BỘ VÀO HÀNG ĐỢI ÔN TẬP SRS (SM-2)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 11]: KIỂM TRA ĐỒNG BỘ VÀO HÀNG ĐỢI ÔN TẬP SRS (SM-2)');
  const syncSrsRes = geminiDictionaryService.syncToSrs('dict_xuexi');
  assert(syncSrsRes.success, `Đồng bộ thẻ vào SRS thành công (srsId=${syncSrsRes.srsId})`);

  const srsCheck = db.prepare('SELECT count(*) as c FROM srs_items WHERE unique_key = ?').get('dict_dict_xuexi') as { c: number };
  assert(srsCheck.c === 1, `Thẻ SRS hiện diện trong srs_items với unique_key chuẩn`);
  console.log('🎉 PHẦN 11 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 12: THUẬT TOÁN PHÂN ĐOẠN TỪ TIẾNG TRUNG (TOKENIZER FMM)
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 12]: KIỂM TRA PHÂN ĐOẠN TỪ TIẾNG TRUNG (CHINESE TOKENIZER)');
  const tokens = tokenizeChinese('我每天在学校努力学习中文。');
  assert(tokens.length > 0, `Phân đoạn câu thành các token`);
  const tokenWords = tokens.map(t => t.token);
  assert(tokenWords.includes('学习'), `Nhận diện chính xác từ ghép "学习"`);
  assert(tokenWords.includes('中文'), `Nhận diện chính xác từ ghép "中文"`);
  assert(tokenWords.includes('。'), `Bảo tồn chính xác dấu câu`);
  console.log('🎉 PHẦN 12 PASS 100%!\n');

  // ----------------------------------------------------------------------
  // TEST 13: LỊCH SỬ TRA CỨU
  // ----------------------------------------------------------------------
  console.log('📌 [PHẦN 13]: KIỂM TRA LỊCH SỬ TRA CỨU');
  const history = geminiDictionaryService.getHistory(5);
  assert(history.length >= 1, `Lịch sử tra cứu trả về bản ghi gần nhất (Hiện có: ${history.length})`);
  assert(history[0].query.length > 0, `Bản ghi lịch sử có thông tin truy vấn`);
  console.log('🎉 PHẦN 13 PASS 100%!\n');

  console.log('========================================================================');
  console.log(`🏆 TẤT CẢ ${totalTests}/${totalTests} BÀI TEST KIỂM TOÁN TỪ ĐIỂN AI ĐÃ VƯỢT QUA 100%!`);
  console.log('========================================================================\n');
}

runAIDictionaryAudit().catch((err) => {
  console.error('Lỗi kiểm toán từ điển:', err);
  process.exit(1);
});
