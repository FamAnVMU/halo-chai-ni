import React, { useEffect, useState } from 'react';
import {
  Search,
  BookmarkCheck,
  AlertTriangle,
  GitCompare,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { GrammarRule, HSKLevel } from '../types';
import { db } from '../db';
import { RubyText } from '../components/common/RubyText';
import { audioService } from '../utils/audio';

export const GrammarView: React.FC = () => {
  const [grammarList, setGrammarList] = useState<GrammarRule[]>([]);
  const [selectedHsk, setSelectedHsk] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadGrammar();
  }, []);

  const loadGrammar = async () => {
    const list = await db.grammarRules.toArray();
    setGrammarList(list);
    if (list.length > 0) {
      setExpandedId(list[0].id);
    }
  };

  const filteredList = grammarList.filter((g) => {
    if (selectedHsk !== 'all' && g.hskLevel !== selectedHsk) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.formula.toLowerCase().includes(q) ||
        g.explanationVi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Ngữ Pháp Tiếng Trung HSK</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-300">
            {grammarList.length} cấu trúc
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tổng hợp công thức, phân tích ví dụ, các lỗi phổ biến và so sánh cấu trúc dễ nhầm lẫn.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm ngữ pháp (câu chữ 把, 想 vs 要, 是...)"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedHsk('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selectedHsk === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tất cả
          </button>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedHsk(lvl as HSKLevel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedHsk === lvl
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              HSK {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Grammar Cards List */}
      <div className="space-y-4">
        {filteredList.map((rule) => {
          const isExpanded = expandedId === rule.id;
          return (
            <div
              key={rule.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
            >
              {/* Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                className="p-5 cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      HSK {rule.hskLevel}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {rule.title}
                    </h3>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Công thức: {rule.formula}
                  </div>
                </div>

                <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Expanded Details Body */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                  {/* Explanation */}
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rule.explanationVi}
                  </div>

                  {/* Formula Box */}
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-primary-700 dark:text-primary-300 font-bold">
                    Công thức: {rule.formula}
                  </div>

                  {/* Examples */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ví dụ minh họa:
                    </div>
                    {rule.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div>
                            <RubyText text={ex.zh} pinyinOverride={ex.pinyin} />
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {ex.vi}
                          </div>
                        </div>

                        <button
                          onClick={() => audioService.speak(ex.zh)}
                          className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-600 hover:text-primary-600 transition-colors shadow-sm"
                          title="Nghe ví dụ"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Common Mistakes */}
                  {rule.commonMistakes && rule.commonMistakes.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Những lỗi người học thường mắc phải:</span>
                      </div>
                      <ul className="text-xs text-amber-900 dark:text-amber-200 list-disc list-inside space-y-1 pl-1">
                        {rule.commonMistakes.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Comparison Box */}
                  {rule.comparisonWith && (
                    <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                        <GitCompare className="w-4 h-4 shrink-0" />
                        <span>So sánh với: {rule.comparisonWith.otherRuleTitle}</span>
                      </div>
                      <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                        {rule.comparisonWith.differenceVi}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
