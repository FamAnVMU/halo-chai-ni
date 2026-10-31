/**
 * Unified AI Orchestrator (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 *
 * Central intelligence orchestrator coordinating all AI tasks, model routing,
 * context retrieval, prompt management, response validation, memory updates,
 * idempotency control, safe retries, and audit logging.
 */

import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import {
  AITaskId,
  AIErrorCode,
  AIOrchestratorErrorDetails,
  OrchestratorRequest,
  OrchestratorResponse
} from './aiOrchestratorTypes.js';
import { TaskRegistry } from './taskRegistry.js';
import { PromptManager } from './promptManager.js';
import { ResponseValidator } from './responseValidator.js';
import { defaultContextBuilder, ContextBuilder } from './contextBuilderInterface.js';
import { contextBuilderService } from './contextBuilderService.js';
import { unifiedLearningMemoryService } from './unifiedLearningMemoryService.js';
import { liveSessionManager } from './liveSessionManager.js';

export class UnifiedAIOrchestrator {
  private inFlightRequests: Map<string, Promise<OrchestratorResponse<any>>> = new Map();
  private idempotencyCache: Map<string, { response: OrchestratorResponse<any>; cachedAt: number }> = new Map();
  private static readonly IDEMPOTENCY_TTL_MS = 60000; // 60 seconds

  // --- 1. Model Router ---

  /**
   * Get configured Text-out Model ID from SQLite
   */
  public getTextModel(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_model') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite';
  }

  /**
   * Get configured Live Model ID from SQLite
   */
  public getLiveModel(): string {
    return liveSessionManager.getLiveModel();
  }

  /**
   * Get configured Text API Key from SQLite
   */
  public getTextApiKey(): string {
    const row = db.prepare('SELECT value FROM server_settings WHERE key = ?').get('gemini_text_api_key') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_TEXT_API_KEY || '';
  }

  /**
   * Get configured Live API Key from SQLite
   */
  public getLiveApiKey(): string {
    return liveSessionManager.getLiveApiKey();
  }

  /**
   * Resolve appropriate model ID for a given task
   */
  public resolveModelForTask(taskId: AITaskId, overrideModel?: string): string {
    if (overrideModel) return overrideModel;
    const task = TaskRegistry.getTask(taskId);
    if (task.modelCategory === 'live') {
      return this.getLiveModel();
    }
    return this.getTextModel();
  }

