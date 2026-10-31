import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  INITIALS_DATA,
  FINALS_DATA,
  TONES_DATA,
  TONE_SANDHI_RULES,
  VIETNAMESE_PITFALLS,
  PinyinSoundItem,
} from '../data/seedPronunciation';
import { audioService } from '../utils/audio';
import { speechService } from '../utils/speechRecognition';

type PronounceTab = 'initials' | 'finals' | 'tones' | 'sandhi' | 'pitfalls' | 'evaluator';

export const PronunciationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PronounceTab>('initials');
  const [selectedSound, setSelectedSound] = useState<PinyinSoundItem | null>(INITIALS_DATA[0]);

  // Evaluator state
  const [evalTargetText, setEvalTargetText] = useState<string>('你好，很高兴认识你');
  const [evalPinyin, setEvalPinyin] = useState<string>('nǐ hǎo, hěn gāoxìng rènshí nǐ');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [evalResult, setEvalResult] = useState<{
    score: number;
    isMatch: boolean;
    feedbackVi: string;
  } | null>(null);

  const samplePracticePhrases = [
    { zh: '你好，很高兴认识你', pinyin: 'nǐ hǎo, hěn gāoxìng rènshí nǐ', vi: 'Xin chào, rất vui được quen bạn' },
    { zh: '中国茶非常好喝', pinyin: 'zhōngguó chá fēicháng hǎohē', vi: 'Trà Trung Quốc rất ngon' },
    { zh: '请问一斤苹果多少钱', pinyin: 'qǐngwèn yì jīn píngguǒ duōshao qián', vi: 'Xin hỏi một cân táo bao nhiêu tiền' },
    { zh: '去学校学习汉语', pinyin: 'qù xuéxiào xuéxí hànyǔ', vi: 'Đến trường học tiếng Trung' },
  ];

  const handleStartEval = () => {
    setIsRecording(true);
    setSpokenText('');
    setEvalResult(null);

    speechService.startListening(
      (payload) => {
        setSpokenText(payload.transcript);
        if (payload.isFinal) {
          const res = speechService.evaluatePronunciation(payload.transcript, evalTargetText);
          setEvalResult(res);
        }
      },
      () => setIsRecording(false),
      (err) => {
        setIsRecording(false);
        console.error('Speech recognition error:', err);
      }
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Hệ Thống Luyện Phát Âm Chuẩn</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            Pinyin & Chấm Điểm AI
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Khẩu hình chuẩn 21 thanh mẫu, 36 vận mẫu, 4 thanh điệu, quy tắc biến điệu và phòng tránh lỗi phát âm của người Việt.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('initials')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'initials'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          21 Thanh Mẫu
        </button>

        <button
          onClick={() => setActiveTab('finals')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'finals'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Các Vận Mẫu
        </button>

        <button
          onClick={() => setActiveTab('tones')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'tones'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          4 Thanh Điệu
        </button>

        <button
          onClick={() => setActiveTab('sandhi')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'sandhi'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Quy Tắc Biến Điệu
        </button>

        <button
          onClick={() => setActiveTab('pitfalls')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'pitfalls'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Lỗi Người Việt
        </button>

        <button
          onClick={() => setActiveTab('evaluator')}
          className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
            activeTab === 'evaluator'
              ? 'bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-sm'
              : 'text-primary-600 font-bold hover:bg-primary-50 dark:hover:bg-primary-950'
          }`}
        >
          🎤 Chấm Điểm Phát Âm
        </button>
      </div>

      {/* TAB 1: INITIALS (Thanh Mẫu) */}
      {activeTab === 'initials' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sound Grid */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-semibold text-slate-500">
              Nhấn vào từng âm để nghe phát âm mẫu và xem khẩu hình chi tiết:
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {INITIALS_DATA.map((sound) => {
                const isSelected = selectedSound?.id === sound.id;
                return (
                  <button
                    key={sound.id}
                    onClick={() => {
                      setSelectedSound(sound);
                      audioService.speak(sound.exampleZh);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shadow-sm scale-105'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl font-black">{sound.symbol}</div>
                    <div className="text-[11px] font-mono text-slate-400">{sound.ipa}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Side Card */}
          {selectedSound && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-primary-600">
                    Thanh Mẫu
                  </span>
                  <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {selectedSound.symbol}
                  </div>
                </div>
                <button
                  onClick={() => audioService.speak(selectedSound.exampleZh)}
                  className="p-3 rounded-2xl bg-primary-600 text-white shadow-md hover:bg-primary-700"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Hướng dẫn phát âm:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {selectedSound.vietnameseGuide}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                    Khẩu hình miệng:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {selectedSound.mouthShape}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
                  <span className="font-bold text-primary-700 dark:text-primary-300 block mb-1">
                    Từ ví dụ:
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold font-chinese text-slate-800 dark:text-slate-100">
                        {selectedSound.exampleZh}
                      </span>
                      <span className="text-xs text-rose-500 font-semibold ml-2">
                        [{selectedSound.examplePinyin}]
                      </span>
                      <div className="text-[11px] text-slate-500">{selectedSound.exampleVi}</div>
                    </div>
                    <button
                      onClick={() => audioService.speak(selectedSound.exampleZh)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-primary-600"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FINALS (Vận Mẫu) */}
      {activeTab === 'finals' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {FINALS_DATA.map((item) => (
            <div
              key={item.id}
              onClick={() => audioService.speak(item.exampleZh)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-400 cursor-pointer transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {item.symbol}
                </span>
                <Volume2 className="w-4 h-4 text-slate-400 hover:text-primary-600" />
              </div>
              <div className="text-[11px] font-mono text-slate-400">{item.ipa}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">
                {item.vietnameseGuide}
              </div>
              <div className="text-[11px] text-primary-600 font-semibold pt-1">
                VD: {item.exampleZh} ({item.examplePinyin})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: 4 TONES */}
      {activeTab === 'tones' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TONES_DATA.map((tone) => (
            <div
              key={tone.toneNumber}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 font-black text-sm flex items-center justify-center">
                    {tone.toneNumber || '0'}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {tone.name}
                  </h3>
                </div>
                <button
                  onClick={() => audioService.speak(tone.exampleZh)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs font-mono font-bold text-rose-500">
                Ký hiệu cao độ: {tone.symbol} • {tone.pitch}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tone.descriptionVi}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-chinese font-bold text-base mr-2">{tone.exampleZh}</span>
                  <span className="text-rose-500 font-semibold mr-2">{tone.examplePinyin}</span>
                  <span className="text-slate-500">{tone.exampleVi}</span>
                </div>
                <button
                  onClick={() => audioService.speak(tone.exampleZh)}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Nghe mẫu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: TONE SANDHI RULES */}
      {activeTab === 'sandhi' && (
        <div className="space-y-4">
          {TONE_SANDHI_RULES.map((rule) => (
            <div
              key={rule.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {rule.name}
              </h3>
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950 font-mono text-xs font-bold text-primary-700 dark:text-primary-300">
                {rule.ruleFormula}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {rule.explanationVi}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {rule.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {ex.written}
                      </div>
                      <div className="text-rose-500 font-semibold">
                        Đọc: {ex.pronounced}
                      </div>
                      <div className="text-[10px] text-slate-400">{ex.meaningVi}</div>
                    </div>
                    <button
                      onClick={() => audioService.speak(ex.written.split(' ')[0])}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 hover:text-primary-600"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: VIETNAMESE PITFALLS */}
      {activeTab === 'pitfalls' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Lời khuyên cho người Việt học tiếng Trung:</span>
              Tiếng Việt và tiếng Trung có nhiều điểm tương đồng về thanh điệu và ngữ pháp, nhưng hệ thống âm uốn lưỡi (zh, ch, sh) và âm mặt lưỡi (j, q, x) cùng thanh 4 dứt khoát là những điểm thường gây vấp nhất. Hãy luyện so sánh các cặp đối lập dưới đây!
            </div>
          </div>

          {VIETNAMESE_PITFALLS.map((pitfall) => (
            <div
              key={pitfall.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{pitfall.problemTitle}</span>
              </h3>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Lỗi phổ biến: </span>
                {pitfall.mistakeExplanation}
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Cách khắc phục chuẩn: </span>
                {pitfall.howToFix}
              </div>

              <div className="pt-2">
                <div className="text-xs font-bold text-slate-500 mb-2">
                  Cặp từ đối lập luyện tập phản xạ:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pitfall.practicePairs.map((pair, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-around text-xs"
                    >
                      <div className="text-center">
                        <div className="text-xl font-bold font-chinese">{pair.word1.zh}</div>
                        <div className="text-rose-500 font-semibold">{pair.word1.pinyin}</div>
                        <div className="text-[10px] text-slate-400">{pair.word1.vi}</div>
                        <button
                          onClick={() => audioService.speak(pair.word1.zh)}
                          className="mt-1 p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 hover:text-primary-600"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-slate-400 font-bold">vs</span>

                      <div className="text-center">
                        <div className="text-xl font-bold font-chinese">{pair.word2.zh}</div>
                        <div className="text-rose-500 font-semibold">{pair.word2.pinyin}</div>
                        <div className="text-[10px] text-slate-400">{pair.word2.vi}</div>
                        <button
                          onClick={() => audioService.speak(pair.word2.zh)}
                          className="mt-1 p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 hover:text-primary-600"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: EVALUATOR ARENA (Chấm Điểm Phát Âm Chuyên Sâu) */}
      {activeTab === 'evaluator' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              Đánh Giá & Nhận Diện Giọng Nói AI
            </span>

            {/* Target phrase */}
            <div className="space-y-1 py-2">
              <div className="text-3xl font-black font-chinese text-slate-800 dark:text-slate-100">
                {evalTargetText}
              </div>
              <div className="text-sm font-semibold text-rose-500">
                {evalPinyin}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => audioService.speak(evalTargetText)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:text-primary-600"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe câu mẫu</span>
              </button>
            </div>

            {/* Microphone Button */}
            <div className="py-4">
              <button
                onClick={handleStartEval}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse scale-110 shadow-rose-600/40'
                    : 'bg-gradient-to-r from-primary-600 to-rose-600 text-white hover:scale-105 shadow-primary-600/30'
                }`}
              >
                <Mic className="w-10 h-10" />
              </button>
              <div className="text-xs text-slate-500 font-semibold mt-3">
                {isRecording ? 'Đang lắng nghe... Hãy đọc to câu tiếng Trung' : 'Nhấn nút để bắt đầu đọc'}
              </div>
            </div>

            {spokenText && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
                <span className="text-slate-400">Hệ thống nghe được: </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">"{spokenText}"</span>
              </div>
            )}

            {evalResult && (
              <div
                className={`p-4 rounded-2xl border text-left space-y-1 animate-in fade-in duration-200 ${
                  evalResult.isMatch
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-900 dark:text-emerald-100'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 text-amber-900 dark:text-amber-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {evalResult.isMatch ? '✓ Đạt yêu cầu xuất sắc!' : '⚡ Cần điều chỉnh thêm'}
                  </span>
                  <span className="text-base font-black">
                    {evalResult.score}/100 điểm
                  </span>
                </div>
                <p className="text-xs leading-relaxed">{evalResult.feedbackVi}</p>
              </div>
            )}
          </div>

          {/* Quick Change Sample Phrases */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Chọn câu mẫu khác để luyện tập:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePracticePhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setEvalTargetText(phrase.zh);
                    setEvalPinyin(phrase.pinyin);
                    setEvalResult(null);
                    setSpokenText('');
                  }}
                  className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                    evalTargetText === phrase.zh
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 font-bold text-primary-700 dark:text-primary-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="font-chinese text-sm">{phrase.zh}</div>
                  <div className="text-slate-400 text-[11px]">{phrase.vi}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
