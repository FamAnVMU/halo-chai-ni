import React, { useMemo } from 'react';
import { tokenizeChinese } from '../../data/seedDictionary';

interface ClickableChineseTextProps {
  text: string;
  onWordClick: (word: string) => void;
  className?: string;
  wordClassName?: string;
  highlightWords?: string[];
}

export const ClickableChineseText: React.FC<ClickableChineseTextProps> = ({
  text,
  onWordClick,
  className = '',
  wordClassName = '',
  highlightWords = []
}) => {
  const tokens = useMemo(() => {
    return tokenizeChinese(text);
  }, [text]);

  const highlightSet = useMemo(() => new Set(highlightWords), [highlightWords]);

  return (
    <span className={`inline font-chinese leading-relaxed ${className}`}>
      {tokens.map((item, index) => {
        const isPunctuation = /[.,?!，。？！、\s\d:;"'“”‘’（）()]/.test(item.token);

        if (isPunctuation) {
          return <span key={index}>{item.token}</span>;
        }

        const isHighlighted = highlightSet.has(item.token);

        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(item.token);
            }}
            className={`cursor-pointer transition-all rounded px-0.5 py-0.2 mx-0.2 select-none hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:text-primary-700 dark:hover:text-primary-300 active:scale-95 ${
              isHighlighted
                ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold border-b-2 border-amber-500'
                : 'hover:underline decoration-primary-400 decoration-1 underline-offset-2'
            } ${wordClassName}`}
            title={`Tra từ điển: ${item.token}`}
          >
            {item.token}
          </span>
        );
      })}
    </span>
  );
};
