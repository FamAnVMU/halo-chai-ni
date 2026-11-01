/**
 * Context Budget Manager (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 *
 * Enforces dynamic token budgets per model and task, performs intelligent pruning,
 * and tracks pruned items for full audit transparency.
 */

import {
  ContextProfileConfig,
  ContextPrunedItem,
  EvidenceContextItem,
  KnowledgeContextItem,
  ConversationContextSummary
} from './contextRetrievalTypes.js';

export interface BudgetAllocation {
  modelId: string;
  totalTokenLimit: number;
  reservedOutputTokens: number;
  systemPromptBudget: number;
  userQueryTokens: number;
  maxMemoryContextTokens: number;
}

export class ContextBudgetManager {
  /**
   * Tính toán phân bổ ngân sách Token dựa theo model và task profile
   */
  public static calculateBudgetAllocation(
    modelId: string,
    config: ContextProfileConfig,
    userQuery: string = ''
  ): BudgetAllocation {
    const isLive = modelId.includes('live');
    const isLite = modelId.includes('lite');

    // Ước tính token thô: 1 từ tiếng Anh/Việt ~ 1.3 token; 1 chữ Hán ~ 1.5 token
    const queryTokens = Math.max(10, Math.round(userQuery.length * 1.4));

    if (isLive) {
      // Live API cần phản hồi realtime cực nhanh, ngữ cảnh khởi tạo siêu gọn
      return {
        modelId,
        totalTokenLimit: 2048,
        reservedOutputTokens: 512,
        systemPromptBudget: 400,
        userQueryTokens: queryTokens,
        maxMemoryContextTokens: Math.min(config.maxContextTokens, 350)
      };
    }

    if (isLite) {
      // Gemini 3.5 Flash Lite
      return {
        modelId,
        totalTokenLimit: 32000,
        reservedOutputTokens: 2048,
        systemPromptBudget: 1500,
        userQueryTokens: queryTokens,
        maxMemoryContextTokens: config.maxContextTokens || 1500
      };
    }

    // Default Flash / Pro
    return {
      modelId,
      totalTokenLimit: 64000,
      reservedOutputTokens: 4096,
      systemPromptBudget: 2500,
      userQueryTokens: queryTokens,
      maxMemoryContextTokens: config.maxContextTokens || 2500
    };
  }

  /**
   * Cắt tỉa thông minh khi danh sách ứng viên vượt quá ngân sách
   * Trả về danh sách đã cắt tỉa và mảng prunedItems để ghi log truy vết
   */
  public static pruneCandidatesToFitBudget(params: {
    knowledge: KnowledgeContextItem[];
    evidence: EvidenceContextItem[];
    conversation: ConversationContextSummary;
    budget: BudgetAllocation;
    config: ContextProfileConfig;
  }): {
    prunedKnowledge: KnowledgeContextItem[];
    prunedEvidence: EvidenceContextItem[];
    prunedConversation: ConversationContextSummary;
    prunedItems: ContextPrunedItem[];
    estimatedTokens: number;
  } {
    const { budget, config } = params;
    const prunedItems: ContextPrunedItem[] = [];

    // Sắp xếp Knowledge theo score giảm dần
    let knowledge = [...params.knowledge].sort((a, b) => b.relevanceScore - a.relevanceScore);
    // Sắp xếp Evidence theo diagnosticValue và occurredAt
    let evidence = [...params.evidence].sort((a, b) => {
      if (a.diagnosticValue === 'high' && b.diagnosticValue !== 'high') return -1;
      if (b.diagnosticValue === 'high' && a.diagnosticValue !== 'high') return 1;
      return b.occurredAt - a.occurredAt;
    });
    let conversation = { ...params.conversation };

    // 1. Áp dụng giới hạn số lượng mục tối đa theo Profile
    if (knowledge.length > config.maxKnowledgeItems) {
      const removed = knowledge.slice(config.maxKnowledgeItems);
      for (const item of removed) {
        prunedItems.push({
          category: 'knowledge',
          identifier: `${item.hanziSimplified} (${item.id})`,
          reason: 'low_relevance',
          score: item.relevanceScore
        });
      }
      knowledge = knowledge.slice(0, config.maxKnowledgeItems);
    }

    if (evidence.length > config.maxEvidenceItems) {
      const removed = evidence.slice(config.maxEvidenceItems);
      for (const item of removed) {
        prunedItems.push({
          category: 'evidence',
          identifier: item.id,
          reason: 'low_relevance'
        });
      }
      evidence = evidence.slice(0, config.maxEvidenceItems);
    }

    if (conversation.recentTurns.length > config.maxConversationTurns) {
      const keepCount = config.maxConversationTurns;
      const removedTurns = conversation.recentTurns.slice(0, conversation.recentTurns.length - keepCount);
      conversation.recentTurns = conversation.recentTurns.slice(-keepCount);
      prunedItems.push({
        category: 'conversation',
        identifier: `${removedTurns.length} lượt hội thoại cũ`,
        reason: 'token_budget_exceeded'
      });
    }

    // 2. Tính toán tổng lượng token ước lượng
    let estimatedTokens = this.estimateTokens({ knowledge, evidence, conversation });

    // 3. Nếu vẫn vượt quá ngân sách maxMemoryContextTokens, lần lượt cắt bớt từ mục có score thấp nhất
    while (estimatedTokens > budget.maxMemoryContextTokens && knowledge.length > 1) {
      const last = knowledge.pop()!;
      prunedItems.push({
        category: 'knowledge',
        identifier: `${last.hanziSimplified} (${last.id})`,
        reason: 'token_budget_exceeded',
        score: last.relevanceScore
      });
      estimatedTokens = this.estimateTokens({ knowledge, evidence, conversation });
    }

    while (estimatedTokens > budget.maxMemoryContextTokens && evidence.length > 1) {
      const last = evidence.pop()!;
      prunedItems.push({
        category: 'evidence',
        identifier: last.id,
        reason: 'token_budget_exceeded'
      });
      estimatedTokens = this.estimateTokens({ knowledge, evidence, conversation });
    }

    return {
      prunedKnowledge: knowledge,
      prunedEvidence: evidence,
      prunedConversation: conversation,
      prunedItems,
      estimatedTokens
    };
  }

  /**
   * Ước lượng token thô của gói ngữ cảnh
   */
  public static estimateTokens(packageData: {
    knowledge: KnowledgeContextItem[];
    evidence: EvidenceContextItem[];
    conversation: ConversationContextSummary;
  }): number {
    let charCount = 0;

    for (const k of packageData.knowledge) {
      charCount += (k.hanziSimplified.length + k.pinyin.length + k.primaryMeaningVi.length + 30);
      for (const s of k.senses) {
        charCount += (s.meaningVi.length + (s.exampleZh?.length || 0));
      }
    }

    for (const e of packageData.evidence) {
      charCount += (e.userQuote.length + e.assessmentSummary.length + 20);
    }

    for (const t of packageData.conversation.recentTurns) {
      charCount += (t.text.length + 15);
    }

    return Math.round(charCount * 1.35);
  }
}
