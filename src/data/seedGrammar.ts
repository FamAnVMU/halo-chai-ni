import type { GrammarRule } from '../types';

export const SEED_GRAMMAR: GrammarRule[] = [
  {
    id: 'g_hsk1_shi',
    hskLevel: 1,
    title: 'Câu chữ 是 (shì) - Khẳng định danh tính, nghề nghiệp',
    formula: 'Chủ ngữ + 是 + Danh từ / Cụm danh từ',
    explanationVi: 'Từ "是" (shì) tương đương với "là" trong tiếng Việt. Phủ định dùng "不是" (bú shì).',
    examples: [
      {
        zh: '我是越南人。',
        pinyin: 'Wǒ shì Yuènán rén.',
        vi: 'Tôi là người Việt Nam.',
      },
      {
        zh: '他不是老师，他是医生。',
        pinyin: 'Tā bú shì lǎoshī, tā shì yīshēng.',
        vi: 'Anh ấy không phải là giáo viên, anh ấy là bác sĩ.',
      },
      {
        zh: '这是我的汉语书。',
        pinyin: 'Zhè shì wǒ de hànyǔ shū.',
        vi: 'Đây là sách tiếng Trung của tôi.',
      },
    ],
    commonMistakes: [
      'Không dùng "是" trước tính từ (Sai: *我很是好*, Đúng: 我很好).',
      'Phát âm "不" trước "是" phải đổi thanh 2: bú shì thay vì bù shì.',
    ],
    comparisonWith: {
      otherRuleTitle: 'Phó từ chỉ mức độ (很, 非常) + Tính từ',
      differenceVi: 'Khi vị ngữ là tính từ (đẹp, tốt, bận), tiếng Trung dùng phó từ "很" (hěn) chứ không dùng "是". Ví dụ: "Tôi bận" là 我很忙, không được nói *我是忙*.',
    },
  },
  {
    id: 'g_hsk1_ma',
    hskLevel: 1,
    title: 'Trợ từ nghi vấn 吗 (ma) - Tạo câu hỏi Có / Không',
    formula: 'Câu trần thuật + 吗？',
    explanationVi: 'Đặt "吗" ở cuối câu trần thuật để biến thành câu hỏi nghi vấn Có / Không (Yes/No question).',
    examples: [
      {
        zh: '你是中国人吗？',
        pinyin: 'Nǐ shì Zhōngguó rén ma?',
        vi: 'Bạn là người Trung Quốc phải không?',
      },
      {
        zh: '你喝茶吗？',
        pinyin: 'Nǐ hē chá ma?',
        vi: 'Bạn uống trà không?',
      },
      {
        zh: '今天你忙吗？',
        pinyin: 'Jīntiān nǐ máng ma?',
        vi: 'Hôm nay bạn bận không?',
      },
    ],
    commonMistakes: [
      'Không dùng "吗" trong câu đã có đại từ nghi vấn như 什么, 谁, 哪儿, 几. (Sai: *你叫什么名字吗？*, Đúng: 你叫什么名字？).',
    ],
  },
  {
    id: 'g_hsk2_xiang_yao',
    hskLevel: 2,
    title: 'Phân biệt 想 (xiǎng) và 要 (yào) - Muốn, Cần, Định',
    formula: 'Chủ ngữ + 想 / 要 + Động từ / Danh từ',
    explanationVi: 'Cả hai đều biểu thị ý muốn, nhưng "想" thiên về suy nghĩ mong muốn chủ quan (ước muốn), còn "要" mang tính quyết tâm cao hơn, sắp xảy ra hoặc biểu thị yêu cầu bắt buộc (phải/cần).',
    examples: [
      {
        zh: '我想去中国旅游。（Mong muốn）',
        pinyin: 'Wǒ xiǎng qù Zhōngguó lǚyóu.',
        vi: 'Tôi muốn đi du lịch Trung Quốc.',
      },
      {
        zh: '我要买两张机票。（Quyết định hành động）',
        pinyin: 'Wǒ yào mǎi liǎng zhāng jīpiào.',
        vi: 'Tôi muốn (sẽ) mua hai vé máy bay.',
      },
      {
        zh: '你要多喝水。（Lời khuyên/Bắt buộc: nên/cần）',
        pinyin: 'Nǐ yào duō hē shuǐ.',
        vi: 'Bạn cần phải uống nhiều nước.',
      },
    ],
    commonMistakes: [
      'Phủ định của "想" là "不想" (không muốn).',
      'Phủ định của "要" (muốn) thường dùng "不想", không dùng "不要" vì "不要" mang nghĩa "đừng" (cấm đoán).',
    ],
    comparisonWith: {
      otherRuleTitle: '想念 / 觉得',
      differenceVi: '"想" ngoài nghĩa "muốn" còn có nghĩa là "nhớ" (我想你 - Tôi nhớ bạn) hoặc "nghĩ rằng" (让我想想 - Để tôi nghĩ xem).',
    },
  },
  {
    id: 'g_hsk2_er_liang',
    hskLevel: 2,
    title: 'Phân biệt số đếm 二 (èr) và 两 (liǎng) - Số 2',
    formula: 'Số thứ tự / Số phòng / Đếm: 二 | Đi với lượng từ: 两 + Lượng từ + Danh từ',
    explanationVi: '"二" dùng khi đọc số đếm, số điện thoại, số tầng/phòng, số thứ tự. "两" dùng trước lượng từ để chỉ số lượng 2 cái/người.',
    examples: [
      {
        zh: '我买两个苹果。',
        pinyin: 'Wǒ mǎi liǎng ge píngguǒ.',
        vi: 'Tôi mua 2 quả táo. (Dùng 两 vì có lượng từ 个)',
      },
      {
        zh: '一、二、三、四、五。',
        pinyin: 'Yī, èr, sān, sì, wǔ.',
        vi: 'Một, hai, ba, bốn, năm. (Đếm số dùng 二)',
      },
      {
        zh: '我在二楼。',
        pinyin: 'Wǒ zài èr lóu.',
        vi: 'Tôi ở tầng hai. (Số thứ tự dùng 二)',
      },
    ],
    commonMistakes: [
      'Nói *二个人* là sai ngữ pháp! Phải nói là 两个人 (liǎng ge rén).',
    ],
  },
  {
    id: 'g_hsk3_ba',
    hskLevel: 3,
    title: 'Câu chữ 把 (bǎ) - Nhấn mạnh tác động và xử lý đối tượng',
    formula: 'Chủ ngữ + 把 + Tân ngữ + Động từ + Thành phần khác (bổ ngữ, 了, 在, 给...)',
    explanationVi: 'Câu chữ 把 dùng để diễn đạt hành động của chủ ngữ làm thay đổi vị trí, trạng thái hoặc kết quả của đối tượng bị tác động.',
    examples: [
      {
        zh: '请把门关上。',
        pinyin: 'Qǐng bǎ mén guān shàng.',
        vi: 'Xin hãy đóng cửa lại.',
      },
      {
        zh: '我把作业做完了。',
        pinyin: 'Wǒ bǎ zuòyè zuò wán le.',
        vi: 'Tôi đã làm xong bài tập rồi.',
      },
      {
        zh: '他把那本书放在桌子上了。',
        pinyin: 'Tā bǎ nà běn shū fàng zài zhuōzi shàng le.',
        vi: 'Anh ấy đã đặt quyển sách đó lên bàn.',
      },
    ],
    commonMistakes: [
      'Động từ trong câu chữ 把 không được đứng trơ trọi một mình (Sai: *我把苹果吃*, Đúng: 我把苹果吃了 hoặc 我把苹果吃完了).',
      'Tân ngữ sau 把 phải là đối tượng đã được xác định cụ thể.',
      'Phó từ phủ định (没, 不) hoặc động từ năng nguyện (想, 要, 能) phải đứng TRƯỚC 把 (Ví dụ: 我没把手机带来).',
    ],
  },
  {
    id: 'g_hsk3_gang_gangcai',
    hskLevel: 3,
    title: 'Phân biệt 刚 (gāng) và 刚才 (gāngcái) - Vừa mới',
    formula: 'Chủ ngữ + 刚 + Động từ | 刚才 + Động từ (刚才 là danh từ chỉ thời gian)',
    explanationVi: '"刚" là phó từ, đứng sau chủ ngữ trước động từ, biểu thị hành động xảy ra cách thời điểm nói không lâu (có thể là vài phút, vài ngày hay vài tháng). "刚才" là danh từ chỉ thời gian (vừa nãy, vừa rồi - chỉ vài phút trước), có thể đứng trước hoặc sau chủ ngữ.',
    examples: [
      {
        zh: '我刚到北京一个星期。',
        pinyin: 'Wǒ gāng dào Běijīng yí ge xīngqī.',
        vi: 'Tôi vừa mới đến Bắc Kinh được một tuần.',
      },
      {
        zh: '刚才谁给你打电话？',
        pinyin: 'Gāngcái shéi gěi nǐ dǎ diànhuà?',
        vi: 'Vừa nãy ai gọi điện cho bạn thế?',
      },
    ],
    commonMistakes: [
      '"刚才" có thể làm định ngữ: 刚才的事情 (chuyện vừa rồi). "刚" không thể làm định ngữ (Không được nói *刚的事情*).',
      'Sau "刚" có thể có khoảng thời gian: 刚来两分钟. Sau "刚才" không thể đi cùng số lượng thời gian.',
    ],
  },
];
