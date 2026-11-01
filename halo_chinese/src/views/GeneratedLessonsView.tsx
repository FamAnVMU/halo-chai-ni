import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Trash2,
  RotateCcw,
  Volume2,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Play,
  FileCheck,
  ChevronRight,
  BookMarked,
  Filter,
  Plus
} from 'lucide-react';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import confetti from 'canvas-confetti';
import { RubyText } from '../components/common/RubyText';

export const GeneratedLessonsView: React.FC = () => {
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unstarted' | 'completed' | 'reinforce' | 'new'>('all');
  const [activeLesson, setActiveLesson] = useState<any | null>(null);

  // Generation Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTopic, setCreateTopic] = useState('');
  const [createType, setCreateType] = useState<'new' | 'reinforce' | 'review' | 'advanced'>('reinforce');
  const [isGenerating, setIsGenerating] = useState(false);

  // Lesson Player States
  const [lessonTab, setLessonTab] = useState<'explanation' | 'content' | 'exercises'>('explanation');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [gradingResult, setGradingResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    setIsLoading(true);
    const res = await backendClient.getGeneratedLessons();
    if (res.success && res.data) {
      setLessons(res.data);
    }
    setIsLoading(false);
  };

  const handleStartLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setLessonTab('explanation');
    setUserAnswers({});
    setGradingResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateLesson = async () => {
    setIsGenerating(true);
    try {
      const res = await backendClient.generateLesson({
        topic: createTopic.trim() || undefined,
        lessonType: createType
      });
      if (res.success && res.data) {
        setIsCreateModalOpen(false);
        setCreateTopic('');
        await loadLessons();
        handleStartLesson(res.data);
      } else {
        alert('Lỗi tạo bài học: ' + (res.error || 'Vui lòng thử lại'));
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bài học này khỏi danh sách?')) {
      await backendClient.deleteGeneratedLesson(id);
      if (activeLesson?.id === id) {
        setActiveLesson(null);
      }
      loadLessons();
    }
  };

  const handleSubmitExercises = async () => {
    if (!activeLesson) return;
    setIsSubmitting(true);
    try {
      const res = await backendClient.completeLesson(activeLesson.id, {
        userAnswers,
        timeSpentSeconds: 600
      });
      setGradingResult(res);
      if (res.score >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      loadLessons();
    } catch (e: any) {
      alert('Lỗi nộp bài: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimplify = async () => {
    if (!activeLesson) return;
    setIsSimplifying(true);
    try {
      const res = await backendClient.simplifyLesson(activeLesson.id);
      if (res.success) {
        setActiveLesson({
          ...activeLesson,
          explanationVi: res.simplifiedExplanation
        });
        alert('✓ Đã cập nhật phần giải thích đơn giản và trực quan hơn!');
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsSimplifying(false);
    }
  };

  // Filter lessons
  const filteredLessons = lessons.filter(l => {
    if (selectedFilter === 'unstarted') return l.status === 'unstarted';
    if (selectedFilter === 'completed') return l.status === 'completed';
    if (selectedFilter === 'reinforce') return l.lessonType === 'reinforce' || l.lessonType === 'error_correction';
    if (selectedFilter === 'new') return l.lessonType === 'new';
    return true;
  });

  const getLessonTypeBadge = (type: string) => {
    switch (type) {
      case 'reinforce':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Củng cố lỗi sai</span>;
      case 'review':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Ôn tập kiến thức</span>;
      case 'advanced':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">Mở rộng nâng cao</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Bài học mới</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            <span>Bài Học Dành Cho Bạn</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              AI Personalized
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Các bài học tự động tạo dựa trên lịch sử trò chuyện, điểm yếu thực tế và cơ chế chống trùng lặp kiến thức.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bài học mới với AI</span>
        </button>
      </div>

      {/* ACTIVE LESSON PLAYER (If a lesson is selected) */}
      {activeLesson ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-200">
          {/* Player Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveLesson(null)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                ← Quay lại danh sách bài học
              </button>
              <div className="flex items-center gap-2">
                {getLessonTypeBadge(activeLesson.lessonType)}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold">
                  HSK {activeLesson.hskLevel}
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {activeLesson.estimatedMinutes} phút
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black">{activeLesson.title}</h2>
              <p className="text-xs text-slate-300 mt-1 italic">
                🎯 {activeLesson.recommendationReason}
              </p>
            </div>

            {/* Sub-nav Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setLessonTab('explanation')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lessonTab === 'explanation' ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                1. Giảng giải & Lý thuyết
              </button>
              <button
                onClick={() => setLessonTab('content')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lessonTab === 'content' ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                2. Từ vựng, Ngữ pháp & Hội thoại
              </button>
              <button
                onClick={() => setLessonTab('exercises')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lessonTab === 'exercises' ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                3. Bài tập tương tác & Kiểm tra
              </button>
            </div>
          </div>

          {/* TAB 1: EXPLANATION */}
          {lessonTab === 'explanation' && (
            <div className="p-6 space-y-6">
              {/* Objectives */}
              {activeLesson.objectives?.length > 0 && (
                <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900 text-xs space-y-2">
                  <span className="font-bold text-primary-900 dark:text-primary-200 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary-600" />
                    Mục tiêu bài học:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                    {activeLesson.objectives.map((obj: string, i: number) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pedagogy Explanation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                    <span>Nội Dung Giảng Giải Sư Phạm</span>
                  </h3>

                  <button
                    onClick={handleSimplify}
                    disabled={isSimplifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isSimplifying ? 'Đang đơn giản hóa...' : 'Giải thích đơn giản hơn'}</span>
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {activeLesson.explanationVi}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setLessonTab('content')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
                >
                  <span>Xem Từ Vựng & Hội Thoại</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT (VOCAB, GRAMMAR, DIALOGUE) */}
          {lessonTab === 'content' && (
            <div className="p-6 space-y-6">
              {/* Target Vocabulary */}
              {activeLesson.content?.vocabulary?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-primary-600" />
                    <span>Từ Vựng Trọng Tâm Bài Học</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeLesson.content.vocabulary.map((v: any, i: number) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold font-chinese text-xl text-slate-900 dark:text-slate-100">
                              {v.simplified}
                            </span>
                            <span className="text-xs text-rose-500 font-semibold ml-2">[{v.pinyin}]</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ml-2">
                              {v.wordType}
                            </span>
                          </div>
                          <button
                            onClick={() => audioService.speak(v.simplified)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {v.meaningVi}
                        </div>

                        {v.exampleZh && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                            <div className="font-chinese text-slate-800 dark:text-slate-200 font-medium">
                              {v.exampleZh}
                            </div>
                            <div className="text-slate-500 text-[11px]">{v.exampleVi}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grammar Section */}
              {activeLesson.content?.grammar?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <span>Cấu Trúc Ngữ Pháp Then Chốt</span>
                  </h3>

                  <div className="space-y-4">
                    {activeLesson.content.grammar.map((g: any, i: number) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3"
                      >
                        <div className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                          {g.patternName}
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs font-bold text-primary-700 dark:text-primary-300 border border-indigo-100 dark:border-indigo-950">
                          Công thức: {g.formula}
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {g.explanation || g.meaningVi}
                        </p>

                        {g.goodExample && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                              ✓ Ví dụ chuẩn:
                            </span>
                            <div className="font-chinese text-emerald-900 dark:text-emerald-200 font-medium">
                              {g.goodExample}
                            </div>
                          </div>
                        )}

                        {g.badExample && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs">
                            <span className="font-bold text-rose-800 dark:text-rose-300 block mb-0.5">
                              ✗ Lỗi sai thường gặp:
                            </span>
                            <div className="line-through text-rose-900 dark:text-rose-200">
                              {g.badExample}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dialogue */}
              {activeLesson.content?.dialogue?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary-600" />
                    <span>Hội Thoại Đời Sống Thực Tế</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    {activeLesson.content.dialogue.map((d: any, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs">
                        <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {d.speaker}
                        </span>
                        <div className="space-y-0.5 flex-1">
                          <div className="font-chinese text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{d.zh}</span>
                            <button
                              onClick={() => audioService.speak(d.zh)}
                              className="text-slate-400 hover:text-primary-600"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-rose-500 font-mono">{d.pinyin}</div>
                          <div className="text-slate-500">{d.vi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setLessonTab('exercises')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
                >
                  <span>Làm Bài Tập Tương Tác</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EXERCISES & QUIZ */}
          {lessonTab === 'exercises' && (
            <div className="p-6 space-y-6">
              {/* Grading Result Alert Banner */}
              {gradingResult && (
                <div className={`p-5 rounded-2xl border text-xs space-y-2 animate-in zoom-in-95 duration-150 ${
                  gradingResult.passed
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 text-amber-900 dark:text-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base flex items-center gap-1.5">
                      {gradingResult.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                      Điểm Số: {gradingResult.score} / 100 ({gradingResult.correctCount}/{gradingResult.totalQuestions} câu đúng)
                    </span>
                    <span className="font-black text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 shadow-sm">
                      {gradingResult.passed ? 'ĐẠT YÊU CẦU' : 'CẦN ÔN LẠI'}
                    </span>
                  </div>
                  <p className="font-medium text-xs leading-relaxed">
                    {gradingResult.feedbackVi}
                  </p>
                  <p className="text-[11px] opacity-80 pt-1">
                    ✓ Bộ nhớ học tập SQLite đã tự động đồng bộ tiến độ và mức độ thành thạo của bạn!
                  </p>
                </div>
              )}

              {/* Interactive Exercises List */}
              <div className="space-y-5">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary-600" />
                  <span>Bài Tập Vận Dụng & Kiểm Tra Cuối Bài</span>
                </h3>

                {[...(activeLesson.exercises || []), ...(activeLesson.quiz || [])].map((ex: any, idx: number) => {
                  const currentAnswer = userAnswers[ex.id] || '';
                  const graded = gradingResult?.gradingDetails?.find((d: any) => d.id === ex.id);

                  return (
                    <div
                      key={ex.id || idx}
                      className={`p-5 rounded-2xl border transition-all ${
                        graded
                          ? graded.isCorrect
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Câu {idx + 1}: {ex.type === 'fill_blank' ? 'Điền từ thích hợp' : ex.type === 'reorder' ? 'Sắp xếp câu đúng' : ex.type === 'translate' ? 'Dịch câu' : 'Chọn đáp án đúng'}
                        </span>
                        {ex.hint && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> {ex.hint}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {ex.question}
                      </div>

                      {/* Options (if available) */}
                      {ex.options && Array.isArray(ex.options) && ex.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                          {ex.options.map((opt: string, optIdx: number) => {
                            const isSelected = currentAnswer === opt;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  setUserAnswers({
                                    ...userAnswers,
                                    [ex.id]: opt
                                  });
                                }}
                                className={`p-3 rounded-xl text-xs font-semibold text-left border transition-all ${
                                  isSelected
                                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-primary-400'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pt-3">
                          <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => {
                              setUserAnswers({
                                ...userAnswers,
                                [ex.id]: e.target.value
                              });
                            }}
                            placeholder="Nhập câu trả lời của bạn..."
                            className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      )}

                      {/* Explanation feedback after grading */}
                      {graded && (
                        <div className={`mt-3 p-3 rounded-xl text-xs space-y-1 ${
                          graded.isCorrect ? 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-100/70 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
                        }`}>
                          <div className="font-bold">
                            {graded.isCorrect ? '✓ Hoàn toàn chính xác!' : `✗ Chưa chính xác. Đáp án đúng: "${graded.correctAnswer}"`}
                          </div>
                          {graded.explanation && (
                            <div className="opacity-90">{graded.explanation}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setLessonTab('content')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  ← Xem lại lý thuyết
                </button>

                <button
                  onClick={handleSubmitExercises}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Đang chấm điểm...' : 'Nộp Bài & Đồng Bộ Tiến Độ'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LESSONS LIST VIEW */
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            {[
              { id: 'all', label: 'Tất cả bài học' },
              { id: 'unstarted', label: 'Chưa học' },
              { id: 'completed', label: 'Đã hoàn thành' },
              { id: 'reinforce', label: 'Củng cố lỗi sai' },
              { id: 'new', label: 'Bài mới' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  selectedFilter === f.id
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lessons Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Đang tải danh sách bài học cá nhân hóa từ Backend SQLite...
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-primary-400 mx-auto" />
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Chưa có bài học nào trong danh mục này
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy trò chuyện với Lão Sư AI tại phân hệ <strong>AI Tutor</strong> hoặc bấm nút bên dưới để AI tự động tạo bài học cá nhân hóa cho bạn!
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
              >
                Tạo bài học đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map(lesson => {
                const isCompleted = lesson.status === 'completed';
                return (
                  <div
                    key={lesson.id}
                    onClick={() => handleStartLesson(lesson)}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {getLessonTypeBadge(lesson.lessonType)}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            HSK {lesson.hskLevel}
                          </span>
                        </div>

                        {isCompleted && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {lesson.score || 100}đ
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-base text-slate-800 dark:text-slate-100 leading-snug">
                        {lesson.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {lesson.recommendationReason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> {lesson.estimatedMinutes} phút
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDeleteLesson(lesson.id, e)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Xóa bài học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          {isCompleted ? 'Ôn lại' : 'Bắt đầu học'} <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE LESSON MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Tạo Bài Học Cá Nhân Hóa Với AI
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hệ thống sẽ đối chiếu bộ nhớ lỗi sai và lịch sử các bài đã dạy để đảm bảo bài học có tính kế thừa và chống trùng lặp.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Chủ đề hoặc kỹ năng muốn học:
                </label>
                <input
                  type="text"
                  value={createTopic}
                  onChange={(e) => setCreateTopic(e.target.value)}
                  placeholder="Để trống nếu muốn AI tự chọn theo lỗi sai cần khắc phục..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mục tiêu bài học:
                </label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="reinforce">Củng cố & Khắc phục lỗi sai thường gặp (Khuyên dùng)</option>
                  <option value="review">Ôn tập kiến thức đã giới thiệu</option>
                  <option value="new">Học kiến thức mới hoàn toàn</option>
                  <option value="advanced">Mở rộng & Nâng cao ngữ pháp</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateLesson}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700 disabled:opacity-50"
              >
                {isGenerating ? 'AI đang biên soạn...' : 'Bắt đầu biên soạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
