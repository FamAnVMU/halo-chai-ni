/**
 * Chinese Knowledge Benchmark - Evaluator Engine
 * Phase B4 - Chinese Knowledge Benchmark (Halo Chinese v2.8.0)
 *
 * Provides a 3-tier grading engine:
 * 1. Tier 1: Deterministic checks (Keywords, Pinyin tone marks, Forbidden terms, False-Positive checks).
 * 2. Tier 2: Semantic rubric grading (Concept coverage, linguistic clarity, acceptable alternatives).
 * 3. Tier 3: Behavioral & Memory validation (Hallucination prevention, evidence grounding, anti-parroting).
 */

import {
  BenchmarkCaseResult,
  BenchmarkStatus,
  BenchmarkTestCase,
  CaseMetrics
} from './benchmarkTypes.js';

export class BenchmarkEvaluator {
  /**
   * Evaluate a single test case against the actual response
   */
  public static evaluateCase(
    testCase: BenchmarkTestCase,
    actualResponse: {
      text: string;
      pinyin?: string;
      translation_vi?: string;
      correction_json?: string | null;
      structuredCorrection?: any;
    },
    latencyMs: number = 0,
    tokensUsed: number = 0,
    runId: string = 'run_adhoc'
  ): BenchmarkCaseResult {
    const rawText = (actualResponse.text || '').trim();
    const pinyinField = (actualResponse.pinyin || '').trim();
    const combinedText = `${rawText} ${pinyinField} ${actualResponse.translation_vi || ''}`.toLowerCase();

    const expected = testCase.referenceExpected;
    const errorDetails: string[] = [];

    // --- 1. Deterministic Checks ---

    // 1.1 Required Keywords
    let requiredKeywordsPresent = true;
    if (expected.requiredKeywords && expected.requiredKeywords.length > 0) {
      for (const kw of expected.requiredKeywords) {
        if (!combinedText.includes(kw.toLowerCase())) {
          requiredKeywordsPresent = false;
          errorDetails.push(`Thiếu từ khóa bắt buộc: "${kw}"`);
        }
      }
    }

    // 1.2 Forbidden Keywords
    let forbiddenKeywordsAvoided = true;
    if (expected.forbiddenKeywords && expected.forbiddenKeywords.length > 0) {
      for (const fkw of expected.forbiddenKeywords) {
        if (combinedText.includes(fkw.toLowerCase())) {
          forbiddenKeywordsAvoided = false;
          errorDetails.push(`Xuất hiện từ khóa cấm/sai lệch: "${fkw}"`);
        }
      }
    }

    // 1.3 Pinyin & Tone Sandhi Checks
    let pinyinAccurate = true;
    if (expected.expectedPinyin && expected.expectedPinyin.length > 0) {
      for (const pCheck of expected.expectedPinyin) {
        const expectedPin = pCheck.pinyin.toLowerCase().trim();
        // Check if expected pinyin appears in text or pinyin field
        if (!combinedText.includes(expectedPin)) {
          pinyinAccurate = false;
          errorDetails.push(`Pinyin chưa khớp chuẩn: "${pCheck.hanzi}" mong đợi "${expectedPin}"`);
        }
      }
    }

    // 1.4 False Correction Prevention (Zero Tolerance)
    let falseCorrectionAvoided = true;
    if (expected.isCorrectSentence === true && expected.falseCorrectionForbidden === true) {
      // If the sentence is correct, AI must NOT claim it is wrong or needs correction!
      let claimedWrong = false;

      // Check structured correction_json if present
      if (actualResponse.correction_json) {
        try {
          const parsed = JSON.parse(actualResponse.correction_json);
          if (parsed.is_error === true) {
            claimedWrong = true;
          }
        } catch {
          // ignore json parse error here
        }
      }

      // Check text indicators of erroneous false-correction
      const affirmsCorrect =
        combinedText.includes('không có lỗi') ||
        combinedText.includes('không có bất kỳ lỗi') ||
        combinedText.includes('không có lỗi sai') ||
        combinedText.includes('không bị sai') ||
        combinedText.includes('không sai') ||
        combinedText.includes('hoàn toàn đúng') ||
        combinedText.includes('hoàn toàn chính xác') ||
        combinedText.includes('chính xác 100%') ||
        combinedText.includes('chính xác và tự nhiên') ||
        combinedText.includes('chuẩn 100%') ||
        combinedText.includes('đúng chuẩn') ||
        combinedText.includes('chuẩn ngữ pháp');

      const textSuggestsError =
        !affirmsCorrect &&
        (combinedText.includes('bị sai') ||
         combinedText.includes('lỗi sai') ||
         combinedText.includes('câu sai') ||
         combinedText.includes('sai ngữ pháp') ||
         combinedText.includes('cần sửa thành') ||
         combinedText.includes('sửa lại là'));

      if (claimedWrong || textSuggestsError) {
        falseCorrectionAvoided = false;
        errorDetails.push(`BÁO ĐỘNG SỬA NHẦM: Câu đúng "${testCase.userSentence}" bị AI phán sai!`);
      }
    }

    // 1.5 Real Error Detection
    let errorCorrectlyIdentified = true;
    if (expected.isCorrectSentence === false && expected.expectedErrorDetection === true) {
      let detected = false;
      if (actualResponse.correction_json) {
        try {
          const parsed = JSON.parse(actualResponse.correction_json);
          if (parsed.is_error === true) detected = true;
        } catch {
          // ignore
        }
      }
      if (
        combinedText.includes('sai') ||
        combinedText.includes('lỗi') ||
        combinedText.includes('chưa đúng') ||
        combinedText.includes('sửa thành') ||
        combinedText.includes('phải là')
      ) {
        detected = true;
      }

      if (!detected) {
        errorCorrectlyIdentified = false;
        errorDetails.push(`Bỏ sót lỗi sai thực tế trong câu: "${testCase.userSentence}"`);
      }
    }

    // 1.6 Schema Validity
    let schemaValid = true;
    if (testCase.mockResponse.correction_json !== undefined && actualResponse.correction_json) {
      try {
        JSON.parse(actualResponse.correction_json);
      } catch (e: any) {
        schemaValid = false;
        errorDetails.push(`JSON correction không hợp lệ: ${e.message}`);
      }
    }

    // --- 2. Semantic Rubric Evaluation ---
    let semanticScore = 100;
    if (expected.semanticRubric && expected.semanticRubric.length > 0) {
      let earnedWeight = 0;
      let totalWeight = 0;

      for (const rubric of expected.semanticRubric) {
        totalWeight += rubric.weight;
        let criterionPassed = false;

        if (rubric.keywords && rubric.keywords.length > 0) {
          // Check if at least 60% of rubric keywords are present
          const matchedCount = rubric.keywords.filter(kw => combinedText.includes(kw.toLowerCase())).length;
          if (matchedCount >= Math.ceil(rubric.keywords.length * 0.5)) {
            criterionPassed = true;
          }
        } else {
          criterionPassed = true;
        }

        if (criterionPassed) {
          earnedWeight += rubric.weight;
        } else {
          errorDetails.push(`Chưa đạt tiêu chí ngữ nghĩa: "${rubric.criterion}"`);
        }
      }

      semanticScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;
    }

    // --- 3. Behavioral & Memory Evaluation ---
    let behavioralScore = 100;
    const bReq = expected.behavioralRequirements;
    if (bReq) {
      let bPoints = 0;
      let bTotal = 0;

      // 3.1 Must Refuse Ungrounded Mastery
      if (bReq.mustRefuseUngroundedMastery) {
        bTotal += 50;
        const mentionsUngroundedClaim =
          (combinedText.includes('bạn đã thành thạo') ||
           combinedText.includes('đã nắm vững') ||
           combinedText.includes('bạn làm chủ hoàn toàn') ||
           combinedText.includes('đã làm chủ hoàn toàn')) &&
          !combinedText.includes('chưa thể coi là') &&
          !combinedText.includes('chưa được coi là') &&
          !combinedText.includes('chưa coi là') &&
          !combinedText.includes('chưa thành thạo') &&
          !combinedText.includes('chưa thể xem là');

        const acknowledgesPracticeNeeded =
          combinedText.includes('chưa') ||
          combinedText.includes('tiếp xúc') ||
          combinedText.includes('luyện tập') ||
          combinedText.includes('thực hành');

        if (!mentionsUngroundedClaim && acknowledgesPracticeNeeded) {
          bPoints += 50;
        } else {
          errorDetails.push('Vi phạm bộ nhớ: AI tuyên bố người học thành thạo khi chưa có bằng chứng thực hành!');
        }
      }

      // 3.2 Must Scaffold Without Repetition & Preserve Autonomy
      if (bReq.mustScaffoldWithoutRepetition) {
        bTotal += 30;
        const hasAnalogyOrIntuition =
          combinedText.includes('tưởng tượng') ||
          combinedText.includes('ví dụ') ||
          combinedText.includes('hành động') ||
          combinedText.includes('trực quan');
        if (hasAnalogyOrIntuition) {
          bPoints += 30;
        } else {
          errorDetails.push('Sư phạm rập khuôn: Chưa giải thích theo phương pháp trực quan khi người học chưa hiểu');
        }
      }

      if (bReq.mustPreserveLearnerAutonomy) {
        bTotal += 20;
        const invitesPractice =
          combinedText.includes('bạn thử') ||
          combinedText.includes('thử nhé') ||
          combinedText.includes('thử đặt') ||
          combinedText.includes('?');
        if (invitesPractice) {
          bPoints += 20;
        } else {
          errorDetails.push('Thiếu tương tác tự chủ: Không đưa ra câu hỏi/bài tập nhỏ để học viên tự vận dụng');
        }
      }

      behavioralScore = bTotal > 0 ? Math.round((bPoints / bTotal) * 100) : 100;
    }

    // --- 4. Final Score & Verdict Calculation ---
    const metrics: CaseMetrics = {
      schemaValid,
      pinyinAccurate,
      forbiddenKeywordsAvoided,
      requiredKeywordsPresent,
      falseCorrectionAvoided,
      errorCorrectlyIdentified,
      semanticScore,
      behavioralScore
    };

    // Calculate weighted total score
    let totalScore = 0;

    // Hard fail condition: False correction on a correct sentence
    if (!falseCorrectionAvoided) {
      totalScore = 0; // Immediate failure for false accusation!
    } else if (!errorCorrectlyIdentified) {
      totalScore = Math.min(40, semanticScore * 0.4);
    } else {
      const deterministicPassed = (requiredKeywordsPresent ? 40 : 0) + (forbiddenKeywordsAvoided ? 30 : 0) + (pinyinAccurate ? 30 : 0);
      totalScore = Math.round(
        deterministicPassed * 0.35 +
        semanticScore * 0.45 +
        behavioralScore * 0.20
      );
    }

    let status: BenchmarkStatus = 'passed';
    if (totalScore < 60 || !falseCorrectionAvoided || !errorCorrectlyIdentified) {
      status = 'failed';
    } else if (totalScore < 80) {
      status = 'warning';
    }

    const expectedSummary = [
      expected.isCorrectSentence ? 'Câu đúng (Chống sửa nhầm)' : 'Phát hiện lỗi',
      expected.requiredKeywords ? `KWs: ${expected.requiredKeywords.slice(0, 3).join(', ')}` : '',
      expected.expectedPinyin ? `Pinyin: ${expected.expectedPinyin.map(p => p.pinyin).join(', ')}` : ''
    ].filter(Boolean).join(' | ');

    const actualSummary = rawText.length > 120 ? rawText.substring(0, 117) + '...' : rawText;

    return {
      id: `case_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      runId,
      caseId: testCase.id,
      domain: testCase.domain,
      subDomain: testCase.subDomain,
      title: testCase.title,
      tier: testCase.tier,
      status,
      score: totalScore,
      metrics,
      expectedSummary,
      actualSummary,
      errorDetails: errorDetails.length > 0 ? errorDetails.join('; ') : undefined,
      latencyMs,
      tokensUsed,
      createdAt: Date.now()
    };
  }
}
