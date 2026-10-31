import { db } from './db.js';
import { geminiTextService } from './geminiTextService.js';
import { geminiLessonService } from './geminiLessonService.js';

export type PlacementSkill = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing' | 'communication';

export interface PlacementQuestion {
  id: string;
  testId: string;
  skill: PlacementSkill;
  questionType: 'multiple_choice' | 'fill_in_blank' | 'reorder' | 'reading_comprehension' | 'listening_comprehension' | 'writing_translation' | 'dialogue_response';
  hskLevel: number;
  topic?: string;
  prompt: string;
  passage?: string;
  audioText?: string;
  options?: string[];
  correctAnswer: string;
  explanationVi: string;
  criteria?: {
    focusPoints?: string[];
    grammarTarget?: string;
  };
  orderIndex: number;
  weight: number;
}

export interface SkillScoreDetail {
  skill: PlacementSkill;
  label: string;
  score: number | null; // null if untested/skipped
  qualitative: string; // 'Xuất sắc' | 'Khá tốt' | 'Trung bình khá' | 'Cần củng cố' | 'Chưa có dữ liệu'
  status: 'tested' | 'untested' | 'partial';
  questionsCount: number;
  correctCount: number;
  hskDemonstrated: number;
  feedback: string;
}

export interface KnowledgeItem {
  item: string;
  pinyin?: string;
  meaningVi: string;
  hskLevel: number;
  type: 'vocabulary' | 'grammar' | 'sentence_pattern';
  notes?: string;
}

export interface PlacementResultReport {
  id: string;
  testId: string;
  testType: 'full' | 'quick';
  overallScore: number;
  estimatedHsk: number;
  estimatedHskLabel: string;
  confidenceLevel: 'high' | 'medium' | 'provisional';
  confidenceReason: string;
  skillScores: Record<PlacementSkill, SkillScoreDetail>;
  strengths: string[];
  weaknesses: string[];
  knowledgeBreakdown: {
    mastered: KnowledgeItem[];
    tentative: KnowledgeItem[];
    weakGaps: KnowledgeItem[];
    unknown: KnowledgeItem[];
  };
  recommendations: {
    suggestedPace: string;
    priorityTopics: string[];
    focusSkills: string[];
    nextAction: string;
  };
  syncedToProfile: boolean;
  createdAt: number;
  completedAt?: number;
  durationSeconds: number;
}

