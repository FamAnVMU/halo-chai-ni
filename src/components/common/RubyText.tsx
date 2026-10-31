import React, { useState } from 'react';
import { getRubySegments, RubyChar } from '../../utils/pinyin';
import { audioService } from '../../utils/audio';
import { Volume2, BookmarkPlus, Check, X } from 'lucide-react';
import { db } from '../../db';

interface RubyTextProps {
  text: string;
  pinyinOverride?: string;
  className?: string;
  charClassName?: string;
  rtClassName?: string;
  showPinyin?: boolean;
  clickableWords?: boolean;
}

export const RubyText: React.FC<RubyTextProps> = ({
  text,
  className = '',
  charClassName = 'text-xl md:text-2xl font-chinese font-medium',
  rtClassName = '',
  showPinyin = true,
  clickableWords = true,
}) => {
  const [selectedWord, setSelectedWord] = useState<{
    char: string;
    pinyin: string;
    meaning?: string;
  } | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const segments: RubyChar[] = React.useMemo(() => {
    return getRubySegments(text);
  }, [text]);

  const handleCharClick = async (e: React.MouseEvent, seg: RubyChar) => {
    e.stopPropagation();
    if (!clickableWords || !seg.isChinese) return;

    // Speak character
    audioService.speak(seg.char);

    // Look up in vocabulary database
    const found = await db.vocabularies.where('simplified').equals(seg.char).first();
    setSelectedWord({
      char: seg.char,
      pinyin: seg.pinyin,
      meaning: found?.meaningVi || 'Từ vựng tiếng Trung',
    });
    setAddedSuccess(false);
  };

  const handleSaveToVocab = async () => {
    if (!selectedWord) return;
    try {
      await db.vocabularies.add({
        simplified: selectedWord.char,
        traditional: selectedWord.char,
        pinyin: selectedWord.pinyin,
        meaningVi: selectedWord.meaning || 'Từ mới từ cuộc trò chuyện',
        wordType: 'Từ vựng',
        hskLevel: 1,
        exampleZh: text,
        examplePinyin: '',
        exampleVi: '',
        isCustom: true,
        isFavorite: true,
        createdAt: Date.now(),
      });
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save word:', e);
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-baseline gap-x-0.5 relative ${className}`}>
      {segments.map((seg, idx) => (
        <span
          key={idx}
          onClick={(e) => handleCharClick(e, seg)}
          className={`inline-block ${
            seg.isChinese && clickableWords
              ? 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:scale-105 transition-all'
              : ''
          }`}
        >
          {showPinyin && seg.pinyin ? (
            <ruby className="leading-tight">
              <span className={charClassName}>{seg.char}</span>
              <rt className={`text-xs select-none ${rtClassName}`}>{seg.pinyin}</rt>
            </ruby>
          ) : (
            <span className={charClassName}>{seg.char}</span>
          )}
        </span>
      ))}

      {/* Word Quick Lookup Popover */}
      {selectedWord && (
        <div
          className="absolute z-50 -top-24 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 min-w-[200px] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-chinese text-primary-600 dark:text-primary-400">
                {selectedWord.char}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                [{selectedWord.pinyin}]
              </span>
            </div>
            <button
              onClick={() => setSelectedWord(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-200 font-medium">
            {selectedWord.meaning}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => audioService.speak(selectedWord.char)}
              className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
            >
              <Volume2 className="w-3.5 h-3.5" /> Nghe phát âm
            </button>

            <button
              onClick={handleSaveToVocab}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                addedSuccess
                  ? 'bg-jade-100 text-jade-700 dark:bg-jade-900/50 dark:text-jade-300'
                  : 'bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-300'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Đã lưu
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" /> Lưu từ
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
