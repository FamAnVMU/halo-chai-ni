import React, { useState } from 'react';
import {
  Dumbbell,
  CheckCircle,
  XCircle,
  Volume2,
  Mic,
  RotateCcw,
  Trophy,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Exercise, ExerciseType } from '../types';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';
import { RubyText } from '../components/common/RubyText';

export const PRACTICE_EXERCISES_POOL: Exercise[] = [
  {
    id: 'p_1',
    type: 'multiple_choice',
    prompt: 'Chọn từ có nghĩa là "Bác sĩ" trong tiếng Trung:',
    options: ['老师 (lǎoshī)', '医生 (yīshēng)', '学生 (xuésheng)', '朋友 (péngyou)'],
    correctAnswer: 1,
    explanationVi: '"医生" (yīshēng) có nghĩa là bác sĩ/thầy thuốc. 老师 là giáo viên, 学生 là học sinh.',
  },
  {
    id: 'p_2',
    type: 'match_hanzi_pinyin',
    prompt: 'Ghép chữ Hán sau với phiên âm Pinyin đúng:',
    questionZh: '苹果',
    options: ['kāfēi', 'píngguǒ', 'miàntiáo', 'jīdàn'],
    correctAnswer: 'píngguǒ',
    explanationVi: '苹果 phiên âm chuẩn là píngguǒ (Quả táo).',
  },
  {
    id: 'p_3',
    type: 'match_word_meaning',
    prompt: 'Chọn nghĩa tiếng Việt của từ "便宜" (piányi):',
    questionZh: '便宜',
    options: ['Đắt đỏ', 'Ngon miệng', 'Rẻ, giá hời', 'Thuận tiện'],
    correctAnswer: 2,
    explanationVi: '便宜 (piányi) mang nghĩa là "rẻ, không đắt".',
  },
  {
    id: 'p_4',
    type: 'listen_choose',
    prompt: 'Nghe audio câu phát âm và chọn câu tiếng Trung đúng:',
    audioText: '我想喝一杯水。',
    options: ['我想喝一杯水。', '我想吃一个苹果。', '我想去学校。', '我没有时间。'],
    correctAnswer: 0,
    explanationVi: 'Âm thanh đọc câu: "我想喝一杯水。" (Tôi muốn uống một cốc nước).',
  },
  {
    id: 'p_5',
    type: 'fill_blank',
    prompt: 'Điền từ thích hợp vào câu: "我们 ____ 是大学生。"',
    questionZh: '我们 ____ 是大学生。',
    options: ['都 (dōu)', '吗 (ma)', '很 (hěn)', '不 (bù)'],
    correctAnswer: 0,
    explanationVi: '"都" (dōu) là phó từ mang nghĩa "đều" chỉ số nhiều: Chúng tôi đều là sinh viên.',
  },
  {
    id: 'p_6',
    type: 'word_order',
    prompt: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
    questionVi: 'Hôm nay bạn bận không?',
    options: ['今天', '吗', '你', '忙'],
    correctAnswer: '今天 你 忙 吗',
    explanationVi: 'Trật tự câu hỏi với 吗: Thời gian (今天) + Chủ ngữ (你) + Vị ngữ tính từ (忙) + 吗？',
  },
  {
    id: 'p_7',
    type: 'translate_vi_zh',
    prompt: 'Dịch câu "Rất vui được quen biết bạn!" sang tiếng Trung:',
    questionVi: 'Rất vui được quen biết bạn!',
    options: [
      '很高兴认识你！',
      '你叫什么名字？',
      '你在哪儿工作？',
      '不用谢，不客气！',
    ],
    correctAnswer: 0,
    explanationVi: '高兴 (gāoxìng) là vui vẻ, 认识 (rènshí) là quen biết.',
  },
  {
    id: 'p_8',
    type: 'hanzi_recognition',
    prompt: 'Nhận diện chữ Hán: Chữ nào dưới đây có nghĩa là "Nước" (Shuǐ)?',
    options: ['火', '木', '水', '金'],
    correctAnswer: 2,
    explanationVi: 'Chữ "水" tượng hình dòng nước chảy, đọc là shuǐ.',
  },
  {
    id: 'p_9',
    type: 'read_aloud',
    prompt: 'Nhấn Microphone và đọc to rõ ràng câu sau:',
    questionZh: '你好，明天见！',
    questionPinyin: 'Nǐ hǎo, míngtiān jiàn!',
    questionVi: 'Xin chào, ngày mai gặp lại!',
    correctAnswer: '你好，明天见！',
    explanationVi: 'Phát âm chuẩn cả hai thanh 3 trong Nǐ hǎo và thanh 4 dứt khoát trong jiàn.',
  },
];