// =======================================================================
// CURATED ADAPTIVE QUESTION BANK COVERING HSK 1 TO 5 ACROSS 6 SKILLS
// =======================================================================
const QUESTION_BANK: Omit<PlacementQuestion, 'id' | 'testId' | 'orderIndex'>[] = [
  // ------------------- 1. VOCABULARY (Từ vựng) -------------------
  {
    skill: 'vocabulary',
    questionType: 'multiple_choice',
    hskLevel: 1,
    topic: 'Chào hỏi & Xã giao',
    prompt: 'Chọn nghĩa tiếng Việt chính xác của từ sau: "高兴" (gāoxìng)',
    options: ['Buồn bã, thất vọng', 'Vui mừng, phấn khởi', 'Mệt mỏi, uể oải', 'Lo lắng, bồn chồn'],
    correctAnswer: 'Vui mừng, phấn khởi',
    explanationVi: '高兴 (gāoxìng) là tính từ HSK 1 có nghĩa là vui vẻ, vui mừng (ví dụ: 很高兴认识你 - Rất vui được quen biết bạn).',
    weight: 1.0
  },
  {
    skill: 'vocabulary',
    questionType: 'multiple_choice',
    hskLevel: 2,
    topic: 'Phân biệt từ gần nghĩa',
    prompt: 'Điền từ thích hợp vào chỗ trống: "我不____去北京的火车票几点开。"',
    options: ['认识', '知道', '以为', '了解'],
    correctAnswer: '知道',
    explanationVi: 'Phân biệt 认识 (rènshi - quen biết người/mặt chữ) và 知道 (zhīdào - biết thông tin, tin tức sự việc). Ở đây nói về giờ tàu chạy là thông tin nên phải dùng 知道.',
    weight: 1.2
  },
  {
    skill: 'vocabulary',
    questionType: 'multiple_choice',
    hskLevel: 3,
    topic: 'Phân biệt phó từ & lượng từ',
    prompt: 'Chọn câu sử dụng đúng giữa "有点儿" và "一点儿":',
    options: [
      '今天天气一点儿冷。',
      '这件衣服有点儿大，有没有小一点儿的？',
      '我想喝有点儿水。',
      '他有点儿喜欢吃一点儿苹果。'
    ],
    correctAnswer: '这件衣服有点儿大，有没有小一点儿的？',
    explanationVi: 'Quy tắc HSK 3: "有点儿 + Tính từ" (mang sắc thái tiêu cực/không vừa ý như 有点儿大, 有点儿冷); còn "Tính từ + 一点儿" biểu thị mức độ nhẹ (như 小一点儿), "Động từ + 一点儿 + Danh từ" (như 喝一点儿水).',
    weight: 1.5
  },
  {
    skill: 'vocabulary',
    questionType: 'multiple_choice',
    hskLevel: 4,
    topic: 'Từ đồng nghĩa & ngữ cảnh',
    prompt: 'Điền từ phù hợp nhất vào chỗ trống: "无论遇到多大的困难，我们都不能____希望。"',
    options: ['放弃', '抛弃', '丢掉', '辞职'],
    correctAnswer: '放弃',
    explanationVi: '放弃 (fàngqì) kết hợp với danh từ trừu tượng như 希望 (hy vọng), 机会 (cơ hội), 梦想 (ước mơ). 抛弃 thường dùng cho bỏ rơi ai đó; 丢掉 là vứt bỏ đồ vật cụ thể.',
    weight: 1.8
  },
  {
    skill: 'vocabulary',
    questionType: 'multiple_choice',
    hskLevel: 5,
    topic: 'Từ ngữ học thuật / Trừu tượng',
    prompt: 'Chọn từ đồng nghĩa thích hợp với "仔细" (zǐxì) trong câu "请仔细阅读这份合同":',
    options: ['粗心', '认真', '马虎', '随便'],
    correctAnswer: '认真',
    explanationVi: '仔细 (cẩn thận, kỹ lưỡng) đồng nghĩa với 认真 (nghiêm túc, cẩn trọng). 粗心 và 马虎 là từ trái nghĩa (cẩu thả, đoảng).',
    weight: 2.0
  },

  // ------------------- 2. GRAMMAR (Ngữ pháp) -------------------
  {
    skill: 'grammar',
    questionType: 'multiple_choice',
    hskLevel: 1,
    topic: 'Trật tự từ chỉ thời gian',
    prompt: 'Chọn câu có trật tự từ đúng trong tiếng Trung:',
    options: [
      '我去图书馆明天下午。',
      '明天下午我回家吃晚饭。',
      '我吃早饭七点在家里。',
      '去中国明年我打算。'
    ],
    correctAnswer: '明天下午我回家吃晚饭。',
    explanationVi: 'Trong tiếng Trung, trạng từ chỉ thời gian (明天下午) phải đứng trước động từ (sau chủ ngữ hoặc ở đầu câu), tuyệt đối không đặt ở cuối câu như tiếng Việt.',
    weight: 1.0
  },
  {
    skill: 'grammar',
    questionType: 'multiple_choice',
    hskLevel: 2,
    topic: 'Cấu trúc câu hỏi với 怎么 vs 为什么',
    prompt: 'Trong ngữ cảnh muốn hỏi phương tiện hoặc cách thức di chuyển, câu nào sau đây là chính xác?',
    options: [
      '你为什么去河内？',
      '你怎么去河内？',
      '你怎么样去河内？',
      '你河内去什么？'
    ],
    correctAnswer: '你怎么去河内？',
    explanationVi: '怎么 + Động từ (你怎么去...) dùng để hỏi cách thức/phương tiện hành động. Còn 为什么 hỏi lý do/nguyên nhân. 怎么样 đứng sau chủ ngữ hoặc ở cuối câu làm vị ngữ.',
    weight: 1.2
  },
  {
    skill: 'grammar',
    questionType: 'multiple_choice',
    hskLevel: 3,
    topic: 'Cấu trúc câu chữ 把 (Bǎ)',
    prompt: 'Chọn câu sử dụng cấu trúc câu chữ "把" đúng ngữ pháp:',
    options: [
      '我把作业做了在桌子上。',
      '他把那杯咖啡喝完了。',
      '把书我放在书架上。',
      '我没有把昨天的那本书看。'
    ],
    correctAnswer: '他把那杯咖啡喝完了。',
    explanationVi: 'Công thức câu chữ 把: Chủ ngữ + (Phó từ/Phủ định) + 把 + Tân ngữ xử lý + Động từ + Thành phần khác (bổ ngữ kết quả/xong: 喝完了). Từ phủ định 没有 phải đứng trước 把.',
    weight: 1.5
  },
  {
    skill: 'grammar',
    questionType: 'reorder',
    hskLevel: 3,
    topic: 'Phân biệt trợ từ 的, 得, 地',
    prompt: 'Sắp xếp các cụm từ sau thành câu đúng: [他] / [跑] / [非常快] / [得]',
    options: ['他跑得非常快。', '跑他得非常快。', '他得跑非常快。', '他非常快跑得。'],
    correctAnswer: '他跑得非常快。',
    explanationVi: 'Bổ ngữ trạng thái dùng 得: Động từ + 得 + Cụm miêu tả mức độ (跑得非常快 - chạy rất nhanh).',
    weight: 1.5
  },
  {
    skill: 'grammar',
    questionType: 'multiple_choice',
    hskLevel: 4,
    topic: 'Cấu trúc câu chữ 被 (Bị động)',
    prompt: 'Chuyển câu chủ động "弟弟吃光了所有苹果" sang câu bị động chữ 被:',
    options: [
      '所有苹果被弟弟吃光了。',
      '弟弟被所有苹果吃光了。',
      '所有苹果弟弟被吃光了。',
      '被所有苹果弟弟吃光了。'
    ],
    correctAnswer: '所有苹果被弟弟吃光了。',
    explanationVi: 'Công thức câu chữ 被: Đối tượng chịu tác động (所有苹果) + 被 + Chủ thể gây ra (弟弟) + Động từ + Thành phần khác (吃光了).',
    weight: 1.8
  },

  // ------------------- 3. READING (Đọc hiểu) -------------------
  {
    skill: 'reading',
    questionType: 'reading_comprehension',
    hskLevel: 1,
    topic: 'Đoạn tin nhắn ngắn',
    passage: '王老师，我今天身体不太舒服，头很疼，可能发烧了。我想请假一天去医院看病。李明。',
    prompt: 'Dựa vào tin nhắn trên, tại sao Lý Minh xin nghỉ học?',
    options: [
      'Vì bạn của Lý Minh bị ốm',
      'Vì Lý Minh đi du lịch Bắc Kinh',
      'Vì Lý Minh bị đau đầu, có thể bị sốt và cần đi viện',
      'Vì Lý Minh phải chuẩn bị thi HSK'
    ],
    correctAnswer: 'Vì Lý Minh bị đau đầu, có thể bị sốt và cần đi viện',
    explanationVi: 'Đoạn văn nói rõ: "我今天身体不太舒服，头很疼，可能发烧了。我想请假一天去医院看病。" (Hôm nay tôi không khỏe, đau đầu, có thể bị sốt, muốn xin nghỉ một ngày đi khám bệnh).',
    weight: 1.0
  },
  {
    skill: 'reading',
    questionType: 'reading_comprehension',
    hskLevel: 2,
    topic: 'Thông báo & Đời sống',
    passage: '这家书店平时早上八点半开门，晚上九点关门。但是星期天关门比较早，下午六点就关门了。书店旁边有一家咖啡馆，很多学生喜欢一边喝咖啡一边看书。',
    prompt: 'Vào ngày Chủ Nhật, hiệu sách đóng cửa lúc mấy giờ?',
    options: ['8 giờ 30 sáng', '6 giờ chiều (18:00)', '9 giờ tối (21:00)', 'Không mở cửa vào Chủ Nhật'],
    correctAnswer: '6 giờ chiều (18:00)',
    explanationVi: 'Câu thứ 2 chỉ rõ: "但是星期天关门比较早，下午六点就关门了。" (Nhưng Chủ Nhật đóng cửa sớm hơn, 6 giờ chiều đã đóng cửa).',
    weight: 1.2
  },
  {
    skill: 'reading',
    questionType: 'reading_comprehension',
    hskLevel: 3,
    topic: 'Kể chuyện & Rút ra bài học',
    passage: '很多人觉得学习汉语最难的是汉字，因为汉字不仅数量多，而且笔画很复杂。其实，每一个汉字背后都有一个有趣的故事。只要你掌握了汉字的偏旁部首，并经常练习书写，你就会发现写汉字并不像想象的那么难。',
    prompt: 'Theo tác giả đoạn văn, làm thế nào để việc học chữ Hán trở nên dễ dàng hơn?',
    options: [
      'Chỉ cần học Pinyin không cần học chữ Hán',
      'Nắm vững bộ thủ và thường xuyên luyện viết',
      'Đọc thật nhiều tiểu thuyết tiếng Trung cổ điển',
      'Nhờ người bản xứ viết hộ'
    ],
    correctAnswer: 'Nắm vững bộ thủ và thường xuyên luyện viết',
    explanationVi: 'Tác giả viết: "只要你掌握了汉字的偏旁部首，并经常练习书写，你就会发现写汉字并不像想象的那么难。" (Chỉ cần bạn nắm vững các bộ thủ và thường xuyên luyện viết, bạn sẽ nhận ra viết chữ Hán không khó như tưởng tượng).',
    weight: 1.5
  },
  {
    skill: 'reading',
    questionType: 'reading_comprehension',
    hskLevel: 4,
    topic: 'Bài luận xã hội & Tâm lý',
    passage: '现代人的生活节奏越来越快，工作压力也越来越大。很多人常常抱怨时间不够用，每天忙于应付各种琐事，却忽略了身体健康和内心的平静。专家建议，每天抽出至少半个小时放下手机，散步或者做一些自己喜欢的运动，这样能有效缓解压力，提高工作效率。',
    prompt: 'Mục đích chính của đoạn văn trên là gì?',
    options: [
      'Khuyên mọi người nên mua nhiều thiết bị điện tử mới',
      'Khuyên mọi người dành thời gian thư giãn, tập thể dục và giảm dùng điện thoại để cân bằng cuộc sống',
      'Giải thích nguyên nhân vì sao kinh tế hiện đại phát triển nhanh',
      'Chỉ trích những người không chịu làm việc thêm giờ'
    ],
    correctAnswer: 'Khuyên mọi người dành thời gian thư giãn, tập thể dục và giảm dùng điện thoại để cân bằng cuộc sống',
    explanationVi: 'Ý chính đoạn văn nhấn mạnh lời khuyên của chuyên gia: "放下手机，散步或者做一些自己喜欢的运动，这样能有效缓解压力，提高工作效率" (Buông điện thoại, đi bộ hoặc tập thể thao để giảm stress và tăng năng suất).',
    weight: 1.8
  },

  // ------------------- 4. LISTENING (Nghe hiểu) -------------------
  {
    skill: 'listening',
    questionType: 'listening_comprehension',
    hskLevel: 1,
    topic: 'Nghe số điện thoại & Giờ giấc',
    audioText: '请问，现在几点了？现在是下午三点一刻。',
    prompt: 'Bấm nghe đoạn âm thanh và cho biết: Bây giờ là mấy giờ?',
    options: ['3 giờ đúng', '3 giờ 15 phút (3点一刻)', '3 giờ 30 phút (3点半)', '3 giờ 45 phút (3点三刻)'],
    correctAnswer: '3 giờ 15 phút (3点一刻)',
    explanationVi: 'Người nói trả lời: "现在是下午三点一刻。" (Bây giờ là 3 giờ 15 phút chiều). 一刻 (yí kè) = 15 phút.',
    weight: 1.0
  },
  {
    skill: 'listening',
    questionType: 'listening_comprehension',
    hskLevel: 2,
    topic: 'Nghe địa điểm & Phương hướng',
    audioText: '大卫，你去超市的时候，顺便帮我买两瓶牛奶和几个苹果吧。好的，没问题。',
    prompt: 'Bấm nghe đoạn âm thanh và cho biết: Người nói nhờ David mua những gì?',
    options: [
      '2 chai nước ngọt và bánh mì',
      '2 chai sữa tươi và vài quả táo',
      'Trà sữa và cà phê',
      'Hoa quả và rau xanh'
    ],
    correctAnswer: '2 chai sữa tươi và vài quả táo',
    explanationVi: 'Trong đoạn nghe: "顺便帮我买两瓶牛奶和几个苹果吧。" (Tiện thể mua giúp tôi 2 chai sữa bò và mấy quả táo nhé).',
    weight: 1.2
  },
  {
    skill: 'listening',
    questionType: 'listening_comprehension',
    hskLevel: 3,
    topic: 'Nghe hội thoại công việc & Lý do',
    audioText: '喂，张经理，我刚才看了您发给我的邮件。关于下周一开会的事情，我有几个新的想法想跟您汇报一下。',
    prompt: 'Bấm nghe đoạn âm thanh và xác định: Người gọi muốn trao đổi về vấn đề gì?',
    options: [
      'Xin nghỉ phép vào thứ Hai tuần tới',
      'Báo cáo một vài ý tưởng mới về cuộc họp thứ Hai tuần tới',
      'Hỏi về việc chuyển tiền công tác phí',
      'Nhờ gửi lại bức thư điện tử bị mất'
    ],
    correctAnswer: 'Báo cáo một vài ý tưởng mới về cuộc họp thứ Hai tuần tới',
    explanationVi: 'Trong đoạn hội thoại: "关于下周一开会的事情，我有几个新的想法想跟您汇报一下。" (Về việc cuộc họp thứ Hai tới, tôi có vài ý tưởng mới muốn báo cáo với sếp).',
    weight: 1.5
  },
  {
    skill: 'listening',
    questionType: 'listening_comprehension',
    hskLevel: 4,
    topic: 'Nghe thông báo sân bay / Nhà ga',
    audioText: '各位旅客请注意，由于北京机场天气原因，由本站飞往北京的CA1832次航班起飞时间将推迟到晚上八点，请各位旅客在候机厅耐心等待。',
    prompt: 'Bấm nghe thông báo và cho biết: Tại sao chuyến bay bị hoãn?',
    options: [
      'Vì máy bay bị trục trặc kỹ thuật',
      'Vì thời tiết tại sân bay Bắc Kinh không thuận lợi',
      'Vì chưa đủ số lượng hành khách lên máy bay',
      'Vì phi công đến muộn'
    ],
    correctAnswer: 'Vì thời tiết tại sân bay Bắc Kinh không thuận lợi',
    explanationVi: 'Thông báo nêu rõ: "由于北京机场天气原因...起飞时间将推迟到晚上八点" (Do nguyên nhân thời tiết tại sân bay Bắc Kinh... giờ cất cánh sẽ dời đến 8 giờ tối).',
    weight: 1.8
  },

  // ------------------- 5. WRITING (Khả năng viết) -------------------
  {
    skill: 'writing',
    questionType: 'writing_translation',
    hskLevel: 1,
    topic: 'Dịch câu cơ bản',
    prompt: 'Dịch câu sau sang chữ Hán: "Tôi rất thích uống trà xanh Trung Quốc."',
    correctAnswer: '我很喜欢喝中国绿茶。',
    explanationVi: 'Cấu trúc: Chủ ngữ (我) + Phó từ mức độ (很) + Động từ (喜欢) + Cụm hành động (喝中国绿茶).',
    criteria: {
      grammarTarget: 'Chủ ngữ + 很喜欢 + Động từ + Tân ngữ',
      focusPoints: ['Trật tự từ', 'Chữ Hán chuẩn xác', 'Không sai trật tự định ngữ - trung tâm ngữ']
    },
    weight: 1.2
  },
  {
    skill: 'writing',
    questionType: 'writing_translation',
    hskLevel: 2,
    topic: 'Dịch câu có thời gian & nơi chốn',
    prompt: 'Dịch câu sau sang chữ Hán: "Tối hôm qua lúc 8 giờ, tôi đang đọc sách ở thư viện."',
    correctAnswer: '昨天晚上八点我在图书馆看书。',
    explanationVi: 'Trật tự chuẩn: Thời gian (昨天晚上八点) + Chủ ngữ (我) + Giới từ nơi chốn (在图书馆) + Hành động (看书/正在看书).',
    criteria: {
      grammarTarget: 'Thời gian + Chủ ngữ + 在 + Nơi chốn + Động từ',
      focusPoints: ['Vị trí thời gian trước động từ', 'Vị trí cụm giới từ 在 nơi chốn trước hành động']
    },
    weight: 1.5
  },
  {
    skill: 'writing',
    questionType: 'writing_translation',
    hskLevel: 3,
    topic: 'Viết câu chữ 把 hoặc liên từ',
    prompt: 'Dịch câu sau sang chữ Hán sử dụng cấu trúc câu chữ 把: "Hãy đưa cho tôi cốc nước kia."',
    correctAnswer: '把那杯水给我吧。',
    explanationVi: 'Cấu trúc: 把 + Tân ngữ (那杯水) + Động từ đưa (给) + Tân ngữ nhận (我) + Trợ từ ngữ khí (吧). Hoặc: 请把那杯水给我。',
    criteria: {
      grammarTarget: '把 + Tân ngữ + 给 + Người nhận',
      focusPoints: ['Sử dụng đúng cấu trúc 把', 'Chữ Hán 那杯水 và 给']
    },
    weight: 1.8
  },

  // ------------------- 6. COMMUNICATION (Giao tiếp & Phản xạ) -------------------
  {
    skill: 'communication',
    questionType: 'dialogue_response',
    hskLevel: 1,
    topic: 'Giao tiếp hàng ngày / Chào hỏi',
    prompt: 'AI hỏi bạn: "你好！很高兴认识你，你叫什么名字？你是哪国人？"\nHãy trả lời bằng tiếng Trung (bằng giọng nói hoặc gõ chữ):',
    correctAnswer: '你好！我也很高兴认识你。我叫...，我是越南人。',
    explanationVi: 'Tiêu chí đánh giá: Trả lời đúng trọng tâm câu hỏi (tên và quốc tịch), có lời chào đáp lại lễ phép (你好/我也很高兴认识你).',
    criteria: {
      focusPoints: ['Chào hỏi phản hồi', 'Tự giới thiệu tên (我叫...)', 'Khẳng định quốc tịch (我是越南人)']
    },
    weight: 1.2
  },
  {
    skill: 'communication',
    questionType: 'dialogue_response',
    hskLevel: 2,
    topic: 'Tình huống nhà hàng',
    prompt: 'Phục vụ nhà hàng hỏi bạn: "您好，两位想吃点儿什么？我们店的烤鸭和水饺很受欢迎。"\nHãy đóng vai khách hàng và phản hồi lại (ví dụ gọi món, hỏi giá hoặc cảm ơn):',
    correctAnswer: '你好，我们要一只烤鸭和一份水饺，再来两杯茶，谢谢。',
    explanationVi: 'Tiêu chí: Sử dụng từ ngữ gọi món (要 / 来 / 点), biết dùng lượng từ (一份, 一只, 两杯), biểu đạt tự nhiên trong ngữ cảnh ăn uống.',
    criteria: {
      focusPoints: ['Kỹ năng tương tác gọi món', 'Sử dụng lượng từ thích hợp', 'Biểu đạt tự nhiên']
    },
    weight: 1.5
  },
  {
    skill: 'communication',
    questionType: 'dialogue_response',
    hskLevel: 3,
    topic: 'Hỏi đường & Giao thông',
    prompt: 'Người qua đường hỏi bạn: "请问，去最近的地铁站怎么走？大概需要多长时间？"\nHãy hướng dẫn đường đi bằng tiếng Trung:',
    correctAnswer: '你一直往前走，在第一个路口向右拐，大概走十分钟就能看到地铁站了。',
    explanationVi: 'Tiêu chí: Sử dụng mẫu câu chỉ đường (一直往前走, 向右/左拐), ước lượng thời gian (大概需要...分钟).',
    criteria: {
      focusPoints: ['Mẫu câu phương hướng (往/向...走/拐)', 'Mẫu câu ước lượng thời gian (大概...分钟)', 'Tính mạch lạc']
    },
    weight: 1.8
  }
];

