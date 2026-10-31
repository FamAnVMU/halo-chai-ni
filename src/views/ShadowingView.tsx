import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  BarChart3,
  Award,
  Zap,
  AlertTriangle,
  Trash2,
  Activity,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  BookOpen,
  Headphones,
  ArrowRight,
  BookmarkPlus,
  X,
  Sliders,
  Filter,
  RefreshCw
} from 'lucide-react';

import {
  SEED_SHADOWING_LESSONS,
  SHADOWING_LEVEL_TITLES,
  ShadowingChunk
} from '../data/seedShadowing';

import { audioRecorder, RecordedAudioResult } from '../utils/audioRecorder';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';
import {
  backendClient,
  ShadowingLessonSummary,
  ShadowingEvalResult,
  ShadowingStats
} from '../utils/backendClient';

export type ShadowingMode =
  | 'echo'
  | 'delayed'
  | 'simultaneous'
  | 'listen_repeat'
  | 'full_passage'
  | 'no_subtitle';

interface ShadowingViewProps {
  onNavigate?: (tab: any) => void;
}

export const ShadowingView: React.FC<ShadowingViewProps> = ({ onNavigate }) => {
  // Lessons state
  const [lessons, setLessons] = useState<ShadowingLessonSummary[]>(SEED_SHADOWING_LESSONS as any);
  const [selectedLesson, setSelectedLesson] = useState<ShadowingLessonSummary>(SEED_SHADOWING_LESSONS[0] as any);
  const [selectedLevel, setSelectedLevel] = useState<number>(0); // 0 = all
  const [selectedHsk, setSelectedHsk] = useState<number>(0); // 0 = all

  // Practice Modes & Steps
  const [activeMode, setActiveMode] = useState<ShadowingMode>('listen_repeat');
  const [practiceStep, setPracticeStep] = useState<number>(1); // 1-6
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);

  // Audio Playback & Speed
  const [currentSpeed, setCurrentSpeed] = useState<number>(selectedLesson.recommendedSpeed || 1.0);
  const [isPlayingFullAudio, setIsPlayingFullAudio] = useState<boolean>(false);
  const [isPlayingChunkAudio, setIsPlayingChunkAudio] = useState<boolean>(false);
  const [isComparingSequential, setIsComparingSequential] = useState<boolean>(false);

  // Subtitle & Display toggles
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [isNoSubtitleMode, setIsNoSubtitleMode] = useState<boolean>(false);

  // Recording & Live Recognition
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudioResult | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<boolean>(false);
  const [autoAdvanceChunk, setAutoAdvanceChunk] = useState<boolean>(true);

  // Evaluation & Results
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<ShadowingEvalResult | null>(null);
  const [completedChunks, setCompletedChunks] = useState<Record<string, boolean>>({});

  // Comprehension Quiz state
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, string>>({});

  // Stats & History Modal
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<ShadowingStats | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // AI Generator Modal
  const [isGeneratingAiLesson, setIsGeneratingAiLesson] = useState<boolean>(false);
  const [srsSuccessMessage, setSrsSuccessMessage] = useState<string>('');

  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load lessons from backend on mount
  useEffect(() => {
    let isMounted = true;
    backendClient.getShadowingLessons().then((res) => {
      if (isMounted && res.success && res.data && res.data.length > 0) {
        setLessons(res.data);
      }
    }).catch(err => console.warn('Fetch shadowing lessons note:', err));

    // Wire audio recorder callbacks
    audioRecorder.onDurationChange = (sec) => setRecordingSeconds(sec);
    audioRecorder.onVolumeChange = (vol) => setVolumeLevel(vol);

    return () => {
      isMounted = false;
      audioRecorder.cleanup();
      audioRecorder.onDurationChange = undefined;
      audioRecorder.onVolumeChange = undefined;
      audioService.stopSpeaking();
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
    };
  }, []);

  // Reset practice state when switching lesson or step
  const resetPracticeState = () => {
    if (isRecording) {
      audioRecorder.cancelRecording();
      setIsRecording(false);
    }
    audioService.stopSpeaking();
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current = null;
    }
    setRecordedAudio(null);
    setEvaluationResult(null);
    setLiveTranscript('');
    setIsPlayingUserAudio(false);
    setIsPlayingFullAudio(false);
    setIsPlayingChunkAudio(false);
    setIsComparingSequential(false);
    setRecordingSeconds(0);
    setVolumeLevel(0);
    setSrsSuccessMessage('');
  };

  const handleSelectLesson = (lesson: ShadowingLessonSummary) => {
    resetPracticeState();
    setSelectedLesson(lesson);
    setCurrentSpeed(lesson.recommendedSpeed || 1.0);
    setActiveChunkIndex(0);
    setPracticeStep(1);
    setCompletedChunks({});
    setSelectedQuizAnswers({});
  };

  // 1. Play full audio sample
  const handlePlayFullAudio = () => {
    if (isPlayingFullAudio) {
      audioService.stopSpeaking();
      setIsPlayingFullAudio(false);
      return;
    }

    resetPracticeState();
    setIsPlayingFullAudio(true);

    audioService.speak(selectedLesson.fullZh, {
      rate: currentSpeed,
      onEnd: () => setIsPlayingFullAudio(false),
      onError: () => setIsPlayingFullAudio(false)
    });
  };

  // 2. Play active chunk audio
  const currentChunk: ShadowingChunk | undefined = selectedLesson.chunks[activeChunkIndex];

  const handlePlayChunkAudio = (chunk?: ShadowingChunk) => {
    const targetChunk = chunk || currentChunk;
    if (!targetChunk) return;

    if (isPlayingChunkAudio) {
      audioService.stopSpeaking();
      setIsPlayingChunkAudio(false);
      return;
    }

    setIsPlayingChunkAudio(true);
    audioService.speak(targetChunk.chunkZh, {
      rate: currentSpeed,
      onEnd: () => setIsPlayingChunkAudio(false),
      onError: () => setIsPlayingChunkAudio(false)
    });
  };

  // 3. Start recording user voice
  const handleStartRecording = async (targetText: string) => {
    try {
      resetPracticeState();
      setIsRecording(true);
      setLiveTranscript('');

      // Concurrent speech recognition
      if (speechService.isSupported()) {
        speechService.startListening(
          (payload) => {
            if (payload.transcript) {
              setLiveTranscript(payload.transcript);
            }
          },
          () => {},
          (err) => console.warn('SpeechRecognition interim notice:', err)
        );
      }

      // Simultaneous mode: play sample right as user starts recording
      if (activeMode === 'simultaneous') {
        setTimeout(() => {
          audioService.speak(targetText, { rate: currentSpeed });
        }, 150);
      } else if (activeMode === 'delayed') {
        // Delayed: play audio, wait 1.2s then user speaks
        audioService.speak(targetText, { rate: currentSpeed });
      }

      await audioRecorder.startRecording(15);
    } catch (err: any) {
      setIsRecording(false);
      alert(err.message || 'Không thể bắt đầu ghi âm.');
    }
  };

  // 4. Stop recording & trigger 3-layer honest evaluation
  const handleStopRecording = async (targetText: string, targetPinyin: string, chunkId?: string) => {
    if (!isRecording) return;
    setIsRecording(false);

    try {
      const recResult = await audioRecorder.stopRecording();
      setRecordedAudio(recResult);
      speechService.stopListening();
      setIsEvaluating(true);

      const res = await backendClient.evaluateShadowing({
        lessonId: selectedLesson.id,
        chunkId,
        targetText,
        targetPinyin,
        mode: activeMode,
        practiceStep,
        spokenTranscript: liveTranscript || targetText,
        audioDurationMs: recResult.durationMs,
        speedUsed: currentSpeed
      });

      if (res.success && res.data) {
        setEvaluationResult(res.data);

        // Mark chunk as completed
        if (chunkId) {
          setCompletedChunks(prev => ({ ...prev, [chunkId]: true }));

          // Auto-advance if enabled and not at end
          if (autoAdvanceChunk && activeChunkIndex < selectedLesson.chunks.length - 1) {
            setTimeout(() => {
              setActiveChunkIndex(prev => prev + 1);
              resetPracticeState();
            }, 1200);
          }
        }
      }
    } catch (err: any) {
      console.error('Stop recording & evaluate error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Play user recorded audio
  const handlePlayUserAudio = () => {
    if (!recordedAudio) return;
    if (userAudioRef.current) {
      userAudioRef.current.pause();
    }
    const audio = new Audio(recordedAudio.audioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserAudio(true);
    audio.onended = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  };

  // Sequential comparison: Native chunk -> 400ms pause -> User audio
  const handleCompareSequential = (text: string) => {
    if (!recordedAudio) return;
    setIsComparingSequential(true);

    audioService.speak(text, { rate: currentSpeed });
    const estTime = Math.max(1200, (text.length * 400) / currentSpeed);

    setTimeout(() => {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
      const audio = new Audio(recordedAudio.audioUrl);
      userAudioRef.current = audio;
      audio.onended = () => setIsComparingSequential(false);
      audio.play().catch(() => setIsComparingSequential(false));
    }, estTime + 400);
  };

  // Sync to SRS Spaced Repetition queue
  const handleSyncToSrs = async (zh: string, pinyin: string, vi: string, chunkId?: string) => {
    try {
      const res = await backendClient.syncShadowingToSrs({
        lessonId: selectedLesson.id,
        chunkId,
        zh,
        pinyin,
        vi
      });
      if (res.success) {
        setSrsSuccessMessage(res.message || 'Đã thêm vào thẻ ôn tập thông minh SRS!');
      }
    } catch (err) {
      console.error('Sync to SRS error:', err);
    }
  };

  // AI Generator: generate personalized Shadowing lesson
  const handleGenerateAiLesson = async () => {
    setIsGeneratingAiLesson(true);
    try {
      const res = await backendClient.generateShadowingLesson('default');
      if (res.success && res.lesson) {
        setLessons(prev => [res.lesson!, ...prev]);
        setSelectedLesson(res.lesson);
        setCurrentSpeed(res.lesson.recommendedSpeed || 1.0);
        resetPracticeState();
        alert(res.message || 'AI đã sinh bài luyện Shadowing cá nhân hóa thành công!');
      }
    } catch (err) {
      console.error('AI generate Shadowing lesson error:', err);
    } finally {
      setIsGeneratingAiLesson(false);
    }
  };

  // Open Stats & History modal
  const handleOpenStatsModal = async () => {
    setShowStatsModal(true);
    setIsLoadingHistory(true);
    try {
      const [statsRes, histRes] = await Promise.all([
        backendClient.getShadowingStats(),
        backendClient.getShadowingHistory(20)
      ]);
      if (statsRes.success && statsRes.data) {
        setStatsData(statsRes.data);
      }
      if (histRes.success && histRes.data) {
        setHistoryData(histRes.data);
      }
    } catch (err) {
      console.error('Fetch stats & history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filtered lessons list
  const filteredLessons = lessons.filter(l => {
    if (selectedLevel !== 0 && l.level !== selectedLevel) return false;
    if (selectedHsk !== 0 && l.hskLevel !== selectedHsk) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-6xl mx-auto px-2 sm:px-4">
      {/* ============================================================== */}
      {/* 1. STUDIO HEADER BANNER */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-cyan-600 via-primary-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Headphones className="w-3.5 h-3.5 text-cyan-200" />
              <span>Hệ Thống Luyện Nói Nhại Chuyên Sâu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chinese Shadowing Practice
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100 max-w-2xl leading-relaxed">
              Luyện phản xạ nghe nói nhại theo người bản ngữ, bắt trọn giai điệu, ngữ điệu và ngắt nhịp ý群 (Thought Groups) chuẩn xác không ngập ngừng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleGenerateAiLesson}
              disabled={isGeneratingAiLesson}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-900 text-xs font-extrabold hover:bg-amber-300 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAiLesson ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAiLesson ? 'AI đang tạo bài...' : 'Tạo Bài AI Riêng'}</span>
            </button>

            <button
              onClick={handleOpenStatsModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-800 text-xs font-bold hover:bg-cyan-50 shadow-md transition-all active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-primary-600" />
              <span>Tiến Độ & Lịch Sử</span>
            </button>
          </div>
        </div>

        {/* Decorative blur shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ============================================================== */}
      {/* 2. LEVEL & FILTER SELECTOR (7 LEVELS + HSK FILTERS) */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Chọn Cấp Độ Shadowing (7 Cấp Độ Chuẩn Sư Phạm):</span>
          </span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(hsk => (
              <button
                key={hsk}
                onClick={() => setSelectedHsk(hsk)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedHsk === hsk
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                }`}
              >
                {hsk === 0 ? 'Tất cả HSK' : `HSK ${hsk}`}
              </button>
            ))}
          </div>
        </div>

        {/* 7 Levels Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedLevel(0)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedLevel === 0
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Tất Cả Cấp Độ
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedLevel === lvl
                  ? 'bg-primary-600 text-white shadow-md scale-102'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary-300'
              }`}
            >
              {SHADOWING_LEVEL_TITLES[lvl]}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. LESSON CARDS CAROUSEL / GRID */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredLessons.map(lesson => {
          const isSelected = selectedLesson.id === lesson.id;
          return (
            <div
              key={lesson.id}
              onClick={() => handleSelectLesson(lesson)}
              className={`p-4 rounded-3xl border cursor-pointer transition-all space-y-2 ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/70 dark:bg-primary-950/40 shadow-md ring-2 ring-primary-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  {SHADOWING_LEVEL_TITLES[lesson.level]?.split(':')[0] || `Cấp độ ${lesson.level}`}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  HSK {lesson.hskLevel} • {lesson.recommendedSpeed}x
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                  {lesson.title}
                </h4>
                <div className="text-[11px] text-slate-500 line-clamp-1 font-chinese mt-0.5">
                  {lesson.fullZh}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{lesson.chunks.length} cụm ý nghĩa</span>
                <span className="text-primary-600 font-bold hover:underline flex items-center gap-0.5">
                  Luyện ngay <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 4. THE SHADOWING STUDIO: 6 MODES & 6 PRACTICE STEPS */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        {/* Studio Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs uppercase font-extrabold text-primary-600 flex items-center gap-1.5">
              <span>{SHADOWING_LEVEL_TITLES[selectedLesson.level]}</span>
              <span>•</span>
              <span>Chủ đề: {selectedLesson.topic}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {selectedLesson.title}
            </h2>
          </div>

          {/* Speed Selector Chips (0.5x, 0.75x, 1.0x, 1.25x, 1.5x) */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Tốc độ:</span>
            </span>
            {[0.5, 0.75, 1.0, 1.25, 1.5].map(spd => (
              <button
                key={spd}
                onClick={() => {
                  setCurrentSpeed(spd);
                  audioService.stopSpeaking();
                  setIsPlayingFullAudio(false);
                  setIsPlayingChunkAudio(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  currentSpeed === spd
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* 6 Shadowing Modes Selector (Echo, Delayed, Simultaneous, etc.) */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Chọn Phương Pháp Shadowing:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: 'echo', label: 'A. Echo', desc: 'Nghe ngắn, nói lại' },
              { id: 'delayed', label: 'B. Delayed', desc: 'Nói trễ 1-2s sau' },
              { id: 'simultaneous', label: 'C. Simultaneous', desc: 'Nói cùng lúc' },
              { id: 'listen_repeat', label: 'D. Listen & Repeat', desc: 'Nghe câu, lặp lại' },
              { id: 'full_passage', label: 'E. Full Passage', desc: 'Nói nhại cả đoạn' },
              { id: 'no_subtitle', label: 'F. No Subtitle', desc: 'Ẩn chữ, thuần nghe' }
            ].map(m => {
              const isActive = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMode(m.id as ShadowingMode);
                    if (m.id === 'no_subtitle') {
                      setIsNoSubtitleMode(true);
                    } else {
                      setIsNoSubtitleMode(false);
                    }
                    resetPracticeState();
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    isActive
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/60 shadow-sm ring-1 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className={`text-xs font-black ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {m.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6 PRACTICE STEPS TABS (Wizard Navigation) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { step: 1, label: 'Bước 1: Nghe toàn bộ' },
            { step: 2, label: 'Bước 2: Phân tích cụm' },
            { step: 3, label: 'Bước 3: Luyện từng cụm' },
            { step: 4, label: 'Bước 4: Luyện cả câu' },
            { step: 5, label: 'Bước 5: Luyện cả đoạn' },
            { step: 6, label: 'Bước 6: Đánh giá & Ôn tập' }
          ].map(s => {
            const isActive = practiceStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => {
                  setPracticeStep(s.step);
                  resetPracticeState();
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* STEP 1: NGHE TOÀN BỘ NỘI DUNG */}
        {/* ============================================================== */}
        {practiceStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            {/* View controls: Toggles for Pinyin, Translation, No-subtitle */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <span className="text-slate-500">Tùy chọn hiển thị văn bản:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPinyin(p => !p)}
                  className={`px-3 py-1 rounded-xl transition-all ${showPinyin ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                >
                  {showPinyin ? '✓ Pinyin Bật' : 'Pinyin Tắt'}
                </button>
                <button
                  onClick={() => setShowTranslation(t => !t)}
                  className={`px-3 py-1 rounded-xl transition-all ${showTranslation ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                >
                  {showTranslation ? '✓ Bản Dịch Bật' : 'Bản Dịch Tắt'}
                </button>
                <button
                  onClick={() => setIsNoSubtitleMode(m => !m)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl transition-all ${isNoSubtitleMode ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}
                >
                  {isNoSubtitleMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isNoSubtitleMode ? 'Ẩn Hết Chữ' : 'Hiện Chữ'}</span>
                </button>
              </div>
            </div>

            {/* Content Display Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 text-center">
              {!isNoSubtitleMode ? (
                <div className="space-y-3">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black font-chinese text-slate-800 dark:text-slate-100 leading-relaxed">
                    {selectedLesson.fullZh}
                  </div>
                  {showPinyin && (
                    <div className="text-sm sm:text-base font-semibold text-rose-500 font-mono">
                      {selectedLesson.fullPinyin}
                    </div>
                  )}
                  {showTranslation && (
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                      {selectedLesson.fullVi}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 space-y-2">
                  <EyeOff className="w-10 h-10 text-slate-400 mx-auto" />
                  <div className="text-base font-bold text-slate-700 dark:text-slate-200">
                    Chế độ Ẩn Toàn Bộ Phụ Đề
                  </div>
                  <div className="text-xs text-slate-400 max-w-md mx-auto">
                    Hãy nhắm mắt hoặc tập trung lắng nghe thuần túy bằng tai để cảm nhận nhịp điệu và ngữ âm thực tế.
                  </div>
                </div>
              )}

              {/* Big Play Full Button */}
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handlePlayFullAudio}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold shadow-lg transition-all active:scale-95 ${
                    isPlayingFullAudio
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-gradient-to-r from-cyan-600 to-primary-600 text-white hover:opacity-95'
                  }`}
                >
                  {isPlayingFullAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{isPlayingFullAudio ? 'Dừng phát' : `Nghe toàn bộ (${currentSpeed}x)`}</span>
                </button>

                <button
                  onClick={() => setPracticeStep(2)}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <span>Sang Bước 2: Phân tích cụm</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: NGHE VÀ PHÂN TÍCH CỤM Ý NGHĨA (意群) */}
        {/* ============================================================== */}
        {practiceStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs text-slate-500">
              Câu dài được chia thành các cụm ý nghĩa (Thought Groups) tự nhiên. Nhấn vào từng cụm để nghe riêng biệt:
            </div>

            <div className="space-y-3">
              {selectedLesson.chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-400 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-lg sm:text-xl font-black font-chinese text-slate-800 dark:text-slate-100">
                        {chunk.chunkZh}
                      </span>
                      <span className="text-xs font-mono font-semibold text-rose-500">
                        [{chunk.chunkPinyin}]
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 pl-8">
                      {chunk.chunkVi}
                    </div>
                    {chunk.phoneticNotes && (
                      <div className="text-[11px] text-cyan-600 dark:text-cyan-400 pl-8 font-medium">
                        💡 Lưu ý phát âm: {chunk.phoneticNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handlePlayChunkAudio(chunk)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-100"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe cụm này</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveChunkIndex(idx);
                        setPracticeStep(3);
                        resetPracticeState();
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700"
                    >
                      <span>Luyện nhại</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between">
              <button
                onClick={() => setPracticeStep(1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại Bước 1</span>
              </button>
              <button
                onClick={() => setPracticeStep(3)}
                className="flex items-center gap-1 px-5 py-2.5 rounded-2xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 shadow-md"
              >
                <span>Sang Bước 3: Luyện từng cụm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: LUYỆN TỪNG CỤM (CHUNK SHADOWING STUDIO) */}
        {/* ============================================================== */}
        {practiceStep === 3 && currentChunk && (
          <div className="space-y-6 animate-in fade-in">
            {/* Chunk Navigation Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                  Cụm {activeChunkIndex + 1} / {selectedLesson.chunks.length}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  ({Object.keys(completedChunks).length}/{selectedLesson.chunks.length} đã hoàn thành)
                </span>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAdvanceChunk}
                    onChange={(e) => setAutoAdvanceChunk(e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span>Tự động chuyển cụm sau khi đọc đạt</span>
                </label>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={activeChunkIndex === 0}
                  onClick={() => {
                    setActiveChunkIndex(p => Math.max(0, p - 1));
                    resetPracticeState();
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={activeChunkIndex === selectedLesson.chunks.length - 1}
                  onClick={() => {
                    setActiveChunkIndex(p => Math.min(selectedLesson.chunks.length - 1, p + 1));
                    resetPracticeState();
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30 text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Active Chunk Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="space-y-2">
                <div className="text-3xl sm:text-4xl font-black font-chinese text-slate-800 dark:text-slate-100">
                  {currentChunk.chunkZh}
                </div>
                <div className="text-base font-semibold text-rose-500 font-mono">
                  {currentChunk.chunkPinyin}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                  {currentChunk.chunkVi}
                </div>
                {currentChunk.phoneticNotes && (
                  <div className="inline-block px-3 py-1 rounded-xl bg-cyan-100/60 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 text-xs font-semibold">
                    💡 {currentChunk.phoneticNotes}
                  </div>
                )}
              </div>

              {/* Native chunk sample controls */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handlePlayChunkAudio(currentChunk)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 shadow-md"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe mẫu cụm ({currentSpeed}x)</span>
                </button>

                {recordedAudio && (
                  <button
                    onClick={() => handleCompareSequential(currentChunk.chunkZh)}
                    disabled={isComparingSequential}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isComparingSequential ? 'animate-spin' : ''}`} />
                    <span>So Sánh Tuần Tự (Mẫu ➔ Bạn)</span>
                  </button>
                )}

                <button
                  onClick={() => handleSyncToSrs(currentChunk.chunkZh, currentChunk.chunkPinyin, currentChunk.chunkVi, currentChunk.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  <BookmarkPlus className="w-4 h-4 text-amber-500" />
                  <span>Lưu vào SRS</span>
                </button>
              </div>

              {srsSuccessMessage && (
                <div className="text-xs font-bold text-emerald-600 animate-in fade-in">
                  ✓ {srsSuccessMessage}
                </div>
              )}

              {/* Live Volume Meter during recording */}
              {isRecording && (
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-2 animate-in fade-in">
                  <div className="text-xs font-bold text-rose-600 flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span>Đang nói nhại theo mẫu... ({recordingSeconds}s)</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 h-7">
                    {[...Array(14)].map((_, i) => (
                      <div
                        key={i}
                        style={{ height: `${Math.max(15, Math.min(100, volumeLevel * (0.6 + Math.sin(i * 0.9) * 0.4)))}%` }}
                        className="w-1.5 rounded-full bg-rose-500 transition-all duration-75"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Big Record Button */}
              <div className="flex flex-col items-center justify-center py-2">
                {!isRecording ? (
                  <button
                    onClick={() => handleStartRecording(currentChunk.chunkZh)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-primary-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
                  >
                    <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopRecording(currentChunk.chunkZh, currentChunk.chunkPinyin, currentChunk.id)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center animate-pulse"
                  >
                    <MicOff className="w-10 h-10" />
                  </button>
                )}

                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-3">
                  {isRecording ? 'Nhấn nút đỏ để DỪNG & ĐÁNH GIÁ' : 'Nhấn nút để bắt đầu nói nhại'}
                </div>
              </div>

              {/* User Audio Bar */}
              {recordedAudio && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handlePlayUserAudio}
                      className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md"
                    >
                      {isPlayingUserAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Giọng ghi âm của bạn</div>
                      <div className="text-[10px] text-slate-400">{(recordedAudio.durationMs / 1000).toFixed(1)}s</div>
                    </div>
                  </div>
                  <button
                    onClick={resetPracticeState}
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Chunk Evaluation Feedback Card */}
            {evaluationResult && renderEvaluationCard()}
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 4: LUYỆN CẢ CÂU (SENTENCE SHADOWING) */}
        {/* ============================================================== */}
        {practiceStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Luyện Nói Nhại Trọn Vẹn Cả Câu
                </span>
                <div className="text-2xl sm:text-3xl font-black font-chinese text-slate-800 dark:text-slate-100">
                  {selectedLesson.fullZh}
                </div>
                <div className="text-sm font-semibold text-rose-500 font-mono">
                  {selectedLesson.fullPinyin}
                </div>
                <div className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                  {selectedLesson.fullVi}
                </div>
              </div>

              {/* Sample playback & Recording */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={handlePlayFullAudio}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe cả câu ({currentSpeed}x)</span>
                </button>
                {recordedAudio && (
                  <button
                    onClick={() => handleCompareSequential(selectedLesson.fullZh)}
                    disabled={isComparingSequential}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>So Sánh Tuần Tự</span>
                  </button>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex flex-col items-center justify-center py-2">
                {!isRecording ? (
                  <button
                    onClick={() => handleStartRecording(selectedLesson.fullZh)}
                    className="w-20 h-20 rounded-full bg-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Mic className="w-9 h-9" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopRecording(selectedLesson.fullZh, selectedLesson.fullPinyin)}
                    className="w-20 h-20 rounded-full bg-rose-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center animate-pulse"
                  >
                    <MicOff className="w-9 h-9" />
                  </button>
                )}
                <div className="text-xs font-bold text-slate-500 mt-2">
                  {isRecording ? 'Nhấn để dừng & chấm điểm cả câu' : 'Bắt đầu nói nhại cả câu'}
                </div>
              </div>

              {recordedAudio && (
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between max-w-sm mx-auto">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlayUserAudio} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      {isPlayingUserAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <span className="text-xs font-bold">Bản ghi cả câu ({(recordedAudio.durationMs / 1000).toFixed(1)}s)</span>
                  </div>
                  <button onClick={resetPracticeState} className="p-1 text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {evaluationResult && renderEvaluationCard()}
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 5: LUYỆN CẢ ĐOẠN (FULL PASSAGE / DIALOGUE SHADOWING) */}
        {/* ============================================================== */}
        {practiceStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            {/* Dialogue Role View if available */}
            {selectedLesson.dialogueRoles && selectedLesson.dialogueRoles.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kịch Bản Hội Thoại Hai Nhân Vật (Luyện Đổi Ngữ Điệu):
                </div>
                {selectedLesson.dialogueRoles.map((role, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border ${
                      idx % 2 === 0
                        ? 'bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800'
                        : 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-400 mb-1">{role.speaker}:</div>
                    <div className="text-lg font-black font-chinese text-slate-800 dark:text-slate-100">
                      {role.zh}
                    </div>
                    <div className="text-xs font-mono text-rose-500">{role.pinyin}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{role.vi}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-base sm:text-lg font-black font-chinese leading-relaxed text-slate-800 dark:text-slate-100">
                  {selectedLesson.fullZh}
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">{selectedLesson.fullVi}</div>
              </div>
            )}

            {/* Continuous Recording Studio */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                Ghi Âm Liên Tục Toàn Bài
              </span>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handlePlayFullAudio}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe lại toàn bài</span>
                </button>
              </div>

              <div className="py-2">
                {!isRecording ? (
                  <button
                    onClick={() => handleStartRecording(selectedLesson.fullZh)}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center mx-auto"
                  >
                    <Mic className="w-9 h-9" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopRecording(selectedLesson.fullZh, selectedLesson.fullPinyin)}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-rose-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center mx-auto animate-pulse"
                  >
                    <MicOff className="w-9 h-9" />
                  </button>
                )}
                <div className="text-xs font-bold text-slate-500 mt-2">
                  {isRecording ? 'Đang thu âm cả đoạn... Nhấn để dừng' : 'Bắt đầu nói nhại toàn bộ bài'}
                </div>
              </div>

              {recordedAudio && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between max-w-sm mx-auto">
                  <div className="flex items-center gap-2">
                    <button onClick={handlePlayUserAudio} className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                      {isPlayingUserAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <span className="text-xs font-bold">Toàn bộ bản ghi ({(recordedAudio.durationMs / 1000).toFixed(1)}s)</span>
                  </div>
                  <button onClick={resetPracticeState} className="p-1 text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {evaluationResult && renderEvaluationCard()}
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 6: ĐÁNH GIÁ, ÔN TẬP & CÂU HỎI HIỂU NỘI DUNG */}
        {/* ============================================================== */}
        {practiceStep === 6 && (
          <div className="space-y-6 animate-in fade-in">
            {/* Completion Summary Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-300" />
                <h3 className="text-lg font-black">Chúc Mừng Bạn Đã Hoàn Thành Bài Luyện Shadowing!</h3>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Bạn đã luyện qua toàn bộ {selectedLesson.chunks.length} cụm ý nghĩa của bài "{selectedLesson.title}". Hãy trả lời câu hỏi kiểm tra độ hiểu và rà soát các âm cần ôn tập thêm.
              </p>
            </div>

            {/* Comprehension Quiz Questions */}
            {selectedLesson.comprehensionQuestions && selectedLesson.comprehensionQuestions.length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  <span>Câu Hỏi Kiểm Tra Mức Độ Hiểu Nội Dung (Comprehension Check):</span>
                </div>

                <div className="space-y-4">
                  {selectedLesson.comprehensionQuestions.map((q, idx) => {
                    const userSelected = selectedQuizAnswers[q.id];
                    return (
                      <div key={q.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 space-y-3">
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {idx + 1}. {q.questionVi}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => {
                            const isChosen = userSelected === opt;
                            const isCorrect = opt === q.answer;
                            let btnStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-primary-400';
                            if (userSelected) {
                              if (isCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold';
                              } else if (isChosen) {
                                btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 font-bold';
                              }
                            }
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setSelectedQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`p-3 rounded-xl border text-left text-xs transition-all ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {userSelected && (
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                            <strong>Giải thích: </strong> {q.explanationVi}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bridge to Pronunciation Lab & SRS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-900 dark:text-cyan-200">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <span>Phòng Luyện Phát Âm (Pronunciation Lab)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Bạn có cảm thấy vấp ở các âm uốn lưỡi (zh/ch/sh) hay thanh 4 dứt khoát không? Hãy mở ngay Phòng phát âm để rèn luyện khẩu hình chuyên sâu!
                </p>
                <button
                  onClick={() => onNavigate?.('pronounce')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 shadow-md transition-all"
                >
                  <span>Chuyển sang Phòng Luyện Phát Âm</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Hệ Thống Ôn Tập SRS (SM-2)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Lưu cả câu vào hàng đợi ôn tập lặp lại ngắt quãng để kích hoạt lịch nhắc nhở sau 1 ngày, 3 ngày, 7 ngày...
                </p>
                <button
                  onClick={() => handleSyncToSrs(selectedLesson.fullZh, selectedLesson.fullPinyin, selectedLesson.fullVi, selectedLesson.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 shadow-md transition-all"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Lưu Toàn Bộ Câu Vào SRS</span>
                </button>
                {srsSuccessMessage && (
                  <div className="text-[11px] font-bold text-emerald-600 mt-1">✓ {srsSuccessMessage}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 📊 PROGRESS & HISTORY MODAL */}
      {/* ============================================================== */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  Thống Kê Tiến Độ Luyện Nói Nhại (Shadowing)
                </h3>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Dashboard */}
            {statsData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60">
                  <div className="text-2xl font-black text-cyan-600">{statsData.totalSessions}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Lượt luyện nhại</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60">
                  <div className="text-2xl font-black text-indigo-600">{statsData.averageScore}%</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Điểm tổng TB</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60">
                  <div className="text-2xl font-black text-emerald-600">{statsData.averageFluency}%</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Độ lưu loát</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60">
                  <div className="text-2xl font-black text-amber-600">{statsData.practicedLevelsCount} / 7</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Cấp độ đã thử</div>
                </div>
              </div>
            )}

            {/* Recent History List */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Lịch sử các lần luyện gần nhất:
              </div>

              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
              ) : historyData.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có lượt luyện Shadowing nào. Hãy bắt đầu ngay hôm nay!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {historyData.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{item.lessonTitle}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Cấp độ {item.lessonLevel} • {item.mode}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.transcript ? `"${item.transcript}"` : '(không nhận diện được)'} • {(item.durationMs / 1000).toFixed(1)}s
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-black text-sm ${item.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.score}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper render Evaluation Card
  function renderEvaluationCard() {
    if (isEvaluating) {
      return (
        <div className="p-6 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 text-center space-y-2 animate-in fade-in">
          <RefreshCw className="w-6 h-6 text-cyan-600 animate-spin mx-auto" />
          <div className="text-xs font-bold text-cyan-800 dark:text-cyan-200">
            AI đang phân tích 3 lớp âm học thời lượng, đối chiếu ký tự và độ lưu loát nhịp điệu...
          </div>
        </div>
      );
    }
    if (!evaluationResult) return null;
    return (
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
        {/* Score Banner */}
        <div
          className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            evaluationResult.score >= 80
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-900 dark:text-emerald-100'
              : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 text-amber-900 dark:text-amber-100'
          }`}
        >
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Award className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Đánh Giá Nói Nhại AI</span>
            </div>
            <div className="text-xl font-black">
              {evaluationResult.accuracyGrade === 'excellent' && 'Xuất Sắc! Bắt nhịp hoàn hảo'}
              {evaluationResult.accuracyGrade === 'good' && 'Tốt! Ngữ điệu liền mạch'}
              {evaluationResult.accuracyGrade === 'fair' && 'Khá! Cần giữ hơi đều hơn'}
              {evaluationResult.accuracyGrade === 'needs_improvement' && 'Cần Luyện Thêm! Hãy nghe chậm'}
            </div>
            <div className="text-xs opacity-80">{evaluationResult.feedbackVi}</div>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <div className="text-4xl font-black">
              {evaluationResult.score}
              <span className="text-sm opacity-60">/100</span>
            </div>
            <div className="text-[11px] font-bold mt-0.5">
              Lưu loát: {evaluationResult.fluencyScore}% • Chuẩn âm: {evaluationResult.accuracyScore}%
            </div>
          </div>
        </div>

        {/* Real Acoustic Metrics & ASR Matching */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Thời lượng & Nhịp Điệu (Acoustic Pacing):</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                evaluationResult.audioMetrics.speedPacing === 'natural' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {evaluationResult.audioMetrics.speedPacing === 'natural' ? 'Nhịp tự nhiên' : 'Cần chỉnh nhịp'}
              </span>
            </div>
            <div className="text-slate-500">
              Thời lượng nói: <strong>{evaluationResult.audioMetrics.durationMs}ms</strong> (Tiêu chuẩn: ~{evaluationResult.audioMetrics.expectedDurationMs}ms)
            </div>
            <div className="text-[11px] text-cyan-600 font-medium">
              {evaluationResult.audioMetrics.durationAssessment}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              Ký tự nhận diện được (ASR Alignment):
            </div>
            <div className="flex flex-wrap gap-1">
              {evaluationResult.chunkAnalysis.map((item, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-lg font-chinese font-bold ${
                    item.status === 'correct'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 line-through'
                  }`}
                >
                  {item.char}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 1-Click Jump to Pronunciation Lab if weak sounds flagged */}
        {evaluationResult.flaggedSounds && evaluationResult.flaggedSounds.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 block">
                  Phát hiện âm cần củng cố: {evaluationResult.flaggedSounds.join(', ')}
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300">
                  Bạn có thể chuyển thẳng sang Phòng Luyện Phát Âm để tập riêng các âm này.
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('pronounce')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-900 font-bold shrink-0 hover:bg-amber-400"
            >
              Luyện Âm Này
            </button>
          </div>
        )}
      </div>
    );
  }
};
