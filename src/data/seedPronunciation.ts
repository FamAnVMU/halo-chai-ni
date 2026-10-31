export interface PinyinSoundItem {
  id: string;
  symbol: string;
  ipa: string;
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
  descriptionVi: string;
  exampleZh: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface ToneSandhiRule {
  id: string;
  name: string;
  ruleFormula: string;
  explanationVi: string;
  examples: Array<{
    written: string;
    pronounced: string;
    meaningVi: string;
  }>;
}

export interface VietnameseMistakeGuide {
  id: string;
  problemTitle: string;
  targetSounds: string;
  mistakeExplanation: string;
  howToFix: string;
  practicePairs: Array<{
    word1: { zh: string; pinyin: string; vi: string };
    word2: { zh: string; pinyin: string; vi: string };
  }>;
}

// 21 Thanh Mẫu (Initials)
export const INITIALS_DATA: PinyinSoundItem[] = [
  // Âm hai môi
  { id: 'b', symbol: 'b', ipa: '[p]', vietnameseGuide: 'Gần giống âm "p" nhẹ tiếng Việt, không bật hơi.', mouthShape: 'Hai môi khép chặt rồi mở nhẹ, dây thanh không rung.', exampleZh: '爸爸', examplePinyin: 'bàba', exampleVi: 'Bố' },
  { id: 'p', symbol: 'p', ipa: '[pʰ]', vietnameseGuide: 'Bật hơi rất mạnh, giống "p" bật luồng gió mạnh.', mouthShape: 'Khép chặt hai môi rồi bật bung luồng hơi mạnh ra.', exampleZh: '苹果', examplePinyin: 'píngguǒ', exampleVi: 'Quả táo' },
  { id: 'm', symbol: 'm', ipa: '[m]', vietnameseGuide: 'Giống chữ "m" trong tiếng Việt.', mouthShape: 'Hai môi khép lại, luồng hơi thoát ra qua đường mũi.', exampleZh: '妈妈', examplePinyin: 'māma', exampleVi: 'Mẹ' },
  { id: 'f', symbol: 'f', ipa: '[f]', vietnameseGuide: 'Giống chữ "ph" trong tiếng Việt.', mouthShape: 'Răng trên chạm nhẹ vào môi dưới, đẩy hơi qua khe răng.', exampleZh: '飞机', examplePinyin: 'fēijī', exampleVi: 'Máy bay' },

  // Âm đầu lưỡi
  { id: 'd', symbol: 'd', ipa: '[t]', vietnameseGuide: 'Phát âm giống âm "t" trong tiếng Việt (không phải "đ").', mouthShape: 'Đầu lưỡi chạm vào chân răng trên rồi nhả nhanh.', exampleZh: '弟弟', examplePinyin: 'dìdi', exampleVi: 'Em trai' },
  { id: 't', symbol: 't', ipa: '[tʰ]', vietnameseGuide: 'Giống âm "th" tiếng Việt nhưng bật hơi dứt khoát.', mouthShape: 'Đầu lưỡi chạm lợi trên, nén hơi rồi bật mạnh ra ngoài.', exampleZh: '天气', examplePinyin: 'tiānqì', exampleVi: 'Thời tiết' },
  { id: 'n', symbol: 'n', ipa: '[n]', vietnameseGuide: 'Giống chữ "n" trong tiếng Việt.', mouthShape: 'Đầu lưỡi chạm ngạc cứng, âm mũi.', exampleZh: '你好', examplePinyin: 'nǐ hǎo', exampleVi: 'Xin chào' },
  { id: 'l', symbol: 'l', ipa: '[l]', vietnameseGuide: 'Giống chữ "l" trong tiếng Việt.', mouthShape: 'Đầu lưỡi chạm lợi trên, luồng hơi thoát ra hai bên lưỡi.', exampleZh: '老师', examplePinyin: 'lǎoshī', exampleVi: 'Thầy cô' },

  // Âm cuống lưỡi
  { id: 'g', symbol: 'g', ipa: '[k]', vietnameseGuide: 'Giống chữ "c / k" trong tiếng Việt (không phải "g").', mouthShape: 'Cuống lưỡi nâng lên chạm ngạc mềm, nhả nhẹ không bật hơi.', exampleZh: '哥哥', examplePinyin: 'gēge', exampleVi: 'Anh trai' },
  { id: 'k', symbol: 'k', ipa: '[kʰ]', vietnameseGuide: 'Giống âm "kh" tiếng Việt kết hợp "k" bật hơi mạnh.', mouthShape: 'Cuống lưỡi nén hơi sau đó bung luồng hơi mạnh từ cổ họng.', exampleZh: '咖啡', examplePinyin: 'kāfēi', exampleVi: 'Cà phê' },
  { id: 'h', symbol: 'h', ipa: '[x]', vietnameseGuide: 'Lai giữa chữ "h" và "kh" tiếng Việt.', mouthShape: 'Cuống lưỡi hơi nâng, đẩy luồng hơi ma sát nhẹ qua cổ họng.', exampleZh: '很好', examplePinyin: 'hěn hǎo', exampleVi: 'Rất tốt' },

  // Âm mặt lưỡi (J, Q, X - Người Việt hay nhầm)
  { id: 'j', symbol: 'j', ipa: '[tɕ]', vietnameseGuide: 'Giống âm "ch" tiếng Việt nhưng bẹt miệng, không bật hơi.', mouthShape: 'Mặt lưỡi ép sát ngạc cứng, miệng kéo sang hai bên.', exampleZh: '家', examplePinyin: 'jiā', exampleVi: 'Nhà' },
  { id: 'q', symbol: 'q', ipa: '[tɕʰ]', vietnameseGuide: 'Mặt lưỡi ép sát, bật hơi thật mạnh luồng gió sắc.', mouthShape: 'Miệng bè sang hai bên như đang cười, đẩy luồng gió xì mạnh qua kẽ răng.', exampleZh: '去', examplePinyin: 'qù', exampleVi: 'Đi' },
  { id: 'x', symbol: 'x', ipa: '[ɕ]', vietnameseGuide: 'Giống chữ "x" nhẹ tiếng Việt nhưng miệng bè dẹt.', mouthShape: 'Mặt lưỡi nâng gần ngạc cứng, hơi xát ra êm.', exampleZh: '谢谢', examplePinyin: 'xièxie', exampleVi: 'Cảm ơn' },

  // Âm đầu lưỡi trước (Z, C, S)
  { id: 'z', symbol: 'z', ipa: '[ts]', vietnameseGuide: 'Đầu lưỡi thẳng chạm mặt trong răng cửa trên, không bật hơi.', mouthShape: 'Răng khép nhẹ, đẩy hơi xát nhẹ (lai giữa ch và gi).', exampleZh: '再见', examplePinyin: 'zàijiàn', exampleVi: 'Tạm biệt' },
  { id: 'c', symbol: 'c', ipa: '[tsʰ]', vietnameseGuide: 'Bật hơi cực mạnh từ kẽ răng cửa trước.', mouthShape: 'Đầu lưỡi chạm răng trên, nén hơi rồi xì mạnh ra ngoài.', exampleZh: '菜', examplePinyin: 'cài', exampleVi: 'Món ăn' },
  { id: 's', symbol: 's', ipa: '[s]', vietnameseGuide: 'Giống chữ "x" tiếng Việt, hơi xát qua kẽ răng.', mouthShape: 'Răng trên dưới gần khép, lưỡi thả lỏng gần chân răng.', exampleZh: '三', examplePinyin: 'sān', exampleVi: 'Số ba' },

  // Âm uốn lưỡi (ZH, CH, SH, R)
  { id: 'zh', symbol: 'zh', ipa: '[tʂ]', vietnameseGuide: 'Uốn cong đầu lưỡi lên ngạc cứng trên, không bật hơi (giống tr miền Nam).', mouthShape: 'Đầu lưỡi uốn lên vòm họng trên, bật nhẹ không thoát hơi gió.', exampleZh: '中国', examplePinyin: 'Zhōngguó', exampleVi: 'Trung Quốc' },
  { id: 'ch', symbol: 'ch', ipa: '[tʂʰ]', vietnameseGuide: 'Uốn cong đầu lưỡi và BẬT HƠI thật mạnh.', mouthShape: 'Đầu lưỡi cong lên ngạc trên, nén luồng hơi rồi bung mạnh ra.', exampleZh: '吃', examplePinyin: 'chī', exampleVi: 'Ăn' },
  { id: 'sh', symbol: 'sh', ipa: '[ʂ]', vietnameseGuide: 'Uốn cong đầu lưỡi, ma sát luồng hơi (giống s nặng tiếng Việt).', mouthShape: 'Đầu lưỡi uốn cong gần ngạc cứng, đẩy luồng hơi đều ra.', exampleZh: '书', examplePinyin: 'shū', exampleVi: 'Sách' },
  { id: 'r', symbol: 'r', ipa: '[ʐ]', vietnameseGuide: 'Uốn cong đầu lưỡi, phát âm rung nhẹ dây thanh (lai giữa r và d).', mouthShape: 'Lưỡi cong lên gần ngạc cứng, dây thanh rung rõ.', exampleZh: '人', examplePinyin: 'rén', exampleVi: 'Người' },
];

// Các Vận Mẫu Chính (Finals)
export const FINALS_DATA: PinyinSoundItem[] = [
  { id: 'a', symbol: 'a', ipa: '[a]', vietnameseGuide: 'Giống âm "a" trong tiếng Việt.', mouthShape: 'Mở rộng miệng tự nhiên.', exampleZh: '大', examplePinyin: 'dà', exampleVi: 'To, lớn' },
  { id: 'o', symbol: 'o', ipa: '[o]', vietnameseGuide: 'Giống âm "ô" hoặc hơi hướng "ua".', mouthShape: 'Môi tròn, hơi nhô về phía trước.', exampleZh: '我', examplePinyin: 'wǒ', exampleVi: 'Tôi' },
  { id: 'e', symbol: 'e', ipa: '[ɤ]', vietnameseGuide: 'Phát âm giống âm "ơ" hoặc lai "ưa" tiếng Việt.', mouthShape: 'Miệng nửa mở, cuống lưỡi hơi nâng.', exampleZh: '喝', examplePinyin: 'hē', exampleVi: 'Uống' },
  { id: 'i', symbol: 'i', ipa: '[i]', vietnameseGuide: 'Giống âm "i" tiếng Việt (riêng sau z,c,s,zh,ch,sh,r đọc là "ư").', mouthShape: 'Miệng bè dẹt sang hai bên.', exampleZh: '一', examplePinyin: 'yī', exampleVi: 'Số 1' },
  { id: 'u', symbol: 'u', ipa: '[u]', vietnameseGuide: 'Giống âm "u" tiếng Việt.', mouthShape: 'Môi tròn chu về trước.', exampleZh: '五', examplePinyin: 'wǔ', exampleVi: 'Số 5' },
  { id: 'v', symbol: 'ü', ipa: '[y]', vietnameseGuide: 'Phát âm tròn môi âm "uy" (giữ môi tròn như huýt sáo rồi phát âm "i").', mouthShape: 'Tròn môi hết cỡ, lưỡi đưa về phía răng cửa dưới.', exampleZh: '绿', examplePinyin: 'lǜ', exampleVi: 'Màu xanh lục' },
  { id: 'ai', symbol: 'ai', ipa: '[aɪ]', vietnameseGuide: 'Giống vần "ai" tiếng Việt.', mouthShape: 'Mở rộng từ a chuyển nhanh sang i.', exampleZh: '爱', examplePinyin: 'ài', exampleVi: 'Yêu' },
  { id: 'ei', symbol: 'ei', ipa: '[eɪ]', vietnameseGuide: 'Giống vần "ây" tiếng Việt.', mouthShape: 'Khẩu hình từ e khép dần về i.', exampleZh: '杯', examplePinyin: 'bēi', exampleVi: 'Cốc, ly' },
  { id: 'ao', symbol: 'ao', ipa: '[aʊ]', vietnameseGuide: 'Giống vần "ao" tiếng Việt.', mouthShape: 'Từ a tròn môi dần về o.', exampleZh: '好', examplePinyin: 'hǎo', exampleVi: 'Tốt' },
  { id: 'ou', symbol: 'ou', ipa: '[oʊ]', vietnameseGuide: 'Giống vần "âu" tiếng Việt.', mouthShape: 'Bắt đầu từ ô tròn dần về u.', exampleZh: '狗', examplePinyin: 'gǒu', exampleVi: 'Con chó' },
  { id: 'an', symbol: 'an', ipa: '[an]', vietnameseGuide: 'Giống vần "an" tiếng Việt.', mouthShape: 'Đầu lưỡi chạm răng trên ở cuối âm.', exampleZh: '三', examplePinyin: 'sān', exampleVi: 'Số ba' },
  { id: 'en', symbol: 'en', ipa: '[ən]', vietnameseGuide: 'Giống vần "ân" tiếng Việt.', mouthShape: 'Miệng thả lỏng, khép bằng đầu lưỡi.', exampleZh: '门', examplePinyin: 'mén', exampleVi: 'Cửa' },
  { id: 'ang', symbol: 'ang', ipa: '[ɑŋ]', vietnameseGuide: 'Giống vần "ang" tiếng Việt.', mouthShape: 'Cuống lưỡi nâng lên chạm ngạc mềm.', exampleZh: '忙', examplePinyin: 'máng', exampleVi: 'Bận' },
  { id: 'eng', symbol: 'eng', ipa: '[əŋ]', vietnameseGuide: 'Giống vần "âng" tiếng Việt.', mouthShape: 'Âm phát sâu trong cuống họng.', exampleZh: '冷', examplePinyin: 'lěng', exampleVi: 'Lạnh' },
  { id: 'ong', symbol: 'ong', ipa: '[ʊŋ]', vietnameseGuide: 'Giống vần "ung" tiếng Việt.', mouthShape: 'Tròn môi, âm mũi sâu.', exampleZh: '红', examplePinyin: 'hóng', exampleVi: 'Màu đỏ' },
];

// 4 Thanh Điệu + Thanh Nhẹ (Tones)
export const TONES_DATA: ToneItem[] = [
  {
    toneNumber: 1,
    name: 'Thanh 1 (Âm Bình - 高平调)',
    symbol: 'ā (5-5)',
    pitch: 'Cao và đều từ đầu đến cuối',
    descriptionVi: 'Phát âm ở cao độ cao nhất (5-5), kéo dài ổn định, không lên không xuống, tương tự ngân nốt nhạc cao.',
    exampleZh: '妈',
    examplePinyin: 'mā',
    exampleVi: 'Mẹ (Thanh 1)',
  },
  {
    toneNumber: 2,
    name: 'Thanh 2 (Dương Bình - 中升调)',
    symbol: 'á (3-5)',
    pitch: 'Từ trung bình vút lên cao',
    descriptionVi: 'Giống dấu SẮC trong tiếng Việt nhưng xuất phát từ âm vực vừa rồi vút mạnh dứt khoát lên đỉnh cao.',
    exampleZh: '麻',
    examplePinyin: 'má',
    exampleVi: 'Cây gai (Thanh 2)',
  },
  {
    toneNumber: 3,
    name: 'Thanh 3 (Thượng Thanh - 降升调)',
    symbol: 'ǎ (2-1-4)',
    pitch: 'Xuống tận đáy rồi vòng lên',
    descriptionVi: 'Xuất phát ở mức trầm (2), hạ sâu xuống tận đáy cổ họng (1) rồi hơi vút nhẹ lên (4). Khi đứng một mình đọc đủ vòng; trong câu thường đọc nửa thanh 3 (hạ trầm).',
    exampleZh: '马',
    examplePinyin: 'mǎ',
    exampleVi: 'Con ngựa (Thanh 3)',
  },
  {
    toneNumber: 4,
    name: 'Thanh 4 (Khứ Thanh - 全降调)',
    symbol: 'à (5-1)',
    pitch: 'Rơi thẳng từ đỉnh xuống đáy',
    descriptionVi: 'Rơi thật nhanh, mạnh và dứt khoát từ mức cao nhất (5) xuống thấp nhất (1). Tuyệt đối không đọc nhẹ như dấu huyền tiếng Việt.',
    exampleZh: '骂',
    examplePinyin: 'mà',
    exampleVi: 'Mắng mỏ (Thanh 4)',
  },
  {
    toneNumber: 0,
    name: 'Thanh Nhẹ (Khinh Thanh - 轻声)',
    symbol: 'a (không dấu)',
    pitch: 'Ngắn, nhẹ, phụ thuộc âm trước',
    descriptionVi: 'Phát âm vừa ngắn vừa nhẹ, âm vực phụ thuộc vào thanh điệu của từ đứng liền trước nó.',
    exampleZh: '妈妈',
    examplePinyin: 'māma',
    exampleVi: 'Mẹ (từ thứ 2 mang thanh nhẹ)',
  },
];

// Quy Tắc Biến Điệu (Tone Sandhi)
export const TONE_SANDHI_RULES: ToneSandhiRule[] = [
  {
    id: 'sandhi_two_third_tones',
    name: 'Biến điệu hai thanh 3 đi liền nhau',
    ruleFormula: 'Thanh 3 + Thanh 3 ➔ Thanh 2 + Thanh 3',
    explanationVi: 'Khi hai âm tiết cùng mang thanh 3 đứng liền nhau, âm tiết thứ nhất sẽ đọc thành thanh 2 (dấu sắc). Chữ viết pinyin vẫn giữ nguyên dấu thanh 3.',
    examples: [
      { written: '你好 (nǐ hǎo)', pronounced: 'ní hǎo', meaningVi: 'Xin chào' },
      { written: '很好 (hěn hǎo)', pronounced: 'hén hǎo', meaningVi: 'Rất tốt' },
      { written: '手表 (shǒubiǎo)', pronounced: 'shóubiǎo', meaningVi: 'Đồng hồ đeo tay' },
    ],
  },
  {
    id: 'sandhi_bu',
    name: 'Biến điệu của chữ 不 (bù)',
    ruleFormula: '不 + Thanh 4 ➔ Bú + Thanh 4 (Các trường hợp khác vẫn đọc bù)',
    explanationVi: 'Từ "不" nguyên gốc mang thanh 4 (bù). Khi đứng trước một từ cũng mang thanh 4, "不" phải biến thành thanh 2 (bú).',
    examples: [
      { written: '不是 (bù + shì)', pronounced: 'bú shì', meaningVi: 'Không phải' },
      { written: '不要 (bù + yào)', pronounced: 'bú yào', meaningVi: 'Đừng / Không cần' },
      { written: '不错 (bù + cuò)', pronounced: 'bú cuò', meaningVi: 'Không tệ, rất tốt' },
    ],
  },
  {
    id: 'sandhi_yi',
    name: 'Biến điệu của chữ 一 (yī)',
    ruleFormula: '一 + Thanh 4 ➔ Yí | 一 + Thanh 1, 2, 3 ➔ Yì | Đếm số: Yī',
    explanationVi: 'Khi đứng độc lập hoặc đếm số thì đọc yī. Đứng trước từ mang thanh 4 thì đổi thành yí. Đứng trước từ mang thanh 1, 2, 3 thì đổi thành yì.',
    examples: [
      { written: '一个 (yī + gè)', pronounced: 'yí gè', meaningVi: 'Một cái' },
      { written: '一天 (yī + tiān)', pronounced: 'yì tiān', meaningVi: 'Một ngày (tiān là thanh 1)' },
      { written: '一起 (yī + qǐ)', pronounced: 'yì qǐ', meaningVi: 'Cùng nhau (qǐ là thanh 3)' },
    ],
  },
];

// Những Lỗi Phát Âm Điển Hình Của Người Việt
export const VIETNAMESE_PITFALLS: VietnameseMistakeGuide[] = [
  {
    id: 'pitfall_zh_ch_sh_vs_z_c_s',
    problemTitle: 'Nhầm lẫn giữa Âm Uốn Lưỡi (zh, ch, sh) và Âm Đầu Lưỡi (z, c, s)',
    targetSounds: 'zh, ch, sh vs z, c, s',
    mistakeExplanation: 'Người Việt hay phát âm zh giống z (đều đọc thành d/gi), ch giống c (đều đọc thành x/ch).',
    howToFix: 'Với nhóm zh, ch, sh, BẮT BUỘC phải cong đầu lưỡi chạm vào ngạc cứng trên. Nhóm z, c, s thì đầu lưỡi phải THẲNG chạm mặt sau răng cửa dưới.',
    practicePairs: [
      {
        word1: { zh: '知道', pinyin: 'zhīdào', vi: 'Biết (uốn lưỡi)' },
        word2: { zh: '滋味', pinyin: 'zīwèi', vi: 'Hương vị (thẳng lưỡi)' },
      },
      {
        word1: { zh: '吃饭', pinyin: 'chīfàn', vi: 'Ăn cơm (uốn lưỡi + bật hơi)' },
        word2: { zh: '刺耳', pinyin: 'cì\'ěr', vi: 'Chói tai (răng trước + bật hơi)' },
      },
    ],
  },
  {
    id: 'pitfall_j_q_x',
    problemTitle: 'Phát âm nhóm âm Mặt Lưỡi (j, q, x)',
    targetSounds: 'j, q, x',
    mistakeExplanation: 'Người Việt thường đọc j thành "gi", q thành "ky/qui" hoặc không bật hơi đủ, x đọc như "x" nặng.',
    howToFix: 'Khẩu hình: Mặt lưỡi ép sát ngạc cứng, mép miệng kéo căng sang hai bên như đang cười. Q phải bật mạnh luồng hơi qua kẽ răng.',
    practicePairs: [
      {
        word1: { zh: '去', pinyin: 'qù', vi: 'Đi (bật hơi sắc)' },
        word2: { zh: '句', pinyin: 'jù', vi: 'Câu (không bật hơi)' },
      },
      {
        word1: { zh: '星', pinyin: 'xīng', vi: 'Sao' },
        word2: { zh: '青', pinyin: 'qīng', vi: 'Xanh (bật hơi)' },
      },
    ],
  },
  {
    id: 'pitfall_tone4',
    problemTitle: 'Đọc thanh 4 thành Dấu Huyền tiếng Việt',
    targetSounds: 'Thanh 4 (à)',
    mistakeExplanation: 'Thanh 4 rơi từ 5 xuống 1 với lực rất mạnh và dứt khoát. Người Việt đọc nhẹ kéo dài biến thành dấu huyền (ví dụ: bù shì đọc thành bùi sì là sai).',
    howToFix: 'Nói như một tiếng ra lệnh dứt khoát, âm phát ra gọn, không kéo dài. Hãy tưởng tượng như một cái búa gõ mạnh xuống mặt bàn.',
    practicePairs: [
      {
        word1: { zh: '是', pinyin: 'shì', vi: 'Là (Thanh 4 dứt khoát)' },
        word2: { zh: '十', pinyin: 'shí', vi: 'Số 10 (Thanh 2 đi lên)' },
      },
      {
        word1: { zh: '看', pinyin: 'kàn', vi: 'Nhìn, xem' },
        word2: { zh: '砍', pinyin: 'kǎn', vi: 'Chặt, chém (Thanh 3)' },
      },
    ],
  },
];