export class GeminiPlacementService {
  /**
   * Tạo phiên kiểm tra trình độ mới
   * @param testType 'full' (6 kỹ năng) hoặc 'quick' (3 kỹ năng: vocab, grammar, reading)
   */
  public async createTest(testType: 'full' | 'quick' = 'full'): Promise<{
    testId: string;
    testType: 'full' | 'quick';
    totalQuestions: number;
    sections: PlacementSkill[];
  }> {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sections: PlacementSkill[] = testType === 'full'
      ? ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'communication']
      : ['vocabulary', 'grammar', 'reading'];

    // Lọc và chọn câu hỏi cân đối
    const selectedQuestions: Array<Omit<PlacementQuestion, 'id' | 'testId' | 'orderIndex'> & { orderIndex: number }> = [];
    let orderCounter = 1;

    for (const section of sections) {
      const sectionQuestions = QUESTION_BANK.filter(q => q.skill === section);
      // Sắp xếp tăng dần theo HSK để thực hiện đo lường thích ứng (HSK 1, 2, 3...)
      const sorted = [...sectionQuestions].sort((a, b) => a.hskLevel - b.hskLevel);
      // Lấy 3 câu đại diện cho mỗi kỹ năng
      const picked = sorted.slice(0, 3);
      for (const q of picked) {
        selectedQuestions.push({
          ...q,
          orderIndex: orderCounter++
        });
      }
    }

