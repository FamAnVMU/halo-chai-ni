/**
 * Chinese Knowledge Benchmark - Master Runner & Comparison Engine
 * Phase B4 - Chinese Knowledge Benchmark (Halo Chinese v2.8.0)
 *
 * Core capabilities:
 * 1. Offline runner: Instant, free, deterministic regression testing on Golden Dataset.
 * 2. Live runner: Direct model invocation via Unified AI Orchestrator with latency/token tracking.
 * 3. Database persistence for benchmark runs and granular case results.
 * 4. Pre/Post Comparison Engine: Detecting regressions, improvements, delta metrics, and release verdict.
 */

import { db } from './db.js';
import {
  BenchmarkCaseResult,
  BenchmarkComparisonReport,
  BenchmarkDomain,
  BenchmarkRun,
  BenchmarkStatus,
  BenchmarkTestCase,
  DomainScoreSummary
} from './benchmarkTypes.js';
import { GOLDEN_DATASET } from './goldenDataset.js';
import { BenchmarkEvaluator } from './benchmarkEvaluator.js';
import { UnifiedAIOrchestrator } from './unifiedAIOrchestrator.js';

export interface RunBenchmarkOptions {
  domain?: BenchmarkDomain;
  runName?: string;
  dataset?: BenchmarkTestCase[];
  modelId?: string;
  maxCases?: number;
}

export class BenchmarkRunner {
  private orchestrator: UnifiedAIOrchestrator;

  constructor() {
    this.orchestrator = new UnifiedAIOrchestrator();
  }

  /**
   * Run the offline benchmark suite
   * Uses verified mock/fixture responses from Golden Dataset.
   * Instant, deterministic, zero-token cost, ideal for CI/CD and pre-commit checks.
   */
  public runOfflineBenchmark(options: RunBenchmarkOptions = {}): BenchmarkRun {
    const startTime = Date.now();
    const runId = `run_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const runName = options.runName || `Offline Benchmark (${new Date().toLocaleTimeString('vi-VN')})`;

    let cases = options.dataset || GOLDEN_DATASET;
    if (options.domain) {
      cases = cases.filter(c => c.domain === options.domain);
    }
    if (options.maxCases && options.maxCases > 0) {
      cases = cases.slice(0, options.maxCases);
    }

    const caseResults: BenchmarkCaseResult[] = [];
    let totalLatency = 0;
    let totalTokens = 0;

    for (const testCase of cases) {
      const mockResp = testCase.mockResponse;
      const latency = mockResp.latencyMs || Math.floor(Math.random() * 50) + 50;
      const tokens = mockResp.tokensUsed || Math.floor(Math.random() * 40) + 60;
      totalLatency += latency;
      totalTokens += tokens;

      const result = BenchmarkEvaluator.evaluateCase(
        testCase,
        mockResp,
        latency,
        tokens,
        runId
      );
      caseResults.push(result);
    }

    const runSummary = this.aggregateRunSummary(
      runId,
      runName,
      'offline',
      'mock_golden_dataset',
      cases,
      caseResults,
      totalLatency,
      totalTokens,
      startTime
    );

    this.persistRun(runSummary, caseResults);
    return runSummary;
  }

  /**
   * Run the live benchmark suite against actual Gemini models
   * Uses Unified AI Orchestrator to measure live response quality, latency, and tokens.
   */
  public async runLiveBenchmark(options: RunBenchmarkOptions = {}): Promise<BenchmarkRun> {
    const startTime = Date.now();
    const runId = `run_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const targetModel = options.modelId || this.orchestrator.getTextModel();
    const runName = options.runName || `Live Benchmark [${targetModel}] (${new Date().toLocaleTimeString('vi-VN')})`;

    let cases = options.dataset || GOLDEN_DATASET;
    if (options.domain) {
      cases = cases.filter(c => c.domain === options.domain);
    }
    if (options.maxCases && options.maxCases > 0) {
      cases = cases.slice(0, options.maxCases);
    }

    const caseResults: BenchmarkCaseResult[] = [];
    let totalLatency = 0;
    let totalTokens = 0;

    for (const testCase of cases) {
      const caseStart = Date.now();
      let actualText = '';
      let pinyin: string | undefined;
      let tokensUsed = 0;

      let correctionJson: string | null = null;
      try {
        // Resolve valid AITaskId from TaskRegistry
        let taskId: any = 'AI_TUTOR_CHAT';
        let inputData: any = {
          message: testCase.promptInput,
          userSentence: testCase.userSentence,
          hskLevel: testCase.hskLevel,
          mode: 'free',
          systemContext: testCase.systemContext
        };

        if (testCase.domain === 'grammar') {
          taskId = 'EXPLAIN_GRAMMAR';
          inputData = {
            patternName: testCase.subDomain,
            userMessage: testCase.promptInput,
            hskLevel: testCase.hskLevel
          };
        } else if (testCase.domain === 'vocabulary' && testCase.subDomain === 'near_synonyms') {
          taskId = 'COMPARE_WORDS';
          inputData = {
            wordA: testCase.title.split(' ')[0] || 'A',
            wordB: testCase.title.split(' ')[1] || 'B',
            userMessage: testCase.promptInput,
            hskLevel: testCase.hskLevel
          };
        }

        // Route through Unified AI Orchestrator
        const response = await this.orchestrator.executeTask({
          taskId,
          input: inputData,
          overrideModel: targetModel
        });

        if (response.data?.replyZh) {
          actualText = `${response.data.replyZh}\n${response.data.replyPinyin || ''}\n${response.data.replyVi || ''}`;
        } else {
          actualText = response.data?.summaryVi || response.data?.explanationVi || response.data?.explanation_vi || response.rawText || JSON.stringify(response.data);
        }
        pinyin = response.data?.replyPinyin || response.data?.pinyin;
        correctionJson = response.data?.hasCorrection ? JSON.stringify(response.data.correction) : (response.data?.correction_json || null);
        tokensUsed = response.metrics?.tokenUsage?.totalTokens || 100;
      } catch (err: any) {
        actualText = `Lỗi gọi model: ${err.message}`;
      }

      const caseLatency = Date.now() - caseStart;
      totalLatency += caseLatency;
      totalTokens += tokensUsed;

      const result = BenchmarkEvaluator.evaluateCase(
        testCase,
        { text: actualText, pinyin, correction_json: correctionJson },
        caseLatency,
        tokensUsed,
        runId
      );
      caseResults.push(result);
    }

    const runSummary = this.aggregateRunSummary(
      runId,
      runName,
      'live',
      targetModel,
      cases,
      caseResults,
      totalLatency,
      totalTokens,
      startTime
    );

    this.persistRun(runSummary, caseResults);
    return runSummary;
  }

