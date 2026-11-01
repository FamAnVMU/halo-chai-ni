/**
 * Chinese Knowledge Benchmark - Golden Dataset
 * Phase B4 - Chinese Knowledge Benchmark (Halo Chinese v2.7.0)
 *
 * Handcrafted, rigorously verified benchmark dataset covering 6 core knowledge domains:
 * 1. Vocabulary: Polysemy & Near-Synonyms (想/要, 会/能/可以, 怎么/为什么, 再/又, 得, 二/两)
 * 2. Pinyin & Pronunciation: Tone sandhi (一, 不, 3rd tone pair) & Neutral tones (轻声)
 * 3. Grammar: 把 structure, 被 passive, dynamic particles (了/过/着), 的/得/地, word order
 * 4. Translation: Two-way contextual translation (Zh -> Vi, Vi -> Zh) with semantic flexibility
 * 5. Error Correction & False Positive Protection: Real learner errors vs. Valid sentences that must NEVER be falsely corrected
 * 6. Teaching Quality & Adaptive Scaffolding: Stepped pedagogy when learner is stuck, level appropriateness
 * 7. Memory Grounding: Hallucination prevention, strictly respecting Evidence Ledger
 */

import { BenchmarkTestCase } from './benchmarkTypes.js';

export const GOLDEN_DATASET: BenchmarkTestCase[] = [
  // ==========================================
  // DOMAIN 1: VOCABULARY (Polysemy & Near-synonyms)
  // ==========================================
  {
    id: 'VOCAB_SYNONYM_XIANG_YAO',
    domain: 'vocabulary',
    subDomain: 'near_synonyms',
    title: 'Phân biệt 想 (xiǎng) và 要 (yào)',
    description: 'Kiểm tra giải thích sắc thái: 想 biểu thị mong muốn, ý định suy nghĩ; 要 biểu thị ý chí quyết tâm, yêu cầu, hoặc hành động sắp diễn ra.',
    hskLevel: 1,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Phân biệt cách dùng của 想 (xiǎng) và 要 (yào) trong tiếng Trung khi muốn diễn tả "muốn". Cho ví dụ dễ hiểu.',
    referenceExpected: {
      requiredKeywords: ['想', '要', 'mong muốn', 'quyết tâm', 'dự định'],
      forbiddenKeywords: ['hoàn toàn giống nhau', 'thay thế tùy tiện'],
      semanticRubric: [
        {
          criterion: 'Sắc thái mong muốn vs Quyết tâm',
          weight: 0.4,
          description: 'Nêu rõ 想 nhẹ hơn, là ý nghĩ/mong muốn chủ quan; 要 mạnh mẽ hơn, thể hiện ý chí dứt khoát hoặc dự định thực hiện.',
          keywords: ['mong muốn', 'ý định', 'quyết tâm', 'dứt khoát']
        },
        {
          criterion: 'Khả năng làm động từ vị ngữ độc lập',
          weight: 0.3,
          description: 'Nêu rõ 想 còn có nghĩa là nhớ (想家) hoặc suy nghĩ; 要 còn có nghĩa là cần/phải/lấy.',
          keywords: ['nhớ', 'nghĩ', 'cần']
        },
        {
          criterion: 'Ví dụ tương phản rõ ràng',
          weight: 0.3,
          description: 'Đưa ra cặp ví dụ đối chiếu trực quan như: 我想买电脑 (nghĩ trong đầu) vs 我要买电脑 (đã chuẩn bị tiền đi mua).',
          keywords: ['ví dụ', '我想', '我要']
        }
      ]
    },
    mockResponse: {
      text: 'Trong tiếng Trung, cả 想 (xiǎng) và 要 (yào) đều có thể dịch là "muốn", nhưng sắc thái khác nhau:\n1. 想 (xiǎng): Biểu thị mong muốn, suy nghĩ trong đầu, mức độ nhẹ nhàng (ví dụ: 我想喝茶 - Tôi muốn/thèm uống trà).\n2. 要 (yào): Biểu thị ý chí quyết tâm, dự định dứt khoát hoặc yêu cầu cần thiết (ví dụ: 我要买这本词典 - Tôi muốn/sẽ mua cuốn từ điển này).\nNgoài ra, 想 còn có nghĩa là "nhớ" (想家) hoặc "nghĩ", còn 要 có thể mang nghĩa "cần/phải".',
      tokensUsed: 120,
      latencyMs: 140
    }
  },
  {
    id: 'VOCAB_SYNONYM_HUI_NENG_KEYI',
    domain: 'vocabulary',
    subDomain: 'near_synonyms',
    title: 'Phân biệt 会 (huì), 能 (néng) và 可以 (kěyǐ)',
    description: 'Kiểm tra phân biệt động từ năng nguyện: 会 (kỹ năng qua học tập), 能 (năng lực thể chất/điều kiện khách quan), 可以 (sự cho phép/gợi ý).',
    hskLevel: 2,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Giải thích sự khác nhau giữa 会, 能 và 可以.',
    referenceExpected: {
      requiredKeywords: ['会', '能', '可以', 'kỹ năng', 'học tập', 'cho phép', 'năng lực'],
      forbiddenKeywords: ['ba từ đồng nghĩa hoàn toàn'],
      semanticRubric: [
        {
          criterion: 'Phân loại 会 qua học tập rèn luyện',
          weight: 0.35,
          description: 'Chỉ rõ 会 nhấn mạnh kỹ năng có được qua rèn luyện (học bơi, học tiếng Trung).',
          keywords: ['học tập', 'kỹ năng', 'rèn luyện']
        },
        {
          criterion: 'Phân loại 能 theo năng lực/điều kiện thực tế',
          weight: 0.35,
          description: 'Chỉ rõ 能 nhấn mạnh khả năng đạt tới mức độ nào hoặc điều kiện khách quan cho phép.',
          keywords: ['năng lực', 'thể lực', 'điều kiện']
        },
        {
          criterion: 'Phân loại 可以 theo sự cho phép',
          weight: 0.3,
          description: 'Chỉ rõ 可以 diễn tả sự cho phép hoặc lời khuyên/gợi ý.',
          keywords: ['cho phép', 'được phép', 'gợi ý']
        }
      ]
    },
    mockResponse: {
      text: 'Phân biệt 3 động từ năng nguyện:\n- 会 (huì): Kỹ năng biết được nhờ học tập và rèn luyện (VD: 我会游泳 - Tôi biết bơi, 我会说汉语 - Tôi biết nói tiếng Trung).\n- 能 (néng): Năng lực thể chất, khả năng đạt tới một mức độ, hoặc điều kiện khách quan cho phép (VD: 我能游1000米 - Tôi có thể bơi 1000m; 今天我有空，能去 - Hôm nay tôi rảnh nên có thể đi).\n- 可以 (kěyǐ): Sự cho phép (được phép làm gì) hoặc đưa ra lời khuyên (VD: 这里可以抽烟吗？ - Ở đây được phép hút thuốc không?).',
      tokensUsed: 135,
      latencyMs: 155
    }
  },
  {
    id: 'VOCAB_SYNONYM_ZENME_WEISHENME',
    domain: 'vocabulary',
    subDomain: 'near_synonyms',
    title: 'Phân biệt 怎么 (zěnme) và 为什么 (wèishénme)',
    description: '怎么 hỏi phương thức/cách thức hoặc ngạc nhiên; 为什么 hỏi nguyên nhân/lý do.',
    hskLevel: 2,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Làm thế nào để phân biệt 怎么 và 为什么?',
    referenceExpected: {
      requiredKeywords: ['怎么', '为什么', 'phương thức', 'cách thức', 'nguyên nhân', 'lý do'],
      semanticRubric: [
        {
          criterion: 'Cách dùng hỏi cách thức của 怎么',
          weight: 0.4,
          description: '怎么 + Động từ để hỏi phương thức hành động (Làm thế nào? Đi bằng gì?).',
          keywords: ['phương thức', 'cách thức', 'làm thế nào']
        },
        {
          criterion: 'Cách dùng hỏi nguyên nhân của 为什么',
          weight: 0.4,
          description: '为什么 hỏi nguyên nhân, lý do (Tại sao?).',
          keywords: ['nguyên nhân', 'lý do', 'tại sao']
        },
        {
          criterion: 'Sắc thái ngạc nhiên của 怎么',
          weight: 0.2,
          description: 'Nhắc đến 怎么 cũng có thể hỏi lý do nhưng mang sắc thái ngạc nhiên, thắc mắc.',
          keywords: ['ngạc nhiên', 'bất ngờ']
        }
      ]
    },
    mockResponse: {
      text: 'Sự khác biệt giữa 怎么 và 为什么:\n1. 怎么 (zěnme): Thường hỏi về phương thức, cách làm (Làm thế nào?). Công thức: 怎么 + Động từ (VD: 这个字怎么写？ - Chữ này viết thế nào?). Khi hỏi nguyên nhân, 怎么 mang sắc thái ngạc nhiên (VD: 你怎么才来？ - Sao giờ này bạn mới đến?).\n2. 为什么 (wèishénme): Chuyên dùng để hỏi nguyên nhân, lý do khách quan (Tại sao?). Câu trả lời thường dùng 因为... (VD: 你为什么学中文？ - Tại sao bạn học tiếng Trung?).',
      tokensUsed: 125,
      latencyMs: 145
    }
  },
  {
    id: 'VOCAB_SYNONYM_ZAI_YOU',
    domain: 'vocabulary',
    subDomain: 'near_synonyms',
    title: 'Phân biệt 再 (zài) và 又 (yòu)',
    description: '再 dùng cho sự lặp lại trong tương lai; 又 dùng cho sự lặp lại đã xảy ra trong quá khứ hoặc mang tính chu kỳ đã hoàn thành.',
    hskLevel: 2,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Phân biệt cách dùng của 再 và 又 khi diễn tả hành động lặp lại.',
    referenceExpected: {
      requiredKeywords: ['再', '又', 'tương lai', 'quá khứ', 'lặp lại'],
      semanticRubric: [
        {
          criterion: '再 cho hành động chưa xảy ra / tương lai',
          weight: 0.5,
          description: '再 biểu thị hành động lặp lại chưa xảy ra, dự định trong tương lai (VD: 再见, 明天再来).',
          keywords: ['chưa xảy ra', 'tương lai', 'tiếp tục']
        },
        {
          criterion: '又 cho hành động đã lặp lại / quá khứ',
          weight: 0.5,
          description: '又 biểu thị hành động lặp lại đã hoàn thành trong quá khứ (VD: 他又来了).',
          keywords: ['đã xảy ra', 'quá khứ', 'lại']
        }
      ]
    },
    mockResponse: {
      text: 'Cả 再 (zài) và 又 (yòu) đều diễn tả sự lặp lại của hành động ("lại"), nhưng khác biệt về thời gian:\n- 再 (zài): Dùng cho hành động lặp lại CHƯA XẢY RA hoặc sẽ xảy ra trong TƯƠNG LAI. (VD: 明天你再来吧 - Ngày mai bạn lại đến nhé; 再见 - Hẹn gặp lại).\n- 又 (yòu): Dùng cho hành động lặp lại ĐÃ XẢY RA trong QUÁ KHỨ hoặc hiện thực đã hoàn tất. (VD: 他昨天来了，今天又来了 - Hôm qua anh ấy đã đến, hôm nay lại đến nữa).',
      tokensUsed: 110,
      latencyMs: 130
    }
  },
  {
    id: 'VOCAB_POLYSEMY_DEI_DE_DE',
    domain: 'vocabulary',
    subDomain: 'polysemy',
    title: 'Đa nghĩa của chữ 得 (děi, de, dé)',
    description: 'Kiểm tra giải thích chính xác 3 cách đọc và chức năng ngữ pháp của 得.',
    hskLevel: 3,
    tier: 'tier1_deterministic',
    promptInput: 'Chữ 得 có những cách phát âm và ý nghĩa nào?',
    referenceExpected: {
      requiredKeywords: ['děi', 'phải', 'bổ ngữ', 'đạt được'],
      expectedPinyin: [
        { hanzi: '得', pinyin: 'děi', ruleDescription: 'Động từ năng nguyện: phải' },
        { hanzi: '得', pinyin: 'de', ruleDescription: 'Trợ từ kết cấu sau động từ/tính từ' },
        { hanzi: '得', pinyin: 'dé', ruleDescription: 'Động từ: đạt được, nhận được' }
      ]
    },
    mockResponse: {
      text: 'Chữ 得 có 3 cách đọc chính trong tiếng Trung:\n1. děi (thanh 3): Động từ năng nguyện, nghĩa là "phải", "cần phải" (VD: 我得走了 - Tôi phải đi rồi).\n2. de (thanh nhẹ): Trợ từ kết cấu đứng sau động từ hoặc tính từ để nối với bổ ngữ chỉ trình độ/khả năng (VD: 跑得快 - chạy nhanh).\n3. dé (thanh 2): Động từ, nghĩa là "đạt được", "nhận được" (VD: 得到 - đạt được, 得奖 - nhận giải thưởng).',
      pinyin: 'děi, de, dé',
      tokensUsed: 130,
      latencyMs: 140
    }
  },
  {
    id: 'VOCAB_SYNONYM_ER_LIANG',
    domain: 'vocabulary',
    subDomain: 'near_synonyms',
    title: 'Phân biệt số đếm 二 (èr) và 两 (liǎng)',
    description: '二 dùng trong số đếm, thứ tự, số điện thoại; 两 dùng trước lượng từ để chỉ số lượng 2.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Khi nào dùng 二 (èr) và khi nào dùng 两 (liǎng)?',
    referenceExpected: {
      requiredKeywords: ['二', '两', 'số đếm', 'lượng từ', 'thứ tự'],
      forbiddenKeywords: ['dùng thay nhau tự do']
    },
    mockResponse: {
      text: 'Quy tắc phân biệt 二 (èr) và 两 (liǎng):\n1. 二 (èr): Dùng cho số đếm (一、二、三), số thứ tự (第二 - thứ hai), số điện thoại, phòng ốc, số thập phân và phân số.\n2. 两 (liǎng): Dùng trước LƯỢNG TỪ để chỉ số lượng là 2 (VD: 两个人 - 2 người, 两本书 - 2 cuốn sách). Không nói *二个人*.',
      tokensUsed: 105,
      latencyMs: 120
    }
  },

  // ==========================================
  // DOMAIN 2: PINYIN & PRONUNCIATION (Sandhi & Neutral Tones)
  // ==========================================
  {
    id: 'PINYIN_SANDHI_YI_FOURTH',
    domain: 'pinyin',
    subDomain: 'tone_sandhi',
    title: 'Biến điệu của 一 trước thanh 4',
    description: 'Chữ 一 (yī) khi đứng trước âm tiết mang thanh 4 phải đổi thành thanh 2 (yí).',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Phiên âm pinyin của 一个 và 一定 là gì? Giải thích quy tắc biến điệu của 一.',
    referenceExpected: {
      requiredKeywords: ['thanh 4', 'thanh 2', 'yí', 'biến điệu'],
      expectedPinyin: [
        { hanzi: '一个', pinyin: 'yí ge' },
        { hanzi: '一定', pinyin: 'yí dìng' }
      ]
    },
    mockResponse: {
      text: 'Phiên âm đúng:\n- 一个: yí ge\n- 一定: yí dìng\nQuy tắc: Chữ 一 (nguyên gốc mang thanh 1: yī) khi đứng trước một âm tiết mang THANH 4 thì phải biến điệu đọc thành THANH 2 (yí).',
      pinyin: 'yí ge, yí dìng',
      tokensUsed: 95,
      latencyMs: 110
    }
  },
  {
    id: 'PINYIN_SANDHI_YI_FIRST_SECOND_THIRD',
    domain: 'pinyin',
    subDomain: 'tone_sandhi',
    title: 'Biến điệu của 一 trước thanh 1, 2, 3',
    description: 'Chữ 一 đứng trước âm tiết thanh 1, 2, 3 phải biến điệu thành thanh 4 (yì).',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Phiên âm của 一天, 一年, 一起 là gì? Áp dụng quy tắc nào?',
    referenceExpected: {
      requiredKeywords: ['thanh 4', 'yì', 'thanh 1', 'thanh 2', 'thanh 3'],
      expectedPinyin: [
        { hanzi: '一天', pinyin: 'yì tiān' },
        { hanzi: '一年', pinyin: 'yì nián' },
        { hanzi: '一起', pinyin: 'yì qǐ' }
      ]
    },
    mockResponse: {
      text: 'Phiên âm đúng:\n- 一天: yì tiān (đứng trước thanh 1 tiān)\n- 一年: yì nián (đứng trước thanh 2 nián)\n- 一起: yì qǐ (đứng trước thanh 3 qǐ)\nQuy tắc: Chữ 一 khi đứng trước các âm tiết mang THANH 1, 2, 3 thì biến điệu thành THANH 4 (yì).',
      pinyin: 'yì tiān, yì nián, yì qǐ',
      tokensUsed: 100,
      latencyMs: 115
    }
  },
  {
    id: 'PINYIN_SANDHI_BU_FOURTH',
    domain: 'pinyin',
    subDomain: 'tone_sandhi',
    title: 'Biến điệu của 不 trước thanh 4',
    description: 'Chữ 不 (bù) khi đứng trước âm tiết thanh 4 chuyển thành thanh 2 (bú).',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Cho biết pinyin của 不是 và 不对. Tại sao không đọc là bù?',
    referenceExpected: {
      requiredKeywords: ['bú', 'thanh 4', 'thanh 2', 'biến điệu'],
      expectedPinyin: [
        { hanzi: '不是', pinyin: 'bú shì' },
        { hanzi: '不对', pinyin: 'bú duì' }
      ]
    },
    mockResponse: {
      text: 'Phiên âm đúng là: 不是 (bú shì) và 不对 (bú duì).\nGiải thích: Chữ 不 vốn mang thanh 4 (bù). Tuy nhiên, theo quy tắc biến điệu, khi 不 đứng trước bất kỳ âm tiết nào mang THANH 4 (như shì, duì, yào, qù), nó sẽ biến đổi thành THANH 2 (bú).',
      pinyin: 'bú shì, bú duì',
      tokensUsed: 95,
      latencyMs: 105
    }
  },
  {
    id: 'PINYIN_SANDHI_THIRD_PAIR',
    domain: 'pinyin',
    subDomain: 'tone_sandhi',
    title: 'Biến điệu hai thanh 3 đi liền nhau (你好, 可以)',
    description: 'Hai âm tiết mang thanh 3 đi liền nhau thì âm thứ nhất đọc thành thanh 2.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Hai thanh 3 đi liền nhau như trong 你好 phát âm như thế nào?',
    referenceExpected: {
      requiredKeywords: ['thanh 3', 'thanh 2', 'ní hǎo'],
      expectedPinyin: [
        { hanzi: '你好', pinyin: 'ní hǎo' },
        { hanzi: '可以', pinyin: 'ké yǐ' }
      ]
    },
    mockResponse: {
      text: 'Quy tắc biến điệu hai thanh 3:\nKhi hai âm tiết đều mang thanh 3 đi liền nhau, âm thứ nhất sẽ đọc thành THANH 2, âm thứ hai giữ nguyên thanh 3.\nVí dụ: 你好 viết phiên âm gốc là nǐ hǎo nhưng phát âm thực tế là "ní hǎo". Tương tự, 可以 phát âm là "ké yǐ".',
      pinyin: 'ní hǎo, ké yǐ',
      tokensUsed: 90,
      latencyMs: 100
    }
  },
  {
    id: 'PINYIN_NEUTRAL_BABA_MAMA',
    domain: 'pinyin',
    subDomain: 'neutral_tone',
    title: 'Thanh nhẹ (轻声) trong từ xưng hô gia đình (爸爸, 妈妈)',
    description: 'Âm tiết thứ 2 trong các từ láy thân mật gia đình là thanh nhẹ, không ghi dấu thanh điệu.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Phiên âm của 爸爸 và 妈妈 được ghi dấu thanh điệu như thế nào?',
    referenceExpected: {
      requiredKeywords: ['thanh nhẹ', 'bàba', 'māma', 'không có dấu'],
      expectedPinyin: [
        { hanzi: '爸爸', pinyin: 'bàba' },
        { hanzi: '妈妈', pinyin: 'māma' }
      ]
    },
    mockResponse: {
      text: 'Phiên âm đúng:\n- 爸爸: bàba (âm thứ hai là thanh nhẹ, không ghi dấu thanh điệu).\n- 妈妈: māma (âm thứ hai là thanh nhẹ).\nTrong tiếng Trung, âm tiết lặp lại trong các từ xưng hô gia đình (bàba, māma, gēge, jiějie, dìdi, mèimei) đều phát âm nhẹ và ngắn (thanh nhẹ - 轻声).',
      pinyin: 'bàba, māma',
      tokensUsed: 95,
      latencyMs: 110
    }
  },

  // ==========================================
  // DOMAIN 3: GRAMMAR (Structures & Sentence Patterns)
  // ==========================================
  {
    id: 'GRAMMAR_BA_CONSTRUCTION',
    domain: 'grammar',
    subDomain: 'ba_structure',
    title: 'Cấu trúc câu chữ 把 (Bǎ structure)',
    description: 'Chủ ngữ + 把 + Tân ngữ (xác định) + Động từ + Thành phần khác/Bổ ngữ. Không dùng động từ trơ trọi; không dùng cho động từ tri giác.',
    hskLevel: 3,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Giải thích công thức và điều kiện sử dụng của câu chữ 把. Đưa ra ví dụ đúng và một lỗi sai thường gặp.',
    referenceExpected: {
      requiredKeywords: ['把', 'tân ngữ', 'xác định', 'thành phần khác', 'tác động'],
      semanticRubric: [
        {
          criterion: 'Công thức ngữ pháp chính xác',
          weight: 0.35,
          description: 'Chủ ngữ + 把 + Tân ngữ + Động từ + Thành phần khác (bổ ngữ, 了...).',
          keywords: ['chủ ngữ', 'tân ngữ', 'thành phần khác']
        },
        {
          criterion: 'Điều kiện tính xác định của tân ngữ',
          weight: 0.3,
          description: 'Tân ngữ sau 把 phải là đối tượng đã được xác định rõ (người nói và nghe đều biết).',
          keywords: ['xác định', 'đối tượng']
        },
        {
          criterion: 'Quy tắc động từ không được đứng đơn độc',
          weight: 0.35,
          description: 'Động từ vị ngữ phải có tác động làm thay đổi trạng thái/vị trí và không được là động từ trần trụi (VD: không nói *我把苹果吃* mà phải là 我把苹果吃了).',
          keywords: ['đơn độc', 'thay đổi', 'thành phần khác']
        }
      ]
    },
    mockResponse: {
      text: 'Cấu trúc câu chữ 把 trong tiếng Trung:\n1. Công thức chuẩn:\nChủ ngữ + 把 + Tân ngữ (xác định) + Động từ + Thành phần khác (Bổ ngữ / 了 / ...)\n2. Đặc điểm quan trọng:\n- Tân ngữ sau 把 phải là đối tượng xác định mà người nghe và nói đều biết rõ.\n- Hành động phải mang tính tác động làm thay đổi vị trí, trạng thái hoặc xử lý đối tượng.\n- Động từ KHÔNG ĐƯỢC đứng trần trụi một mình.\n3. Ví dụ đúng:\n我把那本汉语书看完了。(Tôi đã đọc xong cuốn sách tiếng Trung đó).\n4. Lỗi sai phổ biến: *我把书看* ➔ Sai vì động từ "看" đứng đơn độc, bắt buộc phải có thành phần khác như "看完" hoặc "看了".',
      tokensUsed: 165,
      latencyMs: 180
    }
  },
  {
    id: 'GRAMMAR_PARTICLES_DE_DE_DE',
    domain: 'grammar',
    subDomain: 'de_particles',
    title: 'Phân biệt 3 chữ 的, 得, 地',
    description: '的 (định ngữ + danh từ), 得 (động từ/tính từ + bổ ngữ), 地 (trạng ngữ + động từ).',
    hskLevel: 2,
    tier: 'tier1_deterministic',
    promptInput: 'Phân biệt cách dùng của 3 chữ: 的 (đích), 得 (đắc), 地 (địa).',
    referenceExpected: {
      requiredKeywords: ['的', '得', '地', 'danh từ', 'động từ', 'bổ ngữ', 'trạng ngữ'],
      semanticRubric: [
        {
          criterion: 'Chức năng 的 trước danh từ',
          weight: 0.33,
          description: 'Nối định ngữ với trung tâm ngữ là danh từ (VD: 我的书, 漂亮的衣服).',
          keywords: ['danh từ', 'định ngữ']
        },
        {
          criterion: 'Chức năng 得 sau động từ/tính từ',
          weight: 0.34,
          description: 'Nối động từ/tính từ với bổ ngữ (VD: 跑得快, 高兴得很).',
          keywords: ['bổ ngữ', 'động từ', 'tính từ']
        },
        {
          criterion: 'Chức năng 地 trước động từ',
          weight: 0.33,
          description: 'Nối phó từ/trạng ngữ đứng trước động từ mô tả phương thức (VD: 认真地学, 高兴地说).',
          keywords: ['trạng ngữ', 'trước động từ']
        }
      ]
    },
    mockResponse: {
      text: 'Cách dùng chuẩn xác 3 chữ 的, 得, 地:\n1. 的 (de): Đứng trước DANH TỪ (Định ngữ + 的 + Danh từ).\nVD: 我的手机 (Điện thoại của tôi), 漂亮的衣服 (Bộ quần áo đẹp).\n2. 得 (de): Đứng sau ĐỘNG TỪ hoặc TÍNH TỪ để dẫn xuất BỔ NGỮ (Động từ/Tính từ + 得 + Bổ ngữ).\nVD: 跑得很快 (Chạy rất nhanh), 睡得好 (Ngủ ngon).\n3. 地 (de): Đứng trước ĐỘNG TỪ để làm TRẠNG NGỮ (Trạng ngữ + 地 + Động từ).\nVD: 认真地学习 (Học tập chăm chỉ), 慢慢地走 (Đi từ từ).',
      tokensUsed: 145,
      latencyMs: 160
    }
  },
  {
    id: 'GRAMMAR_ASPECT_LE_GUO_ZHE',
    domain: 'grammar',
    subDomain: 'aspect_particles',
    title: 'Phân biệt trợ từ động thái 了, 过, 着',
    description: '了 (hoàn thành/biến đổi), 过 (từng trải nghiệm trong quá khứ), 着 (tiếp diễn trạng thái).',
    hskLevel: 2,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Phân biệt ý nghĩa và cách dùng của 了, 过 và 着.',
    referenceExpected: {
      requiredKeywords: ['了', '过', '着', 'hoàn thành', 'trải nghiệm', 'tiếp diễn', 'trạng thái'],
      semanticRubric: [
        {
          criterion: 'Ý nghĩa của 了',
          weight: 0.33,
          description: 'Biểu thị động tác đã hoàn thành hoặc trạng thái có sự thay đổi.',
          keywords: ['hoàn thành', 'thay đổi']
        },
        {
          criterion: 'Ý nghĩa của 过',
          weight: 0.34,
          description: 'Biểu thị kinh nghiệm đã từng xảy ra trong quá khứ và hiện tại không còn tiếp diễn.',
          keywords: ['đã từng', 'kinh nghiệm', 'trải nghiệm']
        },
        {
          criterion: 'Ý nghĩa của 着',
          weight: 0.33,
          description: 'Biểu thị sự tiếp diễn hoặc duy trì của một trạng thái.',
          keywords: ['tiếp diễn', 'duy trì', 'trạng thái']
        }
      ]
    },
    mockResponse: {
      text: 'Sự khác nhau giữa 3 trợ từ động thái:\n- 了 (le): Biểu thị hành động đã HOÀN THÀNH hoặc có sự THAY ĐỔI trạng thái (VD: 我吃了早饭 - Tôi đã ăn sáng rồi; 下雨了 - Trời mưa rồi).\n- 过 (guo): Biểu thị TRẢI NGHIỆM trong quá khứ ("đã từng", hiện tại không còn diễn ra) (VD: 我去过北京 - Tôi đã từng đi Bắc Kinh).\n- 着 (zhe): Biểu thị sự DUY TRÌ TRẠNG THÁI hoặc hành động đang tiếp diễn (VD: 门开着 - Cửa đang mở; 他笑着说 - Anh ấy cười nói).',
      tokensUsed: 130,
      latencyMs: 140
    }
  },
  {
    id: 'GRAMMAR_WORD_ORDER_TIME_PLACE',
    domain: 'grammar',
    subDomain: 'word_order',
    title: 'Quy tắc trật tự từ: Thời gian và Địa điểm',
    description: 'Trong tiếng Trung, trạng ngữ chỉ thời gian và nơi chốn đứng TRƯỚC động từ: S + [Thời gian] + [Địa điểm] + V + O.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    promptInput: 'Dịch câu "Tôi học tiếng Trung ở trường vào buổi sáng" sang tiếng Trung. Giải thích quy tắc vị trí của thời gian và địa điểm.',
    referenceExpected: {
      requiredKeywords: ['我在学校', '早上', '学中文', 'trước động từ'],
      forbiddenKeywords: ['đặt ở cuối câu', 'sau động từ']
    },
    mockResponse: {
      text: 'Câu dịch đúng:\n我早上在学校学中文。(hoặc 早上我在学校学中文。)\nQuy tắc trật tự từ chuẩn của tiếng Trung:\nChủ ngữ + [Thời gian] + [Địa điểm] + Động từ + Tân ngữ. Trạng từ chỉ thời gian và nơi chốn luôn đứng trước động từ.',
      tokensUsed: 115,
      latencyMs: 130
    }
  },

  // ==========================================
  // DOMAIN 4: TRANSLATION (Two-way Contextual)
  // ==========================================
  {
    id: 'TRANS_ZH_VI_COMPLEX',
    domain: 'translation',
    subDomain: 'zh_to_vi',
    title: 'Dịch câu phức liên từ 不仅...而且... (Zh -> Vi)',
    description: 'Dịch câu phức biểu thị quan hệ tăng tiến từ tiếng Trung sang tiếng Việt một cách tự nhiên.',
    hskLevel: 3,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Dịch câu sau sang tiếng Việt: 他不仅很聪明，而且学习非常努力。',
    referenceExpected: {
      targetMeaningVi: 'Anh ấy không chỉ rất thông minh mà còn học tập vô cùng chăm chỉ.',
      acceptableAlternatives: [
        'Cậu ấy không những thông minh mà còn học rất chăm chỉ.',
        'Anh ta không chỉ thông minh mà còn học hành rất nỗ lực.'
      ],
      semanticRubric: [
        {
          criterion: 'Chính xác cấu trúc 不仅...而且...',
          weight: 0.4,
          description: 'Dịch đúng kết cấu tăng tiến "không những/không chỉ... mà còn...".',
          keywords: ['không chỉ', 'mà còn']
        },
        {
          criterion: 'Chính xác từ vựng và tự nhiên ngữ cảm',
          weight: 0.6,
          description: '聪明 dịch thành "thông minh", 努力 dịch thành "chăm chỉ / nỗ lực".',
          keywords: ['thông minh', 'chăm chỉ']
        }
      ]
    },
    mockResponse: {
      text: 'Dịch sang tiếng Việt:\n"Anh ấy không những rất thông minh mà còn học tập rất chăm chỉ." (hoặc: "Anh ấy không chỉ thông minh mà còn học hành vô cùng nỗ lực.")',
      translation_vi: 'Anh ấy không chỉ rất thông minh mà còn học tập vô cùng chăm chỉ.',
      tokensUsed: 65,
      latencyMs: 80
    }
  },
  {
    id: 'TRANS_VI_ZH_IDIOMATIC',
    domain: 'translation',
    subDomain: 'vi_to_zh',
    title: 'Dịch câu biểu cảm thân mật (Vi -> Zh)',
    description: 'Dịch: "Hôm nay trời rất lạnh, bạn nhớ mặc thêm áo ấm nhé." Chấp nhận các cấu trúc tự nhiên chuẩn văn phong.',
    hskLevel: 2,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Dịch câu sau sang tiếng Trung: "Hôm nay trời rất lạnh, bạn nhớ mặc thêm áo ấm nhé."',
    referenceExpected: {
      requiredKeywords: ['今天', '冷', '记得', '多穿'],
      acceptableAlternatives: [
        '今天天气很冷，你记得多穿点衣服。',
        '今天很冷，记得多穿点衣服。',
        '今天天气非常冷，你记得多穿件衣服。'
      ],
      semanticRubric: [
        {
          criterion: 'Cụm diễn đạt tự nhiên nhớ mặc thêm áo',
          weight: 0.5,
          description: 'Dùng cấu trúc tự nhiên "记得多穿点衣服" hoặc "多穿衣服", không dịch thô cứng.',
          keywords: ['多穿', '衣服', '记得']
        },
        {
          criterion: 'Thời tiết lạnh chuẩn xác',
          weight: 0.5,
          description: 'Dùng 今天天气很冷 hoặc 今天很冷.',
          keywords: ['今天', '冷']
        }
      ]
    },
    mockResponse: {
      text: 'Dịch sang tiếng Trung tự nhiên:\n今天天气很冷，你记得多穿点衣服。(Jīntiān tiānqì hěn lěng, nǐ jìde duō chuān diǎn yīfu.)\nGiải thích: Trong tiếng Trung, để khuyên ai mặc thêm quần áo ấm, người bản xứ thường dùng cấu trúc tự nhiên "多穿点衣服" (mặc thêm chút quần áo).',
      tokensUsed: 90,
      latencyMs: 100
    }
  },

  // ==========================================
  // DOMAIN 5: ERROR CORRECTION & FALSE CORRECTION PREVENTION
  // ==========================================
  {
    id: 'ERROR_CORR_SYNTACTIC_WORD_ORDER',
    domain: 'error_correction',
    subDomain: 'syntactic_error',
    title: 'Phát hiện lỗi sai trật tự từ nơi chốn (*我学中文在学校*)',
    description: 'Người học mắc lỗi đặt trạng ngữ địa điểm sau động từ do ảnh hưởng của tiếng Việt. AI phải phát hiện lỗi trật tự từ và sửa thành 我在学校学中文.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    userSentence: '我学中文在学校。',
    promptInput: 'Hãy kiểm tra và sửa câu này nếu có lỗi: "我学中文在学校。"',
    referenceExpected: {
      isCorrectSentence: false,
      expectedErrorDetection: true,
      expectedErrorCategory: 'syntactic',
      requiredKeywords: ['我在学校学中文', 'trật tự', 'trước động từ', 'địa điểm'],
      forbiddenKeywords: ['câu này hoàn toàn đúng']
    },
    mockResponse: {
      text: 'Câu của bạn bị SAI trật tự từ do ảnh hưởng của tiếng Việt:\n- Câu sai: *我学中文在学校。*\n- Câu sửa đúng: 我在学校学中文。(Wǒ zài xuéxiào xué Zhōngwén.)\nGiải thích: Trong tiếng Trung, cụm từ chỉ địa điểm (在 + nơi chốn) bắt buộc phải đứng TRƯỚC động từ, không được để ở cuối câu.',
      correction_json: JSON.stringify({
        is_error: true,
        category: 'syntactic',
        original: '我学中文在学校。',
        corrected: '我在学校学中文。',
        explanation: 'Trạng ngữ chỉ địa điểm phải đứng trước động từ.'
      }),
      tokensUsed: 120,
      latencyMs: 130
    }
  },
  {
    id: 'ERROR_CORR_BA_BARE_VERB',
    domain: 'error_correction',
    subDomain: 'ba_error',
    title: 'Phát hiện lỗi câu chữ 把 có động từ trơ trọi (*我把苹果吃*)',
    description: 'Người học viết câu chữ 把 với động từ đơn độc không có bổ ngữ hay thành phần khác. AI phải nhận diện lỗi.',
    hskLevel: 2,
    tier: 'tier1_deterministic',
    userSentence: '我把苹果吃。',
    promptInput: 'Kiểm tra giúp tôi câu: "我把苹果吃。"',
    referenceExpected: {
      isCorrectSentence: false,
      expectedErrorDetection: true,
      expectedErrorCategory: 'syntactic',
      requiredKeywords: ['吃了', '吃完', 'không được đứng một mình', 'thành phần khác'],
      forbiddenKeywords: ['câu này đúng rồi']
    },
    mockResponse: {
      text: 'Câu này CHƯA ĐÚNG cấu trúc câu chữ 把:\n- Câu của bạn: *我把苹果吃。*\n- Sửa đúng: 我把苹果吃了。(Tôi ăn quả táo rồi) hoặc 我把苹果吃完了。(Tôi ăn hết quả táo rồi).\nLý do: Trong câu chữ 把, động từ không bao giờ được đứng trơ trọi một mình mà bắt buộc phải mang theo thành phần bổ sung (như 了, bổ ngữ kết quả, bổ ngữ xu hướng) để thể hiện sự xử lý đối tượng.',
      correction_json: JSON.stringify({
        is_error: true,
        category: 'syntactic',
        original: '我把苹果吃。',
        corrected: '我把苹果吃了。',
        explanation: 'Động từ trong câu chữ 把 không được đứng đơn độc.'
      }),
      tokensUsed: 135,
      latencyMs: 140
    }
  },

  // CRITICAL: FALSE CORRECTION PREVENTION SUITE (Zero Tolerance for False Flags!)
  {
    id: 'FALSE_CORR_HEN_GAOXING',
    domain: 'error_correction',
    subDomain: 'false_positive_protection',
    title: 'Chống sửa nhầm: 我今天很高兴 (Câu đúng tuyệt đối)',
    description: 'Câu vị ngữ hình dung từ chuẩn với phó từ 很. AI tuyệt đối KHÔNG ĐƯỢC báo lỗi hay sửa thành 是很高兴!',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    userSentence: '我今天很高兴。',
    promptInput: 'Kiểm tra câu này xem có lỗi sai ngữ pháp không: "我今天很高兴。"',
    referenceExpected: {
      isCorrectSentence: true,
      falseCorrectionForbidden: true,
      expectedErrorDetection: false,
      requiredKeywords: ['chính xác', 'đúng', 'chuẩn'],
      forbiddenKeywords: ['sai', 'bị lỗi', 'sửa lại là', '我是很高兴', 'thiếu động từ']
    },
    mockResponse: {
      text: 'Câu "我今天很高兴。" là một câu CHÍNH XÁC VÀ TỰ NHIÊN 100% trong tiếng Trung!\n- Cấu trúc: Chủ ngữ (我) + Trạng từ thời gian (今天) + Phó từ mức độ (很) + Tính từ (高兴).\n- Trong tiếng Trung, tính từ làm vị ngữ không cần thêm động từ "是". Bạn dùng câu này rất chuẩn!',
      correction_json: JSON.stringify({
        is_error: false,
        original: '我今天很高兴。',
        verdict: 'correct'
      }),
      tokensUsed: 95,
      latencyMs: 100
    }
  },
  {
    id: 'FALSE_CORR_PENGYOU',
    domain: 'error_correction',
    subDomain: 'false_positive_protection',
    title: 'Chống sửa nhầm: 他是我的好朋友 (Câu đúng tuyệt đối)',
    description: 'Câu phán đoán 是 chuẩn với định ngữ 的. AI KHÔNG ĐƯỢC báo lỗi.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    userSentence: '他是我的好朋友。',
    promptInput: 'Xem giúp câu này có sai không nhé: "他是我的好朋友。"',
    referenceExpected: {
      isCorrectSentence: true,
      falseCorrectionForbidden: true,
      expectedErrorDetection: false,
      requiredKeywords: ['chính xác', 'chuẩn ngữ pháp'],
      forbiddenKeywords: ['bị lỗi sai', 'câu này có lỗi sai', 'cần sửa thành']
    },
    mockResponse: {
      text: 'Câu "他是我的好朋友。" hoàn toàn chính xác và chuẩn ngữ pháp. Câu này có nghĩa là "Anh ấy là bạn thân của tôi". Câu đúng hoàn toàn, không có lỗi gì.',
      correction_json: JSON.stringify({
        is_error: false,
        original: '他是我的好朋友。',
        verdict: 'correct'
      }),
      tokensUsed: 75,
      latencyMs: 80
    }
  },
  {
    id: 'FALSE_CORR_XIANG_HE_CHA',
    domain: 'error_correction',
    subDomain: 'false_positive_protection',
    title: 'Chống sửa nhầm: 我想喝茶 (Câu đúng tuyệt đối)',
    description: 'Câu năng nguyện chuẩn HSK1. AI KHÔNG ĐƯỢC phán sai.',
    hskLevel: 1,
    tier: 'tier1_deterministic',
    userSentence: '我想喝茶。',
    promptInput: 'Câu này có đúng không: "我想喝茶。"',
    referenceExpected: {
      isCorrectSentence: true,
      falseCorrectionForbidden: true,
      expectedErrorDetection: false,
      requiredKeywords: ['đúng', 'chuẩn'],
      forbiddenKeywords: ['sai', 'cần sửa']
    },
    mockResponse: {
      text: 'Câu "我想喝茶。" hoàn toàn ĐÚNG chuẩn tiếng Trung! Cấu trúc năng nguyện: Chủ ngữ + 想 + Động từ + Tân ngữ (Tôi muốn uống trà).',
      correction_json: JSON.stringify({
        is_error: false,
        original: '我想喝茶。',
        verdict: 'correct'
      }),
      tokensUsed: 65,
      latencyMs: 70
    }
  },
  {
    id: 'FALSE_CORR_TOPIC_COMMENT',
    domain: 'error_correction',
    subDomain: 'false_positive_protection',
    title: 'Chống sửa nhầm: 这本书我看过了 (Câu chủ đề - vị ngữ đúng)',
    description: 'Câu ngữ đề (Topic-Comment construction) rất phổ biến trong tiếng Trung bản xứ. AI không được bắt bẻ đổi thành 我看过这本书 rồi bảo câu kia sai.',
    hskLevel: 2,
    tier: 'tier1_deterministic',
    userSentence: '这本书我看过了。',
    promptInput: 'Câu "这本书我看过了。" có nói được như vậy không hay bị sai?',
    referenceExpected: {
      isCorrectSentence: true,
      falseCorrectionForbidden: true,
      expectedErrorDetection: false,
      requiredKeywords: ['hoàn toàn nói được', 'đúng', 'chủ đề'],
      forbiddenKeywords: ['sai ngữ pháp', 'không được đưa tân ngữ lên đầu']
    },
    mockResponse: {
      text: 'Câu "这本书我看过了。" HOÀN TOÀN ĐÚNG và rất tự nhiên trong khẩu ngữ tiếng Trung!\nĐây là cấu trúc "Câu chủ đề - vị ngữ" (Topic-Comment), đưa tân ngữ "这本书" lên đầu câu để nhấn mạnh đối tượng đang được bàn đến. Câu này tương đương với "我看过这本书了", cả hai đều đúng chuẩn.',
      correction_json: JSON.stringify({
        is_error: false,
        original: '这本书我看过了。',
        verdict: 'correct'
      }),
      tokensUsed: 105,
      latencyMs: 110
    }
  },

  // ==========================================
  // DOMAIN 6: TEACHING QUALITY & ADAPTIVE SCAFFOLDING
  // ==========================================
  {
    id: 'TEACHING_SCAFFOLD_STUCK_LEARNER',
    domain: 'teaching_quality',
    subDomain: 'adaptive_scaffolding',
    title: 'Thích ứng sư phạm khi học viên nói "chưa hiểu" (Không lặp lại vẹt)',
    description: 'Khi học viên nói chưa hiểu, AI không được nhắc lại định nghĩa sách vở mà phải dùng ẩn dụ đời thường, giải thích theo từng bước và tạo cơ hội thực hành.',
    hskLevel: 2,
    tier: 'tier3_behavioral_memory',
    promptInput: 'Mình vẫn chưa hiểu tại sao câu này lại phải dùng chữ 把, cô giải thích lại bằng cách nào dễ hiểu hơn được không?',
    referenceExpected: {
      requiredKeywords: ['đơn giản', 'ví dụ', 'thay đổi', 'thử'],
      forbiddenKeywords: ['như đã nói ở trên', 'S + 把 + O + V + complement'],
      behavioralRequirements: {
        mustScaffoldWithoutRepetition: true,
        mustPreserveLearnerAutonomy: true
      },
      semanticRubric: [
        {
          criterion: 'Hạ độ khó và dùng hình ảnh trực quan',
          weight: 0.5,
          description: 'Giải thích bằng hành động cụ thể trong đời sống (cầm nắm đồ vật, tác động làm nó thay đổi trạng thái).',
          keywords: ['hành động', 'tác động', 'thay đổi']
        },
        {
          criterion: 'Tạo cơ hội tự vận dụng tương tác',
          weight: 0.5,
          description: 'Đưa ra một thử thách nhỏ để học viên tự thử đặt câu.',
          keywords: ['bạn thử', 'thử đặt câu']
        }
      ]
    },
    mockResponse: {
      text: 'Đừng lo, cô sẽ giải thích thật trực quan cho bạn nhé!\nBạn cứ tưởng tượng "把" giống như động tác: bạn dùng tay CẦM lấy một vật gì đó và TÁC ĐỘNG làm nó THAY ĐỔI.\nVí dụ đời thường:\n- Bình thường: Tôi uống hết cốc nước rồi.\n- Khi dùng 把: "Tôi [lấy cốc nước] uống sạch rồi" ➔ 我把水喝完了。\nBạn thấy không: bạn lấy cốc nước (把水) và làm thay đổi nó thành rỗng không (喝完了)!\nBây giờ bạn thử nhé: Nếu bạn muốn nói "Tôi ăn hết quả táo rồi", bạn sẽ nói thế nào?',
      tokensUsed: 160,
      latencyMs: 170
    }
  },
  {
    id: 'TEACHING_LEVEL_APPROPRIATE_HSK1',
    domain: 'teaching_quality',
    subDomain: 'level_appropriateness',
    title: 'Phù hợp trình độ HSK 1: Giải thích ngắn gọn, từ vựng dễ hiểu',
    description: 'Với học viên HSK 1 mới bắt đầu, câu trả lời phải súc tích, tránh thuật ngữ ngôn ngữ học cao siêu, giải thích nghĩa tiếng Việt thân thiện.',
    hskLevel: 1,
    tier: 'tier2_semantic_rubric',
    promptInput: 'Từ 谢谢 trong tiếng Trung nghĩa là gì và đáp lại thế nào ạ?',
    referenceExpected: {
      requiredKeywords: ['cảm ơn', 'bú kèqi', 'không có gì'],
      forbiddenKeywords: ['ngữ dụng học', 'ngữ âm học cấu âm', 'tập hợp âm tiết biểu cảm'],
      semanticRubric: [
        {
          criterion: 'Giải thích nghĩa và phiên âm chuẩn',
          weight: 0.5,
          description: 'Nghĩa là "cảm ơn" (xièxie).',
          keywords: ['xièxie', 'cảm ơn']
        },
        {
          criterion: 'Câu đáp lại chuẩn văn hóa',
          weight: 0.5,
          description: 'Đáp lại bằng 不客气 (bú kèqi) nghĩa là không có gì/đừng khách sáo.',
          keywords: ['不客气', 'bú kèqi', 'đừng khách sáo', 'không có gì']
        }
      ]
    },
    mockResponse: {
      text: 'Chào bạn!\n- 谢谢 (xièxie) nghĩa là: "Cảm ơn".\n- Khi ai đó nói 谢谢 với bạn, bạn có thể đáp lại bằng:\n  不客气 (bú kèqi): "Không có gì" hoặc "Đừng khách sáo nhé!".\nThật đơn giản phải không nào?',
      tokensUsed: 80,
      latencyMs: 90
    }
  },

  // ==========================================
  // DOMAIN 7: MEMORY GROUNDING & HALLUCINATION PREVENTION
  // ==========================================
  {
    id: 'MEMORY_REFUSE_UNGROUNDED_MASTERY',
    domain: 'memory_grounding',
    subDomain: 'evidence_faithfulness',
    title: 'Chống ảo giác: Không khẳng định thành thạo khi chưa có bằng chứng',
    description: 'Khi bộ nhớ chỉ ghi nhận học viên mới tiếp xúc (exposed) và chưa có bài tập tự chủ nào, AI phải báo đúng thực tế, TUYỆT ĐỐI KHÔNG khẳng định "Bạn đã nắm vững".',
    hskLevel: 2,
    tier: 'tier3_behavioral_memory',
    promptInput: 'AI đánh giá xem tôi đã thành thạo câu chữ 把 chưa?',
    systemContext: 'Learner Ledger for target "grammar_把": stage = "exposed", total_evidences = 1, autonomous_success = 0. No independent practice recorded.',
    referenceExpected: {
      requiredKeywords: ['chưa', 'mới tiếp xúc', 'thực hành'],
      forbiddenKeywords: ['bạn đã thành thạo', 'đã nắm rất vững', 'làm chủ hoàn toàn câu chữ 把'],
      behavioralRequirements: {
        mustRefuseUngroundedMastery: true,
        expectedEvidenceStage: 'exposed'
      }
    },
    mockResponse: {
      text: 'Theo dữ liệu học tập hiện tại của bạn, bạn mới tiếp xúc với câu chữ 把 qua 1 bài học và chưa có lượt thực hành tự chủ nào được ghi nhận. Vì vậy, bạn vẫn chưa thành thạo cấu trúc này. Chúng ta hãy cùng làm một vài bài tập thực hành nhỏ nhé!',
      tokensUsed: 110,
      latencyMs: 120
    }
  },
  {
    id: 'MEMORY_GROUNDING_TARGETED_WEAKNESS',
    domain: 'memory_grounding',
    subDomain: 'evidence_faithfulness',
    title: 'Đề xuất bài luyện tập dựa đúng bằng chứng lỗi trong quá khứ',
    description: 'Context ghi nhận học viên liên tục sai thanh 2 và thanh 3 (Tone 2 & Tone 3). AI phải đề xuất bài luyện phát âm tập trung vào thanh 2/3, không bịa ra lỗi thanh 4 hay nguyên âm.',
    hskLevel: 1,
    tier: 'tier3_behavioral_memory',
    promptInput: 'Dựa vào lịch sử học của tôi, hãy đề xuất bài tập phát âm phù hợp cho tôi hôm nay.',
    systemContext: 'Learner Ledger: weaknesses = ["pronunciation_tone_2", "pronunciation_tone_3"], tone_accuracy = { tone1: 95%, tone2: 45%, tone3: 50%, tone4: 92% }',
    referenceExpected: {
      requiredKeywords: ['thanh 2', 'thanh 3', 'luyện tập'],
      forbiddenKeywords: ['bạn phát âm thanh 4 rất yếu', 'luyện nguyên âm a o e'],
      semanticRubric: [
        {
          criterion: 'Khớp chính xác điểm yếu từ ledger',
          weight: 1.0,
          description: 'Chỉ rõ và tập trung vào biến điệu hoặc phát âm của thanh 2 và thanh 3 đúng với dữ liệu lưu trữ.',
          keywords: ['thanh 2', 'thanh 3']
        }
      ]
    },
    mockResponse: {
      text: 'Dựa vào nhật ký học tập của bạn, bạn phát âm thanh 1 và thanh 4 rất tốt (trên 90%), nhưng thanh 2 (dấu sắc) và thanh 3 (dấu hỏi/ngã) độ chính xác hiện chỉ đạt 45-50%. Hôm nay chúng ta hãy tập trung luyện phân biệt các cặp từ thanh 2 và thanh 3 nhé (ví dụ: 十 shí vs 使 shǐ, 读 dú vs 赌 dǔ)!',
      tokensUsed: 125,
      latencyMs: 135
    }
  }
];
