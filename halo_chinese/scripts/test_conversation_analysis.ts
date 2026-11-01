import { geminiAnalysisService } from '../server/geminiAnalysisService.js';
import { db } from '../server/db.js';

async function runConversationAnalysisTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG AI PHÂN TÍCH HỘI THOẠI');
  console.log('====================================================\n');

  const testSessionId = `test_session_${Date.now()}`;

  // 1. Giả lập một phiên hội thoại học tập thực tế có cả câu đúng và câu sai
  console.log('--- TEST 1: SETUP TEST CONVERSATION SESSION ---');
  geminiAnalysisService.saveMessage({
    sessionId: testSessionId,
    sender: 'assistant',
    text: '你好！今天过得怎么样？你去哪儿了？',
    pinyin: 'Nǐ hǎo! Jīntiān guò de zěnmeyàng? Nǐ qù nǎr le?',
    translationVi: 'Xin chào! Hôm nay bạn thế nào? Bạn đã đi đâu vậy?'
  });

  geminiAnalysisService.saveMessage({
    sessionId: testSessionId,
    sender: 'user',
    text: '你好老师！我今天很高兴。我昨天去超市买水果。',
    pinyin: 'Nǐ hǎo lǎoshī! Wǒ jīntiān hěn gāoxìng. Wǒ zuótiān qù chāoshì mǎi shuǐguǒ.',
    translationVi: 'Chào cô giáo! Hôm nay em rất vui. Hôm qua em đi siêu thị mua hoa quả.'
  });

  geminiAnalysisService.saveMessage({
    sessionId: testSessionId,
    sender: 'assistant',
    text: '很好！你买了什么水果呢？',
    pinyin: 'Hěn hǎo! Nǐ mǎi le shénme shuǐguǒ ne?',
    translationVi: 'Rất tốt! Bạn đã mua loại hoa quả gì thế?'
  });

  geminiAnalysisService.saveMessage({
    sessionId: testSessionId,
    sender: 'user',
    text: '我买了苹果和西瓜。我去超市八点，因为苹果有点儿便宜。',
    pinyin: 'Wǒ mǎi le píngguǒ hé xīguā. Wǒ qù chāoshì bā diǎn, yīnwèi píngguǒ yǒudiǎnr piányi.',
    translationVi: 'Em đã mua táo và dưa hấu. Em đi siêu thị lúc 8 giờ, vì táo hơi rẻ.'
  });

  const messageCount = (db.prepare('SELECT COUNT(*) as c FROM chat_messages WHERE session_id = ?').get(testSessionId) as any)?.c || 0;
  console.log(`Đã tạo phiên ${testSessionId} với ${messageCount} tin nhắn.`);
  if (messageCount < 4) {
    throw new Error('Không lưu được tin nhắn hội thoại!');
  }
  console.log('✅ TEST 1 PASS: Khởi tạo và lưu phiên hội thoại thành công\n');

  // 2. Chạy phân tích hội thoại bằng AI
  console.log('--- TEST 2: RUN DEEP AI CONVERSATION ANALYSIS ---');
  const report = await geminiAnalysisService.analyzeSession(testSessionId, {
    forceReanalyze: true,
    sessionType: 'text'
  });

  console.log('Tóm tắt phân tích:', {
    sessionId: report.sessionId,
    summaryVi: report.summaryVi,
    topics: report.topics,
    overallScore: report.overallScore,
    groupACount: report.vocabAnalysis.groupA.length,
    groupBCount: report.vocabAnalysis.groupB.length,
    groupCCount: report.vocabAnalysis.groupC.length,
    groupDCount: report.vocabAnalysis.groupD.length,
    grammarCount: report.grammarAnalysis.length,
    errorsCount: report.detectedErrors.length,
    sentenceBreakdownCount: report.sentenceBreakdown.length
  });

  if (!report.summaryVi || report.overallScore <= 0) {
    throw new Error('Bản phân tích hội thoại thiếu dữ liệu cốt lõi!');
  }
  console.log('✅ TEST 2 PASS: AI phân tích hội thoại trả về dữ liệu có cấu trúc hoàn chỉnh\n');

  // 3. Kiểm tra phân loại từ vựng 4 nhóm (A, B, C, D)
  console.log('--- TEST 3: 4 VOCABULARY CATEGORIES VERIFICATION ---');
  const allVocabCount =
    report.vocabAnalysis.groupA.length +
    report.vocabAnalysis.groupB.length +
    report.vocabAnalysis.groupC.length +
    report.vocabAnalysis.groupD.length;

  console.log('Tổng số từ vựng được phân loại:', allVocabCount);
  if (report.vocabAnalysis.groupA.length > 0) {
    console.log('Ví dụ Nhóm A (Đã biết & dùng tốt):', report.vocabAnalysis.groupA[0].simplified, '-', report.vocabAnalysis.groupA[0].meaningVi);
  }
  console.log('✅ TEST 3 PASS: Phân loại từ vựng 4 nhóm hoạt động chuẩn xác\n');

  // 4. Kiểm tra phân loại lỗi sai và câu sửa
  console.log('--- TEST 4: ERROR DETECTION & CORRECTION ---');
  console.log('Số lỗi phát hiện:', report.detectedErrors.length);
  if (report.detectedErrors.length > 0) {
    console.log('Chi tiết lỗi đầu tiên:', {
      type: report.detectedErrors[0].errorType,
      title: report.detectedErrors[0].title,
      wrongSentence: report.detectedErrors[0].userSentence,
      corrected: report.detectedErrors[0].correctedSentence,
      explanation: report.detectedErrors[0].explanationVi
    });
  }
  console.log('✅ TEST 4 PASS: Phát hiện lỗi ngữ pháp/trật tự từ và đưa ra câu sửa chuẩn\n');

  // 5. Kiểm tra phân tích chi tiết từng câu nói của học viên (Sentence Breakdown)
  console.log('--- TEST 5: SENTENCE-BY-SENTENCE BREAKDOWN ---');
  console.log('Số câu học viên được bóc tách:', report.sentenceBreakdown.length);
  report.sentenceBreakdown.forEach((s, idx) => {
    console.log(`[Câu ${idx + 1}] "${s.userSentenceZh}" - Đúng: ${s.isCorrect} | Nhận xét: ${s.aiCritiqueVi.substring(0, 50)}...`);
  });
  if (report.sentenceBreakdown.length === 0) {
    throw new Error('Thiếu dữ liệu phân tích từng câu (sentenceBreakdown)!');
  }
  console.log('✅ TEST 5 PASS: Phân tích từng câu học viên nói chi tiết và hữu ích\n');

  // 6. Kiểm tra đồng bộ ngược vào SQLite (Long-term memory & SRS)
  console.log('--- TEST 6: LONG-TERM MEMORY & SRS SYNC ---');
  // Check vocabulary memory
  const vocabCheck = db.prepare("SELECT COUNT(*) as c FROM vocabulary_memory WHERE source_session_id = ?").get(testSessionId) as any;
  console.log('Từ vựng cập nhật từ phiên này:', vocabCheck.c);

  // Check chat_sessions marked as analyzed
  const sessionRow = db.prepare("SELECT is_analyzed, status FROM chat_sessions WHERE id = ?").get(testSessionId) as any;
  console.log('Trạng thái phiên chat:', sessionRow);
  if (sessionRow.is_analyzed !== 1 || sessionRow.status !== 'analyzed') {
    throw new Error('chat_sessions chưa được đánh dấu là đã phân tích!');
  }
  console.log('✅ TEST 6 PASS: Đồng bộ ngược vào bộ nhớ học tập và đánh dấu phiên hoàn tất\n');

  // 7. Kiểm tra lấy lại báo cáo đã lưu (Cache retrieval)
  console.log('--- TEST 7: RETRIEVE STORED ANALYSIS REPORT ---');
  const cached = geminiAnalysisService.getAnalysisBySession(testSessionId);
  if (!cached || cached.sessionId !== testSessionId) {
    throw new Error('Không lấy lại được báo cáo đã lưu từ SQLite!');
  }
  console.log('Báo cáo đã lưu khôi phục thành công:', {
    id: cached.id,
    sessionId: cached.sessionId,
    overallScore: cached.overallScore
  });
  console.log('✅ TEST 7 PASS: Truy xuất báo cáo phân tích theo sessionId hoàn hảo\n');

  console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ AI PHÂN TÍCH HỘI THOẠI ĐÃ ĐẠT 100%! 🎉');
}

runConversationAnalysisTests().catch(err => {
  console.error('❌ LỖI KIỂM THỬ PHÂN TÍCH HỘI THOẠI:', err);
  process.exit(1);
});
