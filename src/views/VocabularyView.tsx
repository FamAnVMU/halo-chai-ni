import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Volume2,
  Star,
  RotateCcw,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { Vocabulary, SRSCard, HSKLevel } from '../types';
import { db } from '../db';
import { backendClient } from '../utils/backendClient';
import { audioService } from '../utils/audio';
import { calculateSM2 } from '../utils/srs';
import { RubyText } from '../components/common/RubyText';

export const VocabularyView: React.FC = () => {
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [srsMap, setSrsMap] = useState<Record<number, SRSCard>>({});
  const [filterHsk, setFilterHsk] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'flashcard'>('list');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Flashcard mode state
  const [flashcardIdx, setFlashcardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Add custom word modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSimplified, setNewSimplified] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newType, setNewType] = useState('Danh từ');
  const [newHsk, setNewHsk] = useState<HSKLevel>(1);
  const [newExampleZh, setNewExampleZh] = useState('');
  const [newExampleVi, setNewExampleVi] = useState('');

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    setIsLoading(true);
    try {
      // 1. Thử lấy dữ liệu từ Backend SQLite (Nguồn chân lý dùng chung)
      const memRes = await backendClient.getFullMemory();
      const srsRes = await backendClient.getSrsDashboard();

      if (memRes.success && memRes.data?.vocabulary && memRes.data.vocabulary.length > 0) {
        const unifiedVocabs: Vocabulary[] = memRes.data.vocabulary.map((v: any) => {
          let exZh = '';
          let exVi = '';
          if (v.examples_json) {
            try {
              const parsed = JSON.parse(v.examples_json);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const first = parsed[0];
                if (typeof first === 'string') {
                  exZh = first;
                } else if (typeof first === 'object') {
                  exZh = first.zh || '';
                  exVi = first.vi || '';
                }
              }
            } catch {}
          }

          return {
            id: v.id,
            simplified: v.simplified,
            traditional: v.traditional || v.simplified,
            pinyin: v.pinyin,
            meaningVi: v.meaning_vi,
            wordType: v.word_type || 'từ vựng',
            hskLevel: (v.hsk_level || 1) as HSKLevel,
            exampleZh: exZh,
            examplePinyin: '',
            exampleVi: exVi,
            isFavorite: v.is_favorite === 1,
            isCustom: v.source_session_id === 'user_custom',
            createdAt: v.first_taught_at || Date.now(),
          };
        });

        setVocabList(unifiedVocabs);

        // Tạo map thẻ SRS
        const map: Record<number, SRSCard> = {};
        unifiedVocabs.forEach((v) => {
          map[v.id!] = {
            vocabId: v.id!,
            repetition: 1,
            interval: 1,
            easeFactor: 2.5,
            nextReviewDate: new Date().toISOString().split('T')[0],
            status: 'learning',
            correctCount: 1,
            incorrectCount: 0,
          };
        });
        setSrsMap(map);
      } else {
        // Fallback về local Dexie nếu backend rỗng hoặc offline
        const vocabs = await db.vocabularies.toArray();
        setVocabList(vocabs);

        const srsCards = await db.srsCards.toArray();
        const map: Record<number, SRSCard> = {};
        srsCards.forEach((c) => {
          map[c.vocabId] = c;
        });
        setSrsMap(map);
      }
    } catch (err) {
      console.warn('Lỗi khi nạp từ vựng từ backend, dùng local cache:', err);
      const vocabs = await db.vocabularies.toArray();
      setVocabList(vocabs);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id?: number, currentFav?: boolean) => {
    if (!id) return;
    try {
      await db.vocabularies.update(id, { isFavorite: !currentFav });
      setVocabList((prev) =>
        prev.map((v) => (v.id === id ? { ...v, isFavorite: !currentFav } : v))
      );
    } catch (err) {
      console.error('Lỗi khi đổi yêu thích:', err);
    }
  };

  const handleSRSReview = async (vocabId: number, quality: number) => {
    const card = srsMap[vocabId] || {
      vocabId,
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString().split('T')[0],
      status: 'learning',
      correctCount: 0,
      incorrectCount: 0,
    };

    const targetVocab = vocabList.find((v) => v.id === vocabId);

    // 1. Đồng bộ lên Backend SRS (SM-2) nếu có
    if (targetVocab) {
      try {
        const ratingMap: Record<number, any> = { 1: 1, 2: 2, 3: 4, 5: 5 };
        await backendClient.submitSrsReview({
          itemId: `srs_vocab_${targetVocab.simplified}`,
          userRating: ratingMap[quality] || 4,
          reviewMode: 'flashcard',
        });
      } catch (e) {
        console.warn('Đồng bộ backend SRS thất bại:', e);
      }
    }

    // 2. Cập nhật Dexie local cache
    const updated = calculateSM2(card, quality);
    const existing = await db.srsCards.where('vocabId').equals(vocabId).first();

    if (existing?.id) {
      await db.srsCards.update(existing.id, {
        ...updated,
        lastReviewedDate: new Date().toISOString().split('T')[0],
        correctCount: quality >= 3 ? card.correctCount + 1 : card.correctCount,
        incorrectCount: quality < 3 ? card.incorrectCount + 1 : card.incorrectCount,
      });
    } else {
      await db.srsCards.add({
        ...updated,
        vocabId,
        correctCount: quality >= 3 ? 1 : 0,
        incorrectCount: quality < 3 ? 1 : 0,
        lastReviewedDate: new Date().toISOString().split('T')[0],
      });
    }

    // Chuyển thẻ tiếp theo
    setIsFlipped(false);
    if (flashcardIdx + 1 < filteredList.length) {
      setFlashcardIdx(flashcardIdx + 1);
    } else {
      setFlashcardIdx(0);
    }
    loadVocabularies();
  };

  const handleAddCustomWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimplified.trim() || !newMeaning.trim()) return;

    // 1. Lưu vào Backend SQLite chung (vocabulary_memory & srs_items)
    try {
      await backendClient.saveVocabulary({
        simplified: newSimplified.trim(),
        traditional: newSimplified.trim(),
        pinyin: newPinyin.trim(),
        meaningVi: newMeaning.trim(),
        wordType: newType,
        hskLevel: newHsk,
        notes: newExampleZh.trim() ? `Ví dụ: ${newExampleZh.trim()}` : '',
      });
      await backendClient.syncReadingWordToMemory(
        newSimplified.trim(),
        newPinyin.trim(),
        newMeaning.trim(),
        newHsk
      );
    } catch (err) {
      console.warn('Lỗi lưu từ vựng lên backend:', err);
    }

    // 2. Lưu vào Dexie local cache
    const id = await db.vocabularies.add({
      simplified: newSimplified.trim(),
      traditional: newSimplified.trim(),
      pinyin: newPinyin.trim(),
      meaningVi: newMeaning.trim(),
      wordType: newType,
      hskLevel: newHsk,
      exampleZh: newExampleZh.trim(),
      examplePinyin: '',
      exampleVi: newExampleVi.trim(),
      isCustom: true,
      isFavorite: true,
      createdAt: Date.now(),
    });

    await db.srsCards.add({
      vocabId: Number(id),
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString().split('T')[0],
      status: 'new',
      correctCount: 0,
      incorrectCount: 0,
    });

    setIsAddModalOpen(false);
    setNewSimplified('');
    setNewPinyin('');
    setNewMeaning('');
    setNewExampleZh('');
    setNewExampleVi('');
    loadVocabularies();
  };

  const filteredList = vocabList.filter((item) => {
    if (filterHsk !== 'all' && item.hskLevel !== filterHsk) return false;
    if (showFavoritesOnly && !item.isFavorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.simplified.includes(q) ||
        item.pinyin.toLowerCase().includes(q) ||
        item.meaningVi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const currentFlashcard = filteredList[flashcardIdx];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Kho Từ Vựng & Flashcard SRS</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
              {vocabList.length} từ
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhớ từ vựng lâu dài với thuật toán lặp lại ngắt quãng SuperMemo SM-2.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Switch List / Flashcard */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>

            <button
              onClick={() => {
                setViewMode('flashcard');
                setFlashcardIdx(0);
                setIsFlipped(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'flashcard'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcard SRS</span>
            </button>
          </div>

          {/* Add custom word button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm từ mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo chữ Hán, Pinyin hoặc nghĩa tiếng Việt..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* HSK Filter */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setFilterHsk('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterHsk === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tất cả
          </button>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterHsk(lvl as HSKLevel)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterHsk === lvl
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              HSK {lvl}
            </button>
          ))}
        </div>

        {/* Favorite Filter Toggle */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`p-2 rounded-xl border transition-colors ${
            showFavoritesOnly
              ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-500'
              : 'border-slate-200 dark:border-slate-700 text-slate-400'
          }`}
          title="Chỉ xem từ yêu thích"
        >
          <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
        </button>
      </div>

      {/* FLASHCARD MODE */}
      {viewMode === 'flashcard' && (
        <div className="max-w-md mx-auto space-y-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Không có từ nào phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : currentFlashcard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Thẻ {flashcardIdx + 1} / {filteredList.length}</span>
                <span className="text-primary-600">HSK {currentFlashcard.hskLevel}</span>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-80 rounded-3xl cursor-pointer perspective relative group"
              >
                <div
                  className={`w-full h-full rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center transition-all duration-300 ${
                    !isFlipped
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gradient-to-b from-primary-50 to-rose-50 dark:from-slate-900 dark:to-slate-800 border-primary-300'
                  }`}
                >
                  {!isFlipped ? (
                    /* Front of card: Chinese Character */
                    <div className="space-y-4">
                      <div className="text-6xl font-black font-chinese text-slate-900 dark:text-slate-100">
                        {currentFlashcard.simplified}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        Nhấn để lật thẻ xem Pinyin & Nghĩa
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioService.speak(currentFlashcard.simplified);
                        }}
                        className="p-3 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-600 hover:scale-110 transition-transform"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    /* Back of card: Pinyin, Vietnamese meaning, examples */
                    <div className="space-y-3">
                      <div className="text-3xl font-black font-chinese text-slate-900 dark:text-slate-100">
                        {currentFlashcard.simplified}
                      </div>
                      <div className="text-xl font-bold text-rose-500">
                        {currentFlashcard.pinyin}
                      </div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {currentFlashcard.meaningVi}
                      </div>
                      <div className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 inline-block">
                        {currentFlashcard.wordType}
                      </div>
                      {currentFlashcard.exampleZh && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          "{currentFlashcard.exampleZh}"
                          <div className="italic text-[11px] text-slate-400">
                            {currentFlashcard.exampleVi}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SRS Feedback Buttons (After flip) */}
              {isFlipped ? (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-200">
                  <button
                    onClick={() => handleSRSReview(currentFlashcard.id!, 1)}
                    className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-200 transition-colors"
                  >
                    Quên (1 ngày)
                  </button>
                  <button
                    onClick={() => handleSRSReview(currentFlashcard.id!, 2)}
                    className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200 transition-colors"
                  >
                    Khó (2 ngày)
                  </button>
                  <button
                    onClick={() => handleSRSReview(currentFlashcard.id!, 3)}
                    className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-200 transition-colors"
                  >
                    Tốt (4 ngày)
                  </button>
                  <button
                    onClick={() => handleSRSReview(currentFlashcard.id!, 5)}
                    className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors"
                  >
                    Dễ (7 ngày)
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  Hãy thử nhớ lại từ trước khi lật thẻ
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* LIST MODE */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredList.map((item) => {
            const srs = item.id ? srsMap[item.id] : undefined;
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-400 transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-black font-chinese text-slate-800 dark:text-slate-100">
                        {item.simplified}
                      </div>
                      <div className="text-xs font-semibold text-rose-500 mt-0.5">
                        {item.pinyin}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(item.id, item.isFavorite)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors ${
                          item.isFavorite ? 'text-amber-500' : ''
                        }`}
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => audioService.speak(item.simplified)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary-600 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
                    {item.meaningVi}
                  </div>

                  {item.exampleZh && (
                    <div className="text-xs text-slate-500 mt-1 italic">
                      {item.exampleZh}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                    HSK {item.hskLevel}
                  </span>
                  <span>{item.wordType}</span>
                  {srs && (
                    <span
                      className={`font-semibold ${
                        srs.status === 'mastered'
                          ? 'text-emerald-500'
                          : srs.status === 'review'
                          ? 'text-sky-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {srs.status === 'mastered' ? 'Đã thuộc' : `Lần lặp: ${srs.repetition}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Word Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Thêm Từ Vựng Cá Nhân Mới
            </h3>

            <form onSubmit={handleAddCustomWord} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Chữ Hán (Giản thể) *
                </label>
                <input
                  type="text"
                  required
                  value={newSimplified}
                  onChange={(e) => setNewSimplified(e.target.value)}
                  placeholder="Ví dụ: 电脑"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Pinyin
                </label>
                <input
                  type="text"
                  value={newPinyin}
                  onChange={(e) => setNewPinyin(e.target.value)}
                  placeholder="Ví dụ: diànnǎo"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Ví dụ: Máy vi tính"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Loại từ
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  >
                    <option>Danh từ</option>
                    <option>Động từ</option>
                    <option>Tính từ</option>
                    <option>Phó từ</option>
                    <option>Lượng từ</option>
                    <option>Thán từ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Cấp độ HSK
                  </label>
                  <select
                    value={newHsk}
                    onChange={(e) => setNewHsk(Number(e.target.value) as HSKLevel)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  >
                    <option value={1}>HSK 1</option>
                    <option value={2}>HSK 2</option>
                    <option value={3}>HSK 3</option>
                    <option value={4}>HSK 4</option>
                    <option value={5}>HSK 5</option>
                    <option value={6}>HSK 6</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Ví dụ câu tiếng Trung
                </label>
                <input
                  type="text"
                  value={newExampleZh}
                  onChange={(e) => setNewExampleZh(e.target.value)}
                  placeholder="Ví dụ: 我买了一台新电脑。"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow hover:bg-primary-700"
                >
                  Lưu từ vựng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
