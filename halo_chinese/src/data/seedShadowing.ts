export interface ShadowingChunk {
  id: string;
  chunkZh: string;
  chunkPinyin: string;
  chunkVi: string;
  phoneticNotes?: string;
  orderIndex: number;
}

export interface ShadowingComprehensionQuestion {
  id: string;
  questionVi: string;
  options: string[];
  answer: string;
  explanationVi: string;
}

export interface ShadowingLessonItem {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  levelName: string;
  hskLevel: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  recommendedSpeed: number; // 0.5 - 1.5
  fullZh: string;
  fullPinyin: string;
  fullVi: string;
  dialogueRoles?: Array<{
    speaker: string;
    zh: string;
    pinyin: string;
    vi: string;
  }>;
  chunks: ShadowingChunk[];
  comprehensionQuestions: ShadowingComprehensionQuestion[];
  targetWeaknesses: string[]; // e.g. ['zh', 'ch', 'tone_3', 'tone_4', 'ü']
  tipsVi: string;
}

export const SHADOWING_LEVEL_TITLES: Record<number, string> = {
  1: 'Cấp độ 1: Luyện từ đơn',
  2: 'Cấp độ 2: Luyện cụm từ',
  3: 'Cấp độ 3: Luyện câu ngắn',
  4: 'Cấp độ 4: Luyện câu dài',
  5: 'Cấp độ 5: Luyện đoạn hội thoại',
  6: 'Cấp độ 6: Luyện độc thoại',
  7: 'Cấp độ 7: Shadowing nâng cao với tốc độ tự nhiên'
};

