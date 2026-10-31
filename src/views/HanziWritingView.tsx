import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import {
  Play,
  RotateCcw,
  Pencil,
  Eye,
  CheckCircle2,
  Volume2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioService } from '../utils/audio';

export const HanziWritingView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);

  const [currentChar, setCurrentChar] = useState<string>('你');
  const [customInput, setCustomInput] = useState<string>('');
  const [isQuizzing, setIsQuizzing] = useState<boolean>(false);
  const [showOutline, setShowOutline] = useState<boolean>(true);
  const [mistakes, setMistakes] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  const commonHanziList = [
    '你', '好', '我', '他', '学', '生', '汉', '字', '中', '国', '吃', '喝', '茶', '水', '爱', '家', '明', '天', '见'
  ];

  useEffect(() => {
    initWriter(currentChar);
    return () => {
      if (writerRef.current) {
        writerRef.current = null;
      }
    };
  }, [currentChar]);

  const initWriter = (char: string) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    setQuizCompleted(false);
    setMistakes(0);

    const isDark = document.documentElement.classList.contains('dark');

    try {
      writerRef.current = HanziWriter.create(containerRef.current, char, {
        width: 260,
        height: 260,
        padding: 20,
        showOutline: showOutline,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 150,
        strokeColor: isDark ? '#fb7185' : '#e11d48',
        outlineColor: isDark ? '#334155' : '#e2e8f0',
        drawingColor: '#22c55e',
        drawingWidth: 16,
        showHintAfterMisses: 2,
      });

      // Speak pronunciation
      audioService.speak(char);
    } catch (e) {
      console.error('Failed to init HanziWriter:', e);
    }
  };

  const handleAnimate = () => {
    if (writerRef.current) {
      writerRef.current.animateCharacter();
    }
  };

  const handleStartQuiz = () => {
    if (!writerRef.current) return;
    setIsQuizzing(true);
    setQuizCompleted(false);
    setMistakes(0);

    writerRef.current.quiz({
      onMistake: (strokeData: any) => {
        setMistakes((m) => m + 1);
        audioService.playWrongSound();
      },
      onCorrectStroke: () => {
        audioService.playCorrectSound();
      },
      onComplete: (summaryData: any) => {
        setIsQuizzing(false);
        setQuizCompleted(true);
        audioService.playCelebrationChime();
        try {
          confetti({ particleCount: 70, spread: 60 });
        } catch (e) {}
      },
    });
  };

  const handleReset = () => {
    initWriter(currentChar);
    setIsQuizzing(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      const char = customInput.trim()[0];
      setCurrentChar(char);
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Luyện Viết Chữ Hán Chuẩn Nét</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Thứ tự nét bút
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Xem hoạt họa thứ tự viết từng nét bút và tập viết trực tiếp trên bảng cảm ứng.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Canvas Area */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Khung Viết Ô Điền Tự (米字格)
          </div>

          {/* Canvas Box */}
          <div className="relative p-2 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 shadow-inner">
            {/* Background Mi-zi-ge guidelines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="w-full h-full border border-red-500 relative">
                <div className="absolute inset-0 border-t border-red-500 top-1/2 -translate-y-1/2" />
                <div className="absolute inset-0 border-l border-red-500 left-1/2 -translate-x-1/2" />
              </div>
            </div>

            <div ref={containerRef} className="cursor-crosshair relative z-10" />
          </div>

          {/* Success Banner */}
          {quizCompleted && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tuyệt vời! Bạn đã viết hoàn thành chữ "{currentChar}" với {mistakes} lỗi nét.</span>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            <button
              onClick={handleAnimate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Xem hoạt họa nét</span>
            </button>

            <button
              onClick={handleStartQuiz}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow hover:bg-primary-700 active:scale-95 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Tập viết (Kiểm tra nét)</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Đặt lại bảng vẽ"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioService.speak(currentChar)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-600 transition-colors"
              title="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Character Selection Panel */}
        <div className="space-y-4">
          {/* Custom Input */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nhập chữ Hán bất kỳ để tập viết:
            </label>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="text"
                maxLength={1}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ví dụ: 语"
                className="w-full px-3 py-1.5 text-center text-lg font-chinese font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow shrink-0"
              >
                Tải nét
              </button>
            </form>
          </div>

          {/* Quick Character Library */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chọn chữ Hán cơ bản:
            </div>
            <div className="grid grid-cols-5 gap-2 pt-1">
              {commonHanziList.map((char) => (
                <button
                  key={char}
                  onClick={() => setCurrentChar(char)}
                  className={`p-2 rounded-xl text-lg font-chinese font-bold border transition-all ${
                    currentChar === char
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-600 scale-105 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
