export interface DictionarySense {
  meaningVi: string;
  contextVi?: string;
  example?: {
    zh: string;
    pinyin: string;
    vi: string;
  };
}

export interface ConfusingWordDiff {
  word: string;
  pinyin: string;
  differenceVi: string;
  exampleZh?: string;
  exampleVi?: string;
}

export interface DictionaryEntry {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  pinyinClean: string; // Tone-agnostic lowercase pinyin e.g. "xuexi"
  meaningVi: string;
  wordType: string;
  hskLevel: number;
  radical?: string;
  strokeCount?: number;
  characterDecomposition?: string;
  measureWords?: string;
  synonyms?: string[];
  antonyms?: string[];
  confusingWords?: ConfusingWordDiff[];
  collocations?: string[];
  senses?: DictionarySense[];
  examples: Array<{
    zh: string;
    pinyin: string;
    vi: string;
    context?: string;
  }>;
  source: string;
  version: string;
}

/**
 * Chuẩn hóa Pinyin loại bỏ dấu thanh điệu, dấu cách, ký tự đặc biệt
 * Ví dụ: "xué xí" -> "xuexi", "Nǐ hǎo!" -> "nihao", "lǜ" -> "lv"
 */
export function normalizePinyin(pinyin: string): string {
  if (!pinyin) return '';
  return pinyin
    .toLowerCase()
    .replace(/[āáǎà]/g, 'a')
    .replace(/[ōóǒò]/g, 'o')
    .replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .replace(/[^a-zv0-9]/g, '');
}

/**
 * Dữ liệu hạt giống Từ điển Tiếng Trung Chuẩn hóa (Standard Curated Dictionary)
 * Nguồn tham chiếu: Giáo trình Chuẩn HSK 1-6 & Từ điển Hán - Việt Hiện Đại
 */