    const now = Date.now();

    // Lưu vào bảng placement_assessments
    db.prepare(`
      INSERT INTO placement_assessments (id, test_type, status, current_section, current_question_index, adaptive_level, skipped_sections_json, started_at, created_at)
      VALUES (?, ?, 'in_progress', ?, 0, 1, '[]', ?, ?)
    `).run(testId, testType, sections[0], now, now);

    // Lưu từng câu hỏi vào placement_questions
    const insertQ = db.prepare(`
      INSERT INTO placement_questions (
        id, test_id, skill, question_type, hsk_level, topic, prompt, passage, audio_text, options_json, correct_answer, explanation_vi, criteria_json, order_index, weight
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of selectedQuestions) {
      const qId = `q_${testId}_${q.orderIndex}`;
      insertQ.run(
        qId,
        testId,
        q.skill,
        q.questionType,
        q.hskLevel,
        q.topic || '',
        q.prompt,
        q.passage || null,
        q.audioText || null,
        q.options ? JSON.stringify(q.options) : null,
        q.correctAnswer,
        q.explanationVi,
        q.criteria ? JSON.stringify(q.criteria) : null,
        q.orderIndex,
        q.weight
      );
    }

    return {
      testId,
      testType,
      totalQuestions: selectedQuestions.length,
      sections
    };
  }

  /**
   * Lấy thông tin bài kiểm tra và câu hỏi hiện tại
   */
  public async getTestProgress(testId: string) {
    const assessment = db.prepare('SELECT * FROM placement_assessments WHERE id = ?').get(testId) as any;
    if (!assessment) return null;

    const questions = db.prepare('SELECT * FROM placement_questions WHERE test_id = ? ORDER BY order_index ASC').all(testId) as any[];
    const answers = db.prepare('SELECT * FROM placement_answers WHERE test_id = ?').all(testId) as any[];

    const answersMap: Record<string, any> = {};
    for (const a of answers) {
      answersMap[a.question_id] = {
        id: a.id,
        userAnswer: a.user_answer,
        isCorrect: Boolean(a.is_correct),
        score: a.score,
        aiFeedback: a.ai_feedback,
        answeredAt: a.answered_at
      };
    }

    const formattedQuestions: PlacementQuestion[] = questions.map(q => ({
      id: q.id,
      testId: q.test_id,
      skill: q.skill as PlacementSkill,
      questionType: q.question_type,
      hskLevel: q.hsk_level,
      topic: q.topic,
      prompt: q.prompt,
      passage: q.passage,
      audioText: q.audio_text,
      options: q.options_json ? JSON.parse(q.options_json) : undefined,
      correctAnswer: q.correct_answer,
      explanationVi: q.explanation_vi,
      criteria: q.criteria_json ? JSON.parse(q.criteria_json) : undefined,
      orderIndex: q.order_index,
      weight: q.weight
    }));

    const skippedSections: string[] = assessment.skipped_sections_json ? JSON.parse(assessment.skipped_sections_json) : [];

    return {
      assessment: {
        id: assessment.id,
        testType: assessment.test_type,
        status: assessment.status,
        currentSection: assessment.current_section,
        currentQuestionIndex: assessment.current_question_index,
        adaptiveLevel: assessment.adaptive_level,
        skippedSections,
        startedAt: assessment.started_at,
        completedAt: assessment.completed_at,
        durationSeconds: assessment.duration_seconds
      },
      questions: formattedQuestions,
      answers: answersMap,
      totalQuestions: formattedQuestions.length,
      answeredCount: answers.length
    };
  }

  /**
   * Lấy bài kiểm tra dở dang gần nhất (nếu có)
   */
  public async getActiveTest() {
    const active = db.prepare(`
      SELECT id FROM placement_assessments 
      WHERE status = 'in_progress' 
      ORDER BY started_at DESC LIMIT 1
    `).get() as any;

    if (!active) return null;
    return this.getTestProgress(active.id);
  }

  /**
   * Nộp câu trả lời cho một câu hỏi
   */
  public async submitAnswer(params: {
    testId: string;
    questionId: string;
    userAnswer: string;
    durationIncrementSeconds?: number;
  }): Promise<{
    success: boolean;
    isCorrect: boolean;
    score: number;
    explanation: string;
    feedback?: string;
    nextQuestionIndex: number;
    nextAdaptiveLevel: number;
    isFinished: boolean;
  }> {
    const { testId, questionId, userAnswer } = params;
    const q = db.prepare('SELECT * FROM placement_questions WHERE id = ? AND test_id = ?').get(questionId, testId) as any;
    if (!q) {
      throw new Error('Câu hỏi không tồn tại trong bài kiểm tra này');
    }

    let isCorrect = false;
    let score = 0;
    let aiFeedback = '';

    const cleanAnswer = userAnswer.trim();

    // 1. Đối với trắc nghiệm / điền từ / sắp xếp: chấm trực tiếp
    if (['multiple_choice', 'fill_in_blank', 'reorder', 'reading_comprehension', 'listening_comprehension'].includes(q.question_type)) {
      const cleanExpected = q.correct_answer.trim();
      if (cleanAnswer.toLowerCase() === cleanExpected.toLowerCase() || cleanAnswer.replace(/\s+/g, '') === cleanExpected.replace(/\s+/g, '')) {
        isCorrect = true;
        score = 100;
        aiFeedback = 'Chính xác! Bạn đã chọn đáp án đúng.';
      } else {
        isCorrect = false;
        score = 0;
        aiFeedback = `Chưa chính xác. Đáp án đúng là: "${q.correct_answer}".`;
      }
    } 
    // 2. Đối với bài viết hoặc giao tiếp: Gọi Gemini Text Model để chấm điểm chuyên sâu
    else if (q.question_type === 'writing_translation' || q.question_type === 'dialogue_response') {
      try {
        const evaluation = await this.evaluateOpenEndedAnswer({
          skill: q.skill,
          questionPrompt: q.prompt,
          expectedAnswer: q.correct_answer,
          userAnswer: cleanAnswer,
          hskLevel: q.hsk_level,
          criteria: q.criteria_json ? JSON.parse(q.criteria_json) : undefined
        });

        score = evaluation.score;
        isCorrect = evaluation.score >= 60;
        aiFeedback = evaluation.feedbackVi;
      } catch (err: any) {
        console.warn('Gemini grading error, using robust fallback evaluation:', err.message);
        // Fallback rule-based matching if offline/latency
        const similarity = this.calculateStringSimilarity(cleanAnswer, q.correct_answer);
        score = Math.round(similarity * 100);
        isCorrect = score >= 60;
        aiFeedback = isCorrect 
          ? `Câu trả lời tương đối chuẩn xác (${score}%). Câu tham khảo: "${q.correct_answer}".`
          : `Câu trả lời cần cải thiện. Câu chuẩn: "${q.correct_answer}".`;
      }
    }

    // Lưu bản ghi vào placement_answers
    const answerId = `ans_${testId}_${q.order_index}`;
    db.prepare(`
      INSERT OR REPLACE INTO placement_answers (id, test_id, question_id, skill, user_answer, is_correct, score, ai_feedback, answered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(answerId, testId, questionId, q.skill, cleanAnswer, isCorrect ? 1 : 0, score, aiFeedback, Date.now());

    // Cập nhật điều chỉnh độ khó thích ứng (Adaptive CAT)
    const currentAssessment = db.prepare('SELECT adaptive_level, current_question_index, duration_seconds FROM placement_assessments WHERE id = ?').get(testId) as any;
    let nextAdaptiveLevel = currentAssessment.adaptive_level || 1;

    if (isCorrect) {
      // Đúng liên tục: nâng độ khó dần lên đến HSK 5
      nextAdaptiveLevel = Math.min(5, nextAdaptiveLevel + 1);
    } else {
      // Sai: kiểm tra lại nền tảng
      nextAdaptiveLevel = Math.max(1, nextAdaptiveLevel - 1);
    }

    const nextIndex = (currentAssessment.current_question_index || 0) + 1;
    const totalQuestions = (db.prepare('SELECT COUNT(*) as count FROM placement_questions WHERE test_id = ?').get(testId) as any).count;
    const isFinished = nextIndex >= totalQuestions;

    const newDuration = (currentAssessment.duration_seconds || 0) + (params.durationIncrementSeconds || 20);

    db.prepare(`
      UPDATE placement_assessments 
      SET current_question_index = ?, adaptive_level = ?, duration_seconds = ?
      WHERE id = ?
    `).run(nextIndex, nextAdaptiveLevel, newDuration, testId);

    return {
      success: true,
      isCorrect,
      score,
      explanation: q.explanation_vi,
      feedback: aiFeedback,
      nextQuestionIndex: nextIndex,
      nextAdaptiveLevel,
      isFinished
    };
  }

  /**
   * Đánh giá câu trả lời mở (Viết / Giao tiếp) qua Gemini Text-Out Model
   */
  private async evaluateOpenEndedAnswer(params: {
    skill: string;
    questionPrompt: string;
    expectedAnswer: string;
    userAnswer: string;
    hskLevel: number;
    criteria?: any;
  }): Promise<{ score: number; feedbackVi: string }> {
    const aiClient = geminiTextService.getAiClient();
    if (!aiClient) {
      throw new Error('Chưa cấu hình API Key');
    }

    const prompt = `
Bạn là chuyên gia khảo thí tiếng Trung (Chinese Placement Test Examiner).
Hãy chấm điểm và nhận xét câu trả lời của thí sinh.

THÔNG TIN CÂU HỎI:
- Kỹ năng: ${params.skill}
- Yêu cầu đề bài: "${params.questionPrompt}"
- Câu chuẩn tham khảo: "${params.expectedAnswer}"
- Trình độ HSK mục tiêu: HSK ${params.hskLevel}
- Tiêu chí đánh giá thêm: ${JSON.stringify(params.criteria || {})}

CÂU TRẢ LỜI CỦA THÍ SINH:
"${params.userAnswer}"

QUY TẮC ĐÁNH GIÁ:
1. Cho điểm từ 0 đến 100 dựa trên:
   - Ngữ pháp và trật tự từ (40 điểm)
   - Lựa chọn từ vựng phù hợp (30 điểm)
   - Mức độ hoàn thành ý đề bài và tính tự nhiên (30 điểm)
2. Nếu câu trả lời rỗng hoặc hoàn toàn không liên quan, cho 0 điểm.
3. Nếu thí sinh viết phiên âm Pinyin thay vì chữ Hán, trừ 15 điểm nhưng vẫn ghi nhận ngữ pháp.
4. Nhận xét bằng tiếng Việt ngắn gọn (2-3 câu), chỉ rõ điểm làm tốt và lỗi sai cụ thể (nếu có).

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ THEO CẤU TRÚC:
{
  "score": 85,
  "feedbackVi": "Câu viết đúng ngữ pháp và trật tự từ. Tuy nhiên dùng từ ... sẽ tự nhiên hơn."
}
`;

    const modelName = geminiTextService.getModel();
    const response = await aiClient.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    return {
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
      feedbackVi: parsed.feedbackVi || 'Đã ghi nhận câu trả lời.'
    };
  }

  /**
   * Bỏ qua một kỹ năng (Ví dụ: không có mic, không có tai nghe)
   * Không tính kỹ năng này thành 0 điểm, ghi nhận là 'untested'
   */
  public async skipSection(testId: string, sectionToSkip: PlacementSkill): Promise<{ success: boolean; nextIndex: number }> {
    const assessment = db.prepare('SELECT skipped_sections_json FROM placement_assessments WHERE id = ?').get(testId) as any;
    if (!assessment) throw new Error('Không tìm thấy bài test');

    const skipped: string[] = assessment.skipped_sections_json ? JSON.parse(assessment.skipped_sections_json) : [];
    if (!skipped.includes(sectionToSkip)) {
      skipped.push(sectionToSkip);
    }

    // Tìm câu hỏi đầu tiên thuộc kỹ năng kế tiếp chưa bị bỏ qua
    const questions = db.prepare('SELECT id, skill, order_index FROM placement_questions WHERE test_id = ? ORDER BY order_index ASC').all(testId) as any[];
    let nextIndex = questions.length; // mặc định nếu hết

    for (let i = 0; i < questions.length; i++) {
      if (!skipped.includes(questions[i].skill)) {
        // Kiểm tra xem câu này đã trả lời chưa
        const ans = db.prepare('SELECT id FROM placement_answers WHERE question_id = ?').get(questions[i].id);
        if (!ans) {
          nextIndex = i;
          break;
        }
      }
    }

    db.prepare(`
      UPDATE placement_assessments 
      SET skipped_sections_json = ?, current_question_index = ?
      WHERE id = ?
    `).run(JSON.stringify(skipped), nextIndex, testId);

    return { success: true, nextIndex };
  }

  /**
   * Hoàn thành bài test, tính điểm đa chiều, phân tích kiến thức và đưa ra đề xuất lộ trình
   */
  public async completeTest(testId: string): Promise<PlacementResultReport> {
    const assessment = db.prepare('SELECT * FROM placement_assessments WHERE id = ?').get(testId) as any;
    if (!assessment) throw new Error('Bài kiểm tra không tồn tại');

    const questions = db.prepare('SELECT * FROM placement_questions WHERE test_id = ? ORDER BY order_index ASC').all(testId) as any[];
    const answers = db.prepare('SELECT * FROM placement_answers WHERE test_id = ?').all(testId) as any[];

    const skippedSections: string[] = assessment.skipped_sections_json ? JSON.parse(assessment.skipped_sections_json) : [];

    const answersByQId = new Map<string, any>();
    answers.forEach(a => answersByQId.set(a.question_id, a));

    const allSkills: PlacementSkill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'communication'];
    const skillScores: Record<PlacementSkill, SkillScoreDetail> = {} as any;

    let testedSkillsCount = 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let sumHskDemonstrated = 0;

    const skillLabels: Record<PlacementSkill, string> = {
      vocabulary: 'Từ vựng',
      grammar: 'Ngữ pháp',
      reading: 'Đọc hiểu',
      listening: 'Nghe hiểu',
      writing: 'Khả năng viết',
      communication: 'Giao tiếp & Phản xạ'
    };

    // Phân tích chi tiết từng kỹ năng
    for (const skill of allSkills) {
      const skillQuestions = questions.filter(q => q.skill === skill);

      // Nếu kỹ năng không có trong bài thi (ví dụ bài Quick Test) hoặc bị người dùng chủ động bỏ qua
      if (skillQuestions.length === 0 || skippedSections.includes(skill)) {
        skillScores[skill] = {
          skill,
          label: skillLabels[skill],
          score: null, // Chưa có dữ liệu, KHÔNG quy thành 0!
          qualitative: 'Chưa có dữ liệu',
          status: 'untested',
          questionsCount: 0,
          correctCount: 0,
          hskDemonstrated: 0,
          feedback: 'Kỹ năng này chưa được kiểm tra hoặc đã được bỏ qua theo yêu cầu người học.'
        };
        continue;
      }

      testedSkillsCount++;
      let skillEarnedScore = 0;
      let skillTotalPossible = 0;
      let correctCount = 0;
      let highestHskPassed = 1;

      for (const q of skillQuestions) {
        const ans = answersByQId.get(q.id);
        const qWeight = q.weight || 1.0;
        skillTotalPossible += 100 * qWeight;

        if (ans) {
          const s = typeof ans.score === 'number' ? ans.score : (ans.is_correct ? 100 : 0);
          skillEarnedScore += s * qWeight;
          if (ans.is_correct || s >= 60) {
            correctCount++;
            if (q.hsk_level > highestHskPassed) {
              highestHskPassed = q.hsk_level;
            }
          }
        }
      }

      const finalSkillScore = skillTotalPossible > 0 ? Math.round(skillEarnedScore / skillTotalPossible * 100) : 0;
      let qualitative = 'Cần củng cố';
      if (finalSkillScore >= 85) qualitative = 'Xuất sắc';
      else if (finalSkillScore >= 70) qualitative = 'Khá tốt';
      else if (finalSkillScore >= 55) qualitative = 'Trung bình khá';
      else if (finalSkillScore >= 40) qualitative = 'Cần củng cố';
      else qualitative = 'Cần rèn luyện nhiều';

      let skillFeedback = `Đạt ${finalSkillScore}/100 điểm (${qualitative}). Năng lực thể hiện tương đương mốc HSK ${highestHskPassed}.`;
      if (finalSkillScore >= 80) {
        skillFeedback += ' Nắm chắc kiến thức và vận dụng tốt trong ngữ cảnh.';
      } else if (finalSkillScore >= 50) {
        skillFeedback += ' Hiểu kiến thức cơ bản nhưng cần thực hành thêm các trường hợp đặc biệt.';
      } else {
        skillFeedback += ' Cần ôn tập lại các cấu trúc và từ vựng nền tảng.';
      }

      skillScores[skill] = {
        skill,
        label: skillLabels[skill],
        score: finalSkillScore,
        qualitative,
        status: 'tested',
        questionsCount: skillQuestions.length,
        correctCount,
        hskDemonstrated: highestHskPassed,
        feedback: skillFeedback
      };

      totalWeightedScore += finalSkillScore;
      totalWeight += 1;
      sumHskDemonstrated += highestHskPassed;
    }

    // Tính điểm tổng thể (Chỉ tính trên các kỹ năng ĐÃ kiểm tra)
    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    
    // Ước tính cấp độ HSK tham chiếu (Ví dụ: 1.0, 1.8, 2.4, 3.1...)
    let estimatedHsk = 1.0;
    if (totalWeight > 0) {
      const avgHsk = sumHskDemonstrated / totalWeight;
      // Kết hợp giữa HSK mốc đạt được và % điểm số
      const performanceFactor = overallScore / 100;
      estimatedHsk = Number(Math.max(1.0, Math.min(5.5, (avgHsk * 0.7 + performanceFactor * 3.5 * 0.3))).toFixed(1));
    }

    let estimatedHskLabel = 'HSK 1 (Sơ cấp cơ bản)';
    if (estimatedHsk >= 4.0) estimatedHskLabel = 'HSK 4 - 5 (Trung - Cao cấp)';
    else if (estimatedHsk >= 3.0) estimatedHskLabel = 'HSK 3 (Trung cấp)';
    else if (estimatedHsk >= 2.0) estimatedHskLabel = 'HSK 2 (Sơ cấp nâng cao)';
    else if (estimatedHsk >= 1.5) estimatedHskLabel = 'HSK 1+ (Sơ cấp vững vàng)';

    // Độ tin cậy (Confidence Level)
    let confidenceLevel: 'high' | 'medium' | 'provisional' = 'medium';
    let confidenceReason = '';
    if (testedSkillsCount >= 5 && answers.length >= 12) {
      confidenceLevel = 'high';
      confidenceReason = 'Đánh giá qua đầy đủ 5-6 kỹ năng độc lập với số lượng câu hỏi phong phú.';
    } else if (testedSkillsCount >= 3) {
      confidenceLevel = 'medium';
      confidenceReason = 'Đánh giá qua các kỹ năng cốt lõi (Từ vựng, Ngữ pháp, Đọc hiểu).';
    } else {
      confidenceLevel = 'provisional';
      confidenceReason = 'Dữ liệu sơ bộ, người học đã bỏ qua một số phần thi quan trọng.';
    }

    // ----------------- Trích xuất Điểm mạnh & Điểm yếu -----------------
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const s of allSkills) {
      const detail = skillScores[s];
      if (detail.status === 'tested') {
        if (detail.score !== null && detail.score >= 70) {
          strengths.push(`${detail.label}: Đạt ${detail.score}/100 (${detail.qualitative}), phản xạ chính xác.`);
        } else if (detail.score !== null && detail.score < 60) {
          weaknesses.push(`${detail.label}: Đạt ${detail.score}/100 (${detail.qualitative}), cần bổ sung luyện tập.`);
        }
      }
    }

