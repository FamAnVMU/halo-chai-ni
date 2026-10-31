import React, { useEffect, useState } from 'react';
import {
  Brain,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  Bookmark,
  Volume2,
  Plus,
  RefreshCw,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  UserCheck
} from 'lucide-react';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';

export const LearnerMemoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'errors' | 'analyses' | 'profile'>('vocab');
  const [memoryData, setMemoryData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedHsk, setSelectedHsk] = useState<number | 'all'>('all');
  const [selectedMastery, setSelectedMastery] = useState<string | 'all'>('all');

  // Edit/Add Modals
  const [isEditVocabOpen, setIsEditVocabOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<any | null>(null);

  const [isEditGrammarOpen, setIsEditGrammarOpen] = useState(false);
  const [editingGrammar, setEditingGrammar] = useState<any | null>(null);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    setIsLoading(true);
    const res = await backendClient.getFullMemory();
    if (res.success && res.data) {
      setMemoryData(res.data);
      setEditingProfile(res.data.profile);
    }
    setIsLoading(false);
  };

  // Vocabulary handlers
  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab) return;
    await backendClient.saveVocabulary(editingVocab);
    setIsEditVocabOpen(false);
    setEditingVocab(null);
    loadMemory();
  };

  const handleDeleteVocab = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa từ vựng này khỏi bộ nhớ?')) {
      await backendClient.deleteVocabulary(id);
      loadMemory();
    }
  };

  const handleToggleVocabMastery = async (vocab: any) => {
    const nextMastery = vocab.mastery_level === 'mastered' ? 'needs_review' : 'mastered';
    await backendClient.saveVocabulary({
      ...vocab,
      meaningVi: vocab.meaning_vi,
      wordType: vocab.word_type,
      hskLevel: vocab.hsk_level,
      masteryLevel: nextMastery
    });
    loadMemory();
  };

  // Grammar handlers
  const handleSaveGrammar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrammar) return;
    await backendClient.saveGrammar(editingGrammar);
    setIsEditGrammarOpen(false);
    setEditingGrammar(null);
    loadMemory();
  };

  const handleDeleteGrammar = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu trúc ngữ pháp này khỏi bộ nhớ?')) {
      await backendClient.deleteGrammar(id);
      loadMemory();
    }
  };

  const handleToggleGrammarMastery = async (grammar: any) => {
    const nextMastery = grammar.mastery_level === 'mastered' ? 'learning' : 'mastered';
    await backendClient.saveGrammar({
      ...grammar,
      patternName: grammar.pattern_name,
      meaningVi: grammar.meaning_vi,
      usageNotes: grammar.usage_notes,
      hskLevel: grammar.hsk_level,
      masteryLevel: nextMastery
    });
    loadMemory();
  };

  // Error handlers
  const handleToggleErrorResolved = async (err: any) => {
    const nextStatus = err.status === 'resolved' ? 'pending' : 'resolved';
    await backendClient.saveError({
      id: err.id,
      status: nextStatus
    });
    loadMemory();
  };

  const handleDeleteError = async (id: number) => {
    if (confirm('Xóa lỗi sai này khỏi bộ nhớ theo dõi?')) {
      await backendClient.deleteError(id);
      loadMemory();
    }
  };

  // Profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    await backendClient.updateProfile(editingProfile);
    setIsEditProfileOpen(false);
    loadMemory();
  };

  // Filtering vocabulary
  const filteredVocab = (memoryData?.vocabularies || []).filter((v: any) => {
    const matchSearch =
      v.simplified.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.pinyin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.meaning_vi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchHsk = selectedHsk === 'all' || v.hsk_level === Number(selectedHsk);
    const matchMastery = selectedMastery === 'all' || v.mastery_level === selectedMastery;
    return matchSearch && matchHsk && matchMastery;
  });

  // Filtering grammar
  const filteredGrammar = (memoryData?.grammar || []).filter((g: any) => {
    const matchSearch =
      g.pattern_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.meaning_vi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchHsk = selectedHsk === 'all' || g.hsk_level === Number(selectedHsk);
    const matchMastery = selectedMastery === 'all' || g.mastery_level === selectedMastery;
    return matchSearch && matchHsk && matchMastery;
  });

  const getMasteryBadge = (level: string) => {
    switch (level) {
      case 'mastered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Đã thành thạo</span>;
      case 'fair':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Nắm tương đối</span>;
      case 'needs_review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Cần ôn tập</span>;
      case 'learning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">Đang học</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Đã giới thiệu</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600" />
            <span>Bộ Nhớ Học Tập Dài Hạn</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              SQLite Bền Vững
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhớ mọi từ vựng, ngữ pháp, lỗi sai đã giảng dạy để AI không lặp lại kiến thức và tối ưu hóa bài giảng tiếp theo.
          </p>
        </div>

        <button
          onClick={loadMemory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Làm mới bộ nhớ</span>
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      {memoryData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-xs text-slate-400 font-semibold">Từ vựng đã dạy</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {memoryData.stats.totalVocab}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {memoryData.stats.masteredVocab} từ đã thuộc
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-xs text-slate-400 font-semibold">Ngữ pháp đã học</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {memoryData.stats.totalGrammar}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              {memoryData.stats.masteredGrammar} cấu trúc làm chủ
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-xs text-slate-400 font-semibold">Bộ nhớ lỗi sai</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {memoryData.stats.pendingErrors}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              Đang ưu tiên củng cố
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="text-xs text-slate-400 font-semibold">Thời gian học tập</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {memoryData.stats.totalStudyMinutes} <span className="text-xs font-normal">phút</span>
            </div>
            <div className="text-[11px] text-primary-600 dark:text-primary-400 font-bold">
              HSK {memoryData.profile.current_hsk} ➔ HSK {memoryData.profile.target_hsk}
            </div>
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('vocab')}
          className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'vocab'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          1. Từ vựng đã dạy ({memoryData?.vocabularies?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('grammar')}
          className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'grammar'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          2. Ngữ pháp đã dạy ({memoryData?.grammar?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'errors'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          3. Bộ nhớ lỗi sai ({memoryData?.errors?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('analyses')}
          className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'analyses'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          4. Lịch sử phân tích hội thoại ({memoryData?.analyses?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'profile'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          5. Hồ sơ học viên
        </button>
      </div>

      {/* SEARCH & FILTERS BAR (For Vocab & Grammar) */}
      {(activeTab === 'vocab' || activeTab === 'grammar') && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm chữ Hán, Pinyin, nghĩa tiếng Việt, cấu trúc..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-primary-500 font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedHsk}
              onChange={(e) => setSelectedHsk(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
            >
              <option value="all">Tất cả HSK</option>
              <option value="1">HSK 1</option>
              <option value="2">HSK 2</option>
              <option value="3">HSK 3</option>
              <option value="4">HSK 4</option>
            </select>

            <select
              value={selectedMastery}
              onChange={(e) => setSelectedMastery(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="mastered">Đã thành thạo</option>
              <option value="fair">Nắm tương đối</option>
              <option value="learning">Đang học</option>
              <option value="needs_review">Cần ôn tập</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: VOCABULARY MEMORY */}
      {activeTab === 'vocab' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              Hiển thị {filteredVocab.length} từ vựng
            </span>

            <button
              onClick={() => {
                setEditingVocab({
                  simplified: '',
                  traditional: '',
                  pinyin: '',
                  meaningVi: '',
                  wordType: 'danh từ',
                  hskLevel: 1,
                  masteryLevel: 'introduced',
                  notes: ''
                });
                setIsEditVocabOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm từ vựng
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredVocab.map((v: any) => (
              <div
                key={v.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold font-chinese text-2xl text-slate-900 dark:text-slate-100">
                        {v.simplified}
                      </span>
                      <span className="text-xs text-rose-500 font-semibold ml-2">[{v.pinyin}]</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ml-2">
                        HSK {v.hsk_level}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => audioService.speak(v.simplified)}
                        className="p-1.5 text-slate-400 hover:text-primary-600"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingVocab({
                            ...v,
                            meaningVi: v.meaning_vi,
                            wordType: v.word_type,
                            hskLevel: v.hsk_level,
                            masteryLevel: v.mastery_level
                          });
                          setIsEditVocabOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                        title="Sửa từ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVocab(v.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {v.meaning_vi}
                  </div>

                  {v.examples?.length > 0 && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {v.examples[0]}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                  <div className="text-slate-400">
                    Ôn: {v.review_count} lần • {getMasteryBadge(v.mastery_level)}
                  </div>

                  <button
                    onClick={() => handleToggleVocabMastery(v)}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {v.mastery_level === 'mastered' ? 'Đánh dấu cần ôn' : 'Đánh dấu thành thạo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: GRAMMAR MEMORY */}
      {activeTab === 'grammar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              Hiển thị {filteredGrammar.length} cấu trúc ngữ pháp
            </span>

            <button
              onClick={() => {
                setEditingGrammar({
                  patternName: '',
                  formula: '',
                  meaningVi: '',
                  usageNotes: '',
                  hskLevel: 1,
                  masteryLevel: 'introduced',
                  notes: ''
                });
                setIsEditGrammarOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm ngữ pháp
            </button>
          </div>

          <div className="space-y-3">
            {filteredGrammar.map((g: any) => (
              <div
                key={g.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{g.pattern_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        HSK {g.hsk_level}
                      </span>
                    </h3>
                    <div className="mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs font-bold text-primary-700 dark:text-primary-300">
                      {g.formula}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingGrammar({
                          ...g,
                          patternName: g.pattern_name,
                          meaningVi: g.meaning_vi,
                          usageNotes: g.usage_notes,
                          hskLevel: g.hsk_level,
                          masteryLevel: g.mastery_level
                        });
                        setIsEditGrammarOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                      title="Sửa cấu trúc"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGrammar(g.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {g.meaning_vi} {g.usage_notes && `— ${g.usage_notes}`}
                </div>

                {g.examples?.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Ví dụ minh họa:
                    </span>
                    <div className="text-slate-600 dark:text-slate-300 font-chinese">{g.examples[0]}</div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div className="text-slate-400">
                    Đã ôn: {g.review_count} lần • {getMasteryBadge(g.mastery_level)}
                  </div>

                  <button
                    onClick={() => handleToggleGrammarMastery(g)}
                    className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {g.mastery_level === 'mastered' ? 'Đánh dấu đang học' : 'Đánh dấu thành thạo'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEARNING ERRORS LEDGER */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Cơ chế xử lý lỗi sai của AI:
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              Các lỗi người học thường mắc phải được lưu vĩnh viễn trong SQLite. Khi tạo bài học mới, AI sẽ ưu tiên đưa những lỗi này vào bài tập để giúp người học khắc phục triệt để.
            </p>
          </div>

          <div className="space-y-3">
            {(memoryData?.errors || []).map((err: any) => {
              const isResolved = err.status === 'resolved';
              return (
                <div
                  key={err.id}
                  className={`p-5 rounded-3xl border transition-all space-y-3 ${
                    isResolved
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                      : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isResolved ? 'ĐÃ KHẮC PHỤC' : 'ĐANG THEO DÕI'}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {err.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        Xuất hiện: {err.occurrence_count} lần
                      </span>
                      <button
                        onClick={() => handleDeleteError(err.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Xóa lỗi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                    <div className="text-rose-600 line-through">
                      Câu sai: "{err.user_sentence}"
                    </div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ Sửa đúng: "{err.corrected_sentence}"
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 pt-1">
                      {err.explanation_vi}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleToggleErrorResolved(err)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isResolved
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                          : 'bg-emerald-600 text-white shadow hover:bg-emerald-700'
                      }`}
                    >
                      {isResolved ? 'Đánh dấu chưa khắc phục' : 'Đánh dấu đã sửa được lỗi'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CONVERSATION ANALYSES HISTORY */}
      {activeTab === 'analyses' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Lịch sử các phiên phân tích sư phạm do AI trích xuất sau mỗi cuộc trò chuyện văn bản hoặc Voice Chat.
          </div>

          <div className="space-y-4">
            {(memoryData?.analyses || []).map((an: any) => (
              <div
                key={an.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Phiên: {new Date(an.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-950 px-2.5 py-0.5 rounded-full">
                    {an.topics.join(', ') || 'Hội thoại'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {an.summary_vi}
                </p>

                {an.newVocabTaught?.length > 0 && (
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Từ vựng AI thực sự đã dạy trong buổi này:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {an.newVocabTaught.map((v: any, vi: number) => (
                        <span
                          key={vi}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-chinese font-semibold text-[11px]"
                        >
                          {v.simplified} [{v.pinyin}]: {v.meaningVi}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {an.knowledgeGaps?.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-200 block mb-0.5">
                      Lỗ hổng kiến thức cần luyện thêm:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                      {an.knowledgeGaps.map((gap: string, gi: number) => (
                        <li key={gi}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LEARNER PROFILE */}
      {activeTab === 'profile' && memoryData?.profile && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-primary-600" />
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Hồ Sơ Năng Lực & Mục Tiêu Cá Nhân
              </h2>
            </div>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
            >
              Chỉnh sửa hồ sơ
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-400 font-semibold block">Tên người học:</span>
              <div className="font-black text-sm text-slate-800 dark:text-slate-100">
                {memoryData.profile.name}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-400 font-semibold block">Cấp độ HSK hiện tại & Mục tiêu:</span>
              <div className="font-black text-sm text-primary-600 dark:text-primary-400">
                HSK {memoryData.profile.current_hsk} ➔ Đang hướng tới HSK {memoryData.profile.target_hsk}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 sm:col-span-2">
              <span className="text-slate-400 font-semibold block">Mục tiêu học tập:</span>
              <ul className="list-disc list-inside space-y-1 font-medium text-slate-700 dark:text-slate-200">
                {memoryData.profile.learningGoals.map((g: string, i: number) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1.5">
              <span className="text-emerald-800 dark:text-emerald-300 font-bold block">
                Điểm mạnh được AI ghi nhận:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                {memoryData.profile.strengths.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1.5">
              <span className="text-amber-800 dark:text-amber-300 font-bold block">
                Điểm yếu AI đang hỗ trợ:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                {memoryData.profile.weaknesses.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VOCAB MODAL */}
      {isEditVocabOpen && editingVocab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveVocab}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
              {editingVocab.id ? 'Chỉnh Sửa Từ Vựng Trong Bộ Nhớ' : 'Thêm Từ Vựng Mới Vào Bộ Nhớ'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Chữ Hán (Giản thể):</label>
                <input
                  type="text"
                  required
                  value={editingVocab.simplified}
                  onChange={(e) => setEditingVocab({ ...editingVocab, simplified: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-chinese text-base font-bold"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Phiên âm Pinyin:</label>
                <input
                  type="text"
                  required
                  value={editingVocab.pinyin}
                  onChange={(e) => setEditingVocab({ ...editingVocab, pinyin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Nghĩa tiếng Việt:</label>
                <input
                  type="text"
                  required
                  value={editingVocab.meaningVi}
                  onChange={(e) => setEditingVocab({ ...editingVocab, meaningVi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Cấp độ HSK:</label>
                  <select
                    value={editingVocab.hskLevel}
                    onChange={(e) => setEditingVocab({ ...editingVocab, hskLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map(lvl => (
                      <option key={lvl} value={lvl}>HSK {lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Mức độ thành thạo:</label>
                  <select
                    value={editingVocab.masteryLevel}
                    onChange={(e) => setEditingVocab({ ...editingVocab, masteryLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="introduced">Đã giới thiệu</option>
                    <option value="learning">Đang học</option>
                    <option value="needs_review">Cần ôn tập</option>
                    <option value="fair">Nắm tương đối</option>
                    <option value="mastered">Đã thành thạo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditVocabOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
              >
                Lưu vào bộ nhớ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileOpen && editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
              Chỉnh Sửa Hồ Sơ Năng Lực Học Viên
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Tên của bạn:</label>
                <input
                  type="text"
                  required
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">HSK Hiện tại:</label>
                  <select
                    value={editingProfile.current_hsk}
                    onChange={(e) => setEditingProfile({ ...editingProfile, current_hsk: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map(l => (
                      <option key={l} value={l}>HSK {l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">HSK Mục tiêu:</label>
                  <select
                    value={editingProfile.target_hsk}
                    onChange={(e) => setEditingProfile({ ...editingProfile, target_hsk: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map(l => (
                      <option key={l} value={l}>HSK {l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
