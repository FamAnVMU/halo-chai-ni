import Dexie, { type Table } from 'dexie';
import type {
  UserProfile,
  Vocabulary,
  SRSCard,
  GrammarRule,
  LessonContent,
  AIChatSession,
  AILearnerMemory,
  APISettings,
  DailyLearningStat,
  GradedStory,
  ListeningItem,
} from '../types';

export interface ClientSyncQueueItem {
  id?: number;
  clientQueueId: string;
  userId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  version: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  idempotencyKey: string;
}

export interface ClientSyncMeta {
  key: string;
  value: any;
}

export interface OfflineProfile {
  id: string;
  name: string;
  targetHskLevel: number;
  currentHskLevel: number;
  createdAt: number;
  lastUsedAt: number;
}

export class HaloChineseDatabase extends Dexie {
  users!: Table<UserProfile, string>;
  vocabularies!: Table<Vocabulary, number>;
  srsCards!: Table<SRSCard, number>;
  grammarRules!: Table<GrammarRule, string>;
  lessons!: Table<LessonContent, string>;
  aiSessions!: Table<AIChatSession, string>;
  aiMemory!: Table<AILearnerMemory, string>;
  apiSettings!: Table<APISettings, string>;
  dailyStats!: Table<DailyLearningStat, string>;
  stories!: Table<GradedStory, string>;
  listening!: Table<ListeningItem, string>;
  syncQueue!: Table<ClientSyncQueueItem, number>;
  syncMeta!: Table<ClientSyncMeta, string>;
  offlineProfiles!: Table<OfflineProfile, string>;

  constructor() {
    super('HaloChineseDB');
    this.version(1).stores({
      users: 'id',
      vocabularies: '++id, simplified, traditional, hskLevel, isFavorite, isCustom',
      srsCards: '++id, vocabId, nextReviewDate, status',
      grammarRules: 'id, hskLevel',
      lessons: 'id, hskLevel, chapter, lessonNumber, completed',
      aiSessions: 'id, mode, hskLevel, createdAt, updatedAt',
      aiMemory: 'id',
      apiSettings: 'id',
      dailyStats: 'date',
      stories: 'id, hskLevel, isRead',
      listening: 'id, hskLevel, isCompleted',
    });

    this.version(2).stores({
      users: 'id',
      vocabularies: '++id, simplified, traditional, hskLevel, isFavorite, isCustom',
      srsCards: '++id, vocabId, nextReviewDate, status',
      grammarRules: 'id, hskLevel',
      lessons: 'id, hskLevel, chapter, lessonNumber, completed',
      aiSessions: 'id, mode, hskLevel, createdAt, updatedAt',
      aiMemory: 'id',
      apiSettings: 'id',
      dailyStats: 'date',
      stories: 'id, hskLevel, isRead',
      listening: 'id, hskLevel, isCompleted',
      syncQueue: '++id, clientQueueId, userId, entityType, entityId, status, timestamp, idempotencyKey',
      syncMeta: 'key',
      offlineProfiles: 'id, lastUsedAt'
    });
  }
}

export const db = new HaloChineseDatabase();

// Default user profile
export const DEFAULT_USER: UserProfile = {
  id: 'current_user',
  name: 'Người Học Tiếng Trung',
  targetHskLevel: 3,
  currentHskLevel: 1,
  dailyGoalMinutes: 20,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  charMode: 'simplified',
  pinyinMode: 'above',
  theme: 'light',
  createdAt: Date.now(),
};

// Default API settings
export const DEFAULT_API_SETTINGS: APISettings = {
  id: 'default',
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  ttsSpeed: 1.0,
  ttsPitch: 1.0,
  autoPlayAudio: true,
  voiceGender: 'female',
};

// Default AI memory
export const DEFAULT_AI_MEMORY: AILearnerMemory = {
  id: 'default',
  knownWeaknesses: ['Phân biệt thanh điệu 2 và thanh điệu 3', 'Phát âm nhóm âm mặt lưỡi j, q, x'],
  frequentlyMispronouncedWords: ['去 (qù)', '吃 (chī)', '学 (xué)'],
  masteredGrammar: ['Câu chữ 是 (shì)', 'Cấu trúc câu hỏi với 吗 (ma)'],
  strugglingGrammar: ['Cấu trúc câu chữ 把 (bǎ)', 'Bổ ngữ kết quả / phương hướng'],
  topicsPracticed: ['Chào hỏi', 'Gọi món ăn', 'Hỏi đường'],
  personalNotes: 'Người học đang chuẩn bị thi HSK 3, thích học qua ví dụ giao tiếp đời thường.',
  updatedAt: Date.now(),
};