    if (strengths.length === 0) {
      strengths.push('Tinh thần chủ động hoàn thành bài kiểm tra đầu vào và tinh thần học hỏi cao.');
    }
    if (weaknesses.length === 0) {
      weaknesses.push('Cần tiếp tục duy trì thực hành thường xuyên để làm quen với ngữ liệu HSK nâng cao.');
    }

    // ----------------- Phân Loại Kiến Thức Chi Tiết -----------------
    const masteredKnowledge: KnowledgeItem[] = [];
    const tentativeKnowledge: KnowledgeItem[] = [];
    const weakGapsKnowledge: KnowledgeItem[] = [];
    const unknownKnowledge: KnowledgeItem[] = [];

    for (const q of questions) {
      const ans = answersByQId.get(q.id);
      const isCorrect = ans ? (ans.is_correct || ans.score >= 60) : false;
      const score = ans ? ans.score : 0;

      const explanation = q.explanation_vi || q.explanationVi || '';
      const promptText = q.prompt || '';
      const item: KnowledgeItem = {
        item: q.topic || promptText.slice(0, 30),
        meaningVi: explanation.slice(0, 60),
        hskLevel: q.hsk_level,
        type: q.skill === 'grammar' ? 'grammar' : 'vocabulary',
        notes: explanation
      };

      if (!ans) {
        unknownKnowledge.push(item);
      } else if (isCorrect && score >= 80) {
        masteredKnowledge.push(item);
      } else if (isCorrect && score >= 60) {
        tentativeKnowledge.push(item);
      } else {
        weakGapsKnowledge.push(item);
      }
    }

