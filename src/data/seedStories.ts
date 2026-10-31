import type { GradedStory } from '../types';

export const SEED_STORIES: GradedStory[] = [
  {
    id: 'story_hsk1_1',
    hskLevel: 1,
    titleZh: '我的一天',
    titlePinyin: 'Wǒ de yì tiān',
    titleVi: 'Một ngày của tôi',
    contentZh: '我叫李明。我每天早上七点起床。我喜欢吃鸡蛋，喝牛奶。上午我去学校学习汉语。我的汉语老师王老师非常好。下午我和朋友一起去打篮球。晚上我回家做作业，看中国电影。十点半我睡觉。我觉得我的生活很开心。',
    contentPinyin: 'Wǒ jiào Lǐ Míng. Wǒ měitiān zǎoshang qī diǎn qǐchuáng. Wǒ xǐhuan chī jīdàn, hē niúnǎi. Shàngwǔ wǒ qù xuéxiào xuéxí hànyǔ. Wǒ de hànyǔ lǎoshī Wáng lǎoshī fēicháng hǎo. Xiàwǔ wǒ hé péngyou yìqǐ qù dǎ lánqiú. Wǎnshang wǒ huíjiā zuò zuòyè, kàn Zhōngguó diànyǐng. Shí diǎn bàn wǒ shuìjiào. Wǒ juéde wǒ de shēnghuó hěn kāixīn.',
    contentVi: 'Tôi tên là Lý Minh. Mỗi sáng tôi thức dậy lúc 7 giờ. Tôi thích ăn trứng gà, uống sữa bò. Buổi sáng tôi đến trường học tiếng Trung. Thầy giáo tiếng Trung của tôi là thầy Vương rất tốt. Buổi chiều tôi cùng bạn bè đi chơi bóng rổ. Buổi tối tôi về nhà làm bài tập, xem phim Trung Quốc. Mười giờ rưỡi tôi đi ngủ. Tôi cảm thấy cuộc sống của mình rất vui vẻ.',
    audioText: '我叫李明。我每天早上七点起床。我喜欢吃鸡蛋，喝牛奶。上午我去学校学习汉语。我的汉语老师王老师非常好。下午我和朋友一起去打篮球。晚上我回家做作业，看中国电影。十点半我睡觉。我觉得我的生活很开心。',
    questions: [
      {
        question: '李明早上几点起床？ (Lý Minh mấy giờ thức dậy?)',
        options: ['六点 (6 giờ)', '七点 (7 giờ)', '八点 (8 giờ)', '九点 (9 giờ)'],
        answer: 1,
        explanation: 'Trong bài viết: "我每天早上七点起床" (Mỗi sáng tôi thức dậy lúc 7 giờ).',
      },
      {
        question: '李明下午做什么？ (Buổi chiều Lý Minh làm gì?)',
        options: ['学习汉语 (Học tiếng Trung)', '打篮球 (Chơi bóng rổ)', '看电影 (Xem phim)', '睡觉 (Đi ngủ)'],
        answer: 1,
        explanation: 'Trong bài viết: "下午我和朋友一起去打篮球" (Buổi chiều tôi cùng bạn bè đi chơi bóng rổ).',
      },
    ],
  },
  {
    id: 'story_hsk2_1',
    hskLevel: 2,
    titleZh: '第一次买高铁票',
    titlePinyin: 'Dì yī cì mǎi gāotiě piào',
    titleVi: 'Lần đầu tiên mua vé tàu cao tốc',
    contentZh: '中国的高铁非常快，也非常方便。昨天是我第一次自己用手机买高铁票。我打算从北京去上海看望我的大学同学。我在手机软件上输入了出发站和到达站，选择了我最喜欢的靠窗座位。网上支付很快，不到一分钟就买好了。到了火车站，我只要刷一下身份证就能进站，不用排队取纸质车票。这让我感受到了科技带给生活的便利。',
    contentPinyin: 'Zhōngguó de gāotiě fēicháng kuài, yě fēicháng fāngbiàn. Zuótiān shì wǒ dì yī cì zìjǐ yòng shǒujī mǎi gāotiě piào. Wǒ dǎsuàn cóng Běijīng qù Shànghǎi kànwàng wǒ de dàxué tóngxué. Wǒ zài shǒujī ruǎnjiàn shang shūrù le chūfā zhàn hé dàodá zhàn, xuǎnzé le wǒ zuì xǐhuan de kào chuāng zuòwèi. Wǎngshang zhīfù hěn kuài, bú dào yì fēnzhōng jiù mǎi hǎo le. Dào le huǒchēzhàn, wǒ zhǐyào shuā yíxià shēnfènzhèng jiù néng jìn zhàn, bú yòng páiduì qǔ zhǐzhì chēpiào. Zhè ràng wǒ gǎnshòu dào le kējì dài gěi shēnghuó de biànlì.',
    contentVi: 'Tàu cao tốc Trung Quốc rất nhanh, cũng rất thuận tiện. Hôm qua là lần đầu tiên tôi tự dùng điện thoại mua vé tàu cao tốc. Tôi dự định đi từ Bắc Kinh đến Thượng Hải thăm người bạn học đại học của mình. Tôi nhập ga đi và ga đến trên ứng dụng điện thoại, chọn vị trí ngồi gần cửa sổ mà tôi thích nhất. Thanh toán trực tuyến rất nhanh, chưa đầy một phút là mua xong. Đến ga tàu, tôi chỉ cần quét căn cước là có thể vào ga, không cần xếp hàng lấy vé giấy. Điều này khiến tôi cảm nhận được sự tiện lợi mà công nghệ mang lại cho cuộc sống.',
    audioText: '中国的高铁非常快，也非常方便。昨天是我第一次自己用手机买高铁票。我打算从北京去上海看望我的大学同学。我在手机软件上输入了出发站和到达站，选择了我最喜欢的靠窗座位。网上支付很快，不到一分钟就买好了。到了火车站，我只要刷一下身份证就能进站，不用排队取纸质车票。这让我感受到了科技带给生活的便利。',
    questions: [
      {
        question: '作者打算去哪里？ (Tác giả dự định đi đâu?)',
        options: ['北京 (Bắc Kinh)', '上海 (Thượng Hải)', '广州 (Quảng Châu)', '深圳 (Thâm Quyến)'],
        answer: 1,
        explanation: 'Tác giả đi từ Bắc Kinh đến Thượng Hải thăm bạn học: "从北京去上海".',
      },
    ],
  },
];
