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

// ==================== AI PLACEMENT TEST TYPES ====================
export type PlacementSkill = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing' | 'communication';

export interface PlacementQuestion {
  id: string;
  testId: string;
  skill: PlacementSkill;
  questionType: 'multiple_choice' | 'fill_in_blank' | 'reorder' | 'reading_comprehension' | 'listening_comprehension' | 'writing_translation' | 'dialogue_response';
  hskLevel: number;
  topic?: string;
  prompt: string;
  passage?: string;
  audioText?: string;
  options?: string[];
  correctAnswer: string;
  explanationVi: string;
  criteria?: {
    focusPoints?: string[];
    grammarTarget?: string;
  };
  orderIndex: number;
  weight: number;
}

export interface SkillScoreDetail {
  skill: PlacementSkill;
  label: string;
  score: number | null; // null if untested/skipped
  qualitative: string;
  status: 'tested' | 'untested' | 'partial';
  questionsCount: number;
  correctCount: number;
  hskDemonstrated: number;
  feedback: string;
}

export interface KnowledgeItem {
  item: string;
  pinyin?: string;
  meaningVi: string;
  hskLevel: number;
  type: 'vocabulary' | 'grammar' | 'sentence_pattern';
  notes?: string;
}

export interface PlacementResultReport {
  id: string;
  testId: string;
  testType: 'full' | 'quick';
  overallScore: number;
  estimatedHsk: number;
  estimatedHskLabel: string;
  confidenceLevel: 'high' | 'medium' | 'provisional';
  confidenceReason: string;
  skillScores: Record<PlacementSkill, SkillScoreDetail>;
  strengths: string[];
  weaknesses: string[];
  knowledgeBreakdown: {
    mastered: KnowledgeItem[];
    tentative: KnowledgeItem[];
    weakGaps: KnowledgeItem[];
    unknown: KnowledgeItem[];
  };
  recommendations: {
    suggestedPace: string;
    priorityTopics: string[];
    focusSkills: string[];
    nextAction: string;
  };
  syncedToProfile: boolean;
  createdAt: number;
  completedAt?: number;
  durationSeconds: number;
}

export interface PlacementTestProgress {
  assessment: {
    id: string;
    testType: 'full' | 'quick';
    status: 'in_progress' | 'completed' | 'abandoned';
    currentSection: PlacementSkill;
    currentQuestionIndex: number;
    adaptiveLevel: number;
    skippedSections: string[];
    startedAt: number;
    completedAt?: number;
    durationSeconds: number;
  };
  questions: PlacementQuestion[];
  answers: Record<string, {
    id: string;
    userAnswer: string;
    isCorrect: boolean;
    score: number;
    aiFeedback?: string;
    answeredAt: number;
  }>;
  totalQuestions: number;
  answeredCount: number;
}

export interface PlacementHistoryItem {
  testId: string;
  testType: 'full' | 'quick';
  overallScore: number;
  estimatedHsk: number;
  confidenceLevel: string;
  startedAt: number;
  completedAt?: number;
  durationSeconds: number;
  strengthsCount: number;
  weaknessesCount: number;
  syncedToProfile: boolean;
}

// ==================== ADAPTIVE LEARNING PATH TYPES ====================

export interface PathStage {
  id: string;
  pathId: string;
  stageNumber: number;
  title: string;
  descriptionVi: string;
  stageType: 'foundation_reinforce' | 'expansion' | 'application' | 'mastery_review';
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  isLockedByUser: boolean;
  progressPercent: number;
  orderIndex: number;
  items: PathItem[];
}

export interface PathItem {
  id: string;
  stageId: string;
  pathId: string;
  title: string;
  itemType: 'lesson' | 'review_srs' | 'error_remediation' | 'practice_drill' | 'checkpoint_exam';
  hskLevel: number;
  estimatedMinutes: number;
  recommendationReason: string;
  prerequisites: string[];
  targetKnowledge: string[];
  lessonId?: string;
  status: 'locked' | 'available' | 'in_progress' | 'needs_review' | 'completed';
  score?: number;
  orderIndex: number;
  completedAt?: number;
}