    // ----------------- Đề Xuất Lộ Trình Học Cá Nhân Hóa -----------------
    const recommendations = {
      suggestedPace: estimatedHsk <= 2.0 
        ? '15 - 20 phút mỗi ngày, 5 buổi/tuần (Ưu tiên ngữ âm, từ vựng và câu đơn)'
        : '25 - 35 phút mỗi ngày, 4 - 5 buổi/tuần (Tập trung ngữ pháp chuyên đề và đọc hiểu)',
      priorityTopics: weakGapsKnowledge.length > 0 
        ? weakGapsKnowledge.slice(0, 3).map(k => k.item)
        : ['Từ vựng giao tiếp thực chiến', 'Trật tự từ trong câu tiếng Trung', 'Cấu trúc câu hỏi với 怎么 và 为什么'],
      focusSkills: weaknesses.length > 0 
        ? weaknesses.slice(0, 2).map(w => w.split(':')[0])
        : ['Ngữ pháp HSK', 'Luyện nghe hiểu'],
      nextAction: `Khởi tạo lộ trình cá nhân hóa hướng tới mục tiêu HSK ${Math.min(6, Math.floor(estimatedHsk) + 1)}.`
    };

    const completedAt = Date.now();
    const durationSeconds = assessment.duration_seconds || Math.round((completedAt - assessment.started_at) / 1000);

