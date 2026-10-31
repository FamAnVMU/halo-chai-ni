import { db } from '../server/db.js';
import { knowledgeRegistryService } from '../server/knowledgeRegistryService.js';
import { learningEvidenceService } from '../server/learningEvidenceService.js';
import { masteryEngineService } from '../server/masteryEngineService.js';
import { unifiedLearningMemoryService } from '../server/unifiedLearningMemoryService.js';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, description: string, details?: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${description}`);
    if (details) console.log(`     -> ${details}`);
  } else {
    failCount++;
    console.error(`  ✗ [FAIL] ${description}`);
    if (details) console.error(`     -> Chi tiết: ${details}`);
  }
}

async function runUnifiedLearningMemoryTests() {
  console.log('========================================================================');
  console.log('🌐 BẮT ĐẦU KIỂM THỬ UNIFIED LEARNING MEMORY TOÀN HỆ THỐNG (PHẦN A4)');
  console.log('   (7 Hành trình End-to-End kết nối tất cả các phân hệ học tập tiếng Trung)');
  console.log('========================================================================\n');

  // ==========================================================================
  // FLOW 1: TỪ ĐIỂN THÔNG MINH (TRA TỪ -> EXPOSURE -> MASTERY -> SRS)
  // ==========================================================================
  console.log('📌 [LUỒNG 1: TỪ ĐIỂN]: TRA TỪ "词典词" -> EXPOSURE -> XEM MASTERY -> LIÊN KẾT SRS');
  const dictWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '词典词',
    hanziSimplified: '词典词',
    pinyin: 'cí diǎn cí',
    initialSense: { meaningVi: 'từ vựng tra cứu từ điển' }
  });
  const kid1 = dictWord.item.id;
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kid1);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kid1);

  // 1.1 Ghi nhận hoạt động tra từ qua Unified Memory
  const act1 = unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kid1,
    activityType: 'exposure',
    sourceModule: 'dictionary',
    action: 'dictionary_lookup',
    observedData: { speaker: 'user', userText: '学习' },
    assessmentData: { isCorrect: null }
  });

  // 1.2 Truy xuất toàn diện ngữ cảnh kiến thức
  const ctx1 = unifiedLearningMemoryService.getKnowledgeContext(kid1);

  assert(
    act1.success === true &&
      ctx1 !== null &&
      ctx1.mastery.compositeState === 'EXPOSED' &&
      ctx1.recentEvidences.length > 0,
    'Tra từ điển tạo bằng chứng exposure và gắn trạng thái EXPOSED minh bạch',
    `State: ${ctx1?.mastery.compositeState}, Action: ${act1.evidence.action}, Senses: ${ctx1?.senses.length}`
  );

  // ==========================================================================
  // FLOW 2: AI TUTOR (GIẢNG DẠY -> THỰC HÀNH -> BẬT MASTERY -> BRIEFING MỚI)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 2: AI TUTOR]: GIẢNG DẠY CẤU TRÚC "了" -> VẬN DỤNG -> MASTERY -> BRIEFING');
  const graLe = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'grammar',
    displayText: 'Cấu trúc 了',
    hanziSimplified: '了',
    pinyin: 'le',
    initialSense: { meaningVi: 'Trợ từ động thái biểu thị hành động đã hoàn thành' }
  });
  const kidLe = graLe.item.id;

  // Dọn dẹp dữ liệu cũ của kidLe để đảm bảo tính độc lập
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kidLe);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kidLe);

  // 2.1 AI dạy bài (instruction)
  unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidLe,
    activityType: 'instruction',
    sourceModule: 'ai_tutor',
    action: 'stepped_instruction',
    observedData: { speaker: 'user', contextSentence: 'Chủ ngữ + Động từ + 了 + Tân ngữ' },
    assessmentData: { isCorrect: null },
    inferenceData: { pedagogicClaim: 'AI Tutor đã giải thích cấu trúc 了 hoàn thành' }
  });

  // 2.2 Người học vận dụng tạo câu (application)
  const actLe = unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidLe,
    activityType: 'application',
    sourceModule: 'ai_tutor',
    action: 'chat_utterance',
    observedData: { speaker: 'user', userUtterance: '我买了一本书。' },
    assessmentData: { isCorrect: true, score: 95 },
    inferenceData: { pedagogicClaim: 'Học viên tự đặt câu chuẩn xác với trợ từ 了' }
  });

  // 2.3 AI Tutor lấy Selective Briefing cho câu tiếp theo
  const briefing = unifiedLearningMemoryService.getRelevantKnowledgeForAITutor('我买了一本书。', { hskLevel: 1 });

  assert(
    actLe.snapshot.applicationScore >= 80 &&
      briefing.matchedKnowledge.some(m => m.displayText.includes('了') || m.id === kidLe),
    'AI Tutor cập nhật chiều Application và nhận lại Briefing sư phạm chính xác',
    `Application score: ${actLe.snapshot.applicationScore}%, Briefing matched: ${briefing.matchedKnowledge.length} items`
  );

  // ==========================================================================
  // FLOW 3: VOICE CHAT (CROSS-MODAL SYNC GIỮA GIỌNG NÓI VÀ VĂN BẢN)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 3: VOICE CHAT]: NÓI TỪ "苹果" TRONG GEMINI LIVE -> TEXT CHAT THẤY NGAY');
  const wordApple = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '苹果',
    hanziSimplified: '苹果',
    pinyin: 'píng guǒ',
    initialSense: { meaningVi: 'quả táo' }
  });
  const kidApple = wordApple.item.id;

  // 3.1 Ghi nhận trong Voice Chat
  unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidApple,
    activityType: 'application',
    sourceModule: 'voice_chat',
    action: 'voice_response',
    observedData: {
      speaker: 'user',
      userUtterance: '这个苹果很甜。',
      audioMetrics: { actualDurationMs: 650, speedPacing: 'natural' }
    },
    assessmentData: { isCorrect: true, score: 90 },
    assessmentMethod: 'audio_evaluation',
    evaluator: 'gemini_live'
  });

  // 3.2 Text Chat truy xuất ngữ cảnh từ này
  const ctxApple = unifiedLearningMemoryService.getKnowledgeContext('苹果');

  assert(
    ctxApple !== null &&
      ctxApple.recentEvidences.some(e => e.sourceModule === 'voice_chat'),
    'Phát ngôn từ Voice Chat lập tức được lưu vào Unified Memory và Text Chat đọc được ngay',
    `Nguồn gần nhất: ${ctxApple?.recentEvidences[0]?.sourceModule}, Action: ${ctxApple?.recentEvidences[0]?.action}`
  );

  // ==========================================================================
  // FLOW 4: SHADOWING PRACTICE (NÓI NHẠI NÂNG CAO PHÁT ÂM VÀ NGHE, KHÔNG PHẢI APPLICATION TỰ DO)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 4: SHADOWING]: NÓI NHẠI NÂNG CAO CHIỀU PHÁT ÂM/NGHE HIỂU (KHÔNG TỰ DO)');
  const shadowWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '机场',
    hanziSimplified: '机场',
    pinyin: 'jī chǎng',
    initialSense: { meaningVi: 'sân bay' }
  });
  const kidShadow = shadowWord.item.id;

  // Dọn dẹp dữ liệu cũ của kidShadow
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kidShadow);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kidShadow);

  const actShadow = unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidShadow,
    activityType: 'pronunciation',
    sourceModule: 'shadowing',
    action: 'shadowing_repeat',
    observedData: {
      speaker: 'user',
      userUtterance: '去机场',
      audioMetrics: { actualDurationMs: 580, speedPacing: 'natural', matchRate: 0.95 }
    },
    assessmentData: { isCorrect: true, score: 95 },
    assessmentMethod: 'audio_evaluation',
    evaluator: 'shadowing_engine'
  });

  assert(
    actShadow.snapshot.pronunciationScore !== null &&
      actShadow.snapshot.pronunciationScore >= 80 &&
      actShadow.snapshot.applicationScore === 0,
    'Nói nhại Shadowing tăng điểm phát âm âm học nhưng không tự nhận là khả năng tự do đặt câu',
    `Pronunciation: ${actShadow.snapshot.pronunciationScore}%, Application: ${actShadow.snapshot.applicationScore}%`
  );

  // ==========================================================================
  // FLOW 5: LUYỆN ĐỌC TƯƠNG TÁC (ĐỌC HIỂU CÂU HỎI TRONG NGỮ CẢNH)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 5: LUYỆN ĐỌC]: HOÀN THÀNH CÂU HỎI ĐỌC HIỂU CẬP NHẬT RECOGNITION/READING');
  const readWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '图书馆',
    hanziSimplified: '图书馆',
    pinyin: 'tú shū guǎn',
    initialSense: { meaningVi: 'thư viện' }
  });
  const kidRead = readWord.item.id;

  const actRead = unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidRead,
    activityType: 'listening_reading',
    sourceModule: 'reading',
    action: 'reading_question_answer',
    observedData: {
      speaker: 'user',
      selectedOption: 'thư viện',
      optionsAvailable: ['thư viện', 'bệnh viện', 'trường học']
    },
    assessmentData: { isCorrect: true, score: 100 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'reading_service'
  });

  assert(
    actRead.success === true && actRead.snapshot.recognitionScore >= 70,
    'Làm câu hỏi đọc hiểu ghi nhận bằng chứng listening_reading và tăng Recognition',
    `Recognition: ${actRead.snapshot.recognitionScore}%, Type: ${actRead.evidence.evidenceType}`
  );

  // ==========================================================================
  // FLOW 6: SRS (ÔN TẬP SAI -> LỊCH ÔN RÚT NGẮN -> MASTERY CẬP NHẬT NEEDS_REVIEW)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 6: SRS]: ÔN TẬP THẺ BỊ QUÊN -> GHI NHẬN EVIDENCE -> BẬT NEEDS_REVIEW');
  const srsWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '会议',
    hanziSimplified: '会议',
    pinyin: 'huì yì',
    initialSense: { meaningVi: 'cuộc họp, hội nghị' }
  });
  const kidSrs = srsWord.item.id;
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kidSrs);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kidSrs);

  // Người học trả lời sai thẻ flashcard
  const actSrs = unifiedLearningMemoryService.recordLearningActivity({
    knowledgeId: kidSrs,
    activityType: 'review',
    sourceModule: 'srs',
    action: 'srs_review',
    observedData: { speaker: 'user', providedAnswer: 'quên mất nghĩa' } as any,
    assessmentData: {
      isCorrect: false,
      score: 20,
      sm2Result: { newInterval: 1, newEF: 2.18, lapses: 2 }
    },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'sm2_engine'
  });

  const reviewList = unifiedLearningMemoryService.getKnowledgeForReview({ limit: 10 });

  assert(
    actSrs.snapshot.needsReview === true &&
      reviewList.some(r => r.knowledgeId === kidSrs),
    'Ôn tập sai kích hoạt cờ needs_review và đưa từ vào danh sách ưu tiên ôn tập',
    `needsReview: ${actSrs.snapshot.needsReview}, Retention: ${actSrs.snapshot.retentionScore}%, In ReviewList: true`
  );

  // ==========================================================================
  // FLOW 7: KHÔI PHỤC VÀ NHẤT QUÁN TOÀN DIỆN (AUDIT DATA HEALTH & REBUILD)
  // ==========================================================================
  console.log('\n📌 [LUỒNG 7: KHÔI PHỤC & KIỂM TRA]: AUDIT DATA HEALTH & REBUILD UNIFIED MEMORY');
  // 7.1 Kiểm tra sức khỏe dữ liệu
  const health = unifiedLearningMemoryService.auditDataHealth();

  // 7.2 Tái tạo toàn bộ bộ nhớ học tập từ nguồn gốc SQLite
  const rebuild = unifiedLearningMemoryService.rebuildUnifiedMemory();

  // 7.3 Lấy Hồ sơ học tập tổng hợp sau khi khôi phục
  const profile = unifiedLearningMemoryService.getLearnerProfile();

  assert(
    health.status === 'healthy' &&
      health.orphanEvidencesCount === 0 &&
      rebuild.totalSnapshotsRebuilt > 0 &&
      profile.totalKnowledgeCount > 0 &&
      profile.accuracyRate > 0,
    'Unified Learning Memory đồng nhất 100%, không có dữ liệu mồ côi, Rebuild hoàn tất trơn tru',
    `Health: ${health.status}, Snapshots Rebuilt: ${rebuild.totalSnapshotsRebuilt}, Profile Accuracy: ${profile.accuracyRate}%`
  );

  // ==========================================================================
  // TỔNG KẾT
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏆 KẾT QUẢ KIỂM THỬ UNIFIED LEARNING MEMORY: ${passCount}/7 HÀNH TRÌNH PASS 100%, ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 TOÀN BỘ 7 HÀNH TRÌNH TÍCH HỢP BỘ NHỚ ĐÃ ĐẠT 100% CHUẨN MỰC KIẾN TRÚC V2.3.0!');
  }
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUnifiedLearningMemoryTests().catch(err => {
  console.error('Fatal Unified Learning Memory Test Error:', err);
  process.exit(1);
});