export interface PathMilestone {
  id: string;
  pathId: string;
  title: string;
  descriptionVi: string;
  targetType: 'topic_complete' | 'vocab_mastery' | 'grammar_mastery' | 'stage_complete' | 'score_target' | 'exam_pass';
  requiredCriteria: string[];
  progressPercent: number;
  status: 'pending' | 'achieved';
  achievedAt?: number;
  orderIndex: number;
}

export interface ScheduleItem {
  id: string;
  pathId: string;
  itemId?: string;
  dayOfWeek: number;
  dayName: string;
  scheduledDate?: string;
  activityTitle: string;
  activityType: 'vocab_review' | 'grammar_lesson' | 'listening_drill' | 'conversation_tutor' | 'reading_writing' | 'comprehensive_quiz';
  estimatedMinutes: number;
  reason: string;
  isCompleted: boolean;
  completedAt?: number;
}

export interface PathVersion {
  id: string;
  versionNumber: number;
  triggerReason: string;
  changesSummary: string;
  createdAt: number;
}

export interface AdaptiveLearningPathDetail {
  id: string;
  userId: string;
  title: string;
  currentHsk: number;
  targetHsk: number;
  primaryGoal: 'hsk_exam' | 'daily_communication' | 'business_work' | 'travel_study';
  dailyMinutes: number;
  daysPerWeek: number;
  targetCompletionDate?: string;
  status: 'active' | 'paused' | 'completed';
  currentStageId?: string;
  progressPercent: number;
  version: number;
  stages: PathStage[];
  milestones: PathMilestone[];
  schedule: ScheduleItem[];
  nextRecommendedItem?: PathItem;
  createdAt: number;
  updatedAt: number;
}

export interface UpdateGoalsParams {
  pathId?: string;
  targetHsk?: number;
  primaryGoal?: 'hsk_exam' | 'daily_communication' | 'business_work' | 'travel_study';
  dailyMinutes?: number;
  daysPerWeek?: number;
  targetCompletionDate?: string;
}

// ==================== SMART REVIEW & SPACED REPETITION (SRS) ====================
export type SrsItemType = 'vocabulary' | 'grammar' | 'phrase' | 'error';
export type SrsUserRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsReviewMode = 'flashcard' | 'zh_to_vi' | 'vi_to_zh' | 'listening' | 'grammar' | 'error_fix';
export type SrsMasteryLevel = 'introduced' | 'learning' | 'needs_review' | 'fair' | 'mastered';

export interface SrsItem {
  id: string;
  itemType: SrsItemType;
  referenceId: string;
  uniqueKey: string;
  hskLevel: number;
  promptZh: string;
  promptPinyin?: string;
  promptVi: string;
  extraData?: {
    traditional?: string;
    wordType?: string;
    exampleZh?: string;
    exampleVi?: string;
    audioText?: string;
    formula?: string;
    usageNotes?: string;
    commonMistakes?: string[];
    userSentence?: string;
    correctedSentence?: string;
    explanationVi?: string;
    occurrenceCount?: number;
    source?: string;
  };
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  streak: number;
  lapses: number;
  lastReviewedAt?: number;
  nextReviewAt: number;
  masteryLevel: SrsMasteryLevel;
  status: 'active' | 'suspended' | 'graduated';
  createdAt: number;
  updatedAt: number;
}

export interface SrsDashboardStats {
  totalCards: number;
  dueToday: number;
  overdue: number;
  newCards: number;
  learning: number;
  mastered: number;
  retentionRate: number;
  streakDays: number;
  byType: {
    vocabulary: number;
    grammar: number;
    error: number;
  };
  forecast7Days: Array<{
    date: string;
    dayName: string;
    count: number;
  }>;
}

export interface SrsAIExercise {
  itemId: string;
  questionType: 'multiple_choice' | 'fill_blank' | 'reorder' | 'translate';
  prompt: string;
  contextSentenceZh: string;
  contextPinyin?: string;
  contextSentenceVi: string;
  options?: string[];
  correctAnswer: string;
  explanationVi: string;
}

