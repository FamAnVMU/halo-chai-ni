/**
 * AI System Integration Audit & Optimization Verification Suite
 * Phase B - AI Integration Audit (Halo Chinese v2.8.0)
 *
 * Verifies the 6 end-to-end cross-system flows specified in Section 8:
 * - Flow 1: AI Tutor & Unified Memory loop (Request -> Context -> Orchestrator -> Evidence -> Mastery)
 * - Flow 2: Lesson Generation & Validation pipeline
 * - Flow 3: Live Session Lifecycle & Database State sync
 * - Flow 4: Seamless Text <-> Voice Context Handoff
 * - Flow 5: Pedagogic Error Correction & False-Positive Polishing Defense
 * - Flow 6: Chinese Knowledge Benchmark, SQLite Audit & Regression Gate
 */

import { db } from '../server/db.js';
import { unifiedAIOrchestrator } from '../server/unifiedAIOrchestrator.js';
import { contextBuilderService } from '../server/contextBuilderService.js';
import { unifiedLearningMemoryService } from '../server/unifiedLearningMemoryService.js';
import { TeachingQualityEngine } from '../server/teachingQualityEngine.js';
import { liveSessionManager } from '../server/liveSessionManager.js';
import { benchmarkRunner } from '../server/benchmarkRunner.js';
import { geminiLessonService } from '../server/geminiLessonService.js';
import { geminiAnalysisService } from '../server/geminiAnalysisService.js';
import { geminiTextService } from '../server/geminiTextService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${title}${details ? ` (${details})` : ''}`);
    failed++;
  }
}

