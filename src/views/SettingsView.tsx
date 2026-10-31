import React, { useEffect, useState } from 'react';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Volume2,
  Mic,
  Activity,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import type { APISettings, UserProfile } from '../types';
import { db } from '../db';
import { aiService } from '../utils/aiService';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';

interface SettingsViewProps {
  user: UserProfile | undefined;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const [settings, setSettings] = useState<APISettings | null>(null);

  // Form fields
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'custom'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);

  // Diagnostics & Tests
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);

  const [micTestStatus, setMicTestStatus] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await db.apiSettings.get('default');
    if (s) {
      setSettings(s);
      setProvider(s.provider);
      setGeminiApiKey(s.geminiApiKey || '');
      setGeminiModel(s.geminiModel || 'gemini-2.5-flash');
      setOpenaiApiKey(s.openaiApiKey || '');
      setOpenaiModel(s.openaiModel || 'gpt-4o-mini');
      setTtsSpeed(s.ttsSpeed || 1.0);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.apiSettings.put({
      id: 'default',
      provider,
      geminiApiKey: geminiApiKey.trim(),
      geminiModel,
      openaiApiKey: openaiApiKey.trim(),
      openaiModel,
      ttsSpeed,
      ttsPitch: 1.0,
      autoPlayAudio: true,
      voiceGender: 'female',
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);

    const activeKey = provider === 'gemini' ? geminiApiKey : openaiApiKey;
    const activeModel = provider === 'gemini' ? geminiModel : openaiModel;

    const res = await aiService.testConnection(provider, activeKey, activeModel);
    setApiTestResult(res);
    setIsTestingApi(false);
  };

  const handleTestMic = async () => {
    setMicTestStatus('Đang kiểm tra quyền truy cập microphone...');
    const ok = await speechService.checkMicrophonePermission();
    if (ok) {
      setMicTestStatus('✓ Microphone hoạt động tốt và đã được cấp quyền truy cập!');
    } else {
      setMicTestStatus('✗ Chưa cấp quyền Microphone hoặc không tìm thấy thiết bị thu âm.');
    }
  };

  const handleTestVoiceAudio = () => {
    audioService.speak('你好！欢迎使用中文学习应用，发音测试正常。', { rate: ttsSpeed });
  };

  // Export data as JSON
  const handleExportData = async () => {
    const exportData = {
      user: await db.users.toArray(),
      vocabularies: await db.vocabularies.toArray(),
      srsCards: await db.srsCards.toArray(),
      grammarRules: await db.grammarRules.toArray(),
      lessons: await db.lessons.toArray(),
      aiSessions: await db.aiSessions.toArray(),
      aiMemory: await db.aiMemory.toArray(),
      dailyStats: await db.dailyStats.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halo_chinese_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.vocabularies && Array.isArray(data.vocabularies)) {
          await db.vocabularies.clear();
          await db.vocabularies.bulkAdd(data.vocabularies);
        }
        if (data.srsCards && Array.isArray(data.srsCards)) {
          await db.srsCards.clear();
          await db.srsCards.bulkAdd(data.srsCards);
        }
        if (data.lessons && Array.isArray(data.lessons)) {
          await db.lessons.clear();
          await db.lessons.bulkAdd(data.lessons);
        }
        alert('Khôi phục dữ liệu sao lưu thành công!');
        window.location.reload();
      } catch (err) {
        alert('File JSON không hợp lệ hoặc bị lỗi định dạng.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Cài Đặt & Quản Lý API AI</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Bảo mật cục bộ
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý API Key cho AI Tutor & Voice Chat, kiểm tra kết nối mạng và sao lưu dữ liệu cá nhân.
        </p>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Bảo mật dữ liệu tuyệt đối:</span>
          API Key và toàn bộ dữ liệu học tập của bạn được lưu trữ hoàn toàn trên thiết bị của bạn (IndexedDB cục bộ). Chúng tôi không gửi API Key hoặc dữ liệu của bạn về bất kỳ máy chủ trung gian nào.
        </div>
      </div>

      {/* API Configuration Form */}
      <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-primary-600" />
          <span>Cấu Hình API Key AI</span>
        </h2>

        {/* Provider Select */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Nhà cung cấp AI:
          </label>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => setProvider('gemini')}
              className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                provider === 'gemini'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-bold text-sm">Google Gemini API</div>
              <div className="text-[11px] font-normal text-slate-400">
                Khuyên dùng: Tốc độ phản hồi cực nhanh & hỗ trợ tiếng Trung xuất sắc
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                provider === 'openai'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-bold text-sm">OpenAI API</div>
              <div className="text-[11px] font-normal text-slate-400">
                GPT-4o / GPT-4o-mini
              </div>
            </button>
          </div>
        </div>

        {/* Gemini Settings */}
        {provider === 'gemini' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Gemini API Key:
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Dán mã khóa AIzaSy... của bạn vào đây"
                className="w-full px-4 py-2.5 mt-1 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lấy API Key miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary-600 underline">Google AI Studio</a>
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Mô hình Gemini:
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1 font-semibold"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Khuyên dùng - Nhanh & chuẩn xác nhất)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Suy luận ngữ pháp sâu)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              </select>
            </div>
          </div>
        )}

        {/* OpenAI Settings */}
        {provider === 'openai' && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                OpenAI API Key:
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-4 py-2.5 mt-1 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {/* Voice Speech Speed Setting */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tốc độ giọng đọc AI (TTS Speed):
          </label>
          <div className="flex items-center gap-3 mt-1.5">
            {[0.8, 1.0, 1.2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setTtsSpeed(spd)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  ttsSpeed === spd
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {spd === 0.8 ? 'Chậm (0.8x)' : spd === 1.0 ? 'Bình thường (1.0x)' : 'Nhanh (1.2x)'}
              </button>
            ))}
          </div>
        </div>

        {/* Test Connection Button */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleTestApi}
            disabled={isTestingApi}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <Activity className="w-4 h-4 text-primary-600" />
            <span>{isTestingApi ? 'Đang kiểm tra...' : 'Kiểm tra kết nối API'}</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold shadow hover:bg-primary-700 active:scale-95 transition-all ml-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccess ? 'Đã lưu cấu hình!' : 'Lưu cấu hình'}</span>
          </button>
        </div>

        {/* Test Result Message */}
        {apiTestResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
              apiTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-900 dark:text-rose-200'
            }`}
          >
            {apiTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{apiTestResult.message}</div>
              {apiTestResult.latencyMs > 0 && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Độ trễ phản hồi: {apiTestResult.latencyMs} ms
                </div>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Diagnostics for Voice Chat: Mic & Sound Test */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <span>Kiểm Tra Riêng Cho Voice Chat</span>
        </h2>
        <p className="text-xs text-slate-500">
          Xác định chính xác chất lượng phần cứng âm thanh và quyền microphone trước khi bắt đầu đàm thoại.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleTestMic}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3 text-left hover:border-primary-400 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Kiểm tra quyền Microphone
              </div>
              <div className="text-[11px] text-slate-400">
                Thu âm thử và kiểm tra quyền trình duyệt
              </div>
            </div>
          </button>

          <button
            onClick={handleTestVoiceAudio}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-3 text-left hover:border-primary-400 transition-colors"
          >
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Nghe thử giọng nói AI
              </div>
              <div className="text-[11px] text-slate-400">
                Phát thử câu tiếng Trung phổ thông chuẩn
              </div>
            </div>
          </button>
        </div>

        {micTestStatus && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            {micTestStatus}
          </div>
        )}
      </div>

      {/* Data Backup & Restore */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-sky-500" />
          <span>Sao Lưu & Khôi Phục Dữ Liệu</span>
        </h2>
        <p className="text-xs text-slate-500">
          Xuất toàn bộ tiến độ học, từ vựng cá nhân, thẻ SRS và lịch sử trò chuyện ra file JSON để lưu trữ hoặc chuyển sang thiết bị khác.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file JSON sao lưu</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Khôi phục từ file JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
