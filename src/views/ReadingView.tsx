import React, { useEffect, useState, useRef } from 'react';
import {
  BookOpen,
  BookMarked,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sparkles,
  Brain,
  Mic,
  Headphones,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Search,
  SlidersHorizontal,
  Bookmark,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  HelpCircle,
  Send,
  Loader2,
  Trophy,
  TrendingUp,
  Clock,
  ArrowRight,
  Share2,
  Check,
  Languages,
  BookCheck,
  Lightbulb,
} from 'lucide-react';
import {
  backendClient,
  ReadingPassageSummary,
  ReadingPassageDetail,
  ReadingSentenceItem,
  SentenceGrammarExplanation,
  ReadingStats,
} from '../utils/backendClient';
import { ClickableChineseText } from '../components/dictionary/ClickableChineseText';
import { audioService } from '../utils/audio';
import type { NavTab } from '../components/layout/Sidebar';

interface ReadingViewProps {
  onNavigate?: (tab: NavTab) => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({ onNavigate }) => {
  // State phân trang & thư viện
  const [viewMode, setViewMode] = useState<'library' | 'reader'>('library');
  const [passages, setPassages] = useState<ReadingPassageSummary[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loadingPassages, setLoadingPassages] = useState<boolean>(true);

  // Bộ lọc thư viện
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'favorites' | 'completed' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trình đọc chi tiết
  const [currentPassage, setCurrentPassage] = useState<ReadingPassageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Cấu hình hiển thị trong Reader
  const [readingMode, setReadingMode] = useState<'intensive' | 'extensive' | 'blind_listening'>('intensive');
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [viewBySentence, setViewBySentence] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Trình phát Audio & Đồng bộ câu
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);

  // Câu đang được chọn để phân tích
  const [selectedSentence, setSelectedSentence] = useState<ReadingSentenceItem | null>(null);
  const [grammarExplanation, setGrammarExplanation] = useState<SentenceGrammarExplanation | null>(null);
  const [loadingGrammar, setLoadingGrammar] = useState<boolean>(false);

  // Câu hỏi đọc hiểu & Câu trả lời
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>({});
  const [answerResults, setAnswerResults] = useState<
    Record<string, { isCorrect: boolean; scorePercent: number; feedbackVi: string; citationText: string }>
  >({});
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(null);
  const [freeTextInputs, setFreeTextInputs] = useState<Record<string, string>>({});

