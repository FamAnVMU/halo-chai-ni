import React, { useEffect, useState } from 'react';
import {
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  Mic,
  PenTool,
  Trophy,
  CheckCircle2,
  Volume2,
  Award,
} from 'lucide-react';
import type { UserProfile, LessonContent, SRSCard, Vocabulary } from '../types';
import { db } from '../db';
import { backendClient } from '../utils/backendClient';
import { RubyText } from '../components/common/RubyText';
import { audioService } from '../utils/audio';
import type { NavTab } from '../components/layout/Sidebar';

interface HomeViewProps {
  user: UserProfile | undefined;
  onNavigate: (tab: NavTab, params?: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ user, onNavigate }) => {
  const [dueCardsCount, setDueCardsCount] = useState<number>(0);
  const [nextLesson, setNextLesson] = useState<LessonContent | null>(null);
  const [recentVocabs, setRecentVocabs] = useState<Vocabulary[]>([]);
  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(0);
  const [totalVocabsCount, setTotalVocabsCount] = useState<number>(0);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Lấy thông tin hàng đợi SRS và số thẻ đến hạn từ SQLite Backend chung
      const srsDash = await backendClient.getSrsDashboard();
      if (srsDash.success && srsDash.data) {
        setDueCardsCount(srsDash.data.dueToday ?? 0);
      } else {
        const dueCards = await db.srsCards
          .filter((c: SRSCard) => c.nextReviewDate <= today)
          .count();
        setDueCardsCount(dueCards);
      }

      // 2. Lấy số lượng từ vựng và 5 từ mới nhất từ SQLite vocabulary_memory
      const memRes = await backendClient.getFullMemory();
      if (memRes.success && memRes.data?.vocabulary && memRes.data.vocabulary.length > 0) {
        setTotalVocabsCount(memRes.data.vocabulary.length);
        const mappedVocabs: Vocabulary[] = memRes.data.vocabulary.slice(0, 5).map((v: any) => ({
          id: v.id,
          simplified: v.simplified,
          traditional: v.traditional || v.simplified,
          pinyin: v.pinyin,
          meaningVi: v.meaning_vi,
          wordType: v.word_type || 'từ vựng',
          hskLevel: v.hsk_level || 1,
          isFavorite: v.is_favorite === 1,
          createdAt: v.first_taught_at || Date.now(),
        }));
        setRecentVocabs(mappedVocabs);
      } else {
        const totalVocab = await db.vocabularies.count();
        setTotalVocabsCount(totalVocab);
        const vocabs = await db.vocabularies.limit(5).toArray();
        setRecentVocabs(vocabs);
      }
    } catch (e) {
      console.warn('Lỗi khi nạp dữ liệu trang chủ từ backend, dùng local cache:', e);
      const dueCards = await db.srsCards
        .filter((c: SRSCard) => c.nextReviewDate <= today)
        .count();
      setDueCardsCount(dueCards);
      const totalVocab = await db.vocabularies.count();
      setTotalVocabsCount(totalVocab);
      const vocabs = await db.vocabularies.limit(5).toArray();
      setRecentVocabs(vocabs);
    }

    // Bài học tiếp theo & số bài đã hoàn thành
    const uncompleted = await db.lessons
      .filter((l: LessonContent) => !l.completed)
      .first();
    setNextLesson(uncompleted || null);

    const completed = await db.lessons
      .filter((l: LessonContent) => Boolean(l.completed))
      .count();
    setCompletedLessonsCount(completed);
  };

  const dailyProverb = {
    zh: '千里之行，始于足下。',
    pinyin: 'Qiānlǐ zhī xíng, shǐ yú zú xià.',
    vi: 'Hành trình ngàn dặm bắt đầu từ một bước chân. (Lão Tử)',
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-rose-500 text-white p-6 sm:p-8 shadow-xl shadow-primary-700/20">
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none select-none text-[160px] font-chinese font-black leading-none">
          学
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Chào mừng trở lại, {user?.name || 'Bạn'}!</span>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            <RubyText
              text="学而时习之"
              className="text-white"
              charClassName="text-3xl sm:text-4xl font-chinese font-bold"
              rtClassName="text-rose-200"
              clickableWords={false}
            />
          </div>

          <p className="text-sm sm:text-base text-rose-100/90 font-medium mb-6">
            "Học mà thường xuyên ôn tập, chẳng phải vui lắm sao?" Tiếp tục duy trì phong độ và kiên trì mỗi ngày nhé!
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('ai_tutor')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 font-bold text-sm shadow-md hover:bg-rose-50 active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4 text-primary-600" />
              <span>Voice Chat Với AI</span>
            </button>

            <button
              onClick={() => onNavigate('ai_lessons')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-sm border border-white/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Bài Học Dành Cho Bạn</span>
            </button>

            {nextLesson && (
              <button
                onClick={() => onNavigate('roadmap')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-md text-white font-semibold text-sm border border-white/20 transition-all"
              >
                <span>Học tiếp Bài {nextLesson.lessonNumber}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Placement Test Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-rose-500/10 border border-amber-300 dark:border-amber-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                Khảo thí AI
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">
                Kiểm tra trình độ tiếng Trung đầu vào bằng AI
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Đánh giá thực chất 6 kỹ năng (Từ vựng, Ngữ pháp, Đọc, Nghe, Viết, Giao tiếp) để xác định điểm xuất phát và tối ưu lộ trình học.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('placement_test')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shrink-0 shadow hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
        >
          <span>Làm bài kiểm tra</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chuỗi học tập</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {user?.streakDays || 1} <span className="text-sm font-semibold text-slate-500">ngày</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã hoạt động hôm nay
          </div>
        </div>

        <div
          onClick={() => onNavigate('vocab')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col cursor-pointer hover:border-primary-400 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cần ôn (SRS)</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
            {dueCardsCount} <span className="text-sm font-semibold text-slate-500">từ</span>
          </div>
          <div className="text-[11px] text-primary-600 dark:text-primary-400 mt-1 font-medium">
            Nhấn để ôn tập ngay &rarr;
          </div>
        </div>

        <div
          onClick={() => onNavigate('roadmap')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col cursor-pointer hover:border-primary-400 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Bài hoàn thành</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {completedLessonsCount} <span className="text-sm font-semibold text-slate-500">bài</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Mục tiêu: HSK {user?.targetHskLevel || 3}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng kho từ vựng</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {totalVocabsCount} <span className="text-sm font-semibold text-slate-500">từ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            HSK 1 - HSK 6
          </div>
        </div>
      </div>

      {/* Featured Quick Training Modes */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Khu Vực Luyện Tập Nhanh</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('pronounce')}
            className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3 shadow-md shadow-amber-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
              Bảng Phát Âm & Chấm Điểm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Luyện 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc biến điệu và sửa lỗi phát âm người Việt.
            </p>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              Luyện phát âm &rarr;
            </span>
          </div>

          <div
            onClick={() => onNavigate('write')}
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200 dark:border-indigo-800/50 hover:border-indigo-400 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-500/20">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
              Luyện Viết Chữ Hán
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Mô phỏng thứ tự từng nét bút chuẩn xác, bảng vẽ cảm ứng chấm điểm độ chuẩn nét chữ Hán.
            </p>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              Tập viết ngay &rarr;
            </span>
          </div>

          <div
            onClick={() => onNavigate('practice')}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400 cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
              11 Dạng Bài Tập Tương Tác
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Trắc nghiệm, nối từ, ghép câu, dịch thuật, điền từ, nghe - chọn đáp án và đọc câu.
            </p>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              Vào luyện tập &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Daily Proverb */}
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            <Sparkles className="w-4 h-4" />
            <span>Danh Ngôn Tiếng Trung Mỗi Ngày</span>
          </div>
          <button
            onClick={() => audioService.speak(dailyProverb.zh)}
            className="p-1 text-slate-400 hover:text-primary-600 rounded transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xl font-chinese font-bold text-slate-800 dark:text-slate-100 mb-1">
          {dailyProverb.zh}
        </div>
        <div className="text-xs text-rose-500 dark:text-rose-400 font-medium mb-1">
          {dailyProverb.pinyin}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-300">
          {dailyProverb.vi}
        </div>
      </div>

      {/* Recent Vocabularies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Từ Vựng Gần Đây
          </h2>
          <button
            onClick={() => onNavigate('vocab')}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Xem tất cả &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {recentVocabs.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-chinese text-slate-800 dark:text-slate-100">
                    {v.simplified}
                  </span>
                  <span className="text-xs text-rose-500 font-semibold">{v.pinyin}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {v.meaningVi}
                </div>
              </div>

              <button
                onClick={() => audioService.speak(v.simplified)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary-600 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
