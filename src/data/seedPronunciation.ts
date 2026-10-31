export interface PinyinSoundItem {
  id: string;
  symbol: string;
  ipa: string;
  groupName: string;
  vietnameseGuide: string;
  mouthShape: string;
  tonguePosition: string;
  isAspirated: boolean;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface FinalSoundItem {
  id: string;
  symbol: string;
  ipa: string;
  category: 'single' | 'compound' | 'nasal';
  categoryName: string;
  vietnameseGuide: string;
  mouthShape: string;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface ToneItem {
  toneNumber: number;
  name: string;
  symbol: string;
  pitch: string;
  pitchKey: '5-5' | '3-5' | '2-1-4' | '5-1' | 'light';
  pitchCurve: number[]; // Points for 5-degree pitch visual curve (e.g. [5, 5], [3, 4, 5], [2, 1, 1.5, 4], [5, 3, 1], [3, 2])
  descriptionVi: string;
  techniqueTips: string;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface ToneSandhiRule {
  id: string;
  name: string;
  ruleFormula: string;
  explanationVi: string;
  contextTips: string;
  examples: Array<{
    written: string;
    pronounced: string;
    meaningVi: string;
  }>;
}

export interface MinimalPairItem {
  id: string;
  soundA: string;
  soundB: string;
  title: string;
  phoneticDifference: string;
  mouthShapeContrast: string;
  tongueContrast: string;
  aspirationContrast: string;
  word1: { zh: string; pinyin: string; vi: string };
  word2: { zh: string; pinyin: string; vi: string };
  sentencePractice: { zh: string; pinyin: string; vi: string };
}

export interface PinyinSyllableItem {
  id: string;
  syllable: string;
  pinyinWithTone: string;
  tone: number;
  zh: string;
  vi: string;
  initial: string;
  final: string;
  phoneticBreakdown: string;
  tipsVi: string;
}

export interface WordPracticeItem {
  id: string;
  zh: string;
  pinyin: string;
  vi: string;
  level: number;
  syllablesCount: number;
  focusSound: string;
  topic: string;
  tipsVi: string;
}

export interface SentencePracticeItem {
  id: string;
  zh: string;
  pinyin: string;
  vi: string;
  level: number;
  category: 'daily' | 'question' | 'exclamation' | 'sandhi';
  rhythmHint: string;
  tipsVi: string;
}

export interface AssessmentItem {
  id: string;
  orderIndex: number;
  zh: string;
  pinyin: string;
  vi: string;
  testedElements: string[]; // e.g. ['Thanh mẫu uốn lưỡi zh/ch', 'Thanh 3 biến điệu', 'Thanh 4 dứt khoát']
  diagnosticCriteria: string;
}

// ==================== 1. 21 THANH MẪU (INITIALS) THEO 6 NHÓM CẤU ÂM ====================
export const INITIALS_DATA: PinyinSoundItem[] = [
  // Nhóm 1: Âm hai môi & môi răng (b, p, m, f)
  {
    id: 'b',
    symbol: 'b',
    ipa: '[p]',
    groupName: 'Âm Hai Môi (Không Bật Hơi)',
    vietnameseGuide: 'Gần giống âm "p" nhẹ trong tiếng Việt, hoàn toàn không bật hơi.',
    mouthShape: 'Hai môi khép chặt, nén luồng hơi lại rồi mở nhẹ ra, dây thanh không rung.',
    tonguePosition: 'Lưỡi thả lỏng tự nhiên dưới đáy miệng.',
    isAspirated: false,
    exampleZh: '爸爸',
    examplePinyin: 'bàba',
    exampleVi: 'Bố'
  },
  {
    id: 'p',
    symbol: 'p',
    ipa: '[pʰ]',
    groupName: 'Âm Hai Môi (Bật Hơi Mạnh)',
    vietnameseGuide: 'Khẩu hình giống b nhưng BẬT BÙNG luồng hơi rất mạnh từ khe môi.',
    mouthShape: 'Khép chặt hai môi, nén hơi thật căng rồi bật tung luồng gió ra.',
    tonguePosition: 'Lưỡi thả lỏng, tập trung toàn bộ lực đẩy ở hai môi.',
    isAspirated: true,
    exampleZh: '苹果',
    examplePinyin: 'píngguǒ',
    exampleVi: 'Quả táo'
  },
  {
    id: 'm',
    symbol: 'm',
    ipa: '[m]',
    groupName: 'Âm Hai Môi (Âm Mũi)',
    vietnameseGuide: 'Giống hệt chữ "m" trong tiếng Việt.',
    mouthShape: 'Hai môi khép lại, luồng hơi thoát hoàn toàn qua khoang mũi.',
    tonguePosition: 'Lưỡi thả lỏng tự nhiên, dây thanh rung rõ.',
    isAspirated: false,
    exampleZh: '妈妈',
    examplePinyin: 'māma',
    exampleVi: 'Mẹ'
  },
  {
    id: 'f',
    symbol: 'f',
    ipa: '[f]',
    groupName: 'Âm Răng Môi',
    vietnameseGuide: 'Giống chữ "ph" trong tiếng Việt.',
    mouthShape: 'Răng cửa trên chạm nhẹ vào môi dưới, đẩy luồng hơi ma sát qua khe răng môi.',
    tonguePosition: 'Lưỡi lùi nhẹ về sau.',
    isAspirated: false,
    exampleZh: '飞机',
    examplePinyin: 'fēijī',
    exampleVi: 'Máy bay'
  },

  // Nhóm 2: Âm đầu lưỡi giữa (d, t, n, l)
  {
    id: 'd',
    symbol: 'd',
    ipa: '[t]',
    groupName: 'Âm Đầu Lưỡi (Không Bật Hơi)',
    vietnameseGuide: 'Phát âm tương đương âm "t" trong tiếng Việt (KHÔNG PHẢI âm "đ").',
    mouthShape: 'Đầu lưỡi dính chặt vào chân răng trên / lợi trên rồi bật nhả dứt khoát.',
    tonguePosition: 'Đầu lưỡi chạm ngạc cứng chân răng trên, không bật luồng gió.',
    isAspirated: false,
    exampleZh: '弟弟',
    examplePinyin: 'dìdi',
    exampleVi: 'Em trai'
  },
  {
    id: 't',
    symbol: 't',
    ipa: '[tʰ]',
    groupName: 'Âm Đầu Lưỡi (Bật Hơi Mạnh)',
    vietnameseGuide: 'Giống âm "th" tiếng Việt nhưng luồng hơi đẩy dứt khoát và sắc hơn.',
    mouthShape: 'Đầu lưỡi áp chặt lợi trên, nén khí rồi giật lùi bật luồng gió mạnh.',
    tonguePosition: 'Đầu lưỡi chạm lợi trên rồi hạ nhanh xuống.',
    isAspirated: true,
    exampleZh: '天气',
    examplePinyin: 'tiānqì',
    exampleVi: 'Thời tiết'
  },
  {
    id: 'n',
    symbol: 'n',
    ipa: '[n]',
    groupName: 'Âm Đầu Lưỡi (Âm Mũi)',
    vietnameseGuide: 'Giống chữ "n" trong tiếng Việt.',
    mouthShape: 'Đầu lưỡi chặn lợi trên, hơi thoát qua mũi, dây thanh rung.',
    tonguePosition: 'Đầu lưỡi ép lên vòm lợi trước.',
    isAspirated: false,
    exampleZh: '你好',
    examplePinyin: 'nǐ hǎo',
    exampleVi: 'Xin chào'
  },
  {
    id: 'l',
    symbol: 'l',
    ipa: '[l]',
    groupName: 'Âm Đầu Lưỡi (Âm Bên)',
    vietnameseGuide: 'Giống chữ "l" trong tiếng Việt.',
    mouthShape: 'Đầu lưỡi chạm lợi trên, luồng hơi luồn qua hai mép bên của lưỡi.',
    tonguePosition: 'Đầu lưỡi nhấc cao áp vòm trên.',
    isAspirated: false,
    exampleZh: '老师',
    examplePinyin: 'lǎoshī',
    exampleVi: 'Thầy cô'
  },

  // Nhóm 3: Âm cuống lưỡi (g, k, h)
  {
    id: 'g',
    symbol: 'g',
    ipa: '[k]',
    groupName: 'Âm Cuống Lưỡi (Không Bật Hơi)',
    vietnameseGuide: 'Phát âm giống chữ "c / k" tiếng Việt (KHÔNG PHẢI âm "g").',
    mouthShape: 'Cuống lưỡi nâng cao chạm ngạc mềm, nhả nhẹ không thoát gió mạnh.',
    tonguePosition: 'Cuống lưỡi nâng chạm vòm họng mềm trên.',
    isAspirated: false,
    exampleZh: '哥哥',
    examplePinyin: 'gēge',
    exampleVi: 'Anh trai'
  },
  {
    id: 'k',
    symbol: 'k',
    ipa: '[kʰ]',
    groupName: 'Âm Cuống Lưỡi (Bật Hơi Mạnh)',
    vietnameseGuide: 'Lai giữa "kh" và "k" bật luồng hơi gió cực mạnh từ sâu cuống họng.',
    mouthShape: 'Cuống lưỡi nén chặt khí rồi bung một luồng hơi rất mạnh ra miệng.',
    tonguePosition: 'Cuống lưỡi nâng cao rồi hạ gắt.',
    isAspirated: true,
    exampleZh: '咖啡',
    examplePinyin: 'kāfēi',
    exampleVi: 'Cà phê'
  },
  {
    id: 'h',
    symbol: 'h',
    ipa: '[x]',
    groupName: 'Âm Cuống Lưỡi (Ma Sát)',
    vietnameseGuide: 'Lai giữa "h" và "kh" tiếng Việt, hơi ma sát nhẹ ở cổ họng.',
    mouthShape: 'Miệng hé tự nhiên, đẩy luồng hơi đều ma sát nhẹ qua cuống họng.',
    tonguePosition: 'Cuống lưỡi nâng nhẹ gần ngạc mềm, tạo khe hẹp cho hơi đi qua.',
    isAspirated: false,
    exampleZh: '很好',
    examplePinyin: 'hěn hǎo',
    exampleVi: 'Rất tốt'
  },

  // Nhóm 4: Âm mặt lưỡi (j, q, x) - Nhóm dễ nhầm nhất của người Việt
  {
    id: 'j',
    symbol: 'j',
    ipa: '[tɕ]',
    groupName: 'Âm Mặt Lưỡi (Không Bật Hơi)',
    vietnameseGuide: 'Giống âm "ch" tiếng Việt nhưng hai khóe miệng kéo dẹt sang hai bên, không bật hơi.',
    mouthShape: 'Mép miệng kéo dẹt sang hai bên như đang cười mỉm, mặt lưỡi áp sát ngạc cứng.',
    tonguePosition: 'Đầu lưỡi hạ xuống chạm mặt sau răng cửa dưới, mặt trước lưỡi nâng sát ngạc trên.',
    isAspirated: false,
    exampleZh: '家',
    examplePinyin: 'jiā',
    exampleVi: 'Nhà'
  },
  {
    id: 'q',
    symbol: 'q',
    ipa: '[tɕʰ]',
    groupName: 'Âm Mặt Lưỡi (Bật Hơi Sắc Bén)',
    vietnameseGuide: 'Khẩu hình giống j nhưng BẬT LUỒNG GIÓ SẮC VÀ MẠNH qua kẽ răng.',
    mouthShape: 'Khóe miệng kéo dẹt sang hai bên, nén hơi ở mặt lưỡi rồi xì mạnh dứt khoát.',
    tonguePosition: 'Đầu lưỡi chạm răng dưới, mặt lưỡi bật bung luồng hơi mạnh.',
    isAspirated: true,
    exampleZh: '去',
    examplePinyin: 'qù',
    exampleVi: 'Đi'
  },
  {
    id: 'x',
    symbol: 'x',
    ipa: '[ɕ]',
    groupName: 'Âm Mặt Lưỡi (Ma Sát)',
    vietnameseGuide: 'Giống chữ "x" nhẹ tiếng Việt nhưng miệng kéo bẹt sang hai bên, âm thoát êm.',
    mouthShape: 'Hai mép miệng kéo căng sang hai bên, răng khép hờ, hơi xát êm qua mặt lưỡi.',
    tonguePosition: 'Mặt lưỡi tiếp cận ngạc cứng, tạo khe hẹp ma sát luồng hơi đều.',
    isAspirated: false,
    exampleZh: '谢谢',
    examplePinyin: 'xièxie',
    exampleVi: 'Cảm ơn'
  },

  // Nhóm 5: Âm đầu lưỡi trước (z, c, s) - Thẳng lưỡi
  {
    id: 'z',
    symbol: 'z',
    ipa: '[ts]',
    groupName: 'Âm Đầu Lưỡi Trước (Thẳng Lưỡi, Không Bật Hơi)',
    vietnameseGuide: 'Đầu lưỡi THẲNG chạm mặt sau răng cửa trên, nhả nhẹ (lai giữa ch và gi).',
    mouthShape: 'Răng khép hờ, khóe miệng kéo nhẹ, hơi xát nhẹ không bật gió.',
    tonguePosition: 'Đầu lưỡi DUỖI THẲNG chạm chân răng cửa trên, tuyệt đối không uốn cong.',
    isAspirated: false,
    exampleZh: '再见',
    examplePinyin: 'zàijiàn',
    exampleVi: 'Tạm biệt'
  },
  {
    id: 'c',
    symbol: 'c',
    ipa: '[tsʰ]',
    groupName: 'Âm Đầu Lưỡi Trước (Thẳng Lưỡi, Bật Hơi Mạnh)',
    vietnameseGuide: 'Đầu lưỡi thẳng chạm chân răng trên, nén hơi rồi XÌ GIÓ CỰC MẠNH ra ngoài.',
    mouthShape: 'Răng khép nhẹ, đẩy luồng gió xì mạnh rít qua kẽ răng cửa trước.',
    tonguePosition: 'Đầu lưỡi thẳng chạm răng trên rồi lùi nhẹ cho gió xì mạnh ra.',
    isAspirated: true,
    exampleZh: '菜',
    examplePinyin: 'cài',
    exampleVi: 'Món ăn / Rau'
  },
  {
    id: 's',
    symbol: 's',
    ipa: '[s]',
    groupName: 'Âm Đầu Lưỡi Trước (Thẳng Lưỡi, Ma Sát)',
    vietnameseGuide: 'Giống chữ "x" nhẹ tiếng Việt, đầu lưỡi thẳng sát chân răng trên.',
    mouthShape: 'Răng trên dưới gần khép, luồng hơi ma sát êm qua kẽ răng.',
    tonguePosition: 'Đầu lưỡi duỗi thẳng hướng về kẽ răng cửa trên.',
    isAspirated: false,
    exampleZh: '三',
    examplePinyin: 'sān',
    exampleVi: 'Số ba'
  },

  // Nhóm 6: Âm uốn lưỡi (zh, ch, sh, r) - Cong lưỡi
  {
    id: 'zh',
    symbol: 'zh',
    ipa: '[tʂ]',
    groupName: 'Âm Uốn Lưỡi (Cong Lưỡi, Không Bật Hơi)',
    vietnameseGuide: 'UỐN CONG đầu lưỡi lên vòm họng ngạc cứng trên, phát âm dứt khoát, không bật gió.',
    mouthShape: 'Miệng tròn nhẹ, đầu lưỡi cong chạm ngạc cứng trên rồi nhả nhẹ.',
    tonguePosition: 'Đầu lưỡi uốn ngược lên trần họng, tiếp xúc ngạc cứng, không thoát hơi gió.',
    isAspirated: false,
    exampleZh: '中国',
    examplePinyin: 'Zhōngguó',
    exampleVi: 'Trung Quốc'
  },
  {
    id: 'ch',
    symbol: 'ch',
    ipa: '[tʂʰ]',
    groupName: 'Âm Uốn Lưỡi (Cong Lưỡi, Bật Hơi Cực Mạnh)',
    vietnameseGuide: 'Uốn cong đầu lưỡi lên ngạc trên và BẬT HƠI THẬT MẠNH từ trần họng ra ngoài.',
    mouthShape: 'Đầu lưỡi cong lên ngạc trên, nén hơi rồi bung luồng gió rít mạnh ra.',
    tonguePosition: 'Đầu lưỡi uốn cong, nhả đột ngột với áp lực hơi lớn.',
    isAspirated: true,
    exampleZh: '吃饭',
    examplePinyin: 'chīfàn',
    exampleVi: 'Ăn cơm'
  },
  {
    id: 'sh',
    symbol: 'sh',
    ipa: '[ʂ]',
    groupName: 'Âm Uốn Lưỡi (Cong Lưỡi, Ma Sát)',
    vietnameseGuide: 'Uốn cong đầu lưỡi lên ngạc cứng trên, đẩy luồng hơi ma sát đều (giống "s" nặng tiếng Việt).',
    mouthShape: 'Miệng hơi tròn nhô, luồng hơi xát đều qua khe giữa đầu lưỡi uốn cong và ngạc cứng.',
    tonguePosition: 'Đầu lưỡi cong giữ nguyên vị trí gần ngạc cứng trong suốt quá trình đẩy hơi.',
    isAspirated: false,
    exampleZh: '书',
    examplePinyin: 'shū',
    exampleVi: 'Sách'
  },
  {
    id: 'r',
    symbol: 'r',
    ipa: '[ʐ]',
    groupName: 'Âm Uốn Lưỡi (Rung Dây Thanh)',
    vietnameseGuide: 'Khẩu hình giống sh nhưng RUNG MẠNH DÂY THANH QUẢN (lai giữa r và d).',
    mouthShape: 'Đầu lưỡi uốn cong lên ngạc cứng trên, dây thanh quản rung rõ.',
    tonguePosition: 'Đầu lưỡi cong cố định, luồng hơi kèm âm rung thoát ra.',
    isAspirated: false,
    exampleZh: '人',
    examplePinyin: 'rén',
    exampleVi: 'Người'
  }
];

// ==================== 2. CÁC VẬN MẪU (FINALS) - TOÀN DIỆN 36 VẬN MẪU ====================
export const FINALS_DATA: FinalSoundItem[] = [
  // 1. Vận mẫu đơn (6 âm cơ bản)
  { id: 'a', symbol: 'a', ipa: '[a]', category: 'single', categoryName: 'Vận Mẫu Đơn', vietnameseGuide: 'Giống âm "a" tiếng Việt, mở to miệng.', mouthShape: 'Miệng mở to hết cỡ, lưỡi hạ thấp.', exampleZh: '大', examplePinyin: 'dà', exampleVi: 'To, lớn' },
  { id: 'o', symbol: 'o', ipa: '[o]', category: 'single', categoryName: 'Vận Mẫu Đơn', vietnameseGuide: 'Giống âm "ô" hoặc hơi hướng "ua".', mouthShape: 'Môi tròn, hơi nhô về phía trước.', exampleZh: '我', examplePinyin: 'wǒ', exampleVi: 'Tôi' },
  { id: 'e', symbol: 'e', ipa: '[ɤ]', category: 'single', categoryName: 'Vận Mẫu Đơn', vietnameseGuide: 'Phát âm giống âm "ơ" hoặc lai "ưa" tiếng Việt.', mouthShape: 'Miệng nửa mở, cuống lưỡi hơi nâng.', exampleZh: '喝', examplePinyin: 'hē', exampleVi: 'Uống' },
  { id: 'i', symbol: 'i', ipa: '[i]', category: 'single', categoryName: 'Vận Mẫu Đơn', vietnameseGuide: 'Giống âm "i" tiếng Việt (riêng sau z,c,s,zh,ch,sh,r đọc là "ư").', mouthShape: 'Miệng kéo bè dẹt sang hai bên.', exampleZh: '一', examplePinyin: 'yī', exampleVi: 'Số một' },
  { id: 'u', symbol: 'u', ipa: '[u]', category: 'single', categoryName: 'Vận Mẫu Đơn', vietnameseGuide: 'Giống âm "u" tiếng Việt.', mouthShape: 'Môi tròn chu về trước, lỗ miệng nhỏ.', exampleZh: '五', examplePinyin: 'wǔ', exampleVi: 'Số năm' },
  { id: 'v', symbol: 'ü', ipa: '[y]', category: 'single', categoryName: 'Vận Mẫu Đơn (Tròn Môi)', vietnameseGuide: 'Giữ môi tròn như huýt sáo rồi phát âm chữ "i" (âm uy tròn môi).', mouthShape: 'Tròn môi hết cỡ, không thay đổi khẩu hình trong suốt khi phát âm.', exampleZh: '绿', examplePinyin: 'lǜ', exampleVi: 'Màu xanh lục' },

  // 2. Vận mẫu đặc biệt (1 âm uốn lưỡi)
  { id: 'er', symbol: 'er', ipa: '[aɚ]', category: 'single', categoryName: 'Vận Mẫu Đặc Biệt', vietnameseGuide: 'Đọc âm "ơ" đồng thời uốn cong đầu lưỡi lên vòm họng.', mouthShape: 'Miệng mở tự nhiên, đầu lưỡi cong mạnh về sau.', exampleZh: '二', examplePinyin: 'èr', exampleVi: 'Số hai' },

  // 3. Vận mẫu kép (13 âm kép)
  { id: 'ai', symbol: 'ai', ipa: '[aɪ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ai" tiếng Việt.', mouthShape: 'Từ a trượt nhanh sang i.', exampleZh: '爱', examplePinyin: 'ài', exampleVi: 'Yêu' },
  { id: 'ei', symbol: 'ei', ipa: '[eɪ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ây" tiếng Việt.', mouthShape: 'Từ e khép dần về i.', exampleZh: '杯', examplePinyin: 'bēi', exampleVi: 'Cái cốc' },
  { id: 'ao', symbol: 'ao', ipa: '[aʊ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ao" tiếng Việt.', mouthShape: 'Từ a tròn môi trượt về o.', exampleZh: '好', examplePinyin: 'hǎo', exampleVi: 'Tốt' },
  { id: 'ou', symbol: 'ou', ipa: '[oʊ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "âu" tiếng Việt.', mouthShape: 'Từ ô tròn dần về u.', exampleZh: '狗', examplePinyin: 'gǒu', exampleVi: 'Con chó' },
  { id: 'ia', symbol: 'ia', ipa: '[ja]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ya" tiếng Việt.', mouthShape: 'Từ i mở nhanh sang a.', exampleZh: '家', examplePinyin: 'jiā', exampleVi: 'Gia đình, nhà' },
  { id: 'ie', symbol: 'ie', ipa: '[jɛ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ye" tiếng Việt.', mouthShape: 'Từ i chuyển nhanh sang e.', exampleZh: '谢', examplePinyin: 'xiè', exampleVi: 'Cảm ơn' },
  { id: 'ua', symbol: 'ua', ipa: '[wa]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "oa" tiếng Việt.', mouthShape: 'Từ u mở nhanh sang a.', exampleZh: '花', examplePinyin: 'huā', exampleVi: 'Bông hoa' },
  { id: 'uo', symbol: 'uo', ipa: '[wo]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "ua / uô" tiếng Việt.', mouthShape: 'Từ u chuyển sang o.', exampleZh: '多', examplePinyin: 'duō', exampleVi: 'Nhiều' },
  { id: 'uai', symbol: 'uai', ipa: '[waɪ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "oai" tiếng Việt.', mouthShape: 'Từ u trượt sang a rồi kết thúc ở i.', exampleZh: '快', examplePinyin: 'kuài', exampleVi: 'Nhanh' },
  { id: 'ui', symbol: 'ui (uei)', ipa: '[weɪ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "uây" tiếng Việt.', mouthShape: 'Từ u lướt qua e khép về i.', exampleZh: '水', examplePinyin: 'shuǐ', exampleVi: 'Nước' },
  { id: 'ue', symbol: 'üe', ipa: '[yɛ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Từ ü tròn môi chuyển sang ê.', mouthShape: 'Môi tròn ü chuyển sang e.', exampleZh: '月', examplePinyin: 'yuè', exampleVi: 'Mặt trăng / Tháng' },
  { id: 'iao', symbol: 'iao', ipa: '[jaʊ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "yeo / eo" tiếng Việt.', mouthShape: 'Từ i trượt qua a về o.', exampleZh: '小', examplePinyin: 'xiǎo', exampleVi: 'Nhỏ' },
  { id: 'iou', symbol: 'iu (iou)', ipa: '[joʊ]', category: 'compound', categoryName: 'Vận Mẫu Kép', vietnameseGuide: 'Giống vần "yêu" tiếng Việt.', mouthShape: 'Từ i chuyển sang u.', exampleZh: '六', examplePinyin: 'liù', exampleVi: 'Số sáu' },

  // 4. Vận mẫu mũi trước (-n) (8 âm)
  { id: 'an', symbol: 'an', ipa: '[an]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "an" tiếng Việt.', mouthShape: 'Đầu lưỡi chạm răng trên ở cuối âm.', exampleZh: '山', examplePinyin: 'shān', exampleVi: 'Núi' },
  { id: 'en', symbol: 'en', ipa: '[ən]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "ân" tiếng Việt.', mouthShape: 'Miệng thả lỏng, kết thúc bằng đầu lưỡi.', exampleZh: '门', examplePinyin: 'mén', exampleVi: 'Cánh cửa' },
  { id: 'in', symbol: 'in', ipa: '[in]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "in" tiếng Việt.', mouthShape: 'Mép miệng kéo dẹt, âm mũi trước.', exampleZh: '心', examplePinyin: 'xīn', exampleVi: 'Trái tim' },
  { id: 'un', symbol: 'un (uen)', ipa: '[wən]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "uân" tiếng Việt.', mouthShape: 'Từ u trượt sang ân.', exampleZh: '问', examplePinyin: 'wèn', exampleVi: 'Hỏi' },
  { id: 'vn', symbol: 'ün', ipa: '[yn]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giữ môi tròn ü kết thúc ở âm n.', mouthShape: 'Môi tròn huýt sáo, âm mũi n.', exampleZh: '云', examplePinyin: 'yún', exampleVi: 'Mây' },
  { id: 'ian', symbol: 'ian', ipa: '[jɛn]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "y-en" tiếng Việt.', mouthShape: 'Từ i lướt sang en.', exampleZh: '天', examplePinyin: 'tiān', exampleVi: 'Trời / Ngày' },
  { id: 'uan', symbol: 'uan', ipa: '[wan]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Giống vần "oan" tiếng Việt.', mouthShape: 'Từ u lướt sang an.', exampleZh: '关', examplePinyin: 'guān', exampleVi: 'Đóng lại' },
  { id: 'van', symbol: 'üan', ipa: '[yɛn]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Trước', vietnameseGuide: 'Từ ü tròn môi trượt sang en.', mouthShape: 'Môi tròn cố định rồi chạm lưỡi mũi.', exampleZh: '远', examplePinyin: 'yuǎn', exampleVi: 'Xa xôi' },

  // 5. Vận mẫu mũi sau (-ng) (8 âm)
  { id: 'ang', symbol: 'ang', ipa: '[ɑŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "ang" tiếng Việt.', mouthShape: 'Cuống lưỡi nâng lên chạm ngạc mềm.', exampleZh: '忙', examplePinyin: 'máng', exampleVi: 'Bận rộn' },
  { id: 'eng', symbol: 'eng', ipa: '[əŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "âng" tiếng Việt.', mouthShape: 'Âm phát sâu trong cuống họng.', exampleZh: '冷', examplePinyin: 'lěng', exampleVi: 'Lạnh' },
  { id: 'ing', symbol: 'ing', ipa: '[iŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "inh" tiếng Việt.', mouthShape: 'Miệng dẹt, cuống họng sâu.', exampleZh: '星', examplePinyin: 'xīng', exampleVi: 'Ngôi sao' },
  { id: 'ong', symbol: 'ong', ipa: '[ʊŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "ung" tiếng Việt.', mouthShape: 'Môi tròn nhô, âm vang trong vòm mũi.', exampleZh: '红', examplePinyin: 'hóng', exampleVi: 'Màu đỏ' },
  { id: 'iang', symbol: 'iang', ipa: '[jɑŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "y-ang" tiếng Việt.', mouthShape: 'Từ i mở sang ang cuống họng.', exampleZh: '想', examplePinyin: 'xiǎng', exampleVi: 'Nghĩ, muốn' },
  { id: 'iong', symbol: 'iong', ipa: '[jʊŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "y-ung" tiếng Việt.', mouthShape: 'Từ i khum tròn về ong.', exampleZh: '穷', examplePinyin: 'qióng', exampleVi: 'Nghèo' },
  { id: 'uang', symbol: 'uang', ipa: '[wɑŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "oang" tiếng Việt.', mouthShape: 'Từ u mở to sang ang.', exampleZh: '光', examplePinyin: 'guāng', exampleVi: 'Ánh sáng' },
  { id: 'ueng', symbol: 'ueng', ipa: '[wəŋ]', category: 'nasal', categoryName: 'Vận Mẫu Mũi Sau', vietnameseGuide: 'Giống vần "u-âng" tiếng Việt.', mouthShape: 'Từ u chuyển sang eng sâu.', exampleZh: '翁', examplePinyin: 'wēng', exampleVi: 'Ông lão' }
];

// ==================== 3. 4 THANH ĐIỆU & THANH NHẸ (TONES) ====================
export const TONES_DATA: ToneItem[] = [
  {
    toneNumber: 1,
    name: 'Thanh 1 (Âm Bình - 高平调)',
    symbol: 'ā',
    pitch: '5 - 5 (Cao & Đều)',
    pitchKey: '5-5',
    pitchCurve: [5, 5, 5, 5, 5],
    descriptionVi: 'Cao độ ở mức cao nhất (5), kéo dài ổn định như đang ngân một nốt nhạc cao, không được hạ giọng.',
    techniqueTips: 'Căng cơ thanh quản, mở khoang miệng tự nhiên, duy trì luồng hơi đều và ngân dài dứt khoát.',
    exampleZh: '妈',
    examplePinyin: 'mā',
    exampleVi: 'Mẹ (Thanh 1)'
  },
  {
    toneNumber: 2,
    name: 'Thanh 2 (Dương Bình - 中升调)',
    symbol: 'á',
    pitch: '3 - 5 (Từ Giữa Vút Cao)',
    pitchKey: '3-5',
    pitchCurve: [3, 3.5, 4, 4.5, 5],
    descriptionVi: 'Tương tự dấu SẮC tiếng Việt nhưng xuất phát từ âm vực trung bình (3) rồi vút mạnh mẽ lên đỉnh cao (5).',
    techniqueTips: 'Không bắt đầu từ giọng trầm; đẩy hơi tăng dần về cuối âm để tạo độ vút sắc nét.',
    exampleZh: '麻',
    examplePinyin: 'má',
    exampleVi: 'Cây gai (Thanh 2)'
  },
  {
    toneNumber: 3,
    name: 'Thanh 3 (Thượng Thanh - 降升调)',
    symbol: 'ǎ',
    pitch: '2 - 1 - 4 (Xuống Đáy Rồi Vòng Lên)',
    pitchKey: '2-1-4',
    pitchCurve: [2.5, 1.5, 1, 2, 4],
    descriptionVi: 'Xuất phát từ mức hơi trầm (2), hạ sâu xuống tận đáy cổ họng (1) rồi hơi vút nhẹ lên (4). Trong câu đàm thoại đời sống thường đọc "nửa thanh 3" (chỉ hạ trầm xuống đáy rồi nối từ tiếp theo).',
    techniqueTips: 'Thả lỏng cổ họng để hạ xuống cao độ thấp nhất có thể. Không vút lên quá gắt khi nói câu dài.',
    exampleZh: '马',
    examplePinyin: 'mǎ',
    exampleVi: 'Con ngựa (Thanh 3)'
  },
  {
    toneNumber: 4,
    name: 'Thanh 4 (Khứ Thanh - 全降调)',
    symbol: 'à',
    pitch: '5 - 1 (Rơi Thẳng Từ Đỉnh Xuống Đáy)',
    pitchKey: '5-1',
    pitchCurve: [5, 4, 3, 2, 1],
    descriptionVi: 'Rơi thẳng và cực nhanh từ mức cao nhất (5) xuống thấp nhất (1) với lực mạnh, dứt khoát. Tuyệt đối KHÔNG đọc nhẹ kéo dài như dấu huyền tiếng Việt.',
    techniqueTips: 'Nói như một tiếng ra lệnh dứt khoát, âm phát ra đanh gọn, ngắt hơi dứt khoát.',
    exampleZh: '骂',
    examplePinyin: 'mà',
    exampleVi: 'Mắng mỏ (Thanh 4)'
  },
  {
    toneNumber: 0,
    name: 'Thanh Nhẹ (Khinh Thanh - 轻声)',
    symbol: 'a',
    pitch: 'Ngắn, Nhẹ, Phụ Thuộc Âm Trước',
    pitchKey: 'light',
    pitchCurve: [3, 2],
    descriptionVi: 'Không có dấu thanh, phát âm vừa ngắn vừa nhẹ và hơi trầm, cao độ phụ thuộc vào thanh điệu của từ đứng trước.',
    techniqueTips: 'Chỉ lướt qua nhanh gọn, không nhấn trọng âm vào từ mang thanh nhẹ.',
    exampleZh: '妈妈',
    examplePinyin: 'māma',
    exampleVi: 'Mẹ (âm ma thứ 2 là thanh nhẹ)'
  }
];

// ==================== 4. QUY TẮC BIẾN ĐIỆU (TONE SANDHI) ====================
export const TONE_SANDHI_RULES: ToneSandhiRule[] = [
  {
    id: 'sandhi_two_third_tones',
    name: '1. Hai Thanh 3 Đi Liền Nhau',
    ruleFormula: 'Thanh 3 (ǎ) + Thanh 3 (ǎ) ➔ Thanh 2 (á) + Thanh 3 (ǎ)',
    explanationVi: 'Khi hai âm tiết cùng mang thanh 3 đứng cạnh nhau, âm tiết thứ nhất bắt buộc phải đọc thành thanh 2 (dấu sắc đi lên). Chữ viết pinyin vẫn giữ nguyên ký hiệu thanh 3.',
    contextTips: 'Quy tắc này giúp cơ miệng không bị gãy nhịp khi phải xuống đáy cổ họng hai lần liên tiếp.',
    examples: [
      { written: '你好 (nǐ hǎo)', pronounced: 'ní hǎo', meaningVi: 'Xin chào' },
      { written: '很好 (hěn hǎo)', pronounced: 'hén hǎo', meaningVi: 'Rất tốt' },
      { written: '手表 (shǒubiǎo)', pronounced: 'shóubiǎo', meaningVi: 'Đồng hồ đeo tay' },
      { written: '洗澡 (xǐzǎo)', pronounced: 'xízǎo', meaningVi: 'Tắm rửa' }
    ]
  },
  {
    id: 'sandhi_bu',
    name: '2. Biến Điệu Của Chữ 不 (bù)',
    ruleFormula: '不 + Thanh 4 (à) ➔ Bú + Thanh 4 | Không đổi trước Thanh 1, 2, 3',
    explanationVi: 'Chữ "不" gốc mang thanh 4 (bù). Khi đứng trước một từ cũng mang thanh 4, chữ "不" phải biến thành thanh 2 (bú) để tránh việc rơi giọng liên tiếp hai lần.',
    contextTips: 'Nếu từ phía sau mang thanh 1, 2 hoặc 3 thì "不" vẫn giữ nguyên là bù.',
    examples: [
      { written: '不是 (bù + shì)', pronounced: 'bú shì', meaningVi: 'Không phải' },
      { written: '不要 (bù + yào)', pronounced: 'bú yào', meaningVi: 'Đừng, không cần' },
      { written: '不错 (bù + cuò)', pronounced: 'bú cuò', meaningVi: 'Không tệ, rất tốt' },
      { written: '不去 (bù + qù)', pronounced: 'bú qù', meaningVi: 'Không đi' },
      { written: '不高 (bù + gāo)', pronounced: 'bù gāo', meaningVi: 'Không cao (gāo là thanh 1 - giữ nguyên bù)' }
    ]
  },
  {
    id: 'sandhi_yi',
    name: '3. Biến Điệu Của Chữ 一 (yī)',
    ruleFormula: '一 + Thanh 4 ➔ Yí | 一 + Thanh 1, 2, 3 ➔ Yì | Đếm số: Yī',
    explanationVi: 'Đứng trước từ mang thanh 4 thì đọc thành Yí (thanh 2). Đứng trước từ mang thanh 1, 2, 3 thì đọc thành Yì (thanh 4). Khi đếm số độc lập (1, 2, 3) hoặc chỉ số thứ tự thì đọc Yī.',
    contextTips: 'Đây là quy tắc biến điệu phổ biến nhất trong giao tiếp đời sống hàng ngày.',
    examples: [
      { written: '一个 (yī + gè)', pronounced: 'yí gè', meaningVi: 'Một cái (gè là thanh 4 ➔ yí)' },
      { written: '一天 (yī + tiān)', pronounced: 'yì tiān', meaningVi: 'Một ngày (tiān là thanh 1 ➔ yì)' },
      { written: '一起 (yī + qǐ)', pronounced: 'yì qǐ', meaningVi: 'Cùng nhau (qǐ là thanh 3 ➔ yì)' },
      { written: '一条 (yī + tiáo)', pronounced: 'yì tiáo', meaningVi: 'Một sợi / Một con (tiáo là thanh 2 ➔ yì)' }
    ]
  },
  {
    id: 'sandhi_neutral_context',
    name: '4. Thanh Nhẹ Trong Ngữ Cảnh (轻声)',
    ruleFormula: 'Từ lặp từ / Trợ từ 的, 了, 吗, 呢 / Hậu tố 们, 子',
    explanationVi: 'Các từ thứ hai trong từ láy gia đình (bàba, māma), trợ từ ngữ khí (le, ma, ne), và hậu tố (wǒmen, zhuōzi) đều phát âm rất ngắn, nhẹ, không kéo dài.',
    contextTips: 'Hạ nhẹ âm lượng và thời lượng của âm tiết mang thanh nhẹ xuống chỉ còn 1/2 so với âm tiết chính.',
    examples: [
      { written: '爸爸 (bàba)', pronounced: 'bà-ba', meaningVi: 'Bố' },
      { written: '朋友 (péngyou)', pronounced: 'péng-you', meaningVi: 'Bạn bè' },
      { written: '吃了 (chī le)', pronounced: 'chī-le', meaningVi: 'Đã ăn' },
      { written: '好的 (hǎo de)', pronounced: 'hǎo-de', meaningVi: 'Được rồi' }
    ]
  }
];

// ==================== 5. 10 CẶP ÂM DỄ NHẦM CỦA NGƯỜI VIỆT (MINIMAL PAIRS) ====================
export const MINIMAL_PAIRS_DATA: MinimalPairItem[] = [
  {
    id: 'pair_zh_z',
    soundA: 'zh (Uốn lưỡi)',
    soundB: 'z (Thẳng lưỡi)',
    title: 'Phân biệt zh (Uốn lưỡi) vs z (Thẳng lưỡi)',
    phoneticDifference: 'zh đòi hỏi đầu lưỡi cong chạm ngạc cứng; z đòi hỏi đầu lưỡi duỗi thẳng ép sát chân răng cửa trên.',
    mouthShapeContrast: 'zh miệng hơi tròn mở; z miệng kéo bẹt nhẹ sang hai bên.',
    tongueContrast: 'zh: Lưỡi cong lên trần họng; z: Lưỡi thẳng đuột chạm răng.',
    aspirationContrast: 'Cả hai âm đều KHÔNG bật hơi.',
    word1: { zh: '知道', pinyin: 'zhīdào', vi: 'Biết (uốn lưỡi zh)' },
    word2: { zh: '滋味', pinyin: 'zīwèi', vi: 'Hương vị (thẳng lưỡi z)' },
    sentencePractice: { zh: '我知道这个滋味很好。', pinyin: 'Wǒ zhīdào zhège zīwèi hěn hǎo.', vi: 'Tôi biết hương vị này rất ngon.' }
  },
  {
    id: 'pair_ch_c',
    soundA: 'ch (Uốn lưỡi bật hơi)',
    soundB: 'c (Thẳng lưỡi bật hơi)',
    title: 'Phân biệt ch (Uốn lưỡi bật hơi) vs c (Thẳng lưỡi bật hơi)',
    phoneticDifference: 'Cả hai đều bật hơi cực mạnh, nhưng ch phát ra từ trần ngạc cứng uốn lưỡi, còn c phát ra từ kẽ răng trước thẳng lưỡi.',
    mouthShapeContrast: 'ch miệng hơi nhô; c miệng kéo rộng sang hai bên rít gió.',
    tongueContrast: 'ch uốn cong lên trần họng; c thẳng chạm chân răng trên.',
    aspirationContrast: 'Cả hai đều BẬT HƠI CỰC MẠNH.',
    word1: { zh: '吃饭', pinyin: 'chīfàn', vi: 'Ăn cơm (uốn lưỡi ch)' },
    word2: { zh: '刺耳', pinyin: 'cì\'ěr', vi: 'Chói tai (thẳng lưỡi c)' },
    sentencePractice: { zh: '他一边吃饭一边听刺耳的声音。', pinyin: 'Tā yìbiān chīfàn yìbiān tīng cì\'ěr de shēngyīn.', vi: 'Anh ấy vừa ăn cơm vừa nghe âm thanh chói tai.' }
  },
  {
    id: 'pair_sh_s',
    soundA: 'sh (Uốn lưỡi ma sát)',
    soundB: 's (Thẳng lưỡi ma sát)',
    title: 'Phân biệt sh (Uốn lưỡi) vs s (Thẳng lưỡi)',
    phoneticDifference: 'sh tương đương s nặng tiếng Việt uốn cong lưỡi; s tương đương x nhẹ thẳng lưỡi qua kẽ răng.',
    mouthShapeContrast: 'sh hơi nhô tròn; s khóe miệng kéo ngang.',
    tongueContrast: 'sh cong lưỡi lên vòm họng; s thẳng lưỡi hướng chân răng dưới.',
    aspirationContrast: 'Cả hai là âm ma sát đều, không nén bật hơi.',
    word1: { zh: '十', pinyin: 'shí', vi: 'Số 10 (uốn lưỡi)' },
    word2: { zh: '四', pinyin: 'sì', vi: 'Số 4 (thẳng lưỡi)' },
    sentencePractice: { zh: '十四是十四，四十是四十。', pinyin: 'Shísì shì shísì, sìshí shì sìshí.', vi: 'Mười bốn là mười bốn, bốn mươi là bốn mươi.' }
  },
  {
    id: 'pair_j_zh',
    soundA: 'j (Mặt lưỡi bè)',
    soundB: 'zh (Uốn lưỡi sâu)',
    title: 'Phân biệt j (Mặt lưỡi bè) vs zh (Uốn lưỡi sâu)',
    phoneticDifference: 'j có đầu lưỡi hạ thấp chạm răng dưới, mặt lưỡi nâng sát ngạc trên; zh có đầu lưỡi uốn ngược lên ngạc cứng.',
    mouthShapeContrast: 'j mép miệng kéo căng sang hai bên như cười; zh miệng hơi tròn tự nhiên.',
    tongueContrast: 'j mặt lưỡi ép bẹt; zh đầu lưỡi cong lên ngạc.',
    aspirationContrast: 'Cả hai không bật hơi.',
    word1: { zh: '家', pinyin: 'jiā', vi: 'Nhà (mặt lưỡi j)' },
    word2: { zh: '抓', pinyin: 'zhuā', vi: 'Bắt lấy (uốn lưỡi zh)' },
    sentencePractice: { zh: '他在家里抓了一只小猫。', pinyin: 'Tā zài jiā lǐ zhuā le yì zhī xiǎomāo.', vi: 'Anh ấy bắt được một con mèo nhỏ ở nhà.' }
  },
  {
    id: 'pair_q_ch',
    soundA: 'q (Mặt lưỡi bật hơi)',
    soundB: 'ch (Uốn lưỡi bật hơi)',
    title: 'Phân biệt q (Mặt lưỡi) vs ch (Uốn lưỡi)',
    phoneticDifference: 'Cả hai cùng bật hơi rất mạnh, nhưng q miệng bè dẹt âm sắc lạnh; ch âm trầm ấm uốn lưỡi từ vòm họng.',
    mouthShapeContrast: 'q khóe miệng dẹt sang hai bên; ch miệng tròn nhô về phía trước.',
    tongueContrast: 'q đầu lưỡi cắm răng dưới, mặt lưỡi bật hơi; ch đầu lưỡi cong trần họng bật hơi.',
    aspirationContrast: 'Cả hai BẬT HƠI CỰC MẠNH.',
    word1: { zh: '去', pinyin: 'qù', vi: 'Đi (mặt lưỡi q)' },
    word2: { zh: '出', pinyin: 'chū', vi: 'Ra ngoài (uốn lưỡi ch)' },
    sentencePractice: { zh: '你想出去走走吗？', pinyin: 'Nǐ xiǎng chūqù zǒuzou ma?', vi: 'Bạn có muốn đi ra ngoài dạo chơi không?' }
  },
  {
    id: 'pair_x_sh',
    soundA: 'x (Mặt lưỡi êm)',
    soundB: 'sh (Uốn lưỡi đậm)',
    title: 'Phân biệt x (Mặt lưỡi) vs sh (Uốn lưỡi)',
    phoneticDifference: 'x âm gió thoát êm qua mặt lưỡi dẹt; sh âm gió dày uốn cong từ vòm họng.',
    mouthShapeContrast: 'x miệng cười bè ngang; sh môi tròn nhẹ.',
    tongueContrast: 'x mặt lưỡi phẳng; sh đầu lưỡi cong uốn.',
    aspirationContrast: 'Âm ma sát đều.',
    word1: { zh: '西', pinyin: 'xī', vi: 'Phía tây (x)' },
    word2: { zh: '诗', pinyin: 'shī', vi: 'Thơ ca (sh)' },
    sentencePractice: { zh: '他在西方写了一首诗。', pinyin: 'Tā zài xīfāng xiě le yì shǒu shī.', vi: 'Anh ấy đã viết một bài thơ ở phương Tây.' }
  },
  {
    id: 'pair_u_v',
    soundA: 'u (Chu môi)',
    soundB: 'ü (Tròn môi huýt sáo)',
    title: 'Phân biệt u (Chu môi) vs ü (Tròn môi huýt sáo)',
    phoneticDifference: 'u môi tròn chu về trước như tiếng Việt; ü giữ môi tròn như huýt sáo nhưng phát âm i, không thay đổi môi.',
    mouthShapeContrast: 'u môi tròn nhỏ; ü môi khum tròn cố định tuyệt đối.',
    tongueContrast: 'u cuống lưỡi nâng; ü đầu lưỡi chạm mặt sau răng cửa dưới.',
    aspirationContrast: 'Nguyên âm vang đều.',
    word1: { zh: '路', pinyin: 'lù', vi: 'Con đường (u)' },
    word2: { zh: '绿', pinyin: 'lǜ', vi: 'Màu xanh lục (ü)' },
    sentencePractice: { zh: '这条路上有很多绿树。', pinyin: 'Zhè tiáo lù shang yǒu hěn duō lǜ shù.', vi: 'Trên con đường này có rất nhiều cây xanh.' }
  },
  {
    id: 'pair_an_ang',
    soundA: 'an (Mũi trước)',
    soundB: 'ang (Mũi sau)',
    title: 'Phân biệt an (Mũi trước) vs ang (Mũi sau)',
    phoneticDifference: 'an kết thúc bằng đầu lưỡi chạm chân răng trên; ang kết thúc bằng cuống lưỡi nâng chạm ngạc mềm sâu trong họng.',
    mouthShapeContrast: 'an miệng khép dần; ang miệng mở rộng hơn.',
    tongueContrast: 'an đầu lưỡi chặn răng trên; ang cuống lưỡi chặn ngạc mềm.',
    aspirationContrast: 'Âm mũi ngân.',
    word1: { zh: '看', pinyin: 'kàn', vi: 'Xem, nhìn (an)' },
    word2: { zh: '康', pinyin: 'kāng', vi: 'Khỏe mạnh (ang)' },
    sentencePractice: { zh: '多看健康的书籍。', pinyin: 'Duō kàn jiànkāng de shūjí.', vi: 'Xem nhiều sách tốt cho sức khỏe.' }
  },
  {
    id: 'pair_en_eng',
    soundA: 'en (Mũi trước)',
    soundB: 'eng (Mũi sau)',
    title: 'Phân biệt en (Mũi trước) vs eng (Mũi sau)',
    phoneticDifference: 'en giống vần "ân" tiếng Việt; eng giống vần "âng" sâu trong cuống họng.',
    mouthShapeContrast: 'en miệng thả lỏng tự nhiên; eng vòm miệng nâng cao.',
    tongueContrast: 'en kết thúc đầu lưỡi; eng kết thúc cuống lưỡi.',
    aspirationContrast: 'Âm mũi sâu.',
    word1: { zh: '门', pinyin: 'mén', vi: 'Cánh cửa (en)' },
    word2: { zh: '萌', pinyin: 'méng', vi: 'Đáng yêu / Nảy mầm (eng)' },
    sentencePractice: { zh: '门口有一只萌萌的小狗。', pinyin: 'Mén kǒu yǒu yì zhī méngméng de xiǎogǒu.', vi: 'Trước cửa có một chú cún con rất đáng yêu.' }
  },
  {
    id: 'pair_in_ing',
    soundA: 'in (Mũi trước)',
    soundB: 'ing (Mũi sau)',
    title: 'Phân biệt in (Mũi trước) vs ing (Mũi sau)',
    phoneticDifference: 'in giống vần "in" tiếng Việt âm thoát ở đầu lưỡi; ing giống vần "inh" ngân vang sâu ở cuống họng.',
    mouthShapeContrast: 'Cả hai mép miệng đều kéo ngang, nhưng ing miệng mở rộng hơn một chút.',
    tongueContrast: 'in đầu lưỡi chặn ngạc cứng trước; ing cuống lưỡi ép ngạc mềm sau.',
    aspirationContrast: 'Âm ngân mũi.',
    word1: { zh: '心', pinyin: 'xīn', vi: 'Trái tim (in)' },
    word2: { zh: '星', pinyin: 'xīng', vi: 'Ngôi sao (ing)' },
    sentencePractice: { zh: '天上的星星印在我心里。', pinyin: 'Tiān shang de xīngxing yìn zài wǒ xīn lǐ.', vi: 'Những vì sao trên trời in sâu vào tim tôi.' }
  }
];

// ==================== 5.5. LUYỆN GHÉP ÂM TIẾT PINYIN CƠ BẢN (SYLLABLES) ====================
export const PINYIN_SYLLABLES_DATA: PinyinSyllableItem[] = [
  {
    id: 'syl_ma1',
    syllable: 'ma',
    pinyinWithTone: 'mā',
    tone: 1,
    zh: '妈',
    vi: 'Mẹ (m + a, thanh 1 cao bằng)',
    initial: 'm',
    final: 'a',
    phoneticBreakdown: 'm [m] + a [a] + Thanh 1 (55)',
    tipsVi: 'Hai môi khép mở tự nhiên, giữ giọng cao và ngân đều 5-5.'
  },
  {
    id: 'syl_ma2',
    syllable: 'ma',
    pinyinWithTone: 'má',
    tone: 2,
    zh: '麻',
    vi: 'Sợi đay / tê rần (m + a, thanh 2 vút lên)',
    initial: 'm',
    final: 'a',
    phoneticBreakdown: 'm [m] + a [a] + Thanh 2 (35)',
    tipsVi: 'Vút giọng từ mức trung bình 3 lên mức cao 5 như dấu hỏi trong tiếng Việt.'
  },
  {
    id: 'syl_ma3',
    syllable: 'ma',
    pinyinWithTone: 'mǎ',
    tone: 3,
    zh: '马',
    vi: 'Con ngựa (m + a, thanh 3 lượn sóng)',
    initial: 'm',
    final: 'a',
    phoneticBreakdown: 'm [m] + a [a] + Thanh 3 (214)',
    tipsVi: 'Hạ sâu giọng xuống đáy cổ họng rồi mới vòng nhẹ lên cao.'
  },
  {
    id: 'syl_ma4',
    syllable: 'ma',
    pinyinWithTone: 'mà',
    tone: 4,
    zh: '骂',
    vi: 'Mắng chửi (m + a, thanh 4 dứt khoát)',
    initial: 'm',
    final: 'a',
    phoneticBreakdown: 'm [m] + a [a] + Thanh 4 (51)',
    tipsVi: 'Rơi thẳng giọng từ 5 xuống 1 với lực dứt khoát, dứt điểm nhanh gọn.'
  },
  {
    id: 'syl_ba1',
    syllable: 'ba',
    pinyinWithTone: 'bā',
    tone: 1,
    zh: '八',
    vi: 'Số tám (b + a, không bật hơi)',
    initial: 'b',
    final: 'a',
    phoneticBreakdown: 'b [p] + a [a] + Thanh 1 (55)',
    tipsVi: 'Hai môi mím nhẹ mở ra, không để hơi xì ra như chữ p.'
  },
  {
    id: 'syl_pa2',
    syllable: 'pa',
    pinyinWithTone: 'pá',
    tone: 2,
    zh: '爬',
    vi: 'Bò, trèo leo (p + a, bật hơi mạnh)',
    initial: 'p',
    final: 'a',
    phoneticBreakdown: 'p [pʰ] + a [a] + Thanh 2 (35)',
    tipsVi: 'Nén hơi thật căng giữa hai môi rồi bật bùng luồng gió ra.'
  },
  {
    id: 'syl_zhang1',
    syllable: 'zhang',
    pinyinWithTone: 'zhāng',
    tone: 1,
    zh: '张',
    vi: 'Họ Trương / giương cung (zh + ang, uốn lưỡi)',
    initial: 'zh',
    final: 'ang',
    phoneticBreakdown: 'zh [tʂ] + ang [aŋ] + Thanh 1 (55)',
    tipsVi: 'Đầu lưỡi uốn chạm vòm họng ngạc cứng, không bật hơi.'
  },
  {
    id: 'syl_chang2',
    syllable: 'chang',
    pinyinWithTone: 'cháng',
    tone: 2,
    zh: '长',
    vi: 'Dài (ch + ang, uốn lưỡi bật hơi)',
    initial: 'ch',
    final: 'ang',
    phoneticBreakdown: 'ch [tʂʰ] + ang [aŋ] + Thanh 2 (35)',
    tipsVi: 'Uốn lưỡi như zh nhưng bắn luồng hơi cực mạnh qua khe lưỡi.'
  },
  {
    id: 'syl_qu4',
    syllable: 'qu',
    pinyinWithTone: 'qù',
    tone: 4,
    zh: '去',
    vi: 'Đi đến (q + ü, mặt lưỡi bật hơi, tròn môi)',
    initial: 'q',
    final: 'ü',
    phoneticBreakdown: 'q [tɕʰ] + ü [y] + Thanh 4 (51)',
    tipsVi: 'q gặp u thực chất là nguyên âm ü, môi giữ tròn hình huýt sáo.'
  },
  {
    id: 'syl_re4',
    syllable: 're',
    pinyinWithTone: 'rè',
    tone: 4,
    zh: '热',
    vi: 'Nóng bức (r + e, rung nhẹ)',
    initial: 'r',
    final: 'e',
    phoneticBreakdown: 'r [ʐ] + e [ɤ] + Thanh 4 (51)',
    tipsVi: 'Đầu lưỡi cong lên gần ngạc cứng, dây thanh rung rõ.'
  }
];

// ==================== 6. BÀI LUYỆN TỪ VỰNG TRỌNG TÂM (WORD DRILLS) ====================
export const WORD_PRACTICE_DATA: WordPracticeItem[] = [
  { id: 'w1', zh: '中国', pinyin: 'Zhōngguó', vi: 'Trung Quốc', level: 1, syllablesCount: 2, focusSound: 'zh, ong, guo', topic: 'Quốc gia', tipsVi: 'Uốn cong lưỡi ở âm zh, không đọc thành gi-ông.' },
  { id: 'w2', zh: '谢谢', pinyin: 'xièxie', vi: 'Cảm ơn', level: 1, syllablesCount: 2, focusSound: 'x, ie, thanh nhẹ', topic: 'Chào hỏi', tipsVi: 'Mép miệng kéo dẹt sang hai bên, âm sau đọc thật nhẹ.' },
  { id: 'w3', zh: '再见', pinyin: 'zàijiàn', vi: 'Tạm biệt', level: 1, syllablesCount: 2, focusSound: 'z, j, thanh 4', topic: 'Chào hỏi', tipsVi: 'Đầu lưỡi z thẳng, j bẹt miệng, cả hai âm đều rơi dứt khoát thanh 4.' },
  { id: 'w4', zh: '吃饭', pinyin: 'chīfàn', vi: 'Ăn cơm', level: 1, syllablesCount: 2, focusSound: 'ch, f', topic: 'Ăn uống', tipsVi: 'ch uốn lưỡi và bật hơi rất mạnh, f chạm răng môi.' },
  { id: 'w5', zh: '多少钱', pinyin: 'duōshao qián', vi: 'Bao nhiêu tiền', level: 1, syllablesCount: 3, focusSound: 'sh, q, biến điệu', topic: 'Mua sắm', tipsVi: 'shao đọc nhẹ lướt, qián bật luồng gió sắc mặt lưỡi.' },
  { id: 'w6', zh: '明天见', pinyin: 'míngtiān jiàn', vi: 'Ngày mai gặp', level: 1, syllablesCount: 3, focusSound: 'ing, t, j', topic: 'Thời gian', tipsVi: 'tian bật hơi đầu lưỡi, jian thanh 4 rơi nhanh.' },
  { id: 'w7', zh: '非常高兴', pinyin: 'fēicháng gāoxìng', vi: 'Rất vui vẻ', level: 2, syllablesCount: 4, focusSound: 'ch, g, x', topic: 'Cảm xúc', tipsVi: 'chang thanh 2 vút cao uốn lưỡi, xing thanh 4 dứt khoát.' },
  { id: 'w8', zh: '准备', pinyin: 'zhǔnbèi', vi: 'Chuẩn bị', level: 2, syllablesCount: 2, focusSound: 'zh, un, thanh 3', topic: 'Hoạt động', tipsVi: 'zhun hạ sâu đáy cổ họng rồi rơi dứt khoát sang bei.' }
];

// ==================== 7. BÀI LUYỆN CÂU HOÀN CHỈNH (SENTENCE DRILLS) ====================
export const SENTENCE_PRACTICE_DATA: SentencePracticeItem[] = [
  {
    id: 's1',
    zh: '你好，很高兴认识你。',
    pinyin: 'Nǐ hǎo, hěn gāoxìng rènshí nǐ.',
    vi: 'Xin chào, rất vui được làm quen với bạn.',
    level: 1,
    category: 'daily',
    rhythmHint: 'Nǐ hǎo (ngắt nhẹ) | hěn gāoxìng | rènshí nǐ.',
    tipsVi: 'Lưu ý biến điệu Nǐ hǎo ➔ Ní hǎo (hai thanh 3), và Hěn gāoxìng đọc nửa thanh 3 hạ trầm.'
  },
  {
    id: 's2',
    zh: '请问，洗手间在哪里？',
    pinyin: 'Qǐngwèn, xǐshǒujiān zài nǎlǐ?',
    vi: 'Xin hỏi, nhà vệ sinh ở đâu?',
    level: 1,
    category: 'question',
    rhythmHint: 'Qǐngwèn (ngắt nhẹ) | xǐshǒujiān | zài nǎlǐ?',
    tipsVi: 'Qǐng bật hơi sắc nét, xǐshǒu ➔ xíshǒu biến điệu hai thanh 3, nǎlǐ lên giọng nhẹ cuối câu hỏi.'
  },
  {
    id: 's3',
    zh: '这里的中国菜非常好吃！',
    pinyin: 'Zhèlǐ de Zhōngguó cài fēicháng hǎochī!',
    vi: 'Món ăn Trung Quốc ở đây cực kỳ ngon!',
    level: 2,
    category: 'exclamation',
    rhythmHint: 'Zhèlǐ de Zhōngguó cài | fēicháng hǎochī!',
    tipsVi: 'Cài thanh 4 thẳng lưỡi bật hơi, chī thanh 1 ngân cao uốn lưỡi.'
  },
  {
    id: 's4',
    zh: '我不知道他在哪儿工作。',
    pinyin: 'Wǒ bù zhīdào tā zài nǎr gōngzuò.',
    vi: 'Tôi không biết anh ấy làm việc ở đâu.',
    level: 2,
    category: 'daily',
    rhythmHint: 'Wǒ bù zhīdào | tā zài nǎr gōngzuò.',
    tipsVi: 'zhīdào uốn lưỡi, gōngzuò thanh 1 nối tiếp thanh 4 rơi dứt khoát.'
  }
];

// ==================== 8. BỘ ĐỀ KIỂM TRA CHẨN ĐOÁN PHÁT ÂM (ASSESSMENT QUIZ) ====================
export const ASSESSMENT_QUESTIONS_DATA: AssessmentItem[] = [
  {
    id: 'eval_q1',
    orderIndex: 1,
    zh: '你好，我是学生。',
    pinyin: 'Nǐ hǎo, wǒ shì xuésheng.',
    vi: 'Xin chào, tôi là học sinh.',
    testedElements: ['Biến điệu thanh 3 (Ní hǎo)', 'Âm uốn lưỡi thanh 4 (shì)', 'Vận mẫu tròn môi üe (xué)', 'Thanh nhẹ (sheng)'],
    diagnosticCriteria: 'Đo lường khả năng biến điệu hai thanh 3 tự nhiên và phát âm chuẩn thanh 4 dứt khoát.'
  },
  {
    id: 'eval_q2',
    orderIndex: 2,
    zh: '我想去吃中国菜。',
    pinyin: 'Wǒ xiǎng qù chī Zhōngguó cài.',
    vi: 'Tôi muốn đi ăn món ăn Trung Quốc.',
    testedElements: ['Âm mặt lưỡi bật hơi (qù)', 'Âm uốn lưỡi bật hơi (chī)', 'Âm uốn lưỡi không bật hơi (Zhōng)', 'Âm thẳng lưỡi bật hơi (cài)'],
    diagnosticCriteria: 'Kiểm tra phân biệt 3 cấp độ bật hơi: q (mặt lưỡi), ch (uốn lưỡi), c (răng trước).'
  },
  {
    id: 'eval_q3',
    orderIndex: 3,
    zh: '请问一斤苹果多少钱？',
    pinyin: 'Qǐngwèn yì jīn píngguǒ duōshao qián?',
    vi: 'Xin hỏi một cân táo bao nhiêu tiền?',
    testedElements: ['Biến điệu chữ 一 (yì jīn)', 'Âm hai môi bật hơi (píng)', 'Thanh nhẹ (shao)', 'Ngữ điệu câu hỏi'],
    diagnosticCriteria: 'Kiểm tra biến điệu của chữ 一 trước thanh 1 và nhịp điệu mặc cả mua sắm.'
  },
  {
    id: 'eval_q4',
    orderIndex: 4,
    zh: '这不是我的手表。',
    pinyin: 'Zhè bú shì wǒ de shǒubiǎo.',
    vi: 'Đây không phải là đồng hồ đeo tay của tôi.',
    testedElements: ['Biến điệu chữ 不 trước thanh 4 (bú shì)', 'Trợ từ thanh nhẹ (de)', 'Biến điệu thanh 3 (shóubiǎo)'],
    diagnosticCriteria: 'Đánh giá khả năng biến điệu linh hoạt của 不 thành bú khi đi liền thanh 4.'
  },
  {
    id: 'eval_q5',
    orderIndex: 5,
    zh: '明天下午我们一起去图书馆。',
    pinyin: 'Míngtiān xiàwǔ wǒmen yìqǐ qù túshūguǎn.',
    vi: 'Chiều mai chúng ta cùng nhau đi thư viện nhé.',
    testedElements: ['Câu phức nhiều âm tiết', 'Uốn lưỡi shū', 'Tròn môi tushuguan', 'Nhịp điệu câu dài'],
    diagnosticCriteria: 'Đánh giá độ trôi chảy, khả năng giữ hơi và nhịp điệu tự nhiên của câu dài.'
  }
];
