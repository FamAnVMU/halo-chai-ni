import React, { useEffect, useState } from 'react';
import {
  BookMarked,
  Volume2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type { GradedStory, HSKLevel } from '../types';
import { db } from '../db';
import { RubyText } from '../components/common/RubyText';
import { ClickableChineseText } from '../components/dictionary/ClickableChineseText';
import { audioService } from '../utils/audio';

export const ReadingView: React.FC = () => {
  const [stories, setStories] = useState<GradedStory[]>([]);
  const [selectedHsk, setSelectedHsk] = useState<number | 'all'>('all');
  const [currentStory, setCurrentStory] = useState<GradedStory | null>(null);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<boolean>(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    const list = await db.stories.toArray();
    setStories(list);
    if (list.length > 0) {
      setCurrentStory(list[0]);
    }
  };

  const filteredStories = stories.filter((s) => {
    if (selectedHsk === 'all') return true;
    return s.hskLevel === selectedHsk;
  });

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (checkedQuestions) return;
    setAnswers({ ...answers, [qIdx]: optIdx });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Thư Viện Đọc Hiểu Phân Cấp</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Graded Readers
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Truyện đọc theo từng cấp độ HSK, hỗ trợ tra từ tức thì, nghe audio và câu hỏi kiểm tra độ hiểu.
        </p>
      </div>

      {/* Level Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedHsk('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            selectedHsk === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          Tất cả truyện
        </button>
        {[1, 2, 3, 4].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedHsk(lvl as HSKLevel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              selectedHsk === lvl
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            HSK {lvl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Story List Side Navigation */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Danh sách bài đọc:
          </div>
          {filteredStories.map((story) => (
            <button
              key={story.id}
              onClick={() => {
                setCurrentStory(story);
                setAnswers({});
                setCheckedQuestions(false);
                setShowTranslation(false);
              }}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                currentStory?.id === story.id
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/60 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300">
                  HSK {story.hskLevel}
                </span>
                <span className="text-[10px] text-slate-400">
                  {story.questions.length} câu hỏi
                </span>
              </div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 font-chinese">
                {story.titleZh}
              </div>
              <div className="text-xs text-slate-500 truncate">{story.titleVi}</div>
            </button>
          ))}
        </div>

        {/* Story Reader Main Panel */}
        {currentStory && (
          <div className="md:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-black font-chinese text-slate-800 dark:text-slate-100">
                    {currentStory.titleZh}
                  </h2>
                  <div className="text-xs text-rose-500 font-semibold">
                    {currentStory.titlePinyin}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{currentStory.titleVi}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600 transition-colors"
                    title={showTranslation ? 'Ẩn bản dịch tiếng Việt' : 'Hiện bản dịch tiếng Việt'}
                  >
                    {showTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => audioService.speak(currentStory.contentZh)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Nghe audio</span>
                  </button>
                </div>
              </div>

              {/* Interactive Story Content with Clickable Dictionary Lookup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Văn bản tương tác:</span>
                  <span className="text-primary-600 dark:text-primary-400">👉 Nhấn vào bất kỳ từ nào để tra từ điển</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-lg sm:text-xl leading-loose">
                  <ClickableChineseText
                    text={currentStory.contentZh}
                    onWordClick={(w) => {
                      window.dispatchEvent(new CustomEvent('halo:quick-dict', { detail: { word: w } }));
                    }}
                  />
                </div>
              </div>

              {/* Story Content with Ruby Pinyin */}
              <div className="p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20 border border-slate-200/40 dark:border-slate-700/40 leading-loose">
                <div className="text-[11px] font-bold text-slate-400 mb-2">Phiên âm Pinyin kèm chữ Hán:</div>
                <RubyText
                  text={currentStory.contentZh}
                  charClassName="text-base sm:text-lg font-chinese font-medium leading-relaxed"
                />
              </div>

              {/* Vietnamese Translation Accordion */}
              {showTranslation && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Bản dịch tiếng Việt:
                  </span>
                  {currentStory.contentVi}
                </div>
              )}
            </div>

            {/* Comprehension Questions */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Câu Hỏi Đọc Hiểu ({currentStory.questions.length} câu)
              </h3>

              <div className="space-y-4">
                {currentStory.questions.map((q, qIdx) => {
                  const selectedOpt = answers[qIdx];
                  const isAnswered = selectedOpt !== undefined;
                  const isCorrect = selectedOpt === q.answer;

                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Câu {qIdx + 1}: {q.question}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            disabled={checkedQuestions}
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                              selectedOpt === optIdx
                                ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-600'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {checkedQuestions && (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold">
                              {isCorrect ? 'Đúng! ' : 'Chưa đúng. '}
                            </span>
                            {q.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!checkedQuestions ? (
                <button
                  onClick={() => {
                    setCheckedQuestions(true);
                    audioService.playCorrectSound();
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
                >
                  Kiểm tra câu trả lời
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCheckedQuestions(false);
                    setAnswers({});
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100"
                >
                  Làm lại câu hỏi
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
