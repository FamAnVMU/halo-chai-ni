import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Volume2,
  Mic,
  MicOff,
  BookOpen,
  BookmarkCheck,
  Headphones,
  PenTool,
  MessageSquare,
  Clock,
  Compass,
  TrendingUp,
  History,
  Layers,
  ChevronRight,
  ShieldCheck,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import { db } from '../db';
import type {
  PlacementSkill,
  PlacementQuestion,
  PlacementResultReport,
  PlacementTestProgress,
  PlacementHistoryItem
} from '../types';

interface PlacementTestViewProps {
  onNavigate?: (tab: any) => void;
}

export const PlacementTestView: React.FC<PlacementTestViewProps> = ({ onNavigate }) => {
  const [viewState, setViewState] = useState<'intro' | 'testing' | 'result' | 'history'>('intro');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTest, setActiveTest] = useState<PlacementTestProgress | null>(null);
  const [historyList, setHistoryList] = useState<PlacementHistoryItem[]>([]);
  const [currentResult, setCurrentResult] = useState<PlacementResultReport | null>(null);

  // Testing interactive state
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [writtenAnswer, setWrittenAnswer] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<{
    isCorrect: boolean;
    score: number;
    explanation: string;
    feedback?: string;
  } | null>(null);

  // Audio / Speech state
  const [audioPlayCount, setAudioPlayCount] = useState<number>(0);
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string>('');

  // Sync state
  const [isSyncingProfile, setIsSyncingProfile] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

  // Initial load
  useEffect(() => {
    checkActiveTestAndHistory();
  }, []);

  const checkActiveTestAndHistory = async () => {
    setLoading(true);
    try {
      const activeRes = await backendClient.getActivePlacementTest();
      if (activeRes.success && activeRes.data) {
        setActiveTest(activeRes.data);
      } else {
        setActiveTest(null);
      }

      const histRes = await backendClient.getPlacementHistory();
      if (histRes.success && histRes.data) {
        setHistoryList(histRes.data);
      }
    } catch (e) {
      console.error('Error fetching placement data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Start new test
  const handleStartTest = async (testType: 'full' | 'quick') => {
    setLoading(true);
    try {
      const res = await backendClient.startPlacementTest(testType);
      if (res.success && res.data) {
        setActiveTest(res.data);
        resetQuestionInputs();
        setViewState('testing');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Resume unfinished test
  const handleResumeTest = () => {
    if (!activeTest) return;
    resetQuestionInputs();
    setViewState('testing');
  };

  // Reset inputs for each question
  const resetQuestionInputs = () => {
    setSelectedOption('');
    setWrittenAnswer('');
    setIsAnswerSubmitted(false);
    setLastAnswerFeedback(null);
    setAudioPlayCount(0);
    setSpeechError('');
  };

  const currentQIndex = activeTest?.assessment.currentQuestionIndex || 0;
  const currentQuestion: PlacementQuestion | undefined = activeTest?.questions[currentQIndex];

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!activeTest || !currentQuestion) return;

    const answer = (currentQuestion.questionType === 'writing_translation' || currentQuestion.questionType === 'dialogue_response')
      ? writtenAnswer.trim()
      : selectedOption.trim();

    if (!answer) return;

    setLoading(true);
    try {
      const res = await backendClient.submitPlacementAnswer({
        testId: activeTest.assessment.id,
        questionId: currentQuestion.id,
        userAnswer: answer,
        durationIncrementSeconds: 15
      });

      if (res.success) {
        setIsAnswerSubmitted(true);
        setLastAnswerFeedback({
          isCorrect: res.data.isCorrect,
          score: res.data.score,
          explanation: res.data.explanation,
          feedback: res.data.feedback
        });

        if (res.data.isCorrect) {
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Move to Next Question or Finish
  const handleNextQuestion = async () => {
    if (!activeTest) return;

    const total = activeTest.questions.length;
    if (currentQIndex + 1 >= total) {
      // Completed all questions! Finish test
      await handleCompleteTest();
    } else {
      // Refresh progress
      const progressRes = await backendClient.getPlacementProgress(activeTest.assessment.id);
      if (progressRes.success && progressRes.data) {
        setActiveTest(progressRes.data);
      }
      resetQuestionInputs();
    }
  };

  // Skip Section
  const handleSkipSection = async () => {
    if (!activeTest || !currentQuestion) return;
    const confirmSkip = window.confirm(`Bạn có chắc muốn bỏ qua phần ${getSkillLabel(currentQuestion.skill)}? Phần này sẽ được ghi nhận là "Chưa có dữ liệu" (không bị tính điểm 0).`);
    if (!confirmSkip) return;

    setLoading(true);
    try {
      const res = await backendClient.skipPlacementSection(activeTest.assessment.id, currentQuestion.skill);
      if (res.success) {
        const progressRes = await backendClient.getPlacementProgress(activeTest.assessment.id);
        if (progressRes.success && progressRes.data) {
          setActiveTest(progressRes.data);
          if (res.nextIndex >= progressRes.data.questions.length) {
            await handleCompleteTest();
          } else {
            resetQuestionInputs();
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Finish & Calculate Final Report
  const handleCompleteTest = async () => {
    if (!activeTest) return;
    setLoading(true);
    try {
      const res = await backendClient.completePlacementTest(activeTest.assessment.id);
      if (res.success && res.data) {
        setCurrentResult(res.data);
        setActiveTest(null);
        setViewState('result');
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (e) {
      console.error('Error completing test:', e);
    } finally {
      setLoading(false);
    }
  };

  // Play Audio for Listening Questions
  const handlePlayAudio = (text?: string) => {
    if (!text) return;
    if (audioPlayCount >= 3) {
      alert('Bạn đã nghe tối đa 3 lần cho câu hỏi này.');
      return;
    }
    audioService.speak(text);
    setAudioPlayCount(prev => prev + 1);
  };

  // Voice Speech Recognition for Communication Questions
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Trình duyệt hoặc thiết bị chưa hỗ trợ nhận diện giọng nói trực tiếp. Bạn có thể gõ chữ.');
      return;
    }

    if (isListeningSpeech) {
      setIsListeningSpeech(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        setSpeechError('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setWrittenAnswer(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListeningSpeech(false);
      };

      recognition.onerror = (event: any) => {
        setSpeechError(`Lỗi nhận diện âm thanh: ${event.error}`);
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognition.start();
    } catch (err: any) {
      setSpeechError(err.message || 'Không thể kích hoạt microphone');
      setIsListeningSpeech(false);
    }
  };

  // Synchronize result to Learner Profile & Trigger Personalized Curriculum
  const handleSyncToProfile = async () => {
    if (!currentResult) return;
    setIsSyncingProfile(true);
    setSyncSuccessMsg('');

    try {
      const res = await backendClient.syncPlacementResult(currentResult.testId);
      if (res.success && res.data) {
        setSyncSuccessMsg(res.data.message);

        // Update Dexie user profile locally so navigation reflects HSK immediately
        const user = await db.users.get('current_user');
        if (user) {
          await db.users.update(user.id, {
            currentHskLevel: res.data.currentHsk as any,
            targetHskLevel: res.data.targetHsk as any
          });
        }

        setCurrentResult(prev => prev ? { ...prev, syncedToProfile: true } : null);

        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
        } catch {}
      }
    } catch (e: any) {
      alert(`Lỗi đồng bộ hồ sơ: ${e.message}`);
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const getSkillLabel = (skill: PlacementSkill): string => {
    switch (skill) {
      case 'vocabulary': return 'Từ vựng';
      case 'grammar': return 'Ngữ pháp';
      case 'reading': return 'Đọc hiểu';
      case 'listening': return 'Nghe hiểu';
      case 'writing': return 'Khả năng viết';
      case 'communication': return 'Giao tiếp & Phản xạ';
      default: return skill;
    }
  };

  const getSkillIcon = (skill: PlacementSkill) => {
    switch (skill) {
      case 'vocabulary': return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'grammar': return <BookmarkCheck className="w-4 h-4 text-blue-500" />;
      case 'reading': return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'listening': return <Headphones className="w-4 h-4 text-amber-500" />;
      case 'writing': return <PenTool className="w-4 h-4 text-purple-500" />;
      case 'communication': return <MessageSquare className="w-4 h-4 text-rose-500" />;
    }
  };

  // =========================================================================
  // VIEW: 1. INTRO & SELECTION SCREEN
  // =========================================================================
  if (viewState === 'intro') {
    return (
      <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-rose-600 text-white p-6 sm:p-8 shadow-xl shadow-primary-700/20">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 opacity-10 pointer-events-none text-[150px] font-chinese font-black">
            测
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Khảo Sát Năng Lực Thông Minh</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Kiểm Tra Trình Độ Tiếng Trung Bằng AI
            </h1>

            <p className="text-sm sm:text-base text-rose-100/90 leading-relaxed mb-6">
              Hệ thống khảo thí thích ứng (Computer Adaptive Testing) đánh giá năng lực thực tế qua 6 kỹ năng độc lập. AI sẽ nhận diện điểm mạnh, điểm yếu và các lỗ hổng kiến thức để tự động biên soạn lộ trình học tối ưu dành riêng cho bạn.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {activeTest && (
                <button
                  onClick={handleResumeTest}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm shadow-md hover:bg-amber-300 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Tiếp tục bài thi dở dang (Câu {activeTest.assessment.currentQuestionIndex + 1}/{activeTest.totalQuestions})</span>
                </button>
              )}

              {historyList.length > 0 && (
                <button
                  onClick={() => setViewState('history')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm backdrop-blur-md border border-white/20 transition-all"
                >
                  <History className="w-4 h-4" />
                  <span>Xem lịch sử ({historyList.length} lần thi)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 6 Core Skills Overview */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-500" />
            <span>6 Kỹ Năng Được Đánh Giá Độc Lập</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'vocab', label: '1. Từ vựng', desc: 'Vốn từ, phân biệt từ gần nghĩa, ngữ cảnh sử dụng', icon: <BookOpen className="w-4 h-4 text-emerald-500" /> },
              { id: 'grammar', label: '2. Ngữ pháp', desc: 'Trật tự từ, câu chữ 把/被, trợ từ 的/得/地', icon: <BookmarkCheck className="w-4 h-4 text-blue-500" /> },
              { id: 'reading', label: '3. Đọc hiểu', desc: 'Đoạn văn ngắn, thông báo, nắm bắt ý chính & chi tiết', icon: <Layers className="w-4 h-4 text-indigo-500" /> },
              { id: 'listening', label: '4. Nghe hiểu', desc: 'Âm thanh tự nhiên, giờ giấc, hội thoại thực tế', icon: <Headphones className="w-4 h-4 text-amber-500" /> },
              { id: 'writing', label: '5. Khả năng viết', desc: 'Dịch thuật Việt - Trung, đặt câu theo cấu trúc', icon: <PenTool className="w-4 h-4 text-purple-500" /> },
              { id: 'communication', label: '6. Giao tiếp', desc: 'Phản xạ đóng vai, tình huống nhà hàng, hỏi đường', icon: <MessageSquare className="w-4 h-4 text-rose-500" /> },
            ].map(skill => (
              <div key={skill.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-700 dark:text-slate-200 mb-1">
                  {skill.icon}
                  <span>{skill.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {skill.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Linh hoạt theo điều kiện của bạn: </span>
              Nếu bạn không có tai nghe hoặc không tiện bật micro, bạn có thể bấm <em>"Bỏ qua kỹ năng này"</em> khi làm bài. Kỹ năng chưa kiểm tra sẽ được ghi nhận là <strong>"Chưa có dữ liệu"</strong> chứ không bị tính điểm 0!
            </div>
          </div>
        </div>

        {/* Test Type Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Test */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-primary-500/40 hover:border-primary-500 shadow-md flex flex-col justify-between transition-all relative overflow-hidden group">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold text-[10px]">
              Khuyến nghị
            </div>

            <div>
              <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 flex items-center justify-center font-bold text-lg mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                Kiểm Tra Toàn Diện (Full Test)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Đánh giá trọn vẹn cả 6 kỹ năng (Từ vựng, Ngữ pháp, Đọc, Nghe, Viết, Giao tiếp). Thích hợp nhất cho lần đầu kiểm tra để xác định xuất phát điểm chuẩn xác.
              </p>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thời lượng dự kiến: <strong>15 - 20 phút</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Số lượng câu hỏi: <strong>18 câu</strong> thích ứng</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Độ tin cậy: <strong>Rất cao (Full 6 Skills)</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartTest('full')}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-500 hover:from-primary-700 hover:to-rose-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Bắt Đầu Kiểm Tra Toàn Diện</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Test */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-lg mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                Kiểm Tra Nhanh (Quick Test)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Chỉ tập trung vào 3 kỹ năng cốt lõi: <strong>Từ vựng, Ngữ pháp và Đọc hiểu</strong>. Dành cho khi bạn đang ở nơi ồn ào hoặc cần xác định cấp độ cấp tốc.
              </p>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thời lượng dự kiến: <strong>7 - 10 phút</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Số lượng câu hỏi: <strong>9 câu</strong> thích ứng</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Độ tin cậy: <strong>Tương đối (Cốt lõi)</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartTest('quick')}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Làm Bài Kiểm Tra Rút Gọn</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 2. TESTING INTERACTIVE SCREEN (CAT Adaptive Engine)
  // =========================================================================
  if (viewState === 'testing' && activeTest && currentQuestion) {
    const progressPercent = Math.round((currentQIndex / activeTest.totalQuestions) * 100);

    return (
      <div className="space-y-5 pb-20 md:pb-8 max-w-3xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              {getSkillIcon(currentQuestion.skill)}
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Phần: {getSkillLabel(currentQuestion.skill)}
              </span>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Câu {currentQIndex + 1}/{activeTest.totalQuestions}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Mức độ HSK {currentQuestion.hskLevel}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipSection}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:border-rose-300 transition-colors"
            >
              Bỏ qua phần này
            </button>
            <button
              onClick={() => setViewState('intro')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Lưu & Thoát
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-600 to-rose-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md">
          {/* Reading Passage (if present) */}
          {currentQuestion.passage && (
            <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 block mb-1">
                ĐOẠN VĂN ĐỌC HIỂU:
              </span>
              <p className="text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-100 font-chinese">
                {currentQuestion.passage}
              </p>
            </div>
          )}

          {/* Audio Player for Listening (Audio text is NOT shown in text) */}
          {currentQuestion.audioText && (
            <div className="mb-6 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Bấm để nghe đoạn âm thanh tiếng Trung
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Lần nghe: <strong>{audioPlayCount}/3 lần</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handlePlayAudio(currentQuestion.audioText)}
                disabled={audioPlayCount >= 3}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                  audioPlayCount >= 3
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{audioPlayCount === 0 ? 'Phát âm thanh' : 'Nghe lại'}</span>
              </button>
            </div>
          )}

          {/* Prompt */}
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-6">
            {currentQuestion.prompt}
          </h3>

          {/* Multiple Choice Options */}
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                let optionClass = 'border-slate-200 dark:border-slate-800 hover:border-primary-400 bg-white dark:bg-slate-850';

                if (isAnswerSubmitted) {
                  if (opt === currentQuestion.correctAnswer) {
                    optionClass = 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                  } else if (isSelected && opt !== currentQuestion.correctAnswer) {
                    optionClass = 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100';
                  }
                } else if (isSelected) {
                  optionClass = 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/60 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 font-bold';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between text-sm sm:text-base ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-chinese leading-relaxed">{opt}</span>
                    </div>

                    {isAnswerSubmitted && opt === currentQuestion.correctAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && opt !== currentQuestion.correctAnswer && (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Open-ended Writing or Communication Input */}
          {(currentQuestion.questionType === 'writing_translation' || currentQuestion.questionType === 'dialogue_response') && (
            <div className="space-y-4 mb-6">
              <div className="relative">
                <textarea
                  rows={4}
                  disabled={isAnswerSubmitted}
                  value={writtenAnswer}
                  onChange={e => setWrittenAnswer(e.target.value)}
                  placeholder="Gõ câu trả lời bằng chữ Hán hoặc Pinyin tại đây..."
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-chinese text-base focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />

                {currentQuestion.questionType === 'dialogue_response' && !isAnswerSubmitted && (
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`absolute right-3 bottom-3 p-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
                      isListeningSpeech
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 hover:bg-slate-100'
                    }`}
                  >
                    {isListeningSpeech ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListeningSpeech ? 'Đang nghe...' : 'Nói micro'}</span>
                  </button>
                )}
              </div>

              {speechError && (
                <p className="text-xs text-rose-500 font-medium">{speechError}</p>
              )}

              {currentQuestion.criteria?.focusPoints && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Tiêu chí chấm của AI: </span>
                  {currentQuestion.criteria.focusPoints.join(' • ')}
                </div>
              )}
            </div>
          )}

          {/* Immediate Answer Feedback & Explanation */}
          {isAnswerSubmitted && lastAnswerFeedback && (
            <div className={`p-4 sm:p-5 rounded-2xl mb-6 border animate-fadeIn ${
              lastAnswerFeedback.isCorrect 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' 
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {lastAnswerFeedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-800 dark:text-emerald-200">
                      Chính xác! (+{lastAnswerFeedback.score} điểm)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span className="text-rose-800 dark:text-rose-200">
                      Chưa hoàn toàn chuẩn xác ({lastAnswerFeedback.score}/100 điểm)
                    </span>
                  </>
                )}
              </div>

              {lastAnswerFeedback.feedback && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mb-2">
                  {lastAnswerFeedback.feedback}
                </p>
              )}

              <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-800 dark:text-slate-200">Giải thích: </span>
                {lastAnswerFeedback.explanation}
              </div>
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={loading || (currentQuestion.options ? !selectedOption : !writtenAnswer.trim())}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-500 hover:from-primary-700 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Xác Nhận Câu Trả Lời</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                <span>{currentQIndex + 1 >= activeTest.totalQuestions ? 'Xem Báo Cáo Kết Quả' : 'Câu Tiếp Theo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 3. RESULTS & REPORT SCREEN
  // =========================================================================
  if (viewState === 'result' && currentResult) {
    return (
      <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
        {/* Score & Estimated HSK Card */}
        <div className="rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-rose-500 text-white p-6 sm:p-8 shadow-xl shadow-primary-700/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Kết Quả Đánh Giá Năng Lực Đầu Vào</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">
                Trình Độ Ước Tính: {currentResult.estimatedHskLabel}
              </h2>

              <p className="text-xs sm:text-sm text-rose-100/90 max-w-lg mb-4">
                Điểm số tổng quát: <strong>{currentResult.overallScore}/100</strong> • Độ tin cậy: <strong>{currentResult.confidenceLevel === 'high' ? 'Cao' : 'Khá'}</strong>.
              </p>

              <div className="inline-block text-[11px] text-rose-200/80 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                * Lưu ý: Cấp độ HSK ở đây là thang đo tham chiếu nội bộ trong ứng dụng, phục vụ tối ưu hóa lộ trình cá nhân hóa.
              </div>
            </div>

            {/* Circular Gauge / Stat Box */}
            <div className="w-32 h-32 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-4 text-center shrink-0">
              <span className="text-xs font-semibold text-rose-100 uppercase tracking-wider">HSK Điểm Mốc</span>
              <span className="text-4xl font-black font-chinese tracking-tight text-white mt-0.5">
                {currentResult.estimatedHsk}
              </span>
              <span className="text-[11px] text-amber-300 font-bold mt-1">
                {currentResult.overallScore} / 100 Điểm
              </span>
            </div>
          </div>
        </div>

        {/* Sync to Profile CTA Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-primary-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                Áp Dụng Kết Quả Vào Lộ Trình Học Cá Nhân Hóa
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                AI sẽ cập nhật hồ sơ năng lực HSK {Math.round(currentResult.estimatedHsk)}, nạp các điểm yếu vào sổ tay lỗi sai và tự động biên soạn bài học tiếp theo.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncToProfile}
            disabled={isSyncingProfile || currentResult.syncedToProfile}
            className={`px-5 py-3 rounded-2xl font-bold text-sm shrink-0 shadow-md transition-all flex items-center gap-2 ${
              currentResult.syncedToProfile
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
            }`}
          >
            {currentResult.syncedToProfile ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã Áp Dụng Thành Công</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isSyncingProfile ? 'Đang đồng bộ...' : 'Sử Dụng Kết Quả Để Tạo Lộ Trình'}</span>
              </>
            )}
          </button>
        </div>

        {syncSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* 6 Skills Bar Chart & Breakdown */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <span>Phân Tích Chi Tiết 6 Kỹ Năng</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(currentResult.skillScores).map(item => {
              const isTested = item.status === 'tested';
              return (
                <div key={item.skill} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
                        {getSkillIcon(item.skill)}
                        <span>{item.label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        !isTested 
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : item.score! >= 70
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {isTested ? `${item.score}/100 (${item.qualitative})` : 'Chưa có dữ liệu'}
                      </span>
                    </div>

                    {/* Score Bar */}
                    {isTested && (
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-primary-500 h-full rounded-full"
                          style={{ width: `${item.score || 0}%` }}
                        />
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.feedback}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm">
            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Điểm Mạnh Của Bạn</span>
            </h4>
            <ul className="space-y-2">
              {currentResult.strengths.map((s, idx) => (
                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/40 shadow-sm">
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Lỗ Hổng Cần Củng Cố</span>
            </h4>
            <ul className="space-y-2">
              {currentResult.weaknesses.map((w, idx) => (
                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Knowledge Breakdown */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-500" />
            <span>Phân Phối Kiến Thức Theo Cấp Độ</span>
          </h3>

          <div className="space-y-4">
            {/* Mastered */}
            {currentResult.knowledgeBreakdown.mastered.length > 0 && (
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-2">
                  ✓ ĐÃ NẮM VỮNG ({currentResult.knowledgeBreakdown.mastered.length} nội dung):
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentResult.knowledgeBreakdown.mastered.map((k, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                      {k.item} <span className="opacity-70 text-[10px]">(HSK {k.hskLevel})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Weak Gaps */}
            {currentResult.knowledgeBreakdown.weakGaps.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block mb-2">
                  ⚠ LỖ HỔNG CẦN BÙ ĐẮP ({currentResult.knowledgeBreakdown.weakGaps.length} nội dung):
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentResult.knowledgeBreakdown.weakGaps.map((k, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium">
                      {k.item} <span className="opacity-70 text-[10px]">(HSK {k.hskLevel})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => setViewState('intro')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Về Màn Hình Chính</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('roadmap')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <span>Xem Lộ Trình HSK Đã Cập Nhật</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 4. TEST HISTORY & COMPARISON SCREEN
  // =========================================================================
  if (viewState === 'history') {
    return (
      <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Lịch Sử Khảo Sát & So Sánh Tiến Bộ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Theo dõi sự phát triển trình độ qua từng lần kiểm tra theo thời gian
            </p>
          </div>

          <button
            onClick={() => setViewState('intro')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-colors"
          >
            Quay lại
          </button>
        </div>

        <div className="space-y-3">
          {historyList.map((item, idx) => (
            <div
              key={item.testId}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 flex items-center justify-center font-bold text-lg">
                  #{historyList.length - idx}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Mốc HSK {item.estimatedHsk}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.testType === 'full' ? 'Toàn diện (6 kỹ năng)' : 'Rút gọn (3 kỹ năng)'}
                    </span>
                    {item.syncedToProfile && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã áp dụng lộ trình
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ngày thi: {new Date(item.startedAt).toLocaleString('vi-VN')} • Điểm số: {item.overallScore}/100 • Thời gian: {Math.round(item.durationSeconds / 60)} phút
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setLoading(true);
                  const res = await backendClient.getPlacementResult(item.testId);
                  if (res.success && res.data) {
                    setCurrentResult(res.data);
                    setViewState('result');
                  }
                  setLoading(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 self-end sm:self-center"
              >
                <span>Xem Báo Cáo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
