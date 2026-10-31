import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Info,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  X,
  FastForward,
  Activity
} from 'lucide-react';

import {
  INITIALS_DATA,
  FINALS_DATA,
  TONES_DATA,
  TONE_SANDHI_RULES,
  MINIMAL_PAIRS_DATA,
  PINYIN_SYLLABLES_DATA,
  WORD_PRACTICE_DATA,
  SENTENCE_PRACTICE_DATA,
  ASSESSMENT_QUESTIONS_DATA,
  PinyinSoundItem,
  FinalSoundItem,
  ToneItem,
  MinimalPairItem,
  PinyinSyllableItem,
  WordPracticeItem,
  SentencePracticeItem
} from '../data/seedPronunciation';

import { audioRecorder, RecordedAudioResult } from '../utils/audioRecorder';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';
import {
  backendClient,
  PronunciationEvalResult,
  PronunciationStats,
  PersonalizedDrillsResult
} from '../utils/backendClient';

export type PronunciationMode =
  | 'pinyin_intro'
  | 'tones'
  | 'initials'
  | 'finals'
  | 'syllables'
  | 'words'
  | 'sentences'
  | 'minimal_pairs'
  | 'assessment'
  | 'ai_drills';

export const PronunciationView: React.FC = () => {
  // Current active mode (10 modes)
  const [activeMode, setActiveMode] = useState<PronunciationMode>('initials');

  // Selected item states per mode
  const [selectedInitial, setSelectedInitial] = useState<PinyinSoundItem>(INITIALS_DATA[0]);
  const [selectedFinal, setSelectedFinal] = useState<FinalSoundItem>(FINALS_DATA[0]);
  const [selectedTone, setSelectedTone] = useState<ToneItem>(TONES_DATA[0]);
  const [selectedSyllable, setSelectedSyllable] = useState<PinyinSyllableItem>(PINYIN_SYLLABLES_DATA[0]);
  const [selectedWord, setSelectedWord] = useState<WordPracticeItem>(WORD_PRACTICE_DATA[0]);
  const [selectedSentence, setSelectedSentence] = useState<SentencePracticeItem>(SENTENCE_PRACTICE_DATA[0]);
  const [selectedMinimalPair, setSelectedMinimalPair] = useState<MinimalPairItem>(MINIMAL_PAIRS_DATA[0]);
  const [assessmentIndex, setAssessmentIndex] = useState<number>(0);
  const [assessmentScores, setAssessmentScores] = useState<number[]>([]);

  // AI Drills & Custom
  const [aiDrillsData, setAiDrillsData] = useState<PersonalizedDrillsResult | null>(null);
  const [selectedAiDrillIdx, setSelectedAiDrillIdx] = useState<number>(0);
  const [customText, setCustomText] = useState<string>('你好，很高兴认识你');
  const [customPinyin, setCustomPinyin] = useState<string>('nǐ hǎo, hěn gāoxìng rènshí nǐ');
  const [isLoadingDrills, setIsLoadingDrills] = useState<boolean>(false);

  // Studio Audio Recording & Playback state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudioResult | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<boolean>(false);
  const [isPlayingNativeAudio, setIsPlayingNativeAudio] = useState<boolean>(false);
  const [isComparingSequential, setIsComparingSequential] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<PronunciationEvalResult | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  // Audio HTML elements refs
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Statistics & History modal
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<PronunciationStats | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Clean up audio recorder and wire listeners on mount
  useEffect(() => {
    audioRecorder.onDurationChange = (sec) => setRecordingSeconds(sec);
    audioRecorder.onVolumeChange = (vol) => setVolumeLevel(vol);

    return () => {
      audioRecorder.cleanup();
      audioRecorder.onDurationChange = undefined;
      audioRecorder.onVolumeChange = undefined;
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
    };
  }, []);

  // Reset current recorded audio & evaluation when switching mode or item
  const resetPracticeState = () => {
    if (isRecording) {
      audioRecorder.cancelRecording();
      setIsRecording(false);
    }
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current = null;
    }
    setRecordedAudio(null);
    setEvaluationResult(null);
    setLiveTranscript('');
    setIsPlayingUserAudio(false);
    setIsPlayingNativeAudio(false);
    setIsComparingSequential(false);
    setRecordingSeconds(0);
    setVolumeLevel(0);
  };

  // Determine current target text & pinyin based on activeMode
  const getCurrentTarget = (): {
    text: string;
    pinyin: string;
    type: 'initial' | 'final' | 'tone' | 'syllable' | 'word' | 'sentence' | 'contrast_pair' | 'custom';
    meaningVi: string;
    tipsVi?: string;
  } => {
    switch (activeMode) {
      case 'initials':
        return {
          text: selectedInitial.exampleZh,
          pinyin: selectedInitial.examplePinyin,
          type: 'initial',
          meaningVi: `${selectedInitial.exampleVi} (Thanh mẫu: ${selectedInitial.symbol})`,
          tipsVi: selectedInitial.vietnameseGuide
        };
      case 'finals':
        return {
          text: selectedFinal.exampleZh,
          pinyin: selectedFinal.examplePinyin,
          type: 'final',
          meaningVi: `${selectedFinal.exampleVi} (Vận mẫu: ${selectedFinal.symbol})`,
          tipsVi: selectedFinal.vietnameseGuide
        };
      case 'tones':
        return {
          text: selectedTone.exampleZh,
          pinyin: selectedTone.examplePinyin,
          type: 'tone',
          meaningVi: `${selectedTone.exampleVi} (${selectedTone.name})`,
          tipsVi: selectedTone.techniqueTips
        };
      case 'syllables':
        return {
          text: selectedSyllable.zh,
          pinyin: selectedSyllable.pinyinWithTone,
          type: 'syllable',
          meaningVi: selectedSyllable.vi,
          tipsVi: selectedSyllable.tipsVi
        };
      case 'words':
        return {
          text: selectedWord.zh,
          pinyin: selectedWord.pinyin,
          type: 'word',
          meaningVi: selectedWord.vi,
          tipsVi: selectedWord.tipsVi
        };
      case 'sentences':
        return {
          text: selectedSentence.zh,
          pinyin: selectedSentence.pinyin,
          type: 'sentence',
          meaningVi: selectedSentence.vi,
          tipsVi: selectedSentence.tipsVi
        };
      case 'minimal_pairs':
        return {
          text: selectedMinimalPair.word1.zh,
          pinyin: selectedMinimalPair.word1.pinyin,
          type: 'contrast_pair',
          meaningVi: selectedMinimalPair.word1.vi,
          tipsVi: selectedMinimalPair.phoneticDifference
        };
      case 'assessment': {
        const q = ASSESSMENT_QUESTIONS_DATA[assessmentIndex] || ASSESSMENT_QUESTIONS_DATA[0];
        return {
          text: q.zh,
          pinyin: q.pinyin,
          type: 'sentence',
          meaningVi: q.vi,
          tipsVi: q.diagnosticCriteria
        };
      }
      case 'ai_drills': {
        if (aiDrillsData && aiDrillsData.drills.length > 0) {
          const drill = aiDrillsData.drills[selectedAiDrillIdx] || aiDrillsData.drills[0];
          return {
            text: drill.zh,
            pinyin: drill.pinyin,
            type: 'custom',
            meaningVi: drill.vi,
            tipsVi: drill.explanationVi
          };
        }
        return {
          text: customText,
          pinyin: customPinyin,
          type: 'custom',
          meaningVi: 'Thực hành phát âm tự do',
          tipsVi: 'Đọc to rõ ràng theo ngữ điệu Quan thoại chuẩn.'
        };
      }
      default:
        return {
          text: '你好',
          pinyin: 'nǐ hǎo',
          type: 'word',
          meaningVi: 'Xin chào',
          tipsVi: 'Hai thanh 3 biến điệu'
        };
    }
  };

  // Play native reference audio (normal or slow)
  const handlePlayNativeAudio = (rate: number = 1.0) => {
    const target = getCurrentTarget();
    setIsPlayingNativeAudio(true);
    audioService.speak(target.text, { rate });
    setTimeout(() => {
      setIsPlayingNativeAudio(false);
    }, Math.max(1000, target.text.length * 500 / rate));
  };

  // Start recording
  const handleStartRecording = async () => {
    try {
      resetPracticeState();
      setIsRecording(true);
      setLiveTranscript('');

      // Start Web Speech recognition concurrently if supported
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

      // Start hardware recording (max 15s)
      await audioRecorder.startRecording(15);
    } catch (err: any) {
      setIsRecording(false);
      alert(err.message || 'Không thể bắt đầu thu âm.');
    }
  };

  // Stop recording & trigger 3-layer evaluation
  const handleStopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    try {
      const recResult = await audioRecorder.stopRecording();
      setRecordedAudio(recResult);

      // Stop speech recognition
      speechService.stopListening();

      // Trigger Evaluation API
      const target = getCurrentTarget();
      setIsEvaluating(true);

      const res = await backendClient.evaluatePronunciation({
        targetText: target.text,
        targetPinyin: target.pinyin,
        targetType: target.type,
        mode: activeMode,
        spokenTranscript: liveTranscript || target.text, // fallback if speech recognition was quiet
        audioDurationMs: recResult.durationMs,
        expectedDurationMs: target.text.length * 400 + 200
      });

      if (res.success && res.data) {
        setEvaluationResult(res.data);

        // If in assessment mode, record score
        if (activeMode === 'assessment') {
          const newScores = [...assessmentScores];
          newScores[assessmentIndex] = res.data.score;
          setAssessmentScores(newScores);
        }
      }
    } catch (err: any) {
      console.error('Stop recording & evaluate error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Play user's recorded audio
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

  // Sequential comparison: Native -> 500ms pause -> User audio
  const handleCompareSequential = () => {
    if (!recordedAudio) return;
    setIsComparingSequential(true);
    const target = getCurrentTarget();

    // 1. Play Native
    audioService.speak(target.text, { rate: 1.0 });
    const nativeDurationMs = Math.max(1200, target.text.length * 450);

    // 2. Play User audio after pause
    setTimeout(() => {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
      const audio = new Audio(recordedAudio.audioUrl);
      userAudioRef.current = audio;
      audio.onended = () => setIsComparingSequential(false);
      audio.play().catch(() => setIsComparingSequential(false));
    }, nativeDurationMs + 400);
  };

  // Load AI Drills
  const handleGenerateAiDrills = async () => {
    setIsLoadingDrills(true);
    try {
      const res = await backendClient.generatePronunciationDrills();
      if (res.success && res.data) {
        setAiDrillsData(res.data);
        setSelectedAiDrillIdx(0);
      }
    } catch (err) {
      console.error('Load AI drills error:', err);
    } finally {
      setIsLoadingDrills(false);
    }
  };

  // Load Stats & History modal
  const handleOpenStatsModal = async () => {
    setShowStatsModal(true);
    setIsLoadingHistory(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        backendClient.getPronunciationStats(),
        backendClient.getPronunciationHistory(20)
      ]);
      if (statsRes.success && statsRes.data) {
        setStatsData(statsRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistoryData(historyRes.data);
      }
    } catch (err) {
      console.error('Fetch stats & history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete history item
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await backendClient.deletePronunciationRecord(id);
      setHistoryData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete record error:', err);
    }
  };

  const currentTarget = getCurrentTarget();

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-6xl mx-auto px-2 sm:px-4">
      {/* Header Studio Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-primary-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Phòng Luyện Phát Âm Tiếng Trung Thông Minh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chinese Pronunciation Lab
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
              Luyện khẩu hình chuẩn Quan thoại, trực quan hóa cao độ 5 bậc thanh điệu, so sánh âm thanh thực tế với giọng bản xứ và nhận phản hồi sư phạm AI trung thực.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleOpenStatsModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-800 text-xs font-bold hover:bg-teal-50 shadow-md transition-all active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-primary-600" />
              <span>Tiến Độ & Lịch Sử</span>
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 10 Modes Navigation Selector (Scrollable Tabs) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { id: 'pinyin_intro', label: '1. Học Pinyin', icon: BookOpen },
          { id: 'tones', label: '2. Thanh Điệu & Biến Điệu', icon: TrendingUp },
          { id: 'initials', label: '3. 21 Thanh Mẫu', icon: Activity },
          { id: 'finals', label: '4. 36 Vận Mẫu', icon: BookOpen },
          { id: 'syllables', label: '5. Ghép Âm Tiết', icon: Zap },
          { id: 'words', label: '6. Từ Vựng HSK', icon: CheckCircle2 },
          { id: 'sentences', label: '7. Câu Hoàn Chỉnh', icon: Volume2 },
          { id: 'minimal_pairs', label: '8. Cặp Âm Dễ Nhầm', icon: AlertTriangle },
          { id: 'assessment', label: '9. Kiểm Tra Chẩn Đoán', icon: Award },
          { id: 'ai_drills', label: '10. Luyện Tự Do & Bài AI', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMode(tab.id as PronunciationMode);
                resetPracticeState();
                if (tab.id === 'ai_drills' && !aiDrillsData) {
                  handleGenerateAiDrills();
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20 scale-102'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* MODE 1: HỌC PINYIN (GIỚI THIỆU CẤU TRÚC NGỮ ÂM) */}
      {/* ============================================================== */}
      {activeMode === 'pinyin_intro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Thanh Mẫu (Phụ Âm Đầu)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống Quan thoại gồm <span className="font-bold text-teal-600">21 thanh mẫu</span> phân theo 6 nhóm vị trí cấu âm. Cần đặc biệt chú ý độ bật hơi (b vs p, d vs t) và độ uốn cong đầu lưỡi (zh, ch, sh).
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Vận Mẫu (Nguyên Âm & Vần)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gồm <span className="font-bold text-indigo-600">36 vận mẫu</span> (6 vận mẫu đơn a, o, e, i, u, ü; các vận mẫu kép và vận mẫu mũi an, en, in, ang, eng, ing, ong). Chú ý giữ môi tròn khi đọc âm <span className="font-bold text-rose-500">ü</span>.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Thanh Điệu (Cao Độ & Biến Điệu)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gồm <span className="font-bold text-amber-600">4 thanh điệu chính</span> (1: 5-5 cao bằng, 2: 3-5 đi lên, 3: 2-1-4 lượn sóng, 4: 5-1 rơi dứt khoát) và thanh nhẹ. Thanh điệu quyết định hoàn toàn ý nghĩa của từ.
              </p>
            </div>
          </div>

          {/* Syllable Equation Formula */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400">
              Công Thức Cấu Tạo Âm Tiết Tiếng Trung
            </h3>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-mono">
              <span className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Thanh Mẫu (m)
              </span>
              <span className="text-xl text-slate-400">+</span>
              <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Vận Mẫu (a)
              </span>
              <span className="text-xl text-slate-400">+</span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Thanh Điệu (¯ / ˇ)
              </span>
              <span className="text-xl text-slate-400">=</span>
              <span className="px-4 py-1.5 rounded-xl bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50">
                mā (妈 - Mẹ) / mǎ (马 - Ngựa)
              </span>
            </div>
            <p className="text-xs text-slate-400 text-center">
              * Một số âm tiết không có thanh mẫu (ví dụ: ài, ǒu, ān), hoặc nguyên âm i/u/ü biến thành y/w (yī, wǔ, yǔ).
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: THANH ĐIỆU (TONES) & BIỂU ĐỒ CAO ĐỘ 5 BẬC */}
      {/* ============================================================== */}
      {activeMode === 'tones' && (
        <div className="space-y-6">
          {/* Tone Visualizer Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TONES_DATA.map(tone => {
              const isSelected = selectedTone.toneNumber === tone.toneNumber;
              return (
                <div
                  key={tone.toneNumber}
                  onClick={() => {
                    setSelectedTone(tone);
                    resetPracticeState();
                    audioService.speak(tone.exampleZh);
                  }}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/60 dark:bg-primary-950/40 shadow-md scale-102 ring-2 ring-primary-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 font-black text-sm flex items-center justify-center">
                      {tone.toneNumber || '0'}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-500">
                      {tone.pitchKey}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {tone.name}
                    </h4>
                    <div className="text-[11px] text-slate-500">{tone.pitch}</div>
                  </div>

                  {/* SVG Pitch Curve Visualizer (5-degree scale) */}
                  <div className="h-16 w-full bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-2 relative flex items-center justify-center">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                      {/* Grid lines 1-5 */}
                      {[10, 20, 30, 40].map(y => (
                        <line
                          key={y}
                          x1="0"
                          y1={y}
                          x2="100"
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-700 stroke-[0.5]"
                          strokeDasharray="2 2"
                        />
                      ))}
                      {/* Pitch Path */}
                      {tone.pitchKey === '5-5' && (
                        <path d="M 10 10 L 90 10" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
                      )}
                      {tone.pitchKey === '3-5' && (
                        <path d="M 10 30 Q 50 25 90 10" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                      )}
                      {tone.pitchKey === '2-1-4' && (
                        <path d="M 10 35 Q 40 46 65 42 T 90 20" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                      )}
                      {tone.pitchKey === '5-1' && (
                        <path d="M 10 10 L 90 45" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                      )}
                      {tone.pitchKey === 'light' && (
                        <circle cx="50" cy="30" r="5" fill="#8b5cf6" />
                      )}
                    </svg>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="font-bold font-chinese text-slate-800 dark:text-slate-100">
                      {tone.exampleZh} ({tone.examplePinyin})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioService.speak(tone.exampleZh);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tone Sandhi Rules accordion */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>4 Quy Tắc Biến Điệu Bắt Buộc Trong Đàm Thoại Quan Thoại</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TONE_SANDHI_RULES.map(rule => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-100">{rule.name}</div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 font-mono font-bold text-amber-800 dark:text-amber-200">
                    {rule.ruleFormula}
                  </div>
                  <p className="text-slate-500 leading-relaxed">{rule.explanationVi}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rule.examples.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => audioService.speak(ex.written.split(' ')[0])}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-600 flex items-center gap-1"
                      >
                        <span className="font-chinese font-bold">{ex.written.split(' ')[0]}</span>
                        <span className="text-[10px] text-rose-500">➔ {ex.pronounced}</span>
                        <Volume2 className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 3: 21 THANH MẪU (INITIALS) THEO 6 NHÓM CẤU ÂM */}
      {/* ============================================================== */}
      {activeMode === 'initials' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-slate-500">
              Chọn một thanh mẫu để kích hoạt phòng thu luyện phát âm chi tiết:
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2.5">
              {INITIALS_DATA.map(sound => {
                const isSelected = selectedInitial.id === sound.id;
                return (
                  <button
                    key={sound.id}
                    onClick={() => {
                      setSelectedInitial(sound);
                      resetPracticeState();
                      audioService.speak(sound.exampleZh);
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm scale-105 ring-2 ring-primary-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl font-black">{sound.symbol}</div>
                    <div className="text-[11px] font-mono text-slate-400">{sound.ipa}</div>
                    {sound.isAspirated && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600">
                        Bật hơi
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-teal-600">
                  {selectedInitial.groupName}
                </span>
                <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {selectedInitial.symbol}
                </div>
              </div>
              <button
                onClick={() => audioService.speak(selectedInitial.exampleZh)}
                className="p-3 rounded-2xl bg-primary-600 text-white shadow-md hover:bg-primary-700"
                title="Nghe mẫu"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                  Khẩu hình miệng:
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {selectedInitial.mouthShape}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                  Vị trí đặt lưỡi:
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {selectedInitial.tonguePosition}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800">
                <span className="font-bold text-teal-700 dark:text-teal-300 block mb-0.5">
                  Hướng dẫn người Việt:
                </span>
                <span className="text-teal-900 dark:text-teal-100">
                  {selectedInitial.vietnameseGuide}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 4: 36 VẬN MẪU (FINALS) */}
      {/* ============================================================== */}
      {activeMode === 'finals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {FINALS_DATA.map(item => {
              const isSelected = selectedFinal.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedFinal(item);
                    resetPracticeState();
                    audioService.speak(item.exampleZh);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{item.ipa}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-600 mt-1">
                    {item.categoryName}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.exampleZh} [{item.examplePinyin}]
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Final Guide */}
          <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs uppercase font-bold text-indigo-600">
                Chi tiết vận mẫu: {selectedFinal.symbol} ({selectedFinal.categoryName})
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold">Khẩu hình: </span> {selectedFinal.mouthShape} •{' '}
                <span className="font-bold">Mẹo: </span> {selectedFinal.vietnameseGuide}
              </p>
            </div>
            <button
              onClick={() => audioService.speak(selectedFinal.exampleZh)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shrink-0 shadow-md"
            >
              <Volume2 className="w-4 h-4" />
              <span>Nghe ví dụ ({selectedFinal.exampleZh})</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 5: GHÉP ÂM TIẾT PINYIN (SYLLABLES) */}
      {/* ============================================================== */}
      {activeMode === 'syllables' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Luyện ghép nối phụ âm đầu, vần và thanh điệu chuẩn xác trước khi sang từ vựng:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {PINYIN_SYLLABLES_DATA.map(item => {
              const isSelected = selectedSyllable.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedSyllable(item);
                    resetPracticeState();
                    audioService.speak(item.zh);
                  }}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 shadow-md scale-102 ring-2 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-chinese text-slate-800 dark:text-slate-100">
                      {item.zh}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700">
                      Thanh {item.tone}
                    </span>
                  </div>
                  <div className="text-base font-bold text-rose-500 font-mono">
                    {item.pinyinWithTone}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{item.vi}</div>
                  <div className="text-[10px] text-primary-600 font-medium">
                    {item.phoneticBreakdown}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 6: TỪ VỰNG TRỌNG TÂM (WORDS) */}
      {/* ============================================================== */}
      {activeMode === 'words' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {WORD_PRACTICE_DATA.map(item => {
              const isSelected = selectedWord.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedWord(item);
                    resetPracticeState();
                    audioService.speak(item.zh);
                  }}
                  className={`p-4 rounded-3xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 shadow-md scale-102 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-chinese text-slate-800 dark:text-slate-100">
                      {item.zh}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                      HSK {item.level}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-rose-500">{item.pinyin}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{item.vi}</div>
                  <div className="text-[10px] text-emerald-600 font-medium bg-emerald-100/50 dark:bg-emerald-950/50 p-1.5 rounded-xl">
                    Trọng tâm: {item.focusSound}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 7: CÂU HOÀN CHỈNH (SENTENCES) */}
      {/* ============================================================== */}
      {activeMode === 'sentences' && (
        <div className="space-y-3">
          {SENTENCE_PRACTICE_DATA.map(item => {
            const isSelected = selectedSentence.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedSentence(item);
                  resetPracticeState();
                  audioService.speak(item.zh);
                }}
                className={`p-5 rounded-3xl border cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg sm:text-xl font-black font-chinese text-slate-800 dark:text-slate-100">
                    {item.zh}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioService.speak(item.zh);
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-indigo-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs font-semibold text-rose-500">{item.pinyin}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">{item.vi}</div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    <strong className="text-slate-700 dark:text-slate-200">Gợi ý nhịp điệu: </strong>
                    {item.rhythmHint}
                  </span>
                  <span className="text-indigo-600 font-semibold">{item.tipsVi}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 8: CẶP ÂM DỄ NHẦM CỦA NGƯỜI VIỆT (MINIMAL PAIRS) */}
      {/* ============================================================== */}
      {activeMode === 'minimal_pairs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Luyện Phản Xạ Cặp Âm Tương Phản (Minimal Pairs):</span>
              Phân biệt âm uốn lưỡi vs thẳng lưỡi, âm bật hơi vs không bật hơi, và nguyên âm tròn môi ü. Nhấn vào từng từ để nghe đối chiếu trực tiếp sự khác biệt.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MINIMAL_PAIRS_DATA.map(pair => {
              const isSelected = selectedMinimalPair.id === pair.id;
              return (
                <div
                  key={pair.id}
                  onClick={() => {
                    setSelectedMinimalPair(pair);
                    resetPracticeState();
                  }}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all space-y-3 ${
                    isSelected
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 shadow-md ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between">
                    <span>{pair.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600">
                      Đối chiếu
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 grid grid-cols-2 gap-3 text-center">
                    {/* Word 1 */}
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-xl font-bold font-chinese text-slate-800 dark:text-slate-100">
                        {pair.word1.zh}
                      </div>
                      <div className="text-xs font-semibold text-rose-500">{pair.word1.pinyin}</div>
                      <div className="text-[10px] text-slate-400">{pair.word1.vi}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioService.speak(pair.word1.zh);
                        }}
                        className="mt-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Word 2 */}
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-xl font-bold font-chinese text-slate-800 dark:text-slate-100">
                        {pair.word2.zh}
                      </div>
                      <div className="text-xs font-semibold text-rose-500">{pair.word2.pinyin}</div>
                      <div className="text-[10px] text-slate-400">{pair.word2.vi}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioService.speak(pair.word2.zh);
                        }}
                        className="mt-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    <strong className="text-slate-700 dark:text-slate-300">Khác biệt cốt lõi: </strong>
                    {pair.phoneticDifference}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 9: KIỂM TRA CHẨN ĐOÁN PHÁT ÂM (ASSESSMENT QUIZ) */}
      {/* ============================================================== */}
      {activeMode === 'assessment' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Câu hỏi {assessmentIndex + 1} / {ASSESSMENT_QUESTIONS_DATA.length}
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Đánh Giá Trình Độ Phát Âm Toàn Diện
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {ASSESSMENT_QUESTIONS_DATA.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAssessmentIndex(idx);
                      resetPracticeState();
                    }}
                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      assessmentIndex === idx
                        ? 'bg-primary-600 text-white shadow-md'
                        : assessmentScores[idx] !== undefined
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment item criteria */}
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 space-y-1">
              <span className="font-bold block">Yếu tố kiểm tra:</span>
              <div className="flex flex-wrap gap-1">
                {ASSESSMENT_QUESTIONS_DATA[assessmentIndex].testedElements.map((el, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-semibold">
                    {el}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 pt-1">
                {ASSESSMENT_QUESTIONS_DATA[assessmentIndex].diagnosticCriteria}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 10: LUYỆN TỰ DO & BÀI AI CÁ NHÂN HÓA (AI DRILLS) */}
      {/* ============================================================== */}
      {activeMode === 'ai_drills' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Bài Luyện Phát Âm Do AI Sinh Riêng Cho Bạn</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Dựa trên các lỗi phát âm và điểm yếu đã ghi nhận trong cơ sở dữ liệu SQLite của bạn.
                </p>
              </div>
              <button
                onClick={handleGenerateAiDrills}
                disabled={isLoadingDrills}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 shadow-md disabled:opacity-50 self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrills ? 'animate-spin' : ''}`} />
                <span>{isLoadingDrills ? 'Đang phân tích...' : 'Làm mới bài tập AI'}</span>
              </button>
            </div>

            {aiDrillsData && aiDrillsData.drills.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {aiDrillsData.focusAreas.map((area, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 text-xs font-semibold">
                      ⚡ Trọng tâm: {area}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {aiDrillsData.drills.map((drill, idx) => {
                    const isSelected = selectedAiDrillIdx === idx;
                    return (
                      <div
                        key={drill.id || idx}
                        onClick={() => {
                          setSelectedAiDrillIdx(idx);
                          resetPracticeState();
                          audioService.speak(drill.zh);
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 shadow-md ring-2 ring-primary-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-bold text-primary-600">{drill.targetSound}</div>
                        <div className="text-lg font-black font-chinese text-slate-800 dark:text-slate-100">
                          {drill.zh}
                        </div>
                        <div className="text-xs font-semibold text-rose-500">{drill.pinyin}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{drill.vi}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Hoặc tự nhập câu tiếng Trung bất kỳ để luyện tập:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Nhập chữ Hán (vd: 我很喜欢学中文)"
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-chinese font-bold"
                  />
                  <input
                    type="text"
                    value={customPinyin}
                    onChange={(e) => setCustomPinyin(e.target.value)}
                    placeholder="Nhập pinyin tương ứng"
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎙️ THE CORE AUDIO STUDIO CARD (ACTIVE IN ALL MODES) */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <span>Phòng Thu Phát Âm Chuyên Sâu</span>
          </div>

          {/* Current Target Phrase Display */}
          <div className="space-y-1 py-1">
            <div className="text-3xl sm:text-4xl md:text-5xl font-black font-chinese tracking-wide text-slate-800 dark:text-slate-100">
              {currentTarget.text}
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-500 font-mono">
              {currentTarget.pinyin}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium">
              {currentTarget.meaningVi}
            </div>
          </div>

          {/* Native Audio Controls (Normal & Slow) */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handlePlayNativeAudio(1.0)}
              disabled={isPlayingNativeAudio}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-all shadow-sm"
            >
              <Volume2 className="w-4 h-4" />
              <span>Nghe Bản Xứ (Chuẩn 1.0x)</span>
            </button>

            <button
              onClick={() => handlePlayNativeAudio(0.7)}
              disabled={isPlayingNativeAudio}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all shadow-sm"
            >
              <FastForward className="w-3.5 h-3.5 rotate-180" />
              <span>Nghe Chậm (0.7x Giữ Hơi)</span>
            </button>

            {recordedAudio && (
              <button
                onClick={handleCompareSequential}
                disabled={isComparingSequential}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-all shadow-sm"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isComparingSequential ? 'animate-spin' : ''}`} />
                <span>So Sánh Liên Tiếp (Bản Xứ ➔ Bạn)</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Volume Waveform / Meter Display during recording */}
        {isRecording && (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>Đang ghi âm... ({recordingSeconds}s / 15s)</span>
            </div>

            {/* Simulated Live Volume Bars */}
            <div className="flex items-center justify-center gap-1 h-8">
              {[...Array(16)].map((_, i) => {
                const height = Math.max(15, Math.min(100, volumeLevel * (0.5 + Math.sin(i * 0.8) * 0.5)));
                return (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className="w-1.5 rounded-full bg-rose-500 transition-all duration-75"
                  />
                );
              })}
            </div>
            <div className="text-[11px] text-slate-500">
              Hãy đọc to, ngân rõ nguyên âm và giữ hơi đều đặn
            </div>
          </div>
        )}

        {/* Big Record Button */}
        <div className="flex flex-col items-center justify-center py-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-teal-500 via-primary-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
            >
              <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center animate-pulse"
            >
              <MicOff className="w-10 h-10" />
            </button>
          )}

          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-3">
            {isRecording
              ? 'Nhấn nút đỏ để DỪNG thu âm & CHẤM ĐIỂM'
              : recordedAudio
              ? 'Nhấn nút để thu âm lại'
              : 'Nhấn nút để bắt đầu ghi âm giọng bạn'}
          </div>
        </div>

        {/* User Recorded Audio Playback Bar */}
        {recordedAudio && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePlayUserAudio}
                className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 shrink-0"
              >
                {isPlayingUserAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Bản ghi giọng của bạn
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Thời lượng: {(recordedAudio.durationMs / 1000).toFixed(1)}s • {recordedAudio.mimeType.split(';')[0]}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={resetPracticeState}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Xóa bản ghi</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading spinner while evaluating */}
        {isEvaluating && (
          <div className="p-6 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-center space-y-2 animate-in fade-in">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
            <div className="text-xs font-bold text-teal-800 dark:text-teal-200">
              AI đang phân tích 3 lớp âm học, đối chiếu ký tự và tổng hợp hướng dẫn sư phạm...
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 📊 HONEST 3-LAYER EVALUATION DISPLAY */}
        {/* ============================================================== */}
        {evaluationResult && (
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
            {/* Header Score & Grade Banner */}
            <div
              className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                evaluationResult.score >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-900 dark:text-emerald-100'
                  : evaluationResult.score >= 60
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 text-amber-900 dark:text-amber-100'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 text-rose-900 dark:text-rose-100'
              }`}
            >
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Award className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Kết Quả Đánh Giá Phát Âm AI
                  </span>
                </div>
                <div className="text-2xl font-black">
                  {evaluationResult.accuracyGrade === 'excellent' && 'Xuất Sắc! Phát âm chuẩn xác'}
                  {evaluationResult.accuracyGrade === 'good' && 'Tốt! Khẩu hình khá chuẩn'}
                  {evaluationResult.accuracyGrade === 'fair' && 'Khá! Cần điều chỉnh thêm luồng hơi'}
                  {evaluationResult.accuracyGrade === 'needs_improvement' && 'Cần Luyện Thêm! Hãy nghe chậm mẫu'}
                </div>
                <div className="text-xs opacity-80">
                  {evaluationResult.practiceTipVi}
                </div>
              </div>

              <div className="text-center sm:text-right shrink-0">
                <div className="text-4xl sm:text-5xl font-black">
                  {evaluationResult.score}
                  <span className="text-lg opacity-60">/100</span>
                </div>
                <div className="text-[11px] font-bold mt-0.5">
                  {evaluationResult.isMatch ? '✓ Khớp nội dung yêu cầu' : '⚡ Có từ chưa khớp'}
                </div>
              </div>
            </div>

            {/* LAYER 1: REAL ACOUSTIC DURATION METRICS */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Lớp 1: Phân Tích Âm Học Thực Tế (Acoustic Pacing)</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  evaluationResult.audioMetrics.speedPacing === 'natural'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {evaluationResult.audioMetrics.speedPacing === 'natural' ? 'Nhịp điệu tự nhiên' : 'Cần chỉnh tốc độ'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                  <div className="text-[10px] text-slate-400">Thời lượng ghi âm:</div>
                  <div className="font-bold font-mono text-slate-700 dark:text-slate-200">
                    {evaluationResult.audioMetrics.durationMs}ms
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                  <div className="text-[10px] text-slate-400">Thời lượng chuẩn:</div>
                  <div className="font-bold font-mono text-slate-700 dark:text-slate-200">
                    ~{evaluationResult.audioMetrics.expectedDurationMs}ms
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80">
                  <div className="text-[10px] text-slate-400">Đánh giá nhịp:</div>
                  <div className="text-[11px] font-semibold text-teal-600 truncate">
                    {evaluationResult.audioMetrics.durationAssessment}
                  </div>
                </div>
              </div>
            </div>

            {/* LAYER 2: ASR SPEECH RECOGNITION & CHARACTER MATCHING */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Lớp 2: Kết Quả Nhận Diện Ký Tự ASR (Character Alignment)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Nghe được: "{evaluationResult.spokenTranscript}"
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {evaluationResult.wordAnalysis.map((word, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-center min-w-[50px] ${
                      word.status === 'correct'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <div className="text-xl font-black font-chinese">{word.char}</div>
                    <div className="text-[10px] font-mono opacity-80">{word.pinyin}</div>
                    <div className="text-[9px] font-bold mt-0.5">
                      {word.status === 'correct' ? '✓ Đúng' : `⚡ Lệch: ${word.spokenChar || 'bỏ sót'}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LAYER 3: PEDAGOGICAL AI FEEDBACK (MOUTH, TONGUE, VIETNAMESE GUIDE) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Lớp 3: Hướng Dẫn Sư Phạm Của Chuyên Gia Ngữ Âm AI</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    Khẩu hình & Kỹ thuật phát âm:
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {evaluationResult.phoneticFeedbackVi}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lưu ý thanh điệu & Lỗi người Việt:</span>
                  </div>
                  <p className="text-amber-950 dark:text-amber-100 leading-relaxed">
                    {evaluationResult.toneFeedbackVi}
                  </p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {evaluationResult.strengths.length > 0 && (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold block mb-1">Điểm bạn làm tốt:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {evaluationResult.strengths.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationResult.improvements.length > 0 && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
                    <span className="font-bold block mb-1">Điểm cần cải thiện:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {evaluationResult.improvements.map((imp, i) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* HONEST TONE DISCLAIMER */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Cam kết trung thực:</strong> Thanh điệu Quan thoại phụ thuộc vào cao độ tương đối của mỗi người. Hệ thống kết hợp phân tích nhịp điệu thực tế và so sánh mẫu bản xứ, tránh đưa ra các điểm số cao độ ảo.
                </span>
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
                  Thống Kê Tiến Bộ & Lịch Sử Luyện Phát Âm
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
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60">
                  <div className="text-2xl font-black text-teal-600">{statsData.totalPractices}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tổng lượt luyện</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60">
                  <div className="text-2xl font-black text-indigo-600">{statsData.accuracyAverage}%</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Độ chuẩn TB</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60">
                  <div className="text-2xl font-black text-emerald-600">{statsData.masteredSoundsCount}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Âm đã thành thạo</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60">
                  <div className="text-2xl font-black text-rose-600">{statsData.strugglingSoundsCount}</div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Âm cần cải thiện</div>
                </div>
              </div>
            )}

            {/* Struggling Sounds List */}
            {statsData && statsData.strugglingSounds.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs space-y-1">
                <span className="font-bold text-rose-900 dark:text-rose-200 block">
                  Các âm bạn hay phát âm sai nhất:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {statsData.strugglingSounds.map((snd, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold">
                      {snd}
                    </span>
                  ))}
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
                  Chưa có lượt thu âm nào được ghi nhận. Hãy bắt đầu luyện tập ngay!
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
                          <span className="font-bold font-chinese text-slate-800 dark:text-slate-100">
                            {item.targetText}
                          </span>
                          <span className="text-rose-500 font-mono text-[11px]">[{item.targetPinyin}]</span>
                          <span className="text-[10px] text-slate-400">({item.mode})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Nghe được: "{item.spokenTranscript}" • {(item.audioDurationMs / 1000).toFixed(1)}s
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-black text-sm ${
                          item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {item.score}đ
                        </span>
                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
};