  /**
   * Singleton / Factory for GoogleGenAI client with the appropriate key
   */
  private getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || this.getTextApiKey();
    if (!key) {
      throw this.createError('AUTHENTICATION_ERROR', 'Backend chưa có Gemini API Key. Vui lòng cấu hình tại trang Cài đặt.', 401, false);
    }
    return new GoogleGenAI({ apiKey: key });
  }

  // --- 2. Master Execution Loop ---

  /**
   * Execute an AI task through the complete unified pipeline:
   * 1. Request Router -> 2. Idempotency Check -> 3. Model Router ->
   * 4. Context Builder -> 5. Prompt Manager -> 6. LLM Invocation with Timeout & Retry ->
   * 7. Response Validator -> 8. Memory Connector -> 9. Audit Logger
   */
  public async executeTask<TInput = any, TOutput = any>(
    req: OrchestratorRequest<TInput>
  ): Promise<OrchestratorResponse<TOutput>> {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const taskId = req.taskId;

    // 1. Request Router: validate task exists
    if (!TaskRegistry.isValidTaskId(taskId)) {
      const err = this.createError('INVALID_REQUEST', `Tác vụ AI '${taskId}' không tồn tại trong hệ thống.`, 400, false);
      return this.failResponse(taskId, requestId, 'unknown', 'unknown', startTime, err);
    }

    const task = TaskRegistry.getTask(taskId);

    // Live API check: Live API must use LiveSessionManager WebSocket
    if (task.modelCategory === 'live') {
      const err = this.createError('INVALID_REQUEST', `Tác vụ '${taskId}' là realtime audio stream, phải kết nối qua LiveSessionManager.`, 400, false);
      return this.failResponse(taskId, requestId, this.getLiveModel(), task.promptVersion, startTime, err);
    }

    // 2. Idempotency check: prevent duplicate billing and race conditions
    if (req.idempotencyKey) {
      const cached = this.idempotencyCache.get(req.idempotencyKey);
      if (cached && (Date.now() - cached.cachedAt) < UnifiedAIOrchestrator.IDEMPOTENCY_TTL_MS) {
        return {
          ...cached.response,
          requestId // Return with current request ID for traceability
        };
      }

      // Check if same request is currently in-flight
      const inFlight = this.inFlightRequests.get(req.idempotencyKey);
      if (inFlight) {
        return await inFlight;
      }
    }

    // Create execution promise
    const executionPromise = this.internalExecute<TInput, TOutput>(req, task, requestId, startTime);

    if (req.idempotencyKey) {
      this.inFlightRequests.set(req.idempotencyKey, executionPromise);
    }

    try {
      const res = await executionPromise;
      if (req.idempotencyKey && res.success) {
        this.idempotencyCache.set(req.idempotencyKey, { response: res, cachedAt: Date.now() });
      }
      return res;
    } finally {
      if (req.idempotencyKey) {
        this.inFlightRequests.delete(req.idempotencyKey);
      }
    }
  }

  /**
   * Internal execution pipeline
   */
  private async internalExecute<TInput, TOutput>(
    req: OrchestratorRequest<TInput>,
    task: ReturnType<typeof TaskRegistry.getTask>,
    requestId: string,
    startTime: number
  ): Promise<OrchestratorResponse<TOutput>> {
    const modelId = this.resolveModelForTask(task.taskId, req.overrideModel);
    let contextVersion: string | undefined;

    try {
      // 3. Context Builder: Assemble pedagogic context with B2 Advanced Retrieval
      let contextBriefing = '';
      let fencedContextText = '';
      if (task.contextRequirements.requiresLearnerProfile || task.contextRequirements.requiresRelevantKnowledge) {
        const queryText = typeof req.input === 'string' ? req.input : (req.input as any)?.message || (req.input as any)?.userSentence || '';
        const fullPkg = await contextBuilderService.buildFullContextPackage({
          taskId: task.taskId,
          learnerId: req.learnerId,
          inputQuery: queryText,
          hskLevel: req.hskLevel,
          sessionId: req.sessionId,
          modelId,
          requestId
        });
        contextVersion = fullPkg.trace.contextVersion;
        contextBriefing = fullPkg.contextBriefingShort;
        fencedContextText = fullPkg.fencedContextText;
      }

      // 4. Prompt Manager: Build versioned prompt
      const promptParams = {
        ...(typeof req.input === 'object' ? req.input : { input: req.input }),
        hskLevel: req.hskLevel || 1,
        selectiveContext: fencedContextText || contextBriefing,
        sessionId: req.sessionId
      };

      const { systemInstruction, userPrompt, promptVersion } = PromptManager.buildPrompt(task.taskId, promptParams);

      // 5. LLM Invocation with timeout & retry
      const timeoutMs = req.timeoutMs || task.defaultTimeoutMs;
      const rawText = await this.invokeWithTimeoutAndRetry(
        modelId,
        systemInstruction,
        userPrompt || (typeof req.input === 'string' ? req.input : JSON.stringify(req.input)),
        task.outputFormat,
        req.temperature ?? 0.7,
        timeoutMs,
        task.maxRetries
      );

      // 6. Response Validator
      const validation = ResponseValidator.validate<TOutput>(task.taskId, rawText, task.outputFormat);
      if (!validation.isValid) {
        const err = this.createError(
          'INVALID_RESPONSE',
          `Kết quả từ mô hình AI không thỏa mãn tiêu chuẩn: ${validation.errors.join('; ')}`,
          502,
          true
        );
        this.logAudit({
          requestId,
          taskId: task.taskId,
          modelCategory: task.modelCategory,
          modelId,
          promptVersion,
          contextVersion,
          status: 'failed',
          latencyMs: Date.now() - startTime,
          errorCode: err.code,
          errorMessage: err.messageVi,
          idempotencyKey: req.idempotencyKey
        });
        return this.failResponse(task.taskId, requestId, modelId, promptVersion, startTime, err);
      }

      // 7. Memory Connector: Update Unified Learning Memory if policy allows
      let memoryUpdated = false;
      if (!req.skipMemoryUpdate && task.memoryUpdatePolicy !== 'none') {
        memoryUpdated = await this.handleMemoryUpdate(task.taskId, req, validation.sanitizedData);
      }

      const latencyMs = Date.now() - startTime;

      // 8. Audit Logger
      this.logAudit({
        requestId,
        taskId: task.taskId,
        modelCategory: task.modelCategory,
        modelId,
        promptVersion,
        contextVersion,
        status: 'completed',
        latencyMs,
        idempotencyKey: req.idempotencyKey
      });

      return {
        success: true,
        taskId: task.taskId,
        requestId,
        modelId,
        promptVersion,
        contextVersion,
        data: validation.sanitizedData,
        rawText: validation.rawText,
        latencyMs,
        memoryUpdated
      };

    } catch (err: any) {
      const classifiedError = this.classifyError(err, task.taskId, requestId);
      const latencyMs = Date.now() - startTime;

      this.logAudit({
        requestId,
        taskId: task.taskId,
        modelCategory: task.modelCategory,
        modelId,
        promptVersion: task.promptVersion,
        contextVersion,
        status: classifiedError.code === 'TIMEOUT' ? 'timeout' : 'failed',
        latencyMs,
        errorCode: classifiedError.code,
        errorMessage: classifiedError.messageVi,
        idempotencyKey: req.idempotencyKey
      });

      return this.failResponse(task.taskId, requestId, modelId, task.promptVersion, startTime, classifiedError);
    }
  }

  // --- 3. Invocation with Timeout & Exponential Backoff Retry ---

  private async invokeWithTimeoutAndRetry(
    model: string,
    systemInstruction: string,
    prompt: string,
    outputFormat: string,
    temperature: number,
    timeoutMs: number,
    maxRetries: number
  ): Promise<string> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 5000);
          await new Promise(res => setTimeout(res, delay));
        }

        const client = this.getClient();
        const callPromise = client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction,
            responseMimeType: outputFormat === 'json' ? 'application/json' : 'text/plain',
            temperature
          }
        });

        const response = await this.wrapWithTimeout(callPromise, timeoutMs);
        return response?.text || '';

      } catch (err: any) {
        lastError = err;
        const classified = this.classifyError(err);
        // Only retry if retryable and attempts remain
        if (!classified.isRetryable || attempt >= maxRetries) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  private wrapWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (timeoutMs <= 0) return promise;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`AI_REQUEST_TIMEOUT: Yêu cầu tới mô hình quá thời gian cho phép (${timeoutMs}ms)`));
      }, timeoutMs);

      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // --- 4. Memory Connector Dispatcher ---

  private async handleMemoryUpdate(taskId: AITaskId, req: OrchestratorRequest, outputData: any): Promise<boolean> {
    try {
      const learnerId = req.learnerId || 'default';

      switch (taskId) {
        case 'AI_TUTOR_CHAT': {
          if (outputData?.hasCorrection && outputData.correction) {
            unifiedLearningMemoryService.recordLearningActivity({
              activityType: 'text_chat',
              activityId: req.sessionId || `chat_${Date.now()}`,
              learnerId,
              speaker: 'user',
              textExcerpt: outputData.correction.original,
              assessmentData: {
                isCorrect: false,
                severity: outputData.correction.severity || 'grammar',
                corrected: outputData.correction.corrected,
                explanation: outputData.correction.explanationVi
              }
            });
            contextBuilderService.invalidateContextCache(learnerId);
            return true;
          }
          break;
        }

        case 'ANALYZE_CONVERSATION': {
          if (outputData && typeof outputData.overallScore === 'number') {
            unifiedLearningMemoryService.recordLearningActivity({
              activityType: 'ai_lesson',
              activityId: req.sessionId || `sess_analysis_${Date.now()}`,
              learnerId,
              speaker: 'system',
              assessmentData: {
                overallScore: outputData.overallScore,
                vocabCount: outputData.vocabAnalysis?.length || 0,
                errorCount: outputData.detectedErrors?.length || 0
              }
            });
            return true;
          }
          break;
        }

        case 'ASSESS_PLACEMENT_TEST': {
          if (outputData && outputData.assignedHskLevel) {
            unifiedLearningMemoryService.recordLearningActivity({
              activityType: 'placement_test',
              activityId: `placement_${Date.now()}`,
              learnerId,
              speaker: 'user',
              assessmentData: {
                assignedHskLevel: outputData.assignedHskLevel,
                score: outputData.score
              }
            });
            return true;
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[UnifiedAIOrchestrator] Memory update notice:', e);
    }
    return false;
  }

  // --- 5. Centralized Error Handler ---

  public classifyError(err: any, taskId?: AITaskId, requestId?: string): AIOrchestratorErrorDetails {
    const errMsg = (err?.message || String(err)).toLowerCase();

    if (errMsg.includes('timeout') || errMsg.includes('ai_request_timeout')) {
      return {
        code: 'TIMEOUT',
        messageVi: 'Yêu cầu tới mô hình AI đã hết thời gian phản hồi. Vui lòng thử lại sau.',
        taskId,
        requestId,
        isRetryable: true,
        httpStatus: 504
      };
    }

    if (errMsg.includes('api_key') || errMsg.includes('unregistered') || errMsg.includes('401') || errMsg.includes('403')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        messageVi: 'Lỗi xác thực: API Key của Gemini không hợp lệ hoặc chưa được cấp quyền.',
        taskId,
        requestId,
        isRetryable: false,
        httpStatus: 401
      };
    }

    if (errMsg.includes('resource_exhausted') || errMsg.includes('429') || errMsg.includes('quota')) {
      return {
        code: 'QUOTA_EXCEEDED',
        messageVi: 'Đã vượt quá giới hạn lượt gọi API (Quota Exceeded / Rate Limit). Vui lòng đợi ít phút.',
        taskId,
        requestId,
        isRetryable: true,
        httpStatus: 429
      };
    }

    if (errMsg.includes('not_found') || errMsg.includes('model')) {
      return {
        code: 'MODEL_ERROR',
        messageVi: 'Mô hình được cấu hình không tồn tại hoặc tài khoản không có quyền truy cập.',
        taskId,
        requestId,
        isRetryable: false,
        httpStatus: 404
      };
    }

    if (errMsg.includes('fetch failed') || errMsg.includes('enotfound') || errMsg.includes('econnreset') || errMsg.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        messageVi: 'Lỗi kết nối mạng tới máy chủ Google Gemini. Vui lòng kiểm tra đường truyền.',
        taskId,
        requestId,
        isRetryable: true,
        httpStatus: 503
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      messageVi: err?.messageVi || 'Đã xảy ra lỗi nội bộ khi xử lý tác vụ AI.',
      taskId,
      requestId,
      isRetryable: false,
      httpStatus: 500,
      originalErrorSnippet: err?.message ? String(err.message).slice(0, 150) : undefined
    };
  }

  private createError(code: AIErrorCode, messageVi: string, httpStatus: number, isRetryable: boolean): AIOrchestratorErrorDetails {
    return {
      code,
      messageVi,
      httpStatus,
      isRetryable
    };
  }

  private failResponse(
    taskId: AITaskId,
    requestId: string,
    modelId: string,
    promptVersion: string,
    startTime: number,
    error: AIOrchestratorErrorDetails
  ): OrchestratorResponse<any> {
    return {
      success: false,
      taskId,
      requestId,
      modelId,
      promptVersion,
      latencyMs: Date.now() - startTime,
      error
    };
  }

  // --- 6. Audit Logging ---

  private logAudit(entry: {
    requestId: string;
    taskId: AITaskId;
    modelCategory: string;
    modelId: string;
    promptVersion: string;
    contextVersion?: string;
    status: string;
    latencyMs: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
    tokensTotal?: number;
    errorCode?: string;
    errorMessage?: string;
    idempotencyKey?: string;
  }): void {
    try {
      const id = `reqlog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO ai_request_logs (
          id, request_id, task_id, model_category, model_id, prompt_version,
          context_version, status, latency_ms, tokens_prompt, tokens_completion,
          tokens_total, error_code, error_message, idempotency_key, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        entry.requestId,
        entry.taskId,
        entry.modelCategory,
        entry.modelId,
        entry.promptVersion,
        entry.contextVersion || null,
        entry.status,
        entry.latencyMs,
        entry.tokensPrompt || 0,
        entry.tokensCompletion || 0,
        entry.tokensTotal || 0,
        entry.errorCode || null,
        entry.errorMessage || null,
        entry.idempotencyKey || null,
        Date.now()
      );
    } catch (e) {
      console.warn('[UnifiedAIOrchestrator] Audit log insert warning:', e);
    }
  }

  /**
   * Query recent AI request logs for observability & debug (never exposes secrets)
   */
  public getRecentLogs(limit: number = 50): any[] {
    return db.prepare(`
      SELECT id, request_id, task_id, model_category, model_id, prompt_version,
             status, latency_ms, error_code, error_message, created_at
      FROM ai_request_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * System health check for AI Orchestrator
   */
  public getSystemStatus(): {
    textModel: string;
    liveModel: string;
    hasTextKey: boolean;
    hasLiveKey: boolean;
    activeLiveSessions: number;
    registeredTasksCount: number;
  } {
    return {
      textModel: this.getTextModel(),
      liveModel: this.getLiveModel(),
      hasTextKey: !!this.getTextApiKey(),
      hasLiveKey: !!this.getLiveApiKey(),
      activeLiveSessions: liveSessionManager.getActiveCount(),
      registeredTasksCount: TaskRegistry.getAllTasks().length
    };
  }
}

export const unifiedAIOrchestrator = new UnifiedAIOrchestrator();