export const SEED_DICTIONARY_ENTRIES: DictionaryEntry[] = [
  // --- HỌC TẬP & GIÁO DỤC ---
  {
    id: 'dict_xuexi',
    simplified: '学习',
    traditional: '學習',
    pinyin: 'xué xí',
    pinyinClean: 'xuexi',
    meaningVi: 'học tập, rèn luyện kiến thức kỹ năng',
    wordType: 'Động từ / Danh từ',
    hskLevel: 1,
    radical: '子 (Tử)',
    strokeCount: 11,
    characterDecomposition: '学 (⺌ + 冖 + 子) + 习 (𠃌 + 冫)',
    synonyms: ['念书', '求学', '研习'],
    antonyms: ['教学', '荒废'],
    collocations: ['努力学习', '学习汉语', '学习方法', '学习态度'],
    confusingWords: [
      {
        word: '练习',
        pinyin: 'liàn xí',
        differenceVi: 'Thiên về thực hành, làm bài tập nhiều lần để nhuần nhuyễn kỹ năng đã học.',
        exampleZh: '每天练习口语。',
        exampleVi: 'Mỗi ngày luyện tập khẩu ngữ.'
      },
      {
        word: '复习',
        pinyin: 'fù xí',
        differenceVi: 'Ôn tập lại những kiến thức đã học trước đó để củng cố trí nhớ.',
        exampleZh: '明天考试，今天要好好复习。',
        exampleVi: 'Mai thi rồi, hôm nay phải ôn tập thật kỹ.'
      }
    ],
    senses: [
      {
        meaningVi: 'Thu nhận kiến thức hoặc kỹ năng qua sách vở, thầy cô hoặc kinh nghiệm',
        contextVi: 'Sử dụng phổ quát trong đời sống và học thuật',
        example: {
          zh: '他在大学里学习计算机科学。',
          pinyin: 'Tā zài dàxué lǐ xuéxí jìsuànjī kēxué.',
          vi: 'Anh ấy học khoa học máy tính ở trường đại học.'
        }
      },
      {
        meaningVi: 'Noi gương, học hỏi kinh nghiệm tốt từ người khác',
        contextVi: 'Biểu thị sự noi theo tấm gương mẫu mực',
        example: {
          zh: '我们应该向他学习这种认真的精神。',
          pinyin: 'Wǒmen yīnggāi xiàng tā xuéxí zhè zhǒng rènzhēn de jīngshén.',
          vi: 'Chúng ta nên học tập tinh thần nghiêm túc này của anh ấy.'
        }
      }
    ],
    examples: [
      {
        zh: '我每天坚持学习中文两个小时。',
        pinyin: 'Wǒ měitiān jiānchí xuéxí zhōngwén liǎng gè xiǎoshí.',
        vi: 'Tôi kiên trì học tiếng Trung hai tiếng mỗi ngày.',
        context: 'Thói quen học tập'
      },
      {
        zh: '好的学习习惯非常重要。',
        pinyin: 'Hǎo de xuéxí xíguàn fēicháng zhòngyào.',
        vi: 'Thói quen học tập tốt là vô cùng quan trọng.',
        context: 'Lời khuyên'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_lianxi',
    simplified: '练习',
    traditional: '練習',
    pinyin: 'liàn xí',
    pinyinClean: 'lianxi',
    meaningVi: 'luyện tập, bài tập rèn luyện',
    wordType: 'Động từ / Danh từ',
    hskLevel: 2,
    radical: '纟 (Mịch)',
    strokeCount: 11,
    characterDecomposition: '练 (纟 + 𠫓) + 习 (𠃌 + 冫)',
    measureWords: '道 (đạo), 份 (phần), 个 (cái)',
    synonyms: ['操练', '演练', '训练'],
    collocations: ['做练习', '练习听力', '练习写字', '口语练习'],
    confusingWords: [
      {
        word: '学习',
        pinyin: 'xué xí',
        differenceVi: 'Tiếp nhận kiến thức mới hoặc hệ thống tri thức rộng lớn.',
        exampleZh: '学习新课程。',
        exampleVi: 'Học bài giảng mới.'
      }
    ],
    examples: [
      {
        zh: '学完生词以后，我们应该多做练习。',
        pinyin: 'Xué wán shēngcí yǐhòu, wǒmen yīnggāi duō zuò liànxí.',
        vi: 'Sau khi học xong từ mới, chúng ta nên làm nhiều bài tập.',
        context: 'Học tập'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_fuxi',
    simplified: '复习',
    traditional: '複習',
    pinyin: 'fù xí',
    pinyinClean: 'fuxi',
    meaningVi: 'ôn tập, ôn lại bài cũ',
    wordType: 'Động từ',
    hskLevel: 2,
    radical: '夂 (Truy)',
    strokeCount: 12,
    characterDecomposition: '复 (𠂉 + 日 + 夂) + 习 (𠃌 + 冫)',
    antonyms: ['预习 (yùxí - chuẩn bị bài mới)'],
    collocations: ['复习功课', '复习生词', '考前复习'],
    examples: [
      {
        zh: '温故而知新，每天都要复习。',
        pinyin: 'Wēn gù ér zhī xīn, měitiān dōu yào fùxí.',
        vi: 'Ôn cũ biết mới, ngày nào cũng phải ôn tập.',
        context: 'Châm ngôn học tập'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_zhongwen',
    simplified: '中文',
    traditional: '中文',
    pinyin: 'zhōng wén',
    pinyinClean: 'zhongwen',
    meaningVi: 'tiếng Trung, văn phong tiếng Trung',
    wordType: 'Danh từ',
    hskLevel: 1,
    radical: '丨 / 文',
    strokeCount: 8,
    characterDecomposition: '中 + 文',
    synonyms: ['汉语', '华语', '国语'],
    collocations: ['学中文', '中文书', '中文老师', '讲中文'],
    examples: [
      {
        zh: '我的中文水平每天都在提高。',
        pinyin: 'Wǒ de zhōngwén shuǐpíng měitiān dōu zài tígāo.',
        vi: 'Trình độ tiếng Trung của tôi mỗi ngày đều đang tiến bộ.',
        context: 'Học tập'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_hanyu',
    simplified: '汉语',
    traditional: '漢語',
    pinyin: 'hàn yǔ',
    pinyinClean: 'hanyu',
    meaningVi: 'tiếng Hán (ngôn ngữ của dân tộc Hán)',
    wordType: 'Danh từ',
    hskLevel: 1,
    radical: '氵 / 讠',
    strokeCount: 14,
    characterDecomposition: '汉 (氵 + 又) + 语 (讠 + 五 + 口)',
    synonyms: ['中文', '普通话'],
    collocations: ['汉语水平考试 (HSK)', '汉语词典', '说汉语'],
    examples: [
      {
        zh: '汉语是世界上使用人数最多的语言之一。',
        pinyin: 'Hànyǔ shì shìjiè shàng shǐyòng rénshù zuì duō de yǔyán zhī yī.',
        vi: 'Tiếng Hán là một trong những ngôn ngữ có số lượng người sử dụng nhiều nhất trên thế giới.',
        context: 'Tổng quan ngôn ngữ'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- THỊ GIÁC & QUAN SÁT (BỘ TỪ GẦN NGHĨA KAN / GUANKAN / KANJIAN) ---
  {
    id: 'dict_kan',
    simplified: '看',
    traditional: '看',
    pinyin: 'kàn',
    pinyinClean: 'kan',
    meaningVi: 'nhìn, xem, đọc, thăm, khám bệnh',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '目 (Mục)',
    strokeCount: 9,
    characterDecomposition: '手 (Thủ cụt ở trên) + 目 (Mục ở dưới) - che tay lên mắt để nhìn',
    synonyms: ['望', '瞧', '视'],
    collocations: ['看书', '看电影', '看朋友', '看病', '看法'],
    confusingWords: [
      {
        word: '看见',
        pinyin: 'kàn jiàn',
        differenceVi: 'Nhấn mạnh kết quả của hành động nhìn (nhìn thấy được đối tượng).',
        exampleZh: '我看见他走进图书馆了。',
        exampleVi: 'Tôi nhìn thấy anh ấy đi vào thư viện rồi.'
      },
      {
        word: '观看',
        pinyin: 'guān kàn',
        differenceVi: 'Mang sắc thái trang trọng, thường dùng cho việc xem biểu diễn nghệ thuật, thi đấu thể thao hoặc sự kiện lớn.',
        exampleZh: '观看足球比赛。',
        exampleVi: 'Theo dõi trận thi đấu bóng đá.'
      }
    ],
    senses: [
      {
        meaningVi: 'Dùng mắt để hướng vào một vật',
        example: { zh: '你看前面的那座山。', pinyin: 'Nǐ kàn qiánmiàn de nà zuò shān.', vi: 'Bạn nhìn ngọn núi phía trước kìa.' }
      },
      {
        meaningVi: 'Đọc (sách, báo, tài liệu)',
        example: { zh: '他正在安静地看书。', pinyin: 'Tā zhèngzài ānjìng de kànshū.', vi: 'Anh ấy đang yên lặng đọc sách.' }
      },
      {
        meaningVi: 'Thăm hỏi người quen hoặc đến bác sĩ khám bệnh',
        example: { zh: '周末我去医院看望生病的老师。', pinyin: 'Zhōumò wǒ qù yīyuàn kànwàng shēngbìng de lǎoshī.', vi: 'Cuối tuần tôi đi bệnh viện thăm thầy giáo bị ốm.' }
      }
    ],
    examples: [
      {
        zh: '你看这件衣服好看吗？',
        pinyin: 'Nǐ kàn zhè jiàn yīfu hǎokàn ma?',
        vi: 'Bạn xem bộ quần áo này có đẹp không?',
        context: 'Hỏi ý kiến'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_kanjian',
    simplified: '看见',
    traditional: '看見',
    pinyin: 'kàn jiàn',
    pinyinClean: 'kanjian',
    meaningVi: 'nhìn thấy, trông thấy (có kết quả)',
    wordType: 'Động từ (kết cấu động bổ)',
    hskLevel: 1,
    radical: '目 (Mục)',
    strokeCount: 13,
    characterDecomposition: '看 + 见 (Bổ ngữ kết quả)',
    synonyms: ['看到'],
    antonyms: ['没看见', '看不见'],
    examples: [
      {
        zh: '你看见我的手机了吗？',
        pinyin: 'Nǐ kànjiàn wǒ de shǒujī le ma?',
        vi: 'Bạn có nhìn thấy điện thoại của tôi ở đâu không?',
        context: 'Tìm đồ'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_guankan',
    simplified: '观看',
    traditional: '觀看',
    pinyin: 'guān kàn',
    pinyinClean: 'guankan',
    meaningVi: 'xem, theo dõi (sự kiện, tiết mục biểu diễn, thi đấu)',
    wordType: 'Động từ',
    hskLevel: 4,
    radical: '又 / 见',
    strokeCount: 15,
    collocations: ['观看演出', '观看比赛', '观看升旗仪式'],
    examples: [
      {
        zh: '数万名观众在现场观看了这场精彩的开幕式。',
        pinyin: 'Shù wàn míng guānzhòng zài xiànchǎng guānkàn le zhè chǎng jīngcǎi de kāimùshì.',
        vi: 'Hàng vạn khán giả đã theo dõi trực tiếp lễ khai mạc đặc sắc này tại hiện trường.',
        context: 'Báo chí / Sự kiện lớn'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- TRI THỨC & NHẬN THỨC (ZHIDAO / RENSHI / LIAOJIE) ---
  {
    id: 'dict_zhidao',
    simplified: '知道',
    traditional: '知道',
    pinyin: 'zhī dào',
    pinyinClean: 'zhidao',
    meaningVi: 'biết (thông tin, sự việc, sự thực)',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '矢 (Thỉ)',
    strokeCount: 20,
    characterDecomposition: '知 (矢 + 口) + 道 (辶 + 首)',
    synonyms: ['知晓', '明白'],
    antonyms: ['不知道', '未知'],
    collocations: ['知道事情', '知道原因', '你知道吗'],
    confusingWords: [
      {
        word: '认识',
        pinyin: 'rèn shí',
        differenceVi: 'Dùng cho người hoặc mặt chữ/đường sá (quen biết, nhận mặt, hiểu biết thông qua tiếp xúc cá nhân).',
        exampleZh: '我认识那位教授。',
        exampleVi: 'Tôi có quen biết vị giáo sư đó.'
      },
      {
        word: '了解',
        pinyin: 'liǎo jiě',
        differenceVi: 'Hiểu rõ ngọn ngành, thấu hiểu tường tận về bản chất hoặc hoàn cảnh của đối tượng.',
        exampleZh: '我很了解他的性格。',
        exampleVi: 'Tôi rất hiểu rõ tính cách của anh ấy.'
      }
    ],
    examples: [
      {
        zh: '你知道今天下午几点开会吗？',
        pinyin: 'Nǐ zhīdào jīntiān xiàwǔ jǐ diǎn kāihuì ma?',
        vi: 'Bạn có biết chiều nay mấy giờ họp không?',
        context: 'Hỏi thông tin'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_renshi',
    simplified: '认识',
    traditional: '認識',
    pinyin: 'rèn shí',
    pinyinClean: 'renshi',
    meaningVi: 'quen biết, nhận biết, nhận diện mặt người/chữ',
    wordType: 'Động từ / Danh từ',
    hskLevel: 1,
    radical: '讠 (Ngôn)',
    strokeCount: 16,
    characterDecomposition: '认 (讠 + 人) + 识 (讠 + 只)',
    synonyms: ['相识', '结识'],
    collocations: ['认识朋友', '认识汉字', '很高兴认识你'],
    examples: [
      {
        zh: '很高兴认识你，我是阮明安。',
        pinyin: 'Hěn gāoxìng rènshí nǐ, wǒ shì Ruǎn Míng\'ān.',
        vi: 'Rất vui được quen biết bạn, tôi là Nguyễn Minh An.',
        context: 'Chào hỏi lần đầu'
      },
      {
        zh: '这个汉字我认识，但不会写。',
        pinyin: 'Zhè gè hànzì wǒ rènshí, dàn bú huì xiě.',
        vi: 'Chữ Hán này tôi nhận mặt được, nhưng không biết viết.',
        context: 'Học chữ Hán'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_liaojie',
    simplified: '了解',
    traditional: '了解',
    pinyin: 'liǎo jiě',
    pinyinClean: 'liaojie',
    meaningVi: 'hiểu rõ, thấu hiểu tường tận, tìm hiểu',
    wordType: 'Động từ',
    hskLevel: 3,
    radical: '乙 / 角',
    strokeCount: 15,
    collocations: ['了解情况', '了解文化', '互相了解'],
    examples: [
      {
        zh: '通过这次旅行，我对中国传统文化有了更深的了解。',
        pinyin: 'Tōngguò zhè cì lǚxíng, wǒ duì zhōngguó chuántǒng wénhuà yǒu le gèng shēn de liǎojiě.',
        vi: 'Qua chuyến du lịch lần này, tôi đã hiểu sâu sắc hơn về văn hóa truyền thống Trung Quốc.',
        context: 'Trải nghiệm văn hóa'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- ĐỘNG TỪ NĂNG NGUYỆN (NENG / HUI / KEYI) ---
  {
    id: 'dict_neng',
    simplified: '能',
    traditional: '能',
    pinyin: 'néng',
    pinyinClean: 'neng',
    meaningVi: 'có thể (năng lực bẩm sinh, điều kiện khách quan cho phép)',
    wordType: 'Động từ năng nguyện',
    hskLevel: 1,
    radical: '月 (Nguyệt)',
    strokeCount: 10,
    synonyms: ['能够'],
    antonyms: ['不能'],
    collocations: ['能够', '能力', '能不能'],
    confusingWords: [
      {
        word: '会',
        pinyin: 'huì',
        differenceVi: 'Nhấn mạnh kỹ năng đạt được qua quá trình học hỏi, rèn luyện (ví dụ: biết bơi, biết lái xe, biết tiếng Trung).',
        exampleZh: '我会说汉语。',
        exampleVi: 'Tôi biết nói tiếng Trung (do đã học).'
      },
      {
        word: '可以',
        pinyin: 'kě yǐ',
        differenceVi: 'Nhấn mạnh sự cho phép về mặt quy tắc hoặc sự thỉnh cầu lịch sự.',
        exampleZh: '这里可以吸烟吗？',
        exampleVi: 'Ở đây có được phép hút thuốc không?'
      }
    ],
    examples: [
      {
        zh: '我现在嗓子疼，不能大声说话。',
        pinyin: 'Wǒ xiànzài sǎngzi téng, bù néng dà shēng shuōhuà.',
        vi: 'Bây giờ họng tôi bị đau, không thể nói lớn tiếng được.',
        context: 'Khả năng do điều kiện sức khỏe'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_hui',
    simplified: '会',
    traditional: '會',
    pinyin: 'huì',
    pinyinClean: 'hui',
    meaningVi: 'biết (qua học tập); sẽ (dự đoán tương lai); cuộc họp',
    wordType: 'Động từ năng nguyện / Danh từ',
    hskLevel: 1,
    radical: '人 (Nhân)',
    strokeCount: 6,
    characterDecomposition: '人 + 云',
    senses: [
      {
        meaningVi: 'Biết làm một việc gì đó nhờ học tập rèn luyện',
        example: { zh: '我弟弟会游泳。', pinyin: 'Wǒ dìdi huì yóuyǒng.', vi: 'Em trai tôi biết bơi.' }
      },
      {
        meaningVi: 'Biểu thị sự việc có khả năng xảy ra trong tương lai (sẽ)',
        example: { zh: '明天会下雨吗？', pinyin: 'Míngtiān huì xiàyǔ ma?', vi: 'Ngày mai trời có mưa không?' }
      },
      {
        meaningVi: 'Cuộc họp, hội nghị (Danh từ)',
        example: { zh: '我们正在开会。', pinyin: 'Wǒmen zhèngzài kāihuì.', vi: 'Chúng tôi đang họp.' }
      }
    ],
    examples: [
      {
        zh: '只要努力，你一定会学好汉语。',
        pinyin: 'Zhǐyào nǔlì, nǐ yídìng huì xué hǎo hànyǔ.',
        vi: 'Chỉ cần nỗ lực, bạn nhất định sẽ học giỏi tiếng Hán.',
        context: 'Động viên'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_keyi',
    simplified: '可以',
    traditional: '可以',
    pinyin: 'kě yǐ',
    pinyinClean: 'keyi',
    meaningVi: 'có thể (được phép, khả thi, tàm tạm khá tốt)',
    wordType: 'Động từ năng nguyện / Tính từ',
    hskLevel: 1,
    radical: '口 (Khẩu)',
    strokeCount: 9,
    collocations: ['可以吗', '还可以', '不可'],
    examples: [
      {
        zh: '请问，我可以坐在这里吗？',
        pinyin: 'Qǐngwèn, wǒ kěyǐ zuò zài zhèlǐ ma?',
        vi: 'Xin hỏi, tôi có thể ngồi ở đây được không?',
        context: 'Lịch sự thỉnh cầu'
      },
      {
        zh: '这家餐馆的味道还可以。',
        pinyin: 'Zhè jiā cānguǎn de wèidào hái kěyǐ.',
        vi: 'Hương vị của quán ăn này cũng tạm được (khá ổn).',
        context: 'Đánh giá tính từ'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- TỪ ĐA ÂM ĐA NGHĨA (POLYPHONIC WORDS: XING / HANG, DE / DEI) ---
  {
    id: 'dict_xing_hang',
    simplified: '行',
    traditional: '行',
    pinyin: 'xíng / háng',
    pinyinClean: 'xinghang',
    meaningVi: 'được, đi bộ, hành vi (xíng) / hàng lối, ngân hàng, ngành nghề (háng)',
    wordType: 'Đa âm tiết: Động từ / Danh từ / Lượng từ',
    hskLevel: 2,
    radical: '行 (Hành)',
    strokeCount: 6,
    senses: [
      {
        meaningVi: 'Đọc là xíng: được, chấp thuận, làm được',
        example: { zh: '明天见，行吗？——行！', pinyin: 'Míngtiān jiàn, xíng ma? —— Xíng!', vi: 'Mai gặp nhé, được không? —— Được!' }
      },
      {
        meaningVi: 'Đọc là xíng: đi bộ, di chuyển (hành trình)',
        example: { zh: '千里之行，始于足下。', pinyin: 'Qiān lǐ zhī xíng, shǐ yú zú xià.', vi: 'Hành trình ngàn dặm bắt đầu từ một bước chân.' }
      },
      {
        meaningVi: 'Đọc là háng: ngành nghề, ngân hàng (nghiệp, hàng)',
        example: { zh: '我要去中国银行换钱。', pinyin: 'Wǒ yào qù Zhōngguó Yínháng huàn qián.', vi: 'Tôi phải đến Ngân hàng Trung Quốc đổi tiền.' }
      },
      {
        meaningVi: 'Đọc là háng: hàng, dòng (Lượng từ)',
        example: { zh: '第一行写名字。', pinyin: 'Dì yī háng xiě míngzì.', vi: 'Dòng thứ nhất viết tên.' }
      }
    ],
    examples: [
      {
        zh: '行行出状元 (háng háng chū zhuàngyuan)。',
        pinyin: 'Háng háng chū zhuàngyuan.',
        vi: 'Ngành nghề nào cũng có thể xuất hiện nhân tài kiệt xuất.',
        context: 'Tục ngữ về ngành nghề'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_de_dei',
    simplified: '得',
    traditional: '得',
    pinyin: 'de / děi / dé',
    pinyinClean: 'dedeide',
    meaningVi: 'trợ từ bổ ngữ (de) / phải, cần phải (děi) / đạt được (dé)',
    wordType: 'Đa âm tiết: Trợ từ / Động từ năng nguyện / Động từ',
    hskLevel: 2,
    radical: '彳 (Xích)',
    strokeCount: 11,
    senses: [
      {
        meaningVi: 'Đọc là de (thanh nhẹ): Trợ từ kết cấu đứng sau động từ để dẫn ra bổ ngữ trạng thái/mức độ',
        example: { zh: '他跑得很快，汉语说得很好。', pinyin: 'Tā pǎo de hěn kuài, hànyǔ shuō de hěn hǎo.', vi: 'Anh ấy chạy rất nhanh, nói tiếng Hán rất tốt.' }
      },
      {
        meaningVi: 'Đọc là děi (thanh 3): Phải, cần phải (khẩu ngữ tương đương 必须)',
        example: { zh: '时间不早了，我得走了。', pinyin: 'Shíjiān bù zǎo le, wǒ děi zǒu le.', vi: 'Thời gian không còn sớm nữa, tôi phải đi rồi.' }
      },
      {
        meaningVi: 'Đọc là dé (thanh 2): Đạt được, nhận được giải thưởng hoặc điểm số',
        example: { zh: '他在比赛中得了一等奖。', pinyin: 'Tā zài bǐsài zhōng dé le yī děng jiǎng.', vi: 'Anh ấy đã đạt giải nhất trong cuộc thi.' }
      }
    ],
    examples: [
      {
        zh: '你得认真准备才能取得好成绩。',
        pinyin: 'Nǐ děi rènzhēn zhǔnbèi cái néng qǔdé hǎo chéngjì.',
        vi: 'Bạn phải chuẩn bị nghiêm túc thì mới có thể đạt được thành tích tốt.',
        context: 'Khuyên nhủ'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- CẶP TỪ DỄ LẪN LỘN (MAI / MAI, ER / LIANG, GANG / GANGCAI) ---
  {
    id: 'dict_mai_buy',
    simplified: '买',
    traditional: '買',
    pinyin: 'mǎi',
    pinyinClean: 'mai',
    meaningVi: 'mua (thanh 3, đầu chữ có dấu móc lượn vào)',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '乙 / 乛',
    strokeCount: 6,
    antonyms: ['卖 (mài - bán)'],
    collocations: ['买东西', '买单', '购买'],
    confusingWords: [
      {
        word: '卖',
        pinyin: 'mài',
        differenceVi: 'Mang nghĩa "bán" (thanh 4 dứt khoát, trên đầu có dấu chữ thập 十 biểu thị xuất hàng ra ngoài). Mẹo: Mua thanh 3 (mǎi) - Bán thanh 4 (mài).',
        exampleZh: '这家商店不卖水果。',
        exampleVi: 'Cửa hàng này không bán hoa quả.'
      }
    ],
    examples: [
      {
        zh: '我想去超市买点儿新鲜水果。',
        pinyin: 'Wǒ xiǎng qù chāoshì mǎi diǎnr xīnxiān shuǐguǒ.',
        vi: 'Tôi muốn đi siêu thị mua một ít hoa quả tươi.',
        context: 'Mua sắm'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_mai_sell',
    simplified: '卖',
    traditional: '賣',
    pinyin: 'mài',
    pinyinClean: 'mai',
    meaningVi: 'bán (thanh 4, trên đầu có bộ 十)',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '十 (Thập)',
    strokeCount: 8,
    antonyms: ['买 (mǎi - mua)'],
    collocations: ['卖完', '卖东西', '专卖店'],
    examples: [
      {
        zh: '这双鞋子已经卖完了。',
        pinyin: 'Zhè shuāng xiézi yǐjīng mài wán le.',
        vi: 'Đôi giày này đã bán hết sạch rồi.',
        context: 'Hỏi mua hàng'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_er_two',
    simplified: '二',
    traditional: '二',
    pinyin: 'èr',
    pinyinClean: 'er',
    meaningVi: 'hai, số 2 (dùng đếm số thứ tự, số điện thoại, phép tính)',
    wordType: 'Số từ',
    hskLevel: 1,
    radical: '二 (Nhị)',
    strokeCount: 2,
    confusingWords: [
      {
        word: '两',
        pinyin: 'liǎng',
        differenceVi: 'Dùng trước lượng từ chỉ số lượng cụ thể (hai cái, hai người: 两个人, 两本书), không dùng khi đếm số thứ tự 1, 2, 3.',
        exampleZh: '我们有两个人。',
        exampleVi: 'Chúng tôi có hai người.'
      }
    ],
    examples: [
      {
        zh: '一、二、三，请看镜头！',
        pinyin: 'Yī, èr, sān, qǐng kàn jìngtóu!',
        vi: 'Một, hai, ba, xin hãy nhìn vào ống kính!',
        context: 'Đếm số chụp ảnh'
      },
      {
        zh: '第二课的内容很有趣。',
        pinyin: 'Dì èr kè de nèiróng hěn yǒuqù.',
        vi: 'Nội dung bài thứ hai rất thú vị.',
        context: 'Số thứ tự'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_liang_two',
    simplified: '两',
    traditional: '兩',
    pinyin: 'liǎng',
    pinyinClean: 'liang',
    meaningVi: 'hai, một đôi (dùng trước lượng từ)',
    wordType: 'Số từ',
    hskLevel: 1,
    radical: '一 (Nhất)',
    strokeCount: 7,
    collocations: ['两个人', '两个星期', '两次', '两千'],
    examples: [
      {
        zh: '服务员，请给我来两杯咖啡。',
        pinyin: 'Fúwùyuán, qǐng gěi wǒ lái liǎng bēi kāfēi.',
        vi: 'Phục vụ ơi, làm ơn cho tôi hai tách cà phê.',
        context: 'Gọi đồ uống'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_gang',
    simplified: '刚',
    traditional: '剛',
    pinyin: 'gāng',
    pinyinClean: 'gang',
    meaningVi: 'vừa mới (phó từ chỉ thời gian gần, đứng ngay trước động từ)',
    wordType: 'Phó từ',
    hskLevel: 3,
    radical: '刂 (Đao)',
    strokeCount: 6,
    collocations: ['刚到', '刚开始', '刚刚'],
    confusingWords: [
      {
        word: '刚才',
        pinyin: 'gāng cái',
        differenceVi: 'Là danh từ chỉ thời gian (vừa nãy, lúc nãy), có thể đứng trước hoặc sau chủ ngữ, có thể làm định ngữ (刚才的事情).',
        exampleZh: '刚才你去哪儿了？',
        exampleVi: 'Lúc nãy bạn đi đâu thế?'
      }
    ],
    examples: [
      {
        zh: '我刚到北京，天气很舒服。',
        pinyin: 'Wǒ gāng dào Běijīng, tiānqì hěn shūfu.',
        vi: 'Tôi vừa mới đến Bắc Kinh, thời tiết rất dễ chịu.',
        context: 'Thông báo'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_gangcai',
    simplified: '刚才',
    traditional: '剛才',
    pinyin: 'gāng cái',
    pinyinClean: 'gangcai',
    meaningVi: 'vừa nãy, lúc nãy (danh từ chỉ thời gian)',
    wordType: 'Danh từ thời gian',
    hskLevel: 3,
    radical: '刂 / 一',
    strokeCount: 9,
    examples: [
      {
        zh: '刚才有人给你打了一个电话。',
        pinyin: 'Gāngcái yǒurén gěi nǐ dǎ le yí gè diànhuà.',
        vi: 'Vừa nãy có người gọi điện thoại cho bạn đấy.',
        context: 'Nhắn lại'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- CẢM XÚC & SUY NGHĨ (JUEDE / RENWEI) ---
  {
    id: 'dict_juede',
    simplified: '觉得',
    traditional: '覺得',
    pinyin: 'jué de',
    pinyinClean: 'juede',
    meaningVi: 'cảm thấy, thấy rằng (cảm nhận trực giác, quan điểm cá nhân)',
    wordType: 'Động từ',
    hskLevel: 2,
    radical: '见 / 彳',
    strokeCount: 20,
    synonyms: ['感到', '认为'],
    collocations: ['我觉得', '觉得累', '觉得冷'],
    confusingWords: [
      {
        word: '认为',
        pinyin: 'rèn wéi',
        differenceVi: 'Sắc thái trang trọng và lý tính hơn, được rút ra sau khi suy xét cẩn trọng hoặc có lập luận phân tích.',
        exampleZh: '专家认为这个方案是可行的。',
        exampleVi: 'Các chuyên gia cho rằng phương án này là khả thi.'
      }
    ],
    examples: [
      {
        zh: '你觉得这道中国菜味道怎么样？',
        pinyin: 'Nǐ juéde zhè dào zhōngguó cài wèidào zěnmeyàng?',
        vi: 'Bạn cảm thấy mùi vị món ăn Trung Quốc này như thế nào?',
        context: 'Hỏi cảm nhận'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_renwei',
    simplified: '认为',
    traditional: '認為',
    pinyin: 'rèn wéi',
    pinyinClean: 'renwei',
    meaningVi: 'cho rằng, nhận định rằng (lý tính, trang trọng)',
    wordType: 'Động từ',
    hskLevel: 3,
    radical: '讠 (Ngôn)',
    strokeCount: 8,
    examples: [
      {
        zh: '我们认为健康比金钱更加宝贵。',
        pinyin: 'Wǒmen rènwéi jiànkāng bǐ jīnqián gèngjiā bǎoguì.',
        vi: 'Chúng tôi cho rằng sức khỏe quý giá hơn tiền bạc rất nhiều.',
        context: 'Quan điểm triết lý'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- TỪ CHỈ MỨC ĐỘ (YIDIANR / YOUDIANR) ---
  {
    id: 'dict_yidianr',
    simplified: '一点儿',
    traditional: '一點兒',
    pinyin: 'yī diǎnr',
    pinyinClean: 'yidianr',
    meaningVi: 'một chút, một ít (đứng sau tính từ hoặc trước danh từ)',
    wordType: 'Cụm từ / Số lượng từ',
    hskLevel: 2,
    radical: '一 (Nhất)',
    strokeCount: 11,
    collocations: ['快一点儿', '吃一点儿', '懂一点儿'],
    confusingWords: [
      {
        word: '有点儿',
        pinyin: 'yǒu diǎnr',
        differenceVi: 'Đứng trước tính từ hoặc động từ tâm lý, thường mang sắc thái tiêu cực, không như ý muốn (hơi mệt, hơi đắt, hơi khó).',
        exampleZh: '这件毛衣有点儿贵。',
        exampleVi: 'Chiếc áo len này hơi đắt (ý chê).'
      }
    ],
    examples: [
      {
        zh: '请说得慢一点儿，我刚学中文。',
        pinyin: 'Qǐng shuō de màn yìdiǎnr, wǒ gāng xué zhōngwén.',
        vi: 'Xin hãy nói chậm lại một chút, tôi vừa mới học tiếng Trung.',
        context: 'Giao tiếp'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_youdianr',
    simplified: '有点儿',
    traditional: '有點兒',
    pinyin: 'yǒu diǎnr',
    pinyinClean: 'youdianr',
    meaningVi: 'hơi, có chút (thường mang sắc thái không vừa ý, đứng trước tính từ)',
    wordType: 'Phó từ',
    hskLevel: 2,
    radical: '月 / 丶',
    strokeCount: 15,
    collocations: ['有点儿累', '有点儿贵', '有点儿冷', '有点儿难'],
    examples: [
      {
        zh: '今天工作了一整天，我现在有点儿累。',
        pinyin: 'Jīntiān gōngzuò le yì zhěng tiān, wǒ xiànzài yǒudiǎnr lèi.',
        vi: 'Hôm nay làm việc cả ngày ròng, bây giờ tôi thấy hơi mệt.',
        context: 'Thể hiện tâm trạng'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },

  // --- CÁC TỪ CƠ BẢN THƯỜNG DÙNG ---
  {
    id: 'dict_nihao',
    simplified: '你好',
    traditional: '你好',
    pinyin: 'nǐ hǎo',
    pinyinClean: 'nihao',
    meaningVi: 'xin chào',
    wordType: 'Thán từ chào hỏi',
    hskLevel: 1,
    radical: '亻 / 女',
    strokeCount: 13,
    characterDecomposition: '你 (亻 + 尔) + 好 (女 + 子)',
    synonyms: ['您好 (nínhǎo - kính trọng)'],
    collocations: ['你好吗', '向你问好'],
    examples: [
      {
        zh: '你好！很高兴在这里见到你。',
        pinyin: 'Nǐ hǎo! Hěn gāoxìng zài zhèlǐ jiàn dào nǐ.',
        vi: 'Xin chào! Rất vui được gặp bạn ở đây.',
        context: 'Gặp gỡ'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_xiexie',
    simplified: '谢谢',
    traditional: '謝謝',
    pinyin: 'xiè xie',
    pinyinClean: 'xiexie',
    meaningVi: 'cảm ơn',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '讠 (Ngôn)',
    strokeCount: 24,
    characterDecomposition: '谢 (讠 + 身 + 寸) x2',
    synonyms: ['感谢', '多谢'],
    antonyms: ['不客气 (đáp lại lời cảm ơn)'],
    examples: [
      {
        zh: '非常感谢你的热情帮助！',
        pinyin: 'Fēicháng gǎnxiè nǐ de rèqíng bāngzhù!',
        vi: 'Vô cùng cảm ơn sự giúp đỡ nhiệt tình của bạn!',
        context: 'Cảm kích'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_zaijian',
    simplified: '再见',
    traditional: '再見',
    pinyin: 'zài jiàn',
    pinyinClean: 'zaijian',
    meaningVi: 'tạm biệt (hẹn gặp lại)',
    wordType: 'Động từ',
    hskLevel: 1,
    radical: '冂 / 见',
    strokeCount: 10,
    characterDecomposition: '再 (lần nữa) + 见 (gặp)',
    synonyms: ['拜拜', '明天见'],
    examples: [
      {
        zh: '时间不早了，我们明天见，再见！',
        pinyin: 'Shíjiān bù zǎo le, wǒmen míngtiān jiàn, zàijiàn!',
        vi: 'Không còn sớm nữa rồi, mai chúng ta gặp lại, tạm biệt nhé!',
        context: 'Chia tay'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_pengyou',
    simplified: '朋友',
    traditional: '朋友',
    pinyin: 'péng you',
    pinyinClean: 'pengyou',
    meaningVi: 'bạn bè, người bạn',
    wordType: 'Danh từ',
    hskLevel: 1,
    radical: '月 / 又',
    strokeCount: 12,
    characterDecomposition: '朋 (月 + 月) + 友 (𠂇 + 又)',
    measureWords: '个 (cái/người), 位 (vị - lịch sự)',
    collocations: ['好朋友', '老朋友', '交朋友', '男朋友', '女朋友'],
    examples: [
      {
        zh: '有朋自远方来，不亦乐乎？',
        pinyin: 'Yǒu péng zì yuǎnfāng lái, bù yì yuè hū?',
        vi: 'Có bạn từ phương xa tới thăm, chẳng phải vui mừng lắm sao?',
        context: 'Luận Ngữ Khổng Tử'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_zhongguo',
    simplified: '中国',
    traditional: '中國',
    pinyin: 'zhōng guó',
    pinyinClean: 'zhongguo',
    meaningVi: 'Trung Quốc',
    wordType: 'Danh từ riêng',
    hskLevel: 1,
    radical: '丨 / 囗',
    strokeCount: 12,
    characterDecomposition: '中 (Khảm chính giữa) + 国 (囗 bảo vệ bên ngoài, 玉 ngọc bên trong)',
    collocations: ['中国人', '中国菜', '去中国', '中国文化'],
    examples: [
      {
        zh: '我想去中国留学学习汉语。',
        pinyin: 'Wǒ xiǎng qù zhōngguó liúxué xuéxí hànyǔ.',
        vi: 'Tôi muốn sang Trung Quốc du học để học tiếng Hán.',
        context: 'Ước mơ học tập'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_gongzuo',
    simplified: '工作',
    traditional: '工作',
    pinyin: 'gōng zuò',
    pinyinClean: 'gongzuo',
    meaningVi: 'làm việc, công việc',
    wordType: 'Động từ / Danh từ',
    hskLevel: 1,
    radical: '工 / 亻',
    strokeCount: 10,
    measureWords: '份 (phần/công việc)',
    collocations: ['找工作', '工作认真', '工作经验', '工作压力'],
    examples: [
      {
        zh: '他每天努力工作，希望早点儿买房子。',
        pinyin: 'Tā měitiān nǔlì gōngzuò, xīwàng zǎo diǎnr mǎi fángzi.',
        vi: 'Anh ấy nỗ lực làm việc mỗi ngày, hy vọng sớm mua được nhà.',
        context: 'Cuộc sống'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_tianqi',
    simplified: '天气',
    traditional: '天氣',
    pinyin: 'tiān qì',
    pinyinClean: 'tianqi',
    meaningVi: 'thời tiết',
    wordType: 'Danh từ',
    hskLevel: 1,
    radical: '大 / 气',
    strokeCount: 8,
    collocations: ['天气好', '天气预报', '天气冷', '天气热'],
    examples: [
      {
        zh: '今天天气晴朗，非常适合出去散步。',
        pinyin: 'Jīntiān tiānqì qínglǎng, fēicháng shìhé chūqù sànbù.',
        vi: 'Hôm nay thời tiết nắng ráo trong xanh, rất thích hợp ra ngoài đi dạo.',
        context: 'Thời tiết'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  },
  {
    id: 'dict_shijian',
    simplified: '时间',
    traditional: '時間',
    pinyin: 'shí jiān',
    pinyinClean: 'shijian',
    meaningVi: 'thời gian',
    wordType: 'Danh từ',
    hskLevel: 2,
    radical: '日 / 门',
    strokeCount: 14,
    collocations: ['有时间', '没时间', '浪费时间', '时间宝贵'],
    examples: [
      {
        zh: '一寸光阴一寸金，寸金难买寸光阴。',
        pinyin: 'Yí cùn guāngyīn yí cùn jīn, cùn jīn nán mǎi cùn guāngyīn.',
        vi: 'Tấc bóng thời gian tấc vàng ròng, tấc vàng khó mua tấc thời gian.',
        context: 'Châm ngôn quý trọng thời gian'
      }
    ],
    source: 'standard_hsk_cedict',
    version: '1.0'
  }
];

/**
 * Thuật toán Phân đoạn Từ Tiếng Trung (Forward Maximum Matching - FMM Tokenizer)
 * Tách câu tiếng Trung thành các từ có nghĩa dựa trên từ điển cục bộ,
 * giúp người học có thể bấm chọn từ chính xác để tra cứu nhanh trên toàn ứng dụng.
 */
export function tokenizeChinese(
  text: string,
  customDictWords?: Set<string>
): Array<{ token: string; pinyin?: string; inDictionary: boolean }> {
  if (!text) return [];

  // Tập hợp các từ tiếng Trung có trong từ điển hạt giống + từ truyền vào
  const dictSet = new Set<string>(customDictWords || []);
  for (const entry of SEED_DICTIONARY_ENTRIES) {
    dictSet.add(entry.simplified);
    if (entry.traditional) dictSet.add(entry.traditional);
  }

  // Thêm một số từ nối, đại từ, liên từ, danh từ tiếng Trung quen thuộc
  const commonTokens = [
    '我们', '你们', '他们', '她们', '它们', '什么', '怎么', '为什么', '哪里', '这里', '那里',
    '虽然', '但是', '因为', '所以', '如果', '不仅', '而且', '或者', '还是', '正在', '已经',
    '非常', '特别', '一起', '一直', '马上', '当然', '可能', '应该', '必须', '总是',
    '中文', '汉语', '普通话', '学校', '老师', '学生', '每天', '努力', '中国', '朋友', '今天', '明天', '昨天', '东西'
  ];
  for (const tok of commonTokens) dictSet.add(tok);

  const tokens: Array<{ token: string; pinyin?: string; inDictionary: boolean }> = [];
  const maxWordLen = 6;
  let i = 0;

  while (i < text.length) {
    // Ký tự dấu câu, khoảng trắng, số hoặc tiếng Anh
    const char = text[i];
    if (/[.,?!，。？！、\s\d\w:;"'“”‘’（）()]/.test(char)) {
      tokens.push({ token: char, inDictionary: false });
      i++;
      continue;
    }

    // Forward Maximum Matching
    let matched = false;
    const remainingLen = text.length - i;
    const checkLen = Math.min(maxWordLen, remainingLen);

    for (let len = checkLen; len >= 2; len--) {
      const candidate = text.substring(i, i + len);
      if (dictSet.has(candidate)) {
        tokens.push({ token: candidate, inDictionary: true });
        i += len;
        matched = true;
        break;
      }
    }

    // Nếu không khớp từ ghép nào, nhận từng ký tự đơn
    if (!matched) {
      const singleChar = text[i];
      const inDict = dictSet.has(singleChar) || SEED_DICTIONARY_ENTRIES.some(e => e.simplified === singleChar);
      tokens.push({ token: singleChar, inDictionary: inDict });
      i++;
    }
  }

  return tokens;
}
