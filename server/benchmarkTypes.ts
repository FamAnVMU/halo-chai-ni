/**
 * Chinese Knowledge Benchmark - Type Definitions & Contracts
 * Phase B4 - Chinese Knowledge Benchmark (Halo Chinese v2.7.0)
 *
 * Defines the core types for deterministic tests, semantic rubrics, behavioral
 * memory evaluations, golden dataset specifications, and regression comparison reports.
 */

export type BenchmarkDomain =
  | 'vocabulary'
  | 'pinyin'
  | 'grammar'
  | 'translation'
  | 'error_correction'
  | 'teaching_quality'
  | 'memory_grounding';

export type BenchmarkTier =
  | 'tier1_deterministic'
  | 'tier2_semantic_rubric'
  | 'tier3_behavioral_memory';

export type BenchmarkStatus = 'passed' | 'failed' | 'warning';

export interface SemanticCriterion {
  criterion: string;
  weight: number; // e.g., 0.25
  description: string;
  keywords?: string[]; // Essential concepts that should appear
  forbiddenKeywords?: string[];
}

export interface ExpectedPinyinCheck {
  hanzi: string;
  pinyin: string; // e.g. "yí ge" or "bú shì" or "bàba"
  ruleDescription?: string;
}

export interface ReferenceExpectedCriteria {
  // Correct sentence testing (Zero Tolerance for False Corrections)
  isCorrectSentence?: boolean; // When true, sentence is valid Chinese; flagging as error is a False Positive!
  falseCorrectionForbidden?: boolean;

  // Keyword requirements
  requiredKeywords?: string[];
  forbiddenKeywords?: string[];

  // Phonetic tone & sandhi check
  expectedPinyin?: ExpectedPinyinCheck[];

  // Error correction domain
  expectedErrorCategory?: string; // 'phonetic' | 'lexical' | 'syntactic' | 'collocation' | 'pragmatic'
  expectedErrorDetection?: boolean;

  // Semantic & Translation
  targetMeaningVi?: string;
  acceptableAlternatives?: string[];
  semanticRubric?: SemanticCriterion[];

  // Behavioral & Memory constraints
  behavioralRequirements?: {
    mustRefuseUngroundedMastery?: boolean; // AI must NOT say user mastered something if unproven
    mustScaffoldWithoutRepetition?: boolean; // When learner says "chưa hiểu", must adapt and not repeat verbatim
    mustPreserveLearnerAutonomy?: boolean; // Give learner a turn to practice
    expectedEvidenceStage?: string; // e.g. 'unexposed', 'practicing', 'mastered'
  };
}

export interface BenchmarkTestCase {
  id: string; // e.g. 'VOCAB_SYNONYM_XIANG_YAO'
  domain: BenchmarkDomain;
  subDomain: string; // e.g. 'near_synonyms', 'tone_sandhi', 'ba_structure', 'false_correction'
  title: string;
  description: string;
  hskLevel: number; // 1 to 6
  tier: BenchmarkTier;

  // Input to AI or evaluator
  promptInput: string;
  systemContext?: string;
  userSentence?: string;

  // Ground truth reference
  referenceExpected: ReferenceExpectedCriteria;

  // Mock / deterministic response for offline runner
  mockResponse: {
    text: string;
    pinyin?: string;
    translation_vi?: string;
    correction_json?: string | null;
    structuredCorrection?: any;
    tokensUsed?: number;
    latencyMs?: number;
  };
}

export interface CaseMetrics {
  schemaValid: boolean;
  pinyinAccurate: boolean;
  forbiddenKeywordsAvoided: boolean;
  requiredKeywordsPresent: boolean;
  falseCorrectionAvoided: boolean;
  errorCorrectlyIdentified: boolean;
  semanticScore: number; // 0 - 100
  behavioralScore: number; // 0 - 100
}

export interface BenchmarkCaseResult {
  id: string;
  runId: string;
  caseId: string;
  domain: BenchmarkDomain;
  subDomain: string;
  title: string;
  tier: BenchmarkTier;
  status: BenchmarkStatus;
  score: number; // 0 - 100
  metrics: CaseMetrics;
  expectedSummary: string;
  actualSummary: string;
  errorDetails?: string;
  latencyMs: number;
  tokensUsed: number;
  createdAt: number;
}

export interface DomainScoreSummary {
  domain: BenchmarkDomain;
  total: number;
  passed: number;
  failed: number;
  warning: number;
  accuracy: number; // 0 - 100%
  avgScore: number; // 0 - 100
}

export interface BenchmarkRun {
  id: string;
  runName: string;
  mode: 'offline' | 'live';
  modelId: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  warningCases: number;
  accuracyRate: number; // 0 - 100%
  falseCorrectionRate: number; // 0 - 100% (CRITICAL: lower is better; 0% is target)
  errorDetectionPrecision: number; // 0 - 100%
  avgLatencyMs: number;
  totalTokens: number;
  domainBreakdown: Record<BenchmarkDomain, DomainScoreSummary>;
  createdAt: number;
}

export interface BenchmarkComparisonReport {
  baselineRunId: string;
  targetRunId: string;
  baselineName: string;
  targetName: string;
  accuracyDelta: number; // + is good
  falseCorrectionDelta: number; // - is good (reduction in false corrections)
  latencyDeltaMs: number;
  regressions: Array<{
    caseId: string;
    title: string;
    domain: BenchmarkDomain;
    baselineStatus: BenchmarkStatus;
    targetStatus: BenchmarkStatus;
    baselineScore: number;
    targetScore: number;
    reason: string;
  }>;
  improvements: Array<{
    caseId: string;
    title: string;
    domain: BenchmarkDomain;
    baselineScore: number;
    targetScore: number;
  }>;
  domainDeltas: Record<BenchmarkDomain, {
    baselineAccuracy: number;
    targetAccuracy: number;
    delta: number;
  }>;
  verdict: 'PROMOTABLE' | 'BLOCKED_BY_REGRESSION' | 'NEUTRAL';
  verdictReason: string;
}
