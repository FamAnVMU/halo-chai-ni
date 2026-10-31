/**
 * Context Builder Interface & Initial Implementation (Halo Chinese v2.4.0)
 * B1 - Unified AI Orchestrator
 *
 * Defines the contract for assembling pedagogic context from Unified Learning Memory
 * and provides the baseline implementation before Phase B2 (Context Retrieval).
 */

import { AITaskId, IContextBuilder, LearnerBriefingContext } from './aiOrchestratorTypes.js';
import { unifiedLearningMemoryService } from './unifiedLearningMemoryService.js';
import { db } from './db.js';

export class ContextBuilder implements IContextBuilder {
  private static readonly DEFAULT_LEARNER_ID = 'default';
  private static readonly CONTEXT_VERSION = 'v1.0.0-b1';

  /**
   * Assembles learner briefing context using Unified Learning Memory interfaces
   */
  public async buildContext(options: {
    taskId: AITaskId;
    learnerId?: string;
    inputQuery?: string;
    hskLevel?: number;
    sessionId?: string;
  }): Promise<LearnerBriefingContext> {
    const learnerId = options.learnerId || ContextBuilder.DEFAULT_LEARNER_ID;

    // 1. Get learner profile from Unified Learning Memory
    let profile = unifiedLearningMemoryService.getLearnerProfile(learnerId);
    if (!profile) {
      // Fallback read from learner_profile table if unified memory profile not yet populated
      const row = db.prepare('SELECT current_hsk, target_hsk FROM learner_profile WHERE id = ?').get(learnerId) as any;
      profile = {
        learner_id: learnerId,
        current_hsk: options.hskLevel || row?.current_hsk || 1,
        target_hsk: row?.target_hsk || 3
      } as any;
    }

    const currentHsk = options.hskLevel || profile.current_hsk || 1;
    const targetHsk = profile.target_hsk || 3;

    // 2. Extract recent weaknesses / error notebook
    const weaknessesList = unifiedLearningMemoryService.getLearningWeaknesses(learnerId, 3);
    const weaknesses = weaknessesList.map(w => ({
      type: w.error_type || 'grammar',
      title: w.title,
      description: w.root_cause || w.user_sentence
    }));

    // 3. Extract relevant knowledge items for the current query if provided
    let relevantKnowledge: any[] = [];
    if (options.inputQuery && options.inputQuery.trim()) {
      const brief = unifiedLearningMemoryService.getRelevantKnowledgeForAITutor(options.inputQuery, {
        hskLevel: currentHsk,
        limit: 5
      });
      relevantKnowledge = (brief?.matchedKnowledge || []).map(item => ({
        id: item.id,
        type: item.itemType,
        hanziSimplified: item.displayText,
        pinyin: '',
        meaningVi: item.recentError || '',
        masteryState: item.compositeState
      }));
    }

    // 4. Retrieve recent topic if in session
    let recentTopic: string | undefined;
    if (options.sessionId) {
      const sessionRow = db.prepare('SELECT scenario, title FROM chat_sessions WHERE id = ?').get(options.sessionId) as any;
      if (sessionRow) {
        recentTopic = sessionRow.scenario || sessionRow.title;
      }
    }

    return {
      learnerId,
      hskLevel: currentHsk,
      targetHsk,
      recentTopic,
      weaknesses,
      relevantKnowledge,
      contextVersion: ContextBuilder.CONTEXT_VERSION
    };
  }

  /**
   * Format context into compact pedagogic instructions for Gemini prompts
   */
  public static formatBriefingForPrompt(context: LearnerBriefingContext): string {
    const lines: string[] = [
      `- Trình độ học viên: HSK ${context.hskLevel} (Mục tiêu: HSK ${context.targetHsk})`
    ];

    if (context.recentTopic) {
      lines.push(`- Chủ đề đang học: ${context.recentTopic}`);
    }

    if (context.weaknesses && context.weaknesses.length > 0) {
      const errStrs = context.weaknesses.map(w => `${w.title} (${w.type})`).join('; ');
      lines.push(`- Lỗi sai cần lưu ý củng cố: ${errStrs}`);
    }

    if (context.relevantKnowledge && context.relevantKnowledge.length > 0) {
      const kStrs = context.relevantKnowledge.map(k => `${k.hanziSimplified} (${k.pinyin}: ${k.meaningVi} [${k.masteryState || 'practicing'}])`).join(', ');
      lines.push(`- Tri thức liên quan phát hiện trong câu: ${kStrs}`);
    }

    return lines.join('\n');
  }
}

export const defaultContextBuilder = new ContextBuilder();
