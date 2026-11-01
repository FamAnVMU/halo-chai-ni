import React from 'react';
import {
  Map,
  BookA,
  BookOpen,
  BookmarkCheck,
  Mic,
  Headphones,
  PenTool,
  BookMarked,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { NavTab } from '../components/layout/Sidebar';

interface LearnHubViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const LearnHubView: React.FC<LearnHubViewProps> = ({ onNavigate }) => {
  const learningModules: Array<{
    id: NavTab;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    tag?: string;
    highlight?: boolean;
  }> = [
    {
      id: 'roadmap',
      title: 'Lộ trình học tập (Roadmap)',
      description: 'Lộ trình chuẩn hóa từ HSK 1 đến HSK 6 với các bài học theo cấu trúc',
      icon: Map,
      tag: 'Cốt lõi',
      highlight: true
    },
    {
      id: 'dictionary',
      title: 'Từ điển & AI Tra cứu ngữ cảnh',
      description: 'Phân tích chi tiết bộ thủ, nét bút, từ đồng nghĩa và ngữ cảnh câu',
      icon: BookA,
      tag: 'Tra cứu',
    },
    {
      id: 'vocab',
      title: 'Học từ vựng',
      description: 'Ghi nhớ từ vựng mới theo chủ đề và trình độ HSK',
      icon: BookOpen,
      tag: 'Từ vựng',
    },
    {
      id: 'grammar',
      title: 'Ngữ pháp tiếng Trung',
      description: 'Giải thích cấu trúc ngữ pháp, mẫu câu và phân tích lỗi sai điển hình',
      icon: BookmarkCheck,
      tag: 'Ngữ pháp',
    },
    {
      id: 'pronounce',
      title: 'Phòng Lab Luyện phát âm',
      description: 'Luyện Pinyin, thanh điệu và nhận diện giọng nói tức thì với AI',
      icon: Mic,
      tag: 'Phát âm AI',
      highlight: true
    },
    {
      id: 'shadowing',
      title: 'Shadowing – Luyện nói nhại',
      description: 'Luyện ngữ điệu tự nhiên, phản xạ nói và tốc độ nói theo người bản xứ',
      icon: Headphones,
      tag: 'Nói nhại AI',
      highlight: true
    },
    {
      id: 'write',
      title: 'Luyện viết chữ Hán',
      description: 'Tập viết đúng quy tắc thuận bút, thứ tự nét và phân tích cấu trúc chữ',
      icon: PenTool,
      tag: 'Thuận bút',
    },
    {
      id: 'reading',
      title: 'Luyện đọc hiểu tương tác',
      description: 'Đoạn văn thực tế có audio, giải nghĩa câu và bài tập đọc hiểu AI',
      icon: BookMarked,
      tag: 'Đọc hiểu',
      highlight: true
    },
    {
      id: 'listening',
      title: 'Luyện nghe hiểu',
      description: 'Luyện nghe audio người bản xứ với câu hỏi trắc nghiệm và hội thoại',
      icon: Headphones,
      tag: 'Nghe hiểu',
    },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="lime">Trung tâm học tập</Badge>
          <span className="text-xs text-[#647560] dark:text-[#889B84]">9 kỹ năng toàn diện</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#263326] dark:text-[#EAF5D5]">
          Không gian Học tập & Rèn luyện
        </h1>
        <p className="text-sm text-[#647560] dark:text-[#889B84]">
          Lựa chọn kỹ năng bạn muốn tập trung hôm nay để nâng cao trình độ tiếng Trung của mình.
        </p>
      </div>

      {/* Grid of learning modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {learningModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.id}
              variant={mod.highlight ? 'highlight' : 'default'}
              interactive
              onClick={() => onNavigate(mod.id)}
              className="flex items-start gap-4 p-4.5"
            >
              <div className={`p-3 rounded-2xl shrink-0 ${
                mod.highlight
                  ? 'bg-[#A3D635] text-[#263326] shadow-sm'
                  : 'bg-[#EAF5D5] text-[#355A26] dark:bg-[#202D1D] dark:text-[#C2E58C]'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h3 className="text-sm font-bold text-[#263326] dark:text-[#EAF5D5] truncate">
                    {mod.title}
                  </h3>
                  {mod.tag && (
                    <Badge variant={mod.highlight ? 'lime' : 'neutral'} size="sm">
                      {mod.tag}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#647560] dark:text-[#889B84] line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className="text-[#889B84] self-center">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
