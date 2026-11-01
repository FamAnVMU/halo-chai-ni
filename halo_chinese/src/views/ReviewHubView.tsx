import React, { useEffect, useState } from 'react';
import {
  Clock,
  Dumbbell,
  Sparkles,
  BookOpen,
  ArrowRight,
  Brain,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { backendClient } from '../utils/backendClient';
import type { NavTab } from '../components/layout/Sidebar';

interface ReviewHubViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const ReviewHubView: React.FC<ReviewHubViewProps> = ({ onNavigate }) => {
  const [srsDueCount, setSrsDueCount] = useState<number>(0);
  const [totalReviewed, setTotalReviewed] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReviewStats();
  }, []);

  const loadReviewStats = async () => {
    try {
      const dash = await backendClient.getSrsDashboard();
      if (dash.success && dash.data) {
        setSrsDueCount(dash.data.dueToday ?? 0);
        setTotalReviewed(dash.data.totalCards ?? 0);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-4xl mx-auto overflow-x-hidden pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="lime">Không gian ôn tập</Badge>
          <span className="text-xs text-[#647560] dark:text-[#889B84]">Thuật toán lặp lại ngắt quãng (SRS)</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#263326] dark:text-[#EAF5D5]">
          Củng cố & Khắc sâu Kiến thức
        </h1>
        <p className="text-sm text-[#647560] dark:text-[#889B84]">
          Ôn tập các từ vựng đến hạn và rèn luyện các mẫu câu bạn từng mắc lỗi để chuyển hóa thành trí nhớ dài hạn.
        </p>
      </div>

      {/* Hero SRS Card */}
      <Card variant="highlight" className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#A3D635] text-[#263326] flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
            {srsDueCount}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#263326] dark:text-[#EAF5D5]">
                Thẻ cần ôn tập hôm nay
              </h3>
              <Badge variant={srsDueCount > 0 ? 'warning' : 'success'} size="sm">
                {srsDueCount > 0 ? 'Cần ôn ngay' : 'Đã hoàn thành'}
              </Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84]">
              {srsDueCount > 0
                ? `Bạn có ${srsDueCount} từ vựng đã đến chu kỳ ôn tập. Hãy dành 5 phút để ghi nhớ!`
                : 'Tuyệt vời! Bạn không còn thẻ nào bị tồn đọng hôm nay. Tiếp tục phát huy!'}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => onNavigate('vocab')}
          className="shrink-0"
        >
          {srsDueCount > 0 ? 'Bắt đầu ôn Flashcard' : 'Xem kho từ vựng'}
        </Button>
      </Card>

      {/* Review Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Card
          interactive
          onClick={() => onNavigate('practice')}
          className="flex items-start gap-4 p-4.5"
        >
          <div className="p-3 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] shrink-0">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
                Luyện tập tương tác (11 dạng)
              </h3>
              <Badge variant="neutral" size="sm">Đa dạng</Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] line-clamp-2">
              Thực hành qua 11 dạng bài: Sắp xếp từ, điền vào chỗ trống, nối từ, nhận diện lỗi sai...
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#889B84] self-center" />
        </Card>

        <Card
          interactive
          onClick={() => onNavigate('ai_lessons')}
          className="flex items-start gap-4 p-4.5"
        >
          <div className="p-3 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
                Bài học AI cá nhân hóa
              </h3>
              <Badge variant="lime" size="sm">AI Tutor</Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] line-clamp-2">
              Các bài học do AI thiết kế riêng dựa trên lịch sử lỗi sai và chủ đề bạn đang quan tâm.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#889B84] self-center" />
        </Card>

        <Card
          interactive
          onClick={() => onNavigate('ai_memory')}
          className="flex items-start gap-4 p-4.5"
        >
          <div className="p-3 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
                Sổ tay lỗi sai & Trí nhớ AI
              </h3>
              <Badge variant="neutral" size="sm">Phân tích</Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] line-clamp-2">
              Kiểm tra các bằng chứng học tập, lỗi ngữ pháp thường gặp và mức độ thành thạo kỹ năng.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#889B84] self-center" />
        </Card>

        <Card
          interactive
          onClick={() => onNavigate('stats')}
          className="flex items-start gap-4 p-4.5"
        >
          <div className="p-3 rounded-2xl bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C] shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5]">
                Thống kê hiệu quả ôn tập
              </h3>
              <Badge variant="neutral" size="sm">Dữ liệu</Badge>
            </div>
            <p className="text-xs text-[#647560] dark:text-[#889B84] line-clamp-2">
              Theo dõi biểu đồ đường cong quên lãng, tỷ lệ duy trì kiến thức và số phút học tích lũy.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#889B84] self-center" />
        </Card>
      </div>
    </div>
  );
};