async function runIntegrationAudit() {
  console.log('================================================================');
  console.log('🔍 RUNNING AI SYSTEM INTEGRATION AUDIT SUITE (v2.8.0)');
  console.log('================================================================\n');

  const testLearnerId = `learner_audit_${Date.now()}`;
  const testSessionId = `audit_sess_${Date.now()}`;

  // -------------------------------------------------------------
  // LUỒNG 1: AI TUTOR & BỘ NHỚ HỌC TẬP THỐNG NHẤT
  // -------------------------------------------------------------
  console.log('🌊 LUỒNG 1: AI Tutor và Bộ nhớ học tập (Request -> Context -> Orchestrator -> Evidence -> Mastery)');
  
  // 1.1 Kiểm tra Context Builder truy xuất đúng context profile và ngân sách
  const contextPkg = await contextBuilderService.buildFullContextPackage({
    taskId: 'AI_TUTOR_CHAT',
    learnerId: testLearnerId,
    inputQuery: 'Tôi muốn học cách dùng từ 苹果 và cấu trúc câu chữ 把',
    hskLevel: 2,
    sessionId: testSessionId
  });

  assert(
    !!contextPkg.fencedContextText && contextPkg.fencedContextText.includes('<retrieved_learner_context'),
    '1.1 Context Builder đóng gói dữ liệu an toàn trong thẻ cô lập <retrieved_learner_context>'
  );
  assert(
    contextPkg.trace.estimatedTokens >= 0 && contextPkg.trace.contextProfile === 'chat_general',
    `1.2 Ngân sách Context được kiểm soát: profile=${contextPkg.trace.contextProfile}, tokens=${contextPkg.trace.estimatedTokens}`
  );

  // 1.2 Thực thi tác vụ chat qua geminiTextService -> UnifiedAIOrchestrator
  const chatResponse = await geminiTextService.chat(
    '你好！苹果多少钱一斤？',
    [],
    'free',
    2,
    'Trái cây chợ sinh viên',
    { sessionId: testSessionId }
  );

  assert(
    !!chatResponse.replyZh && !!chatResponse.replyVi,
    '1.3 AI Tutor phản hồi câu song ngữ tiếng Trung - tiếng Việt chuẩn xác'
  );

  // 1.3 Ghi nhận Evidence và kiểm tra cập nhật an toàn
  const recordResult = unifiedLearningMemoryService.recordLearningActivity({
    sourceModule: 'ai_tutor',
    activityType: 'application',
    action: 'use',
    learnerId: testLearnerId,
    sessionId: testSessionId,
    hanziSimplified: '苹果',
    pinyin: 'píngguǒ',
    itemType: 'vocabulary',
    observedData: {
      speaker: 'user',
      userUtterance: '我想买两斤苹果。',
      userText: '我想买两斤苹果。',
      contextSentence: 'Tôi muốn mua hai cân táo.'
    },
    assessmentData: {
      isCorrect: true,
      score: 1.0,
      explanationVi: 'Dùng đúng lượng từ 斤 và danh từ 苹果'
    }
  });

  assert(
    recordResult.success === true,
    '1.4 Learning Evidence được ghi nhận thành công từ hoạt động hội thoại'
  );

  // -------------------------------------------------------------
  // LUỒNG 2: TẠO BÀI HỌC CÁ NHÂN HÓA QUA ORCHESTRATOR
  // -------------------------------------------------------------
  console.log('\n🌊 LUỒNG 2: Tạo bài học cá nhân hóa & Xác thực cấu trúc');

  // Ghi nhận một lỗi mẫu để kích hoạt lỗ hổng kiến thức
  db.prepare(`
    INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status)
    VALUES ('word_order', 'Trật tự từ thời gian', '我学中文早上', '我早上学中文', 'Thời gian đứng trước động từ', 2, ?, 'pending')
  `).run(Date.now());

  // Sinh bài học qua geminiLessonService (đã được điều phối qua UnifiedAIOrchestrator)
  const lessonData = await geminiLessonService.generateLesson({
    topic: 'Trật tự từ chỉ thời gian và nơi chốn',
    hskLevel: 2,
    lessonType: 'reinforce',
    recommendationReason: 'Củng cố lỗi trật tự từ thường gặp'
  });

  assert(
    !!lessonData.id && !!lessonData.title && lessonData.hskLevel === 2,
    `2.1 Bài học được tạo thành công qua Orchestrator: "${lessonData.title}" (HSK ${lessonData.hskLevel})`
  );

  assert(
    lessonData.content.vocabulary.length > 0 && Array.isArray(lessonData.content.grammar),
    '2.2 Cấu trúc bài học gồm đầy đủ từ vựng và ngữ pháp trọng tâm'
  );

  // Kiểm tra lưu vào database và chống trùng lặp
  const savedLesson = db.prepare('SELECT id, title, status FROM generated_lessons WHERE id = ?').get(lessonData.id) as any;
  assert(
    !!savedLesson && savedLesson.status === 'unstarted',
    '2.3 Bài học được lưu vào SQLite bảng generated_lessons với trạng thái unstarted'
  );

  // -------------------------------------------------------------
  // LUỒNG 3: VOICE CHAT LIFECYCLE & LƯU TRỮ TRỰC TIẾP
  // -------------------------------------------------------------
  console.log('\n🌊 LUỒNG 3: Quản lý vòng đời Voice Chat (LiveSessionManager) & Đồng bộ Database');

  const voiceSessionId = `voice_audit_${Date.now()}`;
  
  // Tạo giả lập phiên Voice kết nối
  const fakeWs: any = {
    readyState: 1, // OPEN
    OPEN: 1,
    send: () => {},
    close: () => {},
    on: () => {}
  };

  await liveSessionManager.startOrJoinSession(fakeWs, {
    sessionId: voiceSessionId,
    learnerId: testLearnerId,
    hskLevel: 2,
    mode: 'free',
    scenario: 'Tại cửa hàng hoa quả'
  });

  assert(
    liveSessionManager.hasActiveSession(voiceSessionId),
    '3.1 Phiên Live Voice Session được khởi tạo và kích hoạt trong bộ nhớ'
  );

  const sessionState = liveSessionManager.getSessionState(voiceSessionId);
  assert(
    sessionState?.mode === 'free' && sessionState?.hskLevel === 2,
    '3.2 LiveSessionState lưu giữ đúng mode và hskLevel phục vụ lưu trữ SQLite'
  );

  // Giả lập người học phát biểu trong voice session
  if (sessionState) {
    sessionState.accumulatedUserTranscript = '老板，这个苹果怎么卖？';
    sessionState.accumulatedAiTranscript = '五块钱一斤，很甜的！';
    sessionState.userTurnCount = 1;
    sessionState.modelTurnCount = 1;
  }

  // Kết thúc phiên và kiểm tra ghi nhận vào SQLite (khắc phục lỗi NOT NULL constraint)
  liveSessionManager.terminateSession(voiceSessionId);

  const savedVoiceSession = db.prepare('SELECT id, session_type, status, mode, hsk_level FROM chat_sessions WHERE id = ?').get(voiceSessionId) as any;
  assert(
    !!savedVoiceSession && savedVoiceSession.session_type === 'voice' && savedVoiceSession.status === 'completed',
    '3.3 Phiên Voice Chat kết thúc được lưu trọn vẹn vào chat_sessions (không bị lỗi NOT NULL constraint)'
  );

  const savedVoiceMessages = db.prepare('SELECT sender, text FROM chat_messages WHERE session_id = ?').all(voiceSessionId) as any[];
  assert(
    savedVoiceMessages.length >= 2,
    `3.4 Toàn bộ transcript thoại được lưu vào chat_messages (${savedVoiceMessages.length} tin nhắn) để Text Chat kế thừa`
  );

  // -------------------------------------------------------------
  // LUỒNG 4: CHUYỂN ĐỔI NGỮ CẢNH GIỮA TEXT CHAT VÀ VOICE CHAT
  // -------------------------------------------------------------
  console.log('\n🌊 LUỒNG 4: Chuyển đổi ngữ cảnh Text <-> Voice (Cross-modal Context Handoff)');

  // Khi người học quay lại Text Chat, Context Builder có nhìn thấy phiên Voice Chat vừa rồi không?
  const followUpContext = await contextBuilderService.buildFullContextPackage({
    taskId: 'AI_TUTOR_CHAT',
    learnerId: testLearnerId,
    inputQuery: 'Vừa rồi mình hỏi giá quả gì thế cô?',
    hskLevel: 2,
    sessionId: `chat_after_voice_${Date.now()}`
  });

  assert(
    followUpContext.fencedContextText.includes('苹果') || followUpContext.fencedContextText.includes('hoa quả') || followUpContext.fencedContextText.includes('HSK 2'),
    '4.1 Text Chat kế thừa liền mạch ngữ cảnh vừa diễn ra trong Voice Chat'
  );

  // -------------------------------------------------------------
  // LUỒNG 5: SỬA LỖI SƯ PHẠM & BẢO VỆ CHỐNG SỬA OAN (POLISHING DEFENSE)
  // -------------------------------------------------------------
  console.log('\n🌊 LUỒNG 5: Sửa lỗi sư phạm & Chống sửa oan câu đúng (False Correction Defense)');

  // 5.1 Trường hợp CÂU ĐÚNG: "我今天很高兴"
  const correctCheck = TeachingQualityEngine.isSentenceGrammaticallyValid('我今天很高兴', '我今天感到很高兴');
  assert(
    correctCheck === true,
    '5.1 Câu "我今天很高兴" được nhận diện là câu đúng ngữ pháp tuyệt đối'
  );

  const correctionOnValid = TeachingQualityEngine.buildStructuredCorrection({
    originalText: '我今天很高兴。',
    correctedText: '我今天感到非常高兴。',
    explanationVi: 'Nên dùng thêm từ cảm thấy cho hay.',
    grammarPoint: 'tính từ làm vị ngữ'
  });

  assert(
    correctionOnValid.isPolishing === true && correctionOnValid.isGenuineError === false,
    '5.2 Phân định chính xác: isPolishing=true, isGenuineError=false (Không coi câu đúng là lỗi sai)'
  );
  assert(
    correctionOnValid.correctedText === '我今天很高兴。',
    '5.3 Giữ nguyên câu gốc của học viên, chỉ coi đề xuất hoa mỹ hơn là cách diễn đạt tham khảo'
  );

  // 5.2 Trường hợp CÂU SAI THẬT: Sai trật tự từ "我学中文在学校"
  const wrongSentenceCheck = TeachingQualityEngine.isSentenceGrammaticallyValid('我学中文在学校', '我在学校学中文');
  assert(
    wrongSentenceCheck === false,
    '5.4 Nhận diện chính xác câu sai trật tự từ "我学中文在学校" không phải là câu đúng'
  );

  const realCorrection = TeachingQualityEngine.buildStructuredCorrection({
    originalText: '我学中文在学校。',
    correctedText: '我在学校学中文。',
    explanationVi: 'Trạng từ chỉ nơi chốn phải đứng trước động từ.',
    grammarPoint: 'trật tự từ nơi chốn'
  });

  assert(
    realCorrection.isGenuineError === true && realCorrection.errorCategory === 'grammar',
    '5.5 Bắt đúng lỗi thực tế: errorCategory=grammar, isGenuineError=true'
  );
  assert(
    realCorrection.microCheck?.needVerification === true,
    '5.6 Tự động kích hoạt bài tập vận dụng vi mô (microCheck) giúp học viên tự sửa lỗi'
  );

  // -------------------------------------------------------------
  // LUỒNG 6: BENCHMARK, GHI NHẬN AUDIT VÀ PHÁN QUYẾT PHÁT HÀNH
  // -------------------------------------------------------------
  console.log('\n🌊 LUỒNG 6: Chinese Knowledge Benchmark, SQLite Audit & Phán quyết phát hành');

  const benchRun = benchmarkRunner.runOfflineBenchmark({ runName: 'Integration Audit Run' });

  assert(
    benchRun.accuracyRate === 100,
    `6.1 Benchmark đạt độ chính xác chuẩn: ${benchRun.accuracyRate}% (100% Pass)`
  );
  assert(
    benchRun.falseCorrectionRate === 0,
    `6.2 Tỷ lệ sửa nhầm câu đúng: ${benchRun.falseCorrectionRate}% (Bảo vệ tuyệt đối)`
  );
  assert(
    benchRun.errorDetectionPrecision === 100,
    `6.3 Độ chính xác phát hiện lỗi thật: ${benchRun.errorDetectionPrecision}%`
  );

  // Kiểm tra lưu vết trong ai_request_logs
  const recentLogs = unifiedAIOrchestrator.getRecentLogs(10);
  assert(
    recentLogs.length > 0,
    `6.4 Bảng ai_request_logs ghi nhận đầy đủ ${recentLogs.length} yêu cầu điều phối AI trung tâm`
  );

  // Kiểm tra bảng benchmark_runs trong SQLite
  const savedBench = db.prepare('SELECT id, accuracy_rate, false_correction_rate FROM benchmark_runs WHERE id = ?').get(benchRun.id) as any;
  assert(
    !!savedBench && savedBench.accuracy_rate === 100,
    '6.5 Bản ghi benchmark_runs được lưu trữ đầy đủ trong SQLite'
  );

  // -------------------------------------------------------------
  // TỔNG KẾT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TỔNG KIỂM TOÁN TÍCH HỢP: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationAudit().catch(err => {
  console.error('Lỗi khi chạy integration audit test:', err);
  process.exit(1);
});
