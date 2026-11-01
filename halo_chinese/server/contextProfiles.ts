/**
 * Task Context Profiles Configuration (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 *
 * Defines tailored context retrieval budgets, priority weights, and limits
 * for each specific AI Task ID.
 */

import { AITaskId } from './aiOrchestratorTypes.js';
import { ContextProfileConfig, ContextProfileName } from './contextRetrievalTypes.js';

export const CONTEXT_PROFILES: Record<ContextProfileName, ContextProfileConfig> = {
  chat_general: {
    profileName: 'chat_general',
    weights: {
      queryRelevance: 0.45,
      topicRelevance: 0.25,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.05
    },
    maxKnowledgeItems: 5,
    maxEvidenceItems: 3,
    maxConversationTurns: 6,
    maxContextTokens: 1200,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: true
  },

  grammar_explanation: {
    profileName: 'grammar_explanation',
    weights: {
      queryRelevance: 0.50,
      topicRelevance: 0.10,
      masteryRelevance: 0.20,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 4,
    maxEvidenceItems: 3,
    maxConversationTurns: 2,
    maxContextTokens: 1000,
    includePrerequisites: true,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  vocab_analysis: {
    profileName: 'vocab_analysis',
    weights: {
      queryRelevance: 0.60,
      topicRelevance: 0.15,
      masteryRelevance: 0.10,
      evidenceConfidence: 0.10,
      recency: 0.05
    },
    maxKnowledgeItems: 3,
    maxEvidenceItems: 2,
    maxConversationTurns: 0,
    maxContextTokens: 800,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: false,
    includeSessionSummaries: false
  },

  word_comparison: {
    profileName: 'word_comparison',
    weights: {
      queryRelevance: 0.55,
      topicRelevance: 0.15,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.05
    },
    maxKnowledgeItems: 4,
    maxEvidenceItems: 2,
    maxConversationTurns: 0,
    maxContextTokens: 1100,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  sentence_analysis: {
    profileName: 'sentence_analysis',
    weights: {
      queryRelevance: 0.70,
      topicRelevance: 0.10,
      masteryRelevance: 0.10,
      evidenceConfidence: 0.05,
      recency: 0.05
    },
    maxKnowledgeItems: 4,
    maxEvidenceItems: 1,
    maxConversationTurns: 0,
    maxContextTokens: 600,
    includePrerequisites: false,
    includeRelations: false,
    includeLearnerProfile: false,
    includeSessionSummaries: false
  },

  conversation_analysis: {
    profileName: 'conversation_analysis',
    weights: {
      queryRelevance: 0.35,
      topicRelevance: 0.30,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 8,
    maxEvidenceItems: 5,
    maxConversationTurns: 12,
    maxContextTokens: 2500,
    includePrerequisites: true,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: true
  },

  lesson_generation: {
    profileName: 'lesson_generation',
    weights: {
      queryRelevance: 0.20,
      topicRelevance: 0.35,
      masteryRelevance: 0.25, // Ưu tiên các lỗ hổng kiến thức
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 8,
    maxEvidenceItems: 4,
    maxConversationTurns: 0,
    maxContextTokens: 2000,
    includePrerequisites: true,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: true
  },

  roadmap_generation: {
    profileName: 'roadmap_generation',
    weights: {
      queryRelevance: 0.10,
      topicRelevance: 0.30,
      masteryRelevance: 0.35,
      evidenceConfidence: 0.15,
      recency: 0.10
    },
    maxKnowledgeItems: 10,
    maxEvidenceItems: 5,
    maxConversationTurns: 0,
    maxContextTokens: 2200,
    includePrerequisites: true,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: true
  },

  placement_test: {
    profileName: 'placement_test',
    weights: {
      queryRelevance: 0.30,
      topicRelevance: 0.20,
      masteryRelevance: 0.30,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 5,
    maxEvidenceItems: 3,
    maxConversationTurns: 0,
    maxContextTokens: 1500,
    includePrerequisites: false,
    includeRelations: false,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  pronunciation_diagnostic: {
    profileName: 'pronunciation_diagnostic',
    weights: {
      queryRelevance: 0.50,
      topicRelevance: 0.10,
      masteryRelevance: 0.20,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 3,
    maxEvidenceItems: 3,
    maxConversationTurns: 0,
    maxContextTokens: 750,
    includePrerequisites: false,
    includeRelations: false,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  reading_comprehension: {
    profileName: 'reading_comprehension',
    weights: {
      queryRelevance: 0.45,
      topicRelevance: 0.25,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.05
    },
    maxKnowledgeItems: 5,
    maxEvidenceItems: 2,
    maxConversationTurns: 0,
    maxContextTokens: 1000,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  reading_paragraph_explanation: {
    profileName: 'reading_paragraph_explanation',
    weights: {
      queryRelevance: 0.50,
      topicRelevance: 0.30,
      masteryRelevance: 0.10,
      evidenceConfidence: 0.05,
      recency: 0.05
    },
    maxKnowledgeItems: 4,
    maxEvidenceItems: 1,
    maxConversationTurns: 0,
    maxContextTokens: 900,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: false,
    includeSessionSummaries: false
  },

  shadowing_evaluation: {
    profileName: 'shadowing_evaluation',
    weights: {
      queryRelevance: 0.60,
      topicRelevance: 0.15,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.05,
      recency: 0.05
    },
    maxKnowledgeItems: 2,
    maxEvidenceItems: 2,
    maxConversationTurns: 0,
    maxContextTokens: 600,
    includePrerequisites: false,
    includeRelations: false,
    includeLearnerProfile: false,
    includeSessionSummaries: false
  },

  srs_hint: {
    profileName: 'srs_hint',
    weights: {
      queryRelevance: 0.70,
      topicRelevance: 0.10,
      masteryRelevance: 0.10,
      evidenceConfidence: 0.05,
      recency: 0.05
    },
    maxKnowledgeItems: 2,
    maxEvidenceItems: 1,
    maxConversationTurns: 0,
    maxContextTokens: 450,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: false,
    includeSessionSummaries: false
  },

  live_voice: {
    profileName: 'live_voice',
    weights: {
      queryRelevance: 0.30,
      topicRelevance: 0.35,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 3,
    maxEvidenceItems: 2,
    maxConversationTurns: 0,
    maxContextTokens: 350, // Ngân sách cực kỳ tinh gọn cho Gemini Live API
    includePrerequisites: false,
    includeRelations: false,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  },

  default: {
    profileName: 'default',
    weights: {
      queryRelevance: 0.40,
      topicRelevance: 0.25,
      masteryRelevance: 0.15,
      evidenceConfidence: 0.10,
      recency: 0.10
    },
    maxKnowledgeItems: 4,
    maxEvidenceItems: 2,
    maxConversationTurns: 4,
    maxContextTokens: 1000,
    includePrerequisites: false,
    includeRelations: true,
    includeLearnerProfile: true,
    includeSessionSummaries: false
  }
};

export class ContextProfileResolver {
  public static resolveProfile(taskId: AITaskId): ContextProfileConfig {
    switch (taskId) {
      case 'AI_TUTOR_CHAT':
        return CONTEXT_PROFILES.chat_general;
      case 'EXPLAIN_GRAMMAR':
        return CONTEXT_PROFILES.grammar_explanation;
      case 'EXPLAIN_VOCABULARY':
        return CONTEXT_PROFILES.vocab_analysis;
      case 'COMPARE_WORDS':
        return CONTEXT_PROFILES.word_comparison;
      case 'ANALYZE_SENTENCE':
        return CONTEXT_PROFILES.sentence_analysis;
      case 'ANALYZE_CONVERSATION':
        return CONTEXT_PROFILES.conversation_analysis;
      case 'GENERATE_LESSON':
        return CONTEXT_PROFILES.lesson_generation;
      case 'GENERATE_ROADMAP':
        return CONTEXT_PROFILES.roadmap_generation;
      case 'ASSESS_PLACEMENT_TEST':
        return CONTEXT_PROFILES.placement_test;
      case 'ANALYZE_PRONUNCIATION':
      case 'ASSESS_SPEECH':
        return CONTEXT_PROFILES.pronunciation_diagnostic;
      case 'EVALUATE_READING_COMPREHENSION':
        return CONTEXT_PROFILES.reading_comprehension;
      case 'EXPLAIN_READING_PARAGRAPH':
        return CONTEXT_PROFILES.reading_paragraph_explanation;
      case 'EVALUATE_SHADOWING':
      case 'GENERATE_SHADOWING_PASSAGE':
        return CONTEXT_PROFILES.shadowing_evaluation;
      case 'SRS_HINT_GENERATION':
        return CONTEXT_PROFILES.srs_hint;
      case 'VOICE_CHAT_LIVE':
        return CONTEXT_PROFILES.live_voice;
      default:
        return CONTEXT_PROFILES.default;
    }
  }
}
