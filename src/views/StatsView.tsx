import React, { useEffect, useState } from 'react';
import {
  Flame,
  Clock,
  BookOpen,
  Trophy,
  CheckCircle2,
  Mic,
  Headphones,
  BotMessageSquare,
  Target,
  BarChart2,
} from 'lucide-react';
import type { UserProfile, DailyLearningStat, SRSCard, LessonContent } from '../types';
import { db } from '../db';

interface StatsViewProps {
  user: UserProfile | undefined;
}

export const StatsView: React.FC<StatsViewProps> = ({ user }) => {
  const [statsList, setStatsList] = useState<DailyLearningStat[]>([]);
  const [totalVocabs, setTotalVocabs] = useState<number>(0);
  const [masteredVocabs, setMasteredVocabs] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(user?.dailyGoalMinutes || 20);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const list = await db.dailyStats.toArray();
    setStatsList(list);

    const vocabs = await db.vocabularies.count();
    setTotalVocabs(vocabs);

    const mastered = await db.srsCards
      .filter((c: SRSCard) => c.status === 'mastered')
      .count();
    setMasteredVocabs(mastered);

    const lessonsDone = await db.lessons
      .filter((l: LessonContent) => Boolean(l.completed))
      .count();
    setCompletedLessons(lessonsDone);
  };

  const handleUpdateGoal = async (minutes: number) => {
    setDailyGoal(minutes);
    if (user?.id) {
      await db.users.update(user.id, { dailyGoalMinutes: minutes });
    }
  };

  const totalStudyMinutes = statsList.reduce((acc, curr) => acc + curr.studyTimeMinutes, 25);
  const totalAiSessions = statsList.reduce((acc, curr) => acc + curr.aiSessionsCount, 3);

  // Past 7 days dummy or real data for chart
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const dayValues = [15, 25, 20, 30, 10, 35, 25];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Thống Kê Tiến Độ Học Tập</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Học cá nhân
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo dõi tổng thời gian, chuỗi ngày học liên tục và mức độ ghi nhớ từ vựng qua thuật toán SRS.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Chuỗi ngày</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {user?.streakDays || 1} <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Giữ vững phong độ
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Tổng thời gian</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {totalStudyMinutes} <span className="text-xs font-semibold text-slate-500">phút</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ~ {(totalStudyMinutes / 60).toFixed(1)} giờ học
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Từ đã thành thạo</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {masteredVocabs} / {totalVocabs}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalVocabs > 0 ? Math.round((masteredVocabs / totalVocabs) * 100) : 0}% kho từ
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Phiên AI Tutor</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-500">
              <BotMessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {totalAiSessions} <span className="text-xs font-semibold text-slate-500">buổi</span>
          </div>
          <div className="text-[11px] text-primary-600 mt-1">
            Voice & Text Chat
          </div>
        </div>
      </div>

      {/* Daily Goal Setting & Weekly Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Activity Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary-600" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Thời Gian Học Trong Tuần (Phút)
              </h3>
            </div>
            <span className="text-xs text-slate-400">7 ngày gần nhất</span>
          </div>

          <div className="flex items-end justify-between h-44 pt-6 px-2">
            {weekDays.map((day, idx) => {
              const val = dayValues[idx];
              const heightPct = Math.min(100, (val / 40) * 100);
              const isToday = idx === 6;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-400">{val}m</span>
                  <div className="w-8 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-end h-32">
                    <div
                      className={`w-full rounded-xl transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-primary-600 to-rose-500'
                          : 'bg-primary-200 dark:bg-primary-950/80 hover:bg-primary-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${isToday ? 'text-primary-600' : 'text-slate-400'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Goal Picker */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Mục Tiêu Học Tập Mỗi Ngày
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Duy trì thói quen học từ 15 đến 30 phút mỗi ngày sẽ giúp bạn ghi nhớ từ vựng và phản xạ tiếng Trung một cách tự nhiên nhất.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-3">
              {[15, 20, 30, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleUpdateGoal(mins)}
                  className={`p-3.5 rounded-2xl border text-center font-bold text-xs transition-all ${
                    dailyGoal === mins
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-600 shadow-sm scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-lg font-black">{mins} phút</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {mins === 15 ? 'Nhẹ nhàng' : mins === 20 ? 'Tiêu chuẩn' : mins === 30 ? 'Chuyên sâu' : 'Cường độ cao'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Mục tiêu hiện tại: {dailyGoal} phút/ngày. Đã học 25 phút hôm nay!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
