export interface ReadingSentenceItem {
  id: string;
  sentenceIndex: number;
  paragraphIndex?: number;
  sentenceZh: string;
  sentencePinyin: string;
  sentenceVi: string;
  grammarNotes?: string[];
}

export interface ReadingVocabFocus {
  simplified: string;
  pinyin: string;
  meaningVi: string;
  hskLevel: number;
  isNewWord?: boolean;
}

export interface ReadingGrammarFocus {
  pattern: string;
  formula: string;
  explanationVi: string;
  exampleSentence: string;
}

export interface ReadingComprehensionQuestion {
  id: string;
  type: 'single_choice' | 'true_false' | 'fill_blank' | 'free_text_zh' | 'free_text_vi' | 'main_idea';
  question: string;
  options?: string[];
  answer: string | number; // option index (0..3) or text answer
  explanationVi: string;
  citationText: string;
}

export interface ReadingPassageItem {
  id: string;
  titleZh: string;
  titlePinyin: string;
  titleVi: string;
  level: 'beginner' | 'hsk1' | 'hsk2' | 'hsk3' | 'hsk4' | 'hsk5' | 'hsk6' | 'advanced';
  hskLevel: number;
  standardVersion: string;
  topic:
    | 'daily_life'
    | 'family'
    | 'school'
    | 'work'
    | 'shopping'
    | 'travel'
    | 'food'
    | 'culture'
    | 'history'
    | 'science'
    | 'technology'
    | 'society'
    | 'idioms_stories'
    | 'short_story';
  genre:
    | 'short_passage'
    | 'dialogue'
    | 'story'
    | 'simple_article'
    | 'narrative'
    | 'diary'
    | 'academic';
  difficultyRating: number;
  wordCount: number;
  estimatedReadingMinutes: number;
  fullContentZh: string;
  fullContentPinyin: string;
  fullContentVi: string;
  paragraphs: string[];
  sentences: ReadingSentenceItem[];
  vocabularyFocus: ReadingVocabFocus[];
  grammarFocus: ReadingGrammarFocus[];
  comprehensionQuestions: ReadingComprehensionQuestion[];
  learningObjectives: string[];
  source?: 'curated_standard' | 'gemini_ai_personalized';
  contentVersion?: number;
}

