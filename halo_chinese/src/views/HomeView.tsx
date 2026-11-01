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
  Headphones,
  BookA,
} from 'lucide-react';
import type { UserProfile, LessonContent, SRSCard, Vocabulary } from '../types';
import { db } from '../db';
import { backendClient } from '../utils/backendClient';
import { RubyText } from '../components/common/RubyText';
import { audioService } from '../utils/audio';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
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
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-4xl mx-auto overflow-x-hidden pb-12">
      {/* Hero Welcome Card */}
      <Card variant="highlight" className="p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute right-2 bottom-0 translate-x-4 translate-y-6 opacity-10 pointer-events-none select-none text-[140px] font-chinese font-black leading-none text-[#355A26] dark:text-[#A3D635]">
          学
        </div>

        <div className="relative z-10 flex flex-col gap-3 max-w-xl">
          <div className="flex items-center gap-2">
            <Badge variant="lime" size="sm">
              <Sparkles className="w-3 h-3 text-[#355A26] dark:text-[#C2E58C]" />
              <span>Chào mừng trở lại, {user?.name || 'Bạn'}!</span>
            </Badge>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#263326] dark:text-[#EAF5D5]">
            <RubyText
              text="学而时习之"
              className="text-[#263326] dark:text-[#EAF5D5]"
              charClassName="text-2xl sm:text-3xl font-chinese font-bold"
              rtClassName="text-rose-500 font-semibold"
              clickableWords={false}
            />
          </div>

          <p className="text-xs sm:text-sm text-[#647560] dark:text-[#889B84] leading-relaxed">
            "Học mà thường xuyên ôn tập, chẳng phải vui lắm sao?" Tiếp tục duy trì phong độ và kiên trì rèn luyện mỗi ngày nhé!
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('ai_tutor')}
            >
              <Mic className="w-4 h-4 mr-1.5" />
              Voice Chat với AI
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('ai_lessons')}
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
              Bài học cho bạn
            </Button>

            {nextLesson && (
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate('roadmap')}
              >
                <span>Học tiếp Bài {nextLesson.lessonNumber}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* AI Placement Assessment Banner */}
      <Card
        variant="default"
        interactive
        onClick={() => onNavigate('placement_test')}
        className="p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-[#A3D635]/50 hover:border-[#A3D635]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Badge variant="lime" size="sm">Đánh giá chuẩn</Badge>
              <h3 className="text-sm sm:text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Khảo sát năng lực tiếng Trung đầu vào
              </h3>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
              Đánh giá thực chất 6 kỹ năng (Từ vựng, Ngữ pháp, Đọc, Nghe, Viết, Giao tiếp Live) để phân lớp và tối ưu lộ trình.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto shrink-0"
        >
          <span>Làm bài kiểm tra</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Card>

      {/* Quick Progress Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#647560] dark:text-[#889B84]">Chuỗi ngày</span>
            <div className="p-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#263326] dark:text-[#EAF5D5]">
            {user?.streakDays || 1} <span className="text-xs font-medium text-[#647560]">ngày</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Đã học hôm nay
          </div>
        </Card>

        <Card
          variant="default"
          interactive
          onClick={() => onNavigate('vocab')}
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#647560] dark:text-[#889B84]">Cần ôn (SRS)</span>
            <div className="p-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {dueCardsCount} <span className="text-xs font-medium text-[#647560]">từ</span>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-0.5">
            Ôn ngay &rarr;
          </div>
        </Card>

        <Card
          variant="default"
          interactive
          onClick={() => onNavigate('roadmap')}
          className="p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#647560] dark:text-[#889B84]">Đã hoàn thành</span>
            <div className="p-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#263326] dark:text-[#EAF5D5]">
            {completedLessonsCount} <span className="text-xs font-medium text-[#647560]">bài</span>
          </div>
          <div className="text-[11px] text-[#647560] dark:text-[#889B84] mt-1">
            Mục tiêu: HSK {user?.targetHskLevel || 3}
          </div>
        </Card>

        <Card variant="default" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#647560] dark:text-[#889B84]">Kho từ vựng</span>
            <div className="p-1 rounded-xl bg-[#EAF5D5] dark:bg-[#202D1D] text-[#355A26] dark:text-[#C2E58C]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#263326] dark:text-[#EAF5D5]">
            {totalVocabsCount} <span className="text-xs font-medium text-[#647560]">từ</span>
          </div>
          <div className="text-[11px] text-[#647560] dark:text-[#889B84] mt-1">
            HSK 1 - HSK 6
          </div>
        </Card>
      </div>

      {/* Featured Quick Training Modes */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5] flex items-center gap-2">
          <span>Khu Vực Luyện Tập Nhanh</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card
            interactive
            onClick={() => onNavigate('pronounce')}
            className="p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] flex items-center justify-center mb-2.5">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#263326] dark:text-[#EAF5D5] text-sm mb-1">
                Phòng Lab Phát Âm AI
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84]">
                Luyện 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc biến điệu và nhận diện giọng nói tức thì.
              </p>
            </div>
            <span className="text-xs font-bold text-[#355A26] dark:text-[#A3D635] flex items-center gap-1">
              Luyện phát âm &rarr;
            </span>
          </Card>

          <Card
            interactive
            onClick={() => onNavigate('shadowing')}
            className="p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] flex items-center justify-center mb-2.5">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#263326] dark:text-[#EAF5D5] text-sm mb-1">
                Shadowing (Nói nhại AI)
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84]">
                Luyện ngữ điệu tự nhiên, tốc độ nói và phản xạ nói đuổi theo giọng đọc bản xứ.
              </p>
            </div>
            <span className="text-xs font-bold text-[#355A26] dark:text-[#A3D635] flex items-center gap-1">
              Luyện nói nhại &rarr;
            </span>
          </Card>

          <Card
            interactive
            onClick={() => onNavigate('practice')}
            className="p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] flex items-center justify-center mb-2.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#263326] dark:text-[#EAF5D5] text-sm mb-1">
                11 Dạng Bài Tập Tương Tác
              </h3>
              <p className="text-xs text-[#647560] dark:text-[#889B84]">
                Trắc nghiệm, nối từ, ghép câu, dịch thuật, điền từ khuyết, nghe - chọn đáp án và đọc câu.
              </p>
            </div>
            <span className="text-xs font-bold text-[#355A26] dark:text-[#A3D635] flex items-center gap-1">
              Vào luyện tập &rarr;
            </span>
          </Card>
        </div>
      </div>

      {/* Daily Proverb */}
      <Card variant="soft" className="p-4.5 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#355A26] dark:text-[#C2E58C]">
            <Sparkles className="w-4 h-4" />
            <span>Danh Ngôn Tiếng Trung Mỗi Ngày</span>
          </div>
          <button
            onClick={() => audioService.speak(dailyProverb.zh)}
            className="touch-target w-8 h-8 rounded-full text-[#647560] hover:text-[#263326] dark:hover:text-[#EAF5D5] transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-lg sm:text-xl font-chinese font-bold text-[#263326] dark:text-[#EAF5D5] mb-1">
          {dailyProverb.zh}
        </div>
        <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">
          {dailyProverb.pinyin}
        </div>
        <div className="text-xs text-[#647560] dark:text-[#889B84]">
          {dailyProverb.vi}
        </div>
      </Card>

      {/* Recent Vocabularies */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
            Từ Vựng Gần Đây
          </h2>
          <button
            onClick={() => onNavigate('vocab')}
            className="text-xs font-bold text-[#355A26] dark:text-[#A3D635] hover:underline"
          >
            Xem tất cả &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {recentVocabs.map((v) => (
            <Card
              key={v.id}
              className="p-3.5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-chinese text-[#263326] dark:text-[#EAF5D5]">
                    {v.simplified}
                  </span>
                  <span className="text-xs text-rose-500 font-semibold">{v.pinyin}</span>
                </div>
                <div className="text-xs text-[#647560] dark:text-[#889B84] mt-0.5">
                  {v.meaningVi}
                </div>
              </div>

              <button
                onClick={() => audioService.speak(v.simplified)}
                className="touch-target w-9 h-9 rounded-xl bg-[#F6FAF2] dark:bg-[#151D14] text-[#647560] dark:text-[#889B84] hover:text-[#263326] dark:hover:text-[#EAF5D5] transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
