import type { ListeningItem } from '../types';

export const SEED_LISTENING: ListeningItem[] = [
  {
    id: 'listen_hsk1_1',
    hskLevel: 1,
    title: 'Bài nghe 1: Làm quen và chào hỏi tại sân bay',
    audioText: '王先生，您好！我是李明，很高兴在机场见到您。您的行李重不重？我来帮您拿吧。',
    pinyin: 'Wáng xiānsheng, nín hǎo! Wǒ shì Lǐ Míng, hěn gāoxìng zài jīchǎng jiàndào nín. Nín de xíngli zhòng bú zhòng? Wǒ lái bāng nín ná ba.',
    meaningVi: 'Chào ông Vương! Tôi là Lý Minh, rất vui được đón ông ở sân bay. Hành lý của ông có nặng không? Để tôi xách giúp ông nhé.',
    questions: [
      {
        question: '他们在哪里见面？ (Họ gặp nhau ở đâu?)',
        options: ['学校 (Trường học)', '火车站 (Ga tàu)', '机场 (Sân bay)', '饭馆 (Nhà hàng)'],
        answer: 2,
        explanation: 'Trong bài nghe nói: "很高兴在机场见到您" (Rất vui được gặp ngài tại sân bay).',
      },
      {
        question: '李明想要帮王先生做什么？ (Lý Minh muốn giúp ông Vương làm gì?)',
        options: ['买票 (Mua vé)', '拿行李 (Xách hành lý)', '开车 (Lái xe)', '找人 (Tìm người)'],
        answer: 1,
        explanation: 'Lý Minh nói: "我来帮您拿吧" để giúp xách hành lý.',
      },
    ],
  },
  {
    id: 'listen_hsk1_2',
    hskLevel: 1,
    title: 'Bài nghe 2: Gọi món tại quán trà',
    audioText: '服务员，请问这里有茉莉花茶吗？我想点一壶热茶，再来两盘点心。',
    pinyin: 'Fúwùyuán, qǐngwèn zhèlǐ yǒu mòlìhuā chá ma? Wǒ xiǎng diǎn yì hú rè chá, zài lái liǎng pán diǎnxin.',
    meaningVi: 'Phục vụ, xin hỏi ở đây có trà hoa nhài không? Tôi muốn gọi một ấm trà nóng, thêm hai đĩa điểm tâm nữa.',
    questions: [
      {
        question: '说话人想喝什么？ (Người nói muốn uống gì?)',
        options: ['咖啡 (Cà phê)', '茉莉花茶 (Trà hoa nhài)', '可乐 (Coca)', '绿茶 (Trà xanh)'],
        answer: 1,
        explanation: 'Người nói hỏi: "这里有茉莉花茶吗？我想点一壶热茶".',
      },
    ],
  },
];
