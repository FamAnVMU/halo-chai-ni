import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  MessageSquare,
  Phone,
  PhoneOff,
  AlertCircle,
  Brain,
  FileText,
  BookmarkPlus,
  Radio,
  Server,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BookA,
} from 'lucide-react';
import type {
  AIChatMessage,
  AIChatMode,
  AILearnerMemory,
  HSKLevel,
  PostSessionReport,
  ConversationAnalysisReport
} from '../types';
import { ConversationReportModal } from '../components/chat/ConversationReportModal';
import { db } from '../db';
import { aiService } from '../utils/aiService';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';
import { GeminiLiveAudioClient } from '../utils/geminiLiveAudioClient';
import { backendClient } from '../utils/backendClient';
import { RubyText } from '../components/common/RubyText';
import type { NavTab } from '../components/layout/Sidebar';

interface AITutorViewProps {
  onNavigate?: (tab: NavTab) => void;
}

export const AITutorView: React.FC<AITutorViewProps> = ({ onNavigate }) => {
  const [activeSubMode, setActiveSubMode] = useState<'text' | 'voice'>('text');
  const [chatMode, setChatMode] = useState<AIChatMode>('free');
  const [hskLevel, setHskLevel] = useState<HSKLevel>(1);
  const [scenario, setScenario] = useState<string>('restaurant');
  const [speed] = useState<number>(1.0);

  // Chat session & messages
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const currentSessionId = 'session_default';

  // Voice Chat States
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isAiAudioOn, setIsAiAudioOn] = useState<boolean>(true);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [voiceSubtitles, setVoiceSubtitles] = useState<{
    zh: string;
    pinyin: string;
    vi: string;
  } | null>(null);

  // Gemini Live Audio Client Instance
  const liveAudioClientRef = useRef<GeminiLiveAudioClient | null>(null);

  // Memory & Report Modals
  const [aiMemory, setAiMemory] = useState<AILearnerMemory | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [tutorCompetency, setTutorCompetency] = useState<{
    profile: {
      vocabBreadth: number;
      grammarAccuracy: number;
      listening: number;
      reading: number;
      writing: number;
      fluency: number;
      overallHsk: number;
      targetHsk: number;
    };
    evidences: Array<{
      id: string;
      targetType: string;
      targetKey: string;
      claimSummary: string;
      evidenceQuote: string;
      sourceActivity: string;
      observationCount: number;
      confidenceScore: number;
      masteryStage: string;
    }>;
  } | null>(null);
  const [postReport, setPostReport] = useState<PostSessionReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // AI Conversation Analysis & Deep Evaluation
  const [conversationReport, setConversationReport] = useState<ConversationAnalysisReport | null>(null);
  const [isConversationReportOpen, setIsConversationReportOpen] = useState<boolean>(false);
  const [isAnalyzingConversation, setIsAnalyzingConversation] = useState<boolean>(false);

  const handleOpenConversationAnalysis = async (force: boolean = false) => {
    setIsAnalyzingConversation(true);
    try {
      const isAlive = await backendClient.checkHealth();
      if (!isAlive) {
        const report = await aiService.generatePostSessionReport(messages, hskLevel);
        setPostReport(report);
        setIsReportModalOpen(true);
        return;
      }

      const res = await backendClient.analyzeConversationSession(currentSessionId, {
        force,
        sessionType: activeSubMode === 'voice' || isVoiceActive ? 'voice' : 'text'
      });

      if (res.success && res.data) {
        setConversationReport(res.data);
        setIsConversationReportOpen(true);
      } else {
        alert(res.error || 'Cần có ít nhất 2 lượt trao đổi để phân tích buổi học.');
      }
    } catch (e: any) {
      alert('Lỗi phân tích hội thoại: ' + e.message);
    } finally {
      setIsAnalyzingConversation(false);
    }
  };

  // Auto Analysis & Lesson Generation
  const [isAnalyzingAndCreating, setIsAnalyzingAndCreating] = useState<boolean>(false);
  const [analysisResultModal, setAnalysisResultModal] = useState<any | null>(null);

  const handleAnalyzeAndCreateLesson = async () => {
    setIsAnalyzingAndCreating(true);
    try {
      const isAlive = await backendClient.checkHealth();
      if (!isAlive) {
        alert('Local Backend chưa kết nối. Vui lòng chạy "npm run server" trên máy tính.');
        setIsAnalyzingAndCreating(false);
        return;
      }

      // 1. Analyze Session
      const analysisRes = await backendClient.analyzeSession(currentSessionId);
      if (!analysisRes.success) {
        alert('Lỗi phân tích: ' + (analysisRes.error || 'Vui lòng trò chuyện thêm một vài câu trước khi phân tích'));
        setIsAnalyzingAndCreating(false);
        return;
      }

      // 2. Auto Generate Lesson from analysis suggestion
      const lessonRes = await backendClient.generateLesson({
        topic: analysisRes.data?.suggestedLesson?.topic,
        lessonType: analysisRes.data?.suggestedLesson?.lessonType || 'reinforce',
        sessionId: currentSessionId
      });

      setAnalysisResultModal({
        analysis: analysisRes.data,
        lesson: lessonRes.data
      });
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    } finally {
      setIsAnalyzingAndCreating(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roleplayScenarios = [
    { id: 'restaurant', name: 'Gọi món nhà hàng (点餐)', prompt: 'Bạn là bồi bàn nhà hàng Trung Hoa, khách vào gọi món.' },
    { id: 'shopping', name: 'Đi chợ mua sắm (购物)', prompt: 'Bạn là chủ sạp hoa quả tại Bắc Kinh, cùng khách mặc cả giá.' },
    { id: 'asking_way', name: 'Hỏi đường (问路)', prompt: 'Người học hỏi đường đến ga tàu cao tốc gần nhất.' },
    { id: 'introduction', name: 'Làm quen kết bạn (交朋友)', prompt: 'Gặp gỡ một người bạn mới tại trường đại học.' },
    { id: 'job_interview', name: 'Phỏng vấn xin việc (面试)', prompt: 'Phỏng vấn ứng viên vào vị trí nhân viên kinh doanh.' },
    { id: 'hotel', name: 'Đặt phòng khách sạn (订酒店)', prompt: 'Nhân viên lễ tân hỗ trợ check-in khách sạn.' },
    { id: 'travel', name: 'Du lịch Trung Quốc (旅游)', prompt: 'Hướng dẫn viên tư vấn các điểm tham quan tại Tây An.' },
  ];

  useEffect(() => {
    loadSession();
    loadMemory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  useEffect(() => {
    return () => {
      audioService.stopSpeaking();
      speechService.stopListening();
      if (liveAudioClientRef.current) {
        liveAudioClientRef.current.stop();
      }
    };
  }, []);

  const loadSession = async () => {
    const session = await db.aiSessions.get(currentSessionId);
    if (session) {
      setMessages(session.messages || []);
      setChatMode(session.mode);
      setHskLevel(session.hskLevel);
    } else {
      const initialWelcome: AIChatMessage = {
        id: 'msg_welcome',
        sender: 'assistant',
        text: '你好！我是你的中文AI老师。今天你想聊什么？或者选择上方的模式，我们一起练习吧！',
        pinyin: 'Nǐ hǎo! Wǒ shì nǐ de zhōngwén AI lǎoshī. Jīntiān nǐ xiǎng liáo shénme? Huòzhě xuǎnzé shàngfāng de móshì, wǒmen yìqǐ liànxí ba!',
        translationVi: 'Xin chào! Tôi là giáo viên tiếng Trung AI của bạn. Hôm nay bạn muốn trò chuyện về chủ đề gì? Hoặc hãy chọn một chế độ bên trên để cùng luyện tập nhé!',
        timestamp: Date.now(),
      };
      setMessages([initialWelcome]);
      await db.aiSessions.add({
        id: currentSessionId,
        mode: 'free',
        title: 'Buổi học tiếng Trung',
        hskLevel: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [initialWelcome],
      });
    }
  };

  const loadMemory = async () => {
    try {
      const compRes = await backendClient.getTutorCompetency();
      if (compRes?.success && compRes?.data) {
        setTutorCompetency(compRes.data);
      }
    } catch (_e) {}

    const mem = await backendClient.getLearnerMemory();
    if (mem) {
      setAiMemory({
        id: 'default',
        knownWeaknesses: mem.weaknesses || [],
        frequentlyMispronouncedWords: mem.mispronounced || [],
        masteredGrammar: mem.masteredGrammar || [],
        strugglingGrammar: mem.strugglingGrammar || [],
        topicsPracticed: [],
        personalNotes: mem.notes || '',
        updatedAt: mem.updatedAt || Date.now()
      });
    } else {
      const localMem = await db.aiMemory.get('default');
      if (localMem) setAiMemory(localMem);
    }
  };

  const saveMessagesToDb = async (newMsgs: AIChatMessage[]) => {
    setMessages(newMsgs);
    await db.aiSessions.update(currentSessionId, {
      messages: newMsgs,
      updatedAt: Date.now(),
    });

    const today = new Date().toISOString().split('T')[0];
    const stat = await db.dailyStats.get(today);
    if (stat) {
      await db.dailyStats.update(today, {
        aiSessionsCount: stat.aiSessionsCount + 1,
        studyTimeMinutes: stat.studyTimeMinutes + 2,
      });
    }
  };

  const handleSendTextMessage = async (customText?: string, overrideIntent?: string) => {
    const textToSend = customText || inputMsg.trim();
    if (!textToSend || isAiThinking) return;

    if (!customText) setInputMsg('');

    const userMsg: AIChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    saveMessagesToDb(updated);
    setIsAiThinking(true);

    try {
      const activeScenario = chatMode === 'roleplay' ? scenario : undefined;
      const res = await aiService.sendMessage(
        textToSend,
        messages,
        chatMode,
        hskLevel,
        activeScenario,
        overrideIntent
      );

      const aiMsg: AIChatMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'assistant',
        text: res.replyZh,
        pinyin: res.replyPinyin,
        translationVi: res.replyVi,
        pedagogicFocus: res.pedagogicFocus,
        intentDetected: res.intentDetected,
        microCheckPrompt: res.microCheckPrompt,
        correction: res.correction,
        timestamp: Date.now(),
      };

      const finalMsgs = [...updated, aiMsg];
      saveMessagesToDb(finalMsgs);
      setIsAiThinking(false);
    } catch (e) {
      console.error('AI chat error:', e);
      setIsAiThinking(false);
    }
  };

  // ==================== REAL-TIME GEMINI LIVE VOICE CHAT ====================
  const startVoiceChat = async () => {
    const hasMic = await speechService.checkMicrophonePermission();
    if (!hasMic) {
      alert('Vui lòng cấp quyền Microphone trong trình duyệt để đàm thoại với AI!');
      return;
    }

    const isBackendAlive = await backendClient.checkHealth();
    if (!isBackendAlive) {
      // Fallback to Web Speech Loop if backend is not started
      console.warn('Local Backend offline, using Web Speech audio pipeline fallback.');
      setIsVoiceActive(true);
      setVoiceStatus('listening');
      triggerSpeechSynthesisLoop();
      return;
    }

    setIsVoiceActive(true);
    setVoiceStatus('connecting');
    setLiveTranscript('');
    setVoiceSubtitles(null);

    // Initialize Gemini Live Audio Client connecting to ws://localhost:3001/api/live
    const client = new GeminiLiveAudioClient();
    liveAudioClientRef.current = client;

    client.onStatusChange = (st) => setVoiceStatus(st);
    client.onUserTranscription = (text) => setLiveTranscript(text);
    client.onAiTranscription = (text) => {
      setVoiceSubtitles((prev) => ({
        zh: (prev?.zh || '') + ' ' + text,
        pinyin: '',
        vi: ''
      }));
    };
    client.onInterrupted = () => {
      console.log('Gemini Live interrupted by user speaking!');
    };
    client.onError = (err) => {
      console.error('Gemini Live Audio error:', err);
      alert(err);
      stopVoiceChat();
    };

    await client.start({
      sessionId: currentSessionId,
      hskLevel,
      mode: chatMode,
      scenario: chatMode === 'roleplay' ? scenario : undefined,
    });
  };

  const stopVoiceChat = () => {
    setIsVoiceActive(false);
    setVoiceStatus('idle');
    setLiveTranscript('');
    if (liveAudioClientRef.current) {
      liveAudioClientRef.current.stop();
      liveAudioClientRef.current = null;
    }
    audioService.stopSpeaking();
    speechService.stopListening();
  };

  // Web Speech fallback when backend WS is offline
  const triggerSpeechSynthesisLoop = () => {
    if (!isVoiceActive) return;

    speechService.startListening(
      (payload) => {
        if (voiceStatus === 'speaking') {
          audioService.stopSpeaking();
        }

        setVoiceStatus('listening');
        setLiveTranscript(payload.transcript);

        if (payload.isFinal && payload.transcript.trim()) {
          setVoiceStatus('thinking');
          handleSendTextMessage(payload.transcript);
        }
      },
      () => {
        if (isVoiceActive) {
          setTimeout(() => {
            if (isVoiceActive) triggerSpeechSynthesisLoop();
          }, 300);
        }
      },
      (err) => console.warn('Speech notice:', err)
    );
  };

  const handleInterruptAi = () => {
    if (liveAudioClientRef.current) {
      liveAudioClientRef.current.interrupt();
    }
    audioService.stopSpeaking();
    setVoiceStatus('listening');
  };

  const handleGenerateReport = async () => {
    setIsReportModalOpen(true);
    const report = await aiService.generatePostSessionReport(messages, hskLevel);
    setPostReport(report);
  };

  const handleVoiceTest = async () => {
    try {
      const sample = await backendClient.getVoiceSample();
      if (sample.audioBase64 && sample.source === 'gemini_live') {
        await audioService.playPcmAudio(sample.audioBase64, 24000);
      } else {
        audioService.speak(sample.sampleText || '你好！欢迎使用哈罗中文，发音测试正常。', { rate: speed });
      }
    } catch {
      audioService.speak('你好！欢迎使用哈罗中文，发音测试正常。', { rate: speed });
    }
  };

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto h-[calc(100dvh-130px)] md:h-[calc(100dvh-110px)] pb-1">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-[#1A2418] rounded-3xl border border-[#E3EBDD] dark:border-[#2D3A2C] shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          {/* Mode switch: Text / Voice */}
          <div className="flex bg-[#F6FAF2] dark:bg-[#151D14] p-1 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C]">
            <button
              onClick={() => {
                setActiveSubMode('text');
                if (isVoiceActive) stopVoiceChat();
              }}
              className={`touch-target h-10 px-3 rounded-xl text-xs font-bold transition-all ${
                activeSubMode === 'text'
                  ? 'bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5] shadow-xs'
                  : 'text-[#647560] dark:text-[#889B84]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              <span>Text Chat (Flash Lite)</span>
            </button>

            <button
              onClick={() => setActiveSubMode('voice')}
              className={`touch-target h-10 px-3 rounded-xl text-xs font-bold transition-all ${
                activeSubMode === 'voice'
                  ? 'bg-[#A3D635] text-[#263326] shadow-xs'
                  : 'text-[#647560] dark:text-[#889B84]'
              }`}
            >
              <Radio className="w-3.5 h-3.5 mr-1.5 text-[#263326]" />
              <span>Voice Chat (Live API)</span>
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value as AIChatMode)}
            className="touch-target h-10 text-xs font-semibold px-3 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5]"
          >
            <option value="free">Giao tiếp tự do</option>
            <option value="tutor">Giáo viên hướng dẫn (Sửa lỗi)</option>
            <option value="roleplay">Đóng vai tình huống</option>
            <option value="hsk">Luyện thi HSK</option>
            <option value="pronunciation">Luyện phát âm</option>
          </select>

          {/* HSK Level */}
          <select
            value={hskLevel}
            onChange={(e) => setHskLevel(Number(e.target.value) as HSKLevel)}
            className="touch-target h-10 text-xs font-semibold px-2.5 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] bg-white dark:bg-[#1A2418] text-[#263326] dark:text-[#EAF5D5]"
          >
            <option value={1}>HSK 1</option>
            <option value={2}>HSK 2</option>
            <option value={3}>HSK 3</option>
            <option value={4}>HSK 4</option>
            <option value={5}>HSK 5</option>
            <option value={6}>HSK 6</option>
          </select>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleVoiceTest}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 text-xs flex items-center gap-1"
            title="Thử âm thanh giọng đọc mẫu"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thử giọng</span>
          </button>

          <button
            onClick={() => setIsMemoryModalOpen(true)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 text-xs flex items-center gap-1"
            title="Xem hồ sơ bộ nhớ học tập của AI"
          >
            <Brain className="w-3.5 h-3.5 text-primary-500" />
            <span className="hidden sm:inline">Bộ nhớ SQLite</span>
          </button>

          <button
            onClick={() => handleOpenConversationAnalysis(true)}
            disabled={isAnalyzingConversation}
            className="p-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 shadow-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            title="AI phân tích chuyên sâu năng lực, từ vựng 4 nhóm, ngữ pháp và lỗi sai"
          >
            <Sparkles className={`w-3.5 h-3.5 text-rose-500 ${isAnalyzingConversation ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isAnalyzingConversation ? 'Đang phân tích...' : 'Phân tích hội thoại AI'}
            </span>
            <span className="sm:hidden">
              {isAnalyzingConversation ? '...' : 'Phân tích'}
            </span>
          </button>

          <button
            onClick={handleAnalyzeAndCreateLesson}
            disabled={isAnalyzingAndCreating}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            title="AI phân tích kiến thức đã dạy và tự động tạo bài học cá nhân hóa mới"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAnalyzingAndCreating ? 'Đang phân tích...' : 'Tạo bài học từ hội thoại'}</span>
            <span className="sm:hidden">{isAnalyzingAndCreating ? '...' : 'Tạo bài'}</span>
          </button>
        </div>
      </div>

      {/* Roleplay Scenarios Selector Bar */}
      {chatMode === 'roleplay' && (
        <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs shrink-0">
          <span className="font-bold text-slate-500 whitespace-nowrap">Tình huống:</span>
          {roleplayScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id)}
              className={`px-3 py-1 rounded-lg whitespace-nowrap font-semibold transition-colors ${
                scenario === sc.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      )}

      {/* ==================== VOICE CHAT ARENA (GEMINI LIVE API) ==================== */}
      {activeSubMode === 'voice' && (
        <div className="flex-1 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl border border-slate-800">
          {/* Status Header */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                voiceStatus === 'listening'
                  ? 'bg-rose-500 animate-ping'
                  : voiceStatus === 'speaking'
                  ? 'bg-emerald-400 animate-pulse'
                  : voiceStatus === 'connecting' || voiceStatus === 'thinking'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {voiceStatus === 'connecting'
                ? 'Đang kết nối Gemini Live WebSocket...'
                : voiceStatus === 'listening'
                ? 'Gemini Live đang lắng nghe...'
                : voiceStatus === 'speaking'
                ? 'AI đang trò chuyện trực tiếp...'
                : isVoiceActive
                ? 'Đang duy trì phiên Live'
                : 'Chưa bắt đầu hội thoại'}
            </span>
          </div>

          {/* Center Dynamic Waveform & Avatar */}
          <div className="text-center space-y-5 my-auto">
            <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
              {isVoiceActive && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-primary-500/30 animate-ping duration-1000" />
                  <div className="absolute inset-2 rounded-full border border-rose-500/40 animate-pulse" />
                </>
              )}

              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary-500/40 font-chinese font-black text-4xl text-white">
                师
              </div>
            </div>

            {/* Waveform Bar Animation */}
            {voiceStatus === 'speaking' || voiceStatus === 'listening' ? (
              <div className="flex items-center justify-center gap-1.5 h-8">
                <div className="w-1 bg-primary-400 rounded-full wave-animate-1" />
                <div className="w-1 bg-rose-400 rounded-full wave-animate-2" />
                <div className="w-1 bg-primary-400 rounded-full wave-animate-3" />
                <div className="w-1 bg-rose-400 rounded-full wave-animate-4" />
                <div className="w-1 bg-primary-400 rounded-full wave-animate-5" />
              </div>
            ) : null}

            {/* Live Subtitle Area */}
            <div className="max-w-md mx-auto space-y-1 min-h-[70px]">
              {liveTranscript ? (
                <div className="text-sm font-medium text-slate-300 italic">
                  Bạn: "{liveTranscript}"
                </div>
              ) : voiceSubtitles?.zh ? (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <div className="text-xl font-bold font-chinese text-white">
                    {voiceSubtitles.zh}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Nhấn nút Gọi điện bên dưới để kết nối trực tiếp với Gemini Live API.
                </div>
              )}
            </div>
          </div>

          {/* Voice Controls Bottom Bar */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3.5 rounded-full border transition-all ${
                isMicOn
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  : 'bg-rose-600/30 border-rose-500 text-rose-400'
              }`}
              title={isMicOn ? 'Tắt Mic' : 'Bật Mic'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {!isVoiceActive ? (
              <button
                onClick={startVoiceChat}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform"
                title="Bắt đầu gọi điện Live"
              >
                <Phone className="w-7 h-7 fill-current" />
              </button>
            ) : (
              <button
                onClick={stopVoiceChat}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-transform"
                title="Dừng cuộc gọi"
              >
                <PhoneOff className="w-7 h-7 fill-current" />
              </button>
            )}

            {/* Interrupt AI barge-in button */}
            <button
              onClick={handleInterruptAi}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20"
              title="Ngắt lời AI ngay"
            >
              Ngắt lời
            </button>

            <button
              onClick={() => {
                if (isAiAudioOn) audioService.stopSpeaking();
                setIsAiAudioOn(!isAiAudioOn);
              }}
              className={`p-3.5 rounded-full border transition-all ${
                isAiAudioOn
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  : 'bg-rose-600/30 border-rose-500 text-rose-400'
              }`}
              title={isAiAudioOn ? 'Tắt loa' : 'Bật loa'}
            >
              {isAiAudioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TEXT CHAT ARENA (GEMINI 3.5 FLASH LITE) ==================== */}
      {activeSubMode === 'text' && (
        <div className="flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl shadow-sm text-sm ${
                      isUser
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {!isUser ? (
                      <div className="space-y-2">
                        {msg.pedagogicFocus && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 text-[11px] font-bold text-primary-700 dark:text-primary-300 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-primary-500" />
                            <span>Trọng tâm: {msg.pedagogicFocus}</span>
                          </div>
                        )}

                        <div>
                          <RubyText text={msg.text} pinyinOverride={msg.pinyin} />
                        </div>

                        {msg.translationVi && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                            {msg.translationVi}
                          </div>
                        )}

                        {/* Grammar Correction */}
                        {msg.correction && (
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1 mt-2">
                            <div className="flex items-center justify-between gap-1 font-bold text-amber-800 dark:text-amber-200">
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Góp ý sửa lỗi:</span>
                              </div>
                              {msg.correction.severity && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  msg.correction.severity === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                                  msg.correction.severity === 'grammar' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  msg.correction.severity === 'naturalness' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {msg.correction.severity === 'critical' ? 'Đổi nghĩa' :
                                   msg.correction.severity === 'grammar' ? 'Sai ngữ pháp' :
                                   msg.correction.severity === 'naturalness' ? 'Chưa tự nhiên' : 'Dùng từ'}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 line-through">
                              Câu gốc: {msg.correction.original}
                            </div>
                            <div className="font-bold text-emerald-700 dark:text-emerald-300">
                              ✓ Nên sửa thành: {msg.correction.corrected}
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 pt-1">
                              {msg.correction.explanationVi}
                            </div>
                            {msg.correction.naturalSuggestion && (
                              <div className="text-slate-500 italic text-[11px]">
                                Gợi ý tự nhiên: "{msg.correction.naturalSuggestion}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Micro-check exercise if provided */}
                        {msg.microCheckPrompt && (
                          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-1.5 mt-2">
                            <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Thử vận dụng kiến thức ngay:</span>
                            </div>
                            {msg.microCheckPrompt.exerciseZh && (
                              <div className="font-bold font-chinese text-slate-800 dark:text-slate-100 text-sm">
                                {msg.microCheckPrompt.exerciseZh}
                              </div>
                            )}
                            {msg.microCheckPrompt.exerciseVi && (
                              <div className="text-slate-600 dark:text-slate-400">
                                {msg.microCheckPrompt.exerciseVi}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setInputMsg('');
                                handleSendTextMessage('Em thử trả lời câu hỏi vận dụng này nhé!');
                              }}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 pt-0.5"
                            >
                              Trả lời thử câu này ➔
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <button
                            onClick={() => audioService.speak(msg.text, { rate: speed })}
                            className="flex items-center gap-1 hover:text-primary-600"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Nghe câu
                          </button>

                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('halo:quick-dict', { detail: { word: msg.text.slice(0, 4) } }));
                            }}
                            className="flex items-center gap-1 hover:text-primary-600"
                            title="Tra từ điển nhanh"
                          >
                            <BookA className="w-3.5 h-3.5" /> Tra từ điển
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>{msg.text}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {isAiThinking && (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold p-2">
                <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
                <span>Lão sư AI đang soạn câu trả lời qua Backend...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            {/* Quick Pedagogic Action Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Sư phạm AI:</span>
              <button
                type="button"
                onClick={() => handleSendTextMessage('Em chưa hiểu lắm, Lão Sư giải thích bằng ví dụ đời sống dễ hiểu hơn được không ạ?', 'request_simpler')}
                disabled={isAiThinking}
                className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold hover:bg-amber-100 shrink-0 flex items-center gap-1"
              >
                💡 Giải thích dễ hơn
              </button>
              <button
                type="button"
                onClick={() => {
                  const prompt = window.prompt('Nhập 2 từ bạn muốn đối chiếu (ví dụ: 了 và 过, 想 và 要, 再 và 又):', '了 và 过');
                  if (prompt) {
                    handleSendTextMessage(`Lão Sư hãy giúp em phân tích và đối chiếu điểm khác nhau giữa ${prompt} trong cùng một tình huống cụ thể nhé!`, 'compare_words');
                  }
                }}
                disabled={isAiThinking}
                className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold hover:bg-blue-100 shrink-0 flex items-center gap-1"
              >
                🔍 So sánh từ dễ nhầm
              </button>
              <button
                type="button"
                onClick={() => handleSendTextMessage('Lão Sư cho em một câu bài tập ngắn để thử vận dụng ngay kiến thức này nhé!', 'drill_practice')}
                disabled={isAiThinking}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 shrink-0 flex items-center gap-1"
              >
                ✏️ Cho bài tập vận dụng
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubMode('voice');
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold hover:bg-rose-100 shrink-0 flex items-center gap-1"
              >
                🎙️ Sang Voice Chat (3.8 Live)
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTextMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Nhập câu tiếng Trung hoặc tiếng Việt để học tập..."
                className="flex-1 min-h-[48px] h-12 px-4 rounded-2xl border border-[#E3EBDD] dark:border-[#2D3A2C] bg-[#F6FAF2] dark:bg-[#151D14] text-sm text-[#263326] dark:text-[#EAF5D5] focus:outline-none focus:border-[#A3D635] focus:ring-2 focus:ring-[#A3D635]/30 transition-all placeholder:text-[#889B84]"
              />

              <button
                type="submit"
                disabled={!inputMsg.trim() || isAiThinking}
                className="touch-target w-12 h-12 rounded-2xl bg-[#A3D635] text-[#263326] font-bold disabled:opacity-40 hover:brightness-105 active:scale-95 shadow-sm transition-all shrink-0"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-5 h-5 stroke-[2.2]" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI Learner Memory */}
      {isMemoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Hồ Sơ Bộ Nhớ Học Tập (SQLite Localhost)
                </h3>
              </div>
              <button
                onClick={() => setIsMemoryModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Bộ nhớ được lưu trữ trong bảng <code>learner_profile</code> và <code>learner_evidence_ledger</code> tại SQLite máy tính cá nhân.
            </p>

            {/* 6D Competency Radar / Progress */}
            {tutorCompetency?.profile && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                  <span>Hồ Sơ Năng Lực 6 Chiều</span>
                  <span className="text-primary-600">HSK {tutorCompetency.profile.overallHsk} ➔ HSK {tutorCompetency.profile.targetHsk}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Vốn từ vựng</span>
                      <span className="font-bold">{tutorCompetency.profile.vocabBreadth}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tutorCompetency.profile.vocabBreadth}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Ngữ pháp</span>
                      <span className="font-bold">{tutorCompetency.profile.grammarAccuracy}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${tutorCompetency.profile.grammarAccuracy}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Nghe hiểu</span>
                      <span className="font-bold">{tutorCompetency.profile.listening}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${tutorCompetency.profile.listening}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Đọc hiểu</span>
                      <span className="font-bold">{tutorCompetency.profile.reading}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${tutorCompetency.profile.reading}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Viết & Đặt câu</span>
                      <span className="font-bold">{tutorCompetency.profile.writing}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tutorCompetency.profile.writing}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-0.5">
                      <span>Phản xạ & Lưu loát</span>
                      <span className="font-bold">{tutorCompetency.profile.fluency}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${tutorCompetency.profile.fluency}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Ledger Records */}
            {tutorCompetency?.evidences && tutorCompetency.evidences.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
                  Sổ Bằng Chứng Học Tập Thực Tế (Không Suy Diễn):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {tutorCompetency.evidences.map((ev: any) => (
                    <div key={ev.id} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-600 dark:text-primary-400">
                          [{ev.targetType}] {ev.targetKey}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Tin cậy {Math.round(ev.confidenceScore * 100)}% • {ev.masteryStage}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        {ev.claimSummary}
                      </div>
                      <div className="text-slate-400 italic text-[10px]">
                        Căn cứ câu: "{ev.evidenceQuote}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Điểm yếu cần chú ý:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  {aiMemory?.knownWeaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Từ hay phát âm sai:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {aiMemory?.frequentlyMispronouncedWords.map((word, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Ghi chú sư phạm:
                </span>
                <div className="text-slate-600 dark:text-slate-300">
                  {aiMemory?.personalNotes}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMemoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Post-Session Summary Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Báo Cáo Tiến Bộ Sau Buổi Học
                </h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>

            {postReport ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-900 dark:text-primary-100 font-bold">
                  Chủ đề: {postReport.topic}
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Từ mới đã học trong buổi:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {postReport.newWords.map((nw, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold font-chinese text-slate-900 dark:text-slate-100">
                            {nw.zh}
                          </span>
                          <span className="text-rose-500 font-semibold ml-1.5">[{nw.pinyin}]</span>
                          <div className="text-[11px] text-slate-500">{nw.vi}</div>
                        </div>
                        <button
                          onClick={async () => {
                            await db.vocabularies.add({
                              simplified: nw.zh,
                              traditional: nw.zh,
                              pinyin: nw.pinyin,
                              meaningVi: nw.vi,
                              wordType: 'Từ mới',
                              hskLevel: hskLevel,
                              exampleZh: '',
                              examplePinyin: '',
                              exampleVi: '',
                              isCustom: true,
                              createdAt: Date.now(),
                            });
                            alert(`Đã lưu từ "${nw.zh}" vào kho từ vựng!`);
                          }}
                          className="p-1 text-slate-400 hover:text-primary-600"
                          title="Lưu vào từ điển"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold block mb-1">Điểm mạnh:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {postReport.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200">
                    <span className="font-bold block mb-1">Cần cải thiện:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {postReport.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">Lời khuyên tiếp theo:</span>
                  {postReport.nextStepRecommendation}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Đang tổng hợp báo cáo...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Auto-Analysis & Created Lesson Dialog */}
      {analysisResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  AI Đã Phân Tích & Tạo Bài Học Mới!
                </h3>
              </div>
              <button
                onClick={() => setAnalysisResultModal(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-600 to-rose-600 text-white space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                Bài học được tạo cho riêng bạn:
              </span>
              <div className="font-black text-base">{analysisResultModal.lesson?.title}</div>
              <div className="text-xs text-rose-100">
                🎯 {analysisResultModal.lesson?.recommendationReason}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Tóm tắt buổi hội thoại:
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {analysisResultModal.analysis?.summaryVi}
                </p>
              </div>

              {analysisResultModal.analysis?.newVocabTaught?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    ✓ Đã ghi nhận từ vựng mới vào Bộ nhớ học tập:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {analysisResultModal.analysis.newVocabTaught.map((v: any, vi: number) => (
                      <span key={vi} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-chinese font-semibold text-[11px]">
                        {v.simplified} [{v.pinyin}]: {v.meaningVi}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysisResultModal.analysis?.mistakesDetected?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-200 block">
                    ! Đã lưu lỗi sai để theo dõi & đưa vào bài tập:
                  </span>
                  {analysisResultModal.analysis.mistakesDetected.map((err: any, ei: number) => (
                    <div key={ei} className="text-slate-700 dark:text-slate-300">
                      • <span className="font-semibold">{err.title}</span> (Câu sai: <i>{err.userSentence}</i>)
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAnalysisResultModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Học sau
              </button>
              <button
                onClick={() => {
                  setAnalysisResultModal(null);
                  if (onNavigate) {
                    onNavigate('ai_lessons');
                  }
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
              >
                <span>Mở Bài Học Để Bắt Đầu Học Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RICH AI CONVERSATION ANALYSIS REPORT MODAL */}
      {isConversationReportOpen && conversationReport && (
        <ConversationReportModal
          report={conversationReport}
          onClose={() => setIsConversationReportOpen(false)}
          onNavigate={(tab: any) => onNavigate?.(tab)}
          onStartLesson={async (topic, lessonType) => {
            try {
              const lessonRes = await backendClient.generateLesson({
                topic,
                lessonType: (lessonType as any) || 'reinforce',
                sessionId: currentSessionId
              });
              if (lessonRes.success && onNavigate) {
                onNavigate('ai_lessons');
              }
            } catch (e) {
              console.error('Failed to generate lesson from analysis:', e);
            }
          }}
        />
      )}
    </div>
  );
};
