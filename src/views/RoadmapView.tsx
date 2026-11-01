import React, { useEffect, useState } from 'react';
import {
  Trophy,
  CheckCircle,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Lock,
  Unlock,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  RefreshCw,
  History,
  SlidersHorizontal,
  ArrowRight,
  Volume2,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Layers,
  Send,
  Lightbulb
} from 'lucide-react';
import type { LessonContent, HSKLevel } from '../types';
import type {
  AdaptiveLearningPathDetail,
  PathStage,
  PathItem,
  PathVersion
} from '../types';
import type { NavTab } from '../components/layout/Sidebar';
import { db } from '../db';
import { RubyText } from '../components/common/RubyText';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import confetti from 'canvas-confetti';

interface RoadmapViewProps {
  onSelectLesson: (lesson: LessonContent) => void;
  onNavigate?: (tab: NavTab) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ onSelectLesson, onNavigate }) => {
  // Mode switcher: 'adaptive' (AI Lộ trình thích ứng) vs 'standard' (Giáo trình HSK tiêu chuẩn)
  const [activeMode, setActiveMode] = useState<'adaptive' | 'standard'>('adaptive');

  // ==================== ADAPTIVE LEARNING PATH STATE ====================
  const [pathDetail, setPathDetail] = useState<AdaptiveLearningPathDetail | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState<boolean>(true);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);

  // Modals
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState<boolean>(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState<boolean>(false);
  const [versionsList, setVersionsList] = useState<PathVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);

  // Lesson Player Modal
  const [activePathLesson, setActivePathLesson] = useState<{
    item: PathItem;
    lesson: any;
  } | null>(null);
  const [isStartingItem, setIsStartingItem] = useState<string | null>(null);
  const [lessonTab, setLessonTab] = useState<'explanation' | 'content' | 'exercises'>('explanation');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [gradingResult, setGradingResult] = useState<any | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState<boolean>(false);

  // Goal Form State
  const [formTargetHsk, setFormTargetHsk] = useState<number>(3);
  const [formTimelineMonths, setFormTimelineMonths] = useState<number>(6);
  const [formDailyMinutes, setFormDailyMinutes] = useState<number>(25);
  const [formDaysPerWeek, setFormDaysPerWeek] = useState<number>(5);
  const [formLearningFocus, setFormLearningFocus] = useState<string>('comprehensive');
  const [isSavingGoals, setIsSavingGoals] = useState<boolean>(false);

  // Reschedule state
  const [reschedulingScheduleId, setReschedulingScheduleId] = useState<string | null>(null);

  // ==================== STANDARD ROADMAP STATE ====================
  const [selectedHsk, setSelectedHsk] = useState<HSKLevel>(1);
  const [standardLessons, setStandardLessons] = useState<LessonContent[]>([]);
  const [freeMode, setFreeMode] = useState<boolean>(true);

  // ---------------- Load Adaptive Path ----------------
  const loadAdaptivePath = async (quiet: boolean = false) => {
    if (!quiet) setIsLoadingPath(true);
    setPathError(null);
    try {
      const res = await backendClient.getCurrentPath();
      if (res.success && res.data) {
        setPathDetail(res.data);
        // Pre-fill form
        setFormTargetHsk(res.data.targetHsk || 3);
        setFormTimelineMonths(6);
        setFormDailyMinutes(res.data.dailyMinutes || 25);
        setFormDaysPerWeek(res.data.daysPerWeek || 5);
        setFormLearningFocus(res.data.primaryGoal || 'daily_communication');
      } else {
        setPathError(res.error || 'Chưa thể tải dữ liệu lộ trình thích ứng từ máy chủ backend.');
      }
    } catch (err: any) {
      setPathError(err.message || 'Lỗi kết nối máy chủ backend');
    } finally {
      if (!quiet) setIsLoadingPath(false);
    }
  };

  // ---------------- Load Standard Lessons ----------------
  const loadStandardLessons = async (hsk: HSKLevel) => {
    const list = await db.lessons.where('hskLevel').equals(hsk).toArray();
    setStandardLessons(list);
  };

  useEffect(() => {
    loadAdaptivePath();
    loadStandardLessons(selectedHsk);
  }, []);

  useEffect(() => {
    loadStandardLessons(selectedHsk);
  }, [selectedHsk]);

  // ---------------- Rebalance Path ----------------
  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      const res = await backendClient.rebalancePath({ trigger: 'manual' });
      if (res.success) {
        await loadAdaptivePath(true);
      } else {
        alert('Lỗi khi tái cân bằng: ' + (res.error || 'Vui lòng thử lại'));
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsRebalancing(false);
    }
  };

  // ---------------- Lock / Unlock Stage ----------------
  const handleToggleLockStage = async (stage: PathStage) => {
    const nextLocked = !stage.isLockedByUser;
    const res = await backendClient.lockPathStage(stage.id, nextLocked);
    if (res.success) {
      setPathDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stages: prev.stages.map(s => s.id === stage.id ? { ...s, isLockedByUser: nextLocked } : s)
        };
      });
    } else {
      alert('Không thể thay đổi trạng thái khóa: ' + (res.error || ''));
    }
  };

  // ---------------- Update Goals ----------------
  const handleSaveGoals = async () => {
    setIsSavingGoals(true);
    try {
      const res = await backendClient.updatePathGoals({
        targetHsk: formTargetHsk,
        targetTimelineMonths: formTimelineMonths,
        dailyMinutes: formDailyMinutes,
        daysPerWeek: formDaysPerWeek,
        learningFocus: formLearningFocus
      });
      if (res.success) {
        setIsGoalsModalOpen(false);
        await loadAdaptivePath(true);
      } else {
        alert('Lỗi cập nhật: ' + (res.error || ''));
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsSavingGoals(false);
    }
  };

  // ---------------- Open Versions Modal ----------------
  const handleOpenVersions = async () => {
    if (!pathDetail?.id) return;
    setIsVersionsModalOpen(true);
    setIsLoadingVersions(true);
    try {
      const res = await backendClient.getPathVersions(pathDetail.id);
      if (res.success && res.data) {
        setVersionsList(res.data);
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // ---------------- Restore Version ----------------
  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục về phiên bản lộ trình này?')) return;
    try {
      const res = await backendClient.restorePathVersion(versionId);
      if (res.success) {
        setIsVersionsModalOpen(false);
        await loadAdaptivePath(true);
      } else {
        alert('Không thể khôi phục: ' + (res.error || ''));
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  // ---------------- Complete Schedule Item ----------------
  const handleCompleteScheduleItem = async (scheduleId: string) => {
    const res = await backendClient.completeScheduleItem(scheduleId);
    if (res.success) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      setPathDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          schedule: prev.schedule.map(s => s.id === scheduleId ? { ...s, isCompleted: true } : s)
        };
      });
    }
  };

  // ---------------- Reschedule Item ----------------
  const handleReschedule = async (scheduleId: string, newDay: number) => {
    const res = await backendClient.rescheduleScheduleItem(scheduleId, newDay);
    if (res.success) {
      setReschedulingScheduleId(null);
      await loadAdaptivePath(true);
    }
  };

  // ---------------- Start Path Item (Open Lesson Player) ----------------
  const handleStartPathItem = async (item: PathItem) => {
    setIsStartingItem(item.id);
    try {
      const res = await backendClient.startPathItem(item.id);
      if (res.success && res.data && res.data.lesson) {
        setActivePathLesson({
          item: res.data.item || item,
          lesson: res.data.lesson
        });
        setLessonTab('explanation');
        setUserAnswers({});
        setGradingResult(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Không thể mở bài học: ' + (res.error || 'Vui lòng thử lại'));
      }
    } catch (e: any) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setIsStartingItem(null);
    }
  };

  // ---------------- Grade Path Lesson ----------------
  const handleSubmitLessonExercises = async () => {
    if (!activePathLesson) return;
    setIsSubmittingLesson(true);
    try {
      const exercises = activePathLesson.lesson.exercises || [];
      let totalQuestions = exercises.length;
      let correctCount = 0;
      const feedbackMap: Record<number, { isCorrect: boolean; explanation: string }> = {};

      exercises.forEach((ex: any) => {
        const userAns = (userAnswers[ex.id] || '').trim().toLowerCase();
        const expected = (ex.correctAnswer || '').trim().toLowerCase();
        const isRight = userAns === expected;
        if (isRight) correctCount++;
        feedbackMap[ex.id] = {
          isCorrect: isRight,
          explanation: ex.explanationVi || 'Đáp án đúng: ' + ex.correctAnswer
        };
      });

      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
      setGradingResult({
        score,
        correctCount,
        totalQuestions,
        feedbackMap
      });

      if (score >= 60) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }

      // Rebalance và cập nhật trạng thái bài hoàn thành vào lộ trình
      await backendClient.rebalancePath({
        trigger: 'lesson_completed',
        score
      });
      await loadAdaptivePath(true);
    } catch (e: any) {
      alert('Lỗi chấm điểm: ' + e.message);
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  const hskLevels: Array<{ level: HSKLevel; label: string; desc: string; vocabTarget: number }> = [
    { level: 1, label: 'HSK 1', desc: 'Nhập môn & Giao tiếp cơ bản', vocabTarget: 150 },
    { level: 2, label: 'HSK 2', desc: 'Đời sống & Mua sắm du lịch', vocabTarget: 300 },
    { level: 3, label: 'HSK 3', desc: 'Giao tiếp công việc & Du học', vocabTarget: 600 },
    { level: 4, label: 'HSK 4', desc: 'Thảo luận chủ đề chuyên sâu', vocabTarget: 1200 },
    { level: 5, label: 'HSK 5', desc: 'Đọc báo & Thuyết trình chuyên nghiệp', vocabTarget: 2500 },
    { level: 6, label: 'HSK 6', desc: 'Thông thạo bản xứ & Luận văn', vocabTarget: 5000 },
  ];

  const getDayName = (day: number) => {
    switch (day) {
      case 1: return 'Thứ Hai';
      case 2: return 'Thứ Ba';
      case 3: return 'Thứ Tư';
      case 4: return 'Thứ Năm';
      case 5: return 'Thứ Sáu';
      case 6: return 'Thứ Bảy';
      case 7: return 'Chủ Nhật';
      default: return `Ngày ${day}`;
    }
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'remedial':
      case 'error_remediation':
        return { label: 'Vá Lỗ Hổng', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800' };
      case 'foundation':
      case 'foundation_reinforce':
        return { label: 'Nền Tảng', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      case 'lesson':
      case 'core_topic':
        return { label: 'Trọng Tâm', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800' };
      case 'expansion':
      case 'application':
        return { label: 'Mở Rộng', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'review_srs':
        return { label: 'Ôn Tập SRS', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      case 'checkpoint_exam':
      case 'practice_drill':
      case 'milestone_checkpoint':
        return { label: 'Khảo Thí Cột Mốc', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' };
      default:
        return { label: 'Bài Học', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    }
  };

  // =========================================================================
  // VIEW: LESSON PLAYER MODAL (Khi người học mở bài học trên lộ trình)
  // =========================================================================
  if (activePathLesson) {
    const { item, lesson } = activePathLesson;
    const badge = getItemTypeBadge(item.itemType);

    return (
      <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto animate-fadeIn">
        {/* Top Header / Back bar */}
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setActivePathLesson(null)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Quay lại Bản đồ lộ trình</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              HSK {item.hskLevel}
            </span>
          </div>
        </div>

        {/* Lesson Title Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-600 via-rose-600 to-amber-600 text-white shadow-xl shadow-primary-600/20">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-100 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Lộ Trình Thích Ứng AI • Bài {item.orderIndex}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            {lesson.titleVi || item.title}
          </h1>
          <div className="mt-2 text-lg text-rose-100 font-chinese font-semibold">
            {lesson.titleZh || item.title}
          </div>
          <p className="text-xs sm:text-sm text-rose-100/90 mt-3 max-w-2xl leading-relaxed">
            Mục tiêu: {item.targetKnowledge?.join(', ') || item.title} • {item.recommendationReason}
          </p>
        </div>

        {/* Lesson Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
          <button
            onClick={() => setLessonTab('explanation')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              lessonTab === 'explanation'
                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Lý Thuyết & Phân Tích</span>
          </button>
          <button
            onClick={() => setLessonTab('content')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              lessonTab === 'content'
                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Đoạn Văn & Hội Thoại</span>
          </button>
          <button
            onClick={() => setLessonTab('exercises')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              lessonTab === 'exercises'
                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Bài Tập ({lesson.exercises?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Explanation */}
        {lessonTab === 'explanation' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span>Giải Thích Kiến Thức Trọng Tâm</span>
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {lesson.explanationVi || 'Bài học tập trung củng cố kiến thức và khắc phục điểm yếu theo phản hồi của AI.'}
              </p>
            </div>

            {/* Vocabulary Highlight */}
            {lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  <span>Từ Vựng Cần Nắm Vững ({lesson.vocabulary.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lesson.vocabulary.map((voc: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold font-chinese text-slate-800 dark:text-slate-100">
                            {voc.simplified}
                          </span>
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            [{voc.pinyin}]
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {voc.meaningVi}
                        </div>
                      </div>
                      <button
                        onClick={() => audioService.speak(voc.simplified, { rate: 0.85 })}
                        className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 transition-colors shadow-sm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Points */}
            {lesson.grammarPoints && lesson.grammarPoints.length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <span>Cấu Trúc Ngữ Pháp</span>
                </h3>
                {lesson.grammarPoints.map((gp: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
                    <div className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                      {gp.patternName || gp.name}
                    </div>
                    {gp.formula && (
                      <div className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg inline-block mt-2 text-slate-700 dark:text-slate-200 border border-indigo-100 dark:border-indigo-800">
                        {gp.formula}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                      {gp.usageVi || gp.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setLessonTab('content')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <span>Tiếp tục sang Bài đọc & Hội thoại</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 2: Content */}
        {lessonTab === 'content' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary-500" />
                  <span>Ngữ Liệu Thực Hành</span>
                </h3>
                <button
                  onClick={() => audioService.speak(lesson.contentZh || '', { rate: 0.85 })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-100 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe toàn đoạn</span>
                </button>
              </div>

              {/* Chinese Passage with Pinyin */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                <div className="text-lg font-chinese leading-loose text-slate-800 dark:text-slate-100">
                  <RubyText
                    text={lesson.contentZh || ''}
                    charClassName="text-lg font-chinese font-semibold"
                    rtClassName="text-xs text-slate-500"
                    clickableWords={true}
                  />
                </div>
              </div>

              {/* Vietnamese Translation */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <div className="font-bold text-amber-700 dark:text-amber-400 mb-1">
                  Bản dịch tiếng Việt:
                </div>
                {lesson.contentVi}
              </div>
            </div>

            <button
              onClick={() => setLessonTab('exercises')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <span>Làm bài tập kiểm tra ({lesson.exercises?.length || 0} câu)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 3: Exercises */}
        {lessonTab === 'exercises' && (
          <div className="space-y-6">
            {gradingResult && (
              <div className={`p-6 rounded-3xl border shadow-lg ${
                gradingResult.score >= 80
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  : gradingResult.score >= 60
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black">
                      {gradingResult.score >= 80 ? '🎉 Xuất Sắc!' : gradingResult.score >= 60 ? '👍 Đạt Yêu Cầu!' : '💪 Cần Cố Gắng Hơn!'}
                    </h3>
                    <p className="text-xs mt-1">
                      Bạn đã trả lời đúng {gradingResult.correctCount}/{gradingResult.totalQuestions} câu hỏi.
                    </p>
                  </div>
                  <div className="text-3xl font-black">
                    {gradingResult.score}%
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                  <span className="text-xs">
                    Lộ trình thích ứng đã tự động ghi nhận kết quả và cập nhật bước học kế tiếp!
                  </span>
                  <button
                    onClick={() => setActivePathLesson(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    Xem lộ trình mới
                  </button>
                </div>
              </div>
            )}

            {/* Questions list */}
            {(!lesson.exercises || lesson.exercises.length === 0) ? (
              <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                <p className="text-xs text-slate-500">Bài học này không có bài tập trắc nghiệm riêng.</p>
                <button
                  onClick={handleSubmitLessonExercises}
                  disabled={isSubmittingLesson}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs"
                >
                  Xác nhận hoàn thành bài
                </button>
              </div>
            ) : (
              lesson.exercises.map((ex: any, idx: number) => {
                const resultInfo = gradingResult?.feedbackMap?.[ex.id];
                return (
                  <div
                    key={ex.id || idx}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                        Câu {idx + 1}
                      </span>
                      {resultInfo && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          resultInfo.isCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {resultInfo.isCorrect ? 'Đúng (+1)' : 'Sai'}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {ex.question || ex.prompt}
                    </div>

                    {/* Multiple choice options */}
                    {ex.options && (
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        {ex.options.map((opt: string, optIdx: number) => {
                          const isSelected = userAnswers[ex.id] === opt;
                          return (
                            <button
                              key={optIdx}
                              disabled={Boolean(gradingResult)}
                              onClick={() => setUserAnswers(prev => ({ ...prev, [ex.id]: opt }))}
                              className={`p-3 rounded-2xl text-left text-xs font-semibold transition-all border ${
                                isSelected
                                  ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-700 dark:text-primary-300'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:border-primary-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Result feedback */}
                    {resultInfo && (
                      <div className="mt-2 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                        {resultInfo.explanation}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {!gradingResult && lesson.exercises && lesson.exercises.length > 0 && (
              <button
                onClick={handleSubmitLessonExercises}
                disabled={isSubmittingLesson}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-sm shadow-xl shadow-primary-600/25 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingLesson ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nộp bài và đồng bộ lộ trình...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Nộp Bài & Hoàn Thành Bước Học</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN ROADMAP VIEW (Dual Tabs)
  // =========================================================================
  return (
    <div className="space-y-6 pb-20 md:pb-8 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* Dual Tab Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Lộ Trình Học Cá Nhân Hóa</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              v1.5.0 Adaptive
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống AI tự động điều chỉnh nội dung học dựa trên lỗi sai, điểm yếu và mục tiêu thực tế của bạn.
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          <button
            onClick={() => setActiveMode('adaptive')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'adaptive'
                ? 'bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Lộ Trình Thích Ứng AI</span>
          </button>
          <button
            onClick={() => setActiveMode('standard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'standard'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>📚 Giáo Trình HSK Chuẩn</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODE 1: ADAPTIVE LEARNING PATH */}
      {/* ================================================================= */}
      {activeMode === 'adaptive' && (
        <div className="space-y-6">
          {isLoadingPath ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <p className="text-xs font-medium text-slate-500">
                Đang phân tích bộ nhớ học tập và tải lộ trình thích ứng...
              </p>
            </div>
          ) : pathError || !pathDetail ? (
            <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Chưa khởi tạo lộ trình thích ứng
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Hãy làm bài kiểm tra trình độ đầu vào hoặc nhấn tạo lộ trình mới để AI xây dựng hành trình học tối ưu riêng cho bạn.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('placement_test')}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors"
                  >
                    Làm Bài Kiểm Tra Đầu Vào
                  </button>
                )}
                <button
                  onClick={() => handleSaveGoals()}
                  className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-700 transition-colors"
                >
                  Khởi Tạo Lộ Trình Mới
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Hero Goal Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                        Mục tiêu hiện hành
                      </span>
                      <span className="text-xs text-slate-300">
                        {pathDetail.targetCompletionDate || '6 tháng'} • {pathDetail.dailyMinutes} phút/ngày
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                      Chinh Phục HSK {pathDetail.targetHsk}
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Trình độ hiện tại: HSK {pathDetail.currentHsk} • {pathDetail.daysPerWeek} buổi/tuần • Phiên bản #{pathDetail.version}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsGoalsModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors backdrop-blur-sm"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Đổi mục tiêu</span>
                    </button>
                    <button
                      onClick={handleRebalance}
                      disabled={isRebalancing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-colors shadow-md shadow-primary-600/30"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
                      <span>Tái cân bằng AI</span>
                    </button>
                    <button
                      onClick={handleOpenVersions}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                      title="Lịch sử phiên bản"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-300 font-medium">Tiến độ hoàn thành lộ trình</span>
                    <span className="font-bold text-primary-300">
                      {pathDetail.progressPercent}% hoàn thành
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 via-rose-500 to-amber-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pathDetail.progressPercent)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Next Recommended Item */}
              {pathDetail.nextRecommendedItem && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-primary-50 via-rose-50 to-amber-50 dark:from-primary-950/40 dark:via-rose-950/30 dark:to-amber-950/20 border-2 border-primary-200 dark:border-primary-800/60 shadow-lg shadow-primary-500/5 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary-600 text-white">
                          Đề xuất học tiếp theo
                        </span>
                        {(() => {
                          const badge = getItemTypeBadge(pathDetail.nextRecommendedItem.itemType);
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {pathDetail.nextRecommendedItem.estimatedMinutes} phút
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {pathDetail.nextRecommendedItem.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Mục tiêu: {pathDetail.nextRecommendedItem.targetKnowledge?.join(', ') || pathDetail.nextRecommendedItem.title}
                      </p>
                      <p className="text-[11px] text-primary-700 dark:text-primary-300 font-medium italic">
                        💡 Lý do AI gợi ý: {pathDetail.nextRecommendedItem.recommendationReason}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStartPathItem(pathDetail.nextRecommendedItem!)}
                      disabled={isStartingItem === pathDetail.nextRecommendedItem.id}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 hover:brightness-105 active:scale-95 text-white font-bold text-xs shadow-md shadow-primary-600/30 transition-all flex items-center gap-2 shrink-0"
                    >
                      {isStartingItem === pathDetail.nextRecommendedItem.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang tạo bài...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Học Ngay Bài Này</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Smart Weekly Schedule */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-500" />
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                      Lịch Học Thông Minh Trong Tuần
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Phân bổ theo SRS & nhịp sinh học
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pathDetail.schedule.map((sched) => {
                    const isDone = sched.isCompleted;
                    return (
                      <div
                        key={sched.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDone
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-750 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {sched.dayName || getDayName(sched.dayOfWeek)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sched.estimatedMinutes} phút
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                          {sched.activityTitle}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                          {sched.reason}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                          {isDone ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã xong
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCompleteScheduleItem(sched.id)}
                              className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Đánh dấu xong
                            </button>
                          )}

                          {/* Reschedule button */}
                          <div className="relative">
                            <button
                              onClick={() => setReschedulingScheduleId(reschedulingScheduleId === sched.id ? null : sched.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              Dời ngày
                            </button>

                            {reschedulingScheduleId === sched.id && (
                              <div className="absolute right-0 bottom-full mb-1 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 w-36 space-y-1">
                                <div className="text-[10px] font-bold text-slate-400 px-1">Chuyển sang:</div>
                                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                                  <button
                                    key={d}
                                    onClick={() => handleReschedule(sched.id, d)}
                                    className="w-full text-left text-xs px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200"
                                  >
                                    {getDayName(d)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Milestones Tracker */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    Cột Mốc Quan Trọng (Milestones)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {pathDetail.milestones.map((ms) => {
                    const isAchieved = ms.status === 'achieved';
                    return (
                      <div
                        key={ms.id}
                        className={`p-4 rounded-2xl border ${
                          isAchieved
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-750'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Cột mốc {ms.orderIndex}
                          </span>
                          {isAchieved ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                              Đạt được
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500">
                              {ms.progressPercent}%
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {ms.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {ms.descriptionVi}
                        </p>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-3 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${ms.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. 4-Stage Learning Journey */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary-500" />
                      <span>Bản Đồ 4 Giai Đoạn Thích Ứng</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      AI tự động phân bổ và mở khóa theo năng lực. Bạn có thể khóa giai đoạn để cố định lộ trình.
                    </p>
                  </div>
                </div>

                {pathDetail.stages.map((stage) => {
                  const isCurrent = stage.status === 'in_progress';
                  const isCompleted = stage.status === 'completed';

                  return (
                    <div
                      key={stage.id}
                      className={`p-6 rounded-3xl border transition-all ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-900 border-primary-400 dark:border-primary-600 shadow-md'
                          : isCompleted
                          ? 'bg-white/80 dark:bg-slate-900/80 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-90'
                      }`}
                    >
                      {/* Stage Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isCurrent
                                ? 'bg-primary-600 text-white'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              Giai đoạn {stage.stageNumber} • {stage.stageType}
                            </span>

                            {stage.isLockedByUser && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Đã khóa bởi bạn
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                            {stage.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {stage.descriptionVi}
                          </p>
                        </div>

                        {/* Lock stage button */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            onClick={() => handleToggleLockStage(stage)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                              stage.isLockedByUser
                                ? 'bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Khóa giai đoạn này để AI không tự ý sắp xếp lại"
                          >
                            {stage.isLockedByUser ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Mở khóa AI</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Khóa giai đoạn</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Items in stage */}
                      <div className="space-y-2.5 mt-4">
                        {stage.items.map((item, idx) => {
                          const isItemDone = item.status === 'completed';
                          const isReady = item.status === 'available' || item.status === 'in_progress';
                          const badge = getItemTypeBadge(item.itemType);

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isItemDone
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                                  : isReady
                                  ? 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 hover:border-primary-300'
                                  : 'bg-slate-100/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                  isItemDone
                                    ? 'bg-emerald-500 text-white'
                                    : isReady
                                    ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                }`}>
                                  {isItemDone ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      HSK {item.hskLevel} • {item.estimatedMinutes} phút
                                    </span>
                                    {isItemDone && item.score !== undefined && (
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        • Đạt {item.score}%
                                      </span>
                                    )}
                                  </div>

                                  <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                                    {item.title}
                                  </h5>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {item.targetKnowledge?.join(', ') || item.title}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {isItemDone ? (
                                  <button
                                    onClick={() => handleStartPathItem(item)}
                                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Học lại</span>
                                  </button>
                                ) : isReady ? (
                                  <button
                                    onClick={() => handleStartPathItem(item)}
                                    disabled={isStartingItem === item.id}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    {isStartingItem === item.id ? (
                                      <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Đang mở...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        <span>Bắt đầu học</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5" /> Khóa
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 2: STANDARD HSK CURRICULUM */}
      {/* ================================================================= */}
      {activeMode === 'standard' && (
        <div className="space-y-6">
          {/* Free Navigation Toggle */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Chế độ mở khóa bài học:
            </span>
            <button
              onClick={() => setFreeMode(!freeMode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                freeMode
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {freeMode ? 'Tự Do Chọn Bài' : 'Tuần Tự'}
            </button>
          </div>

          {/* HSK Level Pill Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {hskLevels.map((lvl) => {
              const isActive = selectedHsk === lvl.level;
              return (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedHsk(lvl.level)}
                  className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all ${
                    isActive
                      ? 'bg-gradient-to-b from-primary-600 to-rose-600 text-white shadow-lg shadow-primary-600/25 scale-[1.02]'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-300'
                  }`}
                >
                  <span className="text-sm font-black tracking-tight">{lvl.label}</span>
                  <span className={`text-[10px] mt-0.5 ${isActive ? 'text-rose-100' : 'text-slate-400'}`}>
                    {lvl.vocabTarget} từ
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lesson List */}
          <div className="space-y-4">
            {standardLessons.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  Đang hoàn thiện nội dung cho cấp độ HSK {selectedHsk}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Hiện tại cấp độ HSK 1 và HSK 2 đã sẵn sàng đầy đủ bài học tương tác, hội thoại và bài tập.
                </p>
              </div>
            ) : (
              standardLessons.map((lesson, idx) => {
                const isCompleted = Boolean(lesson.completed);
                return (
                  <div
                    key={lesson.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-6 h-6" /> : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            Chương {lesson.chapter} • Bài {lesson.lessonNumber}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> Đạt {lesson.score || 100}%
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                          {lesson.titleVi}
                        </h3>

                        <div className="mt-1">
                          <RubyText
                            text={lesson.title}
                            className="text-slate-600 dark:text-slate-300"
                            charClassName="text-sm font-chinese font-semibold"
                            rtClassName="text-[10px]"
                            clickableWords={false}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isCompleted ? (
                        <button
                          onClick={() => onSelectLesson(lesson)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Ôn lại</span>
                        </button>
                      ) : null}

                      <button
                        onClick={() => onSelectLesson(lesson)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-primary-600/20 hover:brightness-105 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{isCompleted ? 'Học lại' : 'Bắt đầu học'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: UPDATE GOALS */}
      {/* ================================================================= */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-500" />
                <span>Thiết Lập Mục Tiêu Học Tập</span>
              </h3>
              <button
                onClick={() => setIsGoalsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Thay đổi mục tiêu sẽ giúp AI điều chỉnh lại nhịp độ và lộ trình mà không làm mất các bài bạn đã học.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cấp độ HSK mục tiêu
                </label>
                <select
                  value={formTargetHsk}
                  onChange={(e) => setFormTargetHsk(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value={1}>HSK 1 (Nhập môn)</option>
                  <option value={2}>HSK 2 (Cơ bản)</option>
                  <option value={3}>HSK 3 (Trung cấp)</option>
                  <option value={4}>HSK 4 (Trung cấp nâng cao)</option>
                  <option value={5}>HSK 5 (Cao cấp)</option>
                  <option value={6}>HSK 6 (Thông thạo)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Thời gian học mỗi ngày
                  </label>
                  <select
                    value={formDailyMinutes}
                    onChange={(e) => setFormDailyMinutes(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value={15}>15 phút / ngày</option>
                    <option value={25}>25 phút / ngày</option>
                    <option value={35}>35 phút / ngày</option>
                    <option value={45}>45 phút / ngày</option>
                    <option value={60}>60 phút / ngày</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Số buổi học mỗi tuần
                  </label>
                  <select
                    value={formDaysPerWeek}
                    onChange={(e) => setFormDaysPerWeek(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    <option value={3}>3 buổi / tuần</option>
                    <option value={4}>4 buổi / tuần</option>
                    <option value={5}>5 buổi / tuần</option>
                    <option value={6}>6 buổi / tuần</option>
                    <option value={7}>7 buổi / tuần</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Thời hạn dự kiến hoàn thành
                </label>
                <select
                  value={formTimelineMonths}
                  onChange={(e) => setFormTimelineMonths(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value={3}>3 tháng (Cấp tốc)</option>
                  <option value={6}>6 tháng (Tiêu chuẩn)</option>
                  <option value={9}>9 tháng (Vững chắc)</option>
                  <option value={12}>12 tháng (Dài hạn)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Định hướng trọng tâm
                </label>
                <select
                  value={formLearningFocus}
                  onChange={(e) => setFormLearningFocus(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="comprehensive">Toàn diện 4 kỹ năng</option>
                  <option value="communication">Giao tiếp phản xạ & khẩu ngữ</option>
                  <option value="exam_prep">Luyện thi HSK & ngữ pháp</option>
                  <option value="business">Công việc & Thương mại</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setIsGoalsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveGoals}
                disabled={isSavingGoals}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isSavingGoals && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Cập nhật lộ trình</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: VERSION HISTORY */}
      {/* ================================================================= */}
      {isVersionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-primary-500" />
                <span>Lịch Sử Phiên Bản Lộ Trình</span>
              </h3>
              <button
                onClick={() => setIsVersionsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Mỗi khi bạn làm bài thi, hoàn thành bài học hoặc đổi mục tiêu, hệ thống lưu lại snapshot phiên bản. Bạn có thể khôi phục lại bất kỳ phiên bản nào.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {isLoadingVersions ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary-500 mx-auto" />
                </div>
              ) : versionsList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Chưa có phiên bản snapshot nào được ghi lại.
                </div>
              ) : (
                versionsList.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Phiên bản #{ver.versionNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ver.triggerReason || ver.changesSummary}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(ver.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(ver.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-primary-600 hover:text-white text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    >
                      Khôi phục
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsVersionsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