  // Phiên đọc & Báo cáo
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionReport, setSessionReport] = useState<any | null>(null);
  const [submittingSession, setSubmittingSession] = useState<boolean>(false);
  const [lookedUpWordsList, setLookedUpWordsList] = useState<string[]>([]);
  const [savedWordsList, setSavedWordsList] = useState<string[]>([]);

  // AI Reading Tutor Chat
  const [tutorChatOpen, setTutorChatOpen] = useState<boolean>(false);
  const [tutorQuery, setTutorQuery] = useState<string>('');
  const [tutorChatHistory, setTutorChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [tutorLoading, setTutorLoading] = useState<boolean>(false);

  // Modal AI Tạo bài đọc cá nhân hóa
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [createLevel, setCreateLevel] = useState<number>(2);
  const [createTopic, setCreateTopic] = useState<string>('daily_life');
  const [createGenre, setCreateGenre] = useState<string>('short_passage');
  const [createLength, setCreateLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [creatingPassage, setCreatingPassage] = useState<boolean>(false);

  // Tải danh sách bài đọc & thống kê ban đầu
  useEffect(() => {
    loadPassages();
    loadStats();
  }, [selectedLevel, selectedTopic, selectedStatus]);

  // Nghe sự kiện tra từ toàn cục để ghi nhận từ đã tra
  useEffect(() => {
    const handleQuickDict = (e: any) => {
      const w = e.detail?.word;
      if (w && !lookedUpWordsList.includes(w)) {
        setLookedUpWordsList((prev) => [...prev, w]);
      }
    };
    window.addEventListener('halo:quick-dict', handleQuickDict);
    return () => {
      window.removeEventListener('halo:quick-dict', handleQuickDict);
      audioService.stopSpeaking();
    };
  }, [lookedUpWordsList]);

  const loadPassages = async () => {
    setLoadingPassages(true);
    try {
      const res = await backendClient.getReadingPassages({
        level: selectedLevel !== 'all' ? selectedLevel : undefined,
        topic: selectedTopic !== 'all' ? selectedTopic : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        limit: 30,
      });
      if (res.success && res.data) {
        setPassages(res.data.passages);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bài đọc:', err);
    } finally {
      setLoadingPassages(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await backendClient.getReadingStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err);
    }
  };

  const handleOpenPassage = async (passageId: string) => {
    setLoadingDetail(true);
    audioService.stopSpeaking();
    setIsPlayingAudio(false);
    try {
      const res = await backendClient.getReadingPassageById(passageId);
      if (res.success && res.data) {
        setCurrentPassage(res.data);
        setViewMode('reader');
        setCurrentSentenceIdx(res.data.lastReadSentenceIndex || 0);
        setSelectedSentence(res.data.sentences[res.data.lastReadSentenceIndex || 0] || null);
        setGrammarExplanation(null);
        setUserAnswers({});
        setAnswerResults({});
        setFreeTextInputs({});
        setSessionReport(null);
        setLookedUpWordsList([]);
        setSavedWordsList([]);
        setSessionStartTime(Date.now());
        setTutorChatHistory([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Lỗi khi mở bài đọc:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleFavorite = async (passageId: string, currentFav: boolean) => {
    try {
      const res = await backendClient.toggleReadingBookmark(passageId, !currentFav);
      if (res.success) {
        setPassages((prev) =>
          prev.map((p) => (p.id === passageId ? { ...p, isFavorite: !currentFav } : p))
        );
        if (currentPassage && currentPassage.id === passageId) {
          setCurrentPassage({ ...currentPassage, isFavorite: !currentFav });
        }
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật bookmark:', err);
    }
  };

  // ==================== ĐIỀU KHIỂN ÂM THANH ====================

  const playSentence = (index: number) => {
    if (!currentPassage || !currentPassage.sentences[index]) return;
    const targetSentence = currentPassage.sentences[index];
    setCurrentSentenceIdx(index);
    setSelectedSentence(targetSentence);
    setIsPlayingAudio(true);

    audioService.speak(targetSentence.sentenceZh, {
      rate: speechRate,
      onEnd: () => {
        if (autoAdvance && index + 1 < currentPassage.sentences.length) {
          playSentence(index + 1);
        } else {
          setIsPlayingAudio(false);
        }
      },
      onError: () => {
        setIsPlayingAudio(false);
      },
    });
  };

  const togglePlayAudio = () => {
    if (isPlayingAudio) {
      audioService.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      playSentence(currentSentenceIdx);
    }
  };

  const handleNextSentence = () => {
    if (!currentPassage) return;
    const nextIdx = Math.min(currentPassage.sentences.length - 1, currentSentenceIdx + 1);
    playSentence(nextIdx);
  };

  const handlePrevSentence = () => {
    if (!currentPassage) return;
    const prevIdx = Math.max(0, currentSentenceIdx - 1);
    playSentence(prevIdx);
  };

  const handleReplaySentence = () => {
    playSentence(currentSentenceIdx);
  };

  // ==================== PHÂN TÍCH NGỮ PHÁP & AI TUTOR ====================

  const handleInspectGrammar = async (sentence: ReadingSentenceItem) => {
    setSelectedSentence(sentence);
    setLoadingGrammar(true);
    setGrammarExplanation(null);
    try {
      const res = await backendClient.explainReadingSentence({
        passageId: currentPassage!.id,
        sentenceZh: sentence.sentenceZh,
        sentencePinyin: sentence.sentencePinyin,
        sentenceVi: sentence.sentenceVi,
        contextPassage: currentPassage!.fullContentZh,
      });
      if (res.success && res.data) {
        setGrammarExplanation(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi phân tích ngữ pháp:', err);
    } finally {
      setLoadingGrammar(false);
    }
  };

  const handleSendTutorQuery = async (queryText?: string) => {
    const q = queryText || tutorQuery;
    if (!q.trim() || !currentPassage) return;
    const newHistory = [...tutorChatHistory, { sender: 'user' as const, text: q }];
    setTutorChatHistory(newHistory);
    setTutorQuery('');
    setTutorLoading(true);

    try {
      const res = await backendClient.askReadingTutor({
        passageId: currentPassage.id,
        sentenceZh: selectedSentence?.sentenceZh,
        userQuery: q,
        chatHistory: newHistory,
      });
      if (res.success && res.data) {
        setTutorChatHistory([...newHistory, { sender: 'ai', text: res.data.reply }]);
      }
    } catch (err) {
      console.error('Lỗi khi hỏi AI Tutor:', err);
    } finally {
      setTutorLoading(false);
    }
  };

  // ==================== CHUYỂN SANG SHADOWING & LƯU TỪ VỰNG ====================

  const handleSyncToShadowing = async (sentenceIdx: number) => {
    if (!currentPassage) return;
    try {
      const res = await backendClient.syncReadingToShadowing(currentPassage.id, sentenceIdx);
      if (res.success) {
        alert(`Đã tạo thành công bài tập Shadowing từ câu này!`);
        if (onNavigate) {
          onNavigate('shadowing');
        }
      }
    } catch (err: any) {
      alert(`Không thể chuyển sang Shadowing: ${err.message}`);
    }
  };

  const handleSaveWord = async (wordZh: string, pinyin: string, meaningVi: string) => {
    try {
      const res = await backendClient.syncReadingWordToMemory(wordZh, pinyin, meaningVi, currentPassage?.hskLevel || 1);
      if (res.success) {
        setSavedWordsList((prev) => [...prev, wordZh]);
        alert(`Đã lưu "${wordZh}" vào Bộ nhớ từ vựng và Lịch ôn tập ngắt quãng (SM-2)!`);
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu từ: ${err.message}`);
    }
  };

  // ==================== TRẢ LỜI CÂU HỎI & CHẤM ĐIỂM ====================

  const handleSelectOption = async (qId: string, qType: string, selectedOptIdx: number, expectedAnswer: any, citationText: string) => {
    setUserAnswers({ ...userAnswers, [qId]: selectedOptIdx });
    const isCorrect = Number(selectedOptIdx) === Number(expectedAnswer);
    setAnswerResults({
      ...answerResults,
      [qId]: {
        isCorrect,
        scorePercent: isCorrect ? 100 : 0,
        feedbackVi: isCorrect
          ? 'Chính xác! Bạn đã hiểu đúng chi tiết trong bài.'
          : 'Chưa chính xác. Hãy xem kỹ phần trích dẫn căn cứ trong bài đọc.',
        citationText,
      },
    });
    if (isCorrect) audioService.playCorrectSound();
  };

  const handleEvaluateFreeText = async (qId: string, qText: string, expectedAnswer: any, citationText: string) => {
    const inputAnswer = freeTextInputs[qId] || '';
    if (!inputAnswer.trim() || !currentPassage) return;
    setEvaluatingQuestionId(qId);

    try {
      const res = await backendClient.evaluateReadingAnswer({
        passageId: currentPassage.id,
        questionId: qId,
        questionText: qText,
        questionType: 'free_text_vi',
        expectedAnswer,
        citationText,
        userAnswer: inputAnswer,
      });

      if (res.success && res.data) {
        setUserAnswers({ ...userAnswers, [qId]: inputAnswer });
        setAnswerResults({
          ...answerResults,
          [qId]: res.data,
        });
        if (res.data.isCorrect) audioService.playCorrectSound();
      }
    } catch (err) {
      console.error('Lỗi khi chấm câu hỏi tự do:', err);
    } finally {
      setEvaluatingQuestionId(null);
    }
  };

  // Nộp bài và lưu phiên đọc
  const handleSubmitSession = async () => {
    if (!currentPassage) return;
    setSubmittingSession(true);
    const durationSeconds = Math.max(15, Math.round((Date.now() - sessionStartTime) / 1000));

    const answersPayload = currentPassage.comprehensionQuestions.map((q) => {
      const userAns = userAnswers[q.id];
      const result = answerResults[q.id];
      return {
        questionId: q.id,
        questionType: q.type,
        userAnswer: String(userAns ?? ''),
        isCorrect: result?.isCorrect ?? false,
      };
    });

    try {
      const res = await backendClient.submitReadingSession({
        passageId: currentPassage.id,
        mode: readingMode,
        timeSpentSeconds: durationSeconds,
        answers: answersPayload,
        lookedUpWords: lookedUpWordsList,
        savedWords: savedWordsList,
      });

      if (res.success && res.data) {
        setSessionReport(res.data);
        loadStats();
      }
    } catch (err) {
      console.error('Lỗi khi nộp bài đọc:', err);
    } finally {
      setSubmittingSession(false);
    }
  };

  // AI Tạo bài đọc cá nhân hóa
  const handleGeneratePassage = async () => {
    setCreatingPassage(true);
    try {
      const res = await backendClient.generateReadingPassage({
        hskLevel: createLevel,
        level: `hsk${createLevel}`,
        topic: createTopic,
        genre: createGenre,
        targetLength: createLength,
      });

      if (res.success && res.data) {
        setCreateModalOpen(false);
        handleOpenPassage(res.data.id);
        loadPassages();
      } else {
        alert(res.error || 'Không thể tạo bài đọc AI.');
      }
    } catch (err: any) {
      alert(`Lỗi khi tạo bài đọc AI: ${err.message}`);
    } finally {
      setCreatingPassage(false);
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-base leading-relaxed';
      case 'base':
        return 'text-lg leading-loose';
      case 'lg':
        return 'text-xl leading-loose';
      case 'xl':
        return 'text-2xl leading-loose';
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto px-2 sm:px-4">
      {/* ========================================================================
          THƯ VIỆN BÀI ĐỌC (LIBRARY VIEW)
      ======================================================================== */}
      {viewMode === 'library' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Stats Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black">Luyện Đọc Tiếng Trung Tương Tác</h1>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                    Interactive Reading
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-primary-100 mt-1 max-w-xl">
                  Thư viện bài đọc phân cấp chuẩn HSK 3.0 / 2.0. Đọc hiểu không cần dịch từng chữ, tra từ tức thì, nghe
                  đồng bộ câu và luyện đọc thành tiếng cùng AI Tutor.
                </p>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-primary-700 font-black text-xs shadow-md hover:bg-primary-50 transition-transform active:scale-95 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>✨ AI Tạo Bài Đọc Riêng</span>
              </button>
            </div>

            {/* Quick Metrics */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/20 text-xs">
                <div className="flex items-center gap-2">
                  <BookCheck className="w-4 h-4 text-white/80" />
                  <div>
                    <div className="font-bold">{stats.completedPassages}/{stats.totalPassages} bài</div>
                    <div className="text-[10px] text-white/70">Đã hoàn thành</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/80" />
                  <div>
                    <div className="font-bold">{stats.totalMinutesRead} phút</div>
                    <div className="text-[10px] text-white/70">Thời lượng đã đọc</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <div>
                    <div className="font-bold">{stats.averageReadingWpm} từ/phút</div>
                    <div className="text-[10px] text-white/70">Tốc độ đọc trung bình</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <div>
                    <div className="font-bold">{stats.averageComprehensionScore}%</div>
                    <div className="text-[10px] text-white/70">Độ hiểu trung bình</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả trình độ' },
              { id: 'hsk1', label: 'HSK 1' },
              { id: 'hsk2', label: 'HSK 2' },
              { id: 'hsk3', label: 'HSK 3' },
              { id: 'hsk4', label: 'HSK 4' },
              { id: 'hsk5', label: 'HSK 5' },
              { id: 'hsk6', label: 'HSK 6' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedLevel === lvl.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Secondary Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm bài đọc, chủ đề, chữ Hán..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadPassages()}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Tất cả chủ đề</option>
              <option value="daily_life">Đời sống hàng ngày</option>
              <option value="family">Gia đình</option>
              <option value="food">Ẩm thực</option>
              <option value="travel">Du lịch</option>
              <option value="culture">Văn hóa Trung Quốc</option>
              <option value="idioms_stories">Thành ngữ & Truyện ngụ ngôn</option>
              <option value="technology">Khoa học & Công nghệ</option>
            </select>

            {/* Status Filter */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'favorites', label: 'Yêu thích' },
                { id: 'completed', label: 'Đã đọc' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id as any)}
                  className={`flex-1 py-1.5 rounded-lg transition-colors ${
                    selectedStatus === st.id
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Passages Grid */}
          {loadingPassages ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <div className="text-xs font-semibold text-slate-400">Đang tải thư viện bài đọc...</div>
            </div>
          ) : passages.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Không tìm thấy bài đọc phù hợp</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hãy thử chọn bộ lọc khác hoặc yêu cầu AI tạo một bài đọc theo chủ đề bạn yêu thích.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-700 shadow"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo bài đọc mới bằng AI</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {passages.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenPassage(p.id)}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary-300 dark:hover:border-primary-800 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    {/* Top Badges & Favorite */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 text-[10px] font-black uppercase">
                          HSK {p.hskLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                          {p.topic === 'daily_life' && 'Đời sống'}
                          {p.topic === 'food' && 'Ẩm thực'}
                          {p.topic === 'travel' && 'Du lịch'}
                          {p.topic === 'culture' && 'Văn hóa'}
                          {p.topic === 'idioms_stories' && 'Thành ngữ'}
                          {p.topic === 'technology' && 'Công nghệ'}
                          {!['daily_life', 'food', 'travel', 'culture', 'idioms_stories', 'technology'].includes(p.topic) && p.topic}
                        </span>
                        {p.source === 'gemini_ai_personalized' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> AI Tạo
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(p.id, p.isFavorite);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <Star className={`w-4 h-4 ${p.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Titles */}
                    <div>
                      <h3 className="text-lg font-black font-chinese text-slate-800 dark:text-slate-100 group-hover:text-primary-600 transition-colors">
                        {p.titleZh}
                      </h3>
                      <div className="text-xs font-semibold text-rose-500 mt-0.5">{p.titlePinyin}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{p.titleVi}</div>
                    </div>
                  </div>

                  {/* Footer Metrics & Status */}
                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>{p.wordCount} chữ Hán</span>
                      <span>•</span>
                      <span>~{p.estimatedReadingMinutes} phút đọc</span>
                    </div>

                    <div className="flex items-center gap-1 text-primary-600 font-bold group-hover:translate-x-1 transition-transform">
                      <span>Đọc ngay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          TRÌNH ĐỌC TƯƠNG TÁC (INTERACTIVE READER VIEW)
      ======================================================================== */}
      {viewMode === 'reader' && currentPassage && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Bar: Back & Mode Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                audioService.stopSpeaking();
                setIsPlayingAudio(false);
                setViewMode('library');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors w-fit"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Về Thư Viện Bài Đọc</span>
            </button>

            {/* Reading Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                onClick={() => setReadingMode('intensive')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  readingMode === 'intensive'
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Đọc chuyên sâu: Tra từ, phân tích ngữ pháp, câu hỏi"
              >
                📖 Chuyên sâu
              </button>
              <button
                onClick={() => setReadingMode('extensive')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  readingMode === 'extensive'
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Đọc mở rộng: Đọc thông suốt nâng cao tốc độ tiếp nhận"
              >
                ⚡ Đọc nhanh
              </button>
              <button
                onClick={() => setReadingMode('blind_listening')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  readingMode === 'blind_listening'
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Nghe không nhìn chữ: Ẩn văn bản, luyện tiếp nhận thính giác"
              >
                🎧 Nghe chay
              </button>
            </div>
          </div>

          {/* Reader Main Container */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Passage Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-black">
                    HSK {currentPassage.hskLevel}
                  </span>
                  <span className="text-[11px] text-slate-400">{currentPassage.standardVersion}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black font-chinese text-slate-800 dark:text-slate-100">
                  {currentPassage.titleZh}
                </h2>
                <div className="text-sm font-semibold text-rose-500">{currentPassage.titlePinyin}</div>
                <div className="text-xs text-slate-500">{currentPassage.titleVi}</div>
              </div>

              {/* Display Customization Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setShowPinyin(!showPinyin)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    showPinyin
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Bật/Tắt Pinyin"
                >
                  Pinyin
                </button>

                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    showTranslation
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                  title="Bật/Tắt Bản dịch tiếng Việt"
                >
                  Dịch
                </button>

                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-bold">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setFontSize(sz)}
                      className={`px-2 py-1 rounded-lg ${
                        fontSize === sz ? 'bg-primary-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {sz === 'sm' ? 'A-' : sz === 'xl' ? 'A+' : 'A'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Player Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevSentence}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Câu trước đó"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlayAudio}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700 transition-colors"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>{isPlayingAudio ? 'Tạm dừng' : 'Nghe audio'}</span>
                </button>

                <button
                  onClick={handleNextSentence}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Câu tiếp theo"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  onClick={handleReplaySentence}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Lặp lại câu này"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed & Auto advance */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Tốc độ:</span>
                  {[0.75, 1.0, 1.25].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSpeechRate(spd)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        speechRate === spd
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span>Tự chuyển câu</span>
                </label>
              </div>
            </div>

            {/* Reading Content Canvas */}
            {readingMode === 'blind_listening' ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                <Headphones className="w-12 h-12 text-primary-500 mx-auto animate-pulse" />
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Đang ở chế độ "Nghe không nhìn chữ"
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Toàn bộ chữ Hán, Pinyin và bản dịch đã được ẩn. Hãy bấm nút Nghe audio ở trên, tập trung tiếp nhận âm
                  thanh tiếng Trung và kéo xuống dưới trả lời các câu hỏi đọc hiểu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span>Văn bản tương tác:</span>
                  <span className="text-primary-600 dark:text-primary-400">
                    👉 Nhấn vào từ để tra từ điển • Nhấn vào câu để xem phân tích ngữ pháp
                  </span>
                </div>

                {/* Sentences flow */}
                <div className={`space-y-3 ${getFontSizeClass()}`}>
                  {currentPassage.sentences.map((s, idx) => {
                    const isCurrentAudio = isPlayingAudio && currentSentenceIdx === idx;
                    const isSelected = selectedSentence?.id === s.id;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedSentence(s);
                          setCurrentSentenceIdx(idx);
                        }}
                        className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                          isCurrentAudio
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 shadow-xs'
                            : isSelected
                            ? 'bg-primary-50/60 dark:bg-primary-950/40 border-primary-400'
                            : 'bg-slate-50/40 dark:bg-slate-800/20 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Pinyin Line */}
                        {showPinyin && (
                          <div className="text-xs font-semibold text-rose-500 mb-1 select-none">
                            {s.sentencePinyin}
                          </div>
                        )}

                        {/* Interactive Chinese Text */}
                        <div className="font-chinese font-medium">
                          <ClickableChineseText
                            text={s.sentenceZh}
                            onWordClick={(w) => {
                              window.dispatchEvent(new CustomEvent('halo:quick-dict', { detail: { word: w } }));
                            }}
                          />
                        </div>

                        {/* Vietnamese Translation Line */}
                        {showTranslation && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            {s.sentenceVi}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Sentence Action Panel */}
            {selectedSentence && readingMode !== 'blind_listening' && (
              <div className="p-4 rounded-2xl bg-primary-50/60 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-xs text-primary-800 dark:text-primary-200">
                    Câu đang chọn: <span className="font-chinese text-sm">"{selectedSentence.sentenceZh}"</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      onClick={() => playSentence(selectedSentence.sentenceIndex)}
                      className="px-2.5 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-primary-700"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe câu</span>
                    </button>

                    <button
                      onClick={() => handleInspectGrammar(selectedSentence)}
                      disabled={loadingGrammar}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center gap-1 hover:bg-primary-50"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>{loadingGrammar ? 'Đang phân tích...' : 'Giải thích ngữ pháp AI'}</span>
                    </button>

                    <button
                      onClick={() => handleSyncToShadowing(selectedSentence.sentenceIndex)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 hover:bg-indigo-100"
                      title="Chuyển câu này sang bài tập Shadowing chuyên sâu"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Luyện Shadowing</span>
                    </button>
                  </div>
                </div>

                {/* Grammar Explanation Box */}
                {grammarExplanation && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Điểm ngữ pháp then chốt: {grammarExplanation.keyGrammarPoint}</span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {grammarExplanation.detailedExplanationVi}
                    </p>

                    {grammarExplanation.contextualNuanceVi && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                        <span className="font-bold">Sắc thái trong bài: </span>
                        {grammarExplanation.contextualNuanceVi}
                      </div>
                    )}

                    {grammarExplanation.components && grammarExplanation.components.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-bold text-slate-400 text-[11px]">Thành phần câu:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {grammarExplanation.components.map((c, cIdx) => (
                            <div key={cIdx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px]">
                              <div className="font-bold text-primary-600">{c.role}</div>
                              <div className="font-chinese font-semibold text-slate-800 dark:text-slate-200">
                                {c.segment}
                              </div>
                              <div className="text-[10px] text-slate-400">{c.explanation}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {grammarExplanation.similarExamples && grammarExplanation.similarExamples.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-400 text-[11px]">Ví dụ tương tự:</div>
                        {grammarExplanation.similarExamples.map((ex, exIdx) => (
                          <div key={exIdx} className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-chinese font-semibold">{ex.zh}</span> ({ex.pinyin}): {ex.vi}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Core Vocabulary & Grammar Accordion */}
            {currentPassage.vocabularyFocus && currentPassage.vocabularyFocus.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Từ vựng & Cấu trúc trọng tâm của bài:</span>
                  <span className="text-[10px] text-slate-400">({currentPassage.vocabularyFocus.length} từ vựng)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentPassage.vocabularyFocus.map((v, vIdx) => (
                    <div
                      key={vIdx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold font-chinese text-slate-800 dark:text-slate-100 text-sm">
                          {v.simplified}
                        </span>{' '}
                        <span className="text-rose-500 text-[11px]">({v.pinyin})</span>
                        <div className="text-slate-500 text-[11px]">{v.meaningVi}</div>
                      </div>

                      <button
                        onClick={() => handleSaveWord(v.simplified, v.pinyin, v.meaningVi)}
                        className="px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 text-[10px] font-bold hover:bg-primary-100"
                        title="Lưu vào Bộ nhớ học tập & SRS"
                      >
                        + Lưu SRS
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehension Questions Section */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Câu Hỏi Đọc Hiểu ({currentPassage.comprehensionQuestions.length} câu)
                  </h3>
                  <p className="text-xs text-slate-400">Kiểm tra khả năng nắm bắt thông tin và suy luận từ ngữ cảnh.</p>
                </div>
              </div>

              <div className="space-y-4">
                {currentPassage.comprehensionQuestions.map((q, qIdx) => {
                  const userAns = userAnswers[q.id];
                  const res = answerResults[q.id];

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Câu {qIdx + 1}: {q.question}
                      </div>

                      {/* Trắc nghiệm chọn 1 đáp án hoặc Đúng/Sai */}
                      {(q.type === 'single_choice' || q.type === 'true_false' || q.type === 'fill_blank') && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = userAns === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectOption(q.id, q.type, optIdx, q.answer, q.citationText)}
                                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-600 font-bold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Câu trả lời tự do bằng tiếng Việt hoặc tiếng Trung */}
                      {(q.type === 'free_text_vi' || q.type === 'free_text_zh') && (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Nhập câu trả lời của bạn theo ý hiểu..."
                            value={freeTextInputs[q.id] || ''}
                            onChange={(e) => setFreeTextInputs({ ...freeTextInputs, [q.id]: e.target.value })}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                          />
                          <button
                            onClick={() => handleEvaluateFreeText(q.id, q.question, q.answer, q.citationText)}
                            disabled={evaluatingQuestionId === q.id || !freeTextInputs[q.id]?.trim()}
                            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {evaluatingQuestionId === q.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>AI Đang chấm bài...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Chấm điểm câu trả lời</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Kết quả & Nhận xét phản hồi */}
                      {res && (
                        <div
                          className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                            res.isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {res.isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <div>
                              <span className="font-bold">{res.isCorrect ? 'Chính xác! ' : 'Chưa đúng. '}</span>
                              {res.feedbackVi}
                            </div>
                            {res.citationText && (
                              <div className="text-[11px] opacity-80 italic">
                                📌 Căn cứ trong bài: "{res.citationText}"
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Session Button */}
              <button
                onClick={handleSubmitSession}
                disabled={submittingSession}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-black text-sm shadow-md hover:from-primary-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {submittingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tổng hợp báo cáo đọc hiểu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Hoàn Thành Phiên Đọc & Nhận Báo Cáo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Tutor Chat Floating Panel */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div
              onClick={() => setTutorChatOpen(!tutorChatOpen)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Hỏi Gia Sư AI Về Bài Đọc
                  </h4>
                  <p className="text-[11px] text-slate-400">Giải thích câu, viết lại đơn giản hơn, trả lời thắc mắc ngữ cảnh</p>
                </div>
              </div>

              <div className="text-slate-400">
                {tutorChatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {tutorChatOpen && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Quick Prompts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    'Viết lại câu đang chọn bằng tiếng Trung đơn giản hơn',
                    'Tóm tắt ý chính của bài đọc này',
                    'Giải thích ngữ cảnh câu này',
                    'Tạo 2 câu ví dụ tương tự',
                  ].map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendTutorQuery(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold whitespace-nowrap hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Messages History */}
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  {tutorChatHistory.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 text-[11px]">
                      Bạn có thắc mắc gì về bài đọc không? Hãy hỏi Gia sư AI ngay nhé!
                    </div>
                  ) : (
                    tutorChatHistory.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          m.sender === 'user'
                            ? 'ml-auto bg-primary-600 text-white'
                            : 'mr-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {m.text}
                      </div>
                    ))
                  )}

                  {tutorLoading && (
                    <div className="flex items-center gap-2 text-slate-400 p-2 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gia sư AI đang soạn phản hồi...</span>
                    </div>
                  )}
                </div>

                {/* Query Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Hỏi bất kỳ điều gì về bài đọc này..."
                    value={tutorQuery}
                    onChange={(e) => setTutorQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendTutorQuery()}
                    className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-primary-500"
                  />
                  <button
                    onClick={() => handleSendTutorQuery()}
                    disabled={!tutorQuery.trim() || tutorLoading}
                    className="p-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL BÁO CÁO KẾT THÚC PHIÊN ĐỌC
      ======================================================================== */}
      {sessionReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                Chúc Mừng Bạn Đã Hoàn Thành!
              </h3>
              <p className="text-xs text-slate-400">Báo cáo đánh giá năng lực tiếp nhận tiếng Trung</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <div className="text-lg font-black text-primary-600">{sessionReport.scorePercent}%</div>
                <div className="text-[10px] text-slate-400">Độ hiểu bài ({sessionReport.correctCount}/{sessionReport.totalQuestions} câu)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <div className="text-lg font-black text-emerald-600">{sessionReport.readingSpeedWpm} WPM</div>
                <div className="text-[10px] text-slate-400">Tốc độ đọc (từ/phút)</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/40 text-primary-900 dark:text-primary-200 text-xs leading-relaxed border border-primary-200 dark:border-primary-800/60">
              <span className="font-bold block mb-0.5">Lời khuyên tiếp theo:</span>
              {sessionReport.recommendation}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setSessionReport(null);
                  setViewMode('library');
                }}
                className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
              >
                Trở về Thư viện bài đọc
              </button>

              <button
                onClick={() => setSessionReport(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100"
              >
                Đọc lại bài này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL AI TẠO BÀI ĐỌC CÁ NHÂN HÓA
      ======================================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                  AI Tạo Bài Đọc Cá Nhân Hóa
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Gemini sẽ kết hợp trình độ HSK mục tiêu, từ vựng bạn đã biết và các điểm ngữ pháp bạn hay nhầm lẫn từ Bộ
              nhớ học tập để thiết kế một bài đọc mạch lạc, tự nhiên dành riêng cho bạn.
            </p>

            <div className="space-y-3 text-xs">
              {/* Level selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Trình độ HSK mục tiêu:</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((l) => (
                    <button
                      key={l}
                      onClick={() => setCreateLevel(l)}
                      className={`py-2 rounded-xl font-bold ${
                        createLevel === l
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      HSK {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Chủ đề bài đọc:</label>
                <select
                  value={createTopic}
                  onChange={(e) => setCreateTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                >
                  <option value="daily_life">Đời sống thường nhật (Sinh hoạt, bạn bè)</option>
                  <option value="food">Ẩm thực Trung Quốc (Gọi món, món ăn nổi tiếng)</option>
                  <option value="travel">Du lịch & Khám phá danh lam thắng cảnh</option>
                  <option value="shopping">Mua sắm & Trả giá</option>
                  <option value="culture">Văn hóa truyền thống & Lễ hội Trung Hoa</option>
                  <option value="idioms_stories">Truyện thành ngữ & Bài học ngụ ngôn</option>
                  <option value="technology">Công nghệ & Cuộc sống hiện đại</option>
                </select>
              </div>

              {/* Genre selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Thể loại bài đọc:</label>
                <select
                  value={createGenre}
                  onChange={(e) => setCreateGenre(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                >
                  <option value="short_passage">Đoạn văn tự sự ngắn</option>
                  <option value="dialogue">Đoạn hội thoại giao tiếp</option>
                  <option value="diary">Trang nhật ký cá nhân</option>
                  <option value="story">Truyện ngắn có cốt truyện</option>
                  <option value="simple_article">Bài báo miêu tả / Giới thiệu</option>
                </select>
              </div>

              {/* Length selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Độ dài dự kiến:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'short', label: 'Ngắn (~80 chữ)' },
                    { id: 'medium', label: 'Vừa (~150 chữ)' },
                    { id: 'long', label: 'Dài (~250 chữ)' },
                  ].map((len) => (
                    <button
                      key={len.id}
                      onClick={() => setCreateLength(len.id as any)}
                      className={`py-2 rounded-xl font-bold ${
                        createLength === len.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold text-xs hover:bg-slate-100"
              >
                Hủy bỏ
              </button>

              <button
                onClick={handleGeneratePassage}
                disabled={creatingPassage}
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-black text-xs shadow hover:bg-primary-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {creatingPassage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang sáng tác bài đọc...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo bài đọc ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
