import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Play,
  RotateCcw,
  Volume2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type { ListeningItem, HSKLevel } from '../types';
import { db } from '../db';
import { audioService } from '../utils/audio';

export const ListeningView: React.FC = () => {
  const [listeningList, setListeningList] = useState<ListeningItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    loadListening();
  }, []);

  const loadListening = async () => {
    const list = await db.listening.toArray();
    setListeningList(list);
  };

  const currentItem = listeningList[currentIdx];

  const handlePlayAudio = () => {
    if (!currentItem) return;
    audioService.speak(currentItem.audioText, { rate: playbackSpeed });
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (checked) return;
    setAnswers({ ...answers, [qIdx]: optIdx });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-3xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Luyện Nghe Hiểu Phân Cấp</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            HSK Listening Drills
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Luyện nghe hội thoại thực tế, điều chỉnh tốc độ đọc và làm bài tập trắc nghiệm kiểm tra.
        </p>
      </div>

      {currentItem && (
        <div className="space-y-4">
          {/* Audio Player Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-rose-600 text-white shadow-xl shadow-primary-700/20 text-center space-y-5">
            <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              HSK {currentItem.hskLevel} • Bài {currentIdx + 1} / {listeningList.length}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold">{currentItem.title}</h2>

            {/* Play Button */}
            <div className="flex justify-center py-2">
              <button
                onClick={handlePlayAudio}
                className="w-20 h-20 rounded-full bg-white text-primary-700 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                <Play className="w-8 h-8 fill-primary-700 translate-x-0.5" />
              </button>
            </div>

            {/* Speed selection */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-xs text-rose-100 font-semibold mr-1">Tốc độ:</span>
              {[0.8, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-white text-primary-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {spd === 0.8 ? 'Chậm (0.8x)' : spd === 1.0 ? 'Chuẩn (1.0x)' : 'Nhanh (1.2x)'}
                </button>
              ))}
            </div>

            {/* Transcript Reveal Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-black/20 text-xs font-semibold text-rose-100 hover:bg-black/30 transition-colors"
              >
                {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTranscript ? 'Ẩn lời thoại (Script)' : 'Xem lời thoại & Pinyin'}</span>
              </button>
            </div>

            {/* Transcript Content */}
            {showTranscript && (
              <div className="p-4 rounded-2xl bg-black/30 text-left space-y-1.5 text-xs animate-in fade-in duration-150">
                <div className="font-chinese font-bold text-base text-white">
                  {currentItem.audioText}
                </div>
                <div className="text-rose-200 font-semibold">{currentItem.pinyin}</div>
                <div className="text-rose-100/80 pt-1 border-t border-white/20">
                  {currentItem.meaningVi}
                </div>
              </div>
            )}
          </div>

          {/* Comprehension Questions */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Câu Hỏi Kiểm Tra Sau Khi Nghe:
            </h3>

            <div className="space-y-4">
              {currentItem.questions.map((q, qIdx) => {
                const selectedOpt = answers[qIdx];
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
                          disabled={checked}
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

                    {checked && (
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
                            {isCorrect ? 'Chính xác! ' : 'Chưa đúng. '}
                          </span>
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex gap-3">
              {!checked ? (
                <button
                  onClick={() => {
                    setChecked(true);
                    audioService.playCorrectSound();
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setChecked(false);
                      setAnswers({});
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100"
                  >
                    Nghe & Làm lại
                  </button>
                  {currentIdx + 1 < listeningList.length && (
                    <button
                      onClick={() => {
                        setCurrentIdx((i) => i + 1);
                        setChecked(false);
                        setAnswers({});
                        setShowTranscript(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
                    >
                      Bài tiếp theo &rarr;
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
