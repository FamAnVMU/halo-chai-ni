import type {
  SrsDashboardStats,
  SrsItem,
  SrsUserRating,
  SrsReviewMode,
  SrsSubmitReviewResult,
  SrsAIExercise,
  ConversationAnalysisReport,
  RecentAnalysisSummary
} from '../types';

export interface BackendHealth {
  status: string;
  uptime: number;
  database: string;
  localIps?: string[];
}

export interface BackendKeyConfig {
  textConfig: {
    hasKey: boolean;
    keyPreview: string;
    model: string;
    supportedModels: string[];
  };
  liveConfig: {
    hasKey: boolean;
    keyPreview: string;
    model: string;
    voice: string;
    supportedModels: string[];
    supportedVoices: string[];
  };
}

export interface ReadingSentenceItem {
  id: string;
  sentenceIndex: number;
  paragraphIndex?: number;
  sentenceZh: string;
  sentencePinyin: string;
  sentenceVi: string;
  grammarNotes?: string[];
}

export interface ReadingPassageSummary {
  id: string;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  level: string;
  hskLevel: number;
  standardVersion: string;
  topic: string;
  genre: string;
  difficultyRating: number;
  wordCount: number;
  estimatedReadingMinutes: number;
  source: string;
  isFavorite: boolean;
  progressPercent: number;
  readingStatus: 'not_started' | 'in_progress' | 'completed';
  lastReadSentenceIndex: number;
  readCount: number;
  createdAt: number;
}

export interface ReadingPassageDetail extends ReadingPassageSummary {
  fullContentZh: string;
  fullContentPinyin: string;
  fullContentVi: string;
  paragraphs: string[];
  vocabularyFocus: Array<{
    simplified: string;
    pinyin: string;
    meaningVi: string;
    hskLevel: number;
    isNewWord?: boolean;
  }>;
  grammarFocus: Array<{
    pattern: string;
    formula: string;
    explanationVi: string;
    exampleSentence: string;
  }>;
  comprehensionQuestions: Array<{
    id: string;
    type: 'single_choice' | 'true_false' | 'fill_blank' | 'free_text_zh' | 'free_text_vi' | 'main_idea';
    question: string;
    options?: string[];
    answer: string | number;
    explanationVi: string;
    citationText: string;
  }>;
  learningObjectives: string[];
  sentences: ReadingSentenceItem[];
  personalNotes?: string;
}

export interface SentenceGrammarExplanation {
  sentenceZh: string;
  components: Array<{
    role: string;
    segment: string;
    pinyin: string;
    explanation: string;
  }>;
  keyGrammarPoint: string;
  detailedExplanationVi: string;
  contextualNuanceVi: string;
  similarExamples: Array<{ zh: string; pinyin: string; vi: string }>;
}

export interface ReadingStats {
  totalPassages: number;
  completedPassages: number;
  favoriteCount: number;
  totalSessions: number;
  totalMinutesRead: number;
  averageComprehensionScore: number;
  averageReadingWpm: number;
}

export interface DictionarySearchResultItem {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  meaningVi: string;
  wordType: string;
  hskLevel: number;
  radical?: string;
  strokeCount?: number;
  measureWords?: string;
  isFavorite: boolean;
  masteryStatus: 'not_started' | 'introduced' | 'learning' | 'mastered';
  inSrs: boolean;
  source: string;
}

export interface DictionaryDetailEntry {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  pinyinClean: string;
  meaningVi: string;
  wordType: string;
  hskLevel: number;
  radical?: string;
  strokeCount?: number;
  characterDecomposition?: string;
  measureWords?: string;
  synonyms?: string[];
  antonyms?: string[];
  confusingWords?: Array<{
    word: string;
    pinyin: string;
    differenceVi: string;
    exampleZh?: string;
    exampleVi?: string;
  }>;
  collocations?: string[];
  senses?: Array<{
    meaningVi: string;
    contextVi?: string;
    example?: { zh: string; pinyin: string; vi: string };
  }>;
  examples: Array<{
    zh: string;
    pinyin: string;
    vi: string;
    context?: string;
  }>;
  source: string;
  version: string;
  personalNote?: string;
  isFavorite: boolean;
  tags?: string[];
  lookupCount: number;
  learnerState: {
    inVocabMemory: boolean;
    masteryLevel?: string;
    reviewCount?: number;
    lastReviewedAt?: number;
    inSrs: boolean;
    srsIntervalDays?: number;
    srsNextReviewAt?: number;
    errorsCount: number;
  };
}

