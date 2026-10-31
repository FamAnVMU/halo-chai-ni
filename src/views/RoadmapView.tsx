import React, { useEffect, useState } from 'react';
import {
  Trophy,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
} from 'lucide-react';
import type { LessonContent, HSKLevel } from '../types';
import type { NavTab } from '../components/layout/Sidebar';
import { db } from '../db';
import { RubyText } from '../components/common/RubyText';

interface RoadmapViewProps {
  onSelectLesson: (lesson: LessonContent) => void;
  onNavigate?: (tab: NavTab) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ onSelectLesson, onNavigate }) => {
  const [selectedHsk, setSelectedHsk] = useState<HSKLevel>(1);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [freeMode, setFreeMode] = useState<boolean>(true); // Cho phép tự do chọn bài học theo yêu cầu

  useEffect(() => {
    loadLessons(selectedHsk);
  }, [selectedHsk]);

  const loadLessons = async (hsk: HSKLevel) => {
    const list = await db.lessons.where('hskLevel').equals(hsk).toArray();
    setLessons(list);
  };

  const hskLevels: Array<{ level: HSKLevel; label: string; desc: string; vocabTarget: number }> = [
    { level: 1, label: 'HSK 1', desc: 'Nhập môn & Giao tiếp cơ bản', vocabTarget: 150 },
    { level: 2, label: 'HSK 2', desc: 'Đời sống & Mua sắm du lịch', vocabTarget: 300 },
    { level: 3, label: 'HSK 3', desc: 'Giao tiếp công việc & Du học', vocabTarget: 600 },
    { level: 4, label: 'HSK 4', desc: 'Thảo luận chủ đề chuyên sâu', vocabTarget: 1200 },
    { level: 5, label: 'HSK 5', desc: 'Đọc báo & Thuyết trình chuyên nghiệp', vocabTarget: 2500 },
    { level: 6, label: 'HSK 6', desc: 'Thông thạo bản xứ & Luận văn', vocabTarget: 5000 },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Level Selection Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Lộ Trình Học HSK</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              Có cấu trúc & Mở khóa tự do
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chọn cấp độ HSK bạn muốn học. Hệ thống lưu tiến độ tự động sau mỗi bài học.
          </p>
        </div>

        {/* Free Navigation Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2">
            Học tự do:
          </span>
          <button
            onClick={() => setFreeMode(!freeMode)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              freeMode
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {freeMode ? 'Bật (Tùy chọn bài)' : 'Tắt (Theo tuần tự)'}
          </button>
        </div>
      </div>

      {/* AI Placement Quick Banner */}
      {onNavigate && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Chưa rõ nên bắt đầu từ cấp độ HSK nào?
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Làm bài kiểm tra đầu vào bằng AI để xác định chính xác trình độ và điểm khuyết thiếu.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('placement_test')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shrink-0 transition-colors"
          >
            Kiểm tra ngay
          </button>
        </div>
      )}

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
        {lessons.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Đang hoàn thiện nội dung cho cấp độ HSK {selectedHsk}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hiện tại cấp độ HSK 1 và HSK 2 đã sẵn sàng đầy đủ bài học tương tác, hội thoại và bài tập. Bạn có thể chọn HSK 1 hoặc HSK 2 để bắt đầu ngay!
            </p>
          </div>
        ) : (
          lessons.map((lesson, idx) => {
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

                    {lesson.objectives && lesson.objectives.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Mục tiêu: {lesson.objectives[0]}
                      </div>
                    )}
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
  );
};
