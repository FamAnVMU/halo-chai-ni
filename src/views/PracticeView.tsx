import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  RotateCcw,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Lightbulb,
  Check,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Calendar,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  SrsDashboardStats,
  SrsItem,
  SrsReviewMode,
  SrsUserRating,
  SrsAIExercise
} from '../types';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';

interface PracticeViewProps {
  onNavigate?: (tab: any) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ onNavigate }) => {
  // Main view state: 'dashboard' | 'reviewing' | 'summary'
  const [viewState, setViewState] = useState<'dashboard' | 'reviewing' | 'summary'>('dashboard');

  // Dashboard Data
  const [dashboardStats, setDashboardStats] = useState<SrsDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Review Configuration
  const [selectedMode, setSelectedMode] = useState<SrsReviewMode>('flashcard');
  const [filterType, setFilterType] = useState<'all' | 'vocabulary' | 'grammar' | 'error' | 'overdue'>('all');
  const [filterHsk, setFilterHsk] = useState<number | 'all'>('all');
  const [cardLimit, setCardLimit] = useState<number>(15);

  // Active Review Session
  const [queue, setQueue] = useState<SrsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Objective exercise testing inside cards (quiz / options)
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(true);

  // AI Context Challenge
  const [aiExercise, setAiExercise] = useState<SrsAIExercise | null>(null);
  const [loadingAiExercise, setLoadingAiExercise] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSelectedOption, setAiSelectedOption] = useState<string | null>(null);
  const [aiAnswerChecked, setAiAnswerChecked] = useState(false);

  // Session Results Log
  const [sessionResults, setSessionResults] = useState<
    Array<{
      item: SrsItem;
      rating: SrsUserRating;
      isCorrect: boolean;
      newInterval: number;
    }>
  >([]);

  // Load Dashboard on mount
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoadingStats(true);
    try {
      const res = await backendClient.getSrsDashboard();
      if (res.success && res.data) {
        setDashboardStats(res.data);
        // Nếu chưa có thẻ nào, tự động sync một lần từ bộ nhớ hiện tại
        if (res.data.totalCards === 0) {
          handleSyncCards(false);
        }
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu SRS Dashboard:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSyncCards = async (showNotification = true) => {
    setSyncing(true);
    try {
      const res = await backendClient.syncSrsCards();
      if (res.success && res.data) {
        if (showNotification) {
          setSyncMessage(
            `Đã đồng bộ thành công: +${res.data.addedVocab} từ vựng, +${res.data.addedGrammar} ngữ pháp, +${res.data.addedErrors} lỗi sai vào thẻ SRS!`
          );
          setTimeout(() => setSyncMessage(null), 5000);
        }
        await loadDashboard();
      }
    } catch (e: any) {
      if (showNotification) {
        setSyncMessage(`Lỗi đồng bộ: ${e.message}`);
        setTimeout(() => setSyncMessage(null), 5000);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Start Review Session
  const handleStartReview = async (overrideMode?: SrsReviewMode, overrideFilter?: 'all' | 'vocabulary' | 'grammar' | 'error' | 'overdue') => {
    const modeToUse = overrideMode || selectedMode;
    const filterToUse = overrideFilter || filterType;

    setLoadingStats(true);
    try {
      // 1. Khởi tạo session ở backend
      const sessRes = await backendClient.startSrsSession(`srs_${modeToUse}`);
      const newSessionId = sessRes.success && sessRes.data ? sessRes.data.sessionId : null;
      setSessionId(newSessionId);

      // 2. Lấy hàng đợi thẻ
      const qRes = await backendClient.getSrsQueue({
        limit: cardLimit,
        mode: filterToUse,
        hskLevel: filterHsk === 'all' ? undefined : filterHsk
      });

      if (qRes.success && qRes.data && qRes.data.length > 0) {
        setQueue(qRes.data);
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowPinyin(true);
        setSelectedMode(modeToUse);
        setSessionStartTime(Date.now());
        setSessionResults([]);
        setAiExercise(null);
        prepareCardState(qRes.data[0], modeToUse);
        setViewState('reviewing');
      } else {
        alert('Hiện tại bạn không có thẻ nào cần ôn trong tiêu chí này. Hãy đồng bộ kiến thức mới hoặc chọn chế độ khác nhé!');
      }
    } catch (e: any) {
      alert(`Không thể bắt đầu phiên ôn: ${e.message}`);
    } finally {
      setLoadingStats(false);
    }
  };

  // Prepare card state (generate multiple choice options for objective quiz modes)
  const prepareCardState = (card: SrsItem, mode: SrsReviewMode) => {
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsAnswerCorrect(true);
    setAiExercise(null);
    setShowAiModal(false);

    // Xử lý tạo phương án trắc nghiệm nếu ở các chế độ trắc nghiệm
    if (mode === 'zh_to_vi' || mode === 'vi_to_zh' || mode === 'listening') {
      const correctAns = mode === 'zh_to_vi' ? card.promptVi : card.promptZh;
      const distractors = [
        'Một ý nghĩa khác trong ngữ cảnh',
        'Phủ định của hành động',
        'Trạng thái tương tự nhưng nhẹ hơn',
        'Biểu thị thời gian tương lai'
      ];
      // Shuffle options
      const opts = [correctAns, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
      setCurrentOptions(opts);
    }
  };

  // Sound pronunciation
  const handlePlayAudio = (text: string) => {
    audioService.speak(text, { rate: 0.85 });
  };

  // Check objective answer in quiz modes
  const handleSelectOption = (opt: string) => {
    if (isAnswerChecked) return;
    const currentCard = queue[currentIndex];
    setSelectedOption(opt);
    setIsAnswerChecked(true);

    const correctAns = selectedMode === 'zh_to_vi' ? currentCard.promptVi : currentCard.promptZh;
    const isCorrect = opt.trim().toLowerCase() === correctAns.trim().toLowerCase();
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
    }
  };

  // Submit SM-2 Rating for Current Card
  const handleSubmitRating = async (rating: SrsUserRating) => {
    if (isSubmitting) return;
    const currentCard = queue[currentIndex];
    setIsSubmitting(true);

    try {
      const res = await backendClient.submitSrsReview({
        itemId: currentCard.id,
        userRating: rating,
        reviewMode: selectedMode,
        sessionId: sessionId || undefined,
        userAnswer: selectedOption || undefined,
        isCorrect: isAnswerCorrect,
        durationMs: Date.now() - sessionStartTime
      });

      if (res.success && res.data) {
        const result = res.data;
        // Lưu vào kết quả phiên
        setSessionResults(prev => [
          ...prev,
          {
            item: currentCard,
            rating,
            isCorrect: isAnswerCorrect,
            newInterval: result.sm2Result.newInterval
          }
        ]);

        // Sang thẻ tiếp theo hoặc Kết thúc phiên
        if (currentIndex + 1 < queue.length) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          prepareCardState(queue[nextIdx], selectedMode);
        } else {
          // Hoàn thành phiên!
          await handleFinishSession();
        }
      }
    } catch (e: any) {
      console.error('Lỗi gửi đánh giá SRS:', e);
      alert(`Lỗi ghi nhận đánh giá: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finish review session
  const handleFinishSession = async () => {
    const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
    if (sessionId) {
      await backendClient.finishSrsSession(sessionId, durationSeconds);
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setViewState('summary');
    loadDashboard();
  };

  // AI Context Challenge Generator
  const handleGenerateAIChallenge = async () => {
    const currentCard = queue[currentIndex];
    setLoadingAiExercise(true);
    setShowAiModal(true);
    setAiSelectedOption(null);
    setAiAnswerChecked(false);

    try {
      const res = await backendClient.generateSrsAIExercise(currentCard.id);
      if (res.success && res.data) {
        setAiExercise(res.data);
      }
    } catch (e) {
      console.error('Lỗi tạo bài tập AI:', e);
    } finally {
      setLoadingAiExercise(false);
    }
  };

  const currentCard = queue[currentIndex];

  // ==================== 1. DASHBOARD VIEW ====================
  if (viewState === 'dashboard') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
        {/* Header & Quick Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Ôn Tập Thông Minh & SRS
                  <span className="text-xs bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
                    SM-2 Engine
                  </span>
                </h1>
                <p className="text-sm text-gray-500">
                  Lặp lại ngắt quãng khoa học • Ưu tiên từ dễ quên & lỗi sai cá nhân
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSyncCards(true)}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-rose-500' : 'text-gray-500'}`} />
              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ kiến thức mới'}
            </button>

            <button
              onClick={() => handleStartReview()}
              disabled={loadingStats || !dashboardStats || dashboardStats.totalCards === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-bold text-sm shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Bắt đầu ôn tập ngay
            </button>
          </div>
        </div>

        {/* Sync message alert */}
        {syncMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-3 animate-slideDown shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{syncMessage}</p>
          </div>
        )}

        {/* 4 Stat Metric Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Due Today */}
            <div className="p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-rose-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Đến hạn hôm nay</span>
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-rose-950">
                {dashboardStats?.dueToday || 0}
                <span className="text-sm font-semibold text-rose-600 ml-1.5">thẻ</span>
              </div>
              <p className="text-xs text-rose-700/80 mt-1">Cần củng cố trước 23:59</p>
            </div>

            {/* Overdue */}
            <div className="p-5 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-red-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Quá hạn cần gấp</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-red-950">
                {dashboardStats?.overdue || 0}
                <span className="text-sm font-semibold text-red-600 ml-1.5">thẻ</span>
              </div>
              <p className="text-xs text-red-700/80 mt-1">Rất dễ quên nếu không ôn lại</p>
            </div>

            {/* Learning & New */}
            <div className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Đang học / Mới</span>
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-amber-950">
                {(dashboardStats?.learning || 0) + (dashboardStats?.newCards || 0)}
                <span className="text-sm font-semibold text-amber-700 ml-1.5">thẻ</span>
              </div>
              <p className="text-xs text-amber-800/80 mt-1">
                {dashboardStats?.newCards || 0} thẻ mới chưa luyện
              </p>
            </div>

            {/* Mastered & Retention */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Thành thạo (Retention)</span>
                <Award className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-emerald-950">
                {dashboardStats?.retentionRate || 85}%
              </div>
              <p className="text-xs text-emerald-800/80 mt-1">
                {dashboardStats?.mastered || 0} thẻ đã ghi nhớ sâu
              </p>
            </div>
          </div>
        )}

        {/* 6 Flexible Review Modes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-rose-500" />
              Chọn Chế Độ Ôn Luyện Linh Hoạt
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Tùy biến mục tiêu rèn luyện trí nhớ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode 1: Flashcard */}
            <div
              onClick={() => {
                setSelectedMode('flashcard');
                handleStartReview('flashcard');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'flashcard'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">🎴</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Flashcard Lật Thẻ Chuẩn
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Lật mặt trước chữ Hán, mặt sau tra nghĩa, ví dụ và tự đánh giá độ dễ SM-2.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 2: Trung -> Việt */}
            <div
              onClick={() => {
                setSelectedMode('zh_to_vi');
                handleStartReview('zh_to_vi');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'zh_to_vi'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">🇨🇳 ➔ 🇻🇳</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Nhận Diện Trung ➔ Việt
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Xem chữ Hán và đoán đúng nghĩa tiếng Việt qua câu hỏi trắc nghiệm phản xạ.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 3: Việt -> Trung */}
            <div
              onClick={() => {
                setSelectedMode('vi_to_zh');
                handleStartReview('vi_to_zh');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'vi_to_zh'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">🇻🇳 ➔ 🇨🇳</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Thử Thách Việt ➔ Trung
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Cho nghĩa tiếng Việt, truy xuất và chọn chữ Hán chính xác trong trí nhớ.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 4: Nghe hiểu */}
            <div
              onClick={() => {
                setSelectedMode('listening');
                handleStartReview('listening');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'listening'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">🎧</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Luyện Nghe & Phản Xạ Âm
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Nghe phát âm chuẩn giọng Bắc Kinh, đoán từ vựng không cần nhìn mặt chữ.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 5: Ngữ pháp */}
            <div
              onClick={() => {
                setSelectedMode('grammar');
                handleStartReview('grammar', 'grammar');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'grammar'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">📐</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Củng Cố Ngữ Pháp Trọng Điểm
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ôn các cấu trúc câu, hư từ, trật tự từ và đối chiếu ví dụ đúng/sai.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 6: Sửa lỗi sai cá nhân */}
            <div
              onClick={() => {
                setSelectedMode('error_fix');
                handleStartReview('error_fix', 'error');
              }}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative group ${
                selectedMode === 'error_fix'
                  ? 'border-rose-500 bg-rose-50/30 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="text-2xl mb-2">🩺</div>
              <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                Chữa Sổ Tay Lỗi Sai Cá Nhân
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Tập trung triệt để các câu bạn đã từng nói/viết sai khi trò chuyện với AI Tutor.
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
                Bắt đầu ngay <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Options & 7-Day Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Filter & Preferences Card */}
          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-rose-500" />
              Tùy Chọn Phiên Ôn
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Nguồn kiến thức:
                </label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">Tất cả (Từ vựng, Ngữ pháp, Lỗi sai)</option>
                  <option value="vocabulary">Chỉ Từ vựng (Vocabulary)</option>
                  <option value="grammar">Chỉ Ngữ pháp (Grammar)</option>
                  <option value="error">Chỉ Sổ tay Lỗi sai (Errors)</option>
                  <option value="overdue">Chỉ Thẻ Quá hạn (Overdue)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Cấp độ HSK:
                </label>
                <div className="flex gap-1.5">
                  {(['all', 1, 2, 3, 4] as const).map(lvl => (
                    <button
                      key={String(lvl)}
                      onClick={() => setFilterHsk(lvl)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterHsk === lvl
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lvl === 'all' ? 'Tất cả' : `HSK ${lvl}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">
                  Số thẻ mỗi lượt:
                </label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map(n => (
                    <button
                      key={n}
                      onClick={() => setCardLimit(n)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        cardLimit === n
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {n} thẻ
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast Bar Chart */}
          <div className="md:col-span-2 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500" />
                Dự Báo Lịch Ôn Tập 7 Ngày Tới
              </h3>
              <span className="text-xs text-gray-400">Thuật toán SM-2</span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-4">
              {dashboardStats?.forecast7Days?.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-2xl h-24 flex items-end p-1 justify-center">
                    <div
                      style={{ height: `${Math.min(100, Math.max(12, d.count * 8))}%` }}
                      className={`w-full rounded-xl transition-all ${
                        i === 0
                          ? 'bg-gradient-to-t from-rose-500 to-amber-500'
                          : d.count > 0
                          ? 'bg-rose-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-800">{d.count}</span>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-gray-700">{d.dayName}</p>
                    <p className="text-[9px] text-gray-400">{d.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. CARD PLAYER (ACTIVE REVIEW) ====================
  if (viewState === 'reviewing' && currentCard) {
    const isErrorCard = currentCard.itemType === 'error';
    const isGrammarCard = currentCard.itemType === 'grammar';
    const progressPercent = Math.round(((currentIndex + 1) / queue.length) * 100);

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
        {/* Top Bar: Navigation, Progress & Stats */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => {
              if (window.confirm('Bạn có muốn tạm dừng phiên ôn tập và quay lại màn hình chính?')) {
                setViewState('dashboard');
                loadDashboard();
              }
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
          >
            ← Thoát phiên
          </button>

          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>
                Thẻ {currentIndex + 1} / {queue.length}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>Streak {currentCard.streak}</span>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white border-2 border-gray-100 rounded-3xl shadow-xl shadow-rose-500/5 p-6 md:p-8 space-y-6 relative overflow-hidden transition-all">
          {/* Card Meta Badges */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  isErrorCard
                    ? 'bg-red-100 text-red-700'
                    : isGrammarCard
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isErrorCard ? '🩺 Chữa Lỗi Sai' : isGrammarCard ? '📐 Ngữ Pháp' : '🔤 Từ Vựng'}
              </span>

              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
                HSK {currentCard.hskLevel}
              </span>

              {currentCard.lapses > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Đã quên {currentCard.lapses} lần
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPinyin(!showPinyin)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={showPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
              >
                {showPinyin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handlePlayAudio(currentCard.promptZh)}
                className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                title="Nghe phát âm"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* FRONT FACE OF CARD */}
          <div className="text-center py-6 space-y-4">
            {isErrorCard ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Câu bạn đã từng diễn đạt sai:
                </p>
                <div className="text-2xl md:text-3xl font-black text-red-700 bg-red-50 p-4 rounded-2xl border border-red-200">
                  "{currentCard.promptZh}"
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  Hãy suy nghĩ cách sửa lại câu trên cho đúng ngữ pháp tiếng Trung chuẩn!
                </p>
              </div>
            ) : selectedMode === 'listening' ? (
              <div className="space-y-4 py-4">
                <button
                  onClick={() => handlePlayAudio(currentCard.promptZh)}
                  className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Volume2 className="w-10 h-10 animate-pulse" />
                </button>
                <p className="text-sm font-semibold text-gray-500">
                  Bấm vào loa để nghe và chọn từ vựng tương ứng
                </p>
              </div>
            ) : selectedMode === 'vi_to_zh' ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Nghĩa tiếng Việt
                </span>
                <div className="text-2xl md:text-3xl font-black text-gray-900">
                  {currentCard.promptVi}
                </div>
                <p className="text-xs text-gray-500">Hãy chọn hoặc nhớ chữ Hán chính xác</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Hanzi */}
                <div className="text-4xl md:text-5xl font-black text-gray-900 tracking-wide font-sans">
                  {currentCard.promptZh}
                </div>

                {/* Pinyin */}
                {showPinyin && currentCard.promptPinyin && (
                  <div className="text-lg md:text-xl font-medium text-rose-600">
                    {currentCard.promptPinyin}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OBJECTIVE QUIZ OPTIONS (If in test/quiz modes) */}
          {(selectedMode === 'zh_to_vi' || selectedMode === 'vi_to_zh' || selectedMode === 'listening') && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-gray-500">Chọn đáp án chính xác:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentOptions.map((opt, idx) => {
                  const correctAns =
                    selectedMode === 'zh_to_vi' ? currentCard.promptVi : currentCard.promptZh;
                  const isSelected = selectedOption === opt;
                  const isRealCorrect = opt.trim().toLowerCase() === correctAns.trim().toLowerCase();

                  let btnStyle = 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800';
                  if (isAnswerChecked) {
                    if (isRealCorrect) {
                      btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                    } else if (isSelected && !isRealCorrect) {
                      btnStyle = 'border-red-500 bg-red-50 text-red-900 font-bold';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(opt)}
                      disabled={isAnswerChecked}
                      className={`p-3.5 rounded-2xl border-2 text-sm text-left transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswerChecked && isRealCorrect && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      )}
                      {isAnswerChecked && isSelected && !isRealCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswerChecked && !isAnswerCorrect && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    Bạn đã chọn chưa chính xác. Hệ thống sẽ ghi nhận và lên lịch ôn lại sớm!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* BACK FACE / ANSWER REVEAL */}
          {!isFlipped ? (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setIsFlipped(true)}
                className="px-6 py-2.5 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-md hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Hiện Đáp Án & Giải Nghĩa
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
              {/* Meaning & Details */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    Ý nghĩa tiếng Việt:
                  </span>
                  {currentCard.extraData?.wordType && (
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
                      {currentCard.extraData.wordType}
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-gray-900">{currentCard.promptVi}</p>

                {/* Grammar Formula */}
                {currentCard.extraData?.formula && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-purple-600 block">Công thức:</span>
                    <p className="text-xs font-mono bg-purple-50 p-2 rounded-xl text-purple-900 border border-purple-100">
                      {currentCard.extraData.formula}
                    </p>
                  </div>
                )}

                {/* Example sentence */}
                {currentCard.extraData?.exampleZh && (
                  <div className="pt-2 border-t border-gray-200/60 mt-2 space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 block">Ví dụ thực tế:</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {currentCard.extraData.exampleZh}
                      </p>
                      <button
                        onClick={() => handlePlayAudio(currentCard.extraData?.exampleZh || '')}
                        className="text-gray-400 hover:text-rose-600"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {currentCard.extraData?.exampleVi && (
                      <p className="text-xs text-gray-600">{currentCard.extraData.exampleVi}</p>
                    )}
                  </div>
                )}

                {/* Error Card Corrected Sentence */}
                {isErrorCard && currentCard.extraData?.correctedSentence && (
                  <div className="pt-2 border-t border-red-200 mt-2 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-600 block">
                      Câu sửa đúng chuẩn:
                    </span>
                    <p className="text-sm font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      {currentCard.extraData.correctedSentence}
                    </p>
                    {currentCard.extraData?.explanationVi && (
                      <p className="text-xs text-gray-600 pt-1">
                        💡 {currentCard.extraData.explanationVi}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* AI Context Challenge Trigger */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateAIChallenge}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Thử thách ngữ cảnh mới bằng AI
                </button>
              </div>

              {/* 4 SM-2 EVALUATION BUTTONS */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-500 text-center">
                  Đánh giá mức độ ghi nhớ (SM-2 Spaced Repetition):
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {/* 1. Again (Quên) */}
                  <button
                    onClick={() => handleSubmitRating('again')}
                    disabled={isSubmitting}
                    className="p-3 rounded-2xl bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-900 text-center transition-all active:scale-95 disabled:opacity-50"
                  >
                    <div className="text-sm font-black">🔴 Quên</div>
                    <div className="text-[10px] text-red-600 font-semibold mt-0.5">&lt; 1 ngày</div>
                  </button>

                  {/* 2. Hard (Khó) */}
                  <button
                    onClick={() => handleSubmitRating('hard')}
                    disabled={isSubmitting}
                    className="p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-900 text-center transition-all active:scale-95 disabled:opacity-50"
                  >
                    <div className="text-sm font-black">🟠 Khó</div>
                    <div className="text-[10px] text-orange-600 font-semibold mt-0.5">+1-2 ngày</div>
                  </button>

                  {/* 3. Good (Tốt) */}
                  <button
                    onClick={() => handleSubmitRating('good')}
                    disabled={isSubmitting || (isAnswerChecked && !isAnswerCorrect)}
                    className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 text-emerald-900 text-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-black">🟢 Tốt</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">+4-6 ngày</div>
                  </button>

                  {/* 4. Easy (Dễ) */}
                  <button
                    onClick={() => handleSubmitRating('easy')}
                    disabled={isSubmitting || (isAnswerChecked && !isAnswerCorrect)}
                    className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-900 text-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="text-sm font-black">🔵 Dễ</div>
                    <div className="text-[10px] text-blue-600 font-semibold mt-0.5">+10-15 ngày</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI CONTEXT CHALLENGE MODAL */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  Thử Thách Ngữ Cảnh Mới Từ AI
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {loadingAiExercise ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">
                    Gemini AI đang tạo ngữ cảnh đời sống mới...
                  </p>
                </div>
              ) : aiExercise ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-600">{aiExercise.prompt}</p>

                  <div className="p-4 bg-purple-50 rounded-2xl space-y-1 border border-purple-100 text-center">
                    <p className="text-lg font-black text-purple-950 font-sans">
                      {aiExercise.contextSentenceZh}
                    </p>
                    {aiExercise.contextPinyin && (
                      <p className="text-xs text-purple-600">{aiExercise.contextPinyin}</p>
                    )}
                    <p className="text-xs text-purple-800/80 italic mt-1">
                      "{aiExercise.contextSentenceVi}"
                    </p>
                  </div>

                  {aiExercise.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {aiExercise.options.map((opt, i) => {
                        const isSelected = aiSelectedOption === opt;
                        const isReal = opt === aiExercise.correctAnswer;
                        let s = 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';
                        if (aiAnswerChecked) {
                          if (isReal) s = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                          else if (isSelected) s = 'bg-red-50 border-red-500 text-red-900 font-bold';
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (aiAnswerChecked) return;
                              setAiSelectedOption(opt);
                              setAiAnswerChecked(true);
                            }}
                            className={`p-2.5 rounded-xl border text-xs text-left transition-all ${s}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {aiAnswerChecked && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-gray-900">💡 Giải thích:</p>
                      <p className="text-gray-600">{aiExercise.explanationVi}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
                    >
                      Đã hiểu
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== 3. SESSION SUMMARY REPORT ====================
  if (viewState === 'summary') {
    const totalReviewed = sessionResults.length;
    const goodOrEasy = sessionResults.filter(
      r => r.rating === 'good' || r.rating === 'easy'
    ).length;
    const againCount = sessionResults.filter(r => r.rating === 'again').length;
    const accuracy = totalReviewed > 0 ? Math.round((goodOrEasy / totalReviewed) * 100) : 100;

    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8 animate-scaleUp">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/20">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Hoàn Thành Phiên Ôn Tập!</h2>
          <p className="text-sm text-gray-500">
            Trí nhớ dài hạn đã được củng cố theo thuật toán lặp lại ngắt quãng SM-2.
          </p>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
            <span className="text-xs font-semibold text-gray-500 block">Đã ôn</span>
            <span className="text-2xl font-black text-gray-900">{totalReviewed} thẻ</span>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
            <span className="text-xs font-semibold text-emerald-600 block">Nhớ tốt</span>
            <span className="text-2xl font-black text-emerald-950">{accuracy}%</span>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
            <span className="text-xs font-semibold text-rose-600 block">Cần ôn lại sớm</span>
            <span className="text-2xl font-black text-rose-950">{againCount} thẻ</span>
          </div>
        </div>

        {/* List of reviewed items */}
        {sessionResults.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Chi tiết các thẻ đã ôn:
            </h3>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
              {sessionResults.map((res, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-sans">{res.item.promptZh}</span>
                    <span className="text-gray-400">({res.item.promptVi})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                        res.rating === 'again'
                          ? 'bg-red-100 text-red-700'
                          : res.rating === 'hard'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {res.rating}
                    </span>
                    <span className="text-gray-500">Sau {res.newInterval} ngày</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={() => {
              setViewState('dashboard');
              loadDashboard();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gray-100 text-gray-800 font-bold text-sm hover:bg-gray-200 transition-all text-center"
          >
            Về Trung Tâm Ôn Tập
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('roadmap')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Xem Lộ Trình Học Thích Ứng</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
