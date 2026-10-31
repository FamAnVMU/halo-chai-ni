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
  Server,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { db } from '../db';
import { backendClient, BackendKeyConfig } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';

interface SettingsViewProps {
  user?: UserProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [keyConfig, setKeyConfig] = useState<BackendKeyConfig | null>(null);

  // Text API fields
  const [textApiKey, setTextApiKey] = useState('');
  const [showTextKey, setShowTextKey] = useState(false);
  const [textModel, setTextModel] = useState('gemini-3.5-flash-lite');

  // Live API fields
  const [liveApiKey, setLiveApiKey] = useState('');
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [liveModel, setLiveModel] = useState('gemini-3.8-live');
  const [liveVoice, setLiveVoice] = useState('Aoede');

  // Test states
  const [isTestingText, setIsTestingText] = useState(false);
  const [textTestResult, setTextTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const [isTestingLive, setIsTestingLive] = useState(false);
  const [liveTestResult, setLiveTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const [isTestingOverall, setIsTestingOverall] = useState(false);
  const [overallTestResult, setOverallTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [micTestStatus, setMicTestStatus] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    checkBackendAndLoadConfig();
  }, []);

  const checkBackendAndLoadConfig = async () => {
    const isAlive = await backendClient.checkHealth();
    setBackendOnline(isAlive);

    if (isAlive) {
      const config = await backendClient.getKeyConfig();
      if (config) {
        setKeyConfig(config);
        setTextModel(config.textConfig.model || 'gemini-3.5-flash-lite');
        setLiveModel(config.liveConfig.model || 'gemini-3.8-live');
        setLiveVoice(config.liveConfig.voice || 'Aoede');
      }
    }
  };

  const handleSaveTextConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    const res = await backendClient.saveKeys({
      textApiKey: textApiKey.trim(),
      textModel
    });
    if (res.success) {
      setSaveSuccessMsg('✓ Đã cập nhật Text API Key an toàn tại Backend!');
      setTextApiKey('');
      checkBackendAndLoadConfig();
    } else {
      alert(res.message);
    }
  };

