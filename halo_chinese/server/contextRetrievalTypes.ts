/**
 * Context Retrieval & Context Builder Types (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 */

import { AITaskId } from './aiOrchestratorTypes.js';

export type ContextProfileName =
  | 'chat_general'
  | 'grammar_explanation'
  | 'vocab_analysis'
  | 'word_comparison'
  | 'sentence_analysis'
  | 'conversation_analysis'
  | 'lesson_generation'
  | 'roadmap_generation'
  | 'placement_test'
  | 'pronunciation_diagnostic'
  | 'reading_comprehension'
  | 'reading_paragraph_explanation'
  | 'shadowing_evaluation'
  | 'srs_hint'
  | 'live_voice'
  | 'default';

export interface ContextProfileConfig {
  profileName: ContextProfileName;
  weights: {
    queryRelevance: number;     // 0.0 - 1.0 (Trực tiếp xuất hiện trong query)
    topicRelevance: number;     // 0.0 - 1.0 (Khớp chủ đề phiên)
    masteryRelevance: number;   // 0.0 - 1.0 (Ưu tiên kiến thức đang yếu / cần ôn)
    evidenceConfidence: number; // 0.0 - 1.0 (Độ tin cậy của bằng chứng)
    recency: number;            // 0.0 - 1.0 (Độ mới theo thời gian)
  };
  maxKnowledgeItems: number;
  maxEvidenceItems: number;
  maxConversationTurns: number;
  maxContextTokens: number;
  includePrerequisites: boolean;
  includeRelations: boolean;
  includeLearnerProfile: boolean;
  includeSessionSummaries: boolean;
}

export interface LearnerProfileContext {
  learnerId: string;
  currentHsk: number;
  targetHsk: number;
  totalStudyMinutes: number;
  strengths: string[];
  weaknesses: string[];
  learningStyle: string;
  isStale?: boolean;
}

export interface CurrentLearningContext {
  sessionId?: string;
  topic?: string;
  scenario?: string;
  activeGoal?: string;
  inputQuery?: string;
}

export interface KnowledgeContextItem {
  id: string;
  knowledgeType: 'vocabulary' | 'grammar' | 'pattern' | 'pronunciation';
  hanziSimplified: string;
  hanziTraditional?: string;
  pinyin: string;
  primaryMeaningVi: string;
  hskLevel: number;
  senses: Array<{
    id: string;
    meaningVi: string;
    partOfSpeech?: string;
    exampleZh?: string;
  }>;
  relations?: Array<{
    relatedId: string;
    relationType: string;
    relatedText: string;
  }>;
  relevanceScore: number;
  rankingRationale?: string;
}

export interface MasteryContextItem {
  knowledgeId: string;
  compositeState: string;
  recognitionScore: number;
  recallScore: number;
  applicationScore: number;
  retentionScore: number;
  confidenceScore: number;
  needsReview: boolean;
  everMastered: boolean;
  lastEvaluatedAt: number;
  isContradictionDetected?: boolean;
}

export interface EvidenceContextItem {
  id: string;
  knowledgeId?: string;
  evidenceType: string;
  speaker: 'user' | 'assistant' | 'system';
  userQuote: string;
  assessmentSummary: string;
  confidenceScore: number;
  diagnosticValue: 'high' | 'medium' | 'low';
  occurredAt: number;
  repetitionCount: number;
}

export interface SessionPedagogicSummary {
  id: string;
  sessionId: string;
  learnerId: string;
  topic: string;
  taughtKnowledge: Array<{ id?: string; text: string; type: string }>;
  practicedKnowledge: Array<{ id?: string; text: string; isCorrect: boolean }>;
  masteredKnowledge: Array<{ id?: string; text: string }>;
  keyErrors: Array<{ text: string; errorType: string; explanation: string }>;
  assessmentSummaryVi: string;
  nextFocusVi: string;
  summaryVersion: string;
  createdAt: number;
}

export interface ConversationContextSummary {
  recentTurns: Array<{
    sender: 'user' | 'assistant';
    text: string;
    timestamp?: number;
  }>;
  topic?: string;
  activeIssues: string[];
  previousSummaries: SessionPedagogicSummary[];
}

export interface ContextPrunedItem {
  category: 'knowledge' | 'evidence' | 'conversation' | 'profile';
  identifier: string;
  reason: 'token_budget_exceeded' | 'low_relevance' | 'redundant' | 'stale_contradiction';
  score?: number;
}

export interface ContextTrace {
  traceId: string;
  requestId: string;
  taskId: AITaskId;
  learnerId: string;
  contextProfile: ContextProfileName;
  retrievedSources: string[];
  knowledgeIdsUsed: string[];
  evidenceIdsUsed: string[];
  prunedItems: ContextPrunedItem[];
  rankingScores: Record<string, number>;
  estimatedTokens: number;
  contextVersion: string;
  createdAt: number;
}

export interface BuiltContextPackage {
  learnerProfile: LearnerProfileContext;
  currentContext: CurrentLearningContext;
  knowledge: KnowledgeContextItem[];
  mastery: MasteryContextItem[];
  evidence: EvidenceContextItem[];
  conversation: ConversationContextSummary;
  fencedContextText: string;
  contextBriefingShort: string;
  trace: ContextTrace;
}