export const PracticeView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [answered, setAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);

  // Speech test state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [speechScore, setSpeechScore] = useState<number | null>(null);

  const filteredExercises = PRACTICE_EXERCISES_POOL.filter((ex) => {
    if (selectedCategory === 'all') return true;
    return ex.type === selectedCategory;
  });

  const currentExercise = filteredExercises[currentIdx];

  const handleWordOrderClick = (word: string) => {
    if (answered) return;
    if (assembledWords.includes(word)) {
      setAssembledWords(assembledWords.filter((w) => w !== word));
    } else {
      setAssembledWords([...assembledWords, word]);
    }
  };

  const handleCheck = () => {
    if (!currentExercise || answered) return;

    let correct = false;
    if (currentExercise.type === 'word_order') {
      correct = assembledWords.join(' ') === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'read_aloud') {
      correct = (speechScore ?? 0) >= 70;
    } else {
      correct =
        selectedOption === currentExercise.correctAnswer ||
        currentExercise.options?.[selectedOption] === currentExercise.correctAnswer;
    }

    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      audioService.playCorrectSound();
      setScore((s) => s + 1);
    } else {
      audioService.playWrongSound();
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < filteredExercises.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAssembledWords([]);
      setAnswered(false);
      setIsCorrect(false);
      setSpokenText('');
      setSpeechScore(null);
    } else {
      setCompleted(true);
      audioService.playCelebrationChime();
      try {
        confetti({ particleCount: 100, spread: 80 });
      } catch (e) {}
    }
  };

  const handleStartSpeaking = () => {
    setIsRecording(true);
    setSpokenText('Đang nghe...');
    speechService.startListening(
      (payload) => {
        setSpokenText(payload.transcript);
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
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Khu Luyện Tập Tương Tác</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            11 dạng bài
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Rèn luyện phản xạ toàn diện: Nghe, Nói, Đọc, Dịch thuật và Cú pháp.
        </p>
      </div>

      {completed ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Hoàn Thành Phiên Luyện Tập!
          </h2>
          <p className="text-xs text-slate-500">
            Bạn đã trả lời đúng {score} / {filteredExercises.length} câu.
          </p>
          <button
            onClick={() => {
              setCompleted(false);
              setCurrentIdx(0);
              setScore(0);
              setAnswered(false);
            }}
            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
          >
            Luyện tập lại
          </button>
        </div>
      ) : currentExercise ? (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Câu {currentIdx + 1} / {filteredExercises.length}</span>
            <span className="capitalize">{currentExercise.type.replace(/_/g, ' ')}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{
                width: `${((currentIdx + 1) / filteredExercises.length) * 100}%`,
              }}
            />
          </div>

          {/* Exercise Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {currentExercise.prompt}
              </h3>
              {(currentExercise.audioText || currentExercise.questionZh) && (
                <button
                  onClick={() =>
                    audioService.speak(
                      currentExercise.audioText || currentExercise.questionZh || ''
                    )
                  }
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600"
                  title="Nghe âm thanh"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Chinese Display */}
            {currentExercise.questionZh && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <RubyText text={currentExercise.questionZh} />
                {currentExercise.questionVi && (
                  <div className="text-xs text-slate-500 mt-2">
                    "{currentExercise.questionVi}"
                  </div>
                )}
              </div>
            )}

            {/* Standard Options */}
            {currentExercise.options && currentExercise.type !== 'word_order' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentExercise.options.map((opt, i) => {
                  const isSelected = selectedOption === i || selectedOption === opt;
                  return (
                    <button
                      key={i}
                      disabled={answered}
                      onClick={() => setSelectedOption(i)}
                      className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Word Order Area */}
            {currentExercise.type === 'word_order' && currentExercise.options && (
              <div className="space-y-4">
                <div className="min-h-[50px] p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-wrap gap-2 items-center">
                  {assembledWords.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Nhấn vào các từ bên dưới để sắp xếp...
                    </span>
                  ) : (
                    assembledWords.map((w, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleWordOrderClick(w)}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-bold text-sm shadow-sm"
                      >
                        {w}
                      </button>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentExercise.options.map((w, idx) => {
                    const isUsed = assembledWords.includes(w);
                    return (
                      <button
                        key={idx}
                        disabled={isUsed || answered}
                        onClick={() => handleWordOrderClick(w)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                          isUsed
                            ? 'opacity-30 border-slate-300 bg-slate-100 text-slate-400'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Read Aloud Microphone */}
            {currentExercise.type === 'read_aloud' && (
              <div className="text-center py-6 space-y-3">
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
                <div className="text-xs text-slate-500 font-semibold">
                  {isRecording ? 'Đang lắng nghe giọng đọc...' : 'Nhấn nút Micro và đọc to'}
                </div>
                {spokenText && (
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Thu âm: "{spokenText}"
                  </div>
                )}
                {speechScore !== null && (
                  <div className="text-sm font-bold text-emerald-600">
                    Độ chính xác: {speechScore}/100
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {answered && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-3 border ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 text-rose-900 dark:text-rose-100'
                }`}
              >
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm">
                    {isCorrect ? 'Chính xác!' : 'Chưa đúng rồi.'}
                  </div>
                  <div>{currentExercise.explanationVi}</div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2">
              {!answered ? (
                <button
                  onClick={handleCheck}
                  className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md hover:bg-primary-700 active:scale-95 transition-all"
                >
                  Kiểm tra
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-90 active:scale-95 transition-all"
                >
                  {currentIdx + 1 < filteredExercises.length ? 'Câu tiếp theo &rarr;' : 'Xem kết quả'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