export const SEED_SHADOWING_LESSONS: ShadowingLessonItem[] = [
  // ==================== CẤP ĐỘ 1: TỪ ĐƠN ====================
  {
    id: 'sh_l1_01',
    title: 'Từ Đơn Chào Hỏi & Cảm Xúc',
    level: 1,
    levelName: 'Cấp độ 1: Luyện từ đơn',
    hskLevel: 1,
    topic: 'Chào hỏi & Cảm xúc',
    difficulty: 'easy',
    recommendedSpeed: 0.75,
    fullZh: '你好。谢谢。再见。高兴。',
    fullPinyin: 'Nǐ hǎo. Xièxie. Zàijiàn. Gāoxìng.',
    fullVi: 'Xin chào. Cảm ơn. Tạm biệt. Vui vẻ.',
    chunks: [
      { id: 'c1', chunkZh: '你好', chunkPinyin: 'nǐ hǎo', chunkVi: 'Xin chào', phoneticNotes: 'Biến điệu 2 thanh 3 đọc thành "ní hǎo"', orderIndex: 1 },
      { id: 'c2', chunkZh: '谢谢', chunkPinyin: 'xièxie', chunkVi: 'Cảm ơn', phoneticNotes: 'Thanh 4 rơi dứt khoát nối thanh nhẹ xie', orderIndex: 2 },
      { id: 'c3', chunkZh: '再见', chunkPinyin: 'zàijiàn', chunkVi: 'Tạm biệt', phoneticNotes: 'Cả hai âm đều thanh 4 dứt khoát, z đầu lưỡi thẳng', orderIndex: 3 },
      { id: 'c4', chunkZh: '高兴', chunkPinyin: 'gāoxìng', chunkVi: 'Vui vẻ', phoneticNotes: 'gāo thanh 1 ngân cao, xìng thanh 4 rơi nhanh', orderIndex: 4 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Khi phát âm "你好", quy tắc biến điệu hai thanh 3 được áp dụng như thế nào?',
        options: ['Âm nǐ đổi thành ní (thanh 2)', 'Âm hǎo đổi thành háo', 'Cả hai âm giữ nguyên thanh 3', 'Đọc thành thanh 4'],
        answer: 'Âm nǐ đổi thành ní (thanh 2)',
        explanationVi: 'Hai thanh 3 đứng liền nhau thì âm thứ nhất biến thành thanh 2 (ní hǎo).'
      }
    ],
    targetWeaknesses: ['tone_3', 'tone_4', 'z', 'x'],
    tipsVi: 'Tập trung phát âm tròn vành rõ chữ từng từ đơn, không kéo dài giọng tùy tiện.'
  },

  // ==================== CẤP ĐỘ 2: CỤM TỪ CỐ ĐỊNH ====================
  {
    id: 'sh_l2_01',
    title: 'Cụm Từ Miêu Tả & Giao Tiếp',
    level: 2,
    levelName: 'Cấp độ 2: Luyện cụm từ',
    hskLevel: 1,
    topic: 'Miêu tả & Đời sống',
    difficulty: 'easy',
    recommendedSpeed: 0.85,
    fullZh: '很高兴。非常漂亮。很多朋友。便宜一点儿。',
    fullPinyin: 'Hěn gāoxìng. Fēicháng piàoliang. Hěn duō péngyou. Piányi yìdiǎnr.',
    fullVi: 'Rất vui vẻ. Cực kỳ xinh đẹp. Rất nhiều bạn bè. Rẻ hơn một chút.',
    chunks: [
      { id: 'c1', chunkZh: '很高兴', chunkPinyin: 'hěn gāoxìng', chunkVi: 'Rất vui vẻ', phoneticNotes: 'hěn đọc nửa thanh 3, hạ giọng trầm rồi sang gāo', orderIndex: 1 },
      { id: 'c2', chunkZh: '非常漂亮', chunkPinyin: 'fēicháng piàoliang', chunkVi: 'Cực kỳ xinh đẹp', phoneticNotes: 'cháng uốn lưỡi thanh 2, liang đọc thanh nhẹ', orderIndex: 2 },
      { id: 'c3', chunkZh: '很多朋友', chunkPinyin: 'hěn duō péngyou', chunkVi: 'Rất nhiều bạn bè', phoneticNotes: 'duō ngân thanh 1, you đọc nhẹ', orderIndex: 3 },
      { id: 'c4', chunkZh: '便宜一点儿', chunkPinyin: 'piányi yìdiǎnr', chunkVi: 'Rẻ hơn một chút', phoneticNotes: 'yìdiǎnr có âm uốn lưỡi cuốn họng cong lưỡi', orderIndex: 4 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Từ "漂亮" (piàoliang) trong khẩu ngữ thường đọc âm thứ hai như thế nào?',
        options: ['Đọc thanh nhẹ lướt nhanh', 'Đọc thanh 4 ngân dài', 'Đọc thành thanh 1', 'Đọc như dấu huyền'],
        answer: 'Đọc thanh nhẹ lướt nhanh',
        explanationVi: 'Trong từ liang là thanh nhẹ, chỉ phát âm khoảng 1/2 độ dài bình thường.'
      }
    ],
    targetWeaknesses: ['ch', 'er', 'tone_3'],
    tipsVi: 'Nối các từ trong cụm liền mạch, giữ đúng trọng âm chính ở tính từ hoặc động từ.'
  },

  // ==================== CẤP ĐỘ 3: CÂU NGẮN ====================
  {
    id: 'sh_l3_01',
    title: 'Làm Quen Bạn Mới Lần Đầu',
    level: 3,
    levelName: 'Cấp độ 3: Luyện câu ngắn',
    hskLevel: 2,
    topic: 'Giới thiệu bản thân',
    difficulty: 'easy',
    recommendedSpeed: 1.0,
    fullZh: '你好，我叫王明，我是中国留学生。',
    fullPinyin: 'Nǐ hǎo, wǒ jiào Wáng Míng, wǒ shì Zhōngguó liúxuéshēng.',
    fullVi: 'Xin chào, tôi tên là Vương Minh, tôi là du học sinh Trung Quốc.',
    chunks: [
      { id: 'c1', chunkZh: '你好，', chunkPinyin: 'Nǐ hǎo,', chunkVi: 'Xin chào,', phoneticNotes: 'Ngắt nhẹ sau dấu phẩy', orderIndex: 1 },
      { id: 'c2', chunkZh: '我叫王明，', chunkPinyin: 'wǒ jiào Wáng Míng,', chunkVi: 'tôi tên là Vương Minh,', phoneticNotes: 'Wáng Míng thanh 2 + thanh 2 vút cao', orderIndex: 2 },
      { id: 'c3', chunkZh: '我是中国留学生。', chunkPinyin: 'wǒ shì Zhōngguó liúxuéshēng.', chunkVi: 'tôi là du học sinh Trung Quốc.', phoneticNotes: 'shì và Zhōng đều uốn lưỡi, xué tròn môi', orderIndex: 3 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Vương Minh giới thiệu mình có thân phận gì?',
        options: ['Du học sinh Trung Quốc', 'Giáo viên tiếng Trung', 'Nhân viên công ty', 'Bác sĩ'],
        answer: 'Du học sinh Trung Quốc',
        explanationVi: 'Câu khẳng định "我是中国留学生" (liúxuéshēng).'
      }
    ],
    targetWeaknesses: ['zh', 'sh', 'ü'],
    tipsVi: 'Ngắt nghỉ tự nhiên sau mỗi cụm nghĩa, không đọc đều đều từng chữ như robot.'
  },

  // ==================== CẤP ĐỘ 4: CÂU DÀI CÓ LIÊN TỪ ====================
  {
    id: 'sh_l4_01',
    title: 'Kế Hoạch Cuối Tuần & Thời Tiết',
    level: 4,
    levelName: 'Cấp độ 4: Luyện câu dài',
    hskLevel: 2,
    topic: 'Thời tiết & Sinh hoạt',
    difficulty: 'medium',
    recommendedSpeed: 1.0,
    fullZh: '虽然今天外面的天气有点儿冷，但是我还是想和朋友一起去图书馆看书。',
    fullPinyin: 'Suīrán jīntiān wàimiàn de tiānqì yǒudiǎnr lěng, dànshì wǒ háishì xiǎng hé péngyou yìqǐ qù túshūguǎn kànshū.',
    fullVi: 'Mặc dù hôm nay thời tiết bên ngoài hơi lạnh, nhưng tôi vẫn muốn cùng bạn bè đến thư viện đọc sách.',
    chunks: [
      { id: 'c1', chunkZh: '虽然今天外面的天气', chunkPinyin: 'Suīrán jīntiān wàimiàn de tiānqì', chunkVi: 'Mặc dù hôm nay thời tiết bên ngoài', phoneticNotes: 'Suīrán giữ thanh 1 cao, wàimiàn thanh 4 rơi nhanh', orderIndex: 1 },
      { id: 'c2', chunkZh: '有点儿冷，', chunkPinyin: 'yǒudiǎnr lěng,', chunkVi: 'hơi lạnh một chút,', phoneticNotes: 'yǒudiǎnr lěng: biến điệu thanh 3', orderIndex: 2 },
      { id: 'c3', chunkZh: '但是我还是想', chunkPinyin: 'dànshì wǒ háishì xiǎng', chunkVi: 'nhưng tôi vẫn muốn', phoneticNotes: 'dànshì nối tiếp mạch suy nghĩ', orderIndex: 3 },
      { id: 'c4', chunkZh: '和朋友一起', chunkPinyin: 'hé péngyou yìqǐ', chunkVi: 'cùng với bạn bè', phoneticNotes: 'yìqǐ: chữ yī biến điệu thành thanh 4 (yì)', orderIndex: 4 },
      { id: 'c5', chunkZh: '去图书馆看书。', chunkPinyin: 'qù túshūguǎn kànshū.', chunkVi: 'đến thư viện đọc sách.', phoneticNotes: 'qù tròn môi bật hơi, shū uốn lưỡi thanh 1', orderIndex: 5 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Dù trời lạnh, người nói vẫn quyết định làm gì?',
        options: ['Đến thư viện đọc sách cùng bạn bè', 'Ở nhà ngủ', 'Đi siêu thị mua sắm', 'Đi xem phim'],
        answer: 'Đến thư viện đọc sách cùng bạn bè',
        explanationVi: 'Câu nêu rõ: "想和朋友一起去图书馆看书".'
      }
    ],
    targetWeaknesses: ['q', 'sh', 'tone_3', 'sandhi_yi'],
    tipsVi: 'Lấy hơi sâu ở đầu câu, phân chia luồng hơi đều qua 5 cụm ý nghĩa.'
  },

  // ==================== CẤP ĐỘ 5: ĐOẠN HỘI THOẠI (DIALOGUE) ====================
  {
    id: 'sh_l5_01',
    title: 'Đặt Bàn & Gọi Món Tại Quán Ăn',
    level: 5,
    levelName: 'Cấp độ 5: Luyện đoạn hội thoại',
    hskLevel: 3,
    topic: 'Ẩm thực & Nhà hàng',
    difficulty: 'medium',
    recommendedSpeed: 1.0,
    fullZh: '服务员，请问还有空位吗？有的，两位请进！这是菜单，请问您想喝点儿什么？请给我们一壶乌龙茶，再来一份麻婆豆腐和两碗米饭。好的，请稍等，菜马上就来！',
    fullPinyin: 'Fúwùyuán, qǐngwèn hái yǒu kòngwèi ma? Yǒu de, liǎng wèi qǐng jìn! Zhè shì càidān, qǐngwèn nín xiǎng hē diǎnr shénme? Qǐng gěi wǒmen yì hú wūlóngchá, zài lái yí fèn Mápó dòufu hé liǎng wǎn mǐfàn. Hǎo de, qǐng shāoděng, cài mǎshàng jiù lái!',
    fullVi: 'Phục vụ ơi, xin hỏi còn bàn trống không? Dạ có, hai vị xin mời vào! Đây là thực đơn, xin hỏi quý khách muốn uống gì ạ? Cho chúng tôi một ấm trà Ô Long, thêm một phần đậu phụ Ma Bà và hai bát cơm trắng. Vâng ạ, xin chờ một chút, món ăn sẽ lên ngay!',
    dialogueRoles: [
      { speaker: 'Khách', zh: '服务员，请问还有空位吗？', pinyin: 'Fúwùyuán, qǐngwèn hái yǒu kòngwèi ma?', vi: 'Phục vụ ơi, xin hỏi còn bàn trống không?' },
      { speaker: 'Phục vụ', zh: '有的，两位请进！这是菜单，请问您想喝点儿什么？', pinyin: 'Yǒu de, liǎng wèi qǐng jìn! Zhè shì càidān, qǐngwèn nín xiǎng hē diǎnr shénme?', vi: 'Dạ có, hai vị xin mời vào! Đây là thực đơn, xin hỏi quý khách muốn uống gì ạ?' },
      { speaker: 'Khách', zh: '请给我们一壶乌龙茶，再来一份麻婆豆腐和两碗米饭。', pinyin: 'Qǐng gěi wǒmen yì hú wūlóngchá, zài lái yí fèn Mápó dòufu hé liǎng wǎn mǐfàn.', vi: 'Cho chúng tôi một ấm trà Ô Long, thêm một phần đậu phụ Ma Bà và hai bát cơm trắng.' },
      { speaker: 'Phục vụ', zh: '好的，请稍等，菜马上就来！', pinyin: 'Hǎo de, qǐng shāoděng, cài mǎshàng jiù lái!', vi: 'Vâng ạ, xin chờ một chút, món ăn sẽ lên ngay!' }
    ],
    chunks: [
      { id: 'c1', chunkZh: '服务员，请问还有空位吗？', chunkPinyin: 'Fúwùyuán, qǐngwèn hái yǒu kòngwèi ma?', chunkVi: 'Phục vụ ơi, xin hỏi còn chỗ trống không?', phoneticNotes: 'qǐngwèn: q mặt lưỡi bật hơi sắc nét', orderIndex: 1 },
      { id: 'c2', chunkZh: '有的，两位请进！', chunkPinyin: 'Yǒu de, liǎng wèi qǐng jìn!', chunkVi: 'Có ạ, hai vị mời vào!', phoneticNotes: 'liǎng wèi đọc niềm nở, jìn thanh 4 dứt khoát', orderIndex: 2 },
      { id: 'c3', chunkZh: '这是菜单，请问您想喝点儿什么？', chunkPinyin: 'Zhè shì càidān, qǐngwèn nín xiǎng hē diǎnr shénme?', chunkVi: 'Đây là thực đơn, xin hỏi quý khách muốn uống gì?', phoneticNotes: 'Zhè shì uốn lưỡi, nín kính ngữ', orderIndex: 3 },
      { id: 'c4', chunkZh: '请给我们一壶乌龙茶，', chunkPinyin: 'Qǐng gěi wǒmen yì hú wūlóngchá,', chunkVi: 'Cho chúng tôi một ấm trà Ô Long,', phoneticNotes: 'yì hú: biến điệu chữ yī trước thanh 2', orderIndex: 4 },
      { id: 'c5', chunkZh: '再来一份麻婆豆腐和两碗米饭。', chunkPinyin: 'zài lái yí fèn Mápó dòufu hé liǎng wǎn mǐfàn.', chunkVi: 'thêm một phần đậu phụ Ma Bà và hai bát cơm trắng.', phoneticNotes: 'yí fèn: biến điệu yī trước thanh 4', orderIndex: 5 },
      { id: 'c6', chunkZh: '好的，请稍等，菜马上就来！', chunkPinyin: 'Hǎo de, qǐng shāoděng, cài mǎshàng jiù lái!', chunkVi: 'Vâng ạ, xin chờ một chút, món sẽ lên ngay!', phoneticNotes: 'shāoděng: shao uốn lưỡi, mǎshàng thanh 3+4', orderIndex: 6 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Khách hàng đã gọi món đồ uống nào?',
        options: ['Một ấm trà Ô Long', 'Cà phê đá', 'Nước khoáng', 'Trà sữa'],
        answer: 'Một ấm trà Ô Long',
        explanationVi: 'Khách nói: "请给我们一壶乌龙茶" (wūlóngchá).'
      }
    ],
    targetWeaknesses: ['q', 'zh', 'ch', 'sh', 'sandhi_yi'],
    tipsVi: 'Đổi sắc thái biểu cảm khi nói: giọng khách tự nhiên, giọng phục vụ niềm nở tươi cười.'
  },

  // ==================== CẤP ĐỘ 6: ĐỘC THOẠI (MONOLOGUE) ====================
  {
    id: 'sh_l6_01',
    title: 'Ước Mơ Du Học & Tình Yêu Tiếng Trung',
    level: 6,
    levelName: 'Cấp độ 6: Luyện độc thoại',
    hskLevel: 3,
    topic: 'Thuyết trình & Ước mơ',
    difficulty: 'hard',
    recommendedSpeed: 1.0,
    fullZh: '大家好！我叫安，来自越南。我从小就对中国文化非常感兴趣。我希望明年能够通过HSK五级考试，申请到北京大学的留学生奖学金。我相信只要每天坚持练习听力和口语，就一定能实现自己的梦想！',
    fullPinyin: 'Dàjiā hǎo! Wǒ jiào Ān, láizì Yuènán. Wǒ cóngxiǎo jiù duì Zhōngguó wénhuà fēicháng gǎn xìngqù. Wǒ xīwàng míngnián nénggòu tōngguò HSK wǔ jí kǎoshì, shēnqǐng dào Běijīng Dàxué de liúxuéshēng jiǎngxuéjīn. Wǒ xiāngxìn zhǐyào měitiān jiānchí liànxí tīnglì hé kǒuyǔ, jiù yídìng néng shíxiàn zìjǐ de mèngxiǎng!',
    fullVi: 'Chào mọi người! Tôi tên là An, đến từ Việt Nam. Từ nhỏ tôi đã rất hứng thú với văn hóa Trung Quốc. Tôi hy vọng năm sau có thể vượt qua kỳ thi HSK 5 và xin được học bổng du học sinh tại Đại học Bắc Kinh. Tôi tin rằng chỉ cần mỗi ngày kiên trì luyện nghe và nói thì nhất định sẽ thực hiện được ước mơ của mình!',
    chunks: [
      { id: 'c1', chunkZh: '大家好！我叫安，来自越南。', chunkPinyin: 'Dàjiā hǎo! Wǒ jiào Ān, láizì Yuènán.', chunkVi: 'Chào mọi người! Tôi tên là An, đến từ Việt Nam.', phoneticNotes: 'Mở đầu dõng dạc, tự tin', orderIndex: 1 },
      { id: 'c2', chunkZh: '我从小就对中国文化非常感兴趣。', chunkPinyin: 'Wǒ cóngxiǎo jiù duì Zhōngguó wénhuà fēicháng gǎn xìngqù.', chunkVi: 'Từ nhỏ tôi đã rất có hứng thú với văn hóa Trung Quốc.', phoneticNotes: 'Zhōngguó uốn lưỡi, xìngqù thanh 4 dứt khoát', orderIndex: 2 },
      { id: 'c3', chunkZh: '我希望明年能够通过HSK五级考试，', chunkPinyin: 'Wǒ xīwàng míngnián nénggòu tōngguò HSK wǔ jí kǎoshì,', chunkVi: 'Tôi hy vọng năm tới có thể thi đỗ HSK cấp 5,', phoneticNotes: 'xīwàng giữ thanh 1, kǎoshì hai thanh 3 biến điệu', orderIndex: 3 },
      { id: 'c4', chunkZh: '申请到北京大学的留学生奖学金。', chunkPinyin: 'shēnqǐng dào Běijīng Dàxué de liúxuéshēng jiǎngxuéjīn.', chunkVi: 'xin được học bổng du học sinh tại Đại học Bắc Kinh.', phoneticNotes: 'Běijīng Dàxué ngắt nhẹ, jiǎngxuéjīn thanh 3+2+1', orderIndex: 4 },
      { id: 'c5', chunkZh: '我相信只要每天坚持练习听力和口语，', chunkPinyin: 'Wǒ xiāngxìn zhǐyào měitiān jiānchí liànxí tīnglì hé kǒuyǔ,', chunkVi: 'Tôi tin rằng chỉ cần mỗi ngày kiên trì luyện nghe nói,', phoneticNotes: 'jiānchí uốn lưỡi thanh 1+2, liànxí thanh 4+2', orderIndex: 5 },
      { id: 'c6', chunkZh: '就一定能实现自己的梦想！', chunkPinyin: 'jiù yídìng néng shíxiàn zìjǐ de mèngxiǎng!', chunkVi: 'thì nhất định sẽ thực hiện được ước mơ của mình!', phoneticNotes: 'shíxiàn uốn lưỡi, mèngxiǎng kết thúc đầy nhiệt huyết', orderIndex: 6 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Mục tiêu lớn nhất trong năm tới của người nói là gì?',
        options: ['Đỗ HSK 5 và xin học bổng Đại học Bắc Kinh', 'Đi du lịch Trung Quốc', 'Mở công ty kinh doanh', 'Học nấu món ăn Trung Hoa'],
        answer: 'Đỗ HSK 5 và xin học bổng Đại học Bắc Kinh',
        explanationVi: 'Bài nói rõ: "希望明年能够通过HSK五级考试，申请到北京大学的留学生奖学金".'
      }
    ],
    targetWeaknesses: ['zh', 'ch', 'sh', 'x', 'j', 'q'],
    tipsVi: 'Đọc với phong thái thuyết trình dõng dạc, nhấn trọng âm vào các động từ quyết tâm.'
  },

  // ==================== CẤP ĐỘ 7: SHADOWING NÂNG CAO TỐC ĐỘ TỰ NHIÊN ====================
  {
    id: 'sh_l7_01',
    title: 'Xu Hướng Thanh Toán Không Tiền Mặt',
    level: 7,
    levelName: 'Cấp độ 7: Tốc độ tự nhiên',
    hskLevel: 4,
    topic: 'Công nghệ & Xã hội',
    difficulty: 'hard',
    recommendedSpeed: 1.25,
    fullZh: '现如今在中国，无论是去大型商场购物，还是在街边小摊买一份煎饼果子，大家几乎都用手机扫描二维码支付，出门一部手机就能解决衣食住行所有的需求，可以说是既高效又便捷。',
    fullPinyin: 'Xiànrújīn zài Zhōngguó, wúlùn shì qù dàxíng shāngchǎng gòuwù, háishì zài jiēbiān xiǎotān mǎi yí fèn jiānbing guǒzi, dàjiā jīhū dōu yòng shǒujī sǎomiáo èrwéimǎ zhīfù, chūmén yí bù shǒujī jiù néng jiějué yī shí zhù xíng suǒyǒu de xūqiú, kěyǐ shuō shì jì gāoxiào yòu biànjié.',
    fullVi: 'Ngày nay ở Trung Quốc, bất kể là đi mua sắm tại các trung tâm thương mại lớn hay mua một phần bánh kếp ở quầy ven đường, mọi người hầu như đều quét mã QR trên điện thoại để thanh toán, ra ngoài chỉ cần một chiếc điện thoại là giải quyết được mọi nhu cầu ăn ở đi lại, có thể nói là vừa hiệu quả vừa tiện lợi.',
    chunks: [
      { id: 'c1', chunkZh: '现如今在中国，', chunkPinyin: 'Xiànrújīn zài Zhōngguó,', chunkVi: 'Ngày nay ở Trung Quốc,', phoneticNotes: 'Tốc độ lướt nhanh, rúnjīn uốn lưỡi nhẹ', orderIndex: 1 },
      { id: 'c2', chunkZh: '无论是去大型商场购物，', chunkPinyin: 'wúlùn shì qù dàxíng shāngchǎng gòuwù,', chunkVi: 'bất kể là đi trung tâm thương mại lớn mua sắm,', phoneticNotes: 'shāngchǎng hai âm uốn lưỡi liên tiếp', orderIndex: 2 },
      { id: 'c3', chunkZh: '还是在街边小摊买一份煎饼果子，', chunkPinyin: 'háishì zài jiēbiān xiǎotān mǎi yí fèn jiānbing guǒzi,', chunkVi: 'hay mua bánh kếp ở quầy ven đường,', phoneticNotes: 'jiānbing guǒzi đọc lướt nhịp khẩu ngữ', orderIndex: 3 },
      { id: 'c4', chunkZh: '大家几乎都用手机扫描二维码支付，', chunkPinyin: 'dàjiā jīhū dōu yòng shǒujī sǎomiáo èrwéimǎ zhīfù,', chunkVi: 'mọi người hầu hết đều dùng điện thoại quét mã QR thanh toán,', phoneticNotes: 'èrwéimǎ có âm er uốn lưỡi, zhīfù thanh 1+4', orderIndex: 4 },
      { id: 'c5', chunkZh: '出门一部手机就能解决衣食住行所有的需求，', chunkPinyin: 'chūmén yí bù shǒujī jiù néng jiějué yī shí zhù xíng suǒyǒu de xūqiú,', chunkVi: 'ra ngoài một chiếc điện thoại giải quyết mọi nhu cầu ăn ở đi lại,', phoneticNotes: 'yī shí zhù xíng thành ngữ 4 chữ nối liền mạch', orderIndex: 5 },
      { id: 'c6', chunkZh: '可以说是既高效又便捷。', chunkPinyin: 'kěyǐ shuō shì jì gāoxiào yòu biànjié.', chunkVi: 'có thể nói là vừa hiệu quả vừa tiện lợi.', phoneticNotes: 'gāoxiào yòu biànjié kết thúc dứt khoát', orderIndex: 6 }
    ],
    comprehensionQuestions: [
      {
        id: 'q1',
        questionVi: 'Đoạn văn miêu tả điều gì mang lại sự tiện lợi vượt bậc trong đời sống Trung Quốc?',
        options: ['Thanh toán quét mã QR qua điện thoại di động', 'Sử dụng tiền mặt giấy', 'Thanh toán bằng thẻ tín dụng ngân hàng', 'Đổi đồ lấy đồ'],
        answer: 'Thanh toán quét mã QR qua điện thoại di động',
        explanationVi: 'Đoạn văn nhấn mạnh: "大家几乎都用手机扫描二维码支付".'
      }
    ],
    targetWeaknesses: ['er', 'zh', 'ch', 'sh', 'q', 'x'],
    tipsVi: 'Luyện ở tốc độ 1.25x đến 1.5x, tập lướt âm và nối nhịp không ngập ngừng như người bản xứ.'
  }
];