export interface ContextLookupResult {
  sentence: string;
  targetWord: string;
  pinyin: string;
  contextualMeaningVi: string;
  grammaticalRoleVi: string;
  reasonVi: string;
  sentenceTranslationVi: string;
  otherPossibleMeanings?: string[];
  learnerTipVi: string;
  entryDetail?: DictionaryDetailEntry | null;
}

export interface WordComparisonResult {
  words: string[];
  similaritiesVi: string;
  differencesVi: string;
  comparisonTable: Array<{
    word: string;
    pinyin: string;
    coreMeaningVi: string;
    keyFeatureVi: string;
    exampleZh: string;
    exampleVi: string;
  }>;
  commonMistakesVi: string[];
}

export interface AIWordConsultationResult {
  word: string;
  promptType: string;
  title: string;
  contentVi: string;
  quizData?: {
    questionZh: string;
    questionPinyin: string;
    options: string[];
    answer: string;
    explanationVi: string;
  };
}

export interface PronunciationEvalParams {
  targetText: string;
  targetPinyin: string;
  targetType: 'initial' | 'final' | 'tone' | 'syllable' | 'word' | 'sentence' | 'contrast_pair' | 'custom';
  mode: string;
  spokenTranscript: string;
  audioDurationMs: number;
  expectedDurationMs?: number;
}

export interface PronunciationEvalResult {
  recordId: string;
  targetText: string;
  targetPinyin: string;
  spokenTranscript: string;
  score: number;
  isMatch: boolean;
  accuracyGrade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  audioMetrics: {
    durationMs: number;
    expectedDurationMs: number;
    durationAssessment: string;
    speedPacing: 'too_fast' | 'natural' | 'too_slow';
  };
  wordAnalysis: Array<{
    char: string;
    pinyin: string;
    status: 'correct' | 'substituted' | 'omitted';
    spokenChar?: string;
  }>;
  toneFeedbackVi: string;
  phoneticFeedbackVi: string;
  strengths: string[];
  improvements: string[];
  practiceTipVi: string;
}

export interface PronunciationStats {
  totalPractices: number;
  accuracyAverage: number;
  masteredSoundsCount: number;
  strugglingSoundsCount: number;
  masteredSounds: string[];
  strugglingSounds: string[];
  recentActivityCount: number;
}

export interface PersonalizedDrillsResult {
  drills: Array<{
    id: string;
    title: string;
    targetSound: string;
    zh: string;
    pinyin: string;
    vi: string;
    explanationVi: string;
    tongueShapeTips?: string;
  }>;
  focusAreas: string[];
  source: string;
}

export interface ShadowingLessonSummary {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  levelName: string;
  hskLevel: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommendedSpeed: number;
  fullZh: string;
  fullPinyin: string;
  fullVi: string;
  dialogueRoles?: Array<{
    speaker: string;
    zh: string;
    pinyin: string;
    vi: string;
  }>;
  chunks: Array<{
    id: string;
    chunkZh: string;
    chunkPinyin: string;
    chunkVi: string;
    phoneticNotes?: string;
    orderIndex: number;
  }>;
  comprehensionQuestions: Array<{
    id: string;
    questionVi: string;
    options: string[];
    answer: string;
    explanationVi: string;
  }>;
  targetWeaknesses: string[];
  tipsVi: string;
}

export interface ShadowingEvalParams {
  lessonId: string;
  chunkId?: string;
  targetText: string;
  targetPinyin: string;
  mode: 'echo' | 'delayed' | 'simultaneous' | 'listen_repeat' | 'full_passage' | 'no_subtitle';
  practiceStep: number;
  spokenTranscript: string;
  audioDurationMs: number;
  expectedDurationMs?: number;
  speedUsed: number;
}

