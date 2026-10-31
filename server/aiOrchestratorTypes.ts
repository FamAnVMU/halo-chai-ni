/**
 * AI Orchestrator Core Types & Interfaces (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 */

export type ModelCategory = 'text_out' | 'live';

export type AITaskId =
  | 'AI_TUTOR_CHAT'
  | 'EXPLAIN_GRAMMAR'
  | 'EXPLAIN_VOCABULARY'
  | 'COMPARE_WORDS'
  | 'ANALYZE_SENTENCE'
  | 'ANALYZE_CONVERSATION'
  | 'GENERATE_LESSON'
  | 'GENERATE_ROADMAP'
  | 'ASSESS_PLACEMENT_TEST'
  | 'ANALYZE_PRONUNCIATION'
  | 'ASSESS_SPEECH'
  | 'EVALUATE_READING_COMPREHENSION'
  | 'EXPLAIN_READING_PARAGRAPH'
  | 'EVALUATE_SHADOWING'
  | 'GENERATE_SHADOWING_PASSAGE'
  | 'GENERATE_READING'
  | 'SRS_HINT_GENERATION'
  | 'TEST_API_KEY'
  | 'VOICE_CHAT_LIVE';

export type OutputFormat = 'json' | 'text' | 'stream' | 'audio_pcm';

export type MemoryUpdatePolicy = 'none' | 'conditional' | 'automatic';

export interface TaskDefinition {
  taskId: AITaskId;
  name: string;
  category: 'teaching' | 'analysis' | 'generation' | 'assessment' | 'utility' | 'realtime';
  modelCategory: ModelCategory;
  defaultTimeoutMs: number;
  maxRetries: number;
  promptVersion: string;
  contextRequirements: {
    requiresLearnerProfile: boolean;
    requiresRecentErrors: boolean;
    requiresRelevantKnowledge: boolean;
    maxContextTokens?: number;
  };
  outputFormat: OutputFormat;
  memoryUpdatePolicy: MemoryUpdatePolicy;
  descriptionVi: string;
}

export type AIErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'MODEL_ERROR'
  | 'INVALID_REQUEST'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'CONTEXT_ERROR'
  | 'MEMORY_ERROR'
  | 'LIVE_SESSION_ERROR'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR';

export interface AIOrchestratorErrorDetails {
  code: AIErrorCode;
  messageVi: string;
  taskId?: AITaskId;
  requestId?: string;
  isRetryable: boolean;
  httpStatus: number;
  originalErrorSnippet?: string;
}

export interface OrchestratorRequest<TInput = any> {
  taskId: AITaskId;
  requestId?: string;
  idempotencyKey?: string;
  input: TInput;
  learnerId?: string;
  hskLevel?: number;
  overrideModel?: string;
  temperature?: number;
  timeoutMs?: number;
  sessionId?: string;
  skipMemoryUpdate?: boolean;
}

export interface OrchestratorResponse<TOutput = any> {
  success: boolean;
  taskId: AITaskId;
  requestId: string;
  modelId: string;
  promptVersion: string;
  contextVersion?: string;
  data?: TOutput;
  rawText?: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: AIOrchestratorErrorDetails;
  memoryUpdated?: boolean;
}

export interface LearnerBriefingContext {
  learnerId: string;
  hskLevel: number;
  targetHsk: number;
  recentTopic?: string;
  weaknesses: Array<{
    type: string;
    title: string;
    description?: string;
  }>;
  relevantKnowledge?: Array<{
    id: string;
    type: string;
    hanziSimplified: string;
    pinyin: string;
    meaningVi: string;
    masteryState?: string;
  }>;
  contextVersion: string;
}

export interface IContextBuilder {
  buildContext(options: {
    taskId: AITaskId;
    learnerId?: string;
    inputQuery?: string;
    hskLevel?: number;
    sessionId?: string;
  }): Promise<LearnerBriefingContext>;
}

export interface LiveSessionState {
  sessionId: string;
  status: 'idle' | 'connecting' | 'active' | 'interrupted' | 'closing' | 'closed' | 'error';
  modelId: string;
  voiceName: string;
  startedAt: number;
  lastActiveAt: number;
  userTurnCount: number;
  modelTurnCount: number;
  accumulatedUserTranscript: string;
  accumulatedAiTranscript: string;
}