    // Cập nhật trạng thái assessment
    db.prepare(`
      UPDATE placement_assessments 
      SET status = 'completed', completed_at = ?, duration_seconds = ?
      WHERE id = ?
    `).run(completedAt, durationSeconds, testId);

    // Lưu vào bảng placement_results
    const resultId = `res_${testId}`;
    db.prepare(`
      INSERT OR REPLACE INTO placement_results (
        id, test_id, overall_score, estimated_hsk, confidence_level, skill_scores_json, strengths_json, weaknesses_json, knowledge_breakdown_json, recommendations_json, synced_to_profile, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      resultId,
      testId,
      overallScore,
      estimatedHsk,
      confidenceLevel,
      JSON.stringify(skillScores),
      JSON.stringify(strengths),
      JSON.stringify(weaknesses),
      JSON.stringify({
        mastered: masteredKnowledge,
        tentative: tentativeKnowledge,
        weakGaps: weakGapsKnowledge,
        unknown: unknownKnowledge
      }),
      JSON.stringify(recommendations),
      completedAt
    );

    // Tự động đồng bộ ngay kết quả vào learner_profile, learning_errors và roadmap (Zero-step sync)
    let isSynced = false;
    try {
      await this.syncResultToLearnerProfile(testId);
      isSynced = true;
    } catch (syncErr) {
      console.warn('Auto sync to profile notice:', syncErr);
    }

    return {
      id: resultId,
      testId,
      testType: assessment.test_type,
      overallScore,
      estimatedHsk,
      estimatedHskLabel,
      confidenceLevel,
      confidenceReason,
      skillScores,
      strengths,
      weaknesses,
      knowledgeBreakdown: {
        mastered: masteredKnowledge,
        tentative: tentativeKnowledge,
        weakGaps: weakGapsKnowledge,
        unknown: unknownKnowledge
      },
      recommendations,
      syncedToProfile: isSynced,
      createdAt: assessment.started_at,
      completedAt,
      durationSeconds
    };
  }

  /**
   * Lấy kết quả bài kiểm tra đã hoàn thành
   */
  public async getTestResult(testId: string): Promise<PlacementResultReport | null> {
    const res = db.prepare('SELECT * FROM placement_results WHERE test_id = ?').get(testId) as any;
    if (!res) return null;

    const assessment = db.prepare('SELECT * FROM placement_assessments WHERE id = ?').get(testId) as any;

    let estimatedHskLabel = 'HSK 1 (Sơ cấp cơ bản)';
    if (res.estimated_hsk >= 4.0) estimatedHskLabel = 'HSK 4 - 5 (Trung - Cao cấp)';
    else if (res.estimated_hsk >= 3.0) estimatedHskLabel = 'HSK 3 (Trung cấp)';
    else if (res.estimated_hsk >= 2.0) estimatedHskLabel = 'HSK 2 (Sơ cấp nâng cao)';
    else if (res.estimated_hsk >= 1.5) estimatedHskLabel = 'HSK 1+ (Sơ cấp vững vàng)';

    return {
      id: res.id,
      testId: res.test_id,
      testType: assessment?.test_type || 'full',
      overallScore: res.overall_score,
      estimatedHsk: res.estimated_hsk,
      estimatedHskLabel,
      confidenceLevel: res.confidence_level,
      confidenceReason: res.confidence_level === 'high' 
        ? 'Đánh giá qua đầy đủ các kỹ năng độc lập với số câu hỏi phong phú.'
        : 'Đánh giá qua các kỹ năng trọng tâm.',
      skillScores: JSON.parse(res.skill_scores_json),
      strengths: JSON.parse(res.strengths_json),
      weaknesses: JSON.parse(res.weaknesses_json),
      knowledgeBreakdown: JSON.parse(res.knowledge_breakdown_json),
      recommendations: JSON.parse(res.recommendations_json),
      syncedToProfile: Boolean(res.synced_to_profile),
      createdAt: assessment?.started_at || res.created_at,
      completedAt: assessment?.completed_at,
      durationSeconds: assessment?.duration_seconds || 0
    };
  }

  /**
   * Lấy lịch sử tất cả các lần kiểm tra trình độ để so sánh tiến bộ
   */
  public async getTestHistory(): Promise<Array<{
    testId: string;
    testType: 'full' | 'quick';
    overallScore: number;
    estimatedHsk: number;
    confidenceLevel: string;
    startedAt: number;
    completedAt?: number;
    durationSeconds: number;
    strengthsCount: number;
    weaknessesCount: number;
    syncedToProfile: boolean;
  }>> {
    const list = db.prepare(`
      SELECT 
        r.test_id, 
        a.test_type, 
        r.overall_score, 
        r.estimated_hsk, 
        r.confidence_level,
        a.started_at,
        a.completed_at,
        a.duration_seconds,
        r.strengths_json,
        r.weaknesses_json,
        r.synced_to_profile
      FROM placement_results r
      JOIN placement_assessments a ON r.test_id = a.id
      ORDER BY a.started_at DESC
    `).all() as any[];

    return list.map(item => ({
      testId: item.test_id,
      testType: item.test_type,
      overallScore: item.overall_score,
      estimatedHsk: item.estimated_hsk,
      confidenceLevel: item.confidence_level,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      durationSeconds: item.duration_seconds,
      strengthsCount: item.strengths_json ? JSON.parse(item.strengths_json).length : 0,
      weaknessesCount: item.weaknesses_json ? JSON.parse(item.weaknesses_json).length : 0,
      syncedToProfile: Boolean(item.synced_to_profile)
    }));
  }

  /**
   * ĐỒNG BỘ KẾT QUẢ VÀO HỆ THỐNG BỘ NHỚ VÀ LỘ TRÌNH HỌC (Sử dụng kết quả để tạo lộ trình)
   * Yêu cầu cốt lõi: Không tạo lộ trình riêng, mà chuyển dữ liệu vào learner_profile,
   * learning_errors, vocabulary_memory, grammar_memory và kích hoạt AI sinh bài học phù hợp.
   */
  public async syncResultToLearnerProfile(testId: string): Promise<{
    success: boolean;
    message: string;
    targetHsk: number;
    currentHsk: number;
    generatedLessonId?: string;
  }> {
    const result = await this.getTestResult(testId);
    if (!result) {
      throw new Error('Không tìm thấy kết quả bài kiểm tra');
    }

    const currentHskLevel = Math.max(1, Math.min(6, Math.round(result.estimatedHsk)));
    const targetHskLevel = Math.min(6, currentHskLevel + 1);
    const now = Date.now();

    // 1. Cập nhật bảng `learner_profile`
    const goals = [
      `Củng cố nền tảng HSK ${currentHskLevel} và nâng trình độ lên HSK ${targetHskLevel}`,
      ...result.recommendations.priorityTopics.map(t => `Khắc phục điểm yếu: ${t}`)
    ];

    db.prepare(`
      UPDATE learner_profile
      SET current_hsk = ?, target_hsk = ?, learning_goals_json = ?, strengths_json = ?, weaknesses_json = ?, updated_at = ?
      WHERE id = 'default'
    `).run(
      currentHskLevel,
      targetHskLevel,
      JSON.stringify(goals),
      JSON.stringify(result.strengths),
      JSON.stringify(result.weaknesses),
      now
    );

    // 2. Chuyển các lỗ hổng kiến thức vào sổ tay lỗi sai `learning_errors`
    const insertError = db.prepare(`
      INSERT INTO learning_errors (error_type, title, user_sentence, corrected_sentence, explanation_vi, occurrence_count, last_occurred_at, status)
      VALUES (?, ?, ?, ?, ?, 1, ?, 'pending')
    `);

    for (const gap of result.knowledgeBreakdown.weakGaps) {
      // Kiểm tra xem đã có lỗi này trong bảng chưa
      const existing = db.prepare('SELECT id FROM learning_errors WHERE title = ?').get(gap.item);
      if (!existing) {
        insertError.run(
          gap.type === 'grammar' ? 'grammar' : 'vocabulary',
          gap.item,
          `Thí sinh chưa nắm vững: ${gap.item}`,
          gap.notes || gap.meaningVi,
          gap.notes || gap.meaningVi,
          now
        );
      }
    }

    // 3. Đánh dấu đã đồng bộ trong `placement_results`
    db.prepare('UPDATE placement_results SET synced_to_profile = 1 WHERE test_id = ?').run(testId);

    // 4. Kích hoạt sinh bài học tự động đầu tiên dựa trên kết quả khảo sát
    let generatedLessonId: string | undefined;
    try {
      const topGap = result.knowledgeBreakdown.weakGaps[0]?.item || result.recommendations.priorityTopics[0] || 'Phân biệt 怎么 và 为什么';
      const lesson = await geminiLessonService.generateLesson({
        topic: topGap,
        hskLevel: currentHskLevel,
        lessonType: 'reinforce',
        focusErrors: result.weaknesses.slice(0, 2)
      });
      generatedLessonId = lesson.id;
    } catch (err: any) {
      console.warn('Lỗi tự động sinh bài học sau test:', err.message);
    }

    return {
      success: true,
      message: `Đã đồng bộ kết quả khảo sát: Trình độ hiện tại HSK ${currentHskLevel}, Mục tiêu HSK ${targetHskLevel}. Các lỗ hổng đã được ghi nhận vào bộ nhớ học tập.`,
      currentHsk: currentHskLevel,
      targetHsk: targetHskLevel,
      generatedLessonId
    };
  }

  /**
   * Helper tính độ tương đồng chuỗi ký tự đơn giản
   */
  private calculateStringSimilarity(a: string, b: string): number {
    const cleanA = a.replace(/[.,?!，。？！\s]/g, '');
    const cleanB = b.replace(/[.,?!，。？！\s]/g, '');
    if (!cleanA || !cleanB) return 0;
    if (cleanA === cleanB) return 1.0;

    let commonChars = 0;
    for (const char of cleanA) {
      if (cleanB.includes(char)) commonChars++;
    }
    return Math.min(1.0, (commonChars * 2) / (cleanA.length + cleanB.length));
  }
}

export const geminiPlacementService = new GeminiPlacementService();
