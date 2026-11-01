/**
 * Test Suite: Phase B4 - Chinese Knowledge Benchmark (Halo Chinese v2.8.0)
 *
 * Verifies:
 * 1. Golden Dataset integrity & 6-domain coverage.
 * 2. Deterministic evaluation with Zero Tolerance for False Corrections.
 * 3. Real learner error detection & syntactic diagnosis.
 * 4. Pinyin tone sandhi & neutral tone validation.
 * 5. Semantic rubric grading for grammar and vocabulary.
 * 6. Behavioral memory grounding & hallucination prevention.
 * 7. Master offline benchmark execution & SQLite persistence.
 * 8. Pre/Post comparison engine & regression detection verdict.
 */

import { GOLDEN_DATASET } from '../server/goldenDataset.js';
import { BenchmarkEvaluator } from '../server/benchmarkEvaluator.js';
import { BenchmarkRunner } from '../server/benchmarkRunner.js';
import { db } from '../server/db.js';
import { BenchmarkDomain, BenchmarkTestCase } from '../server/benchmarkTypes.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedTests++;
  }
}

async function runBenchmarkTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING CHINESE KNOWLEDGE BENCHMARK SUITE (PHASE B4 - v2.8.0)');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TC 1: Golden Dataset Integrity & 6-Domain Coverage
  // -------------------------------------------------------------
  console.log('🧪 TC 1: Golden Dataset Integrity & 6-Domain Coverage');
  assert(GOLDEN_DATASET.length >= 15, `Golden dataset có ${GOLDEN_DATASET.length} test cases (yêu cầu >= 15)`);

  const domains = new Set(GOLDEN_DATASET.map(c => c.domain));
  const expectedDomains: BenchmarkDomain[] = [
    'vocabulary',
    'pinyin',
    'grammar',
    'translation',
    'error_correction',
    'teaching_quality',
    'memory_grounding'
  ];

  for (const expDomain of expectedDomains) {
    assert(domains.has(expDomain), `Dataset bao phủ domain: "${expDomain}"`);
  }

  const hskLevels = new Set(GOLDEN_DATASET.map(c => c.hskLevel));
  assert(hskLevels.has(1) && hskLevels.has(2) && hskLevels.has(3), 'Dataset bao phủ đầy đủ các trình độ HSK 1, 2, 3');

  // -------------------------------------------------------------
  // TC 2: Deterministic Evaluator - False Correction Prevention (Crucial)
  // -------------------------------------------------------------
  console.log('\n🧪 TC 2: False Correction Prevention (Chống sửa nhầm câu đúng - Zero Tolerance)');
  const falseCorrectionCases = GOLDEN_DATASET.filter(c => c.referenceExpected.isCorrectSentence === true);
  assert(falseCorrectionCases.length >= 4, `Có ${falseCorrectionCases.length} ca kiểm thử chống sửa nhầm câu đúng`);

  for (const c of falseCorrectionCases) {
    const evalResult = BenchmarkEvaluator.evaluateCase(c, c.mockResponse, 100, 80);
    assert(
      evalResult.metrics.falseCorrectionAvoided === true,
      `[${c.id}] Không sửa nhầm câu đúng: "${c.userSentence}" (Score: ${evalResult.score})`
    );
    assert(evalResult.status === 'passed', `[${c.id}] Trạng thái PASS cho câu đúng`);
  }

  // Edge Case: Test an AI model that mistakenly flags a correct sentence
  const testCaseHenGaoxing = GOLDEN_DATASET.find(c => c.id === 'FALSE_CORR_HEN_GAOXING')!;
  const buggyResponse = {
    text: 'Câu của bạn bị sai ngữ pháp! Trong tiếng Trung phải có động từ 是, câu sửa lại là: 我是很高兴。',
    correction_json: JSON.stringify({ is_error: true, original: '我今天很高兴。', corrected: '我是很高兴。' })
  };
  const buggyResult = BenchmarkEvaluator.evaluateCase(testCaseHenGaoxing, buggyResponse, 100, 80);
  assert(buggyResult.metrics.falseCorrectionAvoided === false, 'Phát hiện chính xác hành vi AI sửa nhầm câu đúng');
  assert(buggyResult.status === 'failed' && buggyResult.score === 0, 'Phạt điểm 0 và đánh rớt lập tức khi AI sửa nhầm câu đúng');

  // -------------------------------------------------------------
  // TC 3: Deterministic Evaluator - Real Error Detection
  // -------------------------------------------------------------
  console.log('\n🧪 TC 3: Real Error Detection & Syntactic Diagnosis');
  const realErrorCases = GOLDEN_DATASET.filter(c => c.referenceExpected.isCorrectSentence === false);
  assert(realErrorCases.length >= 2, `Có ${realErrorCases.length} ca kiểm thử phát hiện lỗi thật`);

  for (const c of realErrorCases) {
    const evalResult = BenchmarkEvaluator.evaluateCase(c, c.mockResponse, 100, 80);
    assert(
      evalResult.metrics.errorCorrectlyIdentified === true,
      `[${c.id}] Phát hiện đúng lỗi sai thực tế trong câu: "${c.userSentence}"`
    );
    assert(evalResult.status === 'passed', `[${c.id}] Sửa lỗi và hướng dẫn đạt chuẩn`);
  }

  // -------------------------------------------------------------
  // TC 4: Phonetic Tone Sandhi & Neutral Tone Checks
  // -------------------------------------------------------------
  console.log('\n🧪 TC 4: Phonetic Tone Sandhi & Neutral Tone Checks');
  const pinyinCases = GOLDEN_DATASET.filter(c => c.domain === 'pinyin');
  assert(pinyinCases.length >= 4, `Có ${pinyinCases.length} ca kiểm thử ngữ âm & biến điệu`);

  const yiFourth = GOLDEN_DATASET.find(c => c.id === 'PINYIN_SANDHI_YI_FOURTH')!;
  const evalYiFourth = BenchmarkEvaluator.evaluateCase(yiFourth, yiFourth.mockResponse);
  assert(evalYiFourth.metrics.pinyinAccurate === true, 'Biến điệu chữ 一 trước thanh 4 chuẩn: yí ge, yí dìng');

  const buFourth = GOLDEN_DATASET.find(c => c.id === 'PINYIN_SANDHI_BU_FOURTH')!;
  const evalBuFourth = BenchmarkEvaluator.evaluateCase(buFourth, buFourth.mockResponse);
  assert(evalBuFourth.metrics.pinyinAccurate === true, 'Biến điệu chữ 不 trước thanh 4 chuẩn: bú shì');

  const neutralBaba = GOLDEN_DATASET.find(c => c.id === 'PINYIN_NEUTRAL_BABA_MAMA')!;
  const evalNeutral = BenchmarkEvaluator.evaluateCase(neutralBaba, neutralBaba.mockResponse);
  assert(evalNeutral.metrics.pinyinAccurate === true, 'Thanh nhẹ xưng hô chuẩn: bàba, māma');

  // -------------------------------------------------------------
  // TC 5: Semantic Rubric Evaluator
  // -------------------------------------------------------------
  console.log('\n🧪 TC 5: Semantic Rubric Evaluator (Grammar & Near-Synonyms)');
  const baCase = GOLDEN_DATASET.find(c => c.id === 'GRAMMAR_BA_CONSTRUCTION')!;
  const evalBa = BenchmarkEvaluator.evaluateCase(baCase, baCase.mockResponse);
  assert(evalBa.metrics.semanticScore >= 80, `Đánh giá rubric câu chữ 把 đạt ${evalBa.metrics.semanticScore}/100`);

  const synonymCase = GOLDEN_DATASET.find(c => c.id === 'VOCAB_SYNONYM_XIANG_YAO')!;
  const evalSynonym = BenchmarkEvaluator.evaluateCase(synonymCase, synonymCase.mockResponse);
  assert(evalSynonym.metrics.semanticScore >= 80, `Đánh giá rubric phân biệt 想 và 要 đạt ${evalSynonym.metrics.semanticScore}/100`);

  // -------------------------------------------------------------
  // TC 6: Behavioral Memory Grounding & Hallucination Defense
  // -------------------------------------------------------------
  console.log('\n🧪 TC 6: Behavioral Memory Grounding & Hallucination Defense');
  const memoryCase = GOLDEN_DATASET.find(c => c.id === 'MEMORY_REFUSE_UNGROUNDED_MASTERY')!;
  const evalMemory = BenchmarkEvaluator.evaluateCase(memoryCase, memoryCase.mockResponse);
  assert(evalMemory.metrics.behavioralScore === 100, 'Từ chối khẳng định thành thạo khi chưa có bằng chứng thực hành');

  // Test an AI that hallucinates mastery without evidence
  const hallucinatedResp = {
    text: 'Bạn đã thành thạo và làm chủ hoàn toàn câu chữ 把 rồi nhé!'
  };
  const evalHallucinated = BenchmarkEvaluator.evaluateCase(memoryCase, hallucinatedResp);
  assert(evalHallucinated.metrics.behavioralScore < 100, 'Bắt lỗi ảo giác thành thạo khi AI tự tiện tuyên bố');

  // -------------------------------------------------------------
  // TC 7: Master Offline Benchmark Run & SQLite Persistence
  // -------------------------------------------------------------
  console.log('\n🧪 TC 7: Master Offline Benchmark Execution & SQLite Persistence');
  const runner = new BenchmarkRunner();
  const runResult = runner.runOfflineBenchmark({ runName: 'TC7 Verification Run' });

  assert(runResult.totalCases === GOLDEN_DATASET.length, `Tổng số ca kiểm thử: ${runResult.totalCases}`);
  assert(runResult.passedCases > 0, `Số ca đạt: ${runResult.passedCases}`);
  assert(runResult.accuracyRate >= 90, `Độ chính xác toàn diện đạt: ${runResult.accuracyRate}% (yêu cầu >= 90%)`);
  assert(runResult.falseCorrectionRate === 0, `Tỷ lệ sửa nhầm câu đúng: ${runResult.falseCorrectionRate}% (yêu cầu = 0%)`);
  assert(runResult.errorDetectionPrecision === 100, `Độ chính xác phát hiện lỗi thật: ${runResult.errorDetectionPrecision}%`);

  // Verify SQLite persistence
  const savedRun = db.prepare('SELECT * FROM benchmark_runs WHERE id = ?').get(runResult.id) as any;
  assert(!!savedRun, `Bản ghi benchmark_runs được lưu thành công vào SQLite (id: ${runResult.id})`);

  const savedCasesCount = db.prepare('SELECT COUNT(*) as count FROM benchmark_case_results WHERE run_id = ?').get(runResult.id) as any;
  assert(savedCasesCount.count === GOLDEN_DATASET.length, `Đã lưu đủ ${savedCasesCount.count} kết quả case chi tiết`);

  // -------------------------------------------------------------
  // TC 8: Pre/Post Comparison & Regression Detection Engine
  // -------------------------------------------------------------
  console.log('\n🧪 TC 8: Pre/Post Comparison & Regression Detection Engine');
  // Create a second simulated run with a regression
  const regressedDataset: BenchmarkTestCase[] = JSON.parse(JSON.stringify(GOLDEN_DATASET));
  // Cause regression on one case:
  const targetCase = regressedDataset.find(c => c.id === 'FALSE_CORR_HEN_GAOXING')!;
  targetCase.mockResponse = {
    text: 'Câu này bị sai ngữ pháp! Cần sửa lại là: 我是很高兴。',
    correction_json: JSON.stringify({ is_error: true })
  };

  const regressedRun = runner.runOfflineBenchmark({
    runName: 'TC8 Regressed Candidate Run',
    dataset: regressedDataset
  });

  const comparisonReport = runner.compareRuns(runResult.id, regressedRun.id);
  assert(comparisonReport.regressions.length >= 1, `Phát hiện chính xác ${comparisonReport.regressions.length} ca thoái lui (regression)`);
  assert(comparisonReport.verdict === 'BLOCKED_BY_REGRESSION', `Phán quyết chặn phát hành: "${comparisonReport.verdict}" (${comparisonReport.verdictReason})`);

  // Test comparison with identical/healthy run
  const cleanCandidateRun = runner.runOfflineBenchmark({ runName: 'TC8 Clean Candidate Run' });
  const cleanComparison = runner.compareRuns(runResult.id, cleanCandidateRun.id);
  assert(cleanComparison.regressions.length === 0, 'Không phát hiện thoái lui trên bản chạy sạch');
  assert(cleanComparison.verdict !== 'BLOCKED_BY_REGRESSION', `Phán quyết hợp lệ: "${cleanComparison.verdict}"`);

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedTests} passed, ${failedTests} failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runBenchmarkTestSuite().catch(err => {
  console.error('Lỗi khi chạy benchmark test suite:', err);
  process.exit(1);
});
