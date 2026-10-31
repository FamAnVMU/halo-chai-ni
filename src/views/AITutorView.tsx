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
} from 'lucide-react';
import type {
  AIChatMessage,
  AIChatMode,
  AILearnerMemory,
  HSKLevel,
  PostSessionReport,
} from '../types';
import { db } from '../db';
import { aiService } from '../utils/aiService';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';
import { GeminiLiveAudioClient } from '../utils/geminiLiveAudioClient';
import { backendClient } from '../utils/backendClient';
import { RubyText } from '../components/common/RubyText';

export const AITutorView: React.FC = () => {
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
  const [postReport, setPostReport] = useState<PostSessionReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

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

  const handleSendTextMessage = async (customText?: string) => {
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
        activeScenario
      );

      const aiMsg: AIChatMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'assistant',
        text: res.replyZh,
        pinyin: res.replyPinyin,
        translationVi: res.replyVi,
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

  const handleVoiceTest = () => {
    audioService.speak('你好！欢迎使用哈罗中文，发音测试正常。', { rate: speed });
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          {/* Mode switch: Text / Voice */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveSubMode('text');
                if (isVoiceActive) stopVoiceChat();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSubMode === 'text'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Text Chat (3.5 Flash Lite)</span>
            </button>

            <button
              onClick={() => setActiveSubMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSubMode === 'voice'
                  ? 'bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Voice Chat (3.8 Live API)</span>
            </button>
          </div>

          {/* Mode Selector */}
          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value as AIChatMode)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            className="text-xs font-semibold px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
            onClick={handleGenerateReport}
            className="p-1.5 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center gap-1"
            title="Tạo báo cáo tổng kết buổi học"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Báo cáo</span>
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
                            <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Góp ý sửa lỗi tiếng Trung:</span>
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

                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                          <button
                            onClick={() => audioService.speak(msg.text, { rate: speed })}
                            className="flex items-center gap-1 hover:text-primary-600"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Nghe câu
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

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
                placeholder="Nhập tiếng Trung hoặc tiếng Việt để học tập..."
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-primary-500"
              />

              <button
                type="submit"
                disabled={!inputMsg.trim() || isAiThinking}
                className="p-3 rounded-2xl bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 active:scale-95 shadow transition-all"
              >
                <Send className="w-4 h-4" />
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
              Bộ nhớ được lưu trữ trong bảng <code>learner_memory</code> tại SQLite của máy tính cá nhân.
            </p>

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
    </div>
  );
};