  /**
   * Aggregate statistics, accuracy, false-correction rates, and domain breakdowns
   */
  private aggregateRunSummary(
    runId: string,
    runName: string,
    mode: 'offline' | 'live',
    modelId: string,
    cases: BenchmarkTestCase[],
    results: BenchmarkCaseResult[],
    totalLatency: number,
    totalTokens: number,
    startTime: number
  ): BenchmarkRun {
    const totalCases = results.length;
    const passedCases = results.filter(r => r.status === 'passed').length;
    const failedCases = results.filter(r => r.status === 'failed').length;
    const warningCases = results.filter(r => r.status === 'warning').length;

    const accuracyRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 1000) / 10 : 0;
    const avgLatencyMs = totalCases > 0 ? Math.round(totalLatency / totalCases) : 0;

    // False Correction Rate: Only cases where sentence was valid
    const correctSentenceCases = cases.filter(c => c.referenceExpected.isCorrectSentence === true);
    const falselyCorrectedCount = results.filter(r => {
      const originalCase = cases.find(c => c.id === r.caseId);
      return originalCase?.referenceExpected.isCorrectSentence === true && !r.metrics.falseCorrectionAvoided;
    }).length;

    const falseCorrectionRate = correctSentenceCases.length > 0
      ? Math.round((falselyCorrectedCount / correctSentenceCases.length) * 1000) / 10
      : 0;

    // Error Detection Precision: Cases where sentence was wrong
    const erroneousSentenceCases = cases.filter(c => c.referenceExpected.isCorrectSentence === false);
    const correctlyDetectedErrors = results.filter(r => {
      const originalCase = cases.find(c => c.id === r.caseId);
      return originalCase?.referenceExpected.isCorrectSentence === false && r.metrics.errorCorrectlyIdentified;
    }).length;

    const errorDetectionPrecision = erroneousSentenceCases.length > 0
      ? Math.round((correctlyDetectedErrors / erroneousSentenceCases.length) * 1000) / 10
      : 100;

    // Domain Breakdown
    const domains: BenchmarkDomain[] = [
      'vocabulary',
      'pinyin',
      'grammar',
      'translation',
      'error_correction',
      'teaching_quality',
      'memory_grounding'
    ];

    const domainBreakdown: Record<BenchmarkDomain, DomainScoreSummary> = {} as any;

    for (const d of domains) {
      const dResults = results.filter(r => r.domain === d);
      const dTotal = dResults.length;
      const dPassed = dResults.filter(r => r.status === 'passed').length;
      const dFailed = dResults.filter(r => r.status === 'failed').length;
      const dWarning = dResults.filter(r => r.status === 'warning').length;
      const dAvgScore = dTotal > 0 ? Math.round(dResults.reduce((sum, r) => sum + r.score, 0) / dTotal) : 0;
      const dAccuracy = dTotal > 0 ? Math.round((dPassed / dTotal) * 1000) / 10 : 0;

      domainBreakdown[d] = {
        domain: d,
        total: dTotal,
        passed: dPassed,
        failed: dFailed,
        warning: dWarning,
        accuracy: dAccuracy,
        avgScore: dAvgScore
      };
    }

