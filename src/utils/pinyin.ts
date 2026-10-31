import { pinyin } from 'pinyin-pro';

export interface RubyChar {
  char: string;
  pinyin: string;
  isChinese: boolean;
}

// Convert Chinese text into an array of characters with their individual Pinyin for ruby display
export function getRubySegments(text: string): RubyChar[] {
  if (!text) return [];

  // pinyin-pro returns array of pinyin corresponding to each character
  const pinyinList = pinyin(text, { type: 'array', toneType: 'symbol' });
  const chars = Array.from(text);

  const results: RubyChar[] = [];
  const chineseRegex = /[\u4e00-\u9fa5]/;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const isZh = chineseRegex.test(char);
    results.push({
      char,
      pinyin: isZh ? (pinyinList[i] || '') : '',
      isChinese: isZh,
    });
  }

  return results;
}

// Get standard sentence Pinyin
export function getSentencePinyin(text: string): string {
  if (!text) return '';
  return pinyin(text, { toneType: 'symbol' });
}
