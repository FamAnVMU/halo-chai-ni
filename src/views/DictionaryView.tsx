import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Volume2,
  BookmarkPlus,
  BookmarkCheck,
  Star,
  Clock,
  Sparkles,
  Layers,
  Split,
  PenTool,
  Mic,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  RefreshCw
} from 'lucide-react';
import {
  backendClient,
  DictionarySearchResultItem,
  DictionaryDetailEntry,
  ContextLookupResult,
  WordComparisonResult,
  AIWordConsultationResult
} from '../utils/backendClient';
import { audioService } from '../utils/audio';
import { SEED_DICTIONARY_ENTRIES } from '../data/seedDictionary';
import { ClickableChineseText } from '../components/dictionary/ClickableChineseText';

interface DictionaryViewProps {
  onNavigate?: (tab: any) => void;
  initialWord?: string;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({ onNavigate, initialWord }) => {
  // Navigation & Search Tabs
  const [activeTab, setActiveTab] = useState<'search' | 'context' | 'compare' | 'saved' | 'history'>('search');
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState<string>(initialWord || '');
  const [searchType, setSearchType] = useState<'auto' | 'chinese' | 'pinyin' | 'vietnamese'>('auto');
  const [selectedHsk, setSelectedHsk] = useState<number>(0); // 0 = all
  const [searchResults, setSearchResults] = useState<DictionarySearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchDetectedType, setSearchDetectedType] = useState<string>('auto');
  const [isAiFallback, setIsAiFallback] = useState<boolean>(false);

  // Detail Modal / View
  const [selectedEntry, setSelectedEntry] = useState<DictionaryDetailEntry | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [personalNote, setPersonalNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [inMemory, setInMemory] = useState<boolean>(false);
  const [inSrs, setInSrs] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // AI Vocabulary Consultation
  const [aiConsultation, setAiConsultation] = useState<AIWordConsultationResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState<boolean>(false);

  // In-Context Lookup
  const [contextSentence, setContextSentence] = useState<string>('我每天在学校努力学习中文，希望认识更多中国朋友。');
  const [contextTargetWord, setContextTargetWord] = useState<string>('学习');
  const [contextResult, setContextResult] = useState<ContextLookupResult | null>(null);
  const [isAnalyzingContext, setIsAnalyzingContext] = useState<boolean>(false);

  // Word Comparison
  const [compareWord1, setCompareWord1] = useState<string>('看');
  const [compareWord2, setCompareWord2] = useState<string>('观看');
  const [compareResult, setCompareResult] = useState<WordComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // History & Saved Lists
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [savedList, setSavedList] = useState<any[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState<boolean>(false);

  // Debounced Search
  const searchTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Trigger search
  const executeSearch = async (queryText: string, typeVal: string = searchType, hskVal: number = selectedHsk) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      // Default to initial seed recommendations
      const formattedSeed: DictionarySearchResultItem[] = SEED_DICTIONARY_ENTRIES.map(e => ({
        id: e.id,
        simplified: e.simplified,
        traditional: e.traditional,
        pinyin: e.pinyin,
        meaningVi: e.meaningVi,
        wordType: e.wordType,
        hskLevel: e.hskLevel,
        radical: e.radical,
        strokeCount: e.strokeCount,
        measureWords: e.measureWords,
        isFavorite: false,
        masteryStatus: 'not_started',
        inSrs: false,
        source: e.source
      }));
      setSearchResults(hskVal > 0 ? formattedSeed.filter(s => s.hskLevel === hskVal) : formattedSeed);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await backendClient.searchDictionary({
        query: trimmed,
        type: typeVal,
        hskLevel: hskVal > 0 ? hskVal : undefined,
        limit: 40
      });

      if (res.success && res.data) {
        setSearchResults(res.data.results);
        setSearchDetectedType(res.data.detectedType);
        setIsAiFallback(!!res.data.isAiFallback);
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadSavedAndHistory = async () => {
    setIsLoadingLists(true);
    try {
      const [histRes, favRes] = await Promise.all([
        backendClient.getDictionaryHistory(20),
        backendClient.getDictionaryFavorites()
      ]);
      if (histRes.success && histRes.data) setHistoryList(histRes.data);
      if (favRes.success && favRes.data) setSavedList(favRes.data);
    } catch (e) {
      console.warn('Load history/saved error:', e);
    } finally {
      setIsLoadingLists(false);
    }
  };

  // Initial load
  useEffect(() => {
    let isMounted = true;
    backendClient.searchDictionary({ query: '', limit: 40 }).then((res) => {
      if (isMounted && res.success && res.data) {
        setSearchResults(res.data.results);
      }
    });
    backendClient.getDictionaryHistory(20).then((res) => {
      if (isMounted && res.success && res.data) setHistoryList(res.data);
    });
    backendClient.getDictionaryFavorites().then((res) => {
      if (isMounted && res.success && res.data) setSavedList(res.data);
    });
    return () => { isMounted = false; };
  }, []);

  // Handle Search Input Change with Debounce
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(val, searchType, selectedHsk);
    }, 350);
  };

