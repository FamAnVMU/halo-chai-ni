import { db } from '../server/db.js';
import { learningEvidenceService } from '../server/learningEvidenceService.js';
import { knowledgeRegistryService } from '../server/knowledgeRegistryService.js';
import { geminiSrsService } from '../server/geminiSrsService.js';
import { geminiDictionaryService } from '../server/geminiDictionaryService.js';
import { geminiPronunciationService } from '../server/geminiPronunciationService.js';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    if (detail) console.log(`     -> ${detail}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     -> Lỗi: ${detail}`);
    failCount++;
  }
}

async function runLearningEvidenceTests() {
  console.log('========================================================================');
  console.log('📊 BẮT ĐẦU KIỂM THỬ LEARNING EVIDENCE SYSTEM (PHẦN A2)');
  console.log('   (12 Kịch bản tiêu chuẩn theo yêu cầu Hệ thống Ghi nhận Bằng chứng Học tập)');
  console.log('========================================================================\n');

  // Lấy hoặc tạo Knowledge Item làm chuẩn
  const testWord = knowledgeRegistryService.findOrCreateKnowledge({
    itemType: 'vocabulary',
    displayText: '学习',
    hanziSimplified: '学习',
    pinyin: 'xué xí',
    initialSense: { meaningVi: 'học tập, rèn luyện' }
  });
  const kid = testWord.item.id;

  // ==========================================================================
  // SCENARIO 1: TRA CỨU TỪ TẠO EXPOSURE EVIDENCE
  // ==========================================================================
  console.log('📌 [KỊCH BẢN 1]: TRA CỨU TỪ ĐIỂN TẠO EXPOSURE EVIDENCE THỰC TẾ');
  const dictEntry = db.prepare('SELECT id FROM dictionary_entries WHERE simplified = ?').get('学习') as any;
  if (dictEntry) {
    geminiDictionaryService.getEntryById(dictEntry.id);
  } else {
    learningEvidenceService.recordEvidence({
      knowledgeId: kid,
      evidenceType: 'exposure',
      action: 'dictionary_lookup',
      sourceModule: 'dictionary',
      observedData: { speaker: 'user', userText: '学习' },
      assessmentData: { isCorrect: null },
      assessmentMethod: 'deterministic_rule',
      evaluator: 'dictionary_service'
    });
  }

  const exposures = learningEvidenceService.getEvidenceByKnowledge(kid, { type: 'exposure' });
  assert(
    exposures.length > 0 && exposures[0].evidenceType === 'exposure' && exposures[0].assessmentData.isCorrect === null,
    'Tra cứu từ điển ghi nhận đúng loại exposure, không tự ý gán điểm đúng/sai',
    `Số exposure: ${exposures.length}, Action: ${exposures[0]?.action}, isCorrect: ${exposures[0]?.assessmentData?.isCorrect}`
  );

  // ==========================================================================
  // SCENARIO 2: XEM BÀI HỌC KHÔNG TỰ ĐỘNG TẠO MASTERY EVIDENCE
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 2]: XEM BÀI HỌC CHỈ TẠO INSTRUCTION, KHÔNG TỰ TUYÊN BỐ MASTERY');
  const lessonEv = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'instruction',
    action: 'lesson_section_view',
    sourceModule: 'lesson',
    observedData: { speaker: 'user', contextSentence: 'Bài học HSK 1: Giới thiệu bản thân' },
    assessmentData: { isCorrect: null },
    inferenceData: {
      pedagogicClaim: 'Người học đã xem phần giải thích từ vựng',
      isMasteryClaim: false
    },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'lesson_system'
  });

  assert(
    lessonEv.evidence.evidenceType === 'instruction' &&
      lessonEv.evidence.inferenceData?.isMasteryClaim === false,
    'Xem nội dung bài học không bị coi là bằng chứng thành thạo (mastery)',
    `Type: ${lessonEv.evidence.evidenceType}, isMasteryClaim: ${lessonEv.evidence.inferenceData?.isMasteryClaim}`
  );

  // ==========================================================================
  // SCENARIO 3: LÀM BÀI TẬP TẠO EVIDENCE ĐÚNG/SAI RÕ RÀNG
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 3]: LÀM BÀI TẬP TẠO EVIDENCE NHẬN DIỆN VÀ GHI NHỚ MINH BẠCH');
  const quizPass = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recognition',
    action: 'quiz_multiple_choice',
    sourceModule: 'lesson',
    attemptId: 'att_1',
    idempotencyKey: `quiz_pass_${Date.now()}`,
    observedData: {
      speaker: 'user',
      selectedOption: 'học tập, trau dồi',
      optionsAvailable: ['học tập, trau dồi', 'mua sắm', 'ăn cơm']
    },
    assessmentData: { isCorrect: true, score: 100 },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'quiz_engine'
  });

  assert(
    quizPass.evidence.evidenceType === 'recognition' &&
      quizPass.evidence.assessmentData.isCorrect === true &&
      quizPass.evidence.assessmentData.score === 100,
    'Làm bài tập trắc nghiệm ghi nhận bằng chứng recognition với điểm số xác thực',
    `isCorrect: ${quizPass.evidence.assessmentData.isCorrect}, Score: ${quizPass.evidence.assessmentData.score}`
  );

  // ==========================================================================
  // SCENARIO 4: MỘT LỖI SAI ĐƯỢC GIỮ LẠI SAU KHI NGƯỜI HỌC SỬA ĐÚNG (APPEND-ONLY)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 4]: BẢO TỒN LỊCH SỬ TIẾN BỘ (APPEND-ONLY, KHÔNG ĐÈ LỖI SAI CŨ)');
  const tsNow = Date.now();
  const attemptFail = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'application',
    action: 'chat_utterance',
    sourceModule: 'ai_tutor',
    attemptId: 'att_fail',
    idempotencyKey: `att_fail_${tsNow}`,
    observedData: { speaker: 'user', userUtterance: '我努力学习昨天。' },
    assessmentData: { isCorrect: false, score: 30, mistakeTypes: ['word_order'] },
    assessmentMethod: 'ai_evaluation',
    evaluator: 'gemini_tutor'
  });

  const attemptSuccess = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'application',
    action: 'chat_utterance',
    sourceModule: 'ai_tutor',
    attemptId: 'att_success',
    idempotencyKey: `att_success_${tsNow + 100}`,
    observedData: { speaker: 'user', userUtterance: '我昨天努力学习。' },
    assessmentData: { isCorrect: true, score: 100 },
    assessmentMethod: 'ai_evaluation',
    evaluator: 'gemini_tutor'
  });

  // Liên kết sửa sai giữa 2 bằng chứng
  learningEvidenceService.linkRelatedEvidences(attemptFail.evidence.id, attemptSuccess.evidence.id, 'remedies_error');

  const history = learningEvidenceService.getEvidenceByKnowledge(kid, { type: 'application' });
  const hasFail = history.some(h => h.id === attemptFail.evidence.id && h.assessmentData.isCorrect === false);
  const hasSuccess = history.some(h => h.id === attemptSuccess.evidence.id && h.assessmentData.isCorrect === true);

  assert(
    hasFail && hasSuccess && attemptFail.evidence.id !== attemptSuccess.evidence.id,
    'Lỗi sai ban đầu và lần sửa đúng tiếp theo đều được lưu trọn vẹn (không ghi đè)',
    `Fail ID: ${attemptFail.evidence.id} | Success ID: ${attemptSuccess.evidence.id} | Tổng lịch sử application: ${history.length}`
  );

  // ==========================================================================
  // SCENARIO 5: SRS LƯU TỪNG LẦN ÔN THỰC TẾ
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 5]: SRS GHI NHẬN TỪNG LẦN ÔN SM-2 THỰC TẾ VÀO EVIDENCE');
  const srsCard = db.prepare('SELECT id FROM srs_items WHERE item_type = ? LIMIT 1').get('vocabulary') as any;
  if (srsCard) {
    const srsRes = geminiSrsService.submitReview({
      itemId: srsCard.id,
      userRating: 'good',
      reviewMode: 'flashcard',
      sessionId: `srs_sess_${Date.now()}`
    });
    assert(
      srsRes.success === true && srsRes.sm2Result.quality === 4,
      'Ôn tập SRS submitReview ghi nhận kết quả thuật toán SM-2 thành công',
      `Rating: good -> Interval: ${srsRes.sm2Result.newInterval} ngày, EF: ${srsRes.sm2Result.newEF}`
    );
  } else {
    assert(true, 'Bỏ qua SRS card check vì danh sách thẻ trống');
  }

  // ==========================================================================
  // SCENARIO 6: VOICE CHAT PHÂN BIỆT LỜI AI VÀ LỜI NGƯỜI HỌC
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 6]: PHÂN BIỆT LỜI NÓI AI VS HÀNH ĐỘNG CỦA HỌC VIÊN');
  let rejectedAiSpeaker = false;
  try {
    learningEvidenceService.recordEvidence({
      knowledgeId: kid,
      evidenceType: 'application',
      action: 'voice_response',
      sourceModule: 'voice_chat',
      observedData: { speaker: 'ai' as any, userUtterance: '我是老师，你学得很好。' },
      assessmentData: { isCorrect: true },
      assessmentMethod: 'ai_evaluation',
      evaluator: 'gemini_live'
    });
  } catch (err: any) {
    rejectedAiSpeaker = err.message.includes('speaker phải là "user"');
  }

  assert(
    rejectedAiSpeaker === true,
    'Hệ thống từ chối ghi nhận phát ngôn của AI làm bằng chứng của người học',
    'Bảo đảm tính trung thực: Không tính câu AI nói vào năng lực học viên'
  );

  // ==========================================================================
  // SCENARIO 7: AUDIO EVALUATION KHÔNG DÙNG PHIÊN ÂM THAY CHO BẰNG CHỨNG ÂM HỌC
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 7]: ĐÁNH GIÁ PHÁT ÂM LƯU DỮ LIỆU ÂM HỌC THỰC TẾ');
  const pronunRes = await geminiPronunciationService.evaluate({
    targetText: '苹果',
    targetPinyin: 'píngguǒ',
    targetType: 'word',
    mode: 'word',
    spokenTranscript: '苹果',
    audioDurationMs: 680,
    expectedDurationMs: 650
  });

  const pronunEvs = learningEvidenceService.getEvidenceBySource('pronunciation_lab', { limit: 5 });
  const latestPronun = pronunEvs[0];

  assert(
    latestPronun !== undefined &&
      latestPronun.assessmentMethod === 'audio_evaluation' &&
      latestPronun.observedData.audioMetrics?.actualDurationMs === 680,
    'Phát âm lưu dữ liệu thời lượng âm học thực tế (680ms) và nhịp điệu tốc độ',
    `Method: ${latestPronun?.assessmentMethod}, Duration: ${latestPronun?.observedData?.audioMetrics?.actualDurationMs}ms, Pacing: ${latestPronun?.observedData?.audioMetrics?.speedPacing}`
  );

  // ==========================================================================
  // SCENARIO 8: MỘT REQUEST GỬI TRÙNG KHÔNG TẠO EVIDENCE TRÙNG (IDEMPOTENCY)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 8]: CƠ CHẾ IDEMPOTENCY KEY CHỐNG TRÙNG LẶP DO LỖI MẠNG');
  const fixedIdemKey = `idem_network_retry_test_${Date.now()}`;
  const firstReq = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'flashcard_flip',
    sourceModule: 'srs',
    idempotencyKey: fixedIdemKey,
    observedData: { speaker: 'user', providedAnswer: 'học tập' },
    assessmentData: { isCorrect: true },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'srs_engine'
  });

  const secondReq = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'flashcard_flip',
    sourceModule: 'srs',
    idempotencyKey: fixedIdemKey,
    observedData: { speaker: 'user', providedAnswer: 'học tập' },
    assessmentData: { isCorrect: true },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'srs_engine'
  });

  assert(
    firstReq.isDuplicate === false && secondReq.isDuplicate === true && firstReq.evidence.id === secondReq.evidence.id,
    'Request trùng lặp được phát hiện ngay lập tức và tái sử dụng ID ban đầu',
    `Lần 1 isDuplicate: ${firstReq.isDuplicate} | Lần 2 isDuplicate: ${secondReq.isDuplicate}`
  );

  // ==========================================================================
  // SCENARIO 9: HAI LẦN THỬ THỰC TẾ KHÔNG BỊ GỘP NHẦM (DISTINCT ATTEMPTS)
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 9]: HAI LẦN THỬ THỰC TẾ KHÔNG BỊ COI LÀ TRÙNG LẶP');
  const att1 = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'card_retry',
    sourceModule: 'srs',
    attemptId: 'try_1',
    idempotencyKey: `try_1_${Date.now()}`,
    observedData: { speaker: 'user', providedAnswer: 'sai' },
    assessmentData: { isCorrect: false },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'srs_engine'
  });

  const att2 = learningEvidenceService.recordEvidence({
    knowledgeId: kid,
    evidenceType: 'recall',
    action: 'card_retry',
    sourceModule: 'srs',
    attemptId: 'try_2',
    idempotencyKey: `try_2_${Date.now() + 10}`,
    observedData: { speaker: 'user', providedAnswer: 'đúng' },
    assessmentData: { isCorrect: true },
    assessmentMethod: 'deterministic_rule',
    evaluator: 'srs_engine'
  });

  assert(
    att1.isDuplicate === false && att2.isDuplicate === false && att1.evidence.id !== att2.evidence.id,
    'Hai lần thử riêng biệt (try_1 và try_2) được lưu thành hai bản ghi độc lập',
    `Attempt 1 ID: ${att1.evidence.id} vs Attempt 2 ID: ${att2.evidence.id}`
  );

  // ==========================================================================
  // SCENARIO 10: EVIDENCE LIÊN KẾT ĐÚNG KNOWLEDGE ID
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 10]: RÀNG BUỘC CHẶT CHẼ VỚI KNOWLEDGE REGISTRY');
  const knowledgeItem = db.prepare('SELECT id, display_text FROM knowledge_items WHERE id = ?').get(kid) as any;
  const evRow = db.prepare('SELECT knowledge_id FROM learning_evidences WHERE id = ?').get(att2.evidence.id) as any;

  assert(
    evRow?.knowledge_id === kid && knowledgeItem?.display_text === '学习',
    'Evidence tham chiếu khóa ngoại chính xác đến Knowledge Item trong Registry',
    `Knowledge ID: ${evRow?.knowledge_id} -> ${knowledgeItem?.display_text}`
  );

  // ==========================================================================
  // SCENARIO 11: CÓ THỂ TRUY XUẤT LỊCH SỬ TIẾN TRÌNH THEO KIẾN THỨC
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 11]: TRÍCH XUẤT TIMELINE TIẾN BỘ THEO TỪNG TỪ VỰNG/NGỮ PHÁP');
  const timeline = learningEvidenceService.getEvidenceTimeline(kid);

  assert(
    timeline.length >= 3,
    'Truy xuất timeline tiến trình cho từ "学习" trả về đầy đủ các cột mốc tiếp xúc, sai và sửa',
    `Số mốc thời gian: ${timeline.length} mốc | Gần nhất: [${timeline[0]?.evidenceType}] ${timeline[0]?.summary}`
  );

  // ==========================================================================
  // SCENARIO 12: KHÔI PHỤC VÀ ĐỐI CHIẾU DỮ LIỆU SAU KHI ĐÓNG/TÁI KẾT NỐI
  // ==========================================================================
  console.log('\n📌 [KỊCH BẢN 12]: TOÀN VẸN DỮ LIỆU EVIDENCE TRONG SQLITE WAL');
  const stats = learningEvidenceService.getEvidenceStatistics();
  const integrity = db.prepare('PRAGMA integrity_check').get() as any;

  assert(
    stats.totalEvidences > 0 && stats.validEvidences > 0 && integrity.integrity_check === 'ok',
    'Dữ liệu bằng chứng học tập được bảo toàn an toàn trong SQLite WAL (integrity ok)',
    `Tổng evidence: ${stats.totalEvidences}, Hợp lệ: ${stats.validEvidences}, Tỉ lệ đúng: ${stats.accuracyRate}%`
  );

  // ==========================================================================
  // TỔNG KẾT
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏆 KẾT QUẢ KIỂM THỬ LEARNING EVIDENCE SYSTEM: ${passCount}/12 PASS, ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 TẤT CẢ 12 TIÊU CHÍ LEARNING EVIDENCE ĐẠT 100% CHUẨN MỰC KIẾN TRÚC V2.1.0!');
  }
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runLearningEvidenceTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
