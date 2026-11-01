/**
 * AI Task Registry (Halo Chinese v2.6.0)
 * B1 - Unified AI Orchestrator
 *
 * Central registry of all AI tasks, their model binding, timeout,
 * retry policies, context requirements, and memory policies.
 */

import { AITaskId, TaskDefinition } from './aiOrchestratorTypes.js';

export const TASK_REGISTRY: Record<AITaskId, TaskDefinition> = {
  AI_TUTOR_CHAT: {
    taskId: 'AI_TUTOR_CHAT',
    name: 'AI Tutor Chat & Sư Phạm',
    category: 'teaching',
    modelCategory: 'text_out',
    defaultTimeoutMs: 25000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1200
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Hội thoại sư phạm thông minh giữa AI Tutor và học viên, tự động phát hiện lỗi và phản hồi'
  },

  EXPLAIN_GRAMMAR: {
    taskId: 'EXPLAIN_GRAMMAR',
    name: 'Giải Thích Ngữ Pháp Chuyên Sâu',
    category: 'teaching',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Giải thích cấu trúc ngữ pháp, công thức, ví dụ đối chiếu và lỗi người Việt hay mắc'
  },

  EXPLAIN_VOCABULARY: {
    taskId: 'EXPLAIN_VOCABULARY',
    name: 'Phân Tích Từ Vựng & Chiết Tự',
    category: 'teaching',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: true,
      maxContextTokens: 800
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Phân tích nguồn gốc chữ Hán, bộ thủ, cách nhớ và ngữ cảnh sử dụng'
  },

  COMPARE_WORDS: {
    taskId: 'COMPARE_WORDS',
    name: 'So Sánh & Đối Chiếu Từ Gần Nghĩa',
    category: 'teaching',
    modelCategory: 'text_out',
    defaultTimeoutMs: 25000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1200
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Phân biệt sự khác nhau giữa 2 từ hoặc cấu trúc dễ nhầm lẫn'
  },

  ANALYZE_SENTENCE: {
    taskId: 'ANALYZE_SENTENCE',
    name: 'Mổ Xẻ Cấu Trúc Ngữ Pháp Câu',
    category: 'analysis',
    modelCategory: 'text_out',
    defaultTimeoutMs: 15000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false,
      maxContextTokens: 600
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Phân tích thành phần câu (Chủ ngữ, Vị ngữ, Bổ ngữ, Định ngữ, Trạng ngữ)'
  },

  ANALYZE_CONVERSATION: {
    taskId: 'ANALYZE_CONVERSATION',
    name: 'Phân Tích Sâu Phiên Hội Thoại',
    category: 'analysis',
    modelCategory: 'text_out',
    defaultTimeoutMs: 45000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 2500
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'automatic',
    descriptionVi: 'Trích xuất từ mới đã học, lỗi ngữ pháp, đánh giá độ lưu loát và cập nhật bộ nhớ'
  },

  GENERATE_LESSON: {
    taskId: 'GENERATE_LESSON',
    name: 'Tạo Bài Học Cá Nhân Hóa',
    category: 'generation',
    modelCategory: 'text_out',
    defaultTimeoutMs: 40000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 2000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'automatic',
    descriptionVi: 'Sinh nội dung bài học có bài đọc, từ vựng trọng tâm, điểm ngữ pháp và bài tập củng cố'
  },

  GENERATE_ROADMAP: {
    taskId: 'GENERATE_ROADMAP',
    name: 'Tạo Lộ Trình Học Thích Ứng',
    category: 'generation',
    modelCategory: 'text_out',
    defaultTimeoutMs: 45000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 2000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'automatic',
    descriptionVi: 'Xây dựng kế hoạch học tập theo từng tuần, phù hợp mục tiêu HSK và thời gian biểu'
  },

  ASSESS_PLACEMENT_TEST: {
    taskId: 'ASSESS_PLACEMENT_TEST',
    name: 'Đánh Giá Kiểm Tra Trình Độ Đầu Vào',
    category: 'assessment',
    modelCategory: 'text_out',
    defaultTimeoutMs: 30000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false,
      maxContextTokens: 1500
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'automatic',
    descriptionVi: 'Phân tích bài làm của học viên để xếp lớp HSK chính xác'
  },

  ANALYZE_PRONUNCIATION: {
    taskId: 'ANALYZE_PRONUNCIATION',
    name: 'Chẩn Đoán Phát Âm & Ngữ Âm',
    category: 'assessment',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 800
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Chẩn đoán lỗi thanh điệu, thanh mẫu, vận mẫu và hướng dẫn khẩu hình miệng'
  },

  ASSESS_SPEECH: {
    taskId: 'ASSESS_SPEECH',
    name: 'Đánh Giá Độ Lưu Loát Bài Nói',
    category: 'assessment',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false,
      maxContextTokens: 800
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Đánh giá độ chuẩn xác phát âm, ngắt nghỉ và ngữ điệu tự nhiên'
  },

  EVALUATE_READING_COMPREHENSION: {
    taskId: 'EVALUATE_READING_COMPREHENSION',
    name: 'Chấm Điểm Câu Trả Lời Đọc Hiểu',
    category: 'assessment',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Chấm câu trả lời tự luận đọc hiểu và giải thích chi tiết điểm đúng/sai'
  },

  EXPLAIN_READING_PARAGRAPH: {
    taskId: 'EXPLAIN_READING_PARAGRAPH',
    name: 'Giải Thích Đoạn Văn Tương Tác',
    category: 'teaching',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Giải thích ngữ pháp, từ lóng hoặc văn hóa trong đoạn văn học viên thắc mắc'
  },

  EVALUATE_SHADOWING: {
    taskId: 'EVALUATE_SHADOWING',
    name: 'Đánh Giá Bài Luyện Shadowing',
    category: 'assessment',
    modelCategory: 'text_out',
    defaultTimeoutMs: 20000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false,
      maxContextTokens: 600
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Đánh giá mức độ khớp nhịp, độ trễ và phát âm khi nói nhại theo audio mẫu'
  },

  GENERATE_SHADOWING_PASSAGE: {
    taskId: 'GENERATE_SHADOWING_PASSAGE',
    name: 'Tạo Bài Luyện Shadowing Cá Nhân Hóa',
    category: 'generation',
    modelCategory: 'text_out',
    defaultTimeoutMs: 30000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1000
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Tạo đoạn văn ngắn chia nhỏ theo nhịp thở để luyện nói nhại'
  },

  GENERATE_READING: {
    taskId: 'GENERATE_READING',
    name: 'Tạo Bài Đọc Tương Tác',
    category: 'generation',
    modelCategory: 'text_out',
    defaultTimeoutMs: 35000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1500
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Tạo bài đọc truyện, tin tức hoặc hội thoại phân đoạn theo cấp độ HSK'
  },

  SRS_HINT_GENERATION: {
    taskId: 'SRS_HINT_GENERATION',
    name: 'Tạo Gợi Ý Ghi Nhớ & Mnemonic SRS',
    category: 'utility',
    modelCategory: 'text_out',
    defaultTimeoutMs: 15000,
    maxRetries: 1,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false,
      maxContextTokens: 400
    },
    outputFormat: 'json',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Tạo câu chuyện mẹo nhớ chiết tự hoặc ví dụ ngắn gọn khi học viên bị quên từ'
  },

  TEST_API_KEY: {
    taskId: 'TEST_API_KEY',
    name: 'Kiểm Tra Kết Nối Gemini API',
    category: 'utility',
    modelCategory: 'text_out',
    defaultTimeoutMs: 10000,
    maxRetries: 0,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: false,
      requiresRecentErrors: false,
      requiresRelevantKnowledge: false
    },
    outputFormat: 'text',
    memoryUpdatePolicy: 'none',
    descriptionVi: 'Kiểm tra tính hợp lệ của API Key và độ trễ kết nối'
  },

  VOICE_CHAT_LIVE: {
    taskId: 'VOICE_CHAT_LIVE',
    name: 'Voice Chat Realtime Gemini Live API',
    category: 'realtime',
    modelCategory: 'live',
    defaultTimeoutMs: 0, // Streaming WebSocket
    maxRetries: 0,
    promptVersion: 'v2.6.0',
    contextRequirements: {
      requiresLearnerProfile: true,
      requiresRecentErrors: true,
      requiresRelevantKnowledge: true,
      maxContextTokens: 1000
    },
    outputFormat: 'audio_pcm',
    memoryUpdatePolicy: 'conditional',
    descriptionVi: 'Đàm thoại 2 chiều thời gian thực qua giao thức âm thanh 24kHz PCM của Gemini Live'
  }
};

export class TaskRegistry {
  public static getTask(taskId: AITaskId): TaskDefinition {
    const task = TASK_REGISTRY[taskId];
    if (!task) {
      throw new Error(`Tác vụ AI '${taskId}' không tồn tại trong Task Registry.`);
    }
    return task;
  }

  public static isValidTaskId(taskId: string): taskId is AITaskId {
    return taskId in TASK_REGISTRY;
  }

  public static getAllTasks(): TaskDefinition[] {
    return Object.values(TASK_REGISTRY);
  }
}
