/**
 * Context Builder Interface & Integration (Halo Chinese v2.5.0)
 * B1 & B2 - Context Retrieval & Context Builder
 */

import { AITaskId, IContextBuilder, LearnerBriefingContext } from './aiOrchestratorTypes.js';
import { contextBuilderService } from './contextBuilderService.js';

export class ContextBuilder implements IContextBuilder {
  public async buildContext(options: {
    taskId: AITaskId;
    learnerId?: string;
    inputQuery?: string;
    hskLevel?: number;
    sessionId?: string;
  }): Promise<LearnerBriefingContext> {
    return contextBuilderService.buildContext(options);
  }

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

export const defaultContextBuilder = contextBuilderService;