export interface ShadowingEvalResult {
  recordId: string;
  lessonId: string;
  chunkId?: string;
  targetText: string;
  targetPinyin: string;
  spokenTranscript: string;
  score: number;
  fluencyScore: number;
  accuracyScore: number;
  isMatch: boolean;
  accuracyGrade: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  audioMetrics: {
    durationMs: number;
    expectedDurationMs: number;
    durationRatio: number;
    speedPacing: 'too_fast' | 'natural' | 'too_slow';
    durationAssessment: string;
  };
  chunkAnalysis: Array<{
    char: string;
    pinyin: string;
    status: 'correct' | 'substituted' | 'omitted';
    spokenChar?: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  flaggedSounds: string[];
  feedbackVi: string;
  fluencyTipsVi: string;
}

export interface ShadowingStats {
  totalSessions: number;
  averageScore: number;
  averageFluency: number;
  averageAccuracy: number;
  practicedLevelsCount: number;
  totalAudioSeconds: number;
  recentSessions: any[];
}

export class LocalBackendClient {
  public getServerHost(): string {
    return localStorage.getItem('halo_server_host') || 'localhost:3001';
  }

  public setServerHost(host: string) {
    let clean = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!clean.includes(':')) {
      clean = `${clean}:3001`;
    }
    localStorage.setItem('halo_server_host', clean);
  }

  public getBaseUrl(): string {
    const host = this.getServerHost();
    return `http://${host}`;
  }

  public getWsUrl(): string {
    const host = this.getServerHost();
    return `ws://${host}`;
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async getHealthData(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/health`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public async getKeyConfig(): Promise<BackendKeyConfig | null> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/keys`);
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  }

