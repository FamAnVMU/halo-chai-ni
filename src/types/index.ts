export type HSKLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type CharacterMode = 'simplified' | 'traditional';
export type PinyinDisplayMode = 'above' | 'inline' | 'none';

export interface UserProfile {
  id: string;
  name: string;
  targetHskLevel: HSKLevel;
  currentHskLevel: HSKLevel;
  dailyGoalMinutes: number;
  streakDays: number;
  lastActiveDate: string;
  charMode: CharacterMode;
  pinyinMode: PinyinDisplayMode;
  theme: 'light' | 'dark' | 'system';
  createdAt: number;
}

export interface Vocabulary {
  id?: number;
  simplified: string;
  traditional: string;
  pinyin: string;
  meaningVi: string;
  wordType: string;
  hskLevel: HSKLevel;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
  notes?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: number;
}

export interface SRSCard {
  id?: number;
  vocabId: number;
  repetition: number;
  interval: number; // in days
  easeFactor: number; // default 2.5
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewedDate?: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
  correctCount: number;
  incorrectCount: number;
}

export interface GrammarRule {
  id: string;
  hskLevel: HSKLevel;
  title: string;
  formula: string;
  explanationVi: string;
  examples: Array<{
    zh: string;
    pinyin: string;
    vi: string;
  }>;
  commonMistakes: string[];
  comparisonWith?: {
    otherRuleTitle: string;
    differenceVi: string;
  };
}

export interface LessonContent {
  id: string;
  hskLevel: HSKLevel;
  chapter: number;
  lessonNumber: number;
  title: string;
  titlePinyin: string;
  titleVi: string;
  objectives: string[];
  dialogue: Array<{
    speaker: string;
    zh: string;
    pinyin: string;
    vi: string;
  }>;
  vocabularies: Vocabulary[];
  grammarIds: string[];
  exercises: Exercise[];
  completed?: boolean;
  score?: number;
  lastStudiedAt?: number;
}

export type ExerciseType =
  | 'multiple_choice'
  | 'match_hanzi_pinyin'
  | 'match_word_meaning'
  | 'listen_choose'
  | 'fill_blank'
  | 'word_order'
  | 'translate_vi_zh'
  | 'translate_zh_vi'
  | 'hanzi_recognition'
  | 'read_aloud'
  | 'hanzi_writing';

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  audioText?: string;
  questionZh?: string;
  questionPinyin?: string;
  questionVi?: string;
  options?: string[];
  correctAnswer: string | number | string[];
  explanationVi: string;
  hints?: string;
  hanziTarget?: string; // For writing & recognition
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  pinyin?: string;
  translationVi?: string;
  correction?: {
    original: string;
    corrected: string;
    explanationVi: string;
    grammarPoint?: string;
    naturalSuggestion?: string;
  };
  timestamp: number;
  isAudio?: boolean;
}

export interface PostSessionReport {
  topic: string;
  newWords: Array<{ zh: string; pinyin: string; vi: string }>;
  grammarPoints: string[];
  mistakesMade: Array<{ original: string; corrected: string; explanation: string }>;
  strengths: string[];
  weaknesses: string[];
  nextStepRecommendation: string;
}

export type AIChatMode = 'free' | 'tutor' | 'roleplay' | 'hsk' | 'pronunciation';

export interface AIChatSession {
  id: string;
  mode: AIChatMode;
  title: string;
  hskLevel: HSKLevel;
  roleplayScenario?: string;
  createdAt: number;
  updatedAt: number;
  messages: AIChatMessage[];
  summaryReport?: PostSessionReport;
}

export interface AILearnerMemory {
  id: string; // 'default'
  knownWeaknesses: string[];
  frequentlyMispronouncedWords: string[];
  masteredGrammar: string[];
  strugglingGrammar: string[];
  topicsPracticed: string[];
  personalNotes: string;
  updatedAt: number;
}

export interface APISettings {
  id: string; // 'default'
  provider: 'gemini' | 'openai' | 'custom';
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  customEndpoint?: string;
  ttsSpeed: number; // 0.8, 1.0, 1.2
  ttsPitch: number;
  autoPlayAudio: boolean;
  voiceGender: 'female' | 'male';
}

export interface DailyLearningStat {
  date: string; // YYYY-MM-DD
  studyTimeMinutes: number;
  lessonsCompleted: number;
  wordsReviewed: number;
  speakingMinutes: number;
  listeningMinutes: number;
  aiSessionsCount: number;
}

export interface GradedStory {
  id: string;
  hskLevel: HSKLevel;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  contentZh: string;
  contentPinyin: string;
  contentVi: string;
  audioText: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }>;
  isRead?: boolean;
}

export interface ListeningItem {
  id: string;
  hskLevel: HSKLevel;
  title: string;
  audioText: string;
  pinyin: string;
  meaningVi: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }>;
  isCompleted?: boolean;
}