export interface SrsSubmitReviewResult {
  success: boolean;
  item: SrsItem;
  sm2Result: {
    newEF: number;
    newInterval: number;
    newRepetition: number;
    newLapses: number;
    newStreak: number;
    quality: number;
    masteryLevel: SrsMasteryLevel;
  };
  nextReviewFormatted: string;
}

// ==================== AI CONVERSATION ANALYSIS ====================
export type VocabCategory = 'A_mastered_used_well' | 'B_known_used_inaccurately' | 'C_newly_exposed' | 'D_needs_review';
export type ErrorCategory = 'vocabulary' | 'grammar' | 'word_order' | 'particle' | 'sentence_structure' | 'unnatural_expression' | 'misunderstanding' | 'pronunciation';
export type MasteryLevel = 'unknown' | 'exposed' | 'taught' | 'learning' | 'struggling' | 'fair' | 'mastered';

export interface VocabEvidence {
  simplified: string;
  traditional?: string;
  pinyin: string;
  meaningVi: string;
  category: VocabCategory;
  contextSnippet: string;
  roleInSentence: string;
  isUserInitiated: boolean;
  confidence: number;
}

export interface GrammarEvidence {
  patternName: string;
  formula: string;
  meaningVi: string;
  isCorrect: boolean;
  userUsage: string;
  correction?: string;
  explanationVi: string;
  issueType: 'grammar_rule' | 'naturalness_style' | 'word_order' | 'particle';
  confidence: number;
}

export interface DetectedErrorEvidence {
  errorType: ErrorCategory;
  title: string;
  userSentence: string;
  errorLocation?: string;
  correctedSentence: string;
  explanationVi: string;
  similarExample?: string;
  confidence: number;
}

export interface SentenceBreakdownItem {
  messageId: string;
  userSentenceZh: string;
  userSentencePinyin?: string;
  userSentenceVi?: string;
  isCorrect: boolean;
  aiCritiqueVi: string;
  correctedSentenceZh?: string;
  grammarOrVocabFocus?: string;
  audioText?: string;
}

export interface CommunicationAssessment {
  comprehensionScore: number;
  responsivenessScore: number;
  sentenceComplexityScore: number;
  conversationTurnCount: number;
  reflexAndActiveUseFeedback: string;
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
  generalFeedbackVi: string;
}

export interface MasteryUpdateItem {
  knowledgeType: 'vocabulary' | 'grammar';
  identifier: string;
  oldMastery: string;
  newMastery: MasteryLevel;
  evidenceReason: string;
}

export interface SrsSyncItem {
  itemId?: string;
  itemType: 'vocabulary' | 'grammar' | 'error';
  promptZh: string;
  priorityReason: string;
}

export interface ConversationAnalysisReport {
  id?: number;
  sessionId: string;
  sessionType: 'text' | 'voice' | 'mixed';
  summaryVi: string;
  topics: string[];
  vocabAnalysis: {
    groupA: VocabEvidence[];
    groupB: VocabEvidence[];
    groupC: VocabEvidence[];
    groupD: VocabEvidence[];
  };
  grammarAnalysis: GrammarEvidence[];
  detectedErrors: DetectedErrorEvidence[];
  communicationAssessment: CommunicationAssessment;
  masteryUpdates: MasteryUpdateItem[];
  srsSyncItems: SrsSyncItem[];
  pathRecommendations: {
    focusTopics: string[];
    suggestedRemediation: string[];
    hskAdjustSuggestion?: number;
  };
  suggestedLesson?: {
    topic: string;
    lessonType: 'reinforce' | 'review' | 'new' | 'advanced' | 'error_correction';
    recommendationReason: string;
    hskLevel: number;
  };
  sentenceBreakdown: SentenceBreakdownItem[];
  overallScore: number;
  confidenceScore: number;
  schemaVersion: number;
  createdAt: number;
}

export interface RecentAnalysisSummary {
  id: number;
  sessionId: string;
  title: string;
  mode: string;
  hskLevel: number;
  sessionType: 'text' | 'voice' | 'mixed';
  summaryVi: string;
  topics: string[];
  overallScore: number;
  createdAt: number;
}



