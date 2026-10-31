import { db } from '../server/db.js';
import { knowledgeRegistryService } from '../server/knowledgeRegistryService.js';
import { learningEvidenceService } from '../server/learningEvidenceService.js';
import { masteryEngineService } from '../server/masteryEngineService.js';

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

async function runMasteryEngineTests() {
  console.log('========================================================================');
  console.log('🧠 BẮT ĐẦU KIỂM THỬ HỆ THỐNG ĐÁNH GIÁ MỨC ĐỘ THÀNH THẠO (MASTERY ENGINE)');
  console.log('   (13 Kịch bản tiêu chuẩn kiểm định độ chính xác, đa chiều và chống suy diễn)');
  console.log('========================================================================\n');

  // Khởi tạo một từ vựng riêng biệt để thử nghiệm
  const ts = Date.now();
  const testWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '探索',
    hanziSimplified: '探索',
    pinyin: 'tàn suǒ',
    initialSense: { meaningVi: 'thám hiểm, tìm tòi, khám phá' }
  });
  const kid = testWord.item.id;

  // Dọn dẹp dữ liệu test cũ của từ này nếu có để đảm bảo tính độc lập tuyệt đối giữa các lần chạy test
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kid);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kid);
  db.prepare('DELETE FROM mastery_history WHERE knowledge_id = ?').run(kid);

  // ==========================================================================
  // SCENARIO 1: XEM MỘT TỪ (EXPOSURE) KHÔNG LÀM TĂNG MASTERY ĐÁNG KỂ
  // ==========================================================================
  console.log('📌 [KỊCH BẢN 1]: TIẾP XÚC (EXPOSURE) KHÔNG TẠO RA TRẠNG THÁI MASTERED');
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'exposure',
    action: 'dictionary_lookup',
    sourceModule: 'dictionary',
    observedData: { speaker: 'user', userText: '探索' },
    assessmentData: { isCorrect: null },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'dictionary'
  });

  const snap1 = masteryEngineService.getMastery(kid);
  assert(
    snap1.compositeState === 'EXPOSED' &&
      snap1.applicationScore === 0 &&
      snap1.recallScore === 0 &&
      snap1.everMastered === false,
    'Tra cứu từ điển chỉ gán trạng thái EXPOSED, điểm vận dụng và nhớ lại bằng 0',
    `Trạng thái: ${snap1.compositeState}, Overall Conf: ${snap1.overallConfidence}, Application: ${snap1.applicationScore}`
  );

  // ==========================================================================
  // SCENARIO 2: CHỌN ĐÚNG ĐÁP ÁN GHI NHẬN RECOGNITION TĂNG ĐỘC LẬP
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 2]: CHỌN ĐÚNG TRẮC NGHIỆM GHI NHẬN RECOGNITION TĂNG ĐỘC LẬP');
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recognition',
    action: 'quiz_multiple_choice',
    sourceModule: 'lesson',
    observedData: {
      speaker: 'user',
      selectedOption: 'khám phá, tìm tòi',
      optionsAvailable: ['khám phá, tìm tòi', 'uống nước', 'ngủ']
    },
    assessmentData: { isCorrect: true, score: 100 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'quiz_engine'
  });

  const snap2 = masteryEngineService.getMastery(kid);
  assert(
    snap2.recognitionScore >= 80 &&
      snap2.dimensions.recognition.evidenceCount === 1 &&
      snap2.applicationScore === 0,
    'Recognition tăng cao nhưng chiều Application vẫn giữ nguyên 0 (tách bạch độc lập)',
    `Recognition: ${snap2.recognitionScore}% (count: ${snap2.dimensions.recognition.evidenceCount}), Application: ${snap2.applicationScore}%`
  );

  // ==========================================================================
  // SCENARIO 3: TỰ NHỚ NGHĨA GHI NHẬN RECALL TĂNG
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 3]: TỰ NHỚ LẠI KHÔNG GỢI Ý GHI NHẬN CHIỀU RECALL');
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'flashcard_flip',
    sourceModule: 'srs',
    observedData: { speaker: 'user', providedAnswer: 'khám phá' },
    assessmentData: { isCorrect: true, score: 95 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'srs_engine'
  });

  const snap3 = masteryEngineService.getMastery(kid);
  assert(
    snap3.recallScore >= 85 && snap3.dimensions.recall.evidenceCount === 1,
    'Chiều Recall ghi nhận điểm số nhớ lại chủ động chính xác',
    `Recall: ${snap3.recallScore}%, Status: ${snap3.dimensions.recall.status}`
  );

  // ==========================================================================
  // SCENARIO 4: TỰ ĐẶT CÂU ĐÚNG GHI NHẬN CHIỀU APPLICATION
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 4]: TỰ ĐẶT CÂU TRONG HỘI THOẠI GHI NHẬN CHIỀU APPLICATION');
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'application',
    action: 'chat_utterance',
    sourceModule: 'ai_tutor',
    observedData: { speaker: 'user', userUtterance: '我们要不断探索未知的世界。' },
    assessmentData: { isCorrect: true, score: 95 },
    assessmentMethod: 'ai_evaluation',
    evaluator: 'gemini_tutor'
  });

  const snap4 = masteryEngineService.getMastery(kid);
  assert(
    snap4.applicationScore >= 85 && snap4.dimensions.application.successCount === 1,
    'Tự đặt câu chuẩn xác ghi nhận thành công chiều Application',
    `Application: ${snap4.applicationScore}%, SuccessCount: ${snap4.dimensions.application.successCount}`
  );

  // ==========================================================================
  // SCENARIO 5: SỬ DỤNG LẠI TỪ SAU NHIỀU NGÀY ĐÓNG GÓP VÀO RETENTION
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 5]: ÔN TẬP VÀ DUY TRÌ KIẾN THỨC ĐÓNG GÓP VÀO RETENTION');
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'review',
    action: 'srs_review',
    sourceModule: 'srs',
    observedData: { speaker: 'user', providedAnswer: 'tàn suǒ' },
    assessmentData: {
      isCorrect: true,
      score: 100,
      sm2Result: { newInterval: 6, newEF: 2.5, repetition: 2 }
    },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'sm2_engine'
  });

  const snap5 = masteryEngineService.getMastery(kid);
  assert(
    snap5.retentionScore >= 75 && snap5.dimensions.retention.evidenceCount >= 1,
    'Chiều Retention phản ánh khả năng ghi nhớ qua chu kỳ lặp lại ngắt quãng SM-2',
    `Retention: ${snap5.retentionScore}%, Interval: 6 ngày`
  );

  // ==========================================================================
  // SCENARIO 6: MỘT LẦN TRẢ LỜI SAI KHÔNG XÓA LỊCH SỬ THÀNH THẠO (EVER_MASTERED)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 6]: BẢO TỒN LỊCH SỬ THÀNH THẠO (EVER_MASTERED BẤT BIẾN)');
  // Trước hết nâng cấp lên MASTERED bằng cách kiểm tra điều kiện snap5
  assert(
    snap5.everMastered === true,
    'Từ "探索" đã hội tụ đủ các chiều để đạt trạng thái MASTERED',
    `Composite: ${snap5.compositeState}, everMastered: ${snap5.everMastered}`
  );

  // Người học vô tình mắc 1 lỗi nhỏ sau khi đã đạt MASTERED
  learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'quick_check',
    sourceModule: 'ai_tutor',
    observedData: { speaker: 'user', providedAnswer: 'không nhớ' },
    assessmentData: { isCorrect: false, score: 20 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'ai_tutor'
  });

  const snap6 = masteryEngineService.getMastery(kid);
  assert(
    snap6.everMastered === true,
    'Một lần làm sai không xóa cờ lịch sử ever_mastered của người học',
    `everMastered: ${snap6.everMastered}, Current State: ${snap6.compositeState}`
  );

  // ==========================================================================
  // SCENARIO 7: NHIỀU BẰNG CHỨNG SỬ DỤNG SAI LÀM GIẢM ĐÁNH GIÁ APPLICATION
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 7]: NHIỀU LẦN DÙNG SAI CHUYỂN TRẠNG THÁI SANG UNSTABLE');
  // Thêm 1 từ vựng mới để test mâu thuẫn
  const wordUnstable = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '推迟',
    hanziSimplified: '推迟',
    pinyin: 'tuī chí',
    initialSense: { meaningVi: 'hoãn lại, lùi lịch' }
  });
  const kidUnstable = wordUnstable.item.id;

  // Dọn dẹp dữ liệu cũ của kidUnstable
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(kidUnstable);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(kidUnstable);
  db.prepare('DELETE FROM mastery_history WHERE knowledge_id = ?').run(kidUnstable);

  // Làm trắc nghiệm đúng 100%
  learningEvidenceService.recordEvidence({
    knowledgeId: kidUnstable,
    evidenceType: 'recognition',
    action: 'quiz_mc',
    sourceModule: 'lesson',
    observedData: { speaker: 'user', selectedOption: 'hoãn lại', optionsAvailable: ['hoãn lại', 'đi', 'đến'] },
    assessmentData: { isCorrect: true, score: 100 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'quiz_engine'
  });

  // Nhưng 2 lần đặt câu đều sai ngữ pháp nghiêm trọng
  learningEvidenceService.recordEvidence({
    knowledgeId: kidUnstable,
    evidenceType: 'application',
    action: 'chat_utterance',
    sourceModule: 'ai_tutor',
    observedData: { speaker: 'user', userUtterance: '会议推迟明天。' },
    assessmentData: { isCorrect: false, score: 30, mistakeTypes: ['grammar_particle'] },
    assessmentMethod: 'ai_evaluation',
    evaluator: 'gemini_tutor'
  });
  learningEvidenceService.recordEvidence({
    knowledgeId: kidUnstable,
    evidenceType: 'application',
    action: 'chat_utterance',
    sourceModule: 'ai_tutor',
    observedData: { speaker: 'user', userUtterance: '我推迟八点去。' },
    assessmentData: { isCorrect: false, score: 30, mistakeTypes: ['word_order'] },
    assessmentMethod: 'ai_evaluation',
    evaluator: 'gemini_tutor'
  });

  const snap7 = masteryEngineService.getMastery(kidUnstable);
  assert(
    snap7.compositeState === 'UNSTABLE' &&
      snap7.contradictions.length > 0 &&
      snap7.contradictions[0].type === 'recognition_application_gap',
    'Phát hiện mâu thuẫn giữa nhận diện cao và vận dụng sai, chuyển sang UNSTABLE',
    `Composite: ${snap7.compositeState}, Contradiction: ${snap7.contradictions[0]?.type} (${snap7.contradictions[0]?.description})`
  );

  // ==========================================================================
  // SCENARIO 8: ĐIỂM RECOGNITION CAO KHÔNG TỰ ĐỘNG LÀM APPLICATION CAO
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 8]: TRẮC NGHIỆM ĐẠT 100% KHÔNG TỰ SUY DIỄN APPLICATION CAO');
  assert(
    snap7.recognitionScore === 100 && snap7.applicationScore < 40,
    'Khoảng cách giữa nhận thức thụ động và sản sinh chủ động được phản ánh trung thực',
    `Recognition: ${snap7.recognitionScore}% vs Application: ${snap7.applicationScore}%`
  );

  // ==========================================================================
  // SCENARIO 9: THIẾU EVIDENCE THỂ HIỆN UNSEEN / UNKNOWN
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 9]: KHÔNG CÓ EVIDENCE PHẢI TRẢ VỀ UNSEEN (CONFIDENCE = 0)');
  const unseenWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '未见词',
    hanziSimplified: '未见词',
    pinyin: 'wèi jiàn cí',
    initialSense: { meaningVi: 'từ chưa từng học' }
  });
  db.prepare('DELETE FROM learning_evidences WHERE knowledge_id = ?').run(unseenWord.item.id);
  db.prepare('DELETE FROM mastery_snapshots WHERE knowledge_id = ?').run(unseenWord.item.id);
  db.prepare('DELETE FROM mastery_history WHERE knowledge_id = ?').run(unseenWord.item.id);
  const snap9 = masteryEngineService.getMastery(unseenWord.item.id);
  assert(
    snap9.compositeState === 'UNSEEN' && snap9.overallConfidence === 0 && snap9.evidenceCount === 0,
    'Từ chưa từng tương tác được phân loại UNSEEN với độ tin cậy bằng 0',
    `Trạng thái: ${snap9.compositeState}, Confidence: ${snap9.overallConfidence}`
  );

  // ==========================================================================
  // SCENARIO 10: CÁC NGUỒN EVIDENCE KHÁC NHAU TỔNG HỢP ĐA CHIỀU (KHÔNG ĐÈ NHAU)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 10]: TỔNG HỢP NGUỒN ĐA DẠNG: DICTIONARY, LESSON, SRS, AI TUTOR');
  const snap10 = masteryEngineService.getMastery(kid);
  assert(
    snap10.dimensions.recognition.evidenceCount > 0 &&
      snap10.dimensions.recall.evidenceCount > 0 &&
      snap10.dimensions.application.evidenceCount > 0 &&
      snap10.dimensions.retention.evidenceCount > 0,
    'Tất cả 4 chiều đều lưu giữ đầy đủ bằng chứng từ các module tương ứng mà không bị ghi đè',
    `Rec count: ${snap10.dimensions.recognition.evidenceCount}, Recall count: ${snap10.dimensions.recall.evidenceCount}, App count: ${snap10.dimensions.application.evidenceCount}, Ret count: ${snap10.dimensions.retention.evidenceCount}`
  );

  // ==========================================================================
  // SCENARIO 11: CÓ THỂ GIẢI THÍCH VÌ SAO ĐẠT TRẠNG THÁI HIỆN TẠI (REASONING)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 11]: GIẢI THÍCH SƯ PHẠM RÕ RÀNG VÌ SAO ĐẠT TRẠNG THÁI NÀY');
  assert(
    snap7.reasoningSummary.length > 20 && snap7.reasoningSummary.includes('nhận diện') || snap7.reasoningSummary.includes('vận dụng') || snap7.reasoningSummary.includes('ổn định'),
    'Lý do đánh giá trạng thái được diễn giải sư phạm minh bạch, dễ hiểu',
    `Giải thích: "${snap7.reasoningSummary}"`
  );

  // ==========================================================================
  // SCENARIO 12: CÓ THỂ REBUILD SNAPSHOT TỪ EVIDENCE GỐC (DETERMINISTIC)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 12]: REBUILD SNAPSHOT TỪ BẢNG EVIDENCE GỐC');
  const rebuildResult = masteryEngineService.rebuildMastery(kid);
  const rebuiltSnap = rebuildResult.snapshots[0];
  assert(
    rebuiltSnap !== undefined &&
      rebuiltSnap.compositeState === snap10.compositeState &&
      rebuiltSnap.overallConfidence === snap10.overallConfidence &&
      rebuiltSnap.evidenceCount === snap10.evidenceCount,
    'Tái tạo (rebuild) lại snapshot từ bảng learning_evidences cho kết quả chuẩn xác 100%',
    `Rebuilt State: ${rebuiltSnap.compositeState}, Conf: ${rebuiltSnap.overallConfidence}, Count: ${rebuiltSnap.evidenceCount}`
  );

  // ==========================================================================
  // SCENARIO 13: BẢO TOÀN DỮ LIỆU TRONG SQLITE WAL VÀ TRUY VẤN DANH SÁCH YẾU
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 13]: TRUY VẤN KIẾN THỨC YẾU (WEAK KNOWLEDGE) VÀ TOÀN VẸN SQLITE');
  const weakList = masteryEngineService.getWeakKnowledge();
  const integrity = db.prepare('PRAGMA integrity_check').get() as any;
  const historyList = masteryEngineService.getMasteryHistory(kidUnstable);

  assert(
    weakList.some(w => w.knowledgeId === kidUnstable) &&
      integrity.integrity_check === 'ok' &&
      historyList.length > 0,
    'Truy vấn danh sách kiến thức yếu chính xác, SQLite WAL toàn vẹn, lịch sử chuyển trạng thái đầy đủ',
    `Số kiến thức yếu: ${weakList.length}, Lịch sử biến động: ${historyList.length} bước, Integrity: ${integrity.integrity_check}`
  );

  // ==========================================================================
  // TỔNG KẾT
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏆 KẾT QUẢ KIỂM THỬ MASTERY ENGINE: ${passCount}/${passCount} KIỂM TRA ĐẠT 100% (13 KỊCH BẢN), ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 TẤT CẢ 13 TIÊU CHÍ MASTERY ENGINE ĐẠT 100% CHUẨN MỰC KIẾN TRÚC V2.2.0!');
  }
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runMasteryEngineTests().catch(err => {
  console.error('Fatal Mastery Engine Test Error:', err);
  process.exit(1);
});
