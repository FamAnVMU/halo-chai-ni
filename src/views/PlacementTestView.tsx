import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
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
  AlertCircle,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import { db } from '../db';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { BottomSheet } from '../components/ui/BottomSheet';
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
  const [viewState, setViewState] = useState<'intro' | 'survey' | 'testing' | 'result' | 'history'>('intro');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTest, setActiveTest] = useState<PlacementTestProgress | null>(null);
  const [historyList, setHistoryList] = useState<PlacementHistoryItem[]>([]);
  const [currentResult, setCurrentResult] = useState<PlacementResultReport | null>(null);

  // Step 1: Onboarding Survey State
  const [targetHsk, setTargetHsk] = useState<number>(3);
  const [learningReason, setLearningReason] = useState<string>('giao_tiep');
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [learningStyle, setLearningStyle] = useState<string>('ai_interactive');
  const [pendingTestType, setPendingTestType] = useState<'full' | 'quick'>('full');

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

  // Launch Survey before test
  const handleOpenSurvey = (type: 'full' | 'quick') => {
    setPendingTestType(type);
    setViewState('survey');
  };

  // Start new test after Survey
  const handleConfirmSurveyAndStart = async () => {
    setLoading(true);
    try {
      // Save user preferences to local Dexie profile
      const user = await db.users.get('current_user');
      if (user) {
        await db.users.update(user.id, {
          targetHskLevel: targetHsk as any,
          dailyGoalMinutes: dailyMinutes,
        });
      }

      const res = await backendClient.startPlacementTest(pendingTestType);
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
      case 'vocabulary': return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'grammar': return <BookmarkCheck className="w-4 h-4 text-blue-600" />;
      case 'reading': return <Layers className="w-4 h-4 text-indigo-600" />;
      case 'listening': return <Headphones className="w-4 h-4 text-amber-600" />;
      case 'writing': return <PenTool className="w-4 h-4 text-purple-600" />;
      case 'communication': return <MessageSquare className="w-4 h-4 text-rose-600" />;
    }
  };

  // =========================================================================
  // VIEW: 1. INTRO & SELECTION SCREEN
  // =========================================================================
  if (viewState === 'intro') {
    return (
      <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-16">
        {/* Header Hero */}
        <Card variant="highlight" className="p-5 sm:p-7 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none text-[150px] font-chinese font-black text-[#355A26] dark:text-[#A3D635]">
            测
          </div>

          <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="lime">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Khảo Sát Năng Lực Thông Minh
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#263326] dark:text-[#EAF5D5]">
              Đánh Giá Trình Độ Tiếng Trung Đầu Vào
            </h1>

            <p className="text-xs sm:text-sm text-[#647560] dark:text-[#889B84] leading-relaxed">
              Hệ thống khảo thí thích ứng (Computer Adaptive Testing) đánh giá năng lực thực tế qua 6 kỹ năng độc lập. AI sẽ nhận diện điểm mạnh, điểm yếu và các lỗ hổng kiến thức để tự động biên soạn lộ trình học tối ưu dành riêng cho bạn.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {activeTest && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleResumeTest}
                >
                  <Play className="w-4 h-4 fill-current mr-1.5" />
                  <span>Tiếp tục bài thi dở dang (Câu {activeTest.assessment.currentQuestionIndex + 1}/{activeTest.totalQuestions})</span>
                </Button>
              )}

              {historyList.length > 0 && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setViewState('history')}
                >
                  <History className="w-4 h-4 mr-1.5" />
                  <span>Xem lịch sử ({historyList.length} lần thi)</span>
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 6 Core Skills Overview */}
        <Card variant="default" className="p-5">
          <h2 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#355A26] dark:text-[#C2E58C]" />
            <span>6 Kỹ Năng Được Đánh Giá Độc Lập</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'vocab', label: '1. Từ vựng', desc: 'Vốn từ, từ gần nghĩa, ngữ cảnh sử dụng', icon: <BookOpen className="w-4 h-4 text-emerald-600" /> },
              { id: 'grammar', label: '2. Ngữ pháp', desc: 'Trật tự câu, câu chữ 把/被, trợ từ 的/得/地', icon: <BookmarkCheck className="w-4 h-4 text-blue-600" /> },
              { id: 'reading', label: '3. Đọc hiểu', desc: 'Đoạn văn ngắn, thông báo, ý chính & chi tiết', icon: <Layers className="w-4 h-4 text-indigo-600" /> },
              { id: 'listening', label: '4. Nghe hiểu', desc: 'Âm thanh chuẩn, giờ giấc, hội thoại thực tế', icon: <Headphones className="w-4 h-4 text-amber-600" /> },
              { id: 'writing', label: '5. Khả năng viết', desc: 'Dịch thuật Việt - Trung, đặt câu theo cấu trúc', icon: <PenTool className="w-4 h-4 text-purple-600" /> },
              { id: 'communication', label: '6. Giao tiếp', desc: 'Phản xạ đóng vai, giao tiếp voice qua AI', icon: <MessageSquare className="w-4 h-4 text-rose-600" /> },
            ].map(skill => (
              <div key={skill.id} className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] flex flex-col">
                <div className="flex items-center gap-2 font-bold text-xs text-[#263326] dark:text-[#EAF5D5] mb-1">
                  {skill.icon}
                  <span>{skill.label}</span>
                </div>
                <p className="text-[11px] text-[#647560] dark:text-[#889B84] leading-tight">
                  {skill.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Linh hoạt theo hoàn cảnh: </span>
              Nếu bạn không có tai nghe hoặc không tiện bật micro, bạn có thể bấm <em>"Bỏ qua kỹ năng này"</em> khi làm bài. Kỹ năng chưa kiểm tra sẽ được ghi nhận là <strong>"Chưa có dữ liệu"</strong> chứ không bị tính điểm 0!
            </div>
          </div>
        </Card>

        {/* Test Type Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Full Test */}
          <Card
            variant="default"
            className="p-5 sm:p-6 flex flex-col justify-between border-2 border-[#A3D635] relative overflow-hidden"
          >
            <div className="absolute top-3.5 right-3.5">
              <Badge variant="lime" size="sm">Khuyên dùng</Badge>
            </div>

            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center font-bold text-lg mb-1">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Kiểm Tra Toàn Diện (Full Test)
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84] mb-3">
                Đánh giá trọn vẹn cả 6 kỹ năng (Từ vựng, Ngữ pháp, Đọc, Nghe, Viết, Giao tiếp). Thích hợp nhất cho lần đầu kiểm tra để định hình xuất phát điểm chuẩn xác.
              </p>

              <div className="space-y-1.5 text-xs text-[#647560] dark:text-[#889B84] mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#355A26] dark:text-[#C2E58C]" />
                  <span>Thời lượng dự kiến: <strong>15 - 20 phút</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#355A26] dark:text-[#C2E58C]" />
                  <span>Số lượng câu hỏi: <strong>18 câu</strong> thích ứng</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Độ tin cậy: <strong>Rất cao (Full 6 kỹ năng)</strong></span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => handleOpenSurvey('full')}
              disabled={loading}
            >
              <span>Bắt Đầu Khảo Sát & Kiểm Tra</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Card>

          {/* Quick Test */}
          <Card
            variant="default"
            className="p-5 sm:p-6 flex flex-col justify-between"
          >
            <div className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] flex items-center justify-center font-bold text-lg mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Kiểm Tra Nhanh (Quick Test)
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84] mb-3">
                Chỉ tập trung vào 3 kỹ năng cốt lõi: <strong>Từ vựng, Ngữ pháp và Đọc hiểu</strong>. Dành cho khi bạn cần xác định cấp độ cấp tốc trong thời gian ngắn.
              </p>

              <div className="space-y-1.5 text-xs text-[#647560] dark:text-[#889B84] mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#647560]" />
                  <span>Thời lượng dự kiến: <strong>7 - 10 phút</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#647560]" />
                  <span>Số lượng câu hỏi: <strong>9 câu</strong> thích ứng</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Độ tin cậy: <strong>Tương đối (Cốt lõi)</strong></span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => handleOpenSurvey('quick')}
              disabled={loading}
            >
              <span>Làm Bài Kiểm Tra Rút Gọn</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 1.5. STEP 1 ONBOARDING SURVEY MODAL / SCREEN
  // =========================================================================
  if (viewState === 'survey') {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto pb-16">
        <div className="flex items-center justify-between">
          <Badge variant="lime">Bước 1/5: Khảo sát ban đầu</Badge>
          <button
            onClick={() => setViewState('intro')}
            className="text-xs font-semibold text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5]"
          >
            Quay lại
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-[#263326] dark:text-[#EAF5D5]">
            Mục Tiêu & Định Hướng Học Tập
          </h2>
          <p className="text-xs text-[#647560] dark:text-[#889B84]">
            Giúp AI hiểu rõ kỳ vọng của bạn để đề xuất lộ trình và điều chỉnh độ khó bài kiểm tra thích ứng.
          </p>
        </div>

        {/* Survey Questions */}
        <div className="flex flex-col gap-4">
          {/* Question 1: Target HSK */}
          <Card className="p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
              1. Mục tiêu HSK bạn hướng tới:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setTargetHsk(lvl)}
                  className={`touch-target h-11 rounded-xl text-xs font-bold border transition-all ${
                    targetHsk === lvl
                      ? 'bg-[#A3D635] text-[#263326] border-[#86B825] shadow-xs'
                      : 'bg-white dark:bg-[#1A2418] border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5]'
                  }`}
                >
                  HSK {lvl}
                </button>
              ))}
            </div>
          </Card>

          {/* Question 2: Learning Reason */}
          <Card className="p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
              2. Lý do chính bạn học tiếng Trung:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'giao_tiep', label: 'Giao tiếp hàng ngày / Du lịch' },
                { id: 'cong_viec', label: 'Công việc / Kinh doanh' },
                { id: 'du_hoc', label: 'Du học / Thi chứng chỉ HSK' },
                { id: 'so_thich', label: 'Sở thích / Xem phim, nhạc hoa' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setLearningReason(r.id)}
                  className={`touch-target p-3 rounded-2xl text-left border transition-all ${
                    learningReason === r.id
                      ? 'bg-[#EAF5D5] text-[#355A26] border-[#A3D635] font-bold dark:bg-[#202D1D] dark:text-[#C2E58C]'
                      : 'bg-white dark:bg-[#1A2418] border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Question 3: Daily Minutes */}
          <Card className="p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
              3. Thời gian bạn có thể dành mỗi ngày:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setDailyMinutes(m)}
                  className={`touch-target h-11 rounded-xl text-xs font-bold border transition-all ${
                    dailyMinutes === m
                      ? 'bg-[#A3D635] text-[#263326] border-[#86B825] shadow-xs'
                      : 'bg-white dark:bg-[#1A2418] border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5]'
                  }`}
                >
                  {m} phút
                </button>
              ))}
            </div>
          </Card>

          {/* Question 4: Learning Style */}
          <Card className="p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[#355A26] dark:text-[#C2E58C]">
              4. Phong cách học bạn yêu thích:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'ai_interactive', label: 'Tương tác & Hội thoại với AI Tutor' },
                { id: 'flashcard_srs', label: 'Lặp lại ngắt quãng (Flashcard SRS)' },
                { id: 'grammar_rules', label: 'Nắm vững quy tắc ngữ pháp & cấu trúc' },
                { id: 'shadowing_audio', label: 'Nghe nói phản xạ & Shadowing nhại' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setLearningStyle(s.id)}
                  className={`touch-target p-3 rounded-2xl text-left border transition-all ${
                    learningStyle === s.id
                      ? 'bg-[#EAF5D5] text-[#355A26] border-[#A3D635] font-bold dark:bg-[#202D1D] dark:text-[#C2E58C]'
                      : 'bg-white dark:bg-[#1A2418] border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onClick={handleConfirmSurveyAndStart}
        >
          <span>Lưu Mục Tiêu & Bắt Đầu Làm Bài Thích Ứng</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 2. TESTING INTERACTIVE SCREEN (CAT Adaptive Engine)
  // =========================================================================
  if (viewState === 'testing' && activeTest && currentQuestion) {
    const progressPercent = Math.round((currentQIndex / activeTest.totalQuestions) * 100);

    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-16">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#EAF5D5] dark:bg-[#202D1D] text-[#355A26] dark:text-[#C2E58C]">
              {getSkillIcon(currentQuestion.skill)}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#355A26] dark:text-[#C2E58C]">
                Phần: {getSkillLabel(currentQuestion.skill)}
              </span>
              <h2 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2">
                <span>Câu {currentQIndex + 1}/{activeTest.totalQuestions}</span>
                <Badge variant="neutral" size="sm">
                  HSK {currentQuestion.hskLevel}
                </Badge>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipSection}
              className="touch-target text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#647560] hover:text-rose-500 hover:border-rose-300 transition-colors"
            >
              Bỏ qua phần này
            </button>
            <button
              onClick={() => setViewState('intro')}
              className="touch-target text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] text-[#263326] dark:text-[#EAF5D5] hover:bg-[#F6FAF2] transition-colors"
            >
              Lưu & Thoát
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={progressPercent} height="h-2" />

        {/* Question Card */}
        <Card variant="default" className="p-5 sm:p-7 shadow-sm">
          {/* Reading Passage (if present) */}
          {currentQuestion.passage && (
            <div className="mb-5 p-4 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C]">
              <span className="text-[11px] font-bold text-[#355A26] dark:text-[#C2E58C] block mb-1">
                ĐOẠN VĂN ĐỌC HIỂU:
              </span>
              <p className="text-base sm:text-lg leading-relaxed text-[#263326] dark:text-[#EAF5D5] font-chinese">
                {currentQuestion.passage}
              </p>
            </div>
          )}

          {/* Audio Player for Listening */}
          {currentQuestion.audioText && (
            <div className="mb-5 p-4 rounded-2xl bg-[#EAF5D5] dark:bg-[#202D1D] border border-[#D7EDB5] dark:border-[#355A26] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#263326] dark:text-[#EAF5D5]">
                    Nghe đoạn âm thanh tiếng Trung
                  </span>
                  <p className="text-[11px] text-[#647560] dark:text-[#889B84]">
                    Lần nghe: <strong>{audioPlayCount}/3 lần</strong>
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => handlePlayAudio(currentQuestion.audioText)}
                disabled={audioPlayCount >= 3}
              >
                <Volume2 className="w-4 h-4 mr-1" />
                <span>{audioPlayCount === 0 ? 'Phát âm' : 'Nghe lại'}</span>
              </Button>
            </div>
          )}

          {/* Prompt */}
          <h3 className="text-base sm:text-lg font-bold text-[#263326] dark:text-[#EAF5D5] leading-snug mb-5">
            {currentQuestion.prompt}
          </h3>

          {/* Multiple Choice Options */}
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div className="flex flex-col gap-2.5 mb-5">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                let optionClass = 'border-[#E3EBDD] dark:border-[#2D3A2C] hover:border-[#A3D635] bg-white dark:bg-[#1A2418]';

                if (isAnswerSubmitted) {
                  if (opt === currentQuestion.correctAnswer) {
                    optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
                  } else if (isSelected && opt !== currentQuestion.correctAnswer) {
                    optionClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100';
                  }
                } else if (isSelected) {
                  optionClass = 'border-[#A3D635] ring-2 ring-[#A3D635]/30 bg-[#EAF5D5]/60 dark:bg-[#202D1D] text-[#355A26] dark:text-[#C2E58C] font-bold';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => setSelectedOption(opt)}
                    className={`touch-target w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between text-sm sm:text-base ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-[#A3D635] text-[#263326]' : 'bg-[#F6FAF2] dark:bg-[#151D14] text-[#647560] dark:text-[#889B84]'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-chinese leading-relaxed">{opt}</span>
                    </div>

                    {isAnswerSubmitted && opt === currentQuestion.correctAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
            <div className="flex flex-col gap-3 mb-5">
              <div className="relative">
                <textarea
                  rows={4}
                  disabled={isAnswerSubmitted}
                  value={writtenAnswer}
                  onChange={e => setWrittenAnswer(e.target.value)}
                  placeholder="Gõ câu trả lời bằng chữ Hán hoặc Pinyin tại đây..."
                  className="w-full p-4 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] bg-[#F6FAF2] dark:bg-[#151D14] text-[#263326] dark:text-[#EAF5D5] font-chinese text-base focus:ring-2 focus:ring-[#A3D635]/40 outline-none transition-all placeholder:text-[#889B84]"
                />

                {currentQuestion.questionType === 'dialogue_response' && !isAnswerSubmitted && (
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`touch-target absolute right-3 bottom-3 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs ${
                      isListeningSpeech
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white dark:bg-[#1A2418] text-[#355A26] dark:text-[#C2E58C] border border-[#E3EBDD]'
                    }`}
                  >
                    {isListeningSpeech ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListeningSpeech ? 'Đang nghe...' : 'Nói mic'}</span>
                  </button>
                )}
              </div>

              {speechError && (
                <p className="text-xs text-rose-500 font-medium">{speechError}</p>
              )}

              {currentQuestion.criteria?.focusPoints && (
                <div className="p-3 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] text-xs text-[#647560] dark:text-[#889B84]">
                  <span className="font-bold text-[#263326] dark:text-[#EAF5D5]">Tiêu chí chấm của AI: </span>
                  {currentQuestion.criteria.focusPoints.join(' • ')}
                </div>
              )}
            </div>
          )}

          {/* Immediate Answer Feedback & Explanation */}
          {isAnswerSubmitted && lastAnswerFeedback && (
            <div className={`p-4 rounded-2xl mb-5 border ${
              lastAnswerFeedback.isCorrect 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {lastAnswerFeedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-800 dark:text-emerald-200">
                      Chính xác! (+{lastAnswerFeedback.score} điểm)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span className="text-rose-800 dark:text-rose-200">
                      Chưa hoàn toàn chuẩn xác ({lastAnswerFeedback.score}/100 điểm)
                    </span>
                  </>
                )}
              </div>

              {lastAnswerFeedback.feedback && (
                <p className="text-xs text-[#263326] dark:text-[#EAF5D5] font-medium mb-1.5">
                  {lastAnswerFeedback.feedback}
                </p>
              )}

              <div className="text-xs text-[#647560] dark:text-[#889B84] pt-1.5 border-t border-black/5 dark:border-white/5">
                <span className="font-bold text-[#263326] dark:text-[#EAF5D5]">Giải thích: </span>
                {lastAnswerFeedback.explanation}
              </div>
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3EBDD] dark:border-[#2D3A2C]">
            {!isAnswerSubmitted ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmitAnswer}
                disabled={loading || (currentQuestion.options ? !selectedOption : !writtenAnswer.trim())}
              >
                <span>Xác Nhận Câu Trả Lời</span>
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleNextQuestion}
              >
                <span>{currentQIndex + 1 >= activeTest.totalQuestions ? 'Xem Báo Cáo Kết Quả' : 'Câu Tiếp Theo'}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 3. RESULTS & REPORT SCREEN
  // =========================================================================
  if (viewState === 'result' && currentResult) {
    return (
      <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-16">
        {/* Score & Estimated HSK Card */}
        <Card variant="highlight" className="p-5 sm:p-7 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="lime">
                  <Award className="w-3.5 h-3.5 mr-1" />
                  Kết Quả Đánh Giá Năng Lực Đầu Vào
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#263326] dark:text-[#EAF5D5]">
                Trình Độ Ước Tính: {currentResult.estimatedHskLabel}
              </h2>

              <p className="text-xs sm:text-sm text-[#647560] dark:text-[#889B84] max-w-lg">
                Điểm số tổng quát: <strong>{currentResult.overallScore}/100</strong> • Độ tin cậy: <strong>{currentResult.confidenceLevel === 'high' ? 'Cao' : 'Khá'}</strong>.
              </p>

              <div className="text-[11px] text-[#647560] dark:text-[#889B84] bg-white/60 dark:bg-[#1A2418]/60 px-3 py-1.5 rounded-xl border border-[#D7EDB5] dark:border-[#355A26] inline-block">
                * Thang đo HSK tham chiếu nội bộ giúp AI tối ưu bài học cá nhân hóa cho bạn.
              </div>
            </div>

            {/* Stat Circle Box */}
            <div className="w-32 h-32 rounded-3xl bg-white dark:bg-[#1A2418] border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-sm flex flex-col items-center justify-center p-3 text-center shrink-0">
              <span className="text-[11px] font-semibold text-[#647560] dark:text-[#889B84] uppercase tracking-wider">HSK Điểm Mốc</span>
              <span className="text-3xl font-black font-chinese tracking-tight text-[#355A26] dark:text-[#A3D635] mt-0.5">
                {currentResult.estimatedHsk}
              </span>
              <span className="text-[11px] text-[#263326] dark:text-[#EAF5D5] font-bold mt-0.5">
                {currentResult.overallScore} / 100 Điểm
              </span>
            </div>
          </div>
        </Card>

        {/* Sync to Profile CTA Banner */}
        <Card variant="default" className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-[#A3D635]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Áp Dụng Kết Quả Vào Lộ Trình Học Cá Nhân Hóa
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84]">
                AI sẽ cập nhật hồ sơ năng lực HSK {Math.round(currentResult.estimatedHsk)}, nạp các điểm yếu vào sổ tay lỗi sai và tự động biên soạn lộ trình tiếp theo.
              </p>
            </div>
          </div>

          <Button
            variant={currentResult.syncedToProfile ? 'secondary' : 'primary'}
            size="lg"
            className="w-full sm:w-auto shrink-0"
            onClick={handleSyncToProfile}
            disabled={isSyncingProfile || currentResult.syncedToProfile}
          >
            {currentResult.syncedToProfile ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Đã Áp Dụng Lộ Trình</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                <span>{isSyncingProfile ? 'Đang đồng bộ...' : 'Áp Dụng Vào Hệ Thống'}</span>
              </>
            )}
          </Button>
        </Card>

        {syncSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* 6 Skills Bar Chart & Breakdown */}
        <Card variant="default" className="p-5 sm:p-6">
          <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#355A26] dark:text-[#C2E58C]" />
            <span>Phân Tích Chi Tiết 6 Kỹ Năng</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Object.values(currentResult.skillScores).map(item => {
              const isTested = item.status === 'tested';
              return (
                <div key={item.skill} className="p-3.5 rounded-2xl bg-[#F6FAF2] dark:bg-[#151D14] border border-[#E3EBDD] dark:border-[#2D3A2C] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-[#263326] dark:text-[#EAF5D5]">
                        {getSkillIcon(item.skill)}
                        <span>{item.label}</span>
                      </div>
                      <Badge variant={!isTested ? 'neutral' : item.score! >= 70 ? 'success' : 'warning'} size="sm">
                        {isTested ? `${item.score}/100 (${item.qualitative})` : 'Chưa có dữ liệu'}
                      </Badge>
                    </div>

                    {/* Score Bar */}
                    {isTested && (
                      <div className="mb-2">
                        <ProgressBar progress={item.score || 0} height="h-2" />
                      </div>
                    )}

                    <p className="text-[11px] text-[#647560] dark:text-[#889B84] leading-relaxed">
                      {item.feedback}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Strengths */}
          <Card className="p-5 border-emerald-200 dark:border-emerald-900/60">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Điểm Mạnh Của Bạn</span>
            </h4>
            <ul className="space-y-2">
              {currentResult.strengths.map((s, idx) => (
                <li key={idx} className="text-xs text-[#263326] dark:text-[#EAF5D5] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Weaknesses */}
          <Card className="p-5 border-rose-200 dark:border-rose-900/60">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Lỗ Hổng Cần Bù Đắp</span>
            </h4>
            <ul className="space-y-2">
              {currentResult.weaknesses.map((w, idx) => (
                <li key={idx} className="text-xs text-[#263326] dark:text-[#EAF5D5] flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Knowledge Breakdown */}
        <Card variant="default" className="p-5">
          <h3 className="text-xs font-bold text-[#263326] dark:text-[#EAF5D5] mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#355A26] dark:text-[#C2E58C]" />
            <span>Phân Phối Kiến Thức Theo Cấp Độ</span>
          </h3>

          <div className="space-y-3">
            {/* Mastered */}
            {currentResult.knowledgeBreakdown.mastered.length > 0 && (
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                  ✓ ĐÃ NẮM VỮNG ({currentResult.knowledgeBreakdown.mastered.length} nội dung):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentResult.knowledgeBreakdown.mastered.map((k, idx) => (
                    <Badge key={idx} variant="success" size="sm">
                      {k.item} <span className="opacity-70">(HSK {k.hskLevel})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Weak Gaps */}
            {currentResult.knowledgeBreakdown.weakGaps.length > 0 && (
              <div className="pt-2 border-t border-[#E3EBDD] dark:border-[#2D3A2C]">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1.5">
                  ⚠ LỖ HỔNG CẦN BÙ ĐẮP ({currentResult.knowledgeBreakdown.weakGaps.length} nội dung):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentResult.knowledgeBreakdown.weakGaps.map((k, idx) => (
                    <Badge key={idx} variant="danger" size="sm">
                      {k.item} <span className="opacity-70">(HSK {k.hskLevel})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setViewState('intro')}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            <span>Về Màn Hình Chính</span>
          </Button>

          {onNavigate && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('roadmap')}
            >
              <span>Xem Lộ Trình HSK Đã Cập Nhật</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: 4. TEST HISTORY SCREEN
  // =========================================================================
  if (viewState === 'history') {
    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#263326] dark:text-[#EAF5D5]">
              Lịch Sử Khảo Sát & Đánh Giá
            </h2>
            <p className="text-xs text-[#647560] dark:text-[#889B84]">
              Theo dõi sự phát triển trình độ qua từng lần kiểm tra theo thời gian
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewState('intro')}
          >
            Quay lại
          </Button>
        </div>

        <div className="flex flex-col gap-2.5">
          {historyList.map((item, idx) => (
            <Card
              key={item.testId}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] flex items-center justify-center font-bold text-base">
                  #{historyList.length - idx}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#263326] dark:text-[#EAF5D5]">
                      Mốc HSK {item.estimatedHsk}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {item.testType === 'full' ? 'Toàn diện (6 kỹ năng)' : 'Rút gọn (3 kỹ năng)'}
                    </Badge>
                    {item.syncedToProfile && (
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Đã áp dụng
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                    Ngày thi: {new Date(item.startedAt).toLocaleString('vi-VN')} • Điểm số: {item.overallScore}/100 • {Math.round(item.durationSeconds / 60)} phút
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoading(true);
                  const res = await backendClient.getPlacementResult(item.testId);
                  if (res.success && res.data) {
                    setCurrentResult(res.data);
                    setViewState('result');
                  }
                  setLoading(false);
                }}
              >
                <span>Xem Báo Cáo</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