  public async saveKeys(params: {
    textApiKey?: string;
    textModel?: string;
    liveApiKey?: string;
    liveModel?: string;
    liveVoice?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối Local Backend: ${e.message}` };
    }
  }

  public async testTextApi(apiKey?: string, model?: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (${this.getBaseUrl()}): ${e.message}` };
    }
  }

  public async testLiveApi(apiKey?: string, model?: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: `Lỗi kết nối tới Backend (${this.getBaseUrl()}): ${e.message}` };
    }
  }

  public async getVoiceSample(voice?: string): Promise<{
    success: boolean;
    sampleText: string;
    pinyin: string;
    vi: string;
    voice: string;
    audioBase64?: string;
    source: 'gemini_live' | 'fallback_tts';
  }> {
    try {
      const q = voice ? `?voice=${encodeURIComponent(voice)}` : '';
      const res = await fetch(`${this.getBaseUrl()}/api/settings/test-voice-sample${q}`);
      if (res.ok) return await res.json();
      return {
        success: false,
        sampleText: '你好！欢迎使用哈罗中文，发音测试正常。',
        pinyin: 'Nǐ hǎo! Huānyíng shǐyòng Hāluó zhōngwén, fāyīn cèshì zhèngcháng.',
        vi: 'Xin chào! Chào mừng bạn đến với Halo Chinese, phát âm thử nghiệm bình thường.',
        voice: voice || 'Aoede',
        source: 'fallback_tts'
      };
    } catch {
      return {
        success: false,
        sampleText: '你好！欢迎使用哈罗中文，发音测试正常。',
        pinyin: 'Nǐ hǎo! Huānyíng shǐyòng Hāluó zhōngwén, fāyīn cèshì zhèngcháng.',
        vi: 'Xin chào! Chào mừng bạn đến với Halo Chinese, phát âm thử nghiệm bình thường.',
        voice: voice || 'Aoede',
        source: 'fallback_tts'
      };
    }
  }

  public async sendTutorMessage(params: {
    message: string;
    history: any[];
    mode: string;
    hskLevel: number;
    scenario?: string;
    sessionId?: string;
    overrideIntent?: string;
  }) {
    const res = await fetch(`${this.getBaseUrl()}/api/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  public async getTutorCompetency() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/tutor/competency`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async lookupContrastPair(wordA: string, wordB: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/tutor/contrast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordA, wordB })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateMicroCheck(concept: string, suspectedGap: string, hskLevel: number = 1) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/tutor/micro-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, suspectedGap, hskLevel })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getLearnerMemory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/memory`);
      return await res.json();
    } catch {
      return null;
    }
  }

  public async updateLearnerMemory(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  // ==================== ADVANCED STRUCTURED MEMORY ====================
  public async getFullMemory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/memory/all`);
      if (res.ok) return await res.json();
      return { success: false, error: 'Không thể tải bộ nhớ học tập' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async updateProfile(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async saveVocabulary(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteVocabulary(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/vocabulary/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  public async saveGrammar(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteGrammar(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/grammar/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  public async saveError(data: any) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  public async deleteError(id: number) {
    const res = await fetch(`${this.getBaseUrl()}/api/memory/errors/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  // ==================== AI LESSON & CONVERSATION ANALYSIS ====================
  public async analyzeSession(sessionId = 'session_default') {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/analyze-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    return await res.json();
  }

  public async getAnalyses() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/ai/analyses`);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async getGeneratedLessons(filter?: { status?: string; type?: string }) {
    try {
      const params = new URLSearchParams();
      if (filter?.status) params.append('status', filter.status);
      if (filter?.type) params.append('type', filter.type);
      const url = `${this.getBaseUrl()}/api/ai/lessons${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async getGeneratedLesson(id: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${id}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateLesson(params: {
    topic?: string;
    lessonType?: 'new' | 'review' | 'reinforce' | 'advanced' | 'error_correction';
    hskLevel?: number;
    customRequest?: string;
    sessionId?: string;
  }) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/generate-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  public async completeLesson(lessonId: string, submission: { userAnswers: Record<string, string>; timeSpentSeconds?: number }) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${lessonId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    return await res.json();
  }

  public async simplifyLesson(lessonId: string) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${lessonId}/simplify`, {
      method: 'POST'
    });
    return await res.json();
  }

  public async deleteGeneratedLesson(id: string) {
    const res = await fetch(`${this.getBaseUrl()}/api/ai/lessons/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  }

  // ==================== AI PLACEMENT TEST ====================
  public async startPlacementTest(testType: 'full' | 'quick' = 'full') {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getActivePlacementTest() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/active`);
      if (res.ok) return await res.json();
      return { success: false, data: null };
    } catch {
      return { success: false, data: null };
    }
  }

  public async getPlacementProgress(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/${testId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async submitPlacementAnswer(params: {
    testId: string;
    questionId: string;
    userAnswer: string;
    durationIncrementSeconds?: number;
  }) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async skipPlacementSection(testId: string, section: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/skip-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, section })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async completePlacementTest(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPlacementResult(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/results/${testId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPlacementHistory() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/history/all`);
      if (res.ok) return await res.json();
      return { success: false, data: [] };
    } catch {
      return { success: false, data: [] };
    }
  }

  public async syncPlacementResult(testId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/placement/sync-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== ADAPTIVE LEARNING PATH ====================

  public async getCurrentPath() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/current`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateAdaptivePath(params: {
    forceNew?: boolean;
    targetHsk?: number;
    targetTimelineMonths?: number;
    dailyMinutes?: number;
    daysPerWeek?: number;
    learningFocus?: string;
  } = {}) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async rebalancePath(params: {
    reason?: string;
    newHskEstimate?: number;
    trigger?: 'lesson_completed' | 'test_completed' | 'manual';
    score?: number;
  } = {}) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async updatePathGoals(params: {
    targetHsk?: number;
    targetTimelineMonths?: number;
    dailyMinutes?: number;
    daysPerWeek?: number;
    learningFocus?: string;
  }) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/update-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async lockPathStage(stageId: string, isLocked: boolean) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/lock-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, isLocked })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async rescheduleScheduleItem(scheduleId: string, newDayOfWeek: number) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/reschedule-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, newDayOfWeek })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async completeScheduleItem(scheduleId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/complete-schedule-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async startPathItem(itemId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/item/${itemId}/start`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPathVersions(pathId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/versions/${pathId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async restorePathVersion(versionId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/path/restore-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== SMART REVIEW SYSTEM (SRS) ====================

  public async getSrsDashboard(): Promise<{ success: boolean; data?: SrsDashboardStats; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/dashboard`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getSrsQueue(params?: {
    limit?: number;
    mode?: string;
    hskLevel?: number;
  }): Promise<{ success: boolean; data?: SrsItem[]; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.mode) query.set('mode', params.mode);
      if (params?.hskLevel) query.set('hskLevel', String(params.hskLevel));

      const res = await fetch(`${this.getBaseUrl()}/api/srs/queue?${query.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncSrsCards(): Promise<{
    success: boolean;
    data?: { addedVocab: number; addedGrammar: number; addedErrors: number; totalCards: number };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/sync`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async startSrsSession(sessionType: string = 'daily_review'): Promise<{
    success: boolean;
    data?: { sessionId: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async finishSrsSession(sessionId: string, durationSeconds: number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/session/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, durationSeconds })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async submitSrsReview(params: {
    itemId: string;
    userRating: SrsUserRating;
    reviewMode: SrsReviewMode;
    sessionId?: string;
    userAnswer?: string;
    isCorrect?: boolean;
    durationMs?: number;
  }): Promise<{
    success: boolean;
    data?: SrsSubmitReviewResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateSrsAIExercise(itemId: string): Promise<{
    success: boolean;
    data?: SrsAIExercise;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/srs/ai-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== AI CONVERSATION ANALYSIS ====================

  public async analyzeConversationSession(
    sessionId: string,
    options?: { force?: boolean; sessionType?: 'text' | 'voice' | 'mixed' }
  ): Promise<{
    success: boolean;
    data?: ConversationAnalysisReport;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {})
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getAnalysisReport(sessionId: string): Promise<{
    success: boolean;
    data?: ConversationAnalysisReport;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/session/${sessionId}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getRecentAnalyses(limit: number = 10): Promise<{
    success: boolean;
    data?: RecentAnalysisSummary[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/recent?limit=${limit}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async saveChatMessage(params: {
    sessionId: string;
    sender: 'user' | 'assistant';
    text: string;
    pinyin?: string;
    translationVi?: string;
    isAudio?: boolean;
    correctionJson?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/analysis/save-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== PRONUNCIATION LAB ====================
  public async evaluatePronunciation(params: PronunciationEvalParams): Promise<{
    success: boolean;
    data?: PronunciationEvalResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/pronunciation/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPronunciationStats(): Promise<{
    success: boolean;
    data?: PronunciationStats;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/pronunciation/stats`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getPronunciationHistory(limit: number = 20): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/pronunciation/history?limit=${limit}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async deletePronunciationRecord(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/pronunciation/history/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generatePronunciationDrills(): Promise<{
    success: boolean;
    data?: PersonalizedDrillsResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/pronunciation/generate-drills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== SHADOWING PRACTICE ====================
  public async getShadowingLessons(filters?: { level?: number; hskLevel?: number; topic?: string }): Promise<{
    success: boolean;
    data?: ShadowingLessonSummary[];
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters?.level) params.append('level', filters.level.toString());
      if (filters?.hskLevel) params.append('hskLevel', filters.hskLevel.toString());
      if (filters?.topic) params.append('topic', filters.topic);
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/lessons?${params.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getShadowingLessonById(id: string): Promise<{
    success: boolean;
    data?: ShadowingLessonSummary;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/lessons/${id}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async evaluateShadowing(params: ShadowingEvalParams): Promise<{
    success: boolean;
    data?: ShadowingEvalResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateShadowingLesson(profileId: string = 'default'): Promise<{
    success: boolean;
    lesson?: ShadowingLessonSummary;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncShadowingToSrs(params: {
    lessonId: string;
    chunkId?: string;
    zh: string;
    pinyin: string;
    vi: string;
  }): Promise<{
    success: boolean;
    srsId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/sync-srs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getShadowingStats(): Promise<{
    success: boolean;
    data?: ShadowingStats;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/stats`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getShadowingHistory(limit: number = 20): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/shadowing/history?limit=${limit}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== AI CHINESE DICTIONARY CLIENT METHODS ====================

  public async searchDictionary(params: {
    query: string;
    type?: string;
    hskLevel?: number;
    wordType?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: {
      query: string;
      detectedType: string;
      results: DictionarySearchResultItem[];
      totalCount: number;
      isAiFallback?: boolean;
    };
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.query) queryParams.append('q', params.query);
      if (params.type) queryParams.append('type', params.type);
      if (params.hskLevel) queryParams.append('hsk', params.hskLevel.toString());
      if (params.wordType) queryParams.append('wordType', params.wordType);
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/search?${queryParams.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getDictionaryEntryById(id: string): Promise<{
    success: boolean;
    data?: DictionaryDetailEntry;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/entry/${encodeURIComponent(id)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getDictionaryEntryByWord(word: string): Promise<{
    success: boolean;
    data?: DictionaryDetailEntry;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/entry-word/${encodeURIComponent(word)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async lookupDictionaryInContext(params: {
    sentence: string;
    targetWord?: string;
  }): Promise<{
    success: boolean;
    data?: ContextLookupResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/in-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async compareDictionaryWords(words: string[]): Promise<{
    success: boolean;
    data?: WordComparisonResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async askAIAboutWord(params: {
    word: string;
    promptType: 'simple_explain' | 'more_examples' | 'distinguish' | 'sentence_quiz' | 'common_errors';
    userLevel?: number;
  }): Promise<{
    success: boolean;
    data?: AIWordConsultationResult;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async saveDictionaryPersonalNote(params: {
    entryId: string;
    note: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/save-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async toggleDictionaryFavorite(entryId: string): Promise<{
    success: boolean;
    isFavorite?: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncDictionaryToMemory(entryId: string): Promise<{
    success: boolean;
    memoryId?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/sync-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncDictionaryToSrs(entryId: string): Promise<{
    success: boolean;
    srsId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/sync-srs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getDictionaryHistory(limit: number = 20): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/history?limit=${limit}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getDictionaryFavorites(): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/favorites`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async segmentChineseText(text: string): Promise<{
    success: boolean;
    data?: Array<{ token: string; pinyin?: string; inDictionary: boolean }>;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dictionary/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ========================================================================
  // INTERACTIVE CHINESE READING METHODS (v1.11.0)
  // ========================================================================

  public async getReadingPassages(params: {
    level?: string;
    hskLevel?: number;
    topic?: string;
    genre?: string;
    search?: string;
    status?: 'all' | 'favorites' | 'completed' | 'in_progress';
    page?: number;
    limit?: number;
  } = {}): Promise<{
    success: boolean;
    data?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      passages: ReadingPassageSummary[];
    };
    error?: string;
  }> {
    try {
      const query = new URLSearchParams();
      if (params.level) query.set('level', params.level);
      if (params.hskLevel) query.set('hskLevel', String(params.hskLevel));
      if (params.topic) query.set('topic', params.topic);
      if (params.genre) query.set('genre', params.genre);
      if (params.search) query.set('search', params.search);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`${this.getBaseUrl()}/api/reading/passages?${query.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getReadingPassageById(id: string): Promise<{
    success: boolean;
    data?: ReadingPassageDetail;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/passages/${id}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async generateReadingPassage(options: {
    level?: string;
    hskLevel?: number;
    topic?: string;
    genre?: string;
    targetLength?: 'short' | 'medium' | 'long';
  }): Promise<{
    success: boolean;
    data?: ReadingPassageDetail;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async explainReadingSentence(params: {
    passageId: string;
    sentenceZh: string;
    sentencePinyin?: string;
    sentenceVi?: string;
    contextPassage?: string;
  }): Promise<{
    success: boolean;
    data?: SentenceGrammarExplanation;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/explain-sentence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async askReadingTutor(params: {
    passageId: string;
    sentenceZh?: string;
    userQuery: string;
    chatHistory?: Array<{ sender: 'user' | 'ai'; text: string }>;
  }): Promise<{
    success: boolean;
    data?: { reply: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/ask-tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async evaluateReadingAnswer(params: {
    passageId: string;
    questionId: string;
    questionText: string;
    questionType: string;
    expectedAnswer: string | number;
    citationText?: string;
    userAnswer: string | number;
  }): Promise<{
    success: boolean;
    data?: {
      isCorrect: boolean;
      scorePercent: number;
      feedbackVi: string;
      citationText: string;
    };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/evaluate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async submitReadingSession(sessionData: {
    passageId: string;
    mode: 'intensive' | 'extensive' | 'blind_listening';
    timeSpentSeconds: number;
    answers: Array<{
      questionId: string;
      questionType: string;
      userAnswer: string;
      isCorrect?: boolean;
    }>;
    lookedUpWords?: string[];
    savedWords?: string[];
    grammarInspected?: string[];
    aiTutorQueries?: string[];
  }): Promise<{
    success: boolean;
    data?: {
      sessionId: string;
      passageId: string;
      scorePercent: number;
      totalQuestions: number;
      correctCount: number;
      timeSpentSeconds: number;
      readingSpeedWpm: number;
      recommendation: string;
      lookedUpWordsCount: number;
      savedWordsCount: number;
    };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async toggleReadingBookmark(
    passageId: string,
    isFavorite?: boolean,
    notes?: string
  ): Promise<{
    success: boolean;
    data?: { isFavorite: boolean; notes: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passageId, isFavorite, notes })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncReadingToShadowing(
    passageId: string,
    sentenceIndex: number
  ): Promise<{
    success: boolean;
    data?: { shadowingLessonId: string; title: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/sync-shadowing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passageId, sentenceIndex })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async syncReadingWordToMemory(
    wordZh: string,
    wordPinyin: string,
    meaningVi: string,
    hskLevel: number = 1
  ): Promise<{
    success: boolean;
    data?: { wordZh: string; srsId: string; message: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/sync-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordZh, wordPinyin, meaningVi, hskLevel })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getReadingStats(): Promise<{
    success: boolean;
    data?: ReadingStats;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/reading/stats`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ========================================================================
  // KNOWLEDGE REGISTRY METHODS
  // ========================================================================

  public async searchKnowledge(params: {
    query?: string;
    itemType?: string;
    hskLevel?: number;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.query) queryParams.set('query', params.query);
      if (params.itemType) queryParams.set('itemType', params.itemType);
      if (params.hskLevel !== undefined) queryParams.set('hskLevel', String(params.hskLevel));
      if (params.status) queryParams.set('status', params.status);
      if (params.category) queryParams.set('category', params.category);
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.offset) queryParams.set('offset', String(params.offset));

      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/search?${queryParams.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getKnowledgeById(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/${encodeURIComponent(id)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async findOrCreateKnowledge(data: any): Promise<{
    success: boolean;
    data?: any;
    created?: boolean;
    candidateDuplicate?: any;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/find-or-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getKnowledgeAudit(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/audit`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getKnowledgeDedupCandidates(): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/dedup/candidates`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async mergeKnowledge(sourceId: string, targetId: string, reason: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/knowledge/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, reason })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ========================================================================
  // LEARNING EVIDENCE METHODS (PHASE A2)
  // ========================================================================

  public async recordLearningEvidence(data: any): Promise<{
    success: boolean;
    data?: any;
    isDuplicate?: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getEvidenceStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/evidence/stats`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getEvidenceTimeline(knowledgeId: string): Promise<{
    success: boolean;
    count?: number;
    data?: any[];
    error?: string;
  }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/evidence/timeline/${encodeURIComponent(knowledgeId)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getEvidenceByKnowledge(
    knowledgeId: string,
    options?: { limit?: number; type?: string }
  ): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (options?.limit) q.set('limit', String(options.limit));
      if (options?.type) q.set('type', options.type);
      const res = await fetch(`${this.getBaseUrl()}/api/evidence/knowledge/${encodeURIComponent(knowledgeId)}?${q.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async invalidateEvidence(
    evidenceId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/evidence/${encodeURIComponent(evidenceId)}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ==================== MASTERY ENGINE CLIENT METHODS ====================
  public async getMastery(
    knowledgeId: string,
    learnerId: string = 'default'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/${encodeURIComponent(knowledgeId)}?learnerId=${encodeURIComponent(learnerId)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getBatchMastery(
    knowledgeIds: string[],
    learnerId: string = 'default'
  ): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeIds, learnerId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getWeakKnowledge(options?: {
    learnerId?: string;
    limit?: number;
  }): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (options?.learnerId) q.set('learnerId', options.learnerId);
      if (options?.limit) q.set('limit', String(options.limit));
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/weak?${q.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getUncertainKnowledge(options?: {
    learnerId?: string;
    limit?: number;
  }): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const q = new URLSearchParams();
      if (options?.learnerId) q.set('learnerId', options.learnerId);
      if (options?.limit) q.set('limit', String(options.limit));
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/uncertain?${q.toString()}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getMasteryHistory(
    knowledgeId: string,
    learnerId: string = 'default'
  ): Promise<{ success: boolean; count?: number; data?: any[]; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/history/${encodeURIComponent(knowledgeId)}?learnerId=${encodeURIComponent(learnerId)}`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async rebuildMastery(
    knowledgeId?: string,
    learnerId: string = 'default'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/rebuild`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeId, learnerId })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async getMasteryRules(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/mastery/rules`);
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const backendClient = new LocalBackendClient();
