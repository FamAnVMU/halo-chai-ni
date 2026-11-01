import React, { useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  Trophy,
  Mic,
  BookOpen,
  MessageSquare,
  BookmarkCheck,
  Dumbbell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { LessonContent, Exercise } from '../types';
import { db } from '../db';
import { RubyText } from '../components/common/RubyText';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';

interface LessonDetailViewProps {
  lesson: LessonContent;
  onBack: () => void;
  onFinishLesson: () => void;
}

type TabType = 'dialogue' | 'vocab' | 'grammar' | 'quiz';

export const LessonDetailView: React.FC<LessonDetailViewProps> = ({
  lesson,
  onBack,
  onFinishLesson,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dialogue');

  // Quiz state
  const [currentExIdx, setCurrentExIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [answered, setAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [scoreCount, setScoreCount] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // Read aloud / Speech recognition state for speech exercise
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechResultText, setSpeechResultText] = useState<string>('');
  const [speechScore, setSpeechScore] = useState<number | null>(null);

  // Word order exercise state
  const [assembledWords, setAssembledWords] = useState<string[]>([]);

  const currentExercise: Exercise | undefined = lesson.exercises[currentExIdx];

  const handleOptionSelect = (option: any) => {
    if (answered) return;
    setSelectedOption(option);
  };

  const handleWordOrderClick = (word: string) => {
    if (answered) return;
    if (assembledWords.includes(word)) {
      setAssembledWords(assembledWords.filter((w) => w !== word));
    } else {
      setAssembledWords([...assembledWords, word]);
    }
  };

  const checkAnswer = () => {
    if (!currentExercise || answered) return;

    let correct = false;

    if (currentExercise.type === 'multiple_choice' || currentExercise.type === 'translate_vi_zh' || currentExercise.type === 'translate_zh_vi' || currentExercise.type === 'match_word_meaning') {
      correct = selectedOption === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'match_hanzi_pinyin') {
      correct = selectedOption === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'fill_blank') {
      correct = selectedOption === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'word_order') {
      const assembledSentence = assembledWords.join(' ');
      correct = assembledSentence === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'hanzi_recognition') {
      correct = selectedOption === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'read_aloud') {
      correct = (speechScore ?? 0) >= 70;
    } else if (currentExercise.type === 'hanzi_writing') {
      correct = true; // Completed writing practice
    }

    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      audioService.playCorrectSound();
      setScoreCount((prev) => prev + 1);
    } else {
      audioService.playWrongSound();
    }
  };

  const nextExercise = async () => {
    if (currentExIdx + 1 < lesson.exercises.length) {
      setCurrentExIdx(currentExIdx + 1);
      setSelectedOption(null);
      setAnswered(false);
      setIsCorrect(false);
      setAssembledWords([]);
      setSpeechResultText('');
      setSpeechScore(null);
    } else {
      // Quiz finished
      setQuizFinished(true);
      const totalEx = lesson.exercises.length;
      const finalScorePct = Math.round((scoreCount / totalEx) * 100);

      // Save lesson completion to DB
      await db.lessons.update(lesson.id, {
        completed: true,
        score: finalScorePct,
        lastStudiedAt: Date.now(),
      });

      // Update today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayStat = await db.dailyStats.get(today);
      if (todayStat) {
        await db.dailyStats.update(today, {
          lessonsCompleted: todayStat.lessonsCompleted + 1,
          studyTimeMinutes: todayStat.studyTimeMinutes + 15,
        });
      }

      // Confetti celebration chime!
      audioService.playCelebrationChime();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  };

  const handleStartSpeaking = () => {
    setIsRecording(true);
    setSpeechResultText('Đang lắng nghe...');
    speechService.startListening(
      (payload) => {
        setSpeechResultText(payload.transcript);
        if (payload.isFinal && currentExercise?.questionZh) {
          const evalRes = speechService.evaluatePronunciation(
            payload.transcript,
            currentExercise.questionZh
          );
          setSpeechScore(evalRes.score);
        }
      },
      () => setIsRecording(false),
      (err) => {
        setIsRecording(false);
        console.error('Speech error:', err);
      }
    );
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-4xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại lộ trình</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          HSK {lesson.hskLevel} • Bài {lesson.lessonNumber}
        </div>
      </div>

      {/* Lesson Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-600 via-rose-600 to-rose-500 text-white shadow-lg shadow-primary-600/20">
        <div className="text-xs font-bold uppercase tracking-wider text-rose-200 mb-1">
          {lesson.titlePinyin}
        </div>
        <h1 className="text-2xl font-black mb-1">{lesson.titleVi}</h1>
        <div className="mt-2 text-rose-100 text-xs flex flex-wrap gap-2">
          {lesson.objectives.map((obj, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm">
              ✓ {obj}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('dialogue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'dialogue'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Hội Thoại</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'vocab'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Từ Vựng ({lesson.vocabularies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grammar')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'grammar'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Ngữ Pháp</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'quiz'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Bài Tập ({lesson.exercises.length})</span>
        </button>
      </div>

      {/* Tab 1: Dialogue */}
      {activeTab === 'dialogue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Mẹo: Bạn có thể nhấn vào từng từ chữ Hán để tra nghĩa tức thì.</span>
            <button
              onClick={() => {
                const fullText = lesson.dialogue.map((d) => d.zh).join(' ');
                audioService.speak(fullText);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-semibold"
            >
              <Volume2 className="w-4 h-4" />
              <span>Phát toàn bộ bài</span>
            </button>
          </div>

          <div className="space-y-3">
            {lesson.dialogue.map((line, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="text-xs font-bold text-primary-600 dark:text-primary-400">
                    {line.speaker}
                  </div>
                  <div>
                    <RubyText text={line.zh} pinyinOverride={line.pinyin} />
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                    {line.vi}
                  </div>
                </div>

                <button
                  onClick={() => audioService.speak(line.zh)}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors shrink-0"
                  title="Nghe câu này"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab('quiz')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-sm shadow-md hover:brightness-105 transition-all text-center"
          >
            Làm bài tập củng cố ngay &rarr;
          </button>
        </div>
      )}

      {/* Tab 2: Vocabularies */}
      {activeTab === 'vocab' && (
        <div className="space-y-3">
          {lesson.vocabularies.map((v, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-chinese text-slate-800 dark:text-slate-100">
                    {v.simplified}
                  </span>
                  <span className="text-sm font-semibold text-rose-500">
                    {v.pinyin}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                    {v.wordType}
                  </span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                  {v.meaningVi}
                </div>
                {v.exampleZh && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                    Ví dụ: {v.exampleZh} ({v.exampleVi})
                  </div>
                )}
              </div>

              <button
                onClick={() => audioService.speak(v.simplified)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Grammar */}
      {activeTab === 'grammar' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            Ngữ Pháp Trọng Tâm Trong Bài
          </h3>
          <p className="text-xs text-slate-500">
            Các điểm ngữ pháp được phân tích chi tiết với công thức và các lỗi thường gặp:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-sm text-primary-600 dark:text-primary-400">
              1. Câu chữ 是 (shì) - Khẳng định danh tính
            </div>
            <div className="text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Chủ ngữ + 是 + Danh từ / Cụm danh từ
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Ví dụ: 我是越南人 (Tôi là người Việt Nam). Phủ định: 不是 (bú shì).
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interactive Quiz Arena */}
      {activeTab === 'quiz' && (
        <div>
          {quizFinished ? (
            /* Quiz Completed Celebration Card */
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-5 shadow-lg">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  Hoàn Thành Xuất Sắc Bài Học!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Bạn đã trả lời đúng {scoreCount} / {lesson.exercises.length} câu hỏi.
                </p>
              </div>

              <div className="inline-block px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-extrabold text-xl">
                Điểm số: {Math.round((scoreCount / lesson.exercises.length) * 100)}%
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  onClick={() => {
                    setQuizFinished(false);
                    setCurrentExIdx(0);
                    setScoreCount(0);
                    setAnswered(false);
                    setSelectedOption(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
                >
                  Luyện tập lại
                </button>

                <button
                  onClick={onFinishLesson}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 text-white text-xs font-bold shadow-md hover:brightness-105"
                >
                  Về danh sách bài học &rarr;
                </button>
              </div>
            </div>
          ) : currentExercise ? (
            /* Active Exercise Screen */
            <div className="space-y-4">
              {/* Exercise Progress Bar */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>Câu {currentExIdx + 1} / {lesson.exercises.length}</span>
                <span className="capitalize">{currentExercise.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentExIdx + 1) / lesson.exercises.length) * 100}%`,
                  }}
                />
              </div>

              {/* Exercise Prompt Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {currentExercise.prompt}
                  </h3>
                  {currentExercise.questionZh && (
                    <button
                      onClick={() => audioService.speak(currentExercise.questionZh || '')}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600"
                      title="Nghe câu hỏi"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Question Chinese / Pinyin if any */}
                {currentExercise.questionZh && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center">
                    <RubyText text={currentExercise.questionZh} />
                    {currentExercise.questionVi && (
                      <div className="text-xs text-slate-500 mt-2 font-medium">
                        "{currentExercise.questionVi}"
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple choice or match options */}
                {currentExercise.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentExercise.options.map((opt, optIdx) => {
                      const isSelected = selectedOption === optIdx || selectedOption === opt;
                      return (
                        <button
                          key={optIdx}
                          disabled={answered}
                          onClick={() => handleOptionSelect(optIdx)}
                          className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all ${
                            isSelected
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            <span className="text-xs font-mono text-slate-400">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Word order exercise layout */}
                {currentExercise.type === 'word_order' && currentExercise.options && (
                  <div className="space-y-4">
                    {/* Assembled sentence area */}
                    <div className="min-h-[50px] p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-2 items-center">
                      {assembledWords.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          Nhấn vào các từ bên dưới để sắp xếp...
                        </span>
                      ) : (
                        assembledWords.map((word, wIdx) => (
                          <button
                            key={wIdx}
                            onClick={() => handleWordOrderClick(word)}
                            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-bold text-sm shadow-sm"
                          >
                            {word}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Word bubbles to click */}
                    <div className="flex flex-wrap gap-2">
                      {currentExercise.options.map((word, wIdx) => {
                        const isUsed = assembledWords.includes(word);
                        return (
                          <button
                            key={wIdx}
                            disabled={isUsed || answered}
                            onClick={() => handleWordOrderClick(word)}
                            className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                              isUsed
                                ? 'opacity-30 border-slate-300 bg-slate-100 text-slate-400'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-primary-500'
                            }`}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Read aloud microphone exercise */}
                {currentExercise.type === 'read_aloud' && (
                  <div className="text-center py-6 space-y-4">
                    <button
                      onClick={handleStartSpeaking}
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg transition-transform ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse scale-110'
                          : 'bg-primary-600 text-white hover:scale-105'
                      }`}
                    >
                      <Mic className="w-8 h-8" />
                    </button>
                    <div className="text-xs font-semibold text-slate-500">
                      {isRecording ? 'Đang ghi âm giọng nói...' : 'Nhấn nút Micro và đọc to câu trên'}
                    </div>

                    {speechResultText && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                        Bạn vừa đọc: <span className="font-bold text-slate-800 dark:text-slate-100">{speechResultText}</span>
                      </div>
                    )}

                    {speechScore !== null && (
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        Độ chuẩn xác: {speechScore}/100
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Card after checking */}
                {answered && (
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 border animate-in fade-in duration-200 ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-sm">
                        {isCorrect ? 'Chính xác! Rất xuất sắc!' : 'Chưa chính xác.'}
                      </div>
                      <div>{currentExercise.explanationVi}</div>
                    </div>
                  </div>
                )}

                {/* Bottom Action Button */}
                <div className="pt-2">
                  {!answered ? (
                    <button
                      onClick={checkAnswer}
                      className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 active:scale-95 transition-all"
                    >
                      Kiểm tra đáp án
                    </button>
                  ) : (
                    <button
                      onClick={nextExercise}
                      className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
                    >
                      {currentExIdx + 1 < lesson.exercises.length ? 'Câu tiếp theo &rarr;' : 'Xem kết quả bài học'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