  const handleSaveLiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    const res = await backendClient.saveKeys({
      liveApiKey: liveApiKey.trim(),
      liveModel,
      liveVoice
    });
    if (res.success) {
      setSaveSuccessMsg('✓ Đã cập nhật Live API Key & Voice an toàn tại Backend!');
      setLiveApiKey('');
      checkBackendAndLoadConfig();
    } else {
      alert(res.message);
    }
  };

  const handleTestText = async () => {
    setIsTestingText(true);
    setTextTestResult(null);
    const res = await backendClient.testTextApi(textApiKey, textModel);
    setTextTestResult(res);
    setIsTestingText(false);
  };

  const handleTestLive = async () => {
    setIsTestingLive(true);
    setLiveTestResult(null);
    const res = await backendClient.testLiveApi(liveApiKey, liveModel);
    setLiveTestResult(res);
    setIsTestingLive(false);
  };

  const handleTestOverall = async () => {
    setIsTestingOverall(true);
    setOverallTestResult(null);

    const isAlive = await backendClient.checkHealth();
    if (!isAlive) {
      setOverallTestResult({
        success: false,
        message: 'Thất bại: Không thể kết nối tới Local Backend (http://localhost:3001).'
      });
      setIsTestingOverall(false);
      return;
    }

    const micOk = await speechService.checkMicrophonePermission();
    const textRes = await backendClient.testTextApi();
    const liveRes = await backendClient.testLiveApi();

    if (!micOk) {
      setOverallTestResult({
        success: false,
        message: 'Cảnh báo: Microphone chưa được cấp quyền trên trình duyệt.'
      });
    } else if (!textRes.success) {
      setOverallTestResult({
        success: false,
        message: `Lỗi Text-out API: ${textRes.message}`
      });
    } else if (!liveRes.success) {
      setOverallTestResult({
        success: false,
        message: `Lỗi Live API: ${liveRes.message}`
      });
    } else {
      setOverallTestResult({
        success: true,
        message: 'Hoàn hảo: Tất cả các thành phần (Backend, Microphone, Text-out Model, Live API Model) đều hoạt động chuẩn xác!'
      });
    }

    setIsTestingOverall(false);
  };

  const handleTestVoiceAudio = () => {
    audioService.speak('你好！欢迎使用哈罗中文，发音测试正常。');
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

  const handleExportData = async () => {
    const exportData = {
      user: await db.users.toArray(),
      vocabularies: await db.vocabularies.toArray(),
      srsCards: await db.srsCards.toArray(),
      grammarRules: await db.grammarRules.toArray(),
      lessons: await db.lessons.toArray(),
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

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Quản Lý API Key & Local Backend</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Bảo mật tuyệt đối
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          API Key được lưu trữ an toàn trong máy tính nội bộ của bạn (Backend Localhost:3001). Không lưu key vào frontend, localStorage hay gửi ra ngoài.
        </p>
      </div>

      {/* Backend Status Banner */}
      <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
        backendOnline
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
      }`}>
        <div className="flex items-center gap-2.5">
          <Server className={`w-5 h-5 ${backendOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
          <div>
            <div className="font-bold text-sm">
              Trạng thái Backend: {backendOnline ? 'Đang hoạt động (http://localhost:3001)' : 'Chưa kết nối'}
            </div>
            <div className="text-[11px] opacity-80">
              {backendOnline
                ? 'SQLite database & Gemini Service sẵn sàng phục vụ.'
                : 'Hãy chạy lệnh: "npm run server" trong terminal để khởi động Local Backend.'}
            </div>
          </div>
        </div>

        <button
          onClick={checkBackendAndLoadConfig}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50"
        >
          Làm mới
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Nguyên tắc bảo vệ API Key:</span>
          Hệ thống tuân thủ nghiêm ngặt mô hình <strong>Frontend ➔ Local Backend ➔ Gemini API</strong>. Khi bạn nhập Key, Backend sẽ lưu vào cơ sở dữ liệu SQLite cục bộ (hoặc biến môi trường <code>.env</code>). Giao diện frontend chỉ nhận diện trạng thái kết nối và key preview được ẩn danh.
        </div>
      </div>

      {/* OVERALL TEST BUTTON */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-bold text-sm">Kiểm Tra Tổng Thể Toàn Hệ Thống</div>
          <div className="text-xs text-rose-100">
            Kiểm tra đồng thời: Local Backend, Quyền Micro, Gemini Text-out API và Gemini Live API.
          </div>
        </div>

        <button
          onClick={handleTestOverall}
          disabled={isTestingOverall}
          className="px-5 py-2.5 rounded-xl bg-white text-primary-700 font-bold text-xs shadow hover:bg-rose-50 active:scale-95 transition-all shrink-0"
        >
          {isTestingOverall ? 'Đang kiểm tra...' : 'Kiểm tra tổng thể'}
        </button>
      </div>

      {overallTestResult && (
        <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 border animate-in fade-in duration-150 ${
          overallTestResult.success
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-900 dark:text-rose-200'
        }`}>
          {overallTestResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="font-semibold">{overallTestResult.message}</div>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
          {saveSuccessMsg}
        </div>
      )}

      {/* GROUP 1: GEMINI TEXT-OUT API */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              1. Gemini Text-out API (AI Tutor & Giảng Dạy)
            </h2>
          </div>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            keyConfig?.textConfig.hasKey
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
          }`}>
            {keyConfig?.textConfig.hasKey ? 'Đã cấu hình' : 'Chưa có Key'}
          </span>
        </div>

        <form onSubmit={handleSaveTextConfig} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              API Key (Text Model):
            </label>
            <div className="relative mt-1">
              <input
                type={showTextKey ? 'text' : 'password'}
                value={textApiKey}
                onChange={(e) => setTextApiKey(e.target.value)}
                placeholder={keyConfig?.textConfig.hasKey ? `Đang dùng: ${keyConfig.textConfig.keyPreview} (Nhập để thay đổi)` : 'Dán mã khóa AIzaSy...'}
                className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowTextKey(!showTextKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showTextKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Mô hình Text-out (Chỉ định rõ Model ID chuẩn):
            </label>
            <select
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
            >
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Mặc định cho Text Tutor - Cực nhanh)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Hiệu năng cân bằng cao)</option>
              <option value="gemini-4-argon">gemini-4-argon (Mạnh nhất về phân tích ngôn ngữ sâu)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestText}
              disabled={isTestingText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-primary-600" />
              <span>{isTestingText ? 'Đang gửi yêu cầu thử nghiệm...' : 'Kiểm tra Text API'}</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow hover:bg-primary-700 ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lưu Text API Key</span>
            </button>
          </div>

          {textTestResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              textTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-900 dark:text-rose-200'
            }`}>
              {textTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <div className="font-bold">{textTestResult.message}</div>
                {textTestResult.latencyMs !== undefined && (
                  <div className="text-[11px] opacity-75">Độ trễ: {textTestResult.latencyMs} ms</div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* GROUP 2: GEMINI LIVE API (REAL-TIME VOICE) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              2. Gemini Live API (Voice Chat Thời Gian Thực 2 Chiều)
            </h2>
          </div>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            keyConfig?.liveConfig.hasKey
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
          }`}>
            {keyConfig?.liveConfig.hasKey ? 'Đã cấu hình' : 'Dùng chung Text Key'}
          </span>
        </div>

        <form onSubmit={handleSaveLiveConfig} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Live API Key (Để trống nếu dùng chung key với Text API):
            </label>
            <div className="relative mt-1">
              <input
                type={showLiveKey ? 'text' : 'password'}
                value={liveApiKey}
                onChange={(e) => setLiveApiKey(e.target.value)}
                placeholder={keyConfig?.liveConfig.hasKey ? `Đang dùng: ${keyConfig.liveConfig.keyPreview}` : 'Dán mã khóa AIzaSy...'}
                className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowLiveKey(!showLiveKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showLiveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Mô hình Live API:
              </label>
              <select
                value={liveModel}
                onChange={(e) => setLiveModel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              >
                <option value="gemini-3.8-live">gemini-3.8-live (Mặc định cho độ trễ thấp nhất)</option>
                <option value="gemini-3.8-live-extended-thinking">gemini-3.8-live-extended-thinking (Suy luận nền)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Giọng nói AI (Prebuilt Voice):
              </label>
              <select
                value={liveVoice}
                onChange={(e) => setLiveVoice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              >
                <option value="Aoede">Aoede (Nữ - Truyền cảm & rõ ràng)</option>
                <option value="Kore">Kore (Nữ - Tự nhiên)</option>
                <option value="Puck">Puck (Nam - Năng động)</option>
                <option value="Charon">Charon (Nam - Trầm ấm)</option>
                <option value="Fenrir">Fenrir (Nam - Rõ ràng)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestLive}
              disabled={isTestingLive}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-rose-600" />
              <span>{isTestingLive ? 'Đang khởi tạo phiên Live...' : 'Kiểm tra Live API'}</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow hover:bg-primary-700 ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lưu Live API Key</span>
            </button>
          </div>

          {liveTestResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              liveTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-900 dark:text-rose-200'
            }`}>
              {liveTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <div className="font-bold">{liveTestResult.message}</div>
                {liveTestResult.latencyMs !== undefined && (
                  <div className="text-[11px] opacity-75">Độ trễ khởi tạo phiên: {liveTestResult.latencyMs} ms</div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* HARDWARE AUDIO & MIC TEST */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <span>Kiểm Tra Phần Cứng Âm Thanh & Microphone</span>
        </h2>
        <p className="text-xs text-slate-500">
          Nghe thử giọng nói trước khi hội thoại và kiểm tra độ nhạy microphone của máy tính.
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
                Kiểm tra Microphone
              </div>
              <div className="text-[11px] text-slate-400">
                Cấp quyền & thu âm thử
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
                Phát câu tiếng Trung mẫu chuẩn ({liveVoice})
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

      {/* DATA BACKUP & RESTORE */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-sky-500" />
          <span>Sao Lưu Dữ Liệu Học Tập (JSON)</span>
        </h2>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file JSON sao lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