    return {
      id: runId,
      runName,
      mode,
      modelId,
      totalCases,
      passedCases,
      failedCases,
      warningCases,
      accuracyRate,
      falseCorrectionRate,
      errorDetectionPrecision,
      avgLatencyMs,
      totalTokens,
      domainBreakdown,
      createdAt: startTime
    };
  }

  /**
   * Persist benchmark run and individual case results to SQLite
   */
  private persistRun(run: BenchmarkRun, cases: BenchmarkCaseResult[]): void {
    const insertRunStmt = db.prepare(`
      INSERT OR REPLACE INTO benchmark_runs (
        id, run_name, mode, model_id, total_cases, passed_cases, failed_cases,
        warning_cases, accuracy_rate, false_correction_rate, error_detection_precision,
        avg_latency_ms, total_tokens, domain_breakdown_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRunStmt.run(
      run.id,
      run.runName,
      run.mode,
      run.modelId,
      run.totalCases,
      run.passedCases,
      run.failedCases,
      run.warningCases,
      run.accuracyRate,
      run.falseCorrectionRate,
      run.errorDetectionPrecision,
      run.avgLatencyMs,
      run.totalTokens,
      JSON.stringify(run.domainBreakdown),
      run.createdAt
    );

    const insertCaseStmt = db.prepare(`
      INSERT OR REPLACE INTO benchmark_case_results (
        id, run_id, case_id, domain, sub_domain, title, tier,
        status, score, metrics_json, expected_summary, actual_summary,
        error_details, latency_ms, tokens_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: BenchmarkCaseResult[]) => {
      for (const item of items) {
        insertCaseStmt.run(
          item.id,
          item.runId,
          item.caseId,
          item.domain,
          item.subDomain,
          item.title,
          item.tier,
          item.status,
          item.score,
          JSON.stringify(item.metrics),
          item.expectedSummary,
          item.actualSummary,
          item.errorDetails || null,
          item.latencyMs,
          item.tokensUsed,
          item.createdAt
        );
      }
    });

    transaction(cases);
  }

  /**
   * Retrieve a specific benchmark run along with its case results
   */
  public getRun(runId: string): { run: BenchmarkRun; cases: BenchmarkCaseResult[] } | null {
    const row = db.prepare('SELECT * FROM benchmark_runs WHERE id = ?').get(runId) as any;
    if (!row) return null;

    const run: BenchmarkRun = {
      id: row.id,
      runName: row.run_name,
      mode: row.mode,
      modelId: row.model_id,
      totalCases: row.total_cases,
      passedCases: row.passed_cases,
      failedCases: row.failed_cases,
      warningCases: row.warning_cases,
      accuracyRate: row.accuracy_rate,
      falseCorrectionRate: row.false_correction_rate,
      errorDetectionPrecision: row.error_detection_precision,
      avgLatencyMs: row.avg_latency_ms,
      totalTokens: row.total_tokens,
      domainBreakdown: JSON.parse(row.domain_breakdown_json || '{}'),
      createdAt: row.created_at
    };

    const caseRows = db.prepare('SELECT * FROM benchmark_case_results WHERE run_id = ? ORDER BY case_id ASC').all(runId) as any[];
    const cases: BenchmarkCaseResult[] = caseRows.map(r => ({
      id: r.id,
      runId: r.run_id,
      caseId: r.case_id,
      domain: r.domain,
      subDomain: r.sub_domain,
      title: r.title,
      tier: r.tier,
      status: r.status,
      score: r.score,
      metrics: JSON.parse(r.metrics_json || '{}'),
      expectedSummary: r.expected_summary,
      actualSummary: r.actual_summary,
      errorDetails: r.error_details,
      latencyMs: r.latency_ms,
      tokensUsed: r.tokens_used,
      createdAt: r.created_at
    }));

    return { run, cases };
  }

  /**
   * List recent benchmark runs
   */
  public listRuns(limit: number = 20): BenchmarkRun[] {
    const rows = db.prepare('SELECT * FROM benchmark_runs ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      runName: row.run_name,
      mode: row.mode,
      modelId: row.model_id,
      totalCases: row.total_cases,
      passedCases: row.passed_cases,
      failedCases: row.failed_cases,
      warningCases: row.warning_cases,
      accuracyRate: row.accuracy_rate,
      falseCorrectionRate: row.false_correction_rate,
      errorDetectionPrecision: row.error_detection_precision,
      avgLatencyMs: row.avg_latency_ms,
      totalTokens: row.total_tokens,
      domainBreakdown: JSON.parse(row.domain_breakdown_json || '{}'),
      createdAt: row.created_at
    }));
  }

  /**
   * Compare two benchmark runs (Baseline vs Target/Candidate)
   * Detects regressions, improvements, delta accuracy, false-correction shift, and release verdict.
   */
  public compareRuns(baselineRunId: string, targetRunId: string): BenchmarkComparisonReport {
    const baseline = this.getRun(baselineRunId);
    const target = this.getRun(targetRunId);

    if (!baseline || !target) {
      throw new Error(`Không tìm thấy một trong hai bản benchmark: ${baselineRunId} hoặc ${targetRunId}`);
    }

    const accuracyDelta = Math.round((target.run.accuracyRate - baseline.run.accuracyRate) * 10) / 10;
    const falseCorrectionDelta = Math.round((target.run.falseCorrectionRate - baseline.run.falseCorrectionRate) * 10) / 10;
    const latencyDeltaMs = target.run.avgLatencyMs - baseline.run.avgLatencyMs;

    const regressions: BenchmarkComparisonReport['regressions'] = [];
    const improvements: BenchmarkComparisonReport['improvements'] = [];

    const baselineCaseMap = new Map(baseline.cases.map(c => [c.caseId, c]));

    for (const targetCase of target.cases) {
      const baseCase = baselineCaseMap.get(targetCase.caseId);
      if (!baseCase) continue;

      // Check for regression: was passed, now failed; or score dropped by >= 20
      const wasPassed = baseCase.status === 'passed';
      const isFailedOrDegraded = targetCase.status === 'failed' || (baseCase.score - targetCase.score >= 20);

      if (wasPassed && isFailedOrDegraded) {
        regressions.push({
          caseId: targetCase.caseId,
          title: targetCase.title,
          domain: targetCase.domain,
          baselineStatus: baseCase.status,
          targetStatus: targetCase.status,
          baselineScore: baseCase.score,
          targetScore: targetCase.score,
          reason: targetCase.errorDetails || `Điểm sụt giảm từ ${baseCase.score} xuống ${targetCase.score}`
        });
      }

      // Check for improvement: was failed/warning, now passed with higher score
      const wasNotPassed = baseCase.status !== 'passed';
      const isNowPassed = targetCase.status === 'passed' && targetCase.score > baseCase.score;
      if (wasNotPassed && isNowPassed) {
        improvements.push({
          caseId: targetCase.caseId,
          title: targetCase.title,
          domain: targetCase.domain,
          baselineScore: baseCase.score,
          targetScore: targetCase.score
        });
      }
    }

    // Domain deltas
    const domainDeltas: BenchmarkComparisonReport['domainDeltas'] = {} as any;
    for (const domain of Object.keys(target.run.domainBreakdown) as BenchmarkDomain[]) {
      const baseDomain = baseline.run.domainBreakdown[domain] || { accuracy: 0 };
      const targetDomain = target.run.domainBreakdown[domain] || { accuracy: 0 };
      domainDeltas[domain] = {
        baselineAccuracy: baseDomain.accuracy,
        targetAccuracy: targetDomain.accuracy,
        delta: Math.round((targetDomain.accuracy - baseDomain.accuracy) * 10) / 10
      };
    }

    // Determine Verdict
    let verdict: BenchmarkComparisonReport['verdict'] = 'NEUTRAL';
    let verdictReason = 'Chất lượng duy trì ổn định tương đương bản chuẩn.';

    if (regressions.length > 0) {
      verdict = 'BLOCKED_BY_REGRESSION';
      verdictReason = `Phát hiện ${regressions.length} trường hợp thoái lui (regression). Bị chặn phát hành!`;
    } else if (falseCorrectionDelta > 0) {
      verdict = 'BLOCKED_BY_REGRESSION';
      verdictReason = `Tỷ lệ sửa nhầm câu đúng tăng (+${falseCorrectionDelta}%). Bị chặn phát hành!`;
    } else if (accuracyDelta > 0 || improvements.length > 0) {
      verdict = 'PROMOTABLE';
      verdictReason = `Độ chính xác tăng (+${accuracyDelta}%), không có thoái lui. Đủ điều kiện phát hành!`;
    }

    return {
      baselineRunId,
      targetRunId,
      baselineName: baseline.run.runName,
      targetName: target.run.runName,
      accuracyDelta,
      falseCorrectionDelta,
      latencyDeltaMs,
      regressions,
      improvements,
      domainDeltas,
      verdict,
      verdictReason
    };
  }
}

export const benchmarkRunner = new BenchmarkRunner();
