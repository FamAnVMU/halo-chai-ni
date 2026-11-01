import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  BookmarkPlus,
  BookmarkCheck,
  BookOpen,
  PenTool,
  Mic,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { backendClient, DictionaryDetailEntry } from '../../utils/backendClient';
import { audioService } from '../../utils/audio';

interface QuickDictionaryModalProps {
  word: string | null;
  onClose: () => void;
  onOpenFullDetail?: (wordOrId: string) => void;
  onNavigate?: (tab: any) => void;
}

export const QuickDictionaryModal: React.FC<QuickDictionaryModalProps> = ({
  word,
  onClose,
  onOpenFullDetail,
  onNavigate
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [entry, setEntry] = useState<DictionaryDetailEntry | null>(null);
  const [inMemory, setInMemory] = useState<boolean>(false);
  const [inSrs, setInSrs] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    if (!word) return;

    let isMounted = true;

    backendClient.getDictionaryEntryByWord(word).then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        setEntry(res.data);
        setInMemory(res.data.learnerState?.inVocabMemory || false);
        setInSrs(res.data.learnerState?.inSrs || false);
      } else {
        // Nếu không tìm thấy chính xác, thử tìm kiếm tự động
        backendClient.searchDictionary({ query: word, limit: 1 }).then((searchRes) => {
          if (!isMounted) return;
          if (searchRes.success && searchRes.data && searchRes.data.results.length > 0) {
            const firstId = searchRes.data.results[0].id;
            backendClient.getDictionaryEntryById(firstId).then((detailRes) => {
              if (isMounted && detailRes.success && detailRes.data) {
                setEntry(detailRes.data);
                setInMemory(detailRes.data.learnerState?.inVocabMemory || false);
                setInSrs(detailRes.data.learnerState?.inSrs || false);
              }
            });
          } else {
            setEntry(null);
          }
        });
      }
    }).catch((err) => {
      console.warn('Quick dictionary lookup notice:', err);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [word]);

  if (!word) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handlePlayAudio = (text: string) => {
    audioService.speak(text);
  };

  const handleSyncMemory = async () => {
    if (!entry) return;
    const res = await backendClient.syncDictionaryToMemory(entry.id);
    if (res.success) {
      setInMemory(true);
      showToast('Đã lưu từ vào Bộ nhớ học tập dài hạn!');
    }
  };

  const handleSyncSrs = async () => {
    if (!entry) return;
    const res = await backendClient.syncDictionaryToSrs(entry.id);
    if (res.success) {
      setInSrs(true);
      showToast('Đã thêm thẻ vào Hàng đợi Ôn tập SRS (SM-2)!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tra Cứu Nhanh Từ Điển
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Đang tìm kiếm thông tin từ...</p>
            </div>
          ) : entry ? (
            <>
              {/* Primary Headword Box */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-chinese tracking-wide">
                      {entry.simplified}
                    </h2>
                    {entry.traditional && entry.traditional !== entry.simplified && (
                      <span className="text-sm text-slate-400 font-chinese">
                        [Phồn: {entry.traditional}]
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-2">
                    <span>{entry.pinyin}</span>
                    <button
                      onClick={() => handlePlayAudio(entry.simplified)}
                      className="p-1 text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 rounded-md hover:bg-primary-50 dark:hover:bg-primary-950/50"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* HSK Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                    HSK {entry.hskLevel}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {entry.wordType}
                  </span>
                </div>
              </div>

              {/* Meaning */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                  Nghĩa Tiếng Việt
                </div>
                <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {entry.meaningVi}
                </div>
              </div>

              {/* Radicals & Characters info */}
              {(entry.radical || entry.characterDecomposition) && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  {entry.radical && (
                    <span><strong>Bộ thủ:</strong> {entry.radical}</span>
                  )}
                  {entry.strokeCount && (
                    <span><strong>Số nét:</strong> {entry.strokeCount}</span>
                  )}
                  {entry.measureWords && (
                    <span><strong>Lượng từ:</strong> {entry.measureWords}</span>
                  )}
                </div>
              )}

              {/* Sample Example */}
              {entry.examples && entry.examples.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 mb-1.5 flex items-center justify-between">
                    <span>Ví Dụ Minh Họa</span>
                    <button
                      onClick={() => handlePlayAudio(entry.examples[0].zh)}
                      className="p-0.5 text-amber-600 hover:text-amber-800 dark:hover:text-amber-300"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-chinese">
                    {entry.examples[0].zh}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                    {entry.examples[0].pinyin}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                    {entry.examples[0].vi}
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                <button
                  onClick={handleSyncMemory}
                  disabled={inMemory}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    inMemory
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/80 border border-primary-200 dark:border-primary-800'
                  }`}
                >
                  {inMemory ? <CheckCircle2 className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                  <span>{inMemory ? 'Đã trong Bộ Nhớ' : 'Lưu Bộ Nhớ'}</span>
                </button>

                <button
                  onClick={handleSyncSrs}
                  disabled={inSrs}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    inSrs
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{inSrs ? 'Đã trong SRS' : 'Lưu vào SRS'}</span>
                </button>
              </div>

              {/* Quick Jump Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenFullDetail) onOpenFullDetail(entry.simplified);
                    else if (onNavigate) onNavigate('dictionary');
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Xem Chi Tiết</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('write');
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Luyện Viết</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('pronounce');
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1"
                >
                  <Mic className="w-3 h-3" />
                  <span>Phát Âm</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Chưa có dữ liệu từ điển cho "{word}"
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Bạn có thể mở toàn màn hình Từ điển để yêu cầu AI tra cứu và phân tích ngữ cảnh tự động.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('dictionary');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-md shadow-primary-500/25"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mở Từ Điển AI</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