export const SEED_READING_PASSAGES: ReadingPassageItem[] = [
  // 1. Beginner / HSK 1 - Daily Life
  {
    id: 'reading_hsk1_friend',
    titleZh: '我的中国朋友',
    titlePinyin: 'Wǒ de Zhōngguó péngyou',
    titleVi: 'Người bạn Trung Quốc của tôi',
    level: 'hsk1',
    hskLevel: 1,
    standardVersion: 'Tiêu chuẩn HSK 3.0 Cấp 1 (Tham chiếu HSK 2.0)',
    topic: 'daily_life',
    genre: 'short_passage',
    difficultyRating: 1.2,
    wordCount: 52,
    estimatedReadingMinutes: 2,
    fullContentZh:
      '我有一个好朋友，他叫李明。他是中国人，今年二十岁。李明很喜欢学习英语，我也喜欢学习汉语。我们常常一起去图书馆看书，一起喝茶。',
    fullContentPinyin:
      'Wǒ yǒu yí gè hǎo péngyou, tā jiào Lǐ Míng. Tā shì Zhōngguó rén, jīnnián èrshí suì. Lǐ Míng hěn xǐhuan xuéxí Yīngyǔ, wǒ yě xǐhuan xuéxí Hànyǔ. Wǒmen chángcháng yìqǐ qù túshūguǎn kàn shū, yìqǐ hē chá.',
    fullContentVi:
      'Tôi có một người bạn tốt, anh ấy tên là Lý Minh. Anh ấy là người Trung Quốc, năm nay hai mươi tuổi. Lý Minh rất thích học tiếng Anh, tôi cũng thích học tiếng Trung. Chúng tôi thường cùng nhau đến thư viện đọc sách, cùng nhau uống trà.',
    paragraphs: [
      '我有一个好朋友，他叫李明。他是中国人，今年二十岁。李明很喜欢学习英语，我也喜欢学习汉语。我们常常一起去图书馆看书，一起喝茶。',
    ],
    sentences: [
      {
        id: 'reading_hsk1_friend_s1',
        sentenceIndex: 0,
        sentenceZh: '我有一个好朋友，他叫李明。',
        sentencePinyin: 'Wǒ yǒu yí gè hǎo péngyou, tā jiào Lǐ Míng.',
        sentenceVi: 'Tôi có một người bạn tốt, anh ấy tên là Lý Minh.',
        grammarNotes: ['Đại từ sở hữu 的 (wǒ de péngyou)', 'Động từ 有 (có)'],
      },
      {
        id: 'reading_hsk1_friend_s2',
        sentenceIndex: 1,
        sentenceZh: '他是中国人，今年二十岁。',
        sentencePinyin: 'Tā shì Zhōngguó rén, jīnnián èrshí suì.',
        sentenceVi: 'Anh ấy là người Trung Quốc, năm nay hai mươi tuổi.',
        grammarNotes: ['Câu chữ 是 (tā shì...)', 'Diễn đạt tuổi tác không cần 是 (èrshí suì)'],
      },
      {
        id: 'reading_hsk1_friend_s3',
        sentenceIndex: 2,
        sentenceZh: '李明很喜欢学习英语，我也喜欢学习汉语。',
        sentencePinyin: 'Lǐ Míng hěn xǐhuan xuéxí Yīngyǔ, wǒ yě xǐhuan xuéxí Hànyǔ.',
        sentenceVi: 'Lý Minh rất thích học tiếng Anh, tôi cũng thích học tiếng Trung.',
        grammarNotes: ['Phó từ mức độ 很 (hěn xǐhuan)', 'Phó từ 也 (cũng)'],
      },
      {
        id: 'reading_hsk1_friend_s4',
        sentenceIndex: 3,
        sentenceZh: '我们常常一起去图书馆看书，一起喝茶。',
        sentencePinyin: 'Wǒmen chángcháng yìqǐ qù túshūguǎn kàn shū, yìqǐ hē chá.',
        sentenceVi: 'Chúng tôi thường cùng nhau đến thư viện đọc sách, cùng nhau uống trà.',
        grammarNotes: ['Phó từ tần suất 常常 (thường xuyên)', 'Phó từ 一起 (cùng nhau)'],
      },
    ],
    vocabularyFocus: [
      { simplified: '朋友', pinyin: 'péngyou', meaningVi: 'bạn bè', hskLevel: 1 },
      { simplified: '学习', pinyin: 'xuéxí', meaningVi: 'học tập', hskLevel: 1 },
      { simplified: '图书馆', pinyin: 'túshūguǎn', meaningVi: 'thư viện', hskLevel: 2, isNewWord: true },
      { simplified: '常常', pinyin: 'chángcháng', meaningVi: 'thường xuyên', hskLevel: 1 },
    ],
    grammarFocus: [
      {
        pattern: '一起 + Động từ (Làm việc gì cùng nhau)',
        formula: 'Chủ ngữ + 一起 + Động từ + Tân ngữ',
        explanationVi: 'Dùng để biểu thị các đối tượng cùng tiến hành một hoạt động.',
        exampleSentence: '我们常常一起去图书馆看书。(Chúng tôi thường cùng nhau đến thư viện đọc sách.)',
      },
    ],
    comprehensionQuestions: [
      {
        id: 'q_hsk1_friend_1',
        type: 'single_choice',
        question: '李明今年多大？(Lý Minh năm nay bao nhiêu tuổi?)',
        options: ['十八岁 (18 tuổi)', '二十岁 (20 tuổi)', '二十二岁 (22 tuổi)', '三十岁 (30 tuổi)'],
        answer: 1,
        explanationVi: 'Trong bài có câu: "他是中国人，今年二十岁。" nên đáp án là 20 tuổi.',
        citationText: '他是中国人，今年二十岁。',
      },
      {
        id: 'q_hsk1_friend_2',
        type: 'true_false',
        question: '李明不喜欢学习英语。(Lý Minh không thích học tiếng Anh.)',
        options: ['Đúng (正确)', 'Sai (错误)'],
        answer: 1,
        explanationVi: 'Bài nêu rõ: "李明很喜欢学习英语", do đó nhận định này là Sai.',
        citationText: '李明很喜欢学习英语',
      },
      {
        id: 'q_hsk1_friend_3',
        type: 'free_text_vi',
        question: 'Hai người bạn thường làm những việc gì cùng nhau tại thư viện?',
        answer: 'Đọc sách và uống trà',
        explanationVi: 'Bài đọc viết: "我们常常一起去图书馆看书，一起喝茶。"',
        citationText: '我们常常一起去图书馆看书，一起喝茶。',
      },
    ],
    learningObjectives: [
      'Nắm vững cách giới thiệu người bạn bằng tiếng Trung.',
      'Sử dụng thành thạo phó từ 也 và 一起.',
      'Hiểu rõ câu miêu tả thói quen hằng ngày.',
    ],
    source: 'curated_standard',
    contentVersion: 1,
  },

  // 2. HSK 2 - Food & Dialogue
  {
    id: 'reading_hsk2_restaurant',
    titleZh: '在饭馆点菜',
    titlePinyin: 'Zài fànguǎn diǎncài',
    titleVi: 'Gọi món tại nhà hàng Trung Quốc',
    level: 'hsk2',
    hskLevel: 2,
    standardVersion: 'Tiêu chuẩn HSK 3.0 Cấp 2 (Tham chiếu HSK 2.0)',
    topic: 'food',
    genre: 'dialogue',
    difficultyRating: 2.0,
    wordCount: 88,
    estimatedReadingMinutes: 3,
    fullContentZh:
      '服务员：两位好，请问你们想吃点儿什么？\n王明：请给我们一份菜单。你们这里有什么特色菜？\n服务员：北京烤鸭和宫保鸡丁非常有名，很多客人都喜欢。\n李华：那我们要一只烤鸭，一份宫保鸡丁，再来两碗米饭。\n服务员：好的，请问喝什么饮料？\n王明：请给我们一壶热茉莉花茶，谢谢！',
    fullContentPinyin:
      'Fúwùyuán: Liǎng wèi hǎo, qǐngwèn nǐmen xiǎng chī diǎnr shénme?\nWáng Míng: Qǐng gěi wǒmen yí fèn càidān. Nǐmen zhèlǐ yǒu shénme tèsè cài?\nFúwùyuán: Běijīng kǎoyā hé Gōngbǎo jīdīng fēicháng yǒumíng, hěn duō kèrén dōu xǐhuan.\nLǐ Huá: Nà wǒmen yào yì zhī kǎoyā, yí fèn Gōngbǎo jīdīng, zài lái liǎng wǎn mǐfàn.\nFúwùyuán: Hǎo de, qǐngwèn hē shénme yǐnliào?\nWáng Míng: Qǐng gěi wǒmen yì hú rè mòlìhuā chá, xièxie!',
    fullContentVi:
      'Phục vụ: Xin chào hai vị, xin hỏi hai vị muốn dùng món gì ạ?\nVương Minh: Xin cho chúng tôi một cuốn thực đơn. Ở đây có món đặc sản gì thế?\nPhục vụ: Vịt quay Bắc Kinh và Gà xào Cung Bảo rất nổi tiếng, nhiều khách đều thích.\nLý Hoa: Vậy cho chúng tôi một con vịt quay, một phần gà Cung Bảo, thêm hai bát cơm trắng nữa nhé.\nPhục vụ: Vâng ạ, xin hỏi hai vị uống đồ uống gì?\nVương Minh: Xin cho chúng tôi một ấm trà lài nóng, cảm ơn!',
    paragraphs: [
      '服务员：两位好，请问你们想吃点儿什么？',
      '王明：请给我们一份菜单。你们这里有什么特色菜？',
      '服务员：北京烤鸭和宫保鸡丁非常有名，很多客人都喜欢。',
      '李华：那我们要一只烤鸭，一份宫保鸡丁，再来两碗米饭。',
      '服务员：好的，请问喝什么饮料？',
      '王明：请给我们一壶热茉莉花茶，谢谢！',
    ],
    sentences: [
      {
        id: 'reading_hsk2_res_s1',
        sentenceIndex: 0,
        sentenceZh: '两位好，请问你们想吃点儿什么？',
        sentencePinyin: 'Liǎng wèi hǎo, qǐngwèn nǐmen xiǎng chī diǎnr shénme?',
        sentenceVi: 'Xin chào hai vị, xin hỏi hai vị muốn dùng món gì ạ?',
        grammarNotes: ['Lượng từ lịch sự 位 (liǎng wèi)', 'Cấu trúc 请问 (xin hỏi)'],
      },
      {
        id: 'reading_hsk2_res_s2',
        sentenceIndex: 1,
        sentenceZh: '请给我们一份菜单，你们这里有什么特色菜？',
        sentencePinyin: 'Qǐng gěi wǒmen yí fèn càidān, nǐmen zhèlǐ yǒu shénme tèsè cài?',
        sentenceVi: 'Xin cho chúng tôi một cuốn thực đơn, ở đây có món đặc sản gì thế?',
        grammarNotes: ['Câu cầu khiến với 给 (gěi wǒmen...)', 'Lượng từ 份 (yí fèn)'],
      },
      {
        id: 'reading_hsk2_res_s3',
        sentenceIndex: 2,
        sentenceZh: '北京烤鸭和宫保鸡丁非常有名，很多客人都喜欢。',
        sentencePinyin: 'Běijīng kǎoyā hé Gōngbǎo jīdīng fēicháng yǒumíng, hěn duō kèrén dōu xǐhuan.',
        sentenceVi: 'Vịt quay Bắc Kinh và Gà xào Cung Bảo rất nổi tiếng, nhiều khách đều thích.',
        grammarNotes: ['Liên từ 和 (hé)', 'Phó từ phạm vi 都 (dōu xǐhuan)'],
      },
      {
        id: 'reading_hsk2_res_s4',
        sentenceIndex: 3,
        sentenceZh: '我们要一只烤鸭，一份宫保鸡丁，再来两碗米饭。',
        sentencePinyin: 'Wǒmen yào yì zhī kǎoyā, yí fèn Gōngbǎo jīdīng, zài lái liǎng wǎn mǐfàn.',
        sentenceVi: 'Chúng tôi lấy một con vịt quay, một phần gà Cung Bảo, thêm hai bát cơm trắng.',
        grammarNotes: ['Động từ gọi món 要 (yào)', 'Phó từ 再来 (thêm nữa)'],
      },
      {
        id: 'reading_hsk2_res_s5',
        sentenceIndex: 4,
        sentenceZh: '请给我们一壶热茉莉花茶，谢谢！',
        sentencePinyin: 'Qǐng gěi wǒmen yì hú rè mòlìhuā chá, xièxie!',
        sentenceVi: 'Xin cho chúng tôi một ấm trà lài nóng, cảm ơn!',
        grammarNotes: ['Lượng từ ấm 壶 (yì hú)', 'Tính từ làm định ngữ 热 (rè chá)'],
      },
    ],
    vocabularyFocus: [
      { simplified: '服务员', pinyin: 'fúwùyuán', meaningVi: 'nhân viên phục vụ', hskLevel: 2 },
      { simplified: '菜单', pinyin: 'càidān', meaningVi: 'thực đơn', hskLevel: 2 },
      { simplified: '有名', pinyin: 'yǒumíng', meaningVi: 'nổi tiếng', hskLevel: 2 },
      { simplified: '烤鸭', pinyin: 'kǎoyā', meaningVi: 'vịt quay', hskLevel: 3, isNewWord: true },
    ],
    grammarFocus: [
      {
        pattern: '再来 + Số lượng + Danh từ (Gọi thêm món)',
        formula: '再来 + Số từ + Lượng từ + Danh từ',
        explanationVi: 'Khẩu ngữ gọi món thường dùng "再来" để yêu cầu mang thêm đồ ăn hoặc đồ uống.',
        exampleSentence: '再来两碗米饭。(Cho thêm hai bát cơm nữa.)',
      },
    ],
    comprehensionQuestions: [
      {
        id: 'q_hsk2_res_1',
        type: 'single_choice',
        question: '服务员推荐了什么菜？(Phục vụ đã giới thiệu những món ăn nào?)',
        options: [
          '饺子和牛肉面 (Sủi cảo và mì bò)',
          '北京烤鸭和宫保鸡丁 (Vịt quay Bắc Kinh và Gà Cung Bảo)',
          '火锅和炒饭 (Lẩu và cơm chiên)',
          '鱼香肉丝和春卷 (Thịt băm hương cá và nem rán)',
        ],
        answer: 1,
        explanationVi: 'Phục vụ nói: "北京烤鸭和宫保鸡丁非常有名".',
        citationText: '北京烤鸭和宫保鸡丁非常有名，很多客人都喜欢。',
      },
      {
        id: 'q_hsk2_res_2',
        type: 'fill_blank',
        question: '他们点了两碗什么？(Họ đã gọi hai bát món gì?)',
        options: ['米饭 (Cơm)', '面条 (Mì)', '汤 (Canh)', '粥 (Cháo)'],
        answer: 0,
        explanationVi: 'Trong bài có câu: "再来两碗米饭".',
        citationText: '再来两碗米饭。',
      },
      {
        id: 'q_hsk2_res_3',
        type: 'free_text_vi',
        question: 'Hai vị khách đã gọi loại đồ uống gì và nhiệt độ thế nào?',
        answer: 'Trà hoa lài nóng (một ấm)',
        explanationVi: 'Bài đọc viết: "请给我们一壶热茉莉花茶".',
        citationText: '请给我们一壶热茉莉花茶，谢谢！',
      },
    ],
    learningObjectives: [
      'Thành thạo khẩu ngữ giao tiếp gọi món ăn tại nhà hàng.',
      'Sử dụng chính xác các lượng từ: 位, 份, 只, 碗, 壶.',
      'Vận dụng mẫu câu "再来 + Danh từ" khi đặt thêm món.',
    ],
    source: 'curated_standard',
    contentVersion: 1,
  },

  // 3. HSK 3 - Travel & Narrative
  {
    id: 'reading_hsk3_travel_beijing',
    titleZh: '我的北京旅行日记',
    titlePinyin: 'Wǒ de Běijīng lǚxíng rìjì',
    titleVi: 'Nhật ký chuyến du lịch Bắc Kinh của tôi',
    level: 'hsk3',
    hskLevel: 3,
    standardVersion: 'Tiêu chuẩn HSK 3.0 Cấp 3 (Tham chiếu HSK 2.0)',
    topic: 'travel',
    genre: 'diary',
    difficultyRating: 2.8,
    wordCount: 135,
    estimatedReadingMinutes: 4,
    fullContentZh:
      '上个周末，我和同学坐高铁去北京旅行。北京的天气非常晴朗，空气也很新鲜。第一天，我们去了故宫。故宫以前是皇帝住的地方，红色的墙和黄色的瓦非常壮观。我们在里面走了整整四个小时，拍了很多漂亮的照片。虽然脚有点儿累，但是我们心里非常高兴。晚上，我们在王府井大街品尝了正宗的老北京炸酱面，味道特别棒！',
    fullContentPinyin:
      'Shàng gè zhōumò, wǒ hé tóngxué zuò gāotiě qù Běijīng lǚxíng. Běijīng de tiānqì fēicháng qínglǎng, kōngqì yě hěn xīnxian. Dì-yī tiān, wǒmen qù le Gùgōng. Gùgōng yǐqián shì huángdì zhù de dìfang, hóngsè de qiáng hé huángsè de wǎ fēicháng zhuàngguān. Wǒmen zài lǐmiàn zǒu le zhěngzhěng sì gè xiǎoshí, pāi le hěn duō piàoliang de zhàopiàn. Suīrán jiǎo yǒudiǎnr lèi, dànshì wǒmen xīnlǐ fēicháng gāoxìng. Wǎnshang, wǒmen zài Wángfǔjǐng Dàjiē pǐncháng le zhèngzōng de lǎo Běijīng zhájiàngmiàn, wèidao tèbié bàng!',
    fullContentVi:
      'Cuối tuần trước, tôi và bạn học đi tàu cao tốc đến Bắc Kinh du lịch. Thời tiết Bắc Kinh rất trong xanh, không khí cũng rất trong lành. Ngày đầu tiên, chúng tôi đến Cố Cung. Cố Cung trước đây là nơi hoàng đế sinh sống, tường màu đỏ và ngói màu vàng vô cùng hùng vĩ. Chúng tôi đi dạo bên trong suốt bốn tiếng đồng hồ, chụp rất nhiều ảnh đẹp. Mặc dù chân có chút mỏi mệt, nhưng trong lòng chúng tôi vô cùng vui sướng. Buổi tối, chúng tôi thưởng thức món mì tương đen Bắc Kinh chính hiệu tại phố Vương Phủ Tỉnh, hương vị tuyệt vời khó quên!',
    paragraphs: [
      '上个周末，我和同学坐高铁去北京旅行。北京的天气非常晴朗，空气也很新鲜。',
      '第一天，我们去了故宫。故宫以前是皇帝住的地方，红色的墙和黄色的瓦非常壮观。我们在里面走了整整四个小时，拍了很多漂亮的照片。虽然脚有点儿累，但是我们心里非常高兴。',
      '晚上，我们在王府井大街品尝了正宗的老北京炸酱面，味道特别棒！',
    ],
    sentences: [
      {
        id: 'reading_hsk3_bj_s1',
        sentenceIndex: 0,
        sentenceZh: '上个周末，我和同学坐高铁去北京旅行。',
        sentencePinyin: 'Shàng gè zhōumò, wǒ hé tóngxué zuò gāotiě qù Běijīng lǚxíng.',
        sentenceVi: 'Cuối tuần trước, tôi và bạn học đi tàu cao tốc đến Bắc Kinh du lịch.',
        grammarNotes: ['Thời gian đứng trước động từ (Shàng gè zhōumò...)', 'Phương tiện giao thông 坐 (zuò gāotiě)'],
      },
      {
        id: 'reading_hsk3_bj_s2',
        sentenceIndex: 1,
        sentenceZh: '北京的天气非常晴朗，空气也很新鲜。',
        sentencePinyin: 'Běijīng de tiānqì fēicháng qínglǎng, kōngqì yě hěn xīnxian.',
        sentenceVi: 'Thời tiết Bắc Kinh rất trong xanh, không khí cũng rất trong lành.',
        grammarNotes: ['Liên từ nối ý 也 (kōngqì yě hěn...)', 'Hình dung từ miêu tả thời tiết 晴朗'],
      },
      {
        id: 'reading_hsk3_bj_s3',
        sentenceIndex: 2,
        sentenceZh: '第一天，我们去了故宫。故宫以前是皇帝住的地方。',
        sentencePinyin: 'Dì-yī tiān, wǒmen qù le Gùgōng. Gùgōng yǐqián shì huángdì zhù de dìfang.',
        sentenceVi: 'Ngày đầu tiên, chúng tôi đã đến Cố Cung. Cố Cung trước đây là nơi hoàng đế sinh sống.',
        grammarNotes: ['Số thứ tự 第一 (dì-yī)', 'Trợ từ 的 tạo cụm danh từ định ngữ (huángdì zhù de dìfang)'],
      },
      {
        id: 'reading_hsk3_bj_s4',
        sentenceIndex: 3,
        sentenceZh: '虽然脚有点儿累，但是我们心里非常高兴。',
        sentencePinyin: 'Suīrán jiǎo yǒudiǎnr lèi, dànshì wǒmen xīnlǐ fēicháng gāoxìng.',
        sentenceVi: 'Mặc dù chân có chút mỏi mệt, nhưng trong lòng chúng tôi vô cùng vui sướng.',
        grammarNotes: ['Cặp liên từ chuyển ý 虽然……但是……', 'Phó từ 有点儿 (mang ý không hài lòng nhẹ)'],
      },
      {
        id: 'reading_hsk3_bj_s5',
        sentenceIndex: 4,
        sentenceZh: '晚上，我们在王府井大街品尝了正宗的老北京炸酱面，味道特别棒！',
        sentencePinyin: 'Wǎnshang, wǒmen zài Wángfǔjǐng Dàjiē pǐncháng le zhèngzōng de lǎo Běijīng zhájiàngmiàn, wèidao tèbié bàng!',
        sentenceVi: 'Buổi tối, chúng tôi thưởng thức món mì tương đen Bắc Kinh chính hiệu tại phố Vương Phủ Tỉnh, hương vị tuyệt vời khó quên!',
        grammarNotes: ['Giới từ địa điểm 在……大街', 'Trợ từ động thái 了 biểu thị hoàn thành'],
      },
    ],
    vocabularyFocus: [
      { simplified: '高铁', pinyin: 'gāotiě', meaningVi: 'tàu cao tốc', hskLevel: 3 },
      { simplified: '新鲜', pinyin: 'xīnxian', meaningVi: 'trong lành, tươi mới', hskLevel: 3 },
      { simplified: '故宫', pinyin: 'Gùgōng', meaningVi: 'Cố Cung / Tử Cấm Thành', hskLevel: 3 },
      { simplified: '虽然……但是……', pinyin: 'suīrán... dànshì...', meaningVi: 'mặc dù... nhưng...', hskLevel: 3 },
    ],
    grammarFocus: [
      {
        pattern: '虽然……但是…… (Liên từ biểu thị quan hệ nhượng bộ)',
        formula: '虽然 + Vế câu A, 但是 + Vế câu B',
        explanationVi: 'Dùng để nối hai vế câu có quan hệ đối lập hoặc nhượng bộ (Mặc dù A nhưng B).',
        exampleSentence: '虽然脚有点儿累，但是我们心里非常高兴。(Mặc dù chân có chút mỏi mệt, nhưng trong lòng chúng tôi vô cùng vui sướng.)',
      },
    ],
    comprehensionQuestions: [
      {
        id: 'q_hsk3_bj_1',
        type: 'single_choice',
        question: '作者和同学是怎么去北京的？(Tác giả và bạn học đi Bắc Kinh bằng phương tiện gì?)',
        options: ['坐飞机 (Đi máy bay)', '坐高铁 (Đi tàu cao tốc)', '坐公共汽车 (Đi xe buýt)', '开车 (Tự lái xe)'],
        answer: 1,
        explanationVi: 'Bài đọc viết: "上个周末，我和同学坐高铁去北京旅行。"',
        citationText: '上个周末，我和同学坐高铁去北京旅行。',
      },
      {
        id: 'q_hsk3_bj_2',
        type: 'single_choice',
        question: '他们在王府井吃了什么？(Họ đã ăn gì ở Vương Phủ Tỉnh?)',
        options: ['北京烤鸭 (Vịt quay Bắc Kinh)', '老北京炸酱面 (Mì tương đen Bắc Kinh)', '火锅 (Lẩu)', '包子 (Bánh bao)'],
        answer: 1,
        explanationVi: 'Bài đọc viết: "我们在王府井大街品尝了正宗的老北京炸酱面".',
        citationText: '我们在王府井大街品尝了正宗的老北京炸酱面，味道特别棒！',
      },
      {
        id: 'q_hsk3_bj_3',
        type: 'true_false',
        question: '故宫以前是普通老百姓住的地方。(Cố Cung trước đây là nơi dân thường sinh sống.)',
        options: ['Đúng (正确)', 'Sai (错误)'],
        answer: 1,
        explanationVi: 'Bài đọc ghi rõ Cố Cung là nơi hoàng đế ở: "故宫以前是皇帝住的地方".',
        citationText: '故宫以前是皇帝住的地方',
      },
    ],
    learningObjectives: [
      'Nắm vững cách viết nhật ký du lịch bằng tiếng Trung.',
      'Sử dụng thành thạo cấu trúc câu liên từ 虽然……但是……',
      'Mở rộng vốn từ vựng về di tích lịch sử và ẩm thực địa phương.',
    ],
    source: 'curated_standard',
    contentVersion: 1,
  },

  // 4. HSK 4 - Culture & Article
  {
    id: 'reading_hsk4_mid_autumn',
    titleZh: '中秋节与月饼的文化意义',
    titlePinyin: 'Zhōngqiūjié yǔ yuèbǐng de wénhuà yìyì',
    titleVi: 'Tết Trung Thu và ý nghĩa văn hóa của bánh Trung Thu',
    level: 'hsk4',
    hskLevel: 4,
    standardVersion: 'Tiêu chuẩn HSK 3.0 Cấp 4 (Tham chiếu HSK 2.0)',
    topic: 'culture',
    genre: 'simple_article',
    difficultyRating: 3.5,
    wordCount: 198,
    estimatedReadingMinutes: 5,
    fullContentZh:
      '农历八月十五是中国传统的节日——中秋节。因为这一天的月亮最圆、最明亮，所以中国人把圆月看作是团圆的象征。无论人们在多远的地方工作或学习，到了中秋节，大家都会尽量赶回家里与亲人团聚。吃月饼是中秋节最重要的习俗之一。月饼通常是圆形的，里面有豆沙、莲蓉或者蛋黄等各种馅料。亲朋好友之间互相赠送月饼，表达美好的祝福。正如中国古诗所写：“但愿人长久，千里共婵娟”，中秋节承载着人们对美好生活和远方亲人的深切思念。',
    fullContentPinyin:
      'Nónglì bā yuè shíwǔ shì Zhōngguó chuántǒng de jiérì —— Zhōngqiūjié. Yīnwèi zhè yì tiān de yuèliang zuì yuán, zuì míngliàng, suǒyǐ Zhōngguó rén bǎ yuányuè kànzuò shì tuányuán de xiàngzhēng. Wúlùn rénmen zài duō yuǎn de dìfang gōngzuò huò xuéxí, dào le Zhōngqiūjié, dàjiā dōu huì jǐnliàng gǎnhuí jiā lǐ yǔ qīnrén tuánjù. Chī yuèbǐng shì Zhōngqiūjié zuì zhòngyào de xísú zhī yī. Yuèbǐng tōngcháng shì yuánxíng de, lǐmiàn yǒu dòushā, liánróng huòzhě dànhuáng děng gèzhǒng xiànliào. Qīnpéng hǎoyǒu zhījiān hùxiāng zèngsòng yuèbǐng, biǎodá měihǎo de zhùfú. Zhèngrú Zhōngguó gǔshī suǒ xiě: “Dànyuàn rén chángjiǔ, qiānlǐ gòng chánjuān”, Zhōngqiūjié chéngzàizhe rénmen duì měihǎo shēnghuó hé yuǎnfāng qīnrén de shēnqiè sīniàn.',
    fullContentVi:
      'Ngày 15 tháng 8 âm lịch là một ngày lễ truyền thống của Trung Quốc - Tết Trung Thu. Bởi vì trăng vào ngày này tròn nhất và sáng nhất, nên người Trung Quốc coi vầng trăng tròn là biểu tượng của sự đoàn viên sum họp. Bất kể mọi người làm việc hay học tập ở nơi xa xôi đến đâu, đến Tết Trung Thu, ai nấy đều cố gắng trở về nhà để sum vầy bên người thân. Ăn bánh Trung Thu là một trong những phong tục quan trọng nhất của ngày Tết này. Bánh Trung Thu thường có hình tròn, bên trong chứa nhiều loại nhân như đậu đỏ, hạt sen hay lòng đỏ trứng muối. Bạn bè và người thân tặng bánh Trung Thu cho nhau để gửi gắm những lời chúc tốt đẹp nhất. Đúng như câu thơ cổ: "Nguyện người trường cửu, nghìn dặm cùng ngắm ánh trăng", Tết Trung Thu mang chở nỗi nhớ nhung sâu sắc của con người hướng về cuộc sống êm ấm và người thân nơi phương xa.',
    paragraphs: [
      '农历八月十五是中国传统的节日——中秋节。因为这一天的月亮最圆、最明亮，所以中国人把圆月看作是团圆的象征。无论人们在多远的地方工作或学习，到了中秋节，大家都会尽量赶回家里与亲人团聚。',
      '吃月饼是中秋节最重要的习俗之一。月饼通常是圆形的，里面有豆沙、莲蓉或者蛋黄等各种馅料。亲朋好友之间互相赠送月饼，表达美好的祝福。',
      '正如中国古诗所写：“但愿人长久，千里共婵娟”，中秋节承载着人们对美好生活和远方亲人的深切思念。',
    ],
    sentences: [
      {
        id: 'reading_hsk4_mid_s1',
        sentenceIndex: 0,
        sentenceZh: '农历八月十五是中国传统的节日——中秋节。',
        sentencePinyin: 'Nónglì bā yuè shíwǔ shì Zhōngguó chuántǒng de jiérì —— Zhōngqiūjié.',
        sentenceVi: 'Ngày 15 tháng 8 âm lịch là một ngày lễ truyền thống của Trung Quốc - Tết Trung Thu.',
        grammarNotes: ['Dùng dấu gạch ngang biểu thị giải thích bổ sung (破折号)'],
      },
      {
        id: 'reading_hsk4_mid_s2',
        sentenceIndex: 1,
        sentenceZh: '中国人把圆月看作是团圆的象征。',
        sentencePinyin: 'Zhōngguó rén bǎ yuányuè kànzuò shì tuányuán de xiàngzhēng.',
        sentenceVi: 'Người Trung Quốc coi vầng trăng tròn là biểu tượng của sự đoàn viên.',
        grammarNotes: ['Cấu trúc câu chữ 把: 把 + Tân ngữ + 看作 (coi... là)'],
      },
      {
        id: 'reading_hsk4_mid_s3',
        sentenceIndex: 2,
        sentenceZh: '无论人们在多远的地方工作或学习，大家都会尽量赶回家里与亲人团聚。',
        sentencePinyin: 'Wúlùn rénmen zài duō yuǎn de dìfang gōngzuò huò xuéxí, dàjiā dōu huì jǐnliàng gǎnhuí jiā lǐ yǔ qīnrén tuánjù.',
        sentenceVi: 'Bất kể mọi người ở nơi xa xôi đến đâu, ai nấy đều cố gắng trở về nhà để sum vầy bên người thân.',
        grammarNotes: ['Cặp liên từ vô điều kiện 无论……都…… (bất kể... đều...)', 'Phó từ 尽量 (cố gắng hết mức)'],
      },
      {
        id: 'reading_hsk4_mid_s4',
        sentenceIndex: 3,
        sentenceZh: '亲朋好友之间互相赠送月饼，表达美好的祝福。',
        sentencePinyin: 'Qīnpéng hǎoyǒu zhījiān hùxiāng zèngsòng yuèbǐng, biǎodá měihǎo de zhùfú.',
        sentenceVi: 'Bạn bè và người thân tặng bánh Trung Thu cho nhau để gửi gắm những lời chúc tốt đẹp.',
        grammarNotes: ['Cụm từ cố định 亲朋好友 (bà con bạn bè)', 'Phó từ tương hỗ 互相 (lẫn nhau)'],
      },
    ],
    vocabularyFocus: [
      { simplified: '象征', pinyin: 'xiàngzhēng', meaningVi: 'biểu tượng, tượng trưng', hskLevel: 4 },
      { simplified: '团聚', pinyin: 'tuánjù', meaningVi: 'sum họp, đoàn tụ', hskLevel: 4 },
      { simplified: '无论……都……', pinyin: 'wúlùn... dōu...', meaningVi: 'bất luận... đều...', hskLevel: 4 },
      { simplified: '习俗', pinyin: 'xísú', meaningVi: 'phong tục tập quán', hskLevel: 4 },
    ],
    grammarFocus: [
      {
        pattern: '无论……都…… (Liên từ vô điều kiện)',
        formula: '无论 + Đại từ nghi vấn/Phương án lựa chọn, Chủ ngữ + 都/也 + Vị ngữ',
        explanationVi: 'Biểu thị trong bất kỳ điều kiện hoặc hoàn cảnh nào thì kết quả vẫn không thay đổi.',
        exampleSentence: '无论在多远的地方，大家都会尽量赶回家。(Dù ở xa đến đâu, mọi người đều cố gắng về nhà.)',
      },
    ],
    comprehensionQuestions: [
      {
        id: 'q_hsk4_mid_1',
        type: 'single_choice',
        question: '中国人为什么把圆月看作团圆的象征？(Vì sao người Trung Quốc coi trăng tròn là biểu tượng đoàn viên?)',
        options: [
          '因为中秋节的月亮最圆、最明亮 (Vì trăng ngày Trung Thu tròn nhất, sáng nhất)',
          '因为月亮上有漂亮的嫦娥 (Vì trên cung trăng có nàng Hằng Nga xinh đẹp)',
          '因为大家都喜欢在月亮下吃晚饭 (Vì mọi người thích ăn tối dưới ánh trăng)',
          '因为八月份的天气最凉爽 (Vì thời tiết tháng 8 mát mẻ nhất)',
        ],
        answer: 0,
        explanationVi: 'Bài đọc viết: "因为这一天的月亮最圆、最明亮，所以中国人把圆月看作是团圆的象征。"',
        citationText: '因为这一天的月亮最圆、最明亮，所以中国人把圆月看作是团圆的象征。',
      },
      {
        id: 'q_hsk4_mid_2',
        type: 'main_idea',
        question: 'Bài đọc trên chủ yếu truyền tải ý nghĩa gì về Tết Trung Thu?',
        options: [
          'Giải thích cách làm các loại nhân bánh Trung Thu truyền thống',
          'Tôn vinh giá trị đoàn viên gia đình và tình cảm gắn kết thân nhân qua biểu tượng trăng tròn và bánh Trung Thu',
          'Khuyên mọi người không nên đi làm xa quê hương',
          'Giới thiệu sự tích cổ tích thần thoại về mặt trăng',
        ],
        answer: 1,
        explanationVi: 'Cốt lõi bài văn nhấn mạnh: "中秋节承载着人们对美好生活和远方亲人的深切思念" và tinh thần sum họp đoàn viên.',
        citationText: '中秋节承载着人们对美好生活和远方亲人的深切思念。',
      },
      {
        id: 'q_hsk4_mid_3',
        type: 'free_text_zh',
        question: '文中引用了哪句著名的古诗？(Đoạn văn trích dẫn câu thơ cổ nổi tiếng nào?)',
        answer: '但愿人长久，千里共婵娟',
        explanationVi: 'Đoạn văn trích dẫn thơ Tô Thức: “但愿人长久，千里共婵娟”。',
        citationText: '但愿人长久，千里共婵娟',
      },
    ],
    learningObjectives: [
      'Hiểu sâu sắc ý nghĩa văn hóa và phong tục truyền thống của Tết Trung Thu.',
      'Sử dụng thành thạo cấu trúc câu chữ 把 và cặp liên từ 无论……都……',
      'Có khả năng tóm tắt ý chính bài văn nghị luận xã hội - văn hóa.',
    ],
    source: 'curated_standard',
    contentVersion: 1,
  },

  // 5. HSK 5 - Idiom Story
  {
    id: 'reading_hsk5_idiom_rabbit',
    titleZh: '成语故事：守株待兔',
    titlePinyin: 'Chéngyǔ gùshi: Shǒuzhūdàitù',
    titleVi: 'Câu chuyện thành ngữ: Ôm cây đợi thỏ',
    level: 'hsk5',
    hskLevel: 5,
    standardVersion: 'Tiêu chuẩn HSK 3.0 Cấp 5 (Tham chiếu HSK 2.0)',
    topic: 'idioms_stories',
    genre: 'story',
    difficultyRating: 4.2,
    wordCount: 236,
    estimatedReadingMinutes: 6,
    fullContentZh:
      '战国时期，宋国有一个农夫。有一天，他正在田里辛勤地耕地，忽然看见一只飞奔的野兔惊慌失措地跑过来。野兔一不小心，重重地撞在田边的一棵大树桩上，当场折断了脖子死去了。农夫急忙跑过去，毫不费力地捡起这只又肥又大的野兔。他高兴极了，心想：“种庄稼多辛苦啊，要是每天都能白白捡到一只兔子，那该多舒服啊！”从此以后，这个农夫放下了手里的农具，不再耕作。他整天坐在树桩旁边痴痴地守着，满心希望还能有兔子撞死在这里。结果，田地荒芜了，杂草丛生，他再也没有等到第二只兔子，反而成了全天下人的笑柄。这个成语告诫人们：切不可心存侥幸，企图不劳而获；更不能把偶然事件当成必然规律。',
    fullContentPinyin:
      'Zhànguó shíqī, Sòng guó yǒu yí gè nóngfū. Yǒu yì tiān, tā zhèngzài tián lǐ xīnqín de gēngdì, hūrán kànjiàn yì zhī fēibēn de yětù jīnghuāngshīcuò de pǎoguòlái. Yětù yí bù xiǎoxīn, zhòngzhòng de zhuàng zài tiánbiān de yì kē dà shùzhuāng shàng, dāngchǎng zhéduàn le bózǐ sǐqù le. Nóngfū jímáng pǎoguòqù, háobù fèilì de jiǎnqǐ zhè zhī yòu féi yòu dà de yětù. Tā gāoxìng jíle, xīnxǐang: “Zhòng zhuāngjia duō xīnkǔ a, yàoshi měitiān dōu néng báibái jiǎndào yì zhī tùzi, nà gāi duō shūfu a!” Cóngcǐ yǐhòu, zhè gè nóngfū fàngxià le shǒu lǐ de nóngjù, búzài gēngzuò. Tā zhěngtiān zuò zài shùzhuāng pángbiān chīchī de shǒuzhe, mǎnxīn xīwàng hái néng yǒu tùzi zhuàngsǐ zài zhèlǐ. Jiéguǒ, tiándì huāngwú le, zácǎo cóngshēng, tā zài yě méiyǒu děngdào dì-èr zhī tùzi, fǎn\'ér chéng le quántiānxià rén de xiàobǐng. Zhè gè chéngyǔ gàojiè rénmen: qiè bù kě xīncún jiǎoxìng, qǐtú bùláo\'érhuò; gèng bù néng bǎ ǒurán shìjiàn dàngchéng bìrán guīlǜ.',
    fullContentVi:
      'Thời Chiến Quốc, nước Tống có một người nông dân. Một ngày nọ, khi anh ta đang cần mẫn cày bừa trên đồng ruộng, bỗng thấy một con thỏ rừng hớt hải lao tới. Thỏ rừng không cẩn thận đâm sầm vào gốc cây to bên bờ ruộng, gãy cổ chết ngay tại chỗ. Người nông dân vội vàng chạy lại, chẳng tốn chút sức lực nào nhặt được con thỏ vừa béo vừa to. Anh ta mừng rỡ vô cùng, thầm nghĩ: "Trồng trọt vất vả thế này, nếu ngày nào cũng nhặt không được một con thỏ thì sướng biết bao!". Từ đó về sau, người nông dân bỏ rơi nông cụ, không chịu cày cấy nữa. Anh ta suốt ngày ngồi ngẩn ngơ bên gốc cây trông ngóng, hy vọng sẽ có con thỏ khác đâm đầu vào chết ở đó. Kết quả là đồng ruộng hoang tàn, cỏ dại mọc đầy, anh ta chẳng bao giờ đợi được con thỏ thứ hai, trái lại còn biến thành trò cười cho thiên hạ. Thành ngữ này răn dạy con người: Tuyệt đối không được ôm tâm lý may rủi, mưu cầu không làm mà hưởng; càng không thể coi một sự việc ngẫu nhiên là quy luật tất nhiên.',
    paragraphs: [
      '战国时期，宋国有一个农夫。有一天，他正在田里辛勤地耕地，忽然看见一只飞奔的野兔惊慌失措地跑过来。野兔一不小心，重重地撞在田边的一棵大树桩上，当场折断了脖子死去了。',
      '农夫急忙跑过去，毫不费力地捡起这只又肥又大的野兔。他高兴极了，心想：“种庄稼多辛苦啊，要是每天都能白白捡到一只兔子，那该多舒服啊！”从此以后，这个农夫放下了手里的农具，不再耕作。他整天坐在树桩旁边痴痴地守着，满心希望还能有兔子撞死在这里。',
      '结果，田地荒芜了，杂草丛生，他再也没有等到第二只兔子，反而成了全天下人的笑柄。这个成语告诫人们：切不可心存侥幸，企图不劳而获；更不能把偶然事件当成必然规律。',
    ],
    sentences: [
      {
        id: 'reading_hsk5_rabbit_s1',
        sentenceIndex: 0,
        sentenceZh: '野兔一不小心，重重地撞在田边的一棵大树桩上，当场折断了脖子死去了。',
        sentencePinyin: 'Yětù yí bù xiǎoxīn, zhòngzhòng de zhuàng zài tiánbiān de yì kē dà shùzhuāng shàng, dāngchǎng zhéduàn le bózǐ sǐqù le.',
        sentenceVi: 'Thỏ rừng không cẩn thận đâm sầm vào gốc cây to bên bờ ruộng, gãy cổ chết tại chỗ.',
        grammarNotes: ['Trợ từ kết cấu 地 sau từ láy 重重地', 'Động từ kết quả 折断'],
      },
      {
        id: 'reading_hsk5_rabbit_s2',
        sentenceIndex: 1,
        sentenceZh: '要是每天都能白白捡到一只兔子，那该多舒服啊！',
        sentencePinyin: 'Yàoshi měitiān dōu néng báibái jiǎndào yì zhī tùzi, nà gāi duō shūfu a!',
        sentenceVi: 'Nếu ngày nào cũng nhặt không được một con thỏ thì sướng biết bao!',
        grammarNotes: ['Cấu trúc giả định 要是……那……', 'Phó từ 白白 (uổng công / tự dưng có không công)'],
      },
      {
        id: 'reading_hsk5_rabbit_s3',
        sentenceIndex: 2,
        sentenceZh: '田地荒芜了，他再也没有等到第二只兔子，反而成了全天下人的笑柄。',
        sentencePinyin: 'Tiándì huāngwú le, tā zài yě méiyǒu děngdào dì-èr zhī tùzi, fǎn\'ér chéng le quántiānxià rén de xiàobǐng.',
        sentenceVi: 'Đồng ruộng hoang tàn, anh ta chẳng bao giờ đợi được con thỏ thứ hai, trái lại còn biến thành trò cười cho thiên hạ.',
        grammarNotes: ['Phó từ phủ định nhấn mạnh 再也 (không bao giờ nữa)', 'Liên từ tương phản 反而 (trái lại)'],
      },
    ],
    vocabularyFocus: [
      { simplified: '守株待兔', pinyin: 'shǒuzhūdàitù', meaningVi: 'ôm cây đợi thỏ (chỉ thói ăn may, lười biếng)', hskLevel: 5 },
      { simplified: '辛勤', pinyin: 'xīnqín', meaningVi: 'chăm chỉ, cần mẫn', hskLevel: 5 },
      { simplified: '不劳而获', pinyin: 'bùláo\'érhuò', meaningVi: 'không làm mà hưởng', hskLevel: 5 },
      { simplified: '侥幸', pinyin: 'jiǎoxìng', meaningVi: 'may rủi, trông chờ vận may', hskLevel: 5 },
    ],
    grammarFocus: [
      {
        pattern: '要是……那/就…… (Liên từ giả thiết điều kiện)',
        formula: '要是 + Điều kiện giả định, Chủ ngữ + 就/那 + Kết quả',
        explanationVi: 'Dùng trong khẩu ngữ thân mật để nêu lên giả thuyết nếu điều này xảy ra thì kết quả sẽ như thế nào.',
        exampleSentence: '要是每天都能捡到兔子，那该多好！(Nếu ngày nào cũng nhặt được thỏ thì tốt biết mấy!)',
      },
    ],
    comprehensionQuestions: [
      {
        id: 'q_hsk5_rabbit_1',
        type: 'single_choice',
        question: '农夫为什么不再种地了？(Tại sao người nông dân không chịu cày cấy nữa?)',
        options: [
          '因为他的身体生了重病 (Vì anh ta bị bệnh nặng)',
          '因为他希望每天坐在树桩旁白白捡到兔子 (Vì muốn ngồi ôm gốc cây nhặt không thỏ mỗi ngày)',
          '因为兔子把他的庄稼全都吃光了 (Vì thỏ đã ăn sạch mùa màng của anh ta)',
          '因为国王命令他去当兵 (Vì nhà vua ra lệnh cho anh ta đi lính)',
        ],
        answer: 1,
        explanationVi: 'Bài đọc viết anh ta không muốn trồng trọt nữa mà chỉ muốn nhặt thỏ: "要是每天都能白白捡到一只兔子，那该多舒服啊！从此以后，这个农夫放下了手里的农具，不再耕作。"',
        citationText: '要是每天都能白白捡到一只兔子，那该多舒服啊！从此以后，这个农夫放下了手里的农具，不再耕作。',
      },
      {
        id: 'q_hsk5_rabbit_2',
        type: 'main_idea',
        question: 'Thành ngữ "守株待兔" (Ôm cây đợi thỏ) mang ý nghĩa phê phán thái độ gì?',
        options: [
          'Phê phán những người không biết cách bảo vệ động vật hoang dã',
          'Phê phán tư tưởng may rủi, lười biếng, muốn không làm mà hưởng và lấy chuyện ngẫu nhiên làm quy luật',
          'Phê phán người nông dân không biết cách nấu thịt thỏ',
          'Khuyên nhủ mọi người nên trồng nhiều cây cối ven bờ ruộng',
        ],
        answer: 1,
        explanationVi: 'Bài học nêu rõ: "切不可心存侥幸，企图不劳而获；更不能把偶然事件当成必然规律。"',
        citationText: '这个成语告诫人们：切不可心存侥幸，企图不劳而获；更不能把偶然事件当成必然规律。',
      },
    ],
    learningObjectives: [
      'Nắm vững điển tích và nguồn gốc thành ngữ Hán học "守株待兔".',
      'Vận dụng từ vựng nâng cao: 不劳而获, 侥幸, 荒芜, 耕作.',
      'Rèn luyện kỹ năng phân tích bài học nhân sinh từ các câu chuyện ngụ ngôn.',
    ],
    source: 'curated_standard',
    contentVersion: 1,
  },
];