  // Open Word Detail
  const handleOpenDetail = async (wordOrId: string) => {
    setAiConsultation(null);
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);

    try {
      let res;
      if (wordOrId.startsWith('dict_')) {
        res = await backendClient.getDictionaryEntryById(wordOrId);
      } else {
        res = await backendClient.getDictionaryEntryByWord(wordOrId);
      }

      if (res.success && res.data) {
        setSelectedEntry(res.data);
        setIsFavorite(res.data.isFavorite);
        setPersonalNote(res.data.personalNote || '');
        setInMemory(res.data.learnerState?.inVocabMemory || false);
        setInSrs(res.data.learnerState?.inSrs || false);
      }
    } catch (err) {
      console.warn('Load entry detail error:', err);
    }
  };

  // Audio Playback
  const handlePlayAudio = (text: string) => {
    audioService.speak(text);
  };

  // Toggle Favorite
  const handleToggleFavorite = async () => {
    if (!selectedEntry) return;
    const res = await backendClient.toggleDictionaryFavorite(selectedEntry.id);
    if (res.success) {
      setIsFavorite(!!res.isFavorite);
      showToast(res.isFavorite ? 'Đã thêm từ vào danh sách yêu thích!' : 'Đã bỏ yêu thích.');
      loadSavedAndHistory();
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!selectedEntry) return;
    setIsSavingNote(true);
    const res = await backendClient.saveDictionaryPersonalNote({
      entryId: selectedEntry.id,
      note: personalNote
    });
    setIsSavingNote(false);
    if (res.success) {
      showToast('Đã lưu ghi chú cá nhân thành công!');
      loadSavedAndHistory();
    }
  };

  // Sync to Memory
  const handleSyncMemory = async () => {
    if (!selectedEntry) return;
    const res = await backendClient.syncDictionaryToMemory(selectedEntry.id);
    if (res.success) {
      setInMemory(true);
      showToast(res.message || 'Đã lưu vào bộ nhớ học tập!');
    }
  };

  // Sync to SRS
  const handleSyncSrs = async () => {
    if (!selectedEntry) return;
    const res = await backendClient.syncDictionaryToSrs(selectedEntry.id);
    if (res.success) {
      setInSrs(true);
      showToast(res.message || 'Đã thêm vào hàng đợi ôn tập SRS!');
    }
  };

  // Ask AI about word
  const handleAskAI = async (promptType: 'simple_explain' | 'more_examples' | 'distinguish' | 'sentence_quiz' | 'common_errors') => {
    if (!selectedEntry) return;
    setIsLoadingAi(true);
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);

    try {
      const res = await backendClient.askAIAboutWord({
        word: selectedEntry.simplified,
        promptType,
        userLevel: selectedEntry.hskLevel
      });
      if (res.success && res.data) {
        setAiConsultation(res.data);
      }
    } catch (err) {
      console.warn('Ask AI error:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Run In-Context Lookup
  const handleRunContextLookup = async () => {
    if (!contextSentence.trim()) return;
    setIsAnalyzingContext(true);
    try {
      const res = await backendClient.lookupDictionaryInContext({
        sentence: contextSentence.trim(),
        targetWord: contextTargetWord.trim() || undefined
      });
      if (res.success && res.data) {
        setContextResult(res.data);
      }
    } catch (err) {
      console.warn('Context lookup error:', err);
    } finally {
      setIsAnalyzingContext(false);
    }
  };

  // Run Word Comparison
  const handleRunComparison = async () => {
    if (!compareWord1.trim() || !compareWord2.trim()) return;
    setIsComparing(true);
    try {
      const res = await backendClient.compareDictionaryWords([compareWord1.trim(), compareWord2.trim()]);
      if (res.success && res.data) {
        setCompareResult(res.data);
      }
    } catch (err) {
      console.warn('Comparison error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-600 via-indigo-600 to-rose-600 p-6 md:p-8 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Chinese Dictionary v1.10.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Từ Điển Tiếng Trung Thông Minh
            </h1>
            <p className="text-sm text-white/90 max-w-xl mt-1.5 leading-relaxed">
              Tra cứu đa năng chữ Hán, Pinyin, nghĩa tiếng Việt, phân tích nghĩa theo ngữ cảnh cụ thể, đối chiếu từ gần nghĩa và tư vấn sư phạm cùng AI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('context');
                handleRunContextLookup();
              }}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <Split className="w-4 h-4 text-amber-300" />
              <span>Tra Ngữ Cảnh</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('compare');
                handleRunComparison();
              }}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-black/10"
            >
              <Layers className="w-4 h-4 text-primary-600" />
              <span>So Sánh Từ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'search'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Tra Cứu Từ Điển</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('context');
            if (!contextResult) handleRunContextLookup();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'context'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Split className="w-4 h-4" />
          <span>Tra Trong Ngữ Cảnh</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('compare');
            if (!compareResult) handleRunComparison();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'compare'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Phân Biệt Từ Gần Nghĩa</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('saved');
            loadSavedAndHistory();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'saved'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Từ Đã Lưu ({savedList.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            loadSavedAndHistory();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Lịch Sử Tra Cứu</span>
        </button>
      </div>

      {/* ==================== TAB 1: TRA CỨU TỪ ĐIỂN ==================== */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Box & Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Nhập chữ Hán (学习), Pinyin có/không dấu (xuexi / xuéxí), hoặc tiếng Việt (học tập)..."
                className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Type Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-slate-400 font-semibold mr-1">Chế độ:</span>
                {[
                  { id: 'auto', label: 'Tự động' },
                  { id: 'chinese', label: 'Chữ Hán' },
                  { id: 'pinyin', label: 'Pinyin' },
                  { id: 'vietnamese', label: 'Nghĩa Việt' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchType(t.id as any);
                      executeSearch(searchQuery, t.id, selectedHsk);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      searchType === t.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* HSK Level Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-slate-400 font-semibold mr-1">HSK:</span>
                {[0, 1, 2, 3, 4, 5, 6].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setSelectedHsk(lvl);
                      executeSearch(searchQuery, searchType, lvl);
                    }}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all text-[11px] ${
                      selectedHsk === lvl
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 0 ? 'Tất cả' : `HSK ${lvl}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Fallback Notice */}
          {isAiFallback && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-purple-500" />
              <span>
                Mục từ này được <strong>Gemini 3.5 Flash Lite</strong> biên soạn và lưu cache vĩnh viễn vào SQLite do chưa có trong từ điển hạt giống HSK.
              </span>
            </div>
          )}

          {/* Search Results List */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 px-1">
              <span>
                {isSearching
                  ? 'Đang tìm kiếm...'
                  : `Tìm thấy ${searchResults.length} mục từ (${searchDetectedType === 'chinese' ? 'Chữ Hán' : searchDetectedType === 'pinyin' ? 'Pinyin' : searchDetectedType === 'vietnamese' ? 'Tiếng Việt' : 'Tự động'})`}
              </span>
              <span>Bấm vào thẻ để xem chi tiết đầy đủ</span>
            </div>

            {isSearching ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Đang quét cơ sở dữ liệu từ điển...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item.id)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer shadow-xs hover:shadow-md group flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-chinese group-hover:text-primary-600 transition-colors">
                          {item.simplified}
                        </span>
                        {item.traditional && item.traditional !== item.simplified && (
                          <span className="text-xs text-slate-400 font-chinese">
                            [{item.traditional}]
                          </span>
                        )}
                        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 ml-1">
                          {item.pinyin}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                        {item.meaningVi}
                      </div>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span>{item.wordType}</span>
                        {item.radical && <span>• Bộ: {item.radical}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                        HSK {item.hskLevel}
                      </span>
                      {item.isFavorite && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(item.simplified);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Không tìm thấy từ vựng phù hợp
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy thử gõ Pinyin không dấu hoặc chọn chuyển sang tab Tra Trong Ngữ Cảnh để AI hỗ trợ phân tích câu trọn vẹn.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: TRA TRONG NGỮ CẢNH ==================== */}
      {activeTab === 'context' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Split className="w-5 h-5 text-primary-600" />
              <span>Tra Cứu Từ Trong Ngữ Cảnh Cụ Thể (In-Context Lookup)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nhập câu tiếng Trung chứa từ cần tra. AI sẽ xác định nghĩa chính xác theo ngữ cảnh, vai trò ngữ pháp và lý do thay vì liệt kê mọi nghĩa chung chung.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              1. Câu tiếng Trung cần tra:
            </label>
            <textarea
              rows={3}
              value={contextSentence}
              onChange={(e) => setContextSentence(e.target.value)}
              placeholder="Nhập câu tiếng Trung của bạn tại đây..."
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-chinese focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Interactive clickable tokens from sentence */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Chọn từ mục tiêu trong câu để phân tích (hoặc gõ vào ô dưới):
            </label>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-base leading-loose">
              <ClickableChineseText
                text={contextSentence}
                onWordClick={(w) => setContextTargetWord(w)}
                highlightWords={[contextTargetWord]}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={contextTargetWord}
                onChange={(e) => setContextTargetWord(e.target.value)}
                placeholder="Từ cần phân tích (VD: 学习)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-chinese font-bold text-primary-600"
              />
            </div>

            <button
              onClick={handleRunContextLookup}
              disabled={isAnalyzingContext || !contextSentence.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isAnalyzingContext ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>{isAnalyzingContext ? 'AI Đang Phân Tích...' : 'Phân Tích Ngữ Cảnh Bằng AI'}</span>
            </button>
          </div>

          {/* Context Result Display */}
          {contextResult && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-50/60 to-indigo-50/40 dark:from-slate-800/80 dark:to-slate-900 border border-primary-200/60 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between border-b border-primary-100 dark:border-slate-700 pb-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-chinese">
                      {contextResult.targetWord}
                    </span>
                    <span className="text-base font-semibold text-primary-600 dark:text-primary-400">
                      {contextResult.pinyin}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Vai trò trong câu: <strong className="text-primary-700 dark:text-primary-300">{contextResult.grammaticalRoleVi}</strong>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayAudio(contextResult.targetWord)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-primary-600 shadow-xs"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Exact Meaning in Context */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 shadow-xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nghĩa Trong Câu Này:
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {contextResult.contextualMeaningVi}
                </div>
              </div>

              {/* Reason why this sense applies */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 shadow-xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lý Do Chọn Nghĩa Này:
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {contextResult.reasonVi}
                </div>
              </div>

              {/* Full sentence translation */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 shadow-xs space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dịch Nghĩa Toàn Câu:
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {contextResult.sentenceTranslationVi}
                </div>
              </div>

              {/* Pedagogical Learner Tip */}
              {contextResult.learnerTipVi && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong>Mẹo sư phạm:</strong> {contextResult.learnerTipVi}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: PHÂN BIỆT TỪ GẦN NGHĨA ==================== */}
      {activeTab === 'compare' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-600" />
              <span>Phân Biệt Các Từ Gần Nghĩa Dễ Nhầm (Confusing Words Comparison)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              So sánh điểm giống, điểm khác, sắc thái biểu cảm, cấu trúc câu và bẫy dùng sai mà người Việt thường mắc phải.
            </p>
          </div>

          {/* Quick preset pair pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Cặp từ tiêu biểu:</span>
            {[
              ['看', '观看'],
              ['学习', '练习'],
              ['知道', '认识'],
              ['能', '可以'],
              ['买', '卖'],
              ['二', '两'],
              ['刚', '刚才'],
              ['一点儿', '有点儿']
            ].map(([w1, w2], idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCompareWord1(w1);
                  setCompareWord2(w2);
                  backendClient.compareDictionaryWords([w1, w2]).then(r => r.success && setCompareResult(r.data!));
                }}
                className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 border border-slate-200 dark:border-slate-700 transition-all font-chinese"
              >
                {w1} vs {w2}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center gap-2">
              <input
                type="text"
                value={compareWord1}
                onChange={(e) => setCompareWord1(e.target.value)}
                placeholder="Từ thứ nhất (VD: 看)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-chinese font-bold"
              />
              <span className="text-xs font-extrabold text-slate-400 uppercase">VS</span>
              <input
                type="text"
                value={compareWord2}
                onChange={(e) => setCompareWord2(e.target.value)}
                placeholder="Từ thứ hai (VD: 观看)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-chinese font-bold"
              />
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isComparing || !compareWord1.trim() || !compareWord2.trim()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isComparing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              <span>{isComparing ? 'Đang So Sánh...' : 'Đối Chiếu Chi Tiết'}</span>
            </button>
          </div>

          {/* Comparison Result Display */}
          {compareResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Similarities & Differences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Điểm Giống Nhau:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {compareResult.similaritiesVi}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Khác Biệt Cốt Lõi:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {compareResult.differencesVi}
                  </p>
                </div>
              </div>

              {/* Comparison Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 font-bold">Từ</th>
                      <th className="p-3 font-bold">Pinyin</th>
                      <th className="p-3 font-bold">Nghĩa cốt lõi</th>
                      <th className="p-3 font-bold">Đặc điểm ngữ cảnh</th>
                      <th className="p-3 font-bold">Câu ví dụ thực tế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {compareResult.comparisonTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-base font-chinese text-slate-900 dark:text-white">
                          {row.word}
                        </td>
                        <td className="p-3 font-medium text-primary-600 dark:text-primary-400">
                          {row.pinyin}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {row.coreMeaningVi}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                          {row.keyFeatureVi}
                        </td>
                        <td className="p-3 font-chinese text-slate-900 dark:text-slate-100">
                          <div>{row.exampleZh}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic font-sans">{row.exampleVi}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Common Mistakes */}
              {compareResult.commonMistakesVi && compareResult.commonMistakesVi.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
                  <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-2">
                    Cảnh Báo Lỗi Sai Người Việt Hay Mắc:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                    {compareResult.commonMistakesVi.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: TỪ ĐÃ LƯU & YÊU THÍCH ==================== */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Danh sách từ bạn đã đánh dấu yêu thích hoặc gắn ghi chú cá nhân</span>
            <span>{savedList.length} từ</span>
          </div>

          {isLoadingLists ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Đang nạp danh sách từ đã lưu...</p>
            </div>
          ) : savedList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item.entryId)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold font-chinese text-slate-900 dark:text-white">
                          {item.simplified}
                        </span>
                        <span className="text-xs font-semibold text-primary-600">
                          {item.pinyin}
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700">
                          HSK {item.hskLevel}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                        {item.meaningVi}
                      </div>
                      {item.personalNote && (
                        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg mt-2 italic">
                          "{item.personalNote}"
                        </div>
                      )}
                    </div>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Star className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Bạn chưa lưu từ vựng nào vào mục Yêu thích.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 5: LỊCH SỬ TRA CỨU ==================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>20 lượt tra cứu gần nhất của bạn</span>
          </div>

          {historyList.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.entry) handleOpenDetail(item.entry.id);
                    else {
                      setSearchQuery(item.query);
                      setActiveTab('search');
                      executeSearch(item.query);
                    }
                  }}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white font-chinese flex items-center gap-2">
                        <span>{item.query}</span>
                        {item.entry && (
                          <span className="text-xs text-primary-600 font-sans font-medium">
                            ({item.entry.pinyin} - {item.entry.meaningVi})
                          </span>
                        )}
                      </div>
                      {item.contextSentence && (
                        <div className="text-xs text-slate-400 italic mt-0.5 line-clamp-1">
                          Ngữ cảnh: "{item.contextSentence}"
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    {item.queryType}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Chưa có lịch sử tra cứu nào.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== WORD DETAIL DRAWER / MODAL ==================== */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chi Tiết Mục Từ Điển
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Headword Section */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white font-chinese tracking-wide">
                      {selectedEntry.simplified}
                    </h1>
                    {selectedEntry.traditional && selectedEntry.traditional !== selectedEntry.simplified && (
                      <span className="text-base text-slate-400 font-chinese">
                        [Phồn thể: {selectedEntry.traditional}]
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-2">
                    <span>{selectedEntry.pinyin}</span>
                    <button
                      onClick={() => handlePlayAudio(selectedEntry.simplified)}
                      className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                      title="Phát âm từ"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                      HSK {selectedEntry.hskLevel}
                    </span>
                    <button
                      onClick={handleToggleFavorite}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                    >
                      <Star className={`w-5 h-5 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {selectedEntry.wordType}
                  </span>
                </div>
              </div>

              {/* Main Vietnamese Meaning */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nghĩa Tiếng Việt Cốt Lõi:
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedEntry.meaningVi}
                </div>
              </div>

              {/* Radicals, Strokes, Measure words */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">Bộ thủ:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-chinese">{selectedEntry.radical || '—'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">Số nét:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedEntry.strokeCount || 1} nét</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">Lượng từ:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-chinese">{selectedEntry.measureWords || '—'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block mb-0.5">Trạng thái:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {selectedEntry.learnerState?.inVocabMemory ? 'Đã trong bộ nhớ' : 'Chưa học'}
                  </strong>
                </div>
              </div>

              {/* Character Decomposition */}
              {selectedEntry.characterDecomposition && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-xs">
                  <strong className="text-slate-400 uppercase tracking-wide block mb-1">Cấu tạo chữ Hán:</strong>
                  <span className="text-slate-800 dark:text-slate-200 font-chinese font-medium">
                    {selectedEntry.characterDecomposition}
                  </span>
                </div>
              )}

              {/* Multiple Senses if any */}
              {selectedEntry.senses && selectedEntry.senses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Các Nét Nghĩa & Ngữ Cảnh Sử Dụng:
                  </h4>
                  <div className="space-y-2">
                    {selectedEntry.senses.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {idx + 1}. {s.meaningVi}
                        </div>
                        {s.contextVi && (
                          <div className="text-slate-400 italic">Ngữ cảnh: {s.contextVi}</div>
                        )}
                        {s.example && (
                          <div className="text-slate-700 dark:text-slate-300 font-chinese pt-1">
                            {s.example.zh} ({s.example.pinyin}) — {s.example.vi}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples Section */}
              {selectedEntry.examples && selectedEntry.examples.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ví Dụ Thực Tế:
                  </h4>
                  <div className="space-y-2.5">
                    {selectedEntry.examples.map((ex, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-chinese">
                            {ex.zh}
                          </span>
                          <button
                            onClick={() => handlePlayAudio(ex.zh)}
                            className="p-1 text-slate-400 hover:text-primary-600"
                            title="Nghe câu"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-primary-600 dark:text-primary-400 italic">
                          {ex.pinyin}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
                          {ex.vi}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Synonyms, Antonyms, Collocations */}
              {(selectedEntry.synonyms || selectedEntry.antonyms || selectedEntry.collocations) && (
                <div className="space-y-2 text-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Mở Rộng Từ Vựng:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.collocations?.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-chinese">
                        Cụm: {c}
                      </span>
                    ))}
                    {selectedEntry.synonyms?.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-chinese">
                        Đồng nghĩa: {s}
                      </span>
                    ))}
                    {selectedEntry.antonyms?.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-chinese">
                        Trái nghĩa: {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== AI VOCABULARY CONSULTATION ==================== */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200/80 dark:border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                      Hỏi AI Về Từ Này (AI Consultation)
                    </h4>
                  </div>
                  <span className="text-[10px] text-purple-600/80 dark:text-purple-400 font-medium">
                    Gemini 3.5 Flash Lite
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAskAI('simple_explain')}
                    disabled={isLoadingAi}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 transition-colors"
                  >
                    Giải thích dễ hiểu
                  </button>
                  <button
                    onClick={() => handleAskAI('more_examples')}
                    disabled={isLoadingAi}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 transition-colors"
                  >
                    Thêm 3 ví dụ sinh động
                  </button>
                  <button
                    onClick={() => handleAskAI('distinguish')}
                    disabled={isLoadingAi}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 transition-colors"
                  >
                    Phân biệt từ tương đồng
                  </button>
                  <button
                    onClick={() => handleAskAI('common_errors')}
                    disabled={isLoadingAi}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 transition-colors"
                  >
                    Lỗi người Việt hay mắc
                  </button>
                  <button
                    onClick={() => handleAskAI('sentence_quiz')}
                    disabled={isLoadingAi}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 transition-colors"
                  >
                    Tạo bài tập kiểm tra
                  </button>
                </div>

                {isLoadingAi && (
                  <div className="py-4 text-center text-xs text-purple-600 dark:text-purple-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI đang phân tích và chuẩn bị câu trả lời...</span>
                  </div>
                )}

                {aiConsultation && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-purple-100 dark:border-purple-900/40 text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold text-purple-800 dark:text-purple-300">
                      {aiConsultation.title}
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {aiConsultation.contentVi}
                    </div>

                    {/* Quiz Interactive Card */}
                    {aiConsultation.quizData && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-chinese text-sm">
                          {aiConsultation.quizData.questionZh}
                        </div>
                        <div className="text-[11px] text-slate-400 italic">
                          {aiConsultation.quizData.questionPinyin}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {aiConsultation.quizData.options.map((opt, i) => {
                            const isSelected = selectedQuizOption === opt;
                            const isCorrect = isQuizSubmitted && opt.includes(aiConsultation.quizData!.answer);
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setSelectedQuizOption(opt);
                                  setIsQuizSubmitted(true);
                                }}
                                className={`p-2 rounded-lg text-left text-xs font-semibold transition-all ${
                                  isQuizSubmitted
                                    ? isCorrect
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                                      : isSelected
                                      ? 'bg-rose-100 text-rose-800 border border-rose-400'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200'
                                    : isSelected
                                    ? 'bg-purple-100 text-purple-800 border border-purple-400'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {isQuizSubmitted && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                            ✓ {aiConsultation.quizData.explanationVi}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personal Notes Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Ghi Chú Cá Nhân Của Bạn:</span>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isSavingNote ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Thêm mẹo nhớ riêng, tình huống gặp từ, hoặc lưu ý cá nhân..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Sync Actions & Cross Navigation */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSyncMemory}
                    disabled={inMemory}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      inMemory
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                    }`}
                  >
                    {inMemory ? <CheckCircle2 className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                    <span>{inMemory ? 'Đã trong Bộ Nhớ' : 'Lưu vào Bộ Nhớ Học Tập'}</span>
                  </button>

                  <button
                    onClick={handleSyncSrs}
                    disabled={inSrs}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      inSrs
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>{inSrs ? 'Đã trong SRS' : 'Lưu vào Ôn Tập SRS (SM-2)'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      if (onNavigate) onNavigate('write');
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Luyện Viết</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      if (onNavigate) onNavigate('pronounce');
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Phát Âm</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      if (onNavigate) onNavigate('shadowing');
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Shadowing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
